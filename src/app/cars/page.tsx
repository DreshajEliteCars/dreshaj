"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { brandModels, allBrands } from "../../utils/carData";
import { useLanguage } from "../../context/LanguageContext";
import {
  Car,
  CarFilters,
  emptyFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  hasActiveFilters,
  searchCars,
  SortOption,
} from "../../lib/cars";
import { applyShipPrice } from "../../lib/appSettings";
import { useShipPrice } from "../../lib/useShipPrice";

// --- Static filter option lists -----------------------------------------------

const BODY_TYPES: { name: string; img: string }[] = [
  { name: "SUV", img: "/cars/suv_1x_car.png" },
  { name: "Kabriolet", img: "/cars/convertible_1x_car.png" },
  { name: "Furgon", img: "/cars/transport_1x_car.png" },
  { name: "Sedan", img: "/cars/sedan_1x_car.png" },
  { name: "Kupe", img: "/cars/coupe_1x_car.png" },
];

const FUEL_TYPES = ["Diesel", "Petrol", "Elektrik", "Hibrid"] as const;
const TRANSMISSION_TYPES = ["Manual", "Automatik"] as const;

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 2015;
const REGISTRATION_YEARS: number[] = Array.from(
  { length: CURRENT_YEAR - MIN_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i
);

// --- Formatting helpers -------------------------------------------------------

const numberFormatter = new Intl.NumberFormat("en-US");

function formatPrice(eur: number | null, missingLabel = "Contact for price"): string {
  if (eur == null) return missingLabel;
  return `€ ${numberFormatter.format(eur)}`;
}

function formatMileage(km: number | null): string | null {
  if (km == null) return null;
  return `${numberFormatter.format(km)} km`;
}

function formatRegistration(year: number, month: number | null): string {
  if (month && month >= 1 && month <= 12) {
    return `${String(month).padStart(2, "0")}/${year}`;
  }
  return String(year);
}

function formatPower(kw: number | null, hp: number | null): string | null {
  if (kw == null && hp == null) return null;
  if (kw != null && hp != null) return `${kw} kW (${hp} hp)`;
  if (hp != null) return `${hp} hp`;
  return `${kw} kW`;
}

// --- Page component -----------------------------------------------------------

export default function CarsPage() {
  // useSearchParams must be inside a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<CarsPageFallback />}>
      <CarsPageInner />
    </Suspense>
  );
}

