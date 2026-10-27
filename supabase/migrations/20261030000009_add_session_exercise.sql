-- Allow adding ad-hoc exercises to an in-progress workout session.
-- The exercise is appended after the routine's entries with three empty sets
-- and no source_workout_exercise_id, since it is not part of the routine.

create or replace function public.add_workout_session_exercise(
  target_session_id uuid,
  target_exercise_id uuid
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  next_position integer;
  new_session_exercise_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to add an exercise.';
  end if;

  perform 1
  from public.workout_sessions
  where id = target_session_id
    and performed_by = auth.uid()
    and status = 'in_progress'
  for update;

  if not found then
    raise exception 'Active workout session not found.';
  end if;

  if not exists (
    select 1 from public.exercises where id = target_exercise_id
  ) then
    raise exception 'Exercise not found.';
  end if;

  select coalesce(max(routine_position), 0) + 1 into next_position
  from public.workout_session_exercises
  where session_id = target_session_id;

  insert into public.workout_session_exercises (
    session_id,
    exercise_id,
    routine_position,
    prescribed_set_count
  )
  values (target_session_id, target_exercise_id, next_position, 3)
  returning id into new_session_exercise_id;

  insert into public.workout_session_sets (session_exercise_id, set_number)
  select new_session_exercise_id, set_number
  from generate_series(1, 3) as set_number;

  return new_session_exercise_id;
end;
$$;
