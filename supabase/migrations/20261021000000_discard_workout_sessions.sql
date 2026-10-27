grant delete on public.workout_sessions to authenticated;

create policy "Users can discard their own in-progress workout sessions"
  on public.workout_sessions
  for delete
  to authenticated
  using (performed_by = auth.uid() and status = 'in_progress');

create or replace function public.discard_workout_session(target_session_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  discarded_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to discard a workout.';
  end if;

  delete from public.workout_sessions
  where id = target_session_id
    and performed_by = auth.uid()
    and status = 'in_progress'
  returning id into discarded_session_id;

  if discarded_session_id is null then
    raise exception 'Active workout session not found.';
  end if;

  return discarded_session_id;
end;
$function$;

revoke all on function public.discard_workout_session(uuid) from public, anon;
grant execute on function public.discard_workout_session(uuid) to authenticated;
