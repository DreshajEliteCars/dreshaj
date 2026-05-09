"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../context/LanguageContext";
import {
  InspectionReport,
  InspectionStatus,
  PanelMarkerCode,
  PanelObservation,
} from "../../../lib/inspection";
import { translate } from "../../../lib/translate";
import DetailedInspection from "./DetailedInspection";
import styles from "./page.module.css";

/**
 * Resolve the best display title for a panel in the active language.
 *
 * `panel.titleKo` is the original Korean from Encar — preferring it
 * means the dictionary in `lib/translate.ts` controls the output, so
 * (a) toggling between sq/en re-translates without a refetch, and
 * (b) any new dictionary entries take effect immediately for already-
 * cached cars without bumping the schema version. Falls back to the
 * server-translated `title`, then to the panel code so we never show
 * a blank label.
 */
function panelTitle(p: PanelObservation, lang: "sq" | "en"): string {
  if (p.titleKo) return translate(p.titleKo, lang);
  if (p.title) return p.title;
  return p.code;
}

// Encar's two stock silhouettes — the body view (top-down) and the
// frame view (under-chassis). We swap between them with the page-dot
// switcher just like Encar does.
const SILHOUETTE_BODY =
  "https://www.encar.com/images/pop/check/img_inspection01.gif";
const SILHOUETTE_FRAME =
  "https://www.encar.com/images/pop/check/img_inspection02.gif";

type DiagramView = "body" | "frame";

const MARKER_COLORS: Record<PanelMarkerCode, string> = {
  X: "#e53935", // exchange — red
  W: "#1e88e5", // sheet metal/welding — blue
  C: "#fb8c00", // corrosion — orange
  A: "#fdd835", // scratches — yellow
  U: "#43a047", // uneven surface — green
  T: "#5e35b1", // impairment — purple
};

// Order of legend entries matches Encar's footer.
const LEGEND_ORDER: PanelMarkerCode[] = ["X", "W", "C", "A", "U", "T"];

const MARKER_LABEL_KEY: Record<PanelMarkerCode, string> = {
  X: "insp_marker_X",
  W: "insp_marker_W",
  C: "insp_marker_C",
  A: "insp_marker_A",
  U: "insp_marker_U",
  T: "insp_marker_T",
};

const STATUS_TO_KEY: Record<InspectionStatus, string> = {
  good: "insp_status_good",
  adequate: "insp_status_adequate",
  minor: "insp_status_minor",
  leak: "insp_status_leak",
  insufficient: "insp_status_insufficient",
  excessive: "insp_status_excessive",
  bad: "insp_status_bad",
  present: "insp_status_present",
  unknown: "insp_status_unknown",
};

const STATUS_TO_TONE: Record<InspectionStatus, "ok" | "warn" | "bad" | "muted"> = {
  good: "ok",
  adequate: "ok",
  unknown: "muted",
  minor: "warn",
  insufficient: "warn",
  excessive: "warn",
  present: "warn",
  leak: "bad",
  bad: "bad",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

function YesNo({ value, t }: { value: boolean | null; t: (k: string) => string }) {
  if (value === null) return <span className={styles.inspMuted}>—</span>;
  return (
    <span className={value ? styles.inspBadgeYes : styles.inspBadgeNo}>
      {value ? t("insp_yes") : t("insp_no")}
    </span>
  );
}

export default function InspectionSection({ carId }: { carId: string }) {
  const { t } = useLanguage();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; report: InspectionReport }
    | { kind: "missing" }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });

    fetch(`/api/cars/${encodeURIComponent(carId)}/inspection`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setState({ kind: "missing" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error", message: `HTTP ${res.status}` });
          return;
        }
        const body = (await res.json()) as { inspection: InspectionReport | null };
        if (cancelled) return;
        if (!body.inspection) setState({ kind: "missing" });
        else setState({ kind: "ready", report: body.inspection });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [carId]);

  return (
    <section className={styles.inspectionCard}>
      <div className={styles.optionsHeader}>
        <h2 className={styles.optionsTitle}>{t("inspection_report")}</h2>
      </div>

      {state.kind === "loading" && (
        <div className={styles.inspLoading}>{t("inspection_loading")}</div>
      )}

      {state.kind === "missing" && (
        <div className={styles.inspLoading}>{t("inspection_unavailable")}</div>
      )}

      {state.kind === "error" && (
        <div className={styles.inspLoading}>
          {t("inspection_unavailable")} ({state.message})
        </div>
      )}

      {state.kind === "ready" && (
        <ReportBody report={state.report} t={t} />
      )}
    </section>
  );
}

