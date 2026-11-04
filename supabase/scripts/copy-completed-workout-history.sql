-- Run in the Supabase SQL Editor.
-- Change source_profile_name to select the source profile.
-- The Test profile is the Ginyu sandbox. The default is a dry run; set
-- apply_copy to true and rerun only after reviewing the preview notices.
do $copy_completed_workout_history$
declare
  source_profile_name text := 'Brad';
  target_profile_name constant text := 'Test';
  apply_copy constant boolean := false;
  source_profile_id uuid;
  target_profile_id uuid;
  source_user_id uuid;
  target_user_id uuid;
  matching_profile_count integer;
  source_session_count bigint;
  source_completion_count bigint;
  target_session_count bigint;
  target_completion_count bigint;
  copied_session_count bigint;
  copied_exercise_count bigint;
  copied_set_count bigint;
  copied_completion_count bigint;
begin
  select count(*)
  into matching_profile_count
  from public.profiles
  where lower(trim(name)) = lower(trim(source_profile_name));

  if matching_profile_count <> 1 then
    raise exception 'Expected one source profile named "%", found %.',
      source_profile_name, matching_profile_count;
  end if;

  select id
  into source_profile_id
  from public.profiles
  where lower(trim(name)) = lower(trim(source_profile_name));

  select count(*)
  into matching_profile_count
  from public.profiles
  where lower(trim(name)) = lower(trim(target_profile_name));

  if matching_profile_count <> 1 then
    raise exception 'Expected one target profile named "%", found %.',
      target_profile_name, matching_profile_count;
  end if;

  select id
  into target_profile_id
  from public.profiles
  where lower(trim(name)) = lower(trim(target_profile_name));

  if source_profile_id = target_profile_id then
    raise exception 'The source and target profiles must be different.';
  end if;

  select id
  into source_user_id
  from auth.users
  where email = 'profile-' || source_profile_id::text || '@broshfit.invalid';

  if source_user_id is null then
    raise exception 'No Auth user found for source profile "%".',
      source_profile_name;
  end if;

  select id
  into target_user_id
  from auth.users
  where email = 'profile-' || target_profile_id::text || '@broshfit.invalid';

  if target_user_id is null then
    raise exception 'No Auth user found for target profile "%".',
      target_profile_name;
  end if;

  select count(*)
  into source_session_count
  from public.workout_sessions
  where performed_by = source_user_id
    and status = 'completed';

  select count(*)
  into source_completion_count
  from public.completed_workouts
  where completed_by = source_user_id;

  select count(*)
  into target_session_count
  from public.workout_sessions
  where performed_by = target_user_id
    and status = 'completed';

  select count(*)
  into target_completion_count
  from public.completed_workouts
  where completed_by = target_user_id;

  if exists (
    select 1
    from public.completed_workouts as completion
    left join public.workout_sessions as session
      on session.id = completion.session_id
    where completion.completed_by = source_user_id
      and completion.session_id is not null
      and (
        session.id is null
        or session.performed_by <> source_user_id
        or session.status <> 'completed'
      )
  ) then
    raise exception 'Source completed-workout records contain invalid session links.';
  end if;

  if exists (
    select 1
    from public.workout_sessions as session
    where session.performed_by = source_user_id
      and session.status = 'completed'
      and not exists (
        select 1
        from public.completed_workouts as completion
        where completion.session_id = session.id
          and completion.completed_by = source_user_id
      )
  ) then
    raise exception 'A completed source session has no completed-workout record.';
  end if;

  raise notice
    'Source "%": % completed sessions and % completed-workout records.',
    source_profile_name, source_session_count, source_completion_count;
  raise notice
    'Target "%": currently has % completed sessions and % completed-workout records.',
    target_profile_name, target_session_count, target_completion_count;

  if not apply_copy then
    raise notice
      'Dry run only. Set apply_copy to true and rerun to replace the target''s completed history.';
    return;
  end if;

  create temporary table copy_session_id_map (
    source_id uuid primary key,
    target_id uuid not null unique
  ) on commit drop;

  create temporary table copy_session_exercise_id_map (
    source_id uuid primary key,
    target_id uuid not null unique
  ) on commit drop;

  delete from public.completed_workouts
  where completed_by = target_user_id;

  delete from public.workout_sessions
  where performed_by = target_user_id
    and status = 'completed';

  insert into pg_temp.copy_session_id_map (source_id, target_id)
  select session.id, gen_random_uuid()
  from public.workout_sessions as session
  where session.performed_by = source_user_id
    and session.status = 'completed';

  insert into public.workout_sessions (
    id,
    workout_id,
    workout_name,
    workout_name,
    performed_by,
    status,
    started_at,
    completed_at
  )
  select
    id_map.target_id,
    session.workout_id,
    session.workout_name,
    session.workout_name,
    target_user_id,
    session.status,
    session.started_at,
    session.completed_at
  from public.workout_sessions as session
  join pg_temp.copy_session_id_map as id_map
    on id_map.source_id = session.id;
  get diagnostics copied_session_count = row_count;

  insert into pg_temp.copy_session_exercise_id_map (source_id, target_id)
  select exercise.id, gen_random_uuid()
  from public.workout_session_exercises as exercise
  join pg_temp.copy_session_id_map as session_map
    on session_map.source_id = exercise.session_id;

  insert into public.workout_session_exercises (
    id,
    session_id,
    source_workout_exercise_id,
    was_routine_exercise,
    exercise_id,
    routine_position,
    prescribed_set_count,
    completed_order,
    completed_at,
    notes
  )
  select
    exercise_map.target_id,
    session_map.target_id,
    exercise.source_workout_exercise_id,
    exercise.was_routine_exercise,
    exercise.exercise_id,
    exercise.routine_position,
    exercise.prescribed_set_count,
    exercise.completed_order,
    exercise.completed_at,
    exercise.notes
  from public.workout_session_exercises as exercise
  join pg_temp.copy_session_exercise_id_map as exercise_map
    on exercise_map.source_id = exercise.id
  join pg_temp.copy_session_id_map as session_map
    on session_map.source_id = exercise.session_id;
  get diagnostics copied_exercise_count = row_count;

  insert into public.workout_session_sets (
    session_exercise_id,
    set_number,
    target_reps,
    actual_reps,
    actual_weight
  )
  select
    exercise_map.target_id,
    workout_set.set_number,
    workout_set.target_reps,
    workout_set.actual_reps,
    workout_set.actual_weight
  from public.workout_session_sets as workout_set
  join pg_temp.copy_session_exercise_id_map as exercise_map
    on exercise_map.source_id = workout_set.session_exercise_id;
  get diagnostics copied_set_count = row_count;

  insert into public.completed_workouts (
    workout_id,
    completed_by,
    completed_at,
    session_id
  )
  select
    completion.workout_id,
    target_user_id,
    completion.completed_at,
    session_map.target_id
  from public.completed_workouts as completion
  left join pg_temp.copy_session_id_map as session_map
    on session_map.source_id = completion.session_id
  where completion.completed_by = source_user_id;
  get diagnostics copied_completion_count = row_count;

  raise notice
    'Copied % completed sessions, % exercise entries, % sets, and % completion records to "%".',
    copied_session_count,
    copied_exercise_count,
    copied_set_count,
    copied_completion_count,
    target_profile_name;
end;
$copy_completed_workout_history$;
