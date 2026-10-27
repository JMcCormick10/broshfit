alter table public.workouts
  add column archived_at timestamptz;

create table public.completed_workouts (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete restrict,
  completed_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now()
);

create index completed_workouts_workout_id_idx
  on public.completed_workouts (workout_id);

alter table public.completed_workouts enable row level security;

grant select, insert on public.completed_workouts to authenticated;

create policy "Users can read their own completed workouts"
  on public.completed_workouts
  for select
  to authenticated
  using (completed_by = auth.uid());

create policy "Users can record their own completed workouts"
  on public.completed_workouts
  for insert
  to authenticated
  with check (completed_by = auth.uid());

grant update on public.workouts to authenticated;
grant delete on public.workout_exercises to authenticated;

create policy "Authenticated users can update shared workouts"
  on public.workouts
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Authenticated users can replace workout exercises"
  on public.workout_exercises
  for delete
  to authenticated
  using (auth.uid() is not null);

create or replace function public.update_workout(
  target_workout_id uuid,
  workout_name text,
  workout_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  workout_exercise_id uuid;
  exercise_entry record;
  set_entry record;
  target_reps text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to update a workout.';
  end if;

  if workout_name is null or length(trim(workout_name)) not between 1 and 80 then
    raise exception 'Workout name must be between 1 and 80 characters.';
  end if;

  if coalesce(jsonb_typeof(workout_items), '') <> 'array' then
    raise exception 'Workout exercises must be provided as a list.';
  end if;

  if jsonb_array_length(workout_items) = 0 then
    raise exception 'Add at least one exercise to the workout.';
  end if;

  update public.workouts
  set name = regexp_replace(trim(workout_name), '[[:space:]]+', ' ', 'g')
  where id = target_workout_id;

  if not found then
    raise exception 'Workout routine not found.';
  end if;

  delete from public.workout_exercises
  where workout_id = target_workout_id;

  for exercise_entry in
    select value, ordinality
    from jsonb_array_elements(workout_items) with ordinality
  loop
    if coalesce(jsonb_typeof(exercise_entry.value -> 'targetReps'), '') <> 'array'
       or jsonb_array_length(exercise_entry.value -> 'targetReps') not between 1 and 30 then
      raise exception 'Each exercise must have between 1 and 30 sets.';
    end if;

    insert into public.workout_exercises (workout_id, exercise_id, position)
    values (
      target_workout_id,
      (exercise_entry.value ->> 'exerciseId')::uuid,
      exercise_entry.ordinality
    )
    returning id into workout_exercise_id;

    for set_entry in
      select value, ordinality
      from jsonb_array_elements(exercise_entry.value -> 'targetReps') with ordinality
    loop
      if set_entry.value = 'null'::jsonb then
        target_reps := null;
      elsif jsonb_typeof(set_entry.value) = 'string' then
        target_reps := set_entry.value #>> '{}';
      else
        raise exception 'Set rep targets must be strings or null.';
      end if;

      insert into public.workout_sets (
        workout_exercise_id, set_number, target_reps
      )
      values (workout_exercise_id, set_entry.ordinality, target_reps);
    end loop;
  end loop;

  return target_workout_id;
end;
$function$;

create or replace function public.archive_workout(
  target_workout_id uuid,
  should_archive boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to archive a workout.';
  end if;

  update public.workouts
  set archived_at = case when should_archive then now() else null end
  where id = target_workout_id;

  if not found then
    raise exception 'Workout routine not found.';
  end if;

  return should_archive;
end;
$function$;

create or replace function public.delete_workout(target_workout_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to delete a workout.';
  end if;

  perform 1
  from public.workouts
  where id = target_workout_id
  for update;

  if not found then
    raise exception 'Workout routine not found.';
  end if;

  if exists (
    select 1
    from public.completed_workouts
    where workout_id = target_workout_id
  ) then
    update public.workouts
    set archived_at = coalesce(archived_at, now())
    where id = target_workout_id;
    return true;
  end if;

  delete from public.workouts
  where id = target_workout_id;
  return false;
end;
$function$;

revoke all on function public.update_workout(uuid, text, jsonb) from public, anon;
revoke all on function public.archive_workout(uuid, boolean) from public, anon;
revoke all on function public.delete_workout(uuid) from public, anon;
grant execute on function public.update_workout(uuid, text, jsonb) to authenticated;
grant execute on function public.archive_workout(uuid, boolean) to authenticated;
grant execute on function public.delete_workout(uuid) to authenticated;