alter table public.workout_sessions
  add column workout_name text,
  alter column workout_id drop not null,
  add constraint workout_sessions_routine_or_name_check
    check (
      workout_id is not null
      or (
        workout_name is not null
        and length(trim(workout_name)) between 1 and 80
      )
    );

alter table public.completed_workouts
  alter column workout_id drop not null,
  add constraint completed_workouts_routine_or_session_check
    check (workout_id is not null or session_id is not null);

create or replace function public.start_freestyle_workout_session()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  new_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to start a workout.';
  end if;

  insert into public.workout_sessions (
    workout_name,
    performed_by
  )
  values (
    'Freestyle Workout',
    auth.uid()
  )
  returning id into new_session_id;

  return new_session_id;
end;
$function$;

create or replace function public.finish_workout_session(
  target_session_id uuid,
  allow_incomplete boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  target_workout_id uuid;
  completed_exercise_count integer;
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

  if target_workout_id is null then
    select count(*) into completed_exercise_count
    from public.workout_session_exercises
    where session_id = target_session_id
      and completed_at is not null;

    if completed_exercise_count = 0 then
      raise exception
        'Complete at least one exercise before saving a freestyle workout.';
    end if;
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
    workout_id,
    completed_by,
    completed_at,
    session_id
  )
  values (
    target_workout_id,
    auth.uid(),
    finished_at,
    target_session_id
  );

  return target_session_id;
end;
$function$;

revoke all on function public.start_freestyle_workout_session()
  from public, anon;
grant execute on function public.start_freestyle_workout_session()
  to authenticated;

revoke all on function public.finish_workout_session(uuid, boolean)
  from public, anon;
grant execute on function public.finish_workout_session(uuid, boolean)
  to authenticated;
