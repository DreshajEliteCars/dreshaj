"use client";

import { useEffect, useMemo } from "react";
import { useLanguage } from "../../../context/LanguageContext";
import {
  InspectionNode,
  InspectionSection,
  InspectionStatus,
} from "../../../lib/inspection";
import { translate } from "../../../lib/translate";
import styles from "./page.module.css";

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

/**
 * Walks the inspection tree and produces flat rows. Each leaf becomes
 * one row; the table renders 3 columns: section / item path / status.
 *
 * For nested children (e.g. "Oil leak" → ["Cylinder cover", "Cylinder
 * head", …]) we join the parent path with " · " so the table stays a
 * simple flat structure (much easier to read on mobile).
 *
 * Re-translates from `titleKo` at render time so the language toggle
 * updates the modal contents — the cached `title` field is always in
 * English (server-side normalization) and ignored here.
 */
type Row = {
  section: string;
  item: string;
  status: InspectionStatus;
};

function localTitle(node: { titleKo: string | null; title: string }, lang: "sq" | "en"): string {
  if (node.titleKo) return translate(node.titleKo, lang);
  return node.title;
}

function flattenSection(section: InspectionSection, lang: "sq" | "en"): Row[] {
  const rows: Row[] = [];
  const sectionTitle = localTitle(section, lang);
  function walk(node: InspectionNode, parentPath: string[]) {
    const path = [...parentPath, localTitle(node, lang)];
    if (node.children.length === 0) {
      // Skip leaves the inspector left blank — these come back with
      // statusType=null (rendered as "—") and just clutter the table.
      // The data is preserved in the cache, so a different car that
      // does have e.g. its M/T sub-items filled in will still show them.
      if (node.status === "unknown") return;
      rows.push({
        section: sectionTitle,
        item: path.join(" · "),
        status: node.status,
      });
      return;
    }
    for (const c of node.children) walk(c, path);
  }
  for (const item of section.items) walk(item, []);
  return rows;
}

export default function DetailedInspection({
  sections,
  onClose,
}: {
  sections: InspectionSection[];
  onClose: () => void;
}) {
  const { t, language } = useLanguage();

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const rows = useMemo(
    () => sections.flatMap((s) => flattenSection(s, language)),
    [sections, language]
  );

  return (
    <div
      className={styles.inspModalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("insp_detailed_title")}
    >
      <div
        className={styles.inspModalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.inspModalHeader}>
          <h2 className={styles.inspModalTitle}>{t("insp_detailed_title")}</h2>
          <button
            type="button"
            className={styles.inspModalClose}
            onClick={onClose}
            aria-label={t("insp_close")}
          >
            ×
          </button>
        </div>

        <div className={styles.inspModalBody}>
          <table className={styles.inspTable}>
            <thead>
              <tr>
                <th>{t("insp_table_section")}</th>
                <th>{t("insp_table_item")}</th>
                <th>{t("insp_table_status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const prevSection = i > 0 ? rows[i - 1].section : null;
                const showSection = r.section !== prevSection;
                const tone = STATUS_TO_TONE[r.status];
                return (
                  <tr key={i} className={styles[`inspRowTone_${tone}`]}>
                    <td className={styles.inspTableSectionCell}>
                      {showSection ? r.section : ""}
                    </td>
                    <td>{r.item}</td>
                    <td>
                      <span className={styles[`inspBadge_${tone}`]}>
                        {t(STATUS_TO_KEY[r.status])}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.inspTableEmpty}>
                    {t("inspection_unavailable")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
