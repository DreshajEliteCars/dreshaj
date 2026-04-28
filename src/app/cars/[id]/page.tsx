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
import { getOptionMeta } from "../../../lib/carOptions";
import OptionIcon from "../../../components/OptionIcon";
import InspectionSection from "./InspectionSection";
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

  // Scroll active thumbnail into view
  const thumbStripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const strip = thumbStripRef.current;
    if (!strip) return;
    const target = strip.querySelector<HTMLElement>(
      `[data-thumb-index="${activeIndex}"]`
    );
    target?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [activeIndex]);

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
  const priceText = formatPrice(car.price_eur, t("price_on_request"));
  const mainImage = images[activeIndex] ?? car.image_url;

  return (
    <>
      <Header />

      <div className={styles.detailLayout}>
        <BackLink t={t} router={router} />

        <div className={styles.contentGrid}>
          {/* ---------- Left column: gallery + specs ---------- */}
          <div className={styles.leftColumn}>
            <div className={styles.gallery}>
              {mainImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={mainImage}
                  alt={`${car.make} ${car.model}`}
                  className={styles.mainImage}
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

            {images.length > 1 && (
              <div className={styles.thumbStrip} ref={thumbStripRef}>
                {images.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    data-thumb-index={i}
                    className={`${styles.thumb} ${i === activeIndex ? styles.thumbActive : ""}`}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Photo ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}

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
          </div>

          {/* ---------- Right column: sidebar ---------- */}
          <aside className={styles.rightColumn}>
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
            </div>

            <div className={styles.ctaRow}>
              <a
                href="https://wa.me/37744202673"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.ctaBtn} ${styles.ctaWhatsapp}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l.36.572-1.001 3.66 3.749-.983.871.526zm6.586-5.396c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                {t("cta_whatsapp")}
              </a>
              <Link
                href={`/garancioni?from=${encodeURIComponent(id)}`}
                className={`${styles.ctaBtn} ${styles.ctaPrimary}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                {t("cta_warranty")}
              </Link>
            </div>

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
