-- WC 2026 Predictions — Supabase schema + RLS policies + RPCs
-- Paste this entire file into the Supabase SQL editor and run.
-- (Safe to re-run: uses CREATE IF NOT EXISTS / DROP POLICY IF EXISTS.)
--
-- Admins are identified by email — edit the helper function `is_admin()`
-- at the top of this file AND src/lib/admin.js to match.

------------------------------------------------------------
-- HELPER FUNCTIONS (security definer → bypass RLS to avoid recursion)
------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'mulupurisrijith@gmail.com'
  );
$$;

-- True if the calling user is a member of the given group.
create or replace function public.is_member_of(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

-- True if the calling user shares ANY group with the target user.
create or replace function public.shares_group_with(p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = p_target
  );
$$;

grant execute on function public.is_admin()             to authenticated;
grant execute on function public.is_member_of(uuid)     to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;
-- is_group_leader() is defined later, right after the group_members.is_leader
-- column exists (it references that column).

------------------------------------------------------------
-- TABLES
------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- Backfill: every auth user must have a profile row (brackets + reviews FK to
-- it). Accounts created before the handle_new_user() trigger existed can be
-- missing one — that's what causes "violates foreign key constraint
-- reviews_user_id_fkey" / brackets errors. Idempotent: second runs match none.
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  passkey    text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

-- Safe to re-run on an older DB that pre-dates created_by.
alter table public.groups add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- One-time backfill: any group that lacks a creator (created before the
-- column existed, or via the older create_group() RPC) gets assigned to its
-- earliest joined member. Idempotent — second runs match nothing.
update public.groups g
set created_by = (
  select user_id from public.group_members
  where group_id = g.id
  order by joined_at asc
  limit 1
)
where created_by is null;

create table if not exists public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  is_leader boolean not null default false,
  primary key (group_id, user_id)
);

-- A group can have MULTIPLE leaders. Safe to re-run on an older DB.
alter table public.group_members add column if not exists is_leader boolean not null default false;

-- Backfill: the original single "created_by" leader becomes a leader under the
-- new model. Idempotent — second runs match nothing new.
update public.group_members gm
set is_leader = true
from public.groups g
where g.id = gm.group_id and g.created_by = gm.user_id and gm.is_leader = false;

-- True if the calling user is a LEADER of the given group. A group can have
-- several leaders (see group_members.is_leader). Security definer to bypass RLS.
-- Defined here (not with the other helpers) because it reads the is_leader
-- column, which must exist first.
create or replace function public.is_group_leader(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid() and is_leader
  );
$$;

grant execute on function public.is_group_leader(uuid) to authenticated;

create table if not exists public.brackets (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  group_picks       jsonb not null default '{}'::jsonb,
  third_place_bets  text[] not null default array[]::text[],
  knockout_picks    jsonb not null default '{}'::jsonb,
  awards_picks      jsonb not null default '{}'::jsonb,
  updated_at        timestamptz not null default now()
);

-- Safe to re-run on an older DB that pre-dates awards_picks.
alter table public.brackets add column if not exists awards_picks jsonb not null default '{}'::jsonb;

-- Safety net: ensure every profile has an (empty) bracket row to edit.
-- Idempotent — second runs match none.
insert into public.brackets (user_id)
select p.id from public.profiles p
left join public.brackets b on b.user_id = p.id
where b.user_id is null;

create table if not exists public.fixture_state (
  id                       int primary key default 1,
  group_results            jsonb not null default '{}'::jsonb,
  third_place_assignments  jsonb not null default '{}'::jsonb,
  knockout_results         jsonb not null default '{}'::jsonb,
  awards_results           jsonb not null default '{}'::jsonb,
  updated_at               timestamptz not null default now(),
  constraint singleton check (id = 1)
);

-- Safe to re-run on an older DB that pre-dates the scoring columns. These hold
-- the ACTUAL knockout winners (matchId -> team code, incl. FINAL + THIRD_PLACE)
-- and the actual award winners (golden_ball / golden_boot / golden_glove ->
-- player name). The admin fills these in on the Admin page; scoring.js compares
-- every user's bracket against them.
alter table public.fixture_state add column if not exists knockout_results jsonb not null default '{}'::jsonb;
alter table public.fixture_state add column if not exists awards_results   jsonb not null default '{}'::jsonb;

