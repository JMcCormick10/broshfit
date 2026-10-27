-- save_workout_session_exercise parsed set updates with jsonb_to_recordset
-- using snake_case column names, but the client sends camelCase keys
-- (setNumber, actualReps, actualWeight). Every row parsed as NULL and the
-- validation raised "Each existing set must receive a valid rep count and
-- weight." for any save. Reps stay optional-nullable and weight stays
-- optional; only the key parsing changes.

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
    actual_weight = nullif(trim(set_update.value ->> 'actualWeight'), '')
  from set_update
  where session_set.session_exercise_id = target_session_exercise_id
    and session_set.set_number = (set_update.value ->> 'setNumber')::integer;

  update public.workout_session_exercises as session_exercise
  set notes = coalesce(exercise_notes, '')
  where session_exercise.id = target_session_exercise_id;
end;
$$;
