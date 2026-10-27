alter table public.exercises
  add column if not exists equipment text;

update public.exercises
set equipment = 'Other'
where equipment is null;

alter table public.exercises
  alter column equipment set not null;

alter table public.exercises
  drop constraint if exists exercises_equipment_check,
  drop constraint if exists exercises_equipment_allowed_check,
  add constraint exercises_equipment_allowed_check check (
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
  );

drop index if exists public.exercises_name_lower_key;

create unique index if not exists exercises_equipment_normalized_name_key
  on public.exercises (
    equipment,
    (lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')))
  );

grant update on public.exercises to authenticated;
grant delete on public.exercise_muscle_groups to authenticated;

create policy "Authenticated users can update shared exercises"
  on public.exercises
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Authenticated users can replace exercise muscle targets"
  on public.exercise_muscle_groups
  for delete
  to authenticated
  using (auth.uid() is not null);

drop function if exists public.create_exercise(text, uuid[], uuid[]);
drop function if exists public.create_exercise(text, text, uuid[], uuid[]);

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
    'Barbell', 'Dumbbell', 'Bodyweight', 'Cable', 'Machine', 'Kettlebell',
    'Resistance Band', 'Other'
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
    exercise_id, muscle_group_id, role
  )
  select new_exercise_id, target.muscle_group_id, 'primary'
  from (
    select distinct unnest(coalesce(primary_muscle_group_ids, '{}'::uuid[]))
      as muscle_group_id
  ) as target;

  insert into public.exercise_muscle_groups (
    exercise_id, muscle_group_id, role
  )
  select new_exercise_id, target.muscle_group_id, 'secondary'
  from (
    select distinct unnest(coalesce(secondary_muscle_group_ids, '{}'::uuid[]))
      as muscle_group_id
  ) as target;

  return new_exercise_id;
end;
$function$;

create or replace function public.update_exercise(
  target_exercise_id uuid,
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
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to edit an exercise.';
  end if;

  if exercise_name is null or length(trim(exercise_name)) not between 1 and 80 then
    raise exception 'Exercise name must be between 1 and 80 characters.';
  end if;

  if exercise_equipment is null or exercise_equipment not in (
    'Barbell', 'Dumbbell', 'Bodyweight', 'Cable', 'Machine', 'Kettlebell',
    'Resistance Band', 'Other'
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

  perform 1
  from public.exercises
  where id = target_exercise_id
  for update;

  if not found then
    raise exception 'Exercise not found.';
  end if;

  update public.exercises
  set
    name = regexp_replace(trim(exercise_name), '[[:space:]]+', ' ', 'g'),
    equipment = exercise_equipment
  where id = target_exercise_id;

  delete from public.exercise_muscle_groups
  where exercise_id = target_exercise_id;

  insert into public.exercise_muscle_groups (
    exercise_id, muscle_group_id, role
  )
  select target_exercise_id, target.muscle_group_id, 'primary'
  from (
    select distinct unnest(coalesce(primary_muscle_group_ids, '{}'::uuid[]))
      as muscle_group_id
  ) as target;

  insert into public.exercise_muscle_groups (
    exercise_id, muscle_group_id, role
  )
  select target_exercise_id, target.muscle_group_id, 'secondary'
  from (
    select distinct unnest(coalesce(secondary_muscle_group_ids, '{}'::uuid[]))
      as muscle_group_id
  ) as target;

  return target_exercise_id;
end;
$function$;

revoke all on function public.create_exercise(text, text, uuid[], uuid[]) from public, anon;
revoke all on function public.update_exercise(uuid, text, text, uuid[], uuid[]) from public, anon;
grant execute on function public.create_exercise(text, text, uuid[], uuid[]) to authenticated;
grant execute on function public.update_exercise(uuid, text, text, uuid[], uuid[]) to authenticated;