insert into public.fixture_state (id) values (1)
on conflict (id) do nothing;

------------------------------------------------------------
-- ROW LEVEL SECURITY
------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.brackets       enable row level security;
alter table public.fixture_state  enable row level security;

-- profiles: any signed-in user can read profiles of people in any of their
-- groups, plus their own; admins can read all. Display names are NOT globally
-- readable — the leaderboard surfaces names via the leaderboard() RPC (security
-- definer), so a bracket/profile is only directly visible to group-mates.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or public.shares_group_with(profiles.id)
  or public.is_admin()
);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- groups: rows are NOT directly selectable except by members (so passkey never leaks).
-- The group creator can always see their own group too (so they can delete it
-- even after they leave).
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select using (
  public.is_member_of(groups.id) or created_by = auth.uid() or public.is_admin()
);

-- INSERT is only via create_group() RPC (security definer); direct insert blocked.
drop policy if exists groups_admin_write on public.groups;        -- legacy name; remove
drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups for insert with check (public.is_admin());

-- UPDATE only by app admin (rename, change passkey, etc.)
drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update using (public.is_admin()) with check (public.is_admin());

-- DELETE: any group leader OR app admin. Cascades to group_members + brackets.
drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete using (
  public.is_group_leader(groups.id) or public.is_admin()
);

-- group_members: users can see other members of groups they belong to.
drop policy if exists gm_select on public.group_members;
create policy gm_select on public.group_members for select using (
  user_id = auth.uid() or public.is_member_of(group_members.group_id)
);

-- INSERT only via join_group() RPC (security definer) or app admin direct.
drop policy if exists gm_admin_write on public.group_members;     -- legacy name; remove
drop policy if exists gm_insert on public.group_members;
create policy gm_insert on public.group_members for insert with check (public.is_admin());

-- DELETE:
--   - leaving yourself (user_id = auth.uid())
--   - any group leader kicking a member
--   - app admin
drop policy if exists gm_delete on public.group_members;
create policy gm_delete on public.group_members for delete using (
  user_id = auth.uid()
  or public.is_group_leader(group_members.group_id)
  or public.is_admin()
);

