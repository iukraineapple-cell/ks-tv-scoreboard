-- Migration to support direct Supabase client queries and RLS policies for OBS overlays and Admin users

-- Helper function to check if current user is admin
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.users where auth_user_id = auth.uid() limit 1),
    false
  );
$$;

-- Allow anonymous read access to active/visible matches for OBS scoreboards & overlays
drop policy if exists "public can read visible matches" on public.matches;
create policy "public can read visible matches" on public.matches for select using (true);

drop policy if exists "public can read match players" on public.match_players;
create policy "public can read match players" on public.match_players for select using (true);

drop policy if exists "public can read match events" on public.match_events;
create policy "public can read match events" on public.match_events for select using (true);

-- Admin policies
create policy "admins can manage users" on public.users for all using (public.is_admin());
create policy "admins can manage matches" on public.matches for all using (public.is_admin());
create policy "admins can manage match_players" on public.match_players for all using (public.is_admin());
create policy "admins can manage match_events" on public.match_events for all using (public.is_admin());
create policy "admins can manage payments" on public.payments for all using (public.is_admin());
create policy "admins can manage site_statistics" on public.site_statistics for all using (public.is_admin());

-- Allow users to insert site statistics
create policy "users can insert site_statistics" on public.site_statistics for insert with check (true);
create policy "public can read site_statistics" on public.site_statistics for select using (public.is_admin());

-- Allow users to insert matches if they are authenticated
create policy "users can insert own matches" on public.matches for insert with check (
  user_id in (select id from public.users where auth_user_id = auth.uid())
);

-- Allow users to manage their own match players
create policy "owners can insert match players" on public.match_players for insert with check (
  match_id in (select id from public.matches where user_id in (select id from public.users where auth_user_id = auth.uid()))
);

create policy "owners can update match players" on public.match_players for update using (
  match_id in (select id from public.matches where user_id in (select id from public.users where auth_user_id = auth.uid()))
);

create policy "owners can delete match players" on public.match_players for delete using (
  match_id in (select id from public.matches where user_id in (select id from public.users where auth_user_id = auth.uid()))
);

-- Allow users to manage their own match events
create policy "owners can insert match events" on public.match_events for insert with check (
  match_id in (select id from public.matches where user_id in (select id from public.users where auth_user_id = auth.uid()))
);

create policy "owners can update match events" on public.match_events for update using (
  match_id in (select id from public.matches where user_id in (select id from public.users where auth_user_id = auth.uid()))
);

create policy "owners can delete match events" on public.match_events for delete using (
  match_id in (select id from public.matches where user_id in (select id from public.users where auth_user_id = auth.uid()))
);
