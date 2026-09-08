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

  // Same cold-start/transient-blip retry already applied to /api/cars
  // and /api/featured: without it, a single momentary Supabase error
  // here reads to the visitor as "car not found" (see the notFound UI
  // in cars/[id]/page.tsx) for a listing that's actually still there —
  // the worst version of this bug class, since it's the car's own core
  // data, not a sidebar section.
  const MAX_ATTEMPTS = 2;
  let data: unknown = null;
  let error: { message: string } | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await supabase
      .from("cars")
      .select(
        "id, source, source_id, make, model, trim, body_type, " +
        "registration_year, registration_month, fuel_type, transmission, " +
        "price_eur, mileage_km, power_kw, power_hp, image_url, images, " +
        "photo_count, finance_monthly_eur, insurance_monthly_eur, options"
      )
      .eq(column, trimmed)
      .maybeSingle();
    data = result.data;
    error = result.error;
    if (!error) break;
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  if (error) {
    return NextResponse.json(
      { car: null, error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!data) {
    return NextResponse.json({ car: null }, { status: 404 });
  }

  return NextResponse.json(
    { car: data },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
