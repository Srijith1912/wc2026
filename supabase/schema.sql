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
  created_at timestamptz not null default now()
);

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
  updated_at        timestamptz not null default now()
);

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
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select using (
  public.is_member_of(groups.id) or public.is_admin()
);

drop policy if exists groups_admin_write on public.groups;
create policy groups_admin_write on public.groups for all using (public.is_admin()) with check (public.is_admin());

-- group_members: users can see other members of groups they belong to.
drop policy if exists gm_select on public.group_members;
create policy gm_select on public.group_members for select using (
  user_id = auth.uid() or public.is_member_of(group_members.group_id)
);

-- only the join_group() RPC inserts here (security definer); no direct insert.
drop policy if exists gm_admin_write on public.group_members;
create policy gm_admin_write on public.group_members for all using (public.is_admin()) with check (public.is_admin());

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

  insert into public.groups (name, passkey) values (v_name, v_passkey)
  returning id into v_id;

  insert into public.group_members (group_id, user_id) values (v_id, auth.uid());

  return v_id;
end;
$$;

grant execute on function public.create_group(text, text) to authenticated;

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
-- Example: create the first group (run manually as admin)
------------------------------------------------------------
-- insert into public.groups (name, passkey) values ('The Boys', 'changeme-secret');
