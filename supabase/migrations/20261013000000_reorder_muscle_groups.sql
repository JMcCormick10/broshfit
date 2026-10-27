update public.muscle_groups
set sort_order = -sort_order
where name in (
  'Chest',
  'Shoulders',
  'Triceps',
  'Traps',
  'Back',
  'Biceps',
  'Glutes',
  'Quads',
  'Hamstrings',
  'Calves',
  'Abs'
);

update public.muscle_groups
set sort_order = case name
  when 'Chest' then 1
  when 'Shoulders' then 2
  when 'Triceps' then 3
  when 'Traps' then 4
  when 'Back' then 5
  when 'Biceps' then 6
  when 'Glutes' then 7
  when 'Quads' then 8
  when 'Hamstrings' then 9
  when 'Calves' then 10
  when 'Abs' then 11
end
where name in (
  'Chest',
  'Shoulders',
  'Triceps',
  'Traps',
  'Back',
  'Biceps',
  'Glutes',
  'Quads',
  'Hamstrings',
  'Calves',
  'Abs'
);