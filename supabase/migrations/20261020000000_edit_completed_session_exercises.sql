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

  update public.workout_session_exercises as session_exercise
  set notes = coalesce(exercise_notes, '')
  where session_exercise.id = target_session_exercise_id;
end;
$function$;

create or replace function public.reorder_completed_workout_exercises(
  target_session_id uuid,
  ordered_completed_exercise_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  completed_count integer;
  ordered_count integer;
  distinct_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to reorder exercises.';
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

  select count(*) into completed_count
  from public.workout_session_exercises
  where session_id = target_session_id
    and completed_at is not null;

  ordered_count := coalesce(cardinality(ordered_completed_exercise_ids), 0);
  select count(distinct exercise_id) into distinct_count
  from unnest(coalesce(ordered_completed_exercise_ids, '{}'::uuid[]))
    as requested(exercise_id);

  if ordered_count <> completed_count or distinct_count <> completed_count then
    raise exception 'The order must include every completed exercise exactly once.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(ordered_completed_exercise_ids, '{}'::uuid[]))
      as requested(exercise_id)
    where not exists (
      select 1
      from public.workout_session_exercises as session_exercise
      where session_exercise.id = requested.exercise_id
        and session_exercise.session_id = target_session_id
        and session_exercise.completed_at is not null
    )
  ) then
    raise exception 'Only completed exercises from this workout can be reordered.';
  end if;

  update public.workout_session_exercises
  set completed_order = -completed_order
  where session_id = target_session_id
    and completed_at is not null;

  update public.workout_session_exercises as session_exercise
  set completed_order = requested.ordinality::integer
  from unnest(ordered_completed_exercise_ids) with ordinality
    as requested(exercise_id, ordinality)
  where session_exercise.id = requested.exercise_id
    and session_exercise.session_id = target_session_id;
end;
$function$;

revoke all on function public.save_workout_session_exercise(uuid, integer[], text)
  from public, anon;
revoke all on function public.reorder_completed_workout_exercises(uuid, uuid[])
  from public, anon;
grant execute on function public.save_workout_session_exercise(uuid, integer[], text)
  to authenticated;
grant execute on function public.reorder_completed_workout_exercises(uuid, uuid[])
  to authenticated;