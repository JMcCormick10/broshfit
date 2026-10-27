create or replace function public.save_workout_session_exercise(
  target_session_exercise_id uuid,
  actual_reps integer[],
  exercise_notes text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  expected_set_count integer;
  provided_reps integer[];
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to update workout progress.';
  end if;

  perform 1
  from public.workout_session_exercises
  join public.workout_sessions
    on workout_sessions.id = workout_session_exercises.session_id
  where workout_session_exercises.id = target_session_exercise_id
    and workout_sessions.performed_by = auth.uid()
    and workout_sessions.status = 'in_progress'
    and workout_session_exercises.completed_at is null;

  if not found then
    raise exception 'Active workout exercise not found.';
  end if;

  select count(*) into expected_set_count
  from public.workout_session_sets
  where session_exercise_id = target_session_exercise_id;

  provided_reps := actual_reps;
  if coalesce(cardinality(provided_reps), 0) <> expected_set_count then
    raise exception 'Rep values must match the number of sets.';
  end if;

  if length(coalesce(exercise_notes, '')) > 2000 then
    raise exception 'Exercise notes cannot exceed 2000 characters.';
  end if;

  update public.workout_session_sets as session_set
  set actual_reps = provided_reps[session_set.set_number]
  where session_set.session_exercise_id = target_session_exercise_id;

  update public.workout_session_exercises
  set notes = coalesce(exercise_notes, '')
  where id = target_session_exercise_id;
end;
$function$;

revoke all on function public.save_workout_session_exercise(uuid, integer[], text)
  from public, anon;
grant execute on function public.save_workout_session_exercise(uuid, integer[], text)
  to authenticated;