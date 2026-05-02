"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../context/LanguageContext";
import {
  InspectionReport,
  InspectionStatus,
} from "../../../lib/inspection";
import DetailedInspection from "./DetailedInspection";
import styles from "./page.module.css";

const CAR_SILHOUETTE_URL = "https://www.encar.com/images/pop/check/img_inspection01.gif";

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
        <div className={styles.inspDiagram}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CAR_SILHOUETTE_URL}
            alt="Inspection diagram"
            loading="lazy"
          />
          {report.panels.length > 0 && (
            <div className={styles.inspDiagramOverlay}>
              <span className={styles.inspDiagramBadge}>
                {report.panels.length} {report.panels.length === 1 ? "issue" : "issues"}
              </span>
            </div>
          )}
        </div>

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
