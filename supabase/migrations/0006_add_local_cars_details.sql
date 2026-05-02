-- Add details fields to local_cars for displaying on the home page cards

alter table public.local_cars
  add column if not exists registration_year integer,
  add column if not exists mileage_km integer,
  add column if not exists fuel_type text;
