-- Allow owners to permanently delete a completed workout from history.
-- The completion row references its session with ON DELETE RESTRICT, so it is
-- removed first; session exercises and sets cascade from the session delete.

create policy "Users can delete their own completed workouts"
on public.completed_workouts
for delete
to authenticated
using (completed_by = auth.uid());

create policy "Users can delete their own completed workout sessions"
on public.workout_sessions
for delete
to authenticated
using (performed_by = auth.uid() and status = 'completed');

create or replace function public.delete_completed_workout(target_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to delete a completed workout.';
  end if;

  if not exists (
    select 1
    from public.workout_sessions
    where id = target_session_id
      and performed_by = auth.uid()
      and status = 'completed'
  ) then
    raise exception 'Completed workout session not found.';
  end if;

  delete from public.completed_workouts
  where session_id = target_session_id
    and completed_by = auth.uid();

  delete from public.workout_sessions
  where id = target_session_id
    and performed_by = auth.uid()
    and status = 'completed';
end;
$$;
