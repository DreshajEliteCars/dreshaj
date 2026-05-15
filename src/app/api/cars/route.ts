import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";

/**
 * GET /api/cars — Search proxy
 *
 * Accepts the same filter params the client used to send directly to
 * Supabase. The browser never touches Supabase; this route does it
 * server-side and returns `{ cars, total }`.
 */
export async function GET(req: Request): Promise<Response> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ cars: [], total: 0 });
  }

  const { searchParams } = new URL(req.url);

  let q = supabase.from("cars").select(
    "id, source, source_id, make, model, trim, body_type, " +
    "registration_year, registration_month, fuel_type, transmission, " +
    "price_eur, mileage_km, power_kw, power_hp, image_url, images, " +
    "photo_count, finance_monthly_eur, insurance_monthly_eur, options, " +
    "created_at",
    { count: "exact" }
  );

  // --- Filters ---
  const searchQuery = searchParams.get("q");
  if (searchQuery) {
    const term = `%${searchQuery}%`;
    q = q.or(`make.ilike.${term},model.ilike.${term},trim.ilike.${term}`);
  }

  const make = searchParams.get("make");
  if (make) q = q.eq("make", make);

  const model = searchParams.get("model");
  if (model) q = q.eq("model", model);

  const bodyTypes = searchParams.get("bodyTypes");
  if (bodyTypes) q = q.in("body_type", bodyTypes.split(",").filter(Boolean));

  const fuelType = searchParams.get("fuel");
  if (fuelType) q = q.eq("fuel_type", fuelType);

  const transmission = searchParams.get("transmission");
  if (transmission) q = q.eq("transmission", transmission);

  const priceFrom = searchParams.get("priceFrom");
  if (priceFrom) q = q.gte("price_eur", Number(priceFrom));

  const priceTo = searchParams.get("priceTo");
  if (priceTo) q = q.lte("price_eur", Number(priceTo));

  const mileageFrom = searchParams.get("mileageFrom");
  if (mileageFrom) q = q.gte("mileage_km", Number(mileageFrom));

  const mileageTo = searchParams.get("mileageTo");
  if (mileageTo) q = q.lte("mileage_km", Number(mileageTo));

  const regFrom = searchParams.get("regFrom");
  if (regFrom) q = q.gte("registration_year", Number(regFrom));

  const regTo = searchParams.get("regTo");
  if (regTo) q = q.lte("registration_year", Number(regTo));

  // --- Sort ---
  const sort = searchParams.get("sort") ?? "best";
  switch (sort) {
    case "price_asc":
      q = q.order("price_eur", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      q = q.order("price_eur", { ascending: false, nullsFirst: false });
      break;
    case "newest":
      q = q
        .order("registration_year", { ascending: false })
        .order("registration_month", { ascending: false, nullsFirst: false });
      break;
    case "mileage_asc":
      q = q.order("mileage_km", { ascending: true, nullsFirst: false });
      break;
    default:
      q = q
        .order("photo_count", { ascending: false })
        .order("created_at", { ascending: false });
      break;
  }

  // --- Pagination ---
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));
  const from = (page - 1) * pageSize;
  q = q.range(from, from + pageSize - 1);

  const { data, count, error } = await q;
  if (error) {
    return NextResponse.json(
      { cars: [], total: 0, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { cars: data ?? [], total: count ?? 0 },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
