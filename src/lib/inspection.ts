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

/**
 * Encar's letter-coded panel status taxonomy. A single panel can be
 * tagged with multiple letters (e.g. exchanged AND welded). The enum
 * mirrors the legend Encar shows below their inspection diagram:
 *
 *   X = exchange         (panel was replaced)
 *   W = sheet metal/welding
 *   C = corrosion
 *   A = scratches
 *   U = uneven surface
 *   T = impairment       (damage)
 */
export type PanelMarkerCode = "X" | "W" | "C" | "A" | "U" | "T";

const PANEL_MARKER_CODES: ReadonlySet<PanelMarkerCode> = new Set([
  "X",
  "W",
  "C",
  "A",
  "U",
  "T",
]);

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
  /** Panel code (e.g. "P011") or human title if no code is available. */
  code: string;
  /** Translated title (EN, transliterated as fallback). Display this. */
  title: string | null;
  /** Original Korean title from Encar — kept for debugging only. */
  titleKo: string | null;
  /** Legacy single-status enum key — UI uses t(`insp_panel_${statusKey}`).
   * Kept for backwards compat; new UI prefers `markers`. */
  statusKey: PanelStatusKey;
  /** Original Korean status text — kept for debugging only. */
  statusKo: string | null;
  /** Letter codes from Encar (X/W/C/A/U/T). May be empty if Encar only
   * returned a Korean status string (older API), in which case we
   * derived a single value from `statusKey` for the legend overlay. */
  markers: PanelMarkerCode[];
  /** Which silhouette the marker should sit on:
   *   - "body"  → top-down body diagram (img_inspection01.gif)
   *   - "frame" → under-chassis frame diagram (img_inspection02.gif)
   * Inferred from Encar's `attributes` array (RANK_ONE/RANK_TWO →
   * body, RANK_A/RANK_B → frame). */
  view: "body" | "frame";
  /** Approximate (x%, y%) center of the marker on the diagram. Null
   * for codes we don't have a coordinate mapping for — those panels
   * still appear in the issue list below the diagram. */
  position: { x: number; y: number } | null;
};

/** Bumped whenever the InspectionReport shape changes. The API route
 * uses this to invalidate cached rows from older versions. */
export const INSPECTION_REPORT_VERSION = 5;

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
// Panel coordinate map — where to place markers on the silhouette.
//
// Coordinates are percentages relative to the diagram image, where
// (0,0) is top-left and (100,100) is bottom-right. The two views
// follow Encar's stock `img_inspection0{1,2}.gif` layouts:
//
//   ┌──────────────────────────────────────┐
//   │  side L  │  top-down  │  side R     │  body view (img 01)
//   └──────────────────────────────────────┘
//   ┌──────────────────────────────────────┐
//   │  side L  │  underbody │  side R     │  frame view (img 02)
//   └──────────────────────────────────────┘
//
// Both side views show the car with HOOD at top and TRUNK at bottom
// (mirrored on the right). The codes were validated by scanning ~150
// real Encar inspections — see PANEL_TITLE_FALLBACK below for the
// name-based safety net when an unknown code shows up.
// ---------------------------------------------------------------------------

type PanelPosition = {
  view: "body" | "frame";
  x: number;
  y: number;
};

