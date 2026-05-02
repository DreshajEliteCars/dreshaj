-- Single-row configuration table for runtime-tunable values that the
-- admin dashboard can edit without redeploying the app. The most
-- important value today is `ship_price_eur` — the flat shipping fee
-- (currently €1,300) added on top of every Encar listing's price.
--
-- We use a "singleton" pattern: enforce id = 1 with a CHECK so there's
-- always exactly one row, simplifying SELECT/UPDATE in client code.

create table if not exists public.app_settings (
    id              smallint primary key default 1
        check (id = 1),
    ship_price_eur  integer not null default 1300
        check (ship_price_eur >= 0),
    updated_at      timestamptz not null default now()
);

-- Seed the singleton row.
insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

-- Auto-update `updated_at` on row update.
create or replace function public.app_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
    before update on public.app_settings
    for each row execute function public.app_settings_set_updated_at();

-- Anyone can read settings (the public site needs to know the ship
-- price to render prices). Only authenticated users (admins) can update.
alter table public.app_settings enable row level security;

drop policy if exists "app_settings are viewable by everyone" on public.app_settings;
create policy "app_settings are viewable by everyone"
    on public.app_settings for select
    using (true);

drop policy if exists "app_settings updatable by authenticated" on public.app_settings;
create policy "app_settings updatable by authenticated"
    on public.app_settings for update
    to authenticated
    using (true)
    with check (true);
