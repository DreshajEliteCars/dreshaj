/**
 * Supabase `cars` rows → Instagram posts.
 *
 * The scraper (scraper.js) can drop thousands of rows into `cars` in a
 * single sync. This job runs separately (its own, much less frequent
 * schedule — see .github/workflows/instagram-post.yml) and only ever
 * posts a small, capped batch of *unposted* listings per run, tracked via
 * the `ig_posted_at` column (supabase/migrations/0007_add_ig_posted_at.sql).
 * A car is only ever posted once — once `ig_posted_at` is set it's
 * excluded from future runs.
 *
 * Single photo  -> one `/media` call, image_url + caption, straight to publish.
 * Multiple photos -> carousel: each image becomes a child container
 * (`is_carousel_item=true`), then a parent CAROUSEL container references
 * all children, then that parent gets published. Capped at 10 images —
 * that's Instagram's hard limit per carousel.
 *
 * Pricing: `cars.price_eur` is the raw Encar price. The site never shows
 * that number directly — every displayed price is `price_eur + ship_price_eur`,
 * where `ship_price_eur` is the single admin-configurable surcharge in
 * `app_settings` (src/lib/appSettings.ts `applyShipPrice`). This job reads
 * that same settings row so the posted price always matches the site.
 *
 * Required environment variables:
 *   SUPABASE_URL        - project URL (same var the scraper uses)
 *   SUPABASE_KEY         - service-role key (same var the scraper uses)
 *   IG_ACCESS_TOKEN      - long-lived Page access token with instagram_content_publish
 *   IG_BUSINESS_ID       - Instagram Business Account ID (not the Page ID)
 *
 * Optional:
 *   IG_POSTS_PER_RUN        - how many unposted cars to publish this run, default 5
 *   IG_CONTACT_PHONE        - default "+383 49 845 745"
 *   IG_SITE_URL              - default "dreshajelitecars.com"
 *   IG_DRY_RUN                - "true" to build + print payloads without calling the API
 *                              or writing ig_posted_at
 *   IG_MAX_CAROUSEL_IMAGES   - default 10 (Instagram's own cap)
 *   IG_POST_STEP_DELAY_MS    - pause between posts within a run, default 60000 (1 min)
 *
 * CLI:
 *   node scraper/post-to-instagram.js                    # posts up to IG_POSTS_PER_RUN unposted cars
 *   node scraper/post-to-instagram.js <car-id>            # posts one specific car, ignoring the cap/flag
 *   IG_DRY_RUN=true node scraper/post-to-instagram.js     # print payloads only, no API calls, no DB writes
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IG_CONTACT_PHONE = process.env.IG_CONTACT_PHONE || '+383 49 845 745';
const IG_SITE_URL = process.env.IG_SITE_URL || 'dreshajelitecars.com';
const IG_DRY_RUN = String(process.env.IG_DRY_RUN).toLowerCase() === 'true';
const MAX_CAROUSEL_IMAGES = parsePositiveInt(process.env.IG_MAX_CAROUSEL_IMAGES) || 10;
const POSTS_PER_RUN = parsePositiveInt(process.env.IG_POSTS_PER_RUN) || 5;

// Mirrors src/lib/appSettings.ts DEFAULT_SHIP_PRICE_EUR — only used if the
// app_settings row can't be read for some reason, so a DB hiccup doesn't
// crash the whole run.
const FALLBACK_SHIP_PRICE_EUR = 1300;

// Between child-container creations in a carousel, so we don't slam the
// endpoint with 10 back-to-back writes. Not required for correctness, just
// polite — mirrors the spacing the main scraper uses against Encar.
const CAROUSEL_STEP_DELAY_MS = 800;

// Between separate posts within one run — spreads a 5-post run out over a
// few minutes instead of firing them back-to-back, which reads as more
// natural activity and stays well clear of IG's own rate limits.
const POST_STEP_DELAY_MS = parsePositiveInt(process.env.IG_POST_STEP_DELAY_MS) || 60_000;

function parsePositiveInt(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------------------------------------------------
// Caption
// -----------------------------------------------------------------------------

/** Same math as src/lib/appSettings.ts applyShipPrice — raw price + surcharge. */
function applyShipPrice(rawPriceEur, shipPriceEur) {
  return rawPriceEur == null ? null : rawPriceEur + shipPriceEur;
}

