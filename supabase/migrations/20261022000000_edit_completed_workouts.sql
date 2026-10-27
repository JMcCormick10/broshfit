alter table public.completed_workouts
  add column session_id uuid;

update public.completed_workouts as completed
set session_id = session.id
from public.workout_sessions as session
where completed.workout_id = session.workout_id
  and completed.completed_by = session.performed_by
  and completed.completed_at = session.completed_at;

create unique index completed_workouts_session_key
  on public.completed_workouts (session_id)
  where session_id is not null;

alter table public.completed_workouts
  add constraint completed_workouts_session_id_fkey
  foreign key (session_id)
  references public.workout_sessions(id)
  on delete restrict;

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
  set_update record;
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
        as set_update(set_number integer, actual_reps integer)
      where set_update.set_number is null
        or set_update.set_number < 1
        or set_update.set_number > 30
        or (set_update.actual_reps is not null
          and set_update.actual_reps not between 0 and 1000)
    ) then
      raise exception 'Set values must use valid set numbers and rep counts.';
    end if;

    if exists (
      select 1
      from jsonb_to_recordset(updated_exercise.sets)
        as set_update(set_number integer, actual_reps integer)
      where not exists (
        select 1
        from public.workout_session_sets
        where session_exercise_id = updated_exercise.session_exercise_id
          and set_number = set_update.set_number
      )
    ) then
      raise exception 'Only existing set rows can be edited.';
    end if;

    update public.workout_session_sets as session_set
    set actual_reps = set_update.actual_reps
    from jsonb_to_recordset(updated_exercise.sets)
      as set_update(set_number integer, actual_reps integer)
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

revoke all on function public.update_completed_workout_session(uuid, timestamptz, jsonb)
  from public, anon;
grant execute on function public.update_completed_workout_session(uuid, timestamptz, jsonb)
  to authenticated;
