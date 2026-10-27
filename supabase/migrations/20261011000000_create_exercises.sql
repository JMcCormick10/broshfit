create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  equipment text not null check (
    equipment in (
      'Barbell',
      'Dumbbell',
      'Bodyweight',
      'Cable',
      'Machine',
      'Kettlebell',
      'Resistance Band',
      'Other'
    )
  ),
  created_at timestamptz not null default now()
);

create unique index exercises_equipment_normalized_name_key
  on public.exercises (
    equipment,
    (lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')))
  );

alter table public.exercises enable row level security;

grant select on public.exercises to anon, authenticated;
grant insert on public.exercises to authenticated;

create policy "Exercises are readable by app visitors"
  on public.exercises
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can add shared exercises"
  on public.exercises
  for insert
  to authenticated
  with check (auth.uid() is not null);

create table public.exercise_muscle_groups (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  muscle_group_id uuid not null references public.muscle_groups(id) on delete restrict,
  role text not null check (role in ('primary', 'secondary')),
  primary key (exercise_id, muscle_group_id)
);

alter table public.exercise_muscle_groups enable row level security;

grant select on public.exercise_muscle_groups to anon, authenticated;
grant insert on public.exercise_muscle_groups to authenticated;

create policy "Exercise muscle targets are readable by app visitors"
  on public.exercise_muscle_groups
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can add exercise muscle targets"
  on public.exercise_muscle_groups
  for insert
  to authenticated
  with check (auth.uid() is not null);

create or replace function public.create_exercise(
  exercise_name text,
  exercise_equipment text,
  primary_muscle_group_ids uuid[],
  secondary_muscle_group_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  new_exercise_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to create an exercise.';
  end if;

  if exercise_name is null or length(trim(exercise_name)) not between 1 and 80 then
    raise exception 'Exercise name must be between 1 and 80 characters.';
  end if;

  if exercise_equipment is null or exercise_equipment not in (
    'Barbell',
    'Dumbbell',
    'Bodyweight',
    'Cable',
    'Machine',
    'Kettlebell',
    'Resistance Band',
    'Other'
  ) then
    raise exception 'Choose a valid equipment type.';
  end if;

  if coalesce(cardinality(primary_muscle_group_ids), 0) = 0 then
    raise exception 'At least one primary muscle group is required.';
  end if;

  if coalesce(primary_muscle_group_ids, '{}'::uuid[]) &&
     coalesce(secondary_muscle_group_ids, '{}'::uuid[]) then
    raise exception 'A muscle group cannot be both primary and secondary.';
  end if;

  insert into public.exercises (name, equipment)
  values (
    regexp_replace(trim(exercise_name), '[[:space:]]+', ' ', 'g'),
    exercise_equipment
  )
  returning id into new_exercise_id;

  insert into public.exercise_muscle_groups (
    exercise_id,
    muscle_group_id,
    role
  )
  select new_exercise_id, target.muscle_group_id, 'primary'
  from (
    select distinct unnest(coalesce(primary_muscle_group_ids, '{}'::uuid[]))
      as muscle_group_id
  ) as target;

  insert into public.exercise_muscle_groups (
    exercise_id,
    muscle_group_id,
    role
  )
  select new_exercise_id, target.muscle_group_id, 'secondary'
  from (
    select distinct unnest(coalesce(secondary_muscle_group_ids, '{}'::uuid[]))
      as muscle_group_id
  ) as target;

  return new_exercise_id;
end;
$function$;

revoke all on function public.create_exercise(text, text, uuid[], uuid[]) from public, anon;
grant execute on function public.create_exercise(text, text, uuid[], uuid[]) to authenticated;