function CarsPageFallback() {
  return (
    <>
      <Header />
      <div className={styles.carsLayout}>
        <main className={styles.mainContent}>
          <div className={styles.emptyState}>
            <p>Loading…</p>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}

function CarsPageInner() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialise filters from the URL so links like /cars?make=BMW work.
  const [filters, setFilters] = useState<CarFilters>(() =>
    filtersFromSearchParams(searchParams)
  );

  // If the URL changes from outside (back/forward, another in-app link),
  // sync filters back to it. We compare serialized params to avoid loops.
  const lastSyncedQS = useRef(filtersToSearchParams(filters).toString());
  useEffect(() => {
    const incoming = searchParams.toString();
    if (incoming === lastSyncedQS.current) return;
    lastSyncedQS.current = incoming;
    setFilters(filtersFromSearchParams(searchParams));
  }, [searchParams]);

  // Open/close state for each filter modal
  const [openModal, setOpenModal] = useState<
    | null
    | "makeModel"
    | "bodyType"
    | "registration"
    | "fuelType"
    | "price"
    | "mileage"
    | "transmission"
  >(null);

  // Search results
  const [cars, setCars] = useState<Car[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flat shipping fee added on top of every Encar price (admin-tunable
  // from /dashboard). The DB stores raw `price_eur` (Encar + markup).
  // We add `shipPrice` only at display time so the value can change at
  // runtime without re-scraping.
  const shipPrice = useShipPrice();

  const models = filters.make ? brandModels[filters.make] ?? [] : [];

  // ---- Helpers to update filter slices ---------------------------------------

  // Changing any filter (other than page/sort itself) resets to page 1.
  // Sort changes also reset the page so users don't land on an empty page.
  const update = useCallback(<K extends keyof CarFilters>(key: K, value: CarFilters[K]) => {
    setFilters((f) => {
      if (key === "page") return { ...f, page: value as number };
      return { ...f, [key]: value, page: 1 };
    });
  }, []);

  const updateMany = useCallback((patch: Partial<CarFilters>) => {
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters(emptyFilters());
  }, []);

  const [searchInput, setSearchInput] = useState(filters.searchQuery);
  useEffect(() => {
    setSearchInput(filters.searchQuery);
  }, [filters.searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (filters.searchQuery !== searchInput) {
        update("searchQuery", searchInput);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, filters.searchQuery, update]);

  // Scroll to top of results when changing pages so users see the new list.
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const setPage = useCallback((p: number) => {
    setFilters((f) => ({ ...f, page: Math.max(1, p) }));
    requestAnimationFrame(() => {
      resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // ---- URL sync (filters -> URL) --------------------------------------------

  useEffect(() => {
    const qs = filtersToSearchParams(filters).toString();
    if (qs === lastSyncedQS.current) return;
    lastSyncedQS.current = qs;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  // ---- Data fetching ---------------------------------------------------------

  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    // The user enters/displays prices including the ship fee, but the
    // DB column doesn't include it — shift the bounds before querying
    // so the filter matches what the user sees.
    const queryFilters: CarFilters = {
      ...filters,
      priceFrom:
        filters.priceFrom != null
          ? Math.max(0, filters.priceFrom - shipPrice)
          : null,
      priceTo:
        filters.priceTo != null
          ? Math.max(0, filters.priceTo - shipPrice)
          : null,
    };

    searchCars(queryFilters, { signal: controller.signal })
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setCars(result.cars);
        setTotal(result.total);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Failed to load cars");
        setCars([]);
        setTotal(0);
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [filters, shipPrice]);

  // ---- Active filter chips ---------------------------------------------------

  type Chip = { key: string; label: string; onRemove: () => void };

  const chips: Chip[] = useMemo(() => {
    const list: Chip[] = [];
    if (filters.make) {
      list.push({
        key: "make",
        label: filters.make,
        onRemove: () => updateMany({ make: "", model: "" }),
      });
    }
    if (filters.model) {
      list.push({
        key: "model",
        label: filters.model,
        onRemove: () => update("model", ""),
      });
    }
    filters.bodyTypes.forEach((bt) => {
      list.push({
        key: `body-${bt}`,
        label: bt,
        onRemove: () =>
          update(
            "bodyTypes",
            filters.bodyTypes.filter((t) => t !== bt)
          ),
      });
    });
    if (filters.registrationFrom != null || filters.registrationTo != null) {
      list.push({
        key: "registration",
        label: `${filters.registrationFrom ?? "…"} – ${filters.registrationTo ?? "…"}`,
        onRemove: () =>
          updateMany({ registrationFrom: null, registrationTo: null }),
      });
    }
    if (filters.fuelType) {
      list.push({
        key: "fuel",
        label: filters.fuelType,
        onRemove: () => update("fuelType", ""),
      });
    }
    if (filters.priceFrom != null || filters.priceTo != null) {
      const from = filters.priceFrom != null ? formatPrice(filters.priceFrom) : "€ 0";
      const to = filters.priceTo != null ? formatPrice(filters.priceTo) : "∞";
      list.push({
        key: "price",
        label: `${from} – ${to}`,
        onRemove: () => updateMany({ priceFrom: null, priceTo: null }),
      });
    }
    if (filters.mileageFrom != null || filters.mileageTo != null) {
      const from = filters.mileageFrom != null ? formatMileage(filters.mileageFrom) : "0 km";
      const to = filters.mileageTo != null ? formatMileage(filters.mileageTo) : "∞";
      list.push({
        key: "mileage",
        label: `${from} – ${to}`,
        onRemove: () => updateMany({ mileageFrom: null, mileageTo: null }),
      });
    }
    if (filters.transmission) {
      list.push({
        key: "transmission",
        label: filters.transmission,
        onRemove: () => update("transmission", ""),
      });
    }
    return list;
  }, [filters, update, updateMany]);

  // ---- Sidebar accordion config ---------------------------------------------

  const filterIsActive = {
    makeModel: Boolean(filters.make || filters.model),
    bodyType: filters.bodyTypes.length > 0,
    registration:
      filters.registrationFrom != null || filters.registrationTo != null,
    fuelType: Boolean(filters.fuelType),
    price: filters.priceFrom != null || filters.priceTo != null,
    mileage: filters.mileageFrom != null || filters.mileageTo != null,
    transmission: Boolean(filters.transmission),
  };

  const sidebarItems: {
    key: keyof typeof filterIsActive;
    label: string;
    modal: NonNullable<typeof openModal>;
    icon: React.ReactNode;
  }[] = [
    {
      key: "makeModel",
      label: t("filter_make_model"),
      modal: "makeModel",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
          <rect x="9" y="11" width="14" height="10" rx="2" ry="2"/>
          <circle cx="12" cy="21" r="0"/>
          <path d="M13 15h2M13 19h2"/>
        </svg>
      ),
    },
    {
      key: "bodyType",
      label: t("filter_body_type"),
      modal: "bodyType",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
    },
    {
      key: "registration",
      label: t("filter_registration"),
      modal: "registration",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },
    {
      key: "fuelType",
      label: t("filter_fuel_type"),
      modal: "fuelType",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 22V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/>
          <path d="M13 8h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4"/>
          <line x1="3" y1="22" x2="21" y2="22"/>
          <line x1="7" y1="6" x2="9" y2="6"/>
        </svg>
      ),
    },
    {
      key: "price",
      label: t("filter_price"),
      modal: "price",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      key: "mileage",
      label: t("filter_mileage"),
      modal: "mileage",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10"/>
          <path d="M12 6v6l4 2"/>
          <circle cx="18" cy="6" r="3"/>
        </svg>
      ),
    },
    {
      key: "transmission",
      label: t("filter_transmission"),
      modal: "transmission",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      ),
    },
  ];

  const anyActive = hasActiveFilters(filters);

  // ---- Render ----------------------------------------------------------------

  return (
    <>
      <Header />

      <div className={styles.carsLayout}>
        {/* SIDEBAR */}
        <aside className={styles.filtersSidebar}>
          <div className={styles.filterHeader}>
            <h2 className={styles.filterTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
              Filters
            </h2>
            <button
              type="button"
              className={styles.clearFilters}
              onClick={clearAll}
              disabled={!anyActive}
              style={{ opacity: anyActive ? 1 : 0.5, cursor: anyActive ? "pointer" : "default" }}
            >
              {t("clear_all")}
            </button>
          </div>

          {sidebarItems.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`${styles.accordionItem} ${filterIsActive[item.key] ? styles.active : ""}`}
              onClick={() => setOpenModal(item.modal)}
            >
              <div className={styles.accordionIconTitle}>
                <span className={styles.accordionIcon}>
                  {item.icon}
                </span>
                {item.label}
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          ))}
        </aside>

        {/* MAIN RESULTS */}
        <main className={styles.mainContent}>
          <div ref={resultsTopRef} />
          <div className={styles.resultsHeader}>
            <div className={styles.resultsCount}>
              {loading ? (
                <strong>{t("loading")}</strong>
              ) : (
                <>
                  <strong>{numberFormatter.format(total)}</strong>{" "}{t("offers_for_search")}
                </>
              )}
            </div>
            <div className={styles.sortWrapper}>
              {t("sort_label")}:{" "}
              <select
                value={filters.sort}
                onChange={(e) => update("sort", e.target.value as SortOption)}
              >
                <option value="best">{t("sort_best")}</option>
                <option value="price_asc">{t("sort_price_asc")}</option>
                <option value="price_desc">{t("sort_price_desc")}</option>
                <option value="newest">{t("sort_newest")}</option>
                <option value="mileage_asc">{t("sort_mileage")}</option>
              </select>
            </div>
          </div>

          <div className={styles.searchChips}>
            {chips.map((chip) => (
              <div key={chip.key} className={styles.chip}>
                {chip.label}
                <span
                  className={styles.chipClose}
                  role="button"
                  aria-label={`Remove ${chip.label}`}
                  onClick={chip.onRemove}
                >
                  ×
                </span>
              </div>
            ))}
            <input
              type="text"
              className={styles.textSearchInput}
              placeholder={t("search_placeholder") ?? "Kërko modele, opsione..."}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {error ? (
            <div className={styles.emptyState}>
              <h3>{t("could_not_load")}</h3>
              <p>{error}</p>
            </div>
          ) : loading ? (
            <div className={styles.emptyState}>
              <p>{t("loading")}</p>
            </div>
          ) : cars.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>{t("no_cars_match")}</h3>
              <p>
                {anyActive ? t("try_widening") : t("no_listings")}
              </p>
              {anyActive && (
                <button type="button" className={styles.resultsButton} onClick={clearAll}>
                  {t("clear_all_filters")}
                </button>
              )}
            </div>
          ) : (
            cars.map((car) => {
              const mileageText = formatMileage(car.mileage_km);
              const powerText = formatPower(car.power_kw, car.power_hp);
              const thumbnail =
                car.image_url || car.images[0] || "/cars/sedan_1x_car.png";
              const detailHref = `/cars/${encodeURIComponent(car.source_id)}`;
              return (
                <article key={car.id} className={styles.horizontalCard}>
                  {/* Full-card click target. */}
                  <Link
                    href={detailHref}
                    className={styles.cardLink}
                    aria-label={`${car.make} ${car.model}`}
                  />
                  <div className={styles.cardImageArea}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnail} alt={`${car.make} ${car.model}`} />
                    {car.photo_count > 0 && (
                      <div className={styles.photoCount}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        {car.photo_count}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h2 className={styles.cardTitle}>
                          {car.make} {car.model}
                        </h2>
                        {car.trim && <div className={styles.cardSubtitle}>{car.trim}</div>}
                      </div>
                    </div>

                    <div className={styles.priceWrapper}>
                      <div className={styles.priceContainer}>
                        <div className={styles.cardPrice}>{formatPrice(applyShipPrice(car.price_eur, shipPrice), t("price_on_request"))}</div>
                        <span className={styles.durresBadge}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '-1px' }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          Deri në Durrës
                        </span>
                      </div>
                      {(car.finance_monthly_eur != null || car.insurance_monthly_eur != null) && (
                        <div className={styles.financeOptions}>
                          {car.finance_monthly_eur != null && (
                            <span>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                              From {car.finance_monthly_eur} € p.m. financing
                            </span>
                          )}
                          {car.insurance_monthly_eur != null && (
                            <span>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                              From {car.insurance_monthly_eur} € p.m. insurance
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={styles.traitsContainer}>
                      <div className={styles.traitBadge}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        {formatRegistration(car.registration_year, car.registration_month)}
                      </div>
                      {mileageText && (
                        <div className={styles.traitBadge}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          {mileageText}
                        </div>
                      )}
                      {car.fuel_type && (
                        <div className={styles.traitBadge}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.22l-5.36 5.36M10.5 13.5l5.36-5.36"></path></svg>
                          {car.fuel_type}
                        </div>
                      )}
                      {powerText && (
                        <div className={styles.traitBadge}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                          {powerText}
                        </div>
                      )}
                    </div>

                  </div>
                </article>
              );
            })
          )}

          {/* ---- Pagination ---- */}
          {!loading && !error && total > filters.pageSize && (
            <Pagination
              currentPage={filters.page}
              totalPages={Math.ceil(total / filters.pageSize)}
              onPageChange={setPage}
            />
          )}
        </main>
      </div>

      <Footer />

      {/* ============================ MODALS ============================ */}

      {openModal === "makeModel" && (
        <FilterModal
          title={t("filter_make_model")}
          onClose={() => setOpenModal(null)}
          onClear={() => updateMany({ make: "", model: "" })}
          total={total}
          loading={loading}
        >
          <div className={styles.formGroup}>
            <label>{t("modal_make")}</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.selectInput}
                value={filters.make}
                onChange={(e) => updateMany({ make: e.target.value, model: "" })}
              >
                <option value="">{t("modal_all")}</option>
                {allBrands.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>{t("modal_model")}</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.selectInput}
                value={filters.model}
                onChange={(e) => update("model", e.target.value)}
                disabled={!filters.make || models.length === 0}
              >
                <option value="">{t("modal_all")}</option>
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
          </div>
        </FilterModal>
      )}

      {openModal === "bodyType" && (
        <FilterModal
          title={t("filter_body_type")}
          onClose={() => setOpenModal(null)}
          onClear={() => update("bodyTypes", [])}
          total={total}
          loading={loading}
        >
          <div className={styles.bodyTypeGridModal}>
            {BODY_TYPES.map((body) => {
              const isChecked = filters.bodyTypes.includes(body.name);
              return (
                <div
                  key={body.name}
                  className={styles.bodyTypeCard}
                  onClick={() =>
                    update(
                      "bodyTypes",
                      isChecked
                        ? filters.bodyTypes.filter((t) => t !== body.name)
                        : [...filters.bodyTypes, body.name]
                    )
                  }
                  style={{ borderColor: isChecked ? "#0d6efd" : "#d1d5db" }}
                >
                  <input
                    type="checkbox"
                    className={styles.bodyTypeCheckbox}
                    checked={isChecked}
                    onChange={() => {
                      /* handled by card click */
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={body.img} alt={body.name} className={styles.bodyTypeImage} />
                  <div className={styles.bodyTypeName}>{body.name}</div>
                </div>
              );
            })}
          </div>
        </FilterModal>
      )}

      {openModal === "registration" && (
        <FilterModal
          title={t("filter_registration")}
          onClose={() => setOpenModal(null)}
          onClear={() => updateMany({ registrationFrom: null, registrationTo: null })}
          total={total}
          loading={loading}
        >
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>{t("modal_from")}</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.selectInput}
                  value={filters.registrationFrom ?? ""}
                  onChange={(e) =>
                    update(
                      "registrationFrom",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">{t("modal_min")}</option>
                  {REGISTRATION_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>{t("modal_to")}</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.selectInput}
                  value={filters.registrationTo ?? ""}
                  onChange={(e) =>
                    update(
                      "registrationTo",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">{t("modal_max")}</option>
                  {REGISTRATION_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
            </div>
          </div>
        </FilterModal>
      )}

      {openModal === "fuelType" && (
        <FilterModal
          title={t("filter_fuel_type")}
          onClose={() => setOpenModal(null)}
          onClear={() => update("fuelType", "")}
          total={total}
          loading={loading}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FUEL_TYPES.map((fuel) => (
              <label
                key={fuel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "#111827",
                }}
              >
                <input
                  type="radio"
                  name="fuelType"
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  checked={filters.fuelType === fuel}
                  onChange={() => update("fuelType", fuel)}
                />
                {fuel}
              </label>
            ))}
          </div>
        </FilterModal>
      )}

      {openModal === "price" && (
        <FilterModal
          title={t("filter_price")}
          onClose={() => setOpenModal(null)}
          onClear={() => updateMany({ priceFrom: null, priceTo: null })}
          total={total}
          loading={loading}
        >
          <div className={styles.formRow}>
            <RangeInput
              label={t("modal_from")}
              suffix="€"
              placeholder="0"
              value={filters.priceFrom}
              onChange={(v) => update("priceFrom", v)}
            />
            <RangeInput
              label={t("modal_up_to")}
              suffix="€"
              placeholder={t("modal_max")}
              value={filters.priceTo}
              onChange={(v) => update("priceTo", v)}
            />
          </div>
        </FilterModal>
      )}

      {openModal === "mileage" && (
        <FilterModal
          title={t("filter_mileage")}
          onClose={() => setOpenModal(null)}
          onClear={() => updateMany({ mileageFrom: null, mileageTo: null })}
          total={total}
          loading={loading}
        >
          <div className={styles.formRow}>
            <RangeInput
              label={t("modal_from")}
              suffix="km"
              placeholder={t("modal_min")}
              value={filters.mileageFrom}
              onChange={(v) => update("mileageFrom", v)}
            />
            <RangeInput
              label={t("modal_to")}
              suffix="km"
              placeholder={t("modal_max")}
              value={filters.mileageTo}
              onChange={(v) => update("mileageTo", v)}
            />
          </div>
        </FilterModal>
      )}

      {openModal === "transmission" && (
        <FilterModal
          title={t("filter_transmission")}
          onClose={() => setOpenModal(null)}
          onClear={() => update("transmission", "")}
          total={total}
          loading={loading}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {TRANSMISSION_TYPES.map((type) => (
              <label
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "#111827",
                }}
              >
                <input
                  type="radio"
                  name="transmission"
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  checked={filters.transmission === type}
                  onChange={() => update("transmission", type)}
                />
                {type}
              </label>
            ))}
          </div>
        </FilterModal>
      )}
    </>
  );
}

// --- Reusable subcomponents ---------------------------------------------------

function FilterModal({
  title,
  children,
  onClose,
  onClear,
  total,
  loading,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onClear: () => void;
  total: number;
  loading: boolean;
}) {
  const { t } = useLanguage();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{title}</div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>{children}</div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.clearButton} onClick={onClear}>
            {t("modal_clear")}
          </button>
          <button type="button" className={styles.resultsButton} onClick={onClose}>
            {loading
              ? t("modal_show_results")
              : `${t("modal_show_results")} (${numberFormatter.format(total)})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function RangeInput({
  label,
  suffix,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  placeholder: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className={styles.formGroup}>
      <label>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          className={styles.textInput}
          placeholder={placeholder}
          value={value ?? ""}
          min={0}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
              return;
            }
            const n = Number(raw);
            onChange(Number.isFinite(n) && n >= 0 ? n : null);
          }}
          style={{ paddingRight: suffix.length > 1 ? "40px" : "32px" }}
        />
        <span
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#6b7280",
            fontSize: suffix.length > 1 ? "13px" : "15px",
            fontWeight: suffix.length > 1 ? 500 : 400,
          }}
        >
          {suffix}
        </span>
      </div>
    </div>
  );
}

/**
 * Computes a compact list of page numbers to render, with `null` entries
 * representing ellipses. Always shows first/last and a window around the
 * current page.
 *
 *   1 2 3 4 5 … 20
 *   1 … 8 9 10 11 12 … 20
 *   1 … 16 17 18 19 20
 */
function buildPageItems(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: (number | null)[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push(null);
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push(null);
  items.push(total);
  return items;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const items = buildPageItems(currentPage, totalPages);
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        type="button"
        className={styles.pageNav}
        onClick={() => canPrev && onPageChange(currentPage - 1)}
        disabled={!canPrev}
        aria-label="Previous page"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      {items.map((item, idx) =>
        item === null ? (
          <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={`${styles.pageNumber} ${item === currentPage ? styles.pageActive : ""}`}
            onClick={() => onPageChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        className={styles.pageNav}
        onClick={() => canNext && onPageChange(currentPage + 1)}
        disabled={!canNext}
        aria-label="Next page"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </nav>
  );
}
