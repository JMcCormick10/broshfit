-- Routine renames previously deleted and recreated every routine exercise.
-- Reconnect history rows only when the saved session snapshot exactly matches
-- the current routine entry; ad-hoc or changed exercises remain unlinked.
with matching_source_exercises as (
  select
    session_exercise.id as session_exercise_id,
    routine_exercise.id as source_workout_exercise_id
  from public.workout_session_exercises as session_exercise
  join public.workout_sessions as session
    on session.id = session_exercise.session_id
  join public.workout_exercises as routine_exercise
    on routine_exercise.workout_id = session.workout_id
    and routine_exercise.position = session_exercise.routine_position
    and routine_exercise.exercise_id = session_exercise.exercise_id
  cross join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_array(logged_set.set_number, logged_set.target_reps)
        order by logged_set.set_number
      ),
      '[]'::jsonb
    ) as set_targets
    from public.workout_session_sets as logged_set
    where logged_set.session_exercise_id = session_exercise.id
      and logged_set.set_number <= session_exercise.prescribed_set_count
  ) as logged_sets
  cross join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_array(routine_set.set_number, routine_set.target_reps)
        order by routine_set.set_number
      ),
      '[]'::jsonb
    ) as set_targets
    from public.workout_sets as routine_set
    where routine_set.workout_exercise_id = routine_exercise.id
  ) as routine_sets
  where session_exercise.source_workout_exercise_id is null
    and session_exercise.prescribed_set_count =
      jsonb_array_length(logged_sets.set_targets)
    and session_exercise.prescribed_set_count =
      jsonb_array_length(routine_sets.set_targets)
    and logged_sets.set_targets = routine_sets.set_targets
)
update public.workout_session_exercises as session_exercise
set source_workout_exercise_id =
  matching_source_exercises.source_workout_exercise_id
from matching_source_exercises
where session_exercise.id = matching_source_exercises.session_exercise_id;

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
  current_workout_items jsonb;
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'exerciseId', routine_exercise.exercise_id,
        'targetSets', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object('reps', routine_set.target_reps)
              order by routine_set.set_number
            ),
            '[]'::jsonb
          )
          from public.workout_sets as routine_set
          where routine_set.workout_exercise_id = routine_exercise.id
        )
      )
      order by routine_exercise.position
    ),
    '[]'::jsonb
  )
  into current_workout_items
  from public.workout_exercises as routine_exercise
  where routine_exercise.workout_id = target_workout_id;

  if current_workout_items = workout_items then
    update public.workouts
    set name = regexp_replace(trim(workout_name), '[[:space:]]+', ' ', 'g')
    where id = target_workout_id;

    if not found then
      raise exception 'Workout routine not found.';
    end if;

    return target_workout_id;
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
$function$;
