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
  updated_exercise record;
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

  if jsonb_array_length(exercise_updates) <> expected_exercise_count then
    raise exception 'Every completed exercise must be included exactly once.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(exercise_updates)
      as exercise_update(
        sessionExerciseId uuid,
        sets jsonb,
        notes text,
        completedOrder integer
      )
    where exercise_update.sessionExerciseId is null
      or exercise_update.completedOrder is null
      or exercise_update.completedOrder < 1
      or length(coalesce(exercise_update.notes, '')) > 2000
      or coalesce(jsonb_typeof(exercise_update.sets), '') <> 'array'
      or jsonb_array_length(exercise_update.sets) = 0
  ) then
    raise exception 'Each completed exercise needs a valid set list, notes, and completion order.';
  end if;

  if (
    select count(*) <> expected_exercise_count
    from (
      select distinct exercise_update.sessionExerciseId
      from jsonb_to_recordset(exercise_updates)
        as exercise_update(
          sessionExerciseId uuid,
          sets jsonb,
          notes text,
          completedOrder integer
        )
    ) as unique_exercises
  ) then
    raise exception 'Every completed exercise must be included exactly once.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(exercise_updates)
      as exercise_update(
        sessionExerciseId uuid,
        sets jsonb,
        notes text,
        completedOrder integer
      )
    where not exists (
      select 1
      from public.workout_session_exercises
      where id = exercise_update.sessionExerciseId
        and session_id = target_session_id
        and completed_at is not null
    )
  ) then
    raise exception 'Only completed exercises from this workout can be edited.';
  end if;

  for updated_exercise in
    select
      exercise_update.sessionExerciseId,
      exercise_update.sets,
      exercise_update.notes,
      exercise_update.completedOrder
    from jsonb_to_recordset(exercise_updates)
      as exercise_update(
        sessionExerciseId uuid,
        sets jsonb,
        notes text,
        completedOrder integer
      )
  loop
    if exists (
      select 1
      from jsonb_to_recordset(updated_exercise.sets)
        as set_update(
          setNumber integer,
          actualReps integer,
          actualWeight text
        )
      where set_update.setNumber is null
        or set_update.setNumber < 1
        or set_update.setNumber > 30
        or (set_update.actualReps is not null
          and set_update.actualReps not between 0 and 1000)
        or length(coalesce(set_update.actualWeight, '')) > 40
        or not exists (
          select 1
          from public.workout_session_sets
          where session_exercise_id = updated_exercise.sessionExerciseId
            and set_number = set_update.setNumber
        )
    ) then
      raise exception 'Set values must use valid set numbers, rep counts, and weights.';
    end if;

    update public.workout_session_sets as session_set
    set
      actual_reps = set_update.actualReps,
      actual_weight = nullif(trim(set_update.actualWeight), '')
    from jsonb_to_recordset(updated_exercise.sets)
      as set_update(
        setNumber integer,
        actualReps integer,
        actualWeight text
      )
    where session_set.session_exercise_id = updated_exercise.sessionExerciseId
      and session_set.set_number = set_update.setNumber;
  end loop;

  update public.workout_session_exercises as session_exercise
  set
    notes = exercise_update.notes,
    completed_order = exercise_update.completedOrder
  from jsonb_to_recordset(exercise_updates)
    as exercise_update(
      sessionExerciseId uuid,
      sets jsonb,
      notes text,
      completedOrder integer
    )
  where session_exercise.id = exercise_update.sessionExerciseId;

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
