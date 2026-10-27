alter table public.workout_sets
  add column target_weight text;

alter table public.workout_session_sets
  add column actual_weight text;

alter table public.workout_sets
  add constraint workout_sets_target_weight_length_check
  check (target_weight is null or length(trim(target_weight)) <= 40);

alter table public.workout_session_sets
  add constraint workout_session_sets_actual_weight_length_check
  check (actual_weight is null or length(trim(actual_weight)) <= 40);

create or replace function public.create_workout(
  workout_name text,
  workout_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  new_workout_id uuid;
  new_workout_exercise_id uuid;
  exercise_entry record;
  set_entry record;
  target_reps text;
  target_weight text;
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

      if (set_entry.value ? 'weight') and set_entry.value -> 'weight' <> 'null'::jsonb then
        if jsonb_typeof(set_entry.value -> 'weight') <> 'string' then
          raise exception 'Weight targets must be strings or null.';
        end if;
        target_weight := set_entry.value ->> 'weight';
      else
        target_weight := null;
      end if;

      if length(coalesce(target_reps, '')) > 40 or length(coalesce(target_weight, '')) > 40 then
        raise exception 'Set targets cannot exceed 40 characters.';
      end if;

      insert into public.workout_sets (
        workout_exercise_id, set_number, target_reps, target_weight
      )
      values (
        new_workout_exercise_id,
        set_entry.ordinality,
        target_reps,
        target_weight
      );
    end loop;
  end loop;

  return new_workout_id;
end;
$function$;

create or replace function public.update_workout(
  target_workout_id uuid,
  workout_name text,
  workout_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  workout_exercise_id uuid;
  exercise_entry record;
  set_entry record;
  target_reps text;
  target_weight text;
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

      if (set_entry.value ? 'weight') and set_entry.value -> 'weight' <> 'null'::jsonb then
        if jsonb_typeof(set_entry.value -> 'weight') <> 'string' then
          raise exception 'Weight targets must be strings or null.';
        end if;
        target_weight := set_entry.value ->> 'weight';
      else
        target_weight := null;
      end if;

      if length(coalesce(target_reps, '')) > 40 or length(coalesce(target_weight, '')) > 40 then
        raise exception 'Set targets cannot exceed 40 characters.';
      end if;

      insert into public.workout_sets (
        workout_exercise_id, set_number, target_reps, target_weight
      )
      values (workout_exercise_id, set_entry.ordinality, target_reps, target_weight);
    end loop;
  end loop;

  return target_workout_id;
end;
$function$;

create or replace function public.start_workout_session(target_workout_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
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
      target_reps,
      target_weight
    )
    select
      new_session_exercise_id,
      workout_sets.set_number,
      workout_sets.target_reps,
      workout_sets.target_weight
    from public.workout_sets
    where workout_sets.workout_exercise_id = routine_entry.source_id
    order by workout_sets.set_number;
  end loop;

  return new_session_id;
end;
$function$;

create or replace function public.save_workout_session_exercise(
  target_session_exercise_id uuid,
  set_updates jsonb,
  exercise_notes text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
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
    from jsonb_to_recordset(set_updates)
      as set_update(set_number integer, actual_reps integer, actual_weight text)
    where set_update.set_number is null
      or set_update.set_number < 1
      or set_update.set_number > expected_set_count
      or (set_update.actual_reps is not null
        and set_update.actual_reps not between 0 and 1000)
      or length(coalesce(set_update.actual_weight, '')) > 40
      or not exists (
        select 1
        from public.workout_session_sets
        where session_exercise_id = target_session_exercise_id
          and set_number = set_update.set_number
      )
  ) then
    raise exception 'Each existing set must receive a valid rep count and weight.';
  end if;

  update public.workout_session_sets as session_set
  set
    actual_reps = set_update.actual_reps,
    actual_weight = nullif(trim(set_update.actual_weight), '')
  from jsonb_to_recordset(set_updates)
    as set_update(set_number integer, actual_reps integer, actual_weight text)
  where session_set.session_exercise_id = target_session_exercise_id
    and session_set.set_number = set_update.set_number;

  update public.workout_session_exercises as session_exercise
  set notes = coalesce(exercise_notes, '')
  where session_exercise.id = target_session_exercise_id;
end;
$function$;

create or replace function public.complete_workout_session_exercise(
  target_session_exercise_id uuid,
  set_updates jsonb,
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
  join public.workout_sessions as workout_session
    on workout_session.id = session_exercise.session_id
  where session_exercise.id = target_session_exercise_id
    and workout_session.performed_by = auth.uid()
    and workout_session.status = 'in_progress'
    and session_exercise.completed_at is null
  for update of workout_session;

  if not found then
    raise exception 'Active workout exercise not found.';
  end if;

  perform public.save_workout_session_exercise(
    target_session_exercise_id,
    set_updates,
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
  expected_exercise_count integer;
  distinct_exercise_count integer;
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

  select count(*) into expected_exercise_count
  from public.workout_session_exercises
  where session_id = target_session_id
    and completed_at is not null;

  if expected_exercise_count = 0 then
    raise exception 'This workout has no completed exercises to edit.';
  end if;

  if coalesce(jsonb_typeof(exercise_updates), '') <> 'array' then
    raise exception 'Exercise updates must be provided as a list.';
  end if;

  if jsonb_array_length(exercise_updates) <> expected_exercise_count then
    raise exception 'Every completed exercise must be included exactly once.';
  end if;

  select count(*) into distinct_exercise_count
  from (
    select distinct exercise_update.session_exercise_id
    from jsonb_to_recordset(exercise_updates)
      as exercise_update(session_exercise_id uuid, sets jsonb, notes text, completed_order integer)
  ) as unique_updates;

  if distinct_exercise_count <> expected_exercise_count then
    raise exception 'Every completed exercise must be included exactly once.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(exercise_updates)
      as exercise_update(session_exercise_id uuid, sets jsonb, notes text, completed_order integer)
    where exercise_update.session_exercise_id is null
      or exercise_update.completed_order is null
      or exercise_update.completed_order < 1
      or length(coalesce(exercise_update.notes, '')) > 2000
      or coalesce(jsonb_typeof(exercise_update.sets), '') <> 'array'
      or jsonb_array_length(exercise_update.sets) = 0
  ) then
    raise exception 'Each completed exercise needs a valid set list, notes, and completion order.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(exercise_updates)
      as exercise_update(session_exercise_id uuid, sets jsonb, notes text, completed_order integer)
    where not exists (
      select 1
      from public.workout_session_exercises
      where id = exercise_update.session_exercise_id
        and session_id = target_session_id
        and completed_at is not null
    )
  ) then
    raise exception 'Only completed exercises from this workout can be edited.';
  end if;

  for updated_exercise in
    select
      exercise_update.session_exercise_id,
      exercise_update.sets,
      exercise_update.notes,
      exercise_update.completed_order
    from jsonb_to_recordset(exercise_updates)
      as exercise_update(session_exercise_id uuid, sets jsonb, notes text, completed_order integer)
  loop
    if exists (
      select 1
      from jsonb_to_recordset(updated_exercise.sets)
        as set_update(set_number integer, actual_reps integer, actual_weight text)
      where set_update.set_number is null
        or set_update.set_number < 1
        or set_update.set_number > 30
        or (set_update.actual_reps is not null
          and set_update.actual_reps not between 0 and 1000)
        or length(coalesce(set_update.actual_weight, '')) > 40
        or not exists (
          select 1
          from public.workout_session_sets
          where session_exercise_id = updated_exercise.session_exercise_id
            and set_number = set_update.set_number
        )
    ) then
      raise exception 'Set values must use valid set numbers, rep counts, and weights.';
    end if;

    update public.workout_session_sets as session_set
    set
      actual_reps = set_update.actual_reps,
      actual_weight = nullif(trim(set_update.actual_weight), '')
    from jsonb_to_recordset(updated_exercise.sets)
      as set_update(set_number integer, actual_reps integer, actual_weight text)
    where session_set.session_exercise_id = updated_exercise.session_exercise_id
      and session_set.set_number = set_update.set_number;

    update public.workout_session_exercises as session_exercise
    set
      notes = coalesce(updated_exercise.notes, ''),
      completed_order = updated_exercise.completed_order
    where session_exercise.id = updated_exercise.session_exercise_id;
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

revoke all on function public.create_workout(text, jsonb) from public, anon;
revoke all on function public.update_workout(uuid, text, jsonb) from public, anon;
revoke all on function public.start_workout_session(uuid) from public, anon;
revoke all on function public.save_workout_session_exercise(uuid, jsonb, text) from public, anon;
revoke all on function public.complete_workout_session_exercise(uuid, jsonb, text, boolean) from public, anon;
revoke all on function public.update_completed_workout_session(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.create_workout(text, jsonb) to authenticated;
grant execute on function public.update_workout(uuid, text, jsonb) to authenticated;
grant execute on function public.start_workout_session(uuid) to authenticated;
grant execute on function public.save_workout_session_exercise(uuid, jsonb, text) to authenticated;
grant execute on function public.complete_workout_session_exercise(uuid, jsonb, text, boolean) to authenticated;
grant execute on function public.update_completed_workout_session(uuid, timestamptz, jsonb) to authenticated;
