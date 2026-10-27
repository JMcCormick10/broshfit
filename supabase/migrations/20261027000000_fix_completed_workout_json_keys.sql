create or replace function public.update_completed_workout_session(
  target_session_id uuid,
  completion_completed_at timestamptz,
  exercise_updates jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  expected_exercise_count integer;
  provided_exercise_count integer;
  updated_exercise record;
  set_update record;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to edit a completed workout.';
  end if;

  if completion_completed_at is null then
    raise exception 'A completed date is required.';
  end if;

  perform 1
  from public.workout_sessions
  where id = target_session_id
    and performed_by = auth.uid()
    and status = 'completed'
  for update;

  if not found then
    raise exception 'Completed workout session not found.';
  end if;

  select count(*) into expected_exercise_count
  from public.workout_session_exercises
  where session_id = target_session_id
    and completed_at is not null;

  if expected_exercise_count = 0 then
    raise exception 'This workout has no completed exercises to edit.';
  end if;

  if coalesce(jsonb_typeof(exercise_updates), '') <> 'array' then
    raise exception 'Exercise updates must be provided as a list.';
  end if;

  select count(distinct (exercise_update.value ->> 'sessionExerciseId')::uuid)
  into provided_exercise_count
  from jsonb_array_elements(exercise_updates) as exercise_update(value);

  if provided_exercise_count <> expected_exercise_count then
    raise exception 'Every completed exercise must be included exactly once.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(exercise_updates) as exercise_update(value)
    where coalesce(jsonb_typeof(exercise_update.value), '') <> 'object'
      or (exercise_update.value ->> 'sessionExerciseId') is null
      or (exercise_update.value ->> 'completedOrder') is null
      or (exercise_update.value ->> 'completedOrder')::integer < 1
      or length(coalesce(exercise_update.value ->> 'notes', '')) > 2000
      or coalesce(jsonb_typeof(exercise_update.value -> 'sets'), '') <> 'array'
      or jsonb_array_length(exercise_update.value -> 'sets') = 0
  ) then
    raise exception 'Each completed exercise needs a valid set list, notes, and completion order.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(exercise_updates) as exercise_update(value)
    where not exists (
      select 1
      from public.workout_session_exercises
      where id = (exercise_update.value ->> 'sessionExerciseId')::uuid
        and session_id = target_session_id
        and completed_at is not null
    )
  ) then
    raise exception 'Only completed exercises from this workout can be edited.';
  end if;

  for updated_exercise in
    select exercise_update.value
    from jsonb_array_elements(exercise_updates) as exercise_update(value)
  loop
    for set_update in
      select set_entry.value
      from jsonb_array_elements(updated_exercise.value -> 'sets') as set_entry(value)
    loop
      if (set_update.value ->> 'setNumber') is null
         or (set_update.value ->> 'setNumber')::integer < 1
         or (set_update.value ->> 'setNumber')::integer > 30
         or ((set_update.value ->> 'actualReps') is not null
           and (set_update.value ->> 'actualReps')::integer not between 0 and 1000)
         or length(coalesce(set_update.value ->> 'actualWeight', '')) > 40 then
        raise exception 'Set values must use valid set numbers, rep counts, and weights.';
      end if;

      update public.workout_session_sets as session_set
      set
        actual_reps = (set_update.value ->> 'actualReps')::integer,
        actual_weight = nullif(trim(set_update.value ->> 'actualWeight'), '')
      where session_set.session_exercise_id =
        (updated_exercise.value ->> 'sessionExerciseId')::uuid
        and session_set.set_number = (set_update.value ->> 'setNumber')::integer;

      if not found then
        raise exception 'Only existing set rows can be edited.';
      end if;
    end loop;

    update public.workout_session_exercises as session_exercise
    set
      notes = coalesce(updated_exercise.value ->> 'notes', ''),
      completed_order = (updated_exercise.value ->> 'completedOrder')::integer
    where session_exercise.id =
      (updated_exercise.value ->> 'sessionExerciseId')::uuid;
  end loop;

  update public.workout_sessions
  set completed_at = completion_completed_at
  where id = target_session_id;

  update public.completed_workouts
  set completed_at = completion_completed_at
  where session_id = target_session_id
    and completed_by = auth.uid();

  return target_session_id;
end;
$function$;

revoke all on function public.update_completed_workout_session(uuid, timestamptz, jsonb)
  from public, anon;
grant execute on function public.update_completed_workout_session(uuid, timestamptz, jsonb)
  to authenticated;
