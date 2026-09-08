import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";

/**
 * GET /api/featured — Homepage featured + local cars
 *
 * Returns both datasets in one call so the homepage only makes a
 * single request instead of two separate Supabase queries.
 */

// Same class of issue already fixed for /api/cars and the inspection
// route: a transient Supabase blip (cold-start hiccup, momentary
// network error) used to be indistinguishable from "genuinely zero
// rows" — `data ?? []` swallowed the error silently, so one section
// (e.g. "Më të kërkuarat") could go blank on the homepage while the
// other loaded fine, with nothing in the logs to explain why. One
// quick retry per query absorbs that instead.
const MAX_ATTEMPTS = 2;

async function fetchWithRetry<T>(
  label: string,
  run: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  let lastErrorMessage: string | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await run();
    if (!error) return data ?? [];
    lastErrorMessage = error.message;
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  console.warn(
    `/api/featured: "${label}" query failed after ${MAX_ATTEMPTS} attempts: ${lastErrorMessage}`
  );
  return [];
}

export async function GET(): Promise<Response> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ famous: [], local: [] });
  }

  const [famous, local] = await Promise.all([
    fetchWithRetry("famous", () =>
      supabase
        .from("cars")
        .select(
          "source_id, make, model, trim, registration_year, mileage_km, " +
          "fuel_type, power_hp, price_eur, image_url, images"
        )
        .in("make", ["BMW", "Volkswagen", "Mercedes-Benz", "Audi"])
        .order("photo_count", { ascending: false })
        .limit(4)
    ),
    fetchWithRetry("local", () =>
      supabase
        .from("local_cars")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8)
    ),
  ]);

  return NextResponse.json(
    { famous, local },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
