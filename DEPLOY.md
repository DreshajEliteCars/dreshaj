# Deployment

This repo has two independent pieces:

| Piece | Where it runs | Why |
| --- | --- | --- |
| **Frontend** (`/`, `/cars`, `/dashboard`, `/api/cars/...`) | Vercel | Next.js + Supabase. No long-running work. |
| **Scraper** (`scraper/scraper.js`) | GitHub Actions cron | 25-40 minute job, tied to a residential proxy pool, hits a single anti-bot WAF. Vercel functions cap at 60 s, so the scraper cannot run on Vercel. |

## 1. Supabase setup

Apply migrations in order via Supabase SQL editor (or `supabase db push`):

```
supabase/migrations/0001_create_cars.sql
supabase/migrations/0002_add_cars_options.sql
supabase/migrations/0003_create_car_inspections.sql
supabase/migrations/0004_create_local_cars.sql
supabase/migrations/0005_create_app_settings.sql
supabase/migrations/0006_add_local_cars_details.sql
```

Create a storage bucket called `local_car_images` (public read) — used by `LocalCarsManager` on the dashboard.

## 2. Vercel — frontend

1. Import the repo. Framework auto-detects as Next.js.
2. Project → Settings → Environment Variables → add for **all three** environments (Production, Preview, Development):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only — used by `/api/cars/[id]/inspection` etc. for write-back caching) |

3. Deploy. The included `vercel.json` raises memory for the OG image route and bumps the inspection-route timeout to 30 s.
4. Optional: in Vercel → Project → Domains, attach `dreshaj.com` (or whatever your domain is).

The `ignoreCommand` in `vercel.json` skips re-deploys when only `scraper/`, `.github/`, `supabase/` migrations or markdown change — saves build minutes.

## 3. GitHub Actions — scraper

The workflow is at `.github/workflows/scraper.yml`. It runs every 6 hours and can be triggered manually with custom inputs.

### Required secrets (Settings → Secrets and variables → Actions → Secrets)

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | same as Vercel |
| `SUPABASE_KEY` | service-role key (writes bypass RLS) |
| `SCRAPER_PROXIES` | proxy list, one per line. Strongly recommended — without proxies Encar's WAF starts 407-blocking after the first make. Format examples in `scraper/proxy.txt.example`. |

### Optional variables (same screen → Variables tab)

| Name | Default | Notes |
| --- | --- | --- |
| `SCRAPER_TARGETS` | (carlist.txt) | comma-separated make aliases |
| `SCRAPER_PAGE_SIZE` | 500 | 1000 = Encar API hard cap |
| `SCRAPER_MAX_LISTINGS_PER_MAKE` | (no cap) | useful for staging runs |
| `SCRAPER_DETAIL_CONCURRENCY` | 5 | bump to 8-10 with strong proxy pool |
| `SCRAPER_SKIP_FRESH_HOURS` | 6 | skip detail re-fetch for rows updated within this window |
| `SCRAPER_MAX_PRICE_EUR` | 50000 | hard ceiling — listings above this are dropped |

### Manual run

Actions tab → "Scraper sync" → "Run workflow" → optional `targets` (e.g. `bmw,porsche`) and `max_per_make` (e.g. `50` for a quick smoke test).

## 4. How the scraper works

1. Loads makes from `scraper/carlist.txt` (or `SCRAPER_TARGETS`).
2. Initialises a pool of proxy-bound clients (one cookie jar per proxy) and bootstraps each session by browsing encar.com so subsequent API calls look like a real browser. Round-robins requests across the pool.
3. For each make:
   - Gets the total count from the list endpoint.
   - If the count exceeds 9,000, recursively splits the year window into sub-buckets — Encar's pagination becomes unreliable past ~10k unique results per query.
   - Walks each bucket page-by-page (default 500/page), normalising each row into the `cars` schema.
   - For each new row, calls the detail endpoint to enrich it (full photo gallery, body type, transmission, options, live ad price). Detail calls run with a small concurrency (default 5) to stay under Encar's per-IP rate limit.
   - Listings whose computed price exceeds `SCRAPER_MAX_PRICE_EUR` are dropped at this stage (before the upsert).
4. Rows are upserted in 250-row chunks. Listings that disappeared from Encar since the last full sync are deleted only when the run completed without page errors and the deletion safeguard is satisfied (preventing accidental wipes when a single failed page hides 500 listings).
5. A circuit breaker watches for WAF signals (HTTP 407 / TCP resets). On a burst, all in-flight callers wait on a shared 60-second cooldown, then every client refreshes its session.
6. Every run writes a `sync_runs` row (status, totals, per-make warnings, timing), so you can answer "did the last run succeed?" with one query.

Frontend display always adds the configurable `ship_price_eur` from `app_settings` on top of the stored `price_eur`. So changing the shipping fee in the dashboard re-prices every car instantly without any re-scraping.

## 5. Sanity checks before going live

```bash
# Build clean? (must produce no warnings/errors)
npm run build

# Scraper dry-run from your own machine (uses scraper/.env)
cd scraper
SCRAPER_MAX_LISTINGS_PER_MAKE=10 SCRAPER_TARGETS=bmw node scraper.js
```

If the dry-run prints no 407 storms and lists rows like `[BMW] saved 10`, you're good to ship.
