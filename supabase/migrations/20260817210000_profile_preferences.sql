alter table public.profiles
  add column preferences jsonb not null default '{}'::jsonb;

alter table public.profiles
  add constraint profiles_preferences_object
  check (jsonb_typeof(preferences) = 'object');
