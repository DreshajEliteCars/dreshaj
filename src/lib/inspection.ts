/**
 * Normalized vehicle inspection report.
 *
 * Encar's `/v1/readside/inspection/vehicle/{id}` endpoint returns a
 * deeply-nested Korean tree (~16KB raw JSON). We flatten it into a
 * compact structure that the detail page can render directly. Only the
 * fields the UI actually uses are kept; everything else is dropped.
 *
 * Status codes are mapped to a small enum so the UI doesn't ship Korean
 * strings. Free-form text fields (inspector name, notes, panel titles)
 * are run through `translate()` so the cached blob never contains
 * Hangul — anything not in the dictionary falls back to transliteration.
 */

import { translate } from "./translate";
import { PanelStatusKey, panelStatusFromKorean } from "./translate";

export type InspectionStatus =
  | "good"          // 양호 / 적정 / 없음 — passed
  | "adequate"      // 적정 — adequate level (oil/coolant)
  | "minor"         // 미세누유 / 미세누수 — minor seepage
  | "leak"          // 누유 / 누수 — leak
  | "insufficient"  // 부족
  | "excessive"     // 과다
  | "bad"           // 불량 — faulty
  | "present"       // 있음
  | "unknown";

/** A single body-panel observation. */
export type PanelObservation = {
  /** Panel code (e.g. "P01") or human title if no code is available. */
  code: string;
  /** Translated title (EN, transliterated as fallback). Display this. */
  title: string | null;
  /** Original Korean title from Encar — kept for debugging only. */
  titleKo: string | null;
  /** Stable enum key — UI uses t(`insp_panel_${statusKey}`). */
  statusKey: PanelStatusKey;
  /** Original Korean status text — kept for debugging only. */
  statusKo: string | null;
};

/** Bumped whenever the InspectionReport shape changes. The API route
 * uses this to invalidate cached rows from older versions. */
export const INSPECTION_REPORT_VERSION = 3;

/** A node in the inspection tree (e.g. "Cylinder cover" under "Engine"). */
export type InspectionNode = {
  /** Encar internal code, e.g. "S01", "s004", "s0102". */
  code: string;
  /** Translated label (EN, transliterated fallback). Display this. */
  title: string;
  titleKo: string | null;
  /** Status enum, or "unknown" if no statusType returned. */
  status: InspectionStatus;
  statusKo: string | null;
  children: InspectionNode[];
};

/** A top-level section (e.g. "Engine", "Transmission"). */
export type InspectionSection = {
  code: string;
  title: string;
  titleKo: string | null;
  /** Worst status across all leaves under this section. */
  status: InspectionStatus;
  items: InspectionNode[];
};