function buildCaption(car, shipPriceEur) {
  const title = [car.make, car.model, car.trim].filter(Boolean).join(' ');
  const registration = String(car.registration_year);
  const km = car.mileage_km != null ? `${car.mileage_km.toLocaleString('en-US')} km` : 'N/A';
  const displayPriceEur = applyShipPrice(car.price_eur, shipPriceEur);
  const price = displayPriceEur != null ? `${displayPriceEur.toLocaleString('en-US')}€` : 'Kontaktoni për çmim';

  return `${title}

Dreshaj Elite Cars

Çmimi deri në Durrës: ${price} (pa doganë)
Deri në Prishtinë: +350€

Viti: ${registration}
Kilometrazha: ${km}
Transmisioni: ${car.transmission || 'N/A'}
Karburanti: ${car.fuel_type || 'N/A'}

Çmimi përfshin blerjen e veturës, transportin brenda Koresë, dokumentacionin e eksportit dhe transportin detar deri në Durrës. Deri në Prishtinë shtohet fletëlëshimi nga porti dhe transporti me shlepa.

Koha mesatare e transportit: 33 ditë. Çmimi mund të ndryshojë sipas kostove aktuale të transportit — veturat vijnë vetëm me porosi direkt nga Koreja.

Kontakt: ${IG_CONTACT_PHONE} (Viber / WhatsApp)
${IG_SITE_URL}`;
}

// -----------------------------------------------------------------------------
// Supabase
// -----------------------------------------------------------------------------

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_KEY environment variables.');
  }
  return createClient(url, key);
}

async function fetchCarById(supabase, carId) {
  const { data, error } = await supabase.from('cars').select('*').eq('id', carId).single();
  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }
  if (!data) {
    throw new Error(`No car found with id "${carId}".`);
  }
  return data;
}

