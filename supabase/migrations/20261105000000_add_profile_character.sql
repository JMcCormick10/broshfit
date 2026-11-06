alter table public.profiles
  add column character text not null default 'ginyu'
  check (character in ('goku', 'vegeta', 'ginyu'));

update public.profiles
set character = case lower(name)
  when 'josh' then 'goku'
  when 'brad' then 'vegeta'
  else 'ginyu'
end;

update public.profiles
set avatar_url = '/profile-avatars/' || character || '.svg';
