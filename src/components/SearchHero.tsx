"use client";

import { useMemo, useState } from "react";
import styles from "./SearchHero.module.css";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "next/navigation";

import { brandModels, allBrands } from "../utils/carData";
import {
  CarFilters,
  emptyFilters,
  filtersToSearchParams,
  hasActiveFilters,
} from "../lib/cars";

const PRICE_OPTIONS = [5000, 10000, 15000, 20000, 30000, 50000, 100000];
const MILEAGE_OPTIONS = [0, 50000, 100000, 150000, 200000];
const FUEL_OPTIONS = ["Diesel", "Petrol", "Elektrik", "Hibrid"];
const TRANSMISSION_OPTIONS = ["Automatik", "Manual"];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

const numberFormatter = new Intl.NumberFormat("en-US");

export default function SearchHero() {
  const { t } = useLanguage();
  const router = useRouter();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Single filters object — same shape used by /cars page.
  const [filters, setFilters] = useState<CarFilters>(() => emptyFilters());

  const models = filters.make ? brandModels[filters.make] ?? [] : [];
  const anyActive = useMemo(() => hasActiveFilters(filters), [filters]);

  function update<K extends keyof CarFilters>(key: K, value: CarFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function clear() {
    setFilters(emptyFilters());
  }

  function submit() {
    const params = filtersToSearchParams(filters);
    const qs = params.toString();
    router.push(qs ? `/cars?${qs}` : "/cars");
  }

  return (
    <>
      <section className={styles.searchSection}>
        <div className={styles.searchBox}>
          {/* Tabs */}
          <div className={styles.searchTabs}>
            <div className={`${styles.searchTab} ${styles.searchTabActive}`}>
              <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 18h20M6 18l2-6h12l2 6M8 12l1-4h10l1 4" />
                <circle cx="8" cy="20" r="2" />
                <circle cx="20" cy="20" r="2" />
              </svg>
            </div>
          </div>

          <div className={styles.searchBody}>
            <div className={styles.searchTitle}>{t("search_title")}</div>

            <div className={styles.searchRow}>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.selectField}
                  value={filters.make}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, make: e.target.value, model: "" }))
                  }
                >
                  <option value="">{t("make")}</option>
                  {allBrands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>

              <div className={styles.selectWrapper}>
                <select
                  className={styles.selectField}
                  value={filters.model}
                  onChange={(e) => update("model", e.target.value)}
                  disabled={!filters.make || models.length === 0}
                >
                  <option value="">
                    {!filters.make
                      ? t("choose_make_first")
                      : models.length === 0
                      ? t("no_models")
                      : t("model")}
                  </option>
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>

              <div className={styles.selectWrapper}>
                <select
                  className={styles.selectField}
                  value={filters.priceTo ?? ""}
                  onChange={(e) =>
                    update("priceTo", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">{t("price_up_to")}</option>
                  {PRICE_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      €{numberFormatter.format(p)}
                    </option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
            </div>

            <div className={styles.searchRow2}>
              <div className={styles.selectWrapper} style={{ flex: "0 0 200px" }}>
                <select
                  className={styles.selectField}
                  value={filters.registrationFrom ?? ""}
                  onChange={(e) =>
                    update(
                      "registrationFrom",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">{t("year_from")}</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <button
                  type="button"
                  className={styles.searchButton}
                  onClick={submit}
                >
                  {t("search_btn")}
                </button>
                {anyActive && (
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-text-and-icon-muted)",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 500,
                      textDecoration: "underline",
                    }}
                    onClick={clear}
                  >
                    {t("clear_filters")}
                  </button>
                )}
              </div>
            </div>

            <a
              href="#"
              className={styles.refineLink}
              onClick={(e) => {
                e.preventDefault();
                setShowAdvanced(true);
              }}
            >
              {t("detailed_search")}
            </a>
          </div>
        </div>
      </section>

      {/* ===== ADVANCED SEARCH MODAL ===== */}
      <div
        className={styles.modalOverlay}
        style={{ display: showAdvanced ? "flex" : "none" }}
        onClick={() => setShowAdvanced(false)}
      >
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Kërkimi i Detajuar</h2>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setShowAdvanced(false)}
            >
              &times;
            </button>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.selectWrapper}>
              <select
                className={styles.selectField}
                value={filters.mileageFrom ?? ""}
                onChange={(e) =>
                  update("mileageFrom", e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Kilometrazhi nga</option>
                {MILEAGE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {numberFormatter.format(m)} km
                  </option>
                ))}
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
            <div className={styles.selectWrapper}>
              <select
                className={styles.selectField}
                value={filters.mileageTo ?? ""}
                onChange={(e) =>
                  update("mileageTo", e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Kilometrazhi deri në</option>
                {MILEAGE_OPTIONS.filter((m) => m > 0).map((m) => (
                  <option key={m} value={m}>
                    {numberFormatter.format(m)} km
                  </option>
                ))}
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.selectWrapper}>
              <select
                className={styles.selectField}
                value={filters.fuelType}
                onChange={(e) => update("fuelType", e.target.value)}
              >
                <option value="">Karburanti</option>
                {FUEL_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
            <div className={styles.selectWrapper}>
              <select
                className={styles.selectField}
                value={filters.transmission}
                onChange={(e) => update("transmission", e.target.value)}
              >
                <option value="">Transmisioni</option>
                {TRANSMISSION_OPTIONS.map((tr) => (
                  <option key={tr} value={tr}>
                    {tr}
                  </option>
                ))}
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              display: "flex",
              gap: "16px",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            {anyActive && (
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-and-icon-muted)",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "underline",
                }}
                onClick={clear}
              >
                Pastro Filtrat
              </button>
            )}
            <button
              type="button"
              className={styles.searchButton}
              style={{ flex: "none", marginLeft: "0" }}
              onClick={() => {
                setShowAdvanced(false);
                submit();
              }}
            >
              Aplikoni Filtrat
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