const PANEL_POSITIONS: Record<string, PanelPosition> = {
  // ---- Body view (img_inspection01.gif) — RANK_ONE / RANK_TWO ----
  // Top-down center column (x=50). The center silhouette spans
  // roughly y=10..90; the panels stack hood → roof → trunk.
  P011: { view: "body", x: 50, y: 14 }, // Hood
  P051: { view: "body", x: 50, y: 24 }, // Radiator support (under hood)
  P041: { view: "body", x: 50, y: 82 }, // Trunk lid
  // Side views — front fender (top), doors (middle), quarter (rear), sill (bottom).
  // x ≈ 14% lands on the door cut-out of the side profile.
  P021: { view: "body", x: 14, y: 21 }, // Front fender L
  P022: { view: "body", x: 86, y: 21 }, // Front fender R
  P031: { view: "body", x: 14, y: 39 }, // Front door L
  P032: { view: "body", x: 86, y: 39 }, // Front door R
  P033: { view: "body", x: 14, y: 53 }, // Rear door L
  P034: { view: "body", x: 86, y: 53 }, // Rear door R
  P061: { view: "body", x: 14, y: 70 }, // Quarter panel L (rear fender)
  P062: { view: "body", x: 86, y: 70 }, // Quarter panel R
  P081: { view: "body", x: 14, y: 86 }, // Side sill L
  P082: { view: "body", x: 86, y: 86 }, // Side sill R

  // ---- Frame view (img_inspection02.gif) — RANK_A / RANK_B / RANK_C ----
  // Underbody center column — shows engine bay (top), floor (middle),
  // trunk floor + rear panel (bottom).
  P091: { view: "frame", x: 50, y: 14 }, // Front panel
  P101: { view: "frame", x: 50, y: 22 }, // Cross member
  P111: { view: "frame", x: 42, y: 26 }, // Inside panel L
  P112: { view: "frame", x: 58, y: 26 }, // Inside panel R
  P161: { view: "frame", x: 50, y: 50 }, // Floor panel
  P171: { view: "frame", x: 50, y: 73 }, // Trunk floor
  P181: { view: "frame", x: 50, y: 86 }, // Rear panel
  // Side members — between center column and side view.
  P121: { view: "frame", x: 36, y: 22 }, // Front side member L
  P122: { view: "frame", x: 64, y: 22 }, // Front side member R
  P123: { view: "frame", x: 36, y: 78 }, // Rear side member L
  P124: { view: "frame", x: 64, y: 78 }, // Rear side member R
  // Wheel houses sit at the wheel positions on the side views.
  P131: { view: "frame", x: 14, y: 21 }, // Front wheel house L
  P132: { view: "frame", x: 86, y: 21 }, // Front wheel house R
  P133: { view: "frame", x: 14, y: 80 }, // Rear wheel house L
  P134: { view: "frame", x: 86, y: 80 }, // Rear wheel house R
  // Pillars span between front and rear wheels on each side view.
  P141: { view: "frame", x: 14, y: 32 }, // Front pillar L
  P142: { view: "frame", x: 14, y: 50 }, // Middle pillar L
  P143: { view: "frame", x: 14, y: 68 }, // Rear pillar L
  P144: { view: "frame", x: 86, y: 32 }, // Front pillar R
  P145: { view: "frame", x: 86, y: 50 }, // Middle pillar R
  P146: { view: "frame", x: 86, y: 68 }, // Rear pillar R
};

/**
 * Name-based fallback when Encar returns a code we don't have in
 * `PANEL_POSITIONS`. We pick a reasonable position by matching keywords
 * in the original Korean title — this guards against Encar adding
 * P0XX numbers we haven't catalogued yet.
 */
function positionFromTitle(
  titleKo: string | null,
  view: "body" | "frame"
): { x: number; y: number } | null {
  if (!titleKo) return null;
  const compact = titleKo.replace(/\s+/g, "");
  const isLeft = compact.includes("(좌)");
  const isRight = compact.includes("(우)");
  const sideX = isLeft ? 16 : isRight ? 84 : 50;

  if (view === "body") {
    if (compact.includes("후드") || compact.includes("본넷")) return { x: 50, y: 14 };
    if (compact.includes("트렁크리드")) return { x: 50, y: 82 };
    if (compact.includes("라디에이터서포트")) return { x: 50, y: 24 };
    if (compact.includes("프론트휀더")) return { x: sideX, y: 21 };
    if (compact.includes("프론트도어")) return { x: sideX, y: 39 };
    if (compact.includes("리어도어")) return { x: sideX, y: 53 };
    if (compact.includes("쿼터패널")) return { x: sideX, y: 70 };
    if (compact.includes("사이드실")) return { x: sideX, y: 86 };
    if (compact.includes("루프")) return { x: 50, y: 50 };
    return null;
  }

  // frame
  if (compact.includes("프론트패널")) return { x: 50, y: 14 };
  if (compact.includes("크로스멤버")) return { x: 50, y: 22 };
  if (compact.includes("플로어패널")) return { x: 50, y: 50 };
  if (compact.includes("트렁크플로어")) return { x: 50, y: 73 };
  if (compact.includes("리어패널")) return { x: 50, y: 86 };
  if (compact.includes("인사이드패널")) return { x: isLeft ? 42 : 58, y: 26 };
  if (compact.includes("프론트사이드멤버")) return { x: isLeft ? 36 : 64, y: 22 };
  if (compact.includes("리어사이드멤버")) return { x: isLeft ? 36 : 64, y: 78 };
  if (compact.includes("프론트휠하우스")) return { x: sideX, y: 21 };
  if (compact.includes("리어휠하우스")) return { x: sideX, y: 80 };
  if (compact.includes("필러패널")) {
    const isFront = compact.includes("(앞)");
    const isMid = compact.includes("(중간)") || compact.includes("(중앙)");
    const isRear = compact.includes("(뒤)") || compact.includes("(후)");
    const py = isFront ? 32 : isMid ? 50 : isRear ? 68 : 50;
    return { x: sideX, y: py };
  }
  return null;
}

