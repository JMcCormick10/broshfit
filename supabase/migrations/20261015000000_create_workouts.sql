create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create unique index workouts_normalized_name_key
  on public.workouts (
    (lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')))
  );

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null check (position > 0),
  unique (workout_id, position)
);

create table public.workout_sets (
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  target_reps text,
  primary key (workout_exercise_id, set_number)
);

create index workout_exercises_workout_position_idx
  on public.workout_exercises (workout_id, position);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;

grant select on public.workouts to anon, authenticated;
grant insert on public.workouts to authenticated;
grant select on public.workout_exercises to anon, authenticated;
grant insert on public.workout_exercises to authenticated;
grant select on public.workout_sets to anon, authenticated;
grant insert on public.workout_sets to authenticated;

create policy "Workouts are readable by app visitors"
  on public.workouts
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can create shared workouts"
  on public.workouts
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Workout exercises are readable by app visitors"
  on public.workout_exercises
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can add workout exercises"
  on public.workout_exercises
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.workouts
      where workouts.id = workout_exercises.workout_id
    )
  );

create policy "Workout sets are readable by app visitors"
  on public.workout_sets
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can add workout sets"
  on public.workout_sets
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      where workout_exercises.id = workout_sets.workout_exercise_id
    )
  );

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

    if coalesce(jsonb_typeof(exercise_entry.value -> 'targetReps'), '') <> 'array' then
      raise exception 'Each exercise needs at least one set.';
    end if;

    if jsonb_array_length(exercise_entry.value -> 'targetReps') not between 1 and 30 then
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
      from jsonb_array_elements(exercise_entry.value -> 'targetReps') with ordinality
    loop
      if set_entry.value = 'null'::jsonb then
        target_reps := null;
      else
        if jsonb_typeof(set_entry.value) <> 'string' then
          raise exception 'Set rep targets must be strings or null.';
        end if;

        target_reps := set_entry.value #>> '{}';
      end if;

      insert into public.workout_sets (
        workout_exercise_id, set_number, target_reps
      )
      values (
        new_workout_exercise_id, set_entry.ordinality, target_reps
      );
    end loop;
  end loop;

  return new_workout_id;
end;
$function$;

revoke all on function public.create_workout(text, jsonb) from public, anon;
grant execute on function public.create_workout(text, jsonb) to authenticated;