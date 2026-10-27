-- Completed workouts had INSERT and SELECT policies only, so updates to
-- completed_at from the edit RPC were silently filtered out by row-level
-- security. Allow owners to update their own completion records.
create policy "Users can update their own completed workouts"
on public.completed_workouts
for update
to authenticated
using (completed_by = auth.uid())
with check (completed_by = auth.uid());
