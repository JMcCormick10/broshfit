-- Data repair: before weight inheritance was implemented in the app, the
-- first set's weight was only shown as a placeholder for later sets, so those
-- sets were saved with NULL weights even though the intent was "same as set 1".
-- Backfill Josh's sessions so any set after the first with no weight inherits
-- set 1's weight.

update public.workout_session_sets as session_set
set actual_weight = first_set.actual_weight
from
  public.workout_session_sets as first_set,
  public.workout_session_exercises as session_exercise,
  public.workout_sessions as session
where first_set.session_exercise_id = session_set.session_exercise_id
  and first_set.set_number = 1
  and first_set.actual_weight is not null
  and session_set.set_number > 1
  and session_set.actual_weight is null
  and session_exercise.id = session_set.session_exercise_id
  and session.id = session_exercise.session_id
  and session.performed_by = '067bb7ef-1adb-4ff2-ba79-eaba722b81bc';
