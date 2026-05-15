/**
 * Cars data layer.
 *
 * Single source of truth for the car listing types, the URL filter
 * encoding, and the data-fetching functions. All data now flows
 * through server-side API routes (/api/cars, /api/cars/[id]/detail)
 * so the Supabase URL is never exposed to the browser.
 */

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
  searchQuery: string;
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
  searchQuery: "",
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
  if (f.searchQuery) params.set("q", f.searchQuery);
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
    searchQuery: get("q") ?? "",
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
    f.searchQuery ||
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
 * Fetch a single car by URL identifier via the server-side API proxy.
 * Accepts either the bare `source_id` (e.g. "41897939") or the full
 * composite `id` (e.g. "encar:41897939").
 */
export async function getCar(idOrSourceId: string): Promise<Car | null> {
  const trimmed = idOrSourceId.trim();
  if (!trimmed) return null;

  const res = await fetch(`/api/cars/${encodeURIComponent(trimmed)}/detail`);
  if (!res.ok) return null;

  const body = await res.json();
  return (body.car as Car | null) ?? null;
}

/**
 * Search for cars matching the provided filters via the server-side
 * API proxy. The browser never touches Supabase directly.
 */
export async function searchCars(
  filters: CarFilters,
  options?: { signal?: AbortSignal }
): Promise<CarSearchResult> {
  if (options?.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // Build query params matching what the API route expects.
  const params = new URLSearchParams();
  if (filters.searchQuery) params.set("q", filters.searchQuery);
  if (filters.make) params.set("make", filters.make);
  if (filters.model) params.set("model", filters.model);
  if (filters.bodyTypes.length) params.set("bodyTypes", filters.bodyTypes.join(","));
  if (filters.fuelType) params.set("fuel", filters.fuelType);
  if (filters.transmission) params.set("transmission", filters.transmission);
  if (filters.priceFrom != null) params.set("priceFrom", String(filters.priceFrom));
  if (filters.priceTo != null) params.set("priceTo", String(filters.priceTo));
  if (filters.mileageFrom != null) params.set("mileageFrom", String(filters.mileageFrom));
  if (filters.mileageTo != null) params.set("mileageTo", String(filters.mileageTo));
  if (filters.registrationFrom != null) params.set("regFrom", String(filters.registrationFrom));
  if (filters.registrationTo != null) params.set("regTo", String(filters.registrationTo));
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));

  const res = await fetch(`/api/cars?${params.toString()}`, {
    signal: options?.signal,
  });

  if (!res.ok) {
    throw new Error(`Search failed: HTTP ${res.status}`);
  }

  const body = await res.json();
  return {
    cars: (body.cars ?? []) as Car[],
    total: body.total ?? 0,
  };
}