-- brackets: a user can read+write their own, and read others' ONLY if they
-- share a group (so you can see your group-mates' picks). Brackets are never
-- world-readable — the leaderboard ranks everyone without exposing picks, via
-- the leaderboard() RPC which returns names + points only. Admins can read all.
drop policy if exists brackets_select on public.brackets;
create policy brackets_select on public.brackets for select using (
  user_id = auth.uid()
  or public.shares_group_with(brackets.user_id)
  or public.is_admin()
);

drop policy if exists brackets_upsert on public.brackets;
create policy brackets_upsert on public.brackets for insert with check (user_id = auth.uid());
drop policy if exists brackets_update on public.brackets;
create policy brackets_update on public.brackets for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- fixture_state: read for all signed-in users; write admin-only.
drop policy if exists fixture_select on public.fixture_state;
create policy fixture_select on public.fixture_state for select using (auth.uid() is not null);

drop policy if exists fixture_admin_write on public.fixture_state;
create policy fixture_admin_write on public.fixture_state for all using (public.is_admin()) with check (public.is_admin());

------------------------------------------------------------
-- REVIEWS / RATINGS (shown on the public landing page)
-- One review per user. New + edited reviews start unapproved; only the admin
-- can flip `approved`, so nothing user-written appears publicly until the admin
-- has seen it. Approved reviews are readable by EVERYONE, including logged-out
-- visitors (the anon role) — that's what lets the landing page show them.
------------------------------------------------------------
create table if not exists public.reviews (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  rating     int  not null check (rating between 1 and 5),
  body       text not null check (char_length(btrim(body)) between 1 and 500),
  approved   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

-- Read: approved reviews are public; you can always see your own; admin sees all.
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select using (
  approved or user_id = auth.uid() or public.is_admin()
);

-- Write: a user manages only their own row; admin can manage any (to approve).
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (user_id = auth.uid());
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete
  using (user_id = auth.uid() or public.is_admin());

-- The anon (logged-out) role needs an explicit SELECT grant to read approved
-- reviews on the landing page; authenticated users get full CRUD (still gated
-- by the RLS policies above).
grant select on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;

-- Guard: non-admin writes always land as unapproved (a user can't self-approve,
-- and editing an already-approved review sends it back to the moderation queue).
-- Also keeps updated_at honest.
create or replace function public.reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.approved := false;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_reviews_guard on public.reviews;
create trigger trg_reviews_guard
  before insert or update on public.reviews
  for each row execute function public.reviews_guard();

------------------------------------------------------------
-- RPC: join_group(passkey)
-- Adds the caller to the group with the matching passkey.
-- Returns the group_id on success; raises an error on bad passkey.
------------------------------------------------------------
create or replace function public.join_group(p_passkey text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select id into v_group_id from public.groups where passkey = p_passkey;
  if v_group_id is null then
    raise exception 'Invalid group passkey';
  end if;
  insert into public.group_members (group_id, user_id)
  values (v_group_id, auth.uid())
  on conflict do nothing;
  return v_group_id;
end;
$$;

grant execute on function public.join_group(text) to authenticated;

------------------------------------------------------------
-- RPC: create_group(name, passkey)
-- Any authenticated user can create a group and is auto-added as a member.
-- Passkey must be unique across all groups.
------------------------------------------------------------
create or replace function public.create_group(p_name text, p_passkey text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id      uuid;
  v_name    text := trim(p_name);
  v_passkey text := trim(p_passkey);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if length(v_name) < 2 then
    raise exception 'Group name must be at least 2 characters';
  end if;
  if length(v_passkey) < 4 then
    raise exception 'Passkey must be at least 4 characters';
  end if;
  if exists (select 1 from public.groups where passkey = v_passkey) then
    raise exception 'That passkey is already taken — pick a different one';
  end if;

  insert into public.groups (name, passkey, created_by) values (v_name, v_passkey, auth.uid())
  returning id into v_id;

  -- The founder starts as a leader (a group can have several leaders).
  insert into public.group_members (group_id, user_id, is_leader) values (v_id, auth.uid(), true);

  return v_id;
end;
$$;

grant execute on function public.create_group(text, text) to authenticated;

------------------------------------------------------------
-- RPC: add_group_leader / remove_group_leader / update_group
-- A group can have multiple leaders. Any current leader (or app admin) can
-- promote another member to leader, demote a leader (as long as at least one
-- leader remains), and edit the group's name + passkey.
------------------------------------------------------------
create or replace function public.add_group_leader(p_group_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.is_group_leader(p_group_id) or public.is_admin()) then
    raise exception 'Only a group leader can add leaders';
  end if;
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = p_user) then
    raise exception 'That person must already be a member of the group';
  end if;
  update public.group_members set is_leader = true where group_id = p_group_id and user_id = p_user;
end;
$$;

create or replace function public.remove_group_leader(p_group_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_leaders int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.is_group_leader(p_group_id) or public.is_admin()) then
    raise exception 'Only a group leader can change leaders';
  end if;
  select count(*) into v_leaders from public.group_members where group_id = p_group_id and is_leader;
  if v_leaders <= 1 then
    raise exception 'A group must always have at least one leader';
  end if;
  update public.group_members set is_leader = false where group_id = p_group_id and user_id = p_user;
end;
$$;

create or replace function public.update_group(p_group_id uuid, p_name text, p_passkey text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name    text := trim(p_name);
  v_passkey text := trim(p_passkey);
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.is_group_leader(p_group_id) or public.is_admin()) then
    raise exception 'Only a group leader can edit this group';
  end if;
  if length(v_name) < 2 then raise exception 'Group name must be at least 2 characters'; end if;
  if length(v_passkey) < 4 then raise exception 'Passkey must be at least 4 characters'; end if;
  if exists (select 1 from public.groups where passkey = v_passkey and id <> p_group_id) then
    raise exception 'That passkey is already taken — pick a different one';
  end if;
  update public.groups set name = v_name, passkey = v_passkey where id = p_group_id;
end;
$$;

-- Legacy single-leader RPC, replaced by add/remove_group_leader.
drop function if exists public.transfer_group_leader(uuid, uuid);

grant execute on function public.add_group_leader(uuid, uuid)    to authenticated;
grant execute on function public.remove_group_leader(uuid, uuid) to authenticated;
grant execute on function public.update_group(uuid, text, text)  to authenticated;

------------------------------------------------------------
-- TRIGGER: keep every group with at least one leader. When a member leaves:
--   - if no members remain, delete the (orphaned) group;
--   - else if the group now has zero leaders, promote the oldest remaining
--     member to leader.
-- Skips silently when the parent group is itself being cascade-deleted.
------------------------------------------------------------
create or replace function public.handle_member_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_leader uuid;
begin
  -- if the parent group is gone (cascade delete), nothing to do
  if not exists (select 1 from public.groups where id = old.group_id) then
    return old;
  end if;

  -- empty group — delete it (cascades to any orphan group_members)
  if not exists (select 1 from public.group_members where group_id = old.group_id) then
    delete from public.groups where id = old.group_id;
    return old;
  end if;

  -- if the group lost its last leader, promote the earliest-joined member
  if not exists (select 1 from public.group_members where group_id = old.group_id and is_leader) then
    select user_id into v_next_leader
    from public.group_members
    where group_id = old.group_id
    order by joined_at asc
    limit 1;
    update public.group_members set is_leader = true
    where group_id = old.group_id and user_id = v_next_leader;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_handle_member_leave on public.group_members;
create trigger trg_handle_member_leave
  after delete on public.group_members
  for each row execute function public.handle_member_leave();

------------------------------------------------------------
-- RPC: handle_new_user — creates a profile row on signup
-- (Hooked via auth trigger below.)
------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.brackets (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- DEADLINE ENFORCEMENT (server-side, can't be bypassed from the client)
-- Arizona is MST (UTC-7, no DST), so "midnight MST" = 07:00 UTC the next day.
-- Group stage + best-thirds + awards lock at June 17 midnight MST
--   = 2026-06-18 07:00 UTC.
-- Knockout picks lock at June 28 12:00 PM MST = 2026-06-28 19:00 UTC
-- (the first Round-of-32 kickoff).
-- Keep these two constants in sync with GROUP_LOCK_UTC / KO_LOCK_UTC in
-- src/lib/dates.js. After each deadline the matching fields can no longer
-- change for ANY user — even via a direct REST API call.
------------------------------------------------------------
create or replace function public.enforce_bracket_locks()
returns trigger
language plpgsql
as $$
declare
  group_lock constant timestamptz := timestamptz '2026-06-18 07:00:00+00';
  ko_lock    constant timestamptz := timestamptz '2026-06-28 19:00:00+00';
begin
  if now() >= group_lock then
    new.group_picks      := old.group_picks;
    new.third_place_bets := old.third_place_bets;
    new.awards_picks     := old.awards_picks;
  end if;
  if now() >= ko_lock then
    new.knockout_picks   := old.knockout_picks;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_bracket_locks on public.brackets;
create trigger trg_enforce_bracket_locks
  before update on public.brackets
  for each row execute function public.enforce_bracket_locks();

------------------------------------------------------------
-- GROUP-STAGE MATCH PREDICTION GAME
-- A mini-game over all 72 group-stage fixtures. group_matches is the single
-- source of truth (the frontend reads it, so there's no duplicated schedule).
-- Kickoffs are stored in UTC; the app shows them in each viewer's local time.
-- Each correct pick is worth 0.5 points (folded into the overall total/leaderboard).
------------------------------------------------------------
create table if not exists public.group_matches (
  id           text primary key,         -- 'GM01'..'GM72', chronological
  group_letter text not null,            -- 'A'..'L'
  team_a       text not null,            -- team code (see src/lib/teams.js)
  team_b       text not null,
  kickoff      timestamptz not null,     -- UTC
  venue        text,
  result       text                      -- team_a code | team_b code | 'DRAW' | null (admin sets it)
);

alter table public.group_matches enable row level security;

-- Schedule is public (so guests see it on the home page). Only admins write
-- (to enter results / fix the schedule).
drop policy if exists group_matches_select on public.group_matches;
create policy group_matches_select on public.group_matches for select using (true);
drop policy if exists group_matches_admin_write on public.group_matches;
create policy group_matches_admin_write on public.group_matches for all
  using (public.is_admin()) with check (public.is_admin());

grant select on public.group_matches to anon, authenticated;
grant insert, update, delete on public.group_matches to authenticated;

-- Realtime: push live updates when the admin enters a result, so the match
-- prediction counter ticks up without a page refresh. Idempotent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_matches'
  ) then
    alter publication supabase_realtime add table public.group_matches;
  end if;
end $$;

-- Seed / refresh the 72 fixtures. Times below are the published kickoff times
-- in Pacific Daylight Time (UTC-7) converted to UTC (PDT + 7h). Re-running
-- updates the schedule but NEVER clears an already-entered result.
insert into public.group_matches (id, group_letter, team_a, team_b, kickoff, venue) values
  ('GM01','A','MEX','RSA','2026-06-11T19:00:00Z','Mexico City'),
  ('GM02','A','KOR','CZE','2026-06-12T02:00:00Z','Guadalajara'),
  ('GM03','B','CAN','BIH','2026-06-12T19:00:00Z','Toronto'),
  ('GM04','D','USA','PAR','2026-06-13T01:00:00Z','Los Angeles'),
  ('GM05','B','QAT','SUI','2026-06-13T19:00:00Z','San Francisco'),
  ('GM06','C','BRA','MAR','2026-06-13T22:00:00Z','New York/NJ'),
  ('GM07','C','HAI','SCO','2026-06-14T01:00:00Z','Boston'),
  ('GM08','D','AUS','TUR','2026-06-14T04:00:00Z','Vancouver'),
  ('GM09','E','GER','CUW','2026-06-14T17:00:00Z','Houston'),
  ('GM10','F','NED','JPN','2026-06-14T20:00:00Z','Dallas'),
  ('GM11','E','CIV','ECU','2026-06-14T23:00:00Z','Philadelphia'),
  ('GM12','F','SWE','TUN','2026-06-15T02:00:00Z','Monterrey'),
  ('GM13','H','ESP','CPV','2026-06-15T16:00:00Z','Atlanta'),
  ('GM14','G','BEL','EGY','2026-06-15T19:00:00Z','Seattle'),
  ('GM15','H','KSA','URU','2026-06-15T22:00:00Z','Miami'),
  ('GM16','G','IRN','NZL','2026-06-16T01:00:00Z','Los Angeles'),
  ('GM17','I','FRA','SEN','2026-06-16T19:00:00Z','New York/NJ'),
  ('GM18','I','IRQ','NOR','2026-06-16T22:00:00Z','Boston'),
  ('GM19','J','ARG','ALG','2026-06-17T01:00:00Z','Kansas City'),
  ('GM20','J','AUT','JOR','2026-06-17T04:00:00Z','San Francisco'),
  ('GM21','K','POR','COD','2026-06-17T17:00:00Z','Houston'),
  ('GM22','L','ENG','CRO','2026-06-17T20:00:00Z','Dallas'),
  ('GM23','L','GHA','PAN','2026-06-17T23:00:00Z','Toronto'),
  ('GM24','K','UZB','COL','2026-06-18T02:00:00Z','Mexico City'),
  ('GM25','A','CZE','RSA','2026-06-18T16:00:00Z','Atlanta'),
  ('GM26','B','SUI','BIH','2026-06-18T19:00:00Z','Los Angeles'),
  ('GM27','B','CAN','QAT','2026-06-18T22:00:00Z','Vancouver'),
  ('GM28','A','MEX','KOR','2026-06-19T01:00:00Z','Guadalajara'),
  ('GM29','D','USA','AUS','2026-06-19T19:00:00Z','Seattle'),
  ('GM30','C','SCO','MAR','2026-06-19T22:00:00Z','Boston'),
  ('GM31','C','BRA','HAI','2026-06-20T00:30:00Z','Philadelphia'),
  ('GM32','D','TUR','PAR','2026-06-20T03:00:00Z','San Francisco'),
  ('GM33','F','NED','SWE','2026-06-20T17:00:00Z','Houston'),
  ('GM34','E','GER','CIV','2026-06-20T20:00:00Z','Toronto'),
  ('GM35','E','ECU','CUW','2026-06-21T00:00:00Z','Kansas City'),
  ('GM36','F','TUN','JPN','2026-06-21T04:00:00Z','Monterrey'),
  ('GM37','H','ESP','KSA','2026-06-21T16:00:00Z','Atlanta'),
  ('GM38','G','BEL','IRN','2026-06-21T19:00:00Z','Los Angeles'),
  ('GM39','H','URU','CPV','2026-06-21T22:00:00Z','Miami'),
  ('GM40','G','NZL','EGY','2026-06-22T01:00:00Z','Vancouver'),
  ('GM41','J','ARG','AUT','2026-06-22T17:00:00Z','Dallas'),
  ('GM42','I','FRA','IRQ','2026-06-22T21:00:00Z','Philadelphia'),
  ('GM43','I','NOR','SEN','2026-06-23T00:00:00Z','New York/NJ'),
  ('GM44','J','JOR','ALG','2026-06-23T03:00:00Z','San Francisco'),
  ('GM45','K','POR','UZB','2026-06-23T17:00:00Z','Houston'),
  ('GM46','L','ENG','GHA','2026-06-23T20:00:00Z','Boston'),
  ('GM47','L','PAN','CRO','2026-06-23T23:00:00Z','Toronto'),
  ('GM48','K','COL','COD','2026-06-24T02:00:00Z','Guadalajara'),
  ('GM49','B','SUI','CAN','2026-06-24T19:00:00Z','Vancouver'),
  ('GM50','B','BIH','QAT','2026-06-24T19:00:00Z','Seattle'),
  ('GM51','C','SCO','BRA','2026-06-24T22:00:00Z','Miami'),
  ('GM52','C','MAR','HAI','2026-06-24T22:00:00Z','Atlanta'),
  ('GM53','A','CZE','MEX','2026-06-25T01:00:00Z','Mexico City'),
  ('GM54','A','RSA','KOR','2026-06-25T01:00:00Z','Monterrey'),
  ('GM55','E','CUW','CIV','2026-06-25T20:00:00Z','Philadelphia'),
  ('GM56','E','ECU','GER','2026-06-25T20:00:00Z','New York/NJ'),
  ('GM57','F','JPN','SWE','2026-06-25T23:00:00Z','Dallas'),
  ('GM58','F','TUN','NED','2026-06-25T23:00:00Z','Kansas City'),
  ('GM59','D','TUR','USA','2026-06-26T02:00:00Z','Los Angeles'),
  ('GM60','D','PAR','AUS','2026-06-26T02:00:00Z','San Francisco'),
  ('GM61','I','NOR','FRA','2026-06-26T19:00:00Z','Boston'),
  ('GM62','I','SEN','IRQ','2026-06-26T19:00:00Z','Toronto'),
  ('GM63','H','CPV','KSA','2026-06-27T00:00:00Z','Houston'),
  ('GM64','H','URU','ESP','2026-06-27T00:00:00Z','Guadalajara'),
  ('GM65','G','EGY','IRN','2026-06-27T03:00:00Z','Seattle'),
  ('GM66','G','NZL','BEL','2026-06-27T03:00:00Z','Vancouver'),
  ('GM67','L','PAN','ENG','2026-06-27T21:00:00Z','New York/NJ'),
  ('GM68','L','CRO','GHA','2026-06-27T21:00:00Z','Philadelphia'),
  ('GM69','K','COL','POR','2026-06-27T23:30:00Z','Miami'),
  ('GM70','K','COD','UZB','2026-06-27T23:30:00Z','Atlanta'),
  ('GM71','J','JOR','ARG','2026-06-28T02:00:00Z','Dallas'),
  ('GM72','J','ALG','AUT','2026-06-28T02:00:00Z','Kansas City')
on conflict (id) do update set
  group_letter = excluded.group_letter,
  team_a       = excluded.team_a,
  team_b       = excluded.team_b,
  kickoff      = excluded.kickoff,
  venue        = excluded.venue;
  -- NOTE: result is intentionally not touched on conflict.

create table if not exists public.match_predictions (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  match_id   text not null references public.group_matches(id) on delete cascade,
  pick       text not null,             -- team_a code | team_b code | 'DRAW'
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

alter table public.match_predictions enable row level security;

-- Read your own; group-mates can read each other's (like brackets); admin all.
drop policy if exists mp_select on public.match_predictions;
create policy mp_select on public.match_predictions for select using (
  user_id = auth.uid() or public.shares_group_with(user_id) or public.is_admin()
);
drop policy if exists mp_insert on public.match_predictions;
create policy mp_insert on public.match_predictions for insert with check (user_id = auth.uid());
drop policy if exists mp_update on public.match_predictions;
create policy mp_update on public.match_predictions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists mp_delete on public.match_predictions;
create policy mp_delete on public.match_predictions for delete using (user_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.match_predictions to authenticated;

-- Server-side lock: a prediction can't be created or changed once the match has
-- kicked off (can't be bypassed via the REST API). The "opens 24h before"
-- window is a UI affordance only — predicting early isn't a fairness risk.
create or replace function public.enforce_match_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k timestamptz;
begin
  select kickoff into k from public.group_matches where id = new.match_id;
  if k is null then raise exception 'Unknown match %', new.match_id; end if;
  if now() >= k then raise exception 'Predictions for this match are closed'; end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_match_lock on public.match_predictions;
create trigger trg_enforce_match_lock
  before insert or update on public.match_predictions
  for each row execute function public.enforce_match_lock();

-- A user's match-game points: 0.5 per correct prediction of a finished match.
create or replace function public.match_points(p_user uuid)
returns double precision
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count(*), 0) * 0.5
  from public.match_predictions mp
  join public.group_matches gm on gm.id = mp.match_id
  where mp.user_id = p_user
    and gm.result is not null
    and mp.pick = gm.result;
$$;

grant execute on function public.match_points(uuid) to authenticated;

------------------------------------------------------------
-- LEADERBOARD (server-side scoring)
-- Scores are computed in Postgres and only names + points are returned — never
-- anyone's picks. The browser downloads tiny rows instead of every bracket, so
-- this stays cheap at scale. Total = bracket score (src/lib/scoring.js) +
-- match-prediction points. If you change either points system, update BOTH
-- here and in src/lib/scoring.js.
------------------------------------------------------------

-- Name normaliser for award matching: lowercase, strip accents, collapse any
-- non-alphanumeric run to a single space, trim. Mirrors normName() in
-- src/lib/scoring.js so the "Your score" card and the leaderboard agree.
create extension if not exists unaccent;

create or replace function public.norm_name(p text)
returns text
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select btrim(regexp_replace(lower(unaccent(coalesce(p, ''))), '[^a-z0-9]+', ' ', 'g'));
$$;

-- Pure scoring function: given a bracket's four pick columns and the fixture's
-- four result columns, return the total points. No table access, so it's safe
-- to expose. This is the single source of truth for SQL-side scoring (mirrors
-- src/lib/scoring.js) — both leaderboard() and group_leaderboard() call it.
create or replace function public.score_bracket(
  p_group_picks            jsonb,
  p_third_place_bets       text[],
  p_knockout_picks         jsonb,
  p_awards_picks           jsonb,
  p_group_results          jsonb,
  p_third_place_assignments jsonb,
  p_knockout_results       jsonb,
  p_awards_results         jsonb
)
returns int
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select (
      -- group winners (1 pt) + runners-up (1 pt)
      (select count(*) from unnest(array['A','B','C','D','E','F','G','H','I','J','K','L']) as g
         where p_group_picks -> g ->> 'winner' = p_group_results -> g ->> 'winner')
    + (select count(*) from unnest(array['A','B','C','D','E','F','G','H','I','J','K','L']) as g
         where p_group_picks -> g ->> 'runnerUp' = p_group_results -> g ->> 'runnerUp')
      -- best-8 thirds (2 pts each): bet teams that are among the assigned thirds
    + (select count(*) from unnest(coalesce(p_third_place_bets, '{}'::text[])) as t
         where t in (select v.value from jsonb_each_text(p_third_place_assignments) v
                      where coalesce(v.value, '') <> '')) * 2
      -- knockout rounds (R32 2 / R16 3 / QF 5 / SF 8)
    + (select count(*) from unnest(array['R32_L1','R32_L2','R32_L3','R32_L4','R32_L5','R32_L6','R32_L7','R32_L8',
                                         'R32_R1','R32_R2','R32_R3','R32_R4','R32_R5','R32_R6','R32_R7','R32_R8']) as m
         where p_knockout_picks ->> m = p_knockout_results ->> m) * 2
    + (select count(*) from unnest(array['R16_L1','R16_L2','R16_L3','R16_L4','R16_R1','R16_R2','R16_R3','R16_R4']) as m
         where p_knockout_picks ->> m = p_knockout_results ->> m) * 3
    + (select count(*) from unnest(array['QF_L1','QF_L2','QF_R1','QF_R2']) as m
         where p_knockout_picks ->> m = p_knockout_results ->> m) * 5
    + (select count(*) from unnest(array['SF_L','SF_R']) as m
         where p_knockout_picks ->> m = p_knockout_results ->> m) * 8
      -- 3rd-place playoff (10) + champion (15)
    + (case when p_knockout_picks ->> 'THIRD_PLACE' = p_knockout_results ->> 'THIRD_PLACE' then 10 else 0 end)
    + (case when p_knockout_picks ->> 'FINAL' = p_knockout_results ->> 'FINAL' then 15 else 0 end)
      -- individual awards (5 pts each)
    + (select count(*) from unnest(array['golden_ball','golden_boot','golden_glove']) as k
         where public.norm_name(p_awards_results ->> k) <> ''
           and public.norm_name(p_awards_picks ->> k) = public.norm_name(p_awards_results ->> k)) * 5
  )::int;
$$;

grant execute on function public.score_bracket(jsonb, text[], jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- Overall leaderboard: EVERY user with any points (> 0), ranked. Names + points
-- only, never picks. Total = bracket score + match-prediction points.
-- (Dropped first because the return type changed from int to double precision.)
drop function if exists public.leaderboard();
create or replace function public.leaderboard()
returns table (user_id uuid, display_name text, points double precision, rank int, is_self boolean)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with f as (select * from public.fixture_state where id = 1),
  scored as (
    select b.user_id, p.display_name,
           (public.score_bracket(b.group_picks, b.third_place_bets, b.knockout_picks, b.awards_picks,
                                  f.group_results, f.third_place_assignments, f.knockout_results, f.awards_results)
            + public.match_points(b.user_id))::double precision as points
    from public.brackets b
    join public.profiles p on p.id = b.user_id
    cross join f
  ),
  ranked as (
    select s.*, (dense_rank() over (order by s.points desc))::int as rank
    from scored s
    where s.points > 0                        -- only users who've scored something
  )
  select r.user_id, r.display_name, r.points, r.rank, (r.user_id = auth.uid()) as is_self
  from ranked r
  order by r.rank asc, lower(r.display_name) asc;
$$;

grant execute on function public.leaderboard() to authenticated;

-- Group leaderboard: ranks ALL members of one group (including 0-point members,
-- so you see your whole group). Caller must be a member of that group (or admin).
-- (Dropped first because the return type changed from int to double precision.)
drop function if exists public.group_leaderboard(uuid);
create or replace function public.group_leaderboard(p_group_id uuid)
returns table (user_id uuid, display_name text, points double precision, rank int, is_self boolean)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with f as (select * from public.fixture_state where id = 1),
  scored as (
    select b.user_id, p.display_name,
           (public.score_bracket(b.group_picks, b.third_place_bets, b.knockout_picks, b.awards_picks,
                                  f.group_results, f.third_place_assignments, f.knockout_results, f.awards_results)
            + public.match_points(b.user_id))::double precision as points
    from public.group_members gm
    join public.brackets b on b.user_id = gm.user_id
    join public.profiles p on p.id = b.user_id
    cross join f
    where gm.group_id = p_group_id
      and (public.is_member_of(p_group_id) or public.is_admin())
  ),
  ranked as (
    select s.*, (dense_rank() over (order by s.points desc))::int as rank
    from scored s
  )
  select r.user_id, r.display_name, r.points, r.rank, (r.user_id = auth.uid()) as is_self
  from ranked r
  order by r.rank asc, lower(r.display_name) asc;
$$;

grant execute on function public.group_leaderboard(uuid) to authenticated;

------------------------------------------------------------
-- GROUP CHAT (persistent, never auto-deleted)
-- One messages table; rows belong to a group. Only members of that group can
-- read or post; you can delete your own message, the group leader can delete
-- any message in their group, and admins can delete anything.
------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists messages_group_created_idx on public.messages (group_id, created_at);

alter table public.messages enable row level security;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (
  public.is_member_of(group_id) or public.is_admin()
);

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  user_id = auth.uid() and public.is_member_of(group_id)
);

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete using (
  user_id = auth.uid()
  or exists (select 1 from public.groups g where g.id = messages.group_id and g.created_by = auth.uid())
  or public.is_admin()
);

grant select, insert, delete on public.messages to authenticated;

-- Enable Supabase Realtime for live chat. Idempotent — only adds the table to
-- the realtime publication if it isn't already there (re-running is safe).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

------------------------------------------------------------
-- Example: create the first group (run manually as admin)
------------------------------------------------------------
-- insert into public.groups (name, passkey, created_by) values ('The Boys', 'changeme-secret', null);
