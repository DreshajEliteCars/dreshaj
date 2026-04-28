-- Adds the `options` column for the standard-equipment codes that Encar
-- returns on the per-vehicle detail endpoint (`detail.options.standard`).
-- Codes are stable Encar identifiers (e.g. "001", "014", "035"); the
-- frontend resolves them to localised labels via src/lib/carOptions.ts.
--
-- Run via Supabase SQL editor or `supabase db push`.

alter table public.cars
    add column if not exists options text[] not null default '{}';

-- GIN index lets us filter "cars that have option X" later (e.g. "show me
-- only listings with sunroof") without scanning every row.
create index if not exists cars_options_gin_idx on public.cars using gin (options);