/** Top-level normalized inspection. */
export type InspectionReport = {
  /** Schema version — see INSPECTION_REPORT_VERSION. */
  version: number;
  inspectedAt: string | null;
  inspector: string | null;
  recordNo: string | null;
  vin: string | null;

  /** Has an accident in its history (per the inspector). */
  accident: boolean | null;
  /** Has only simple repairs (paint/dent), no structural. */
  simpleRepair: boolean | null;
  /** Engine/transmission warranty status. */
  warrantyEngine: boolean | null;
  warrantyTransmission: boolean | null;
  /** True if recorded mileage matches the displayed odometer. */
  mileageMatch: boolean | null;
  mileageRecorded: number | null;
  colorTitle: string | null;
  transmissionTitle: string | null;

  /** Whole-section summaries (engine, transmission, brakes, …). */
  mechanical: {
    engine: InspectionStatus;
    transmission: InspectionStatus;
    drivetrain: InspectionStatus;
    steering: InspectionStatus;
    brakes: InspectionStatus;
    electrical: InspectionStatus;
    fuel: InspectionStatus;
  };

  /** Outer body-panel observations, only those flagged as not-OK. */
  panels: PanelObservation[];

  /** Translated free-form notes (EN, transliterated fallback). */
  notes: string[];

  /** Full mechanical-inspection tree, used by the "shiko më shumë" modal. */
  sections: InspectionSection[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECTION_BY_CODE: Record<string, keyof InspectionReport["mechanical"]> = {
  S01: "engine",
  S02: "transmission",
  S03: "drivetrain",
  S04: "steering",
  S05: "brakes",
  S06: "electrical",
  S07: "fuel",
};

// Best-effort mapping of Encar's `statusType.code` values to our enum.
// Codes the API omits or returns as null roll up to "unknown" so we
// never display nonsense.
function statusFromCode(code: string | null | undefined): InspectionStatus {
  if (!code) return "unknown";
  switch (code) {
    case "1":
      return "good";
    case "2":
      return "adequate";
    case "3":
      return "good"; // "없음" / "none" → no issue → good
    case "4":
    case "6":
      return "minor";
    case "5":
    case "7":
      return "leak";
    case "8":
      return "insufficient";
    case "9":
      return "excessive";
    case "10":
      return "bad";
    case "11":
      return "present";
    default:
      return "unknown";
  }
}

// Walk a section's children + grandchildren and pick the worst status —
// e.g. for "Engine" we look at all sub-checks and surface the worst one
// as the section's overall summary.
const STATUS_RANK: Record<InspectionStatus, number> = {
  good: 0,
  adequate: 0,
  unknown: 1,
  minor: 2,
  insufficient: 3,
  excessive: 3,
  present: 3,
  leak: 4,
  bad: 5,
};

function worstStatus(a: InspectionStatus, b: InspectionStatus): InspectionStatus {
  return STATUS_RANK[b] > STATUS_RANK[a] ? b : a;
}

function summarizeSection(node: unknown): InspectionStatus {
  let worst: InspectionStatus = "good";
  function walk(n: unknown) {
    if (!n || typeof n !== "object") return;
    const obj = n as Record<string, unknown>;
    const status = (obj.statusType as Record<string, unknown> | null)?.code as
      | string
      | undefined;
    if (status) worst = worstStatus(worst, statusFromCode(status));
    const children = obj.children as unknown[] | undefined;
    if (Array.isArray(children)) for (const c of children) walk(c);
  }
  walk(node);
  return worst;
}

/** Recursively convert one Encar tree node into our InspectionNode. */
function buildNode(raw: unknown): InspectionNode | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const type = (obj.type as Record<string, unknown> | null) ?? {};
  const code = (type.code as string) || "?";
  const titleKo = (type.title as string) ?? null;
  const status = obj.statusType as Record<string, unknown> | null;
  const statusCode = (status?.code as string) ?? null;
  const statusKo = (status?.title as string) ?? null;

  const children: InspectionNode[] = [];
  const rawChildren = obj.children as unknown[] | undefined;
  if (Array.isArray(rawChildren)) {
    for (const c of rawChildren) {
      const built = buildNode(c);
      if (built) children.push(built);
    }
  }

  return {
    code,
    title: titleKo ? translate(titleKo) : "—",
    titleKo,
    status: statusFromCode(statusCode),
    statusKo,
    children,
  };
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

/** Parse the raw Encar inspection payload into our slim shape. */
export function normalizeInspection(raw: unknown): InspectionReport {
  const r = (raw ?? {}) as Record<string, unknown>;
  const master = (r.master ?? {}) as Record<string, unknown>;
  const detail = (master.detail ?? {}) as Record<string, unknown>;

  const inners = Array.isArray(r.inners) ? (r.inners as Record<string, unknown>[]) : [];
  const outers = Array.isArray(r.outers) ? (r.outers as Record<string, unknown>[]) : [];

  // Mechanical: pick worst status per top-level S-code section.
  const mechanical: InspectionReport["mechanical"] = {
    engine: "good",
    transmission: "good",
    drivetrain: "good",
    steering: "good",
    brakes: "good",
    electrical: "good",
    fuel: "good",
  };

  // Build the full tree for the "shiko më shumë" modal at the same time.
  const sections: InspectionSection[] = [];

  for (const section of inners) {
    const sectionType = (section.type as Record<string, unknown> | null) ?? {};
    const code = (sectionType.code as string) || "";
    const titleKo = (sectionType.title as string) ?? null;
    const status = summarizeSection(section);

    const key = SECTION_BY_CODE[code];
    if (key) mechanical[key] = status;

    const items: InspectionNode[] = [];
    const rawChildren = section.children as unknown[] | undefined;
    if (Array.isArray(rawChildren)) {
      for (const c of rawChildren) {
        const built = buildNode(c);
        if (built) items.push(built);
      }
    }

    sections.push({
      code: code || "?",
      title: titleKo ? translate(titleKo) : "—",
      titleKo,
      status,
      items,
    });
  }

  // Panels: only keep observations that are NOT-OK (status code 1 = good
  // = uninteresting). Empty array if everything passed.
  const panels: PanelObservation[] = [];
  for (const panel of outers) {
    const status = panel.statusType as Record<string, unknown> | null;
    const statusCode = (status?.code as string) ?? null;
    if (!statusCode || statusCode === "1") continue;
    const titleKo =
      ((panel.type as Record<string, unknown> | null)?.title as string) ?? null;
    const statusKo = (status?.title as string) ?? null;
    panels.push({
      code: ((panel.type as Record<string, unknown> | null)?.code as string) ?? "P?",
      title: titleKo ? translate(titleKo) : null,
      titleKo,
      statusKey: panelStatusFromKorean(statusKo),
      statusKo,
    });
  }

  const notes: string[] = [];
  if (typeof detail.comments === "string" && detail.comments.trim()) {
    const translated = translate(detail.comments.trim());
    if (translated) notes.push(translated);
  }

  // mileageStateType: "1" = matches, "2" = altered. Encar sometimes
  // returns null, in which case we don't pretend to know.
  const mileageStateCode = (detail.mileageStateType as Record<string, unknown> | null)?.code as
    | string
    | null;
  const mileageMatch =
    mileageStateCode === "1" ? true : mileageStateCode === "2" ? false : null;

  return {
    version: INSPECTION_REPORT_VERSION,
    inspectedAt: typeof master.registrationDate === "string"
      ? (master.registrationDate as string)
      : null,
    inspector: translate(
      (master.inspName as string) || (detail.inspName as string) || ""
    ) || null,
    recordNo: (detail.recordNo as string) ?? null,
    vin: (detail.vin as string) ?? null,
    accident: typeof master.accdient === "boolean"
      ? Boolean(master.accdient)
      : typeof master.accident === "boolean"
      ? Boolean(master.accident)
      : null,
    simpleRepair:
      typeof master.simpleRepair === "boolean" ? Boolean(master.simpleRepair) : null,
    warrantyEngine: typeof detail.engineCheck === "string"
      ? detail.engineCheck === "Y"
      : null,
    warrantyTransmission: typeof detail.trnsCheck === "string"
      ? detail.trnsCheck === "Y"
      : null,
    mileageMatch,
    mileageRecorded:
      typeof detail.mileage === "number" ? (detail.mileage as number) : null,
    colorTitle: translate(
      ((detail.colorType as Record<string, unknown> | null)?.title as string) ?? ""
    ) || null,
    transmissionTitle: translate(
      ((detail.transmissionType as Record<string, unknown> | null)?.title as string) ?? ""
    ) || null,
    mechanical,
    panels,
    notes,
    sections,
  };
}
