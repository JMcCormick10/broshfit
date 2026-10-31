alter table public.workout_session_sets
  drop constraint if exists workout_session_sets_actual_weight_length_check;

alter table public.workout_session_sets
  alter column actual_weight type numeric
  using nullif(trim(actual_weight), '')::numeric;

create or replace function public.save_workout_session_exercise(
  target_session_exercise_id uuid,
  set_updates jsonb,
  exercise_notes text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  expected_set_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to update workout progress.';
  end if;

  perform 1
  from public.workout_session_exercises as session_exercise
  join public.workout_sessions as workout_session
    on workout_session.id = session_exercise.session_id
  where session_exercise.id = target_session_exercise_id
    and workout_session.performed_by = auth.uid()
    and workout_session.status = 'in_progress';

  if not found then
    raise exception 'Active workout exercise not found.';
  end if;

  select count(*) into expected_set_count
  from public.workout_session_sets
  where session_exercise_id = target_session_exercise_id;

  if coalesce(jsonb_typeof(set_updates), '') <> 'array'
     or jsonb_array_length(set_updates) <> expected_set_count then
    raise exception 'Every set must be provided exactly once.';
  end if;

  if length(coalesce(exercise_notes, '')) > 2000 then
    raise exception 'Exercise notes cannot exceed 2000 characters.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(set_updates) as set_update(value)
    where coalesce(jsonb_typeof(set_update.value), '') <> 'object'
      or (set_update.value ->> 'setNumber') is null
      or (set_update.value ->> 'setNumber')::integer < 1
      or (set_update.value ->> 'setNumber')::integer > expected_set_count
      or ((set_update.value ->> 'actualReps') is not null
        and (set_update.value ->> 'actualReps')::integer not between 0 and 1000)
      or length(coalesce(set_update.value ->> 'actualWeight', '')) > 40
      or not exists (
        select 1
        from public.workout_session_sets
        where session_exercise_id = target_session_exercise_id
          and set_number = (set_update.value ->> 'setNumber')::integer
      )
  ) then
    raise exception 'Each existing set must receive a valid rep count and weight.';
  end if;

  with set_update as (
    select value
    from jsonb_array_elements(set_updates)
  )
  update public.workout_session_sets as session_set
  set
    actual_reps = (set_update.value ->> 'actualReps')::integer,
    actual_weight = nullif(trim(set_update.value ->> 'actualWeight'), '')::numeric
  from set_update
  where session_set.session_exercise_id = target_session_exercise_id
    and session_set.set_number = (set_update.value ->> 'setNumber')::integer;

  update public.workout_session_exercises as session_exercise
  set notes = coalesce(exercise_notes, '')
  where session_exercise.id = target_session_exercise_id;
end;
$$;

create or replace function public.update_completed_workout_session(
  target_session_id uuid,
  completion_completed_at timestamptz,
  exercise_updates jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  expected_exercise_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to edit a completed workout.';
  end if;

  if completion_completed_at is null then
    raise exception 'A completed date is required.';
  end if;

  if not exists (
    select 1
    from public.workout_sessions
    where id = target_session_id
      and performed_by = auth.uid()
      and status = 'completed'
  ) then
    raise exception 'Completed workout session not found.';
  end if;

  select count(*) into expected_exercise_count
  from public.workout_session_exercises
  where session_id = target_session_id
    and completed_at is not null;

  if expected_exercise_count = 0 then
    raise exception 'This workout has no completed exercises to edit.';
  end if;

  if coalesce(jsonb_typeof(exercise_updates), '') <> 'array'
     or jsonb_array_length(exercise_updates) <> expected_exercise_count then
    raise exception 'Every completed exercise must be included exactly once.';
  end if;

  with updated_exercises as (
    select value
    from jsonb_array_elements(exercise_updates) as exercise_update(value)
  )
  update public.workout_session_exercises as session_exercise
  set
    notes = coalesce(updated_exercises.value ->> 'notes', ''),
    completed_order = (updated_exercises.value ->> 'completedOrder')::integer
  from updated_exercises
  where session_exercise.id = (updated_exercises.value ->> 'sessionExerciseId')::uuid
    and session_exercise.session_id = target_session_id
    and session_exercise.completed_at is not null;

  with updated_exercises as (
    select value
    from jsonb_array_elements(exercise_updates) as exercise_update(value)
  ), updated_sets as (
    select
      (updated_exercise.value ->> 'sessionExerciseId')::uuid as session_exercise_id,
      set_update.value
    from updated_exercises as updated_exercise
    cross join lateral jsonb_array_elements(updated_exercise.value -> 'sets') as set_update(value)
  )
  update public.workout_session_sets as session_set
  set
    actual_reps = (updated_sets.value ->> 'actualReps')::integer,
    actual_weight = nullif(trim(updated_sets.value ->> 'actualWeight'), '')::numeric
  from updated_sets
  where session_set.session_exercise_id = updated_sets.session_exercise_id
    and session_set.set_number = (updated_sets.value ->> 'setNumber')::integer;

  update public.workout_sessions
  set completed_at = completion_completed_at
  where id = target_session_id
    and performed_by = auth.uid()
    and status = 'completed';

  update public.completed_workouts
  set completed_at = completion_completed_at
  where session_id = target_session_id
    and completed_by = auth.uid();

  return target_session_id;
end;
$$;
