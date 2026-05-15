import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../../../lib/supabaseServer";

/**
 * GET /api/cars/[id]/detail — Single car proxy
 *
 * Returns one car by source_id (or full composite id).
 * Strips the `raw` jsonb and seller fields from the response.
 */

type RouteParams = Promise<{ id: string }>;

export async function GET(
  _req: Request,
  { params }: { params: RouteParams }
): Promise<Response> {
  const { id } = await params;
  const trimmed = decodeURIComponent(id).trim();
  if (!trimmed) {
    return NextResponse.json({ car: null }, { status: 400 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ car: null }, { status: 503 });
  }

  const isFullId = trimmed.includes(":");
  const column = isFullId ? "id" : "source_id";

  const { data, error } = await supabase
    .from("cars")
    .select(
      "id, source, source_id, make, model, trim, body_type, " +
      "registration_year, registration_month, fuel_type, transmission, " +
      "price_eur, mileage_km, power_kw, power_hp, image_url, images, " +
      "photo_count, finance_monthly_eur, insurance_monthly_eur, options"
    )
    .eq(column, trimmed)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ car: null, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ car: null }, { status: 404 });
  }

  return NextResponse.json(
    { car: data },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
