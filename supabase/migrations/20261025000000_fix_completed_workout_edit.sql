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

  if coalesce(jsonb_typeof(exercise_updates), '') <> 'array' then
    raise exception 'Exercise updates must be provided as a list.';
  end if;

  for updated_exercise in
    select value
    from jsonb_array_elements(exercise_updates)
  loop
    if coalesce(jsonb_typeof(updated_exercise.value), '') <> 'object' then
      raise exception 'Each completed exercise update must be an object.';
    end if;

    if (updated_exercise.value ->> 'sessionExerciseId')::uuid is null then
      raise exception 'Each update needs a session exercise ID.';
    end if;

    if coalesce(jsonb_typeof(updated_exercise.value -> 'sets'), '') <> 'array' then
      raise exception 'Each exercise update needs a set list.';
    end if;

    if jsonb_array_length(updated_exercise.value -> 'sets') = 0 then
      raise exception 'Each exercise update needs at least one set.';
    end if;

    if length(coalesce(updated_exercise.value ->> 'notes', '')) > 2000 then
      raise exception 'Exercise notes cannot exceed 2000 characters.';
    end if;

    if updated_exercise.value ->> 'completedOrder' is null
       or (updated_exercise.value ->> 'completedOrder')::integer < 1 then
      raise exception 'Each exercise needs a valid completion order.';
    end if;

    perform 1
    from public.workout_session_exercises
    where id = (updated_exercise.value ->> 'sessionExerciseId')::uuid
      and session_id = target_session_id
      and completed_at is not null;

    if not found then
      raise exception 'Only completed exercises from this workout can be edited.';
    end if;

    update public.workout_session_exercises
    set
      notes = coalesce(updated_exercise.value ->> 'notes', ''),
      completed_order = (updated_exercise.value ->> 'completedOrder')::integer
    where id = (updated_exercise.value ->> 'sessionExerciseId')::uuid;

    perform 1
    from jsonb_array_elements(updated_exercise.value -> 'sets') as set_entry(value)
    where (set_entry.value ->> 'setNumber')::integer is null
       or (set_entry.value ->> 'setNumber')::integer < 1
       or (set_entry.value ->> 'setNumber')::integer > 30
       or ((set_entry.value ->> 'actualReps') is not null
         and (set_entry.value ->> 'actualReps')::integer not between 0 and 1000)
       or length(coalesce(set_entry.value ->> 'actualWeight', '')) > 40
       or not exists (
         select 1
         from public.workout_session_sets
         where session_exercise_id = (updated_exercise.value ->> 'sessionExerciseId')::uuid
           and set_number = (set_entry.value ->> 'setNumber')::integer
       );

    if found then
      raise exception 'Set values must use valid set numbers, rep counts, and weights.';
    end if;

    update public.workout_session_sets as session_set
    set
      actual_reps = (set_entry.value ->> 'actualReps')::integer,
      actual_weight = nullif(trim(set_entry.value ->> 'actualWeight'), '')
    from jsonb_array_elements(updated_exercise.value -> 'sets') as set_entry(value)
    where session_set.session_exercise_id = (updated_exercise.value ->> 'sessionExerciseId')::uuid
      and session_set.set_number = (set_entry.value ->> 'setNumber')::integer;
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
