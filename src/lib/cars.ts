/**
 * Cars data layer.
 *
 * Single source of truth for the car listing types, the URL filter
 * encoding, and the live Supabase query. The page imports from here
 * instead of holding its own data.
 */

import { getSupabase } from "./supabase";

export type FuelType = "Diesel" | "Petrol" | "Elektrik" | "Hibrid";
export type Transmission = "Manual" | "Automatik";

export type SortOption = "best" | "price_asc" | "price_desc" | "newest" | "mileage_asc";

/**
 * One row in the `cars` Supabase table. Mirrors the schema in
 * supabase/migrations/0001_create_cars.sql exactly.
 *
 * Most descriptive fields are nullable on purpose because the upstream
 * source (encar.com list endpoint) does not always provide them — e.g.
 * power, transmission and body type only show up on the per-car detail
 * endpoint, and seller info varies by listing.
 */
export type Car = {
  id: string;                            // `${source}:${source_id}`, e.g. "encar:41898616"
  source: string;                        // e.g. "encar"
  source_id: string;                     // upstream listing id

  make: string;
  model: string;
  trim: string | null;
  body_type: string | null;

  registration_year: number;
  registration_month: number | null;

  fuel_type: string | null;              // Diesel | Petrol | Elektrik | Hibrid | LPG | …
  transmission: string | null;           // Manual | Automatik | null

  price_eur: number | null;
  mileage_km: number | null;
  power_kw: number | null;
  power_hp: number | null;

  /** First image, used as the card thumbnail. */
  image_url: string | null;
  /** Every image the source provided, in order. */
  images: string[];
  photo_count: number;

  seller_name: string | null;
  seller_address: string | null;
  seller_logo: string | null;

  finance_monthly_eur: number | null;
  insurance_monthly_eur: number | null;

  /** Encar standard-equipment option codes (e.g. "014", "035"). */
  options: string[];
};

export type CarFilters = {
  make: string;
  model: string;
  bodyTypes: string[];
  registrationFrom: number | null;
  registrationTo: number | null;
  fuelType: string;
  priceFrom: number | null;
  priceTo: number | null;
  mileageFrom: number | null;
  mileageTo: number | null;
  transmission: string;
  sort: SortOption;
  page: number;
  pageSize: number;
};

export type CarSearchResult = {
  cars: Car[];
  total: number;
};

export const DEFAULT_PAGE_SIZE = 10;

export const emptyFilters = (): CarFilters => ({
  make: "",
  model: "",
  bodyTypes: [],
  registrationFrom: null,
  registrationTo: null,
  fuelType: "",
  priceFrom: null,
  priceTo: null,
  mileageFrom: null,
  mileageTo: null,
  transmission: "",
  sort: "best",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
});

// --- URL <-> filters serialization -------------------------------------------
// Single source of truth for how filters are encoded in the URL so the home
// page search box, the /cars page, the back button and shareable links all
// agree on the format.

const SORT_VALUES: SortOption[] = [
  "best",
  "price_asc",
  "price_desc",
  "newest",
  "mileage_asc",
];

function toPositiveInt(value: string | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export function filtersToSearchParams(f: CarFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.make) params.set("make", f.make);
  if (f.model) params.set("model", f.model);
  if (f.bodyTypes.length) params.set("bodyTypes", f.bodyTypes.join(","));
  if (f.registrationFrom != null) params.set("regFrom", String(f.registrationFrom));
  if (f.registrationTo != null) params.set("regTo", String(f.registrationTo));
  if (f.fuelType) params.set("fuel", f.fuelType);
  if (f.priceFrom != null) params.set("priceFrom", String(f.priceFrom));
  if (f.priceTo != null) params.set("priceTo", String(f.priceTo));
  if (f.mileageFrom != null) params.set("mileageFrom", String(f.mileageFrom));
  if (f.mileageTo != null) params.set("mileageTo", String(f.mileageTo));
  if (f.transmission) params.set("transmission", f.transmission);
  if (f.sort && f.sort !== "best") params.set("sort", f.sort);
  if (f.page > 1) params.set("page", String(f.page));
  return params;
}

type SearchParamsLike =
  | URLSearchParams
  | { get(name: string): string | null };

