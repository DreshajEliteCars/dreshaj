-- Flat `cars` table that backs both the public listing UI and the encar.com
-- scraper. One row per listing. Images are stored inline as a text[] so a
-- listing can carry every photo the upstream source provided without a join.
--
-- Run via Supabase Dashboard SQL editor or `supabase db push`.

create extension if not exists pgcrypto;

create table if not exists public.cars (
    id                     text primary key,
    source                 text not null default 'encar',
    source_id              text not null,

    make                   text not null,
    model                  text not null,
    trim                   text,
    body_type              text,

    registration_year      smallint not null,
    registration_month     smallint
        check (registration_month is null or registration_month between 1 and 12),

    fuel_type              text,
    transmission           text,

    price_eur              integer
        check (price_eur is null or price_eur >= 0),
    mileage_km             integer
        check (mileage_km is null or mileage_km >= 0),
    power_kw               integer
        check (power_kw is null or power_kw >= 0),
    power_hp               integer
        check (power_hp is null or power_hp >= 0),

    image_url              text,
    images                 text[] not null default '{}',
    photo_count            integer not null default 0,

    seller_name            text,
    seller_address         text,
    seller_logo            text,

    finance_monthly_eur    integer,
    insurance_monthly_eur  integer,

    raw                    jsonb,

    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now(),

    constraint cars_source_unique unique (source, source_id)
);

-- Auto-update `updated_at` on row update.
create or replace function public.cars_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists cars_set_updated_at on public.cars;
create trigger cars_set_updated_at
    before update on public.cars
    for each row execute function public.cars_set_updated_at();

-- Indexes that match the filters in src/lib/cars.ts.
create index if not exists cars_make_idx              on public.cars (make);
create index if not exists cars_model_idx             on public.cars (model);
create index if not exists cars_body_type_idx         on public.cars (body_type);
create index if not exists cars_fuel_type_idx         on public.cars (fuel_type);
create index if not exists cars_transmission_idx      on public.cars (transmission);
create index if not exists cars_price_eur_idx         on public.cars (price_eur);
create index if not exists cars_mileage_km_idx        on public.cars (mileage_km);
create index if not exists cars_registration_year_idx on public.cars (registration_year);
create index if not exists cars_created_at_idx        on public.cars (created_at desc);

-- Public read access (listings page is anonymous). Writes go through the
-- service role used by the scraper, so RLS denies anon writes.
alter table public.cars enable row level security;

drop policy if exists "cars are viewable by everyone" on public.cars;
create policy "cars are viewable by everyone"
    on public.cars for select
    using (true);

-- ---------------------------------------------------------------------------
-- sync_runs: one row per scraper invocation. Lets us answer "did the last
-- run succeed?", "how stale is the data?", and "which make failed?" without
-- shelling into the worker. Read by an admin dashboard later; not exposed
-- to the public.
-- ---------------------------------------------------------------------------

create table if not exists public.sync_runs (
    id                bigserial primary key,
    started_at        timestamptz not null default now(),
    finished_at       timestamptz,
    status            text not null default 'running'
        check (status in ('running', 'success', 'partial', 'failed')),

    targets           text[] not null default '{}',
    exchange_rate     numeric,

    fetched_listings  integer not null default 0,
    saved_rows        integer not null default 0,
    skipped_listings  integer not null default 0,
    deleted_rows      integer not null default 0,

    error             text,
    summary           jsonb
);

create index if not exists sync_runs_started_at_idx on public.sync_runs (started_at desc);
create index if not exists sync_runs_status_idx     on public.sync_runs (status);

alter table public.sync_runs enable row level security;
-- No anon policy: only the service role (scraper) can read/write sync_runs.
