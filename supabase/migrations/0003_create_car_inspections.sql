-- Per-car inspection report cache. Populated lazily by the
-- /api/cars/[id]/inspection Next.js route the first time a user opens
-- a detail page; subsequent views are served from this table.
--
-- The full normalized inspection lives in `data` (jsonb). Only
-- top-level signals are promoted to columns so the listing page or an
-- admin dashboard can filter on them without unpacking jsonb.

create table if not exists public.car_inspections (
    car_id        text primary key references public.cars(id) on delete cascade,
    -- Top-level signals promoted from `data` for indexed filtering.
    accident      boolean,
    simple_repair boolean,

    data          jsonb not null,
    fetched_at    timestamptz not null default now()
);

create index if not exists car_inspections_fetched_at_idx
    on public.car_inspections (fetched_at desc);
create index if not exists car_inspections_accident_idx
    on public.car_inspections (accident);

alter table public.car_inspections enable row level security;

-- Anon users can read inspection reports; only the service role (used
-- by the Next.js API route) writes new entries.
drop policy if exists "inspections viewable by everyone" on public.car_inspections;
create policy "inspections viewable by everyone"
    on public.car_inspections for select
    using (true);