export function filtersFromSearchParams(params: SearchParamsLike): CarFilters {
  const get = (k: string) => params.get(k);
  const sortRaw = get("sort");
  const bodyTypesRaw = get("bodyTypes");

  return {
    ...emptyFilters(),
    make: get("make") ?? "",
    model: get("model") ?? "",
    bodyTypes: bodyTypesRaw ? bodyTypesRaw.split(",").filter(Boolean) : [],
    registrationFrom: toPositiveInt(get("regFrom")),
    registrationTo: toPositiveInt(get("regTo")),
    fuelType: get("fuel") ?? "",
    priceFrom: toPositiveInt(get("priceFrom")),
    priceTo: toPositiveInt(get("priceTo")),
    mileageFrom: toPositiveInt(get("mileageFrom")),
    mileageTo: toPositiveInt(get("mileageTo")),
    transmission: get("transmission") ?? "",
    sort: sortRaw && (SORT_VALUES as string[]).includes(sortRaw)
      ? (sortRaw as SortOption)
      : "best",
    page: Math.max(1, toPositiveInt(get("page")) ?? 1),
  };
}

/**
 * Returns true if any user-facing filter (make/model/body/etc.) is active.
 * Sort, page and pageSize are ignored on purpose.
 */
export function hasActiveFilters(f: CarFilters): boolean {
  return Boolean(
    f.make ||
      f.model ||
      f.bodyTypes.length > 0 ||
      f.registrationFrom != null ||
      f.registrationTo != null ||
      f.fuelType ||
      f.priceFrom != null ||
      f.priceTo != null ||
      f.mileageFrom != null ||
      f.mileageTo != null ||
      f.transmission
  );
}

/**
 * Search for cars matching the provided filters.
 *
 * Runs entirely in the browser against Supabase. No Next.js server hop, no
 * API route — just a single, RLS-protected Postgres query. If env vars
 * aren't configured (e.g. a fresh checkout, a preview deploy without
 * secrets) we return an empty result set instead of crashing the page.
 */
/**
 * Fetch a single car by URL identifier. Accepts either:
 *   - the bare `source_id` (e.g. "41897939")  — recommended in URLs
 *   - the full composite `id`  (e.g. "encar:41897939")
 *
 * Returns null when env vars aren't configured (preview deploys, fresh
 * checkouts) or when the car doesn't exist.
 */
export async function getCar(idOrSourceId: string): Promise<Car | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const trimmed = idOrSourceId.trim();
  if (!trimmed) return null;

  const isFullId = trimmed.includes(":");
  const column = isFullId ? "id" : "source_id";

  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .eq(column, trimmed)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Car | null) ?? null;
}

export async function searchCars(
  filters: CarFilters,
  options?: { signal?: AbortSignal }
): Promise<CarSearchResult> {
  if (options?.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { cars: [], total: 0 };
  }

  let q = supabase.from("cars").select("*", { count: "exact" });

  if (filters.make) q = q.eq("make", filters.make);
  if (filters.model) q = q.eq("model", filters.model);
  if (filters.bodyTypes.length) q = q.in("body_type", filters.bodyTypes);
  if (filters.fuelType) q = q.eq("fuel_type", filters.fuelType);
  if (filters.transmission) q = q.eq("transmission", filters.transmission);
  if (filters.priceFrom != null) q = q.gte("price_eur", filters.priceFrom);
  if (filters.priceTo != null) q = q.lte("price_eur", filters.priceTo);
  if (filters.mileageFrom != null) q = q.gte("mileage_km", filters.mileageFrom);
  if (filters.mileageTo != null) q = q.lte("mileage_km", filters.mileageTo);
  if (filters.registrationFrom != null) {
    q = q.gte("registration_year", filters.registrationFrom);
  }
  if (filters.registrationTo != null) {
    q = q.lte("registration_year", filters.registrationTo);
  }

  switch (filters.sort) {
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
      // "best results" = most recently scraped first.
      q = q.order("created_at", { ascending: false });
      break;
  }

  const from = Math.max(0, (filters.page - 1) * filters.pageSize);
  q = q.range(from, from + filters.pageSize - 1);

  // If the caller passed an AbortSignal, race the query against it so we
  // don't keep an old-filter response alive after the user has changed
  // filters.
  const signal = options?.signal;
  const queryPromise = q.then(({ data, count, error }) => {
    if (error) throw new Error(error.message);
    return {
      cars: (data ?? []) as Car[],
      total: count ?? 0,
    };
  });

  if (!signal) return queryPromise;
  return Promise.race([
    queryPromise,
    new Promise<CarSearchResult>((_, reject) => {
      if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true }
      );
    }),
  ]);
}