/** Next `limit` cars that haven't been posted to Instagram yet, freshest first. */
async function fetchUnpostedCars(supabase, limit) {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .is('ig_posted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }
  return data || [];
}

/** Same singleton row src/app/api/settings/route.ts reads (`app_settings`, id=1). */
async function fetchShipPriceEur(supabase) {
  const { data, error } = await supabase.from('app_settings').select('ship_price_eur').eq('id', 1).single();
  if (error || data?.ship_price_eur == null) {
    console.error(
      `Warning: couldn't read app_settings.ship_price_eur (${error?.message || 'no row'}) — falling back to ${FALLBACK_SHIP_PRICE_EUR}.`
    );
    return FALLBACK_SHIP_PRICE_EUR;
  }
  return data.ship_price_eur;
}

async function markPosted(supabase, carId) {
  const { error } = await supabase.from('cars').update({ ig_posted_at: new Date().toISOString() }).eq('id', carId);
  if (error) {
    // Don't crash the run over this — the post already went out. Surface it
    // loudly instead, since a failed write here means this car could get
    // re-posted next run.
    console.error(`Warning: post succeeded but failed to mark "${carId}" as posted: ${error.message}`);
  }
}

// -----------------------------------------------------------------------------
// Instagram Graph API
// -----------------------------------------------------------------------------

function getIgConfig() {
  const accessToken = process.env.IG_ACCESS_TOKEN;
  const igBusinessId = process.env.IG_BUSINESS_ID;
  if (!accessToken || !igBusinessId) {
    throw new Error('Missing IG_ACCESS_TOKEN / IG_BUSINESS_ID environment variables.');
  }
  return { accessToken, igBusinessId };
}

async function createContainer(igBusinessId, accessToken, params) {
  const { data } = await axios.post(`${GRAPH_API_BASE}/${igBusinessId}/media`, null, {
    params: { ...params, access_token: accessToken },
  });
  return data.id;
}

async function publishContainer(igBusinessId, accessToken, creationId) {
  const { data } = await axios.post(`${GRAPH_API_BASE}/${igBusinessId}/media_publish`, null, {
    params: { creation_id: creationId, access_token: accessToken },
  });
  return data.id;
}

async function postSingleImage({ igBusinessId, accessToken, imageUrl, caption }) {
  const creationId = await createContainer(igBusinessId, accessToken, {
    image_url: imageUrl,
    caption,
  });
  return publishContainer(igBusinessId, accessToken, creationId);
}

async function postCarousel({ igBusinessId, accessToken, imageUrls, caption }) {
  const childIds = [];
  for (const imageUrl of imageUrls) {
    const childId = await createContainer(igBusinessId, accessToken, {
      image_url: imageUrl,
      is_carousel_item: true,
    });
    childIds.push(childId);
    await sleep(CAROUSEL_STEP_DELAY_MS);
  }

  const parentId = await createContainer(igBusinessId, accessToken, {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
  });

  return publishContainer(igBusinessId, accessToken, parentId);
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function postOneCar(car, shipPriceEur, { igBusinessId, accessToken }) {
  const images = (car.images && car.images.length ? car.images : [car.image_url].filter(Boolean)).slice(
    0,
    MAX_CAROUSEL_IMAGES
  );

  if (images.length === 0) {
    throw new Error(`Car "${car.id}" has no images — nothing to post.`);
  }

  const caption = buildCaption(car, shipPriceEur);

  console.log(`Car: ${car.make} ${car.model} (${car.id})`);
  console.log(`Images: ${images.length}${car.images?.length > MAX_CAROUSEL_IMAGES ? ` (capped from ${car.images.length})` : ''}`);
  console.log('--- caption ---');
  console.log(caption);
  console.log('---------------');

  if (IG_DRY_RUN) {
    console.log('IG_DRY_RUN=true — not calling the Instagram API or writing ig_posted_at.');
    return null;
  }

  const postId =
    images.length === 1
      ? await postSingleImage({ igBusinessId, accessToken, imageUrl: images[0], caption })
      : await postCarousel({ igBusinessId, accessToken, imageUrls: images, caption });

  console.log(`Published. Instagram media id: ${postId}`);
  return postId;
}

async function main() {
  const carId = process.argv[2];
  const supabase = getSupabaseClient();
  const igConfig = IG_DRY_RUN ? { accessToken: null, igBusinessId: null } : getIgConfig();
  const shipPriceEur = await fetchShipPriceEur(supabase);

  // Single-car mode: post exactly this one, regardless of ig_posted_at.
  // Useful for manual testing without disturbing the daily batch state.
  if (carId) {
    const car = await fetchCarById(supabase, carId);
    await postOneCar(car, shipPriceEur, igConfig);
    return;
  }

  // Batch mode: up to POSTS_PER_RUN cars that haven't been posted yet.
  const cars = await fetchUnpostedCars(supabase, POSTS_PER_RUN);

  if (cars.length === 0) {
    console.log('No unposted cars found — nothing to do.');
    return;
  }

  console.log(`Posting ${cars.length} car(s) this run (cap: ${POSTS_PER_RUN}). Ship price: ${shipPriceEur}€.`);

  for (const [index, car] of cars.entries()) {
    try {
      const postId = await postOneCar(car, shipPriceEur, igConfig);
      if (postId && !IG_DRY_RUN) {
        await markPosted(supabase, car.id);
      }
    } catch (err) {
      // One bad listing (dead image URL, etc.) shouldn't kill the rest of
      // the run — log it and move on to the next car.
      const apiError = err.response?.data?.error;
      console.error(`Skipping car "${car.id}":`, apiError ? JSON.stringify(apiError) : err.message);
    }

    const isLast = index === cars.length - 1;
    if (!isLast && !IG_DRY_RUN) {
      await sleep(POST_STEP_DELAY_MS);
    }
  }
}

main().catch((err) => {
  const apiError = err.response?.data?.error;
  console.error('Failed:', apiError ? JSON.stringify(apiError, null, 2) : err.message);
  process.exit(1);
});