function ReportBody({
  report,
  t,
}: {
  report: InspectionReport;
  t: (key: string) => string;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: t("insp_inspected_at"),
      value: formatDate(report.inspectedAt),
    },
    {
      label: t("insp_accident"),
      value: <YesNo value={report.accident} t={t} />,
    },
    {
      label: t("insp_simple_repair"),
      value: <YesNo value={report.simpleRepair} t={t} />,
    },
    {
      label: t("insp_warranty_engine"),
      value: <YesNo value={report.warrantyEngine} t={t} />,
    },
    {
      label: t("insp_warranty_trans"),
      value: <YesNo value={report.warrantyTransmission} t={t} />,
    },
  ];

  const mechanicalRows: { label: string; status: InspectionStatus }[] = [
    { label: t("insp_engine"), status: report.mechanical.engine },
    { label: t("insp_transmission"), status: report.mechanical.transmission },
    { label: t("insp_drivetrain"), status: report.mechanical.drivetrain },
    { label: t("insp_steering"), status: report.mechanical.steering },
    { label: t("insp_brakes"), status: report.mechanical.brakes },
    { label: t("insp_electrical"), status: report.mechanical.electrical },
    { label: t("insp_fuel"), status: report.mechanical.fuel },
  ];

  return (
    <>
      {/* Silhouette diagram + summary facts */}
      <div className={styles.inspTopGrid}>
        <DiagramPanel panels={report.panels} t={t} />

        <dl className={styles.inspFactList}>
          {facts.map(({ label, value }) => (
            <div key={label} className={styles.inspFactRow}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Mechanical inspection grid */}
      <h3 className={styles.inspSubheading}>{t("inspection_mechanical")}</h3>
      <div className={styles.inspMechGrid}>
        {mechanicalRows.map(({ label, status }) => {
          const tone = STATUS_TO_TONE[status];
          return (
            <div key={label} className={`${styles.inspMechItem} ${styles[`inspTone_${tone}`]}`}>
              <div className={styles.inspMechLabel}>{label}</div>
              <div className={styles.inspMechStatus}>{t(STATUS_TO_KEY[status])}</div>
            </div>
          );
        })}
      </div>

      {/* Defensive: a row cached under an older schema version (before
          sections existed) may arrive without this field. Treat missing
          as "no detail available" instead of crashing the page. */}
      {(report.sections?.length ?? 0) > 0 && (
        <div className={styles.inspViewMoreRow}>
          <button
            type="button"
            className={styles.inspViewMore}
            onClick={() => setShowDetail(true)}
          >
            {t("insp_view_more")}
          </button>
        </div>
      )}

      {showDetail && (
        <DetailedInspection
          sections={report.sections ?? []}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}

/**
 * Diagram with switcher between body / frame views.
 *
 * Renders the silhouette image and overlays one circular marker per
 * `PanelObservation.position` (codes for which we have coordinates).
 * Codes without coordinates still appear in the issue list below the
 * diagram so the user never loses information.
 */
function DiagramPanel({
  panels,
  t,
}: {
  panels: PanelObservation[];
  t: (key: string) => string;
}) {
  const { language } = useLanguage();
  // Group by view so we know which page dots are useful and so we can
  // build the unmapped-list per view.
  //
  // We also coerce stale-cache panels (cached under v3 before `markers`
  // existed) into the new shape so the UI never has to special-case
  // missing fields. The API route serves stale data on Encar errors.
  const { bodyPanels, framePanels } = useMemo(() => {
    const body: PanelObservation[] = [];
    const frame: PanelObservation[] = [];
    for (const raw of panels) {
      const p: PanelObservation = {
        ...raw,
        markers: Array.isArray(raw.markers) ? raw.markers : [],
        view: raw.view === "frame" ? "frame" : "body",
        position: raw.position ?? null,
      };
      if (p.view === "frame") frame.push(p);
      else body.push(p);
    }
    return { bodyPanels: body, framePanels: frame };
  }, [panels]);

  // Default to whichever view has issues (so the user lands on
  // something useful). Body view is the fallback when there are none.
  const initialView: DiagramView =
    bodyPanels.length === 0 && framePanels.length > 0 ? "frame" : "body";
  const [view, setView] = useState<DiagramView>(initialView);

  // Pick the right silhouette + panel slice for the active view.
  const activePanels = view === "body" ? bodyPanels : framePanels;
  const silhouette = view === "body" ? SILHOUETTE_BODY : SILHOUETTE_FRAME;

  // Codes we don't have coordinates for end up in this list — they
  // still show up so the user sees every issue, just not on the diagram.
  const unmapped = activePanels.filter((p) => !p.position);

  // Which marker letters appear in the legend depends on what's
  // actually on this view; we keep them in the canonical X/W/C/A/U/T
  // order so the row matches Encar's footer.
  const legendCodes = LEGEND_ORDER.filter((code) =>
    activePanels.some((p) => p.markers.includes(code))
  );

  return (
    <div className={styles.inspDiagramWrap}>
      <div className={styles.inspDiagram}>
        {/* The image-bound frame: markers and page-dot pager live
            inside it so their coordinates always map to the silhouette
            regardless of container padding. */}
        <div className={styles.inspDiagramFrame}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={silhouette} alt="Inspection diagram" loading="lazy" />

          {/* Markers — one per panel that has a known position. */}
          {activePanels.map((panel) =>
            panel.position ? (
              <PanelMarker
                key={`${panel.code}-${panel.markers.join("")}`}
                panel={panel}
                language={language}
                t={t}
              />
            ) : null
          )}

          {/* Page dots — only show when there's content in both views. */}
          {bodyPanels.length > 0 && framePanels.length > 0 ? (
            <div className={styles.inspDiagramPager}>
              <button
                type="button"
                aria-label={t("insp_view_body")}
                className={`${styles.inspDiagramDot} ${
                  view === "body" ? styles.inspDiagramDotActive : ""
                }`}
                onClick={() => setView("body")}
              />
              <button
                type="button"
                aria-label={t("insp_view_frame")}
                className={`${styles.inspDiagramDot} ${
                  view === "frame" ? styles.inspDiagramDotActive : ""
                }`}
                onClick={() => setView("frame")}
              />
            </div>
          ) : null}
        </div>

        {/* Arrow toggle — outside the frame so it sits over the
            container padding without obscuring the silhouette. */}
        <button
          type="button"
          className={`${styles.inspDiagramArrow} ${styles.inspDiagramArrowPrev}`}
          aria-label={t(view === "body" ? "insp_view_frame" : "insp_view_body")}
          onClick={() => setView(view === "body" ? "frame" : "body")}
        >
          ‹
        </button>
        <button
          type="button"
          className={`${styles.inspDiagramArrow} ${styles.inspDiagramArrowNext}`}
          aria-label={t(view === "body" ? "insp_view_frame" : "insp_view_body")}
          onClick={() => setView(view === "body" ? "frame" : "body")}
        >
          ›
        </button>
      </div>

      {/* Active-view label — small caption underneath. */}
      <div className={styles.inspDiagramCaption}>
        {t(view === "body" ? "insp_view_body" : "insp_view_frame")}
      </div>

      {/* Legend — only the marker codes actually present on this view. */}
      {legendCodes.length > 0 && (
        <ul className={styles.inspLegend}>
          {legendCodes.map((code) => (
            <li key={code} className={styles.inspLegendItem}>
              <span
                className={styles.inspLegendDot}
                style={{ background: MARKER_COLORS[code] }}
                aria-hidden="true"
              >
                {code}
              </span>
              <span className={styles.inspLegendLabel}>
                {t(MARKER_LABEL_KEY[code])}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Unmapped issues — codes we don't have coordinates for. */}
      {unmapped.length > 0 && (
        <ul className={styles.inspUnmappedList}>
          {unmapped.map((p) => (
            <li key={p.code} className={styles.inspUnmappedItem}>
              <span className={styles.inspUnmappedMarkers}>
                {p.markers.map((m) => (
                  <span
                    key={m}
                    className={styles.inspMarkerInline}
                    style={{ background: MARKER_COLORS[m] }}
                    title={t(MARKER_LABEL_KEY[m])}
                  >
                    {m}
                  </span>
                ))}
              </span>
              <span className={styles.inspUnmappedTitle}>
                {panelTitle(p, language)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One panel marker positioned over the silhouette. Renders one
 * coloured letter chip per status code on this panel — Encar shows
 * them stacked when a panel has multiple flags (e.g. exchange + weld).
 */
function PanelMarker({
  panel,
  language,
  t,
}: {
  panel: PanelObservation;
  language: "sq" | "en";
  t: (key: string) => string;
}) {
  if (!panel.position) return null;
  const tooltip = [
    panelTitle(panel, language),
    panel.markers.map((m) => t(MARKER_LABEL_KEY[m])).join(", "),
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <span
      className={styles.inspMarkerStack}
      style={{ left: `${panel.position.x}%`, top: `${panel.position.y}%` }}
      title={tooltip}
    >
      {panel.markers.map((m) => (
        <span
          key={m}
          className={styles.inspMarker}
          style={{ background: MARKER_COLORS[m] }}
        >
          {m}
        </span>
      ))}
    </span>
  );
}
