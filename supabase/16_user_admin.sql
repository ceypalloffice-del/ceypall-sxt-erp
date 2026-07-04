-- ════════════════════════════════════════════════════════════════════════════
-- 16 — User administration
-- Adds email to profiles (auth.users isn't readable from the app), keeps it in
-- sync on signup, and lets directors manage roles/entity scope.
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- Email on profiles, for the /admin/users page
alter table profiles add column if not exists email text;

-- Backfill from auth.users for existing accounts
update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;

-- Store email on signup too
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end $$;

-- Directors can update any profile (role and entity_scope assignment)
drop policy if exists director_update_profiles on profiles;
create policy director_update_profiles on profiles
  for update using (is_director()) with check (is_director());
