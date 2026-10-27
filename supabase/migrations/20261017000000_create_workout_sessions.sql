create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete restrict,
  performed_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index workout_sessions_performer_status_idx
  on public.workout_sessions (performed_by, status, started_at desc);

create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  source_workout_exercise_id uuid references public.workout_exercises(id) on delete set null,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  routine_position integer not null check (routine_position > 0),
  prescribed_set_count integer not null default 0 check (prescribed_set_count >= 0),
  completed_order integer,
  completed_at timestamptz,
  notes text not null default '',
  unique (session_id, routine_position),
  unique (session_id, completed_order)
);

create table public.workout_session_sets (
  session_exercise_id uuid not null references public.workout_session_exercises(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  target_reps text,
  actual_reps integer check (actual_reps between 0 and 1000),
  primary key (session_exercise_id, set_number)
);

create index workout_session_exercises_session_idx
  on public.workout_session_exercises (session_id, routine_position);

alter table public.workout_sessions enable row level security;
alter table public.workout_session_exercises enable row level security;
alter table public.workout_session_sets enable row level security;

grant select, insert, update on public.workout_sessions to authenticated;
grant select, insert, update on public.workout_session_exercises to authenticated;
grant select, insert, update on public.workout_session_sets to authenticated;

create policy "Users can read their own workout sessions"
  on public.workout_sessions
  for select
  to authenticated
  using (performed_by = auth.uid());

create policy "Users can create their own workout sessions"
  on public.workout_sessions
  for insert
  to authenticated
  with check (performed_by = auth.uid());

create policy "Users can update their own workout sessions"
  on public.workout_sessions
  for update
  to authenticated
  using (performed_by = auth.uid())
  with check (performed_by = auth.uid());

create policy "Users can read exercises in their own workout sessions"
  on public.workout_session_exercises
  for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions
      where workout_sessions.id = workout_session_exercises.session_id
        and workout_sessions.performed_by = auth.uid()
    )
  );

create policy "Users can create exercises in their own workout sessions"
  on public.workout_session_exercises
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workout_sessions
      where workout_sessions.id = workout_session_exercises.session_id
        and workout_sessions.performed_by = auth.uid()
    )
  );

create policy "Users can update exercises in their own workout sessions"
  on public.workout_session_exercises
  for update
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions
      where workout_sessions.id = workout_session_exercises.session_id
        and workout_sessions.performed_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions
      where workout_sessions.id = workout_session_exercises.session_id
        and workout_sessions.performed_by = auth.uid()
    )
  );

create policy "Users can read sets in their own workout sessions"
  on public.workout_session_sets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_session_exercises
      join public.workout_sessions
        on workout_sessions.id = workout_session_exercises.session_id
      where workout_session_exercises.id = workout_session_sets.session_exercise_id
        and workout_sessions.performed_by = auth.uid()
    )
  );

create policy "Users can create sets in their own workout sessions"
  on public.workout_session_sets
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workout_session_exercises
      join public.workout_sessions
        on workout_sessions.id = workout_session_exercises.session_id
      where workout_session_exercises.id = workout_session_sets.session_exercise_id
        and workout_sessions.performed_by = auth.uid()
    )
  );

create policy "Users can update sets in their own workout sessions"
  on public.workout_session_sets
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workout_session_exercises
      join public.workout_sessions
        on workout_sessions.id = workout_session_exercises.session_id
      where workout_session_exercises.id = workout_session_sets.session_exercise_id
        and workout_sessions.performed_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_session_exercises
      join public.workout_sessions
        on workout_sessions.id = workout_session_exercises.session_id
      where workout_session_exercises.id = workout_session_sets.session_exercise_id
        and workout_sessions.performed_by = auth.uid()
    )
  );

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
$function$;

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
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to update workout progress.';
  end if;

  perform 1
  from public.workout_session_exercises
  join public.workout_sessions
    on workout_sessions.id = workout_session_exercises.session_id
  where workout_session_exercises.id = target_session_exercise_id
    and workout_sessions.performed_by = auth.uid()
    and workout_sessions.status = 'in_progress'
    and workout_session_exercises.completed_at is null;

  if not found then
    raise exception 'Active workout exercise not found.';
  end if;

  select count(*) into expected_set_count
  from public.workout_session_sets
  where session_exercise_id = target_session_exercise_id;

  if coalesce(cardinality(actual_reps), 0) <> expected_set_count then
    raise exception 'A rep value is required for each displayed set field.';
  end if;

  if length(coalesce(exercise_notes, '')) > 2000 then
    raise exception 'Exercise notes cannot exceed 2000 characters.';
  end if;

  update public.workout_session_sets
  set actual_reps = actual_reps[set_number]
  where session_exercise_id = target_session_exercise_id;

  update public.workout_session_exercises
  set notes = coalesce(exercise_notes, '')
  where id = target_session_exercise_id;
