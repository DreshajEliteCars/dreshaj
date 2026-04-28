# Dreshaj

Car listing site. Next.js frontend, Supabase backend, periodic Encar.com scraper.

## Architecture

```
   Browser                 Supabase                 Encar API
   ───────                 ────────                 ──────────
   Next.js app             cars table               public search
   (Vercel free)  ◄──────► sync_runs       ◄────────  + image CDN
                  anon     RLS protected            scraper writes
                  key                               with service key
                                  ▲
                                  │ runs every 6h
                                  │
                          GitHub Actions cron
                          (or any scheduler)
```

- **Frontend** is a normal Next.js app. Components in the browser query
  Supabase directly using the anon key. RLS makes that safe.
- **Backend** is just Supabase. No server we maintain, no API routes, no
  Vercel functions.
- **Scraper** (`scraper/scraper.js`) is a Node.js job. Runs anywhere on a
  schedule. Reads from Encar, writes to Supabase with the service key.

## Repo layout

| Path | Purpose |
|---|---|
| `src/app/` | Next.js pages |
| `src/lib/cars.ts` | `Car` / `CarFilters` types, URL encoding, `searchCars()` |
| `src/lib/supabase.ts` | Browser Supabase client (anon key) |
| `src/components/` | Header, SearchHero, etc. |
| `supabase/migrations/0001_create_cars.sql` | DB schema (`cars`, `sync_runs`) |
| `scraper/scraper.js` | Encar → Supabase sync |
| `scraper/translations.js` | Korean → English token map |
| `scraper/test-api.mjs` | Standalone API health check |
| `scraper/dry-run.mjs` | End-to-end pipeline check, no DB writes |
| `scraper/count.mjs` | Inventory counts per make |

## Local development

```bash
npm install
cp .env.example .env.local        # then fill in Supabase URL + anon key
npm run dev
```

The site renders empty listings until the scraper has populated `cars`.

## Setting up Supabase

1. Create a project at <https://supabase.com>.
2. SQL Editor → paste `supabase/migrations/0001_create_cars.sql` → Run.
3. Project Settings → API: copy the URL, the **anon** key, and the
   **service_role** key.
4. Add them to your env files (see below).

## Environment variables

### Root (`.env.local`) — used by the Next.js app
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Scraper (`scraper/.env`) — used by the sync job
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJ...                     # service_role key (server-only)

# Optional tuning
# SCRAPER_TARGETS=bmw,porsche
# SCRAPER_PAGE_SIZE=500
# SCRAPER_MAX_LISTINGS_PER_MAKE=50      # cap for testing
# SCRAPER_PRICE_MARKUP_EUR=400
```

The anon key is **public on purpose** — it's baked into the JS bundle and
RLS is what actually enforces security. The service-role key is **never**
shipped to the browser; it lives only on the scraper host.

## Running the scraper

```bash
cd scraper
npm install                              # one-time

node scraper.js bmw porsche              # specific makes
node scraper.js                          # use carlist.txt
node test-api.mjs benz                   # health check, no DB writes
node dry-run.mjs bmw 5                   # full pipeline, no DB writes
node count.mjs                           # how many cars per make right now
```

For makes that exceed Encar's ~10k pagination cap (BMW, Mercedes, Kia,
Hyundai), the scraper automatically slices by year buckets to get full
coverage. Typical full sync: ~5–10 minutes.

Every run is logged to `public.sync_runs` (status, totals, errors).
Query it from the SQL editor:

```sql
select id, started_at, finished_at, status, fetched_listings, saved_rows, deleted_rows
from sync_runs
order by started_at desc
limit 10;
```

## Using proxies

Encar's WAF rate-limits aggressive single-IP traffic with HTTP 407 / TCP
RST after a few hundred requests. A pool of static proxies lets the
scraper rotate IPs and effectively erase that ceiling.

Two ways to configure:

```bash
# Option A: a file (one proxy per line)
cp scraper/proxy.txt.example scraper/proxy.txt
# then edit scraper/proxy.txt

# Option B: environment variables
export SCRAPER_PROXIES="user:pass@host1:port,user:pass@host2:port"
# or single proxy:
export SCRAPER_PROXY="user:pass@host:port"
```

Supported line formats: `host:port`, `host:port:user:pass`,
`user:pass@host:port`, `http://...`, `https://...`.

Behaviour:
- Each proxy gets its own browser session (own cookie jar, own bootstrap).
- Requests round-robin across the pool.
- Any proxy that returns 3 consecutive failures gets cooled down for 60s.
- `proxy.txt` is gitignored; the `.example` file is not.

With a 5-proxy pool you can safely raise concurrency:
```
SCRAPER_DETAIL_CONCURRENCY=10 node scraper.js
```

## Scheduling the scraper

Recommended: GitHub Actions cron. Free for ~2 hrs/month at our volume.

```yaml
# .github/workflows/sync.yml
name: Sync cars
on:
  schedule:
    - cron: "0 */6 * * *"          # every 6 hours UTC
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
        working-directory: scraper
      - run: node scraper.js
        working-directory: scraper
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

## Deploying the frontend

The site is a standard Next.js app. Push to GitHub, connect to Vercel,
and add the two `NEXT_PUBLIC_*` env vars in the Vercel dashboard.
Vercel hosts it for free; you don't manage anything.
