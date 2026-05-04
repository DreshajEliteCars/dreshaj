"use client";

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { useLanguage } from "../../../context/LanguageContext";
import { Car, getCar } from "../../../lib/cars";
import { applyShipPrice } from "../../../lib/appSettings";
import { useShipPrice } from "../../../lib/useShipPrice";
import { getOptionMeta } from "../../../lib/carOptions";
import OptionIcon from "../../../components/OptionIcon";
import InspectionSection from "./InspectionSection";
import VehicleCondition from "./VehicleCondition";
import AccidentHistory from "./AccidentHistory";
import styles from "./page.module.css";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatPrice(eur: number | null, fallback: string): string {
  if (eur == null) return fallback;
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

// Next.js 15+ wraps params in a Promise; React.use() unwraps it.
type RouteParams = Promise<{ id: string }>;

export default function CarDetailPage({ params }: { params: RouteParams }) {
  const { id } = use(params);
  return <CarDetailInner id={id} />;
}

function CarDetailInner({ id }: { id: string }) {
  const { t } = useLanguage();
  const router = useRouter();

  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flat shipping fee added on top of the Encar price; admin-tunable
  // from /dashboard. The DB stores the raw price, we add ship at render
  // time so a value change propagates without re-scraping.
  const shipPrice = useShipPrice();

  // Gallery state
  const [activeIndex, setActiveIndex] = useState(0);

  // Transient "Link copied!" toast for the Share action.
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveIndex(0);
    getCar(id)
      .then((result) => {
        if (cancelled) return;
        setCar(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const images = useMemo(() => car?.images?.length ? car.images : [], [car]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + images.length) % Math.max(images.length, 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % Math.max(images.length, 1));
  }, [images.length]);

  // Keyboard arrows for the gallery
  useEffect(() => {
    if (!images.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, images.length]);

  // Preload every gallery image into the HTTP cache as soon as we know
  // the car's photo list. We render the images stacked in the DOM
  // below (only the active one is visible), but `new Image()` is a
  // belt-and-braces measure: even if the browser decides not to keep a
  // hidden <img>'s bitmap decoded, the bytes will still be in cache, so
  // the next/prev swap stays instant instead of triggering a fresh
  // network round-trip on first visit.
  useEffect(() => {
    if (!images.length) return;
    const preloaders: HTMLImageElement[] = [];
    for (const src of images) {
      const img = new Image();
      img.src = src;
      // decode() forces the browser to fully decode the bitmap. We
      // ignore the promise — failures (CORS, aborted nav, etc.) just
      // fall back to the regular load path on the visible <img>.
      if (typeof img.decode === "function") img.decode().catch(() => {});
      preloaders.push(img);
    }
    return () => {
      // Drop refs so GC can reclaim if the user navigates away mid-load.
      preloaders.length = 0;
    };
  }, [images]);


  /**
   * Copy the current car URL to the clipboard and flash a toast.
   * Falls back to a hidden <textarea> + execCommand on browsers that
   * still don't expose `navigator.clipboard` (Safari < 13.1, old
   * Android WebView, http://localhost over IP, etc.).
   */
  const onShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        copied = true;
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch {
      copied = false;
    }
    if (copied) {
      setToast(t("link_copied"));
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 2000);
    }
  }, [t]);

  // ---- render -------------------------------------------------------------

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.detailLayout}>
          <BackLink t={t} router={router} />
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonImage} />
            <div className={styles.skeletonText} />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !car) {
    return (
      <>
        <Header />
        <div className={styles.detailLayout}>
          <BackLink t={t} router={router} />
          <div className={styles.notFound}>
            <h1>{t("not_found_title")}</h1>
            <p>{error ?? t("not_found_body")}</p>
            <Link href="/cars" className={styles.notFoundCta}>
              {t("back_to_listings")} →
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const mileageText = formatMileage(car.mileage_km);
  const registrationText = formatRegistration(
    car.registration_year,
    car.registration_month
  );
  const priceText = formatPrice(applyShipPrice(car.price_eur, shipPrice), t("price_on_request"));
  // Fallback for cars whose `images[]` is empty but that still have an
  // `image_url` (older rows scraped before the gallery enrichment).
  const fallbackImage = images.length === 0 ? car.image_url : null;

  const sidebarContent = (
    <>
      <div className={styles.actionRow}>
        <a
          href={`/api/cars/${encodeURIComponent(car.source_id)}/og?photo=${activeIndex}`}
          download={`${`${car.make}-${car.model}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")}.png`}
          className={styles.actionBtn}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{t("download_card")}</span>
        </a>
        <button type="button" className={styles.actionBtn} onClick={onShare}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>{t("share")}</span>
        </button>
        <a
          href={`https://fem.encar.com/cars/detail/${encodeURIComponent(car.source_id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.actionBtn}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span>{t("view_on_encar")}</span>
        </a>
      </div>

      <h1 className={styles.title}>
        {car.make} {car.model}
      </h1>
      {car.trim && <div className={styles.subtitle}>{car.trim}</div>}

      <hr className={styles.divider} />

      <div className={styles.priceBlock}>
        <div className={styles.price}>{priceText}</div>
        <span className={styles.durresBadge}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '-1px' }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          Deri në Durrës
        </span>
      </div>

      <div className={styles.ctaRow}>
        <a
          href="https://wa.me/37744202673"
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.ctaBtn} ${styles.ctaWhatsapp}`}
          style={{ color: "#fff", fontSize: "15px", lineHeight: "1.4", fontFamily: "inherit" }}
        >
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
          </svg>
          <span>{t("cta_whatsapp")}</span>
        </a>
        <a
          href="https://www.instagram.com/dreshajelitecars"
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.ctaBtn} ${styles.ctaInstagram}`}
          style={{ color: "#fff", fontSize: "15px", lineHeight: "1.4", fontFamily: "inherit" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          <span>{t("cta_instagram")}</span>
        </a>
        <Link
          href={`/garancioni?from=${encodeURIComponent(id)}`}
          className={`${styles.ctaBtn} ${styles.ctaPrimary}`}
          style={{ color: "#fff", fontSize: "15px", lineHeight: "1.4", fontFamily: "inherit" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span>{t("cta_warranty")}</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      <Header />

      <div className={styles.detailLayout}>
        <BackLink t={t} router={router} />

        <div className={styles.contentGrid}>
          {/* ---------- Left column: gallery + specs ---------- */}
          <div className={styles.leftColumn}>
            <div className={styles.gallery}>
              {images.length > 0 ? (
                // Stack every photo absolutely; only the active one is
                // visible (opacity 1). Keeping all <img> elements in
                // the DOM means the browser holds onto each decoded
                // bitmap, so flipping `activeIndex` is a free CSS
                // class swap — no network, no decode, no jank. The
                // current image gets fetchpriority="high" so it still
                // appears first on initial paint; the rest fill in
                // behind with low priority so they don't steal
                // bandwidth from above-the-fold content.
                images.map((src, i) => {
                  const isActive = i === activeIndex;
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={src}
                      src={src}
                      alt={`${car.make} ${car.model} ${i + 1}`}
                      className={`${styles.mainImage} ${isActive ? styles.mainImageActive : ""}`}
                      loading="eager"
                      decoding="async"
                      // `fetchPriority` is camelCase in React 19+; cast
                      // for older type defs that don't know it yet.
                      {...({ fetchPriority: isActive ? "high" : "low" } as Record<string, string>)}
                      draggable={false}
                      aria-hidden={!isActive}
                    />
                  );
                })
              ) : fallbackImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={fallbackImage}
                  alt={`${car.make} ${car.model}`}
                  className={`${styles.mainImage} ${styles.mainImageActive}`}
                />
              ) : (
                <div className={styles.noImage}>—</div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
                    onClick={goPrev}
                    aria-label={t("prev_image")}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`${styles.galleryNav} ${styles.galleryNavNext}`}
                    onClick={goNext}
                    aria-label={t("next_image")}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <div className={styles.photoCounter}>
                    {activeIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            <div className={styles.mobileHeader}>
              {sidebarContent}
            </div>


            <div className={styles.specsCard}>
              <Spec
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
                label={t("spec_mileage")}
                value={mileageText ?? "—"}
              />
              <Spec
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4v16M18 4v16M6 12h12M9 8h.01M9 16h.01M15 8h.01M15 16h.01" />
                  </svg>
                }
                label={t("spec_gearbox")}
                value={car.transmission ?? "—"}
              />
              <Spec
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                }
                label={t("spec_first_registration")}
                value={registrationText}
              />
              <Spec
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.22l-5.36 5.36M10.5 13.5l5.36-5.36" />
                  </svg>
                }
                label={t("spec_fuel_type")}
                value={car.fuel_type ?? "—"}
              />
            </div>

            {car.options.length > 0 && <MajorOptions options={car.options} />}

            <InspectionSection carId={car.id} />

            <VehicleCondition carId={car.id} sourceId={car.source_id} />

            <AccidentHistory carId={car.id} />
          </div>

          {/* ---------- Right column: sidebar ---------- */}
          <aside className={styles.rightColumn}>
            {sidebarContent}
          </aside>
        </div>
      </div>

      <Footer />

      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  );
}

function BackLink({
  t,
  router,
}: {
  t: (key: string) => string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <button
      type="button"
      className={styles.backLink}
      onClick={() => router.back()}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {t("back")}
    </button>
  );
}

function Spec({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.spec}>
      <div className={styles.specIcon}>{icon}</div>
      <div className={styles.specBody}>
        <div className={styles.specLabel}>{label}</div>
        <div className={styles.specValue}>{value}</div>
      </div>
    </div>
  );
}

const VISIBLE_OPTION_COUNT = 10;

function MajorOptions({ options }: { options: string[] }) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  // Resolve codes; ones we know go first (richer display), unknown ones
  // get a generic icon and an "Option XXX" label.
  const resolved = useMemo(() => {
    return options.map((code) => {
      const meta = getOptionMeta(code);
      return {
        code,
        label: meta ? meta[language] : `Option ${code}`,
        iconName: meta?.icon ?? "settings",
        known: !!meta,
      };
    });
  }, [options, language]);

  // Show known options first so the visible 10 are the most useful.
  const sorted = useMemo(
    () =>
      [...resolved].sort((a, b) => {
        if (a.known === b.known) return 0;
        return a.known ? -1 : 1;
      }),
    [resolved]
  );

  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_OPTION_COUNT);
  const canExpand = sorted.length > VISIBLE_OPTION_COUNT;

  return (
    <section className={styles.optionsCard}>
      <div className={styles.optionsHeader}>
        <h2 className={styles.optionsTitle}>{t("major_options")}</h2>
      </div>

      <div className={styles.optionsGrid}>
        {visible.map((opt) => (
          <div key={opt.code} className={styles.optionItem} title={opt.label}>
            <OptionIcon
              name={opt.iconName as Parameters<typeof OptionIcon>[0]["name"]}
            />
            <div className={styles.optionLabel}>{opt.label}</div>
          </div>
        ))}
      </div>

      {canExpand && (
        <button
          type="button"
          className={styles.optionsToggle}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? t("hide_all_options")
            : `${t("view_all_options_prefix")} ${sorted.length} ${t("view_all_options_suffix")}`}
        </button>
      )}
    </section>
  );
}
