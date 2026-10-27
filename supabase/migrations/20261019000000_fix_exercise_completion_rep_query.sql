create or replace function public.complete_workout_session_exercise(
  target_session_exercise_id uuid,
  actual_reps integer[],
  exercise_notes text,
  allow_incomplete boolean default false
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  target_session_id uuid;
  next_completion_order integer;
  incomplete_set_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to complete an exercise.';
  end if;

  select session_exercise.session_id
  into target_session_id
  from public.workout_session_exercises as session_exercise
  join public.workout_sessions as session
    on session.id = session_exercise.session_id
  where session_exercise.id = target_session_exercise_id
    and session.performed_by = auth.uid()
    and session.status = 'in_progress'
    and session_exercise.completed_at is null
  for update of session;

  if not found then
    raise exception 'Active workout exercise not found.';
  end if;

  perform public.save_workout_session_exercise(
    target_session_exercise_id,
    actual_reps,
    exercise_notes
  );

  select count(*) into incomplete_set_count
  from public.workout_session_sets as session_set
  where session_set.session_exercise_id = target_session_exercise_id
    and session_set.actual_reps is null;

  if incomplete_set_count > 0 and not allow_incomplete then
    raise exception 'Some sets have no recorded reps. Confirm to complete anyway.';
  end if;

  select coalesce(max(session_exercise.completed_order), 0) + 1
  into next_completion_order
  from public.workout_session_exercises as session_exercise
  where session_exercise.session_id = target_session_id;

  update public.workout_session_exercises as session_exercise
  set
    completed_order = next_completion_order,
    completed_at = now()
  where session_exercise.id = target_session_exercise_id;

  return next_completion_order;
end;
$function$;

revoke all on function public.complete_workout_session_exercise(uuid, integer[], text, boolean)
  from public, anon;
grant execute on function public.complete_workout_session_exercise(uuid, integer[], text, boolean)
  to authenticated;