-- Run after copying Brad's completed history to the Test profile.
-- This only corrects Test's completed session snapshots; it never changes
-- Brad's history or any workout routine.
-- Review the preview notices with apply_corrections set to false, then set it
-- to true and rerun to apply the corrections.
do $correct_test_workout_exercises$
declare
  target_profile_name constant text := 'Test';
  front_squat_name constant text := 'Front Squat';
  back_squat_name constant text := 'Back Squat';
  close_grip_pull_up_name constant text := 'Chin Ups';
  wide_grip_pull_up_name constant text := 'Wide Grip Pull-up';
  apply_corrections constant boolean := false;
  target_profile_id uuid;
  target_user_id uuid;
  front_squat_id uuid;
  back_squat_id uuid;
  close_grip_pull_up_id uuid;
  wide_grip_pull_up_id uuid;
  matching_profile_count integer;
  matching_exercise_count integer;
  front_squat_session_count bigint;
  front_squat_correction_count bigint;
  last_session_id uuid;
  last_session_completed_at timestamptz;
  last_session_routine_name text;
  close_grip_entries_in_last_session integer;
  planned_correction_count bigint;
  applied_correction_count bigint;
  preview record;
begin
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

  select id
  into target_user_id
  from auth.users
  where email = 'profile-' || target_profile_id::text || '@broshfit.invalid';

  if target_user_id is null then
    raise exception 'No Auth user found for target profile "%".',
      target_profile_name;
  end if;

  select count(*)
  into matching_exercise_count
  from public.exercises as exercise
  where lower(trim(exercise.name)) = lower(trim(front_squat_name));

  if matching_exercise_count <> 1 then
    raise exception 'Expected one exercise named "%", found %.',
      front_squat_name, matching_exercise_count;
  end if;

  select id
  into front_squat_id
  from public.exercises
  where lower(trim(name)) = lower(trim(front_squat_name));

  select count(*)
  into matching_exercise_count
  from public.exercises as exercise
  where lower(trim(exercise.name)) = lower(trim(back_squat_name));

  if matching_exercise_count <> 1 then
    raise exception 'Expected one exercise named "%", found %.',
      back_squat_name, matching_exercise_count;
  end if;

  select id
  into back_squat_id
  from public.exercises
  where lower(trim(name)) = lower(trim(back_squat_name));

  select count(*)
  into matching_exercise_count
  from public.exercises as exercise
  where lower(trim(exercise.name)) = lower(trim(close_grip_pull_up_name));

  if matching_exercise_count <> 1 then
    raise exception 'Expected one exercise named "%", found %.',
      close_grip_pull_up_name, matching_exercise_count;
  end if;

  select id
  into close_grip_pull_up_id
  from public.exercises
  where lower(trim(name)) = lower(trim(close_grip_pull_up_name));

  select count(*)
  into matching_exercise_count
  from public.exercises as exercise
  where lower(trim(exercise.name)) = lower(trim(wide_grip_pull_up_name));

  if matching_exercise_count <> 1 then
    raise exception 'Expected one exercise named "%", found %.',
      wide_grip_pull_up_name, matching_exercise_count;
  end if;

  select id
  into wide_grip_pull_up_id
  from public.exercises
  where lower(trim(name)) = lower(trim(wide_grip_pull_up_name));

  create temporary table test_workout_exercise_corrections (
    session_exercise_id uuid primary key,
    old_exercise_id uuid not null,
    new_exercise_id uuid not null,
    correction_reason text not null
  ) on commit drop;

  with front_squat_sessions as (
    select
      session.id,
      session.completed_at,
      row_number() over (
        order by coalesce(session.completed_at, session.started_at), session.id
      ) as session_number
    from public.workout_sessions as session
    where session.performed_by = target_user_id
      and session.status = 'completed'
      and exists (
        select 1
        from public.workout_session_exercises as session_exercise
        where session_exercise.session_id = session.id
          and session_exercise.exercise_id = front_squat_id
      )
  )
  select count(*)
  into front_squat_session_count
  from front_squat_sessions;

  if front_squat_session_count < 3 then
    raise exception
      'Expected at least three completed Test sessions with Front Squat after the copy, found %.',
      front_squat_session_count;
  end if;

  with front_squat_sessions as (
    select
      session.id,
      row_number() over (
        order by coalesce(session.completed_at, session.started_at), session.id
      ) as session_number
    from public.workout_sessions as session
    where session.performed_by = target_user_id
      and session.status = 'completed'
      and exists (
        select 1
        from public.workout_session_exercises as session_exercise
        where session_exercise.session_id = session.id
          and session_exercise.exercise_id = front_squat_id
      )
  )
  insert into pg_temp.test_workout_exercise_corrections (
    session_exercise_id,
    old_exercise_id,
    new_exercise_id,
    correction_reason
  )
  select
    session_exercise.id,
    front_squat_id,
    back_squat_id,
    'Replace Front Squat with Back Squat'
  from front_squat_sessions
  join public.workout_session_exercises as session_exercise
    on session_exercise.session_id = front_squat_sessions.id
  where front_squat_sessions.session_number > 2
    and session_exercise.exercise_id = front_squat_id;

  get diagnostics front_squat_correction_count = row_count;

  select
    session.id,
    session.completed_at,
    workout.name
  into
    last_session_id,
    last_session_completed_at,
    last_session_routine_name
  from public.workout_sessions as session
  join public.workouts as workout
    on workout.id = session.workout_id
  where session.performed_by = target_user_id
    and session.status = 'completed'
  order by coalesce(session.completed_at, session.started_at) desc, session.id desc
  limit 1;

  if last_session_id is null then
    raise exception 'No completed workouts were found for "%".',
      target_profile_name;
  end if;

  select count(*)
  into close_grip_entries_in_last_session
  from public.workout_session_exercises as session_exercise
  where session_exercise.session_id = last_session_id
    and session_exercise.exercise_id = close_grip_pull_up_id;

  if close_grip_entries_in_last_session <> 1 then
    raise exception
      'Expected exactly one "%" entry in the latest completed Test workout, found %.',
      close_grip_pull_up_name, close_grip_entries_in_last_session;
  end if;

  insert into pg_temp.test_workout_exercise_corrections (
    session_exercise_id,
    old_exercise_id,
    new_exercise_id,
    correction_reason
  )
  select
    session_exercise.id,
    close_grip_pull_up_id,
    wide_grip_pull_up_id,
    'Replace Chin Ups with Wide Grip Pull-up in the latest workout'
  from public.workout_session_exercises as session_exercise
  where session_exercise.session_id = last_session_id
    and session_exercise.exercise_id = close_grip_pull_up_id;

  select count(*)
  into planned_correction_count
  from pg_temp.test_workout_exercise_corrections;

  raise notice
    'Found % completed Test sessions with Front Squat. The first two will remain Front Squat; % later entries will change to Back Squat.',
    front_squat_session_count, front_squat_correction_count;
  raise notice
    'Latest completed workout: "%" on %. Its Chin Ups entry will change to Wide Grip Pull-up.',
    last_session_routine_name, last_session_completed_at;

  for preview in
    select
      session.completed_at,
      workout.name as routine_name,
      old_exercise.name as old_exercise_name,
      new_exercise.name as new_exercise_name,
      correction.correction_reason
    from pg_temp.test_workout_exercise_corrections as correction
    join public.workout_session_exercises as session_exercise
      on session_exercise.id = correction.session_exercise_id
    join public.workout_sessions as session
      on session.id = session_exercise.session_id
    join public.workouts as workout
      on workout.id = session.workout_id
    join public.exercises as old_exercise
      on old_exercise.id = correction.old_exercise_id
    join public.exercises as new_exercise
      on new_exercise.id = correction.new_exercise_id
    order by session.completed_at, session.id, session_exercise.routine_position
  loop
    raise notice '% // % // % -> % (%).',
      preview.completed_at,
      preview.routine_name,
      preview.old_exercise_name,
      preview.new_exercise_name,
      preview.correction_reason;
  end loop;

  if not apply_corrections then
    raise notice
      'Dry run only. Set apply_corrections to true and rerun after reviewing the planned changes.';
    return;
  end if;

  update public.workout_session_exercises as session_exercise
  set
    exercise_id = correction.new_exercise_id,
    source_workout_exercise_id = null
  from pg_temp.test_workout_exercise_corrections as correction
  where session_exercise.id = correction.session_exercise_id
    and session_exercise.exercise_id = correction.old_exercise_id
    and session_exercise.was_routine_exercise;
  get diagnostics applied_correction_count = row_count;

  if applied_correction_count <> planned_correction_count then
    raise exception
      'Expected to apply % corrections but applied %; transaction cancelled.',
      planned_correction_count, applied_correction_count;
  end if;

  raise notice
    'Applied % exercise corrections to Test. Brad and workout routines were not changed.',
    applied_correction_count;
end;
$correct_test_workout_exercises$;
