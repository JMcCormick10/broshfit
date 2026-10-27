create table public.muscle_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null unique
);

alter table public.muscle_groups enable row level security;

grant select on public.muscle_groups to anon, authenticated;

create policy "Muscle groups are readable by app visitors"
  on public.muscle_groups
  for select
  to anon, authenticated
  using (true);

insert into public.muscle_groups (name, sort_order)
values
  ('Chest', 1),
  ('Back', 2),
  ('Quads', 3),
  ('Hamstrings', 4),
  ('Biceps', 5),
  ('Triceps', 6),
  ('Shoulders', 7),
  ('Abs', 8),
  ('Calves', 9),
  ('Traps', 10);