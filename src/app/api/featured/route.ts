import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";

/**
 * GET /api/featured — Homepage featured + local cars
 *
 * Returns both datasets in one call so the homepage only makes a
 * single request instead of two separate Supabase queries.
 */
export async function GET(): Promise<Response> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ famous: [], local: [] });
  }

  const [famousResult, localResult] = await Promise.all([
    supabase
      .from("cars")
      .select(
        "source_id, make, model, trim, registration_year, mileage_km, " +
        "fuel_type, power_hp, price_eur, image_url, images"
      )
      .in("make", ["BMW", "Volkswagen", "Mercedes-Benz", "Audi"])
      .order("photo_count", { ascending: false })
      .limit(4),
    supabase
      .from("local_cars")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return NextResponse.json(
    {
      famous: famousResult.data ?? [],
      local: localResult.data ?? [],
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