// Map Encar's `attributes` array to our two view buckets. Anything we
// don't recognise falls back to "body" (the diagram users see first).
function viewFromAttributes(attrs: string[] | undefined): "body" | "frame" {
  if (!attrs) return "body";
  for (const a of attrs) {
    if (a === "RANK_A" || a === "RANK_B") return "frame";
    if (a === "RANK_ONE" || a === "RANK_TWO") return "body";
  }
  return "body";
}

// Best-effort fallback when Encar gave us a Korean status string but
// no letter code (older API). We pick a single representative letter
// so the legend still has something to render.
function markerFromStatusKey(key: PanelStatusKey): PanelMarkerCode | null {
  switch (key) {
    case "replaced": return "X";
    case "welded":
    case "panel_beat": return "W";
    case "corrosion": return "C";
    case "scratch": return "A";
    case "dent":
    case "damage": return "T";
    case "painted": return "U";
    default: return null;
  }
}

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

  // Panels: capture every flagged outer observation. Encar evolved
  // their schema over time, so we accept both shapes:
  //
  //   • Newer (V200623+): `statusTypes` is an array of letter codes
  //     `{ code: "W", title: "판금" }, { code: "X", ... }`. A single
  //     panel can carry multiple letters.
  //   • Older: `statusType` (singular) is a numeric `{ code: "5", ... }`
  //     matching `statusFromCode()`. Used for the legacy "good = 1"
  //     filter behaviour below.
  //
  // For both shapes we skip panels with no status / explicitly "good".
  const panels: PanelObservation[] = [];
  for (const panel of outers) {
    const typeObj = (panel.type as Record<string, unknown> | null) ?? null;
    const code = ((typeObj?.code as string) ?? "P?").trim();
    const titleKo = (typeObj?.title as string) ?? null;
    const attrs = panel.attributes as string[] | undefined;

    // Collect letter codes (new schema)
    const markers: PanelMarkerCode[] = [];
    let statusKoParts: string[] = [];
    const statusTypesArr = panel.statusTypes as
      | Array<Record<string, unknown>>
      | undefined;
    if (Array.isArray(statusTypesArr)) {
      for (const st of statusTypesArr) {
        const sCode = (st?.code as string) ?? "";
        const sTitle = (st?.title as string) ?? "";
        const upper = sCode.toUpperCase();
        if (PANEL_MARKER_CODES.has(upper as PanelMarkerCode)) {
          if (!markers.includes(upper as PanelMarkerCode)) {
            markers.push(upper as PanelMarkerCode);
          }
        }
        if (sTitle) statusKoParts.push(sTitle);
      }
    }

    // Older single-status fallback
    const legacyStatus = panel.statusType as Record<string, unknown> | null;
    const legacyStatusCode = (legacyStatus?.code as string) ?? null;
    const legacyStatusKo = (legacyStatus?.title as string) ?? null;

    if (markers.length === 0) {
      // No new-schema letter codes — try old schema. Skip panels that
      // are explicitly good ("1") or empty.
      if (!legacyStatusCode || legacyStatusCode === "1") continue;
      if (legacyStatusKo) statusKoParts = [legacyStatusKo];
    }

    const statusKo = statusKoParts.length > 0 ? statusKoParts.join(" / ") : null;
    const statusKey = panelStatusFromKorean(legacyStatusKo ?? statusKo);

    // Backfill legacy statusKey → marker so older cars without letter
    // codes still get a badge to display in the legend.
    if (markers.length === 0) {
      const fallback = markerFromStatusKey(statusKey);
      if (fallback) markers.push(fallback);
    }

    if (markers.length === 0) continue; // truly nothing to display

    const view = viewFromAttributes(attrs);
    // Try the precise code lookup first; if Encar invented a new code
    // we haven't catalogued, fall back to keyword matching against the
    // Korean title so the marker still lands somewhere sensible.
    const positionEntry = PANEL_POSITIONS[code];
    let position: { x: number; y: number } | null =
      positionEntry && positionEntry.view === view
        ? { x: positionEntry.x, y: positionEntry.y }
        : null;
    if (!position) position = positionFromTitle(titleKo, view);

    panels.push({
      code: code || "P?",
      title: titleKo ? translate(titleKo) : null,
      titleKo,
      statusKey,
      statusKo,
      markers,
      view,
      position,
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
