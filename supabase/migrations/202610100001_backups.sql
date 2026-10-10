begin;

create table public.stand_backups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  device_id text not null check (length(device_id) between 1 and 128),
  created_at timestamptz not null default now(),
  schema_version integer not null default 1 check (schema_version = 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object')
);

create index stand_backups_owner_created on public.stand_backups (owner_id, created_at desc);
alter table public.stand_backups enable row level security;
revoke all on public.stand_backups from anon, authenticated;
grant select, insert on public.stand_backups to authenticated;

create policy stand_backups_read_own on public.stand_backups
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy stand_backups_insert_own on public.stand_backups
  for insert to authenticated with check ((select auth.uid()) = owner_id);

commit;
