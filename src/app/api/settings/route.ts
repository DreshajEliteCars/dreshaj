import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";

/**
 * GET /api/settings — App settings proxy
 *
 * Returns `{ ship_price_eur }` from the singleton app_settings row.
 */
export async function GET(): Promise<Response> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ship_price_eur: 1300 });
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("ship_price_eur")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ship_price_eur: 1300 });
  }

  return NextResponse.json(
    { ship_price_eur: data.ship_price_eur },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
