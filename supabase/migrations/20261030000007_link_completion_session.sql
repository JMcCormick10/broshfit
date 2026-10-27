-- finish_workout_session inserted completed_workouts rows without linking
-- them to the session, so newly completed workouts could not be edited or
-- deleted. Include session_id in the insert and backfill rows that were
-- completed while the link was missing (both tables share the same
-- completed_at value written from finished_at).

create or replace function public.finish_workout_session(
  target_session_id uuid,
  allow_incomplete boolean default false
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  target_workout_id uuid;
  uncompleted_exercise_count integer;
  finished_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to finish a workout.';
  end if;

  select workout_id into target_workout_id
  from public.workout_sessions
  where id = target_session_id
    and performed_by = auth.uid()
    and status = 'in_progress'
  for update;

  if not found then
    raise exception 'Active workout session not found.';
  end if;

  select count(*) into uncompleted_exercise_count
  from public.workout_session_exercises
  where session_id = target_session_id
    and completed_at is null;

  if uncompleted_exercise_count > 0 and not allow_incomplete then
    raise exception 'Some exercises are not complete. Confirm to finish anyway.';
  end if;

  update public.workout_sessions
  set status = 'completed', completed_at = finished_at
  where id = target_session_id;

  insert into public.completed_workouts (
    workout_id, completed_by, completed_at, session_id
  )
  values (target_workout_id, auth.uid(), finished_at, target_session_id);

  return target_session_id;
end;
$$;

update public.completed_workouts as completed
set session_id = session.id
from public.workout_sessions as session
where completed.session_id is null
  and completed.workout_id = session.workout_id
  and completed.completed_by = session.performed_by
  and completed.completed_at = session.completed_at;
