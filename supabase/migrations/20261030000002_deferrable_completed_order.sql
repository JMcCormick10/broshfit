-- Reordering completed exercises shuffles existing completed_order values.
-- A non-deferrable unique constraint is checked per row mid-statement, which
-- makes any reorder collide with rows that have not been updated yet.
-- Deferring the constraint to the end of the statement allows atomic reorders.
alter table public.workout_session_exercises
  drop constraint workout_session_exercises_session_id_completed_order_key,
  add constraint workout_session_exercises_session_id_completed_order_key
    unique (session_id, completed_order) deferrable initially immediate;
