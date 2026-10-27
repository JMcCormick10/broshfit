alter table public.profiles
  add column avatar_url text;

update public.profiles
set avatar_url = case lower(name)
  when 'josh' then '/profile-avatars/josh.svg'
  when 'brad' then '/profile-avatars/brad.svg'
  when 'test' then '/profile-avatars/test.svg'
  else null
end;
