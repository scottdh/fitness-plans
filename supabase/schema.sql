-- Run once in Supabase: SQL Editor → New query → paste → Run.

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  plan       text not null check (plan in ('scott', 'emma')),
  ftp        integer check (ftp between 50 and 600),
  updated_at timestamptz not null default now()
);

create table if not exists public.logs (
  user_id     uuid not null references auth.users (id) on delete cascade,
  session_key text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, session_key)
);

-- Only signed-in users can reach these tables at all (needed when the project
-- was created with "Automatically expose new tables" switched off).
revoke all on public.profiles, public.logs from anon;
grant select, insert, update, delete on public.profiles, public.logs to authenticated;

alter table public.profiles enable row level security;
alter table public.logs     enable row level security;

-- Each person can only see and change their own rows.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own logs" on public.logs;
create policy "own logs" on public.logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