end;
$function$;

create or replace function public.add_workout_session_set(
  target_session_exercise_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  next_set_number integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to add a set.';
  end if;

  perform 1
  from public.workout_session_exercises
  join public.workout_sessions
    on workout_sessions.id = workout_session_exercises.session_id
  where workout_session_exercises.id = target_session_exercise_id
    and workout_sessions.performed_by = auth.uid()
    and workout_sessions.status = 'in_progress'
    and workout_session_exercises.completed_at is null;

  if not found then
    raise exception 'Active workout exercise not found.';
  end if;

  select coalesce(max(set_number), 0) + 1 into next_set_number
  from public.workout_session_sets
  where session_exercise_id = target_session_exercise_id;

  insert into public.workout_session_sets (
    session_exercise_id, set_number, target_reps
  )
  values (target_session_exercise_id, next_set_number, null);

  return next_set_number;
end;
$function$;

create or replace function public.complete_workout_session_exercise(
  target_session_exercise_id uuid,
  actual_reps integer[],
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

  select workout_session_exercises.session_id
  into target_session_id
  from public.workout_session_exercises
  join public.workout_sessions
    on workout_sessions.id = workout_session_exercises.session_id
  where workout_session_exercises.id = target_session_exercise_id
    and workout_sessions.performed_by = auth.uid()
    and workout_sessions.status = 'in_progress'
    and workout_session_exercises.completed_at is null
  for update of workout_sessions;

  if not found then
    raise exception 'Active workout exercise not found.';
  end if;

  perform public.save_workout_session_exercise(
    target_session_exercise_id,
    actual_reps,
    exercise_notes
  );

  select count(*) into incomplete_set_count
  from public.workout_session_sets
  where session_exercise_id = target_session_exercise_id
    and actual_reps is null;

  if incomplete_set_count > 0 and not allow_incomplete then
    raise exception 'Some sets have no recorded reps. Confirm to complete anyway.';
  end if;

  select coalesce(max(completed_order), 0) + 1
  into next_completion_order
  from public.workout_session_exercises
  where session_id = target_session_id;

  update public.workout_session_exercises
  set
    completed_order = next_completion_order,
    completed_at = now()
  where id = target_session_exercise_id;

  return next_completion_order;
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
    workout_id, completed_by, completed_at
  )
  values (target_workout_id, auth.uid(), finished_at);

  return target_session_id;
end;
$function$;

revoke all on function public.start_workout_session(uuid) from public, anon;
revoke all on function public.save_workout_session_exercise(uuid, integer[], text) from public, anon;
revoke all on function public.add_workout_session_set(uuid) from public, anon;
revoke all on function public.complete_workout_session_exercise(uuid, integer[], text, boolean) from public, anon;
revoke all on function public.finish_workout_session(uuid, boolean) from public, anon;
grant execute on function public.start_workout_session(uuid) to authenticated;
grant execute on function public.save_workout_session_exercise(uuid, integer[], text) to authenticated;
grant execute on function public.add_workout_session_set(uuid) to authenticated;
grant execute on function public.complete_workout_session_exercise(uuid, integer[], text, boolean) to authenticated;
grant execute on function public.finish_workout_session(uuid, boolean) to authenticated;