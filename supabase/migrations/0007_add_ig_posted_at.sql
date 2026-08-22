-- Tracks which `cars` rows have already been posted to Instagram, so the
-- posting job (scraper/post-to-instagram.js) can pick N unposted listings
-- per run instead of re-posting the same car or trying to post every row
-- the scraper just ingested (which can be thousands per sync).
--
-- Run via Supabase Dashboard SQL editor or `supabase db push`.

alter table public.cars
    add column if not exists ig_posted_at timestamptz;

-- Used by "give me the next N unposted cars" — partial index keeps it
-- small since most rows will eventually have ig_posted_at set.
create index if not exists cars_ig_unposted_idx
    on public.cars (created_at desc)
    where ig_posted_at is null;
