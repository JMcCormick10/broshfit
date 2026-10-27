-- Target weights were retired from routines, but create_workout,
-- update_workout, and start_workout_session still referenced them, and
-- start_workout_session copied target_weight into workout_session_sets, a
-- column that does not exist (42703 when starting a workout).
-- Recreate the three functions without target weight handling and drop the
-- vestigial workout_sets.target_weight column.

create or replace function public.create_workout(
  workout_name text,
  workout_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_workout_id uuid;
  new_workout_exercise_id uuid;
  exercise_entry record;
  set_entry record;
  target_reps text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to create a workout.';
  end if;

  if workout_name is null or length(trim(workout_name)) not between 1 and 80 then
    raise exception 'Workout name must be between 1 and 80 characters.';
  end if;

  if coalesce(jsonb_typeof(workout_items), '') <> 'array' then
    raise exception 'Workout exercises must be provided as a list.';
  end if;

  if jsonb_array_length(workout_items) = 0 then
    raise exception 'Add at least one exercise to the workout.';
  end if;

  insert into public.workouts (name)
  values (regexp_replace(trim(workout_name), '[[:space:]]+', ' ', 'g'))
  returning id into new_workout_id;

  for exercise_entry in
    select value, ordinality
    from jsonb_array_elements(workout_items) with ordinality
  loop
    if coalesce(jsonb_typeof(exercise_entry.value), '') <> 'object' then
      raise exception 'Each workout entry must contain an exercise and set list.';
    end if;

    if coalesce(jsonb_typeof(exercise_entry.value -> 'targetSets'), '') <> 'array' then
      raise exception 'Each exercise needs at least one set.';
    end if;

    if jsonb_array_length(exercise_entry.value -> 'targetSets') not between 1 and 30 then
      raise exception 'Each exercise must have between 1 and 30 sets.';
    end if;

    insert into public.workout_exercises (workout_id, exercise_id, position)
    values (
      new_workout_id,
      (exercise_entry.value ->> 'exerciseId')::uuid,
      exercise_entry.ordinality
    )
    returning id into new_workout_exercise_id;

    for set_entry in
      select value, ordinality
      from jsonb_array_elements(exercise_entry.value -> 'targetSets') with ordinality
    loop
      if jsonb_typeof(set_entry.value) <> 'object' then
        raise exception 'Set targets must be objects.';
      end if;

      if (set_entry.value ? 'reps') and set_entry.value -> 'reps' <> 'null'::jsonb then
        if jsonb_typeof(set_entry.value -> 'reps') <> 'string' then
          raise exception 'Rep targets must be strings or null.';
        end if;
        target_reps := set_entry.value ->> 'reps';
      else
        target_reps := null;
      end if;

      if length(coalesce(target_reps, '')) > 40 then
        raise exception 'Set targets cannot exceed 40 characters.';
      end if;

      insert into public.workout_sets (
        workout_exercise_id, set_number, target_reps
      )
      values (
        new_workout_exercise_id,
        set_entry.ordinality,
        target_reps
      );
    end loop;
  end loop;

  return new_workout_id;
end;
$$;

create or replace function public.update_workout(
  target_workout_id uuid,
  workout_name text,
  workout_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  workout_exercise_id uuid;
  exercise_entry record;
  set_entry record;
  target_reps text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to update a workout.';
  end if;

  if workout_name is null or length(trim(workout_name)) not between 1 and 80 then
    raise exception 'Workout name must be between 1 and 80 characters.';
  end if;

  if coalesce(jsonb_typeof(workout_items), '') <> 'array' then
    raise exception 'Workout exercises must be provided as a list.';
  end if;

  if jsonb_array_length(workout_items) = 0 then
    raise exception 'Add at least one exercise to the workout.';
  end if;

  update public.workouts
  set name = regexp_replace(trim(workout_name), '[[:space:]]+', ' ', 'g')
  where id = target_workout_id;

  if not found then
    raise exception 'Workout routine not found.';
  end if;

  delete from public.workout_exercises
  where workout_id = target_workout_id;

  for exercise_entry in
    select value, ordinality
    from jsonb_array_elements(workout_items) with ordinality
  loop
    if coalesce(jsonb_typeof(exercise_entry.value -> 'targetSets'), '') <> 'array'
       or jsonb_array_length(exercise_entry.value -> 'targetSets') not between 1 and 30 then
      raise exception 'Each exercise must have between 1 and 30 sets.';
    end if;

    insert into public.workout_exercises (workout_id, exercise_id, position)
    values (
      target_workout_id,
      (exercise_entry.value ->> 'exerciseId')::uuid,
      exercise_entry.ordinality
    )
    returning id into workout_exercise_id;

    for set_entry in
      select value, ordinality
      from jsonb_array_elements(exercise_entry.value -> 'targetSets') with ordinality
    loop
      if jsonb_typeof(set_entry.value) <> 'object' then
        raise exception 'Set targets must be objects.';
      end if;

      if (set_entry.value ? 'reps') and set_entry.value -> 'reps' <> 'null'::jsonb then
        if jsonb_typeof(set_entry.value -> 'reps') <> 'string' then
          raise exception 'Rep targets must be strings or null.';
        end if;
        target_reps := set_entry.value ->> 'reps';
      else
        target_reps := null;
      end if;

      if length(coalesce(target_reps, '')) > 40 then
        raise exception 'Set targets cannot exceed 40 characters.';
      end if;

      insert into public.workout_sets (
        workout_exercise_id, set_number, target_reps
      )
      values (workout_exercise_id, set_entry.ordinality, target_reps);
    end loop;
  end loop;

  return target_workout_id;
end;
$$;

create or replace function public.start_workout_session(target_workout_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_session_id uuid;
  new_session_exercise_id uuid;
  routine_entry record;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to start a workout.';
  end if;

  if not exists (
    select 1 from public.workouts
    where id = target_workout_id and archived_at is null
  ) then
    raise exception 'Active workout routine not found.';
  end if;

  insert into public.workout_sessions (workout_id, performed_by)
  values (target_workout_id, auth.uid())
  returning id into new_session_id;

  for routine_entry in
    select
      workout_exercises.id as source_id,
      workout_exercises.exercise_id,
      workout_exercises.position
    from public.workout_exercises
    where workout_exercises.workout_id = target_workout_id
    order by workout_exercises.position
  loop
    insert into public.workout_session_exercises (
      session_id,
      source_workout_exercise_id,
      exercise_id,
      routine_position,
      prescribed_set_count
    )
    values (
      new_session_id,
      routine_entry.source_id,
      routine_entry.exercise_id,
      routine_entry.position,
      (
        select count(*)::integer
        from public.workout_sets
        where workout_sets.workout_exercise_id = routine_entry.source_id
      )
    )
    returning id into new_session_exercise_id;

    insert into public.workout_session_sets (
      session_exercise_id,
      set_number,
      target_reps
    )
    select
      new_session_exercise_id,
      workout_sets.set_number,
      workout_sets.target_reps
    from public.workout_sets
    where workout_sets.workout_exercise_id = routine_entry.source_id
    order by workout_sets.set_number;
  end loop;

  return new_session_id;
end;
$$;

alter table public.workout_sets
  drop column target_weight;
