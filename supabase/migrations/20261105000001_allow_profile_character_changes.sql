alter table public.profiles
  drop constraint if exists profiles_character_check;

alter table public.profiles
  add constraint profiles_character_check
  check (character in ('goku', 'vegeta', 'ginyu', 'piccolo'));

grant update (character) on public.profiles to authenticated;

create policy "Profiles can update their own character"
  on public.profiles
  for update
  to authenticated
  using (
    (auth.jwt() ->> 'email') = ('profile-' || id::text || '@broshfit.invalid')
  )
  with check (
    (auth.jwt() ->> 'email') = ('profile-' || id::text || '@broshfit.invalid')
  );
