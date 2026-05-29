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
    -- , 'max@example.com'
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

------------------------------------------------------------
-- TABLES
------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

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
  primary key (group_id, user_id)
);

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

create table if not exists public.fixture_state (
  id                       int primary key default 1,
  group_results            jsonb not null default '{}'::jsonb,
  third_place_assignments  jsonb not null default '{}'::jsonb,
  updated_at               timestamptz not null default now(),
  constraint singleton check (id = 1)
);

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

-- profiles: any signed-in user can read profiles of people in any of their groups,
-- can read/update their own profile, cannot delete.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or public.shares_group_with(profiles.id)
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

-- DELETE: group creator OR app admin. Cascades to group_members + brackets.
drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete using (
  created_by = auth.uid() or public.is_admin()
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
--   - group creator kicking a member
--   - app admin
drop policy if exists gm_delete on public.group_members;
create policy gm_delete on public.group_members for delete using (
  user_id = auth.uid()
  or exists (select 1 from public.groups g where g.id = group_members.group_id and g.created_by = auth.uid())
  or public.is_admin()
);

-- brackets: user can read+write their own; can read others' iff they share a group.
drop policy if exists brackets_select on public.brackets;
create policy brackets_select on public.brackets for select using (
  user_id = auth.uid() or public.shares_group_with(brackets.user_id)
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

  insert into public.group_members (group_id, user_id) values (v_id, auth.uid());

  return v_id;
end;
$$;

grant execute on function public.create_group(text, text) to authenticated;

------------------------------------------------------------
-- RPC: transfer_group_leader(group_id, new_leader_id)
-- The current group creator (or app admin) can hand leadership to any
-- existing member.
------------------------------------------------------------
create or replace function public.transfer_group_leader(p_group_id uuid, p_new_leader uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  if not exists (
    select 1 from public.groups
    where id = p_group_id and (created_by = auth.uid() or public.is_admin())
  ) then
    raise exception 'Only the current group leader can transfer leadership';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_new_leader
  ) then
    raise exception 'New leader must already be a member of the group';
  end if;

  update public.groups set created_by = p_new_leader where id = p_group_id;
end;
$$;

grant execute on function public.transfer_group_leader(uuid, uuid) to authenticated;

------------------------------------------------------------
-- TRIGGER: when the group creator leaves, transfer leadership to the oldest
-- remaining member. If no members remain, the group is deleted (orphaned
-- groups aren't useful).
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
  v_was_creator boolean;
begin
  -- if the parent group is gone (cascade delete), nothing to do
  if not exists (select 1 from public.groups where id = old.group_id) then
    return old;
  end if;

  v_was_creator := exists (
    select 1 from public.groups
    where id = old.group_id and created_by = old.user_id
  );

  if v_was_creator then
    select user_id into v_next_leader
    from public.group_members
    where group_id = old.group_id
    order by joined_at asc
    limit 1;

    if v_next_leader is not null then
      update public.groups set created_by = v_next_leader where id = old.group_id;
    else
      -- empty group — delete it (cascades to any orphan group_members)
      delete from public.groups where id = old.group_id;
    end if;
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
-- Group stage + best-thirds lock at 2026-06-11 19:00 UTC (12:00 PM MST).
-- Knockout picks lock at 2026-06-28 19:00 UTC (12:00 PM MST).
-- After each deadline, the corresponding fields can no longer change for
-- ANY user — even if someone hits the REST API directly.
------------------------------------------------------------
create or replace function public.enforce_bracket_locks()
returns trigger
language plpgsql
as $$
declare
  group_lock constant timestamptz := timestamptz '2026-06-11 19:00:00+00';
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
-- Example: create the first group (run manually as admin)
------------------------------------------------------------
-- insert into public.groups (name, passkey, created_by) values ('The Boys', 'changeme-secret', null);
