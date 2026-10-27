create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  label text not null,
  detail text not null,
  initial text not null,
  accent text not null check (accent in ('orange', 'blue', 'muted')),
  sort_order integer not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant select on public.profiles to anon, authenticated;

-- Profile cards are non-sensitive and currently needed before authentication is added.
create policy "Profiles are readable by app visitors"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

insert into public.profiles (name, label, detail, initial, accent, sort_order)
values
  ('Josh', 'PLAYER 01', 'Main training profile', 'J', 'orange', 1),
  ('Brad', 'PLAYER 02', 'Main training profile', 'B', 'blue', 2),
  ('Test', 'SANDBOX PROFILE', 'Try out new features', 'T', 'muted', 3);
