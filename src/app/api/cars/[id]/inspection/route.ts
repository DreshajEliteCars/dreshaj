import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  INSPECTION_REPORT_VERSION,
  InspectionReport,
  normalizeInspection,
} from "../../../../../lib/inspection";

/**
 * Lazy-fetch + cache the per-car Encar inspection report.
 *
 *   GET /api/cars/{id}/inspection
 *
 * `id` is either the bare numeric source_id (e.g. "41591948") or the
 * full composite id (e.g. "encar:41591948"). Returns a normalized
 * InspectionReport (see src/lib/inspection.ts), or 404 if Encar has no
 * inspection for that listing.
 *
 * Cache strategy:
 *   1. Look up car_inspections by car_id.
 *   2. If hit: return immediately.
 *   3. If miss: call Encar, normalize, INSERT into car_inspections,
 *      return.
 *
 * Service-role key is needed for the INSERT (RLS allows anon select but
 * not write). Reads use the same key for simplicity; the response is
 * sent back to the public browser anyway.
 */

const ENCAR_INSPECTION_URL =
  "https://api.encar.com/v1/readside/inspection/vehicle";

const ENCAR_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://fem.encar.com/",
  Origin: "https://fem.encar.com",
};

// Cache freshness — beyond this we'll re-fetch from Encar even if a
// row exists. 30 days is fine for inspection data; it doesn't change.
const STALE_AFTER_DAYS = 30;

type RouteParams = Promise<{ id: string }>;

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function resolveSourceId(idParam: string): { fullId: string; sourceId: string } | null {
  const trimmed = decodeURIComponent(idParam || "").trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [, source_id] = trimmed.split(":");
    return { fullId: trimmed, sourceId: source_id ?? "" };
  }
  return { fullId: `encar:${trimmed}`, sourceId: trimmed };
}

async function fetchEncarInspection(sourceId: string): Promise<unknown | null> {
  const url = `${ENCAR_INSPECTION_URL}/${encodeURIComponent(sourceId)}`;
  try {
    const res = await fetch(url, {
      headers: ENCAR_HEADERS,
      // Don't cache at the fetch layer; we cache in our DB instead.
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn(`Inspection fetch HTTP ${res.status} for ${sourceId}`);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.warn(
      `Inspection fetch error for ${sourceId}: ${(error as Error).message}`
    );
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: RouteParams }
): Promise<Response> {
  const { id } = await params;
  const resolved = resolveSourceId(id);
  if (!resolved) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const { fullId, sourceId } = resolved;

  const supabase = getServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server is missing Supabase env vars" },
      { status: 503 }
    );
  }

  // ---- 1. cache lookup ---------------------------------------------------
  // We grab the row regardless of age and decide how to use it next:
  //   - matches current schema → serve it (fast path)
  //   - older schema or stale → try fresh fetch first, but keep this row
  //     as a fallback if the fetch fails (better stale data than no data)
  const { data: cached, error: cacheError } = await supabase
    .from("car_inspections")
    .select("data, fetched_at")
    .eq("car_id", fullId)
    .maybeSingle();

  if (cacheError) {
    console.warn(`car_inspections cache lookup failed: ${cacheError.message}`);
  }

  const cachedReport =
    (cached?.data as Partial<InspectionReport> | null | undefined) ?? null;
  const cutoffMs = Date.now() - STALE_AFTER_DAYS * 24 * 3600 * 1000;
  const cachedAt = cached?.fetched_at ? Date.parse(cached.fetched_at) : 0;
  const cacheIsFresh = cachedAt > cutoffMs;
  const cacheIsCurrentSchema =
    !!cachedReport &&
    typeof cachedReport.version === "number" &&
    cachedReport.version >= INSPECTION_REPORT_VERSION &&
    Array.isArray(cachedReport.sections);

  if (cacheIsFresh && cacheIsCurrentSchema) {
    return NextResponse.json(
      { inspection: cachedReport as InspectionReport, cached: true },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
    );
  }

  // ---- 2. fetch from Encar -----------------------------------------------
  const raw = await fetchEncarInspection(sourceId);

  if (!raw) {
    // Encar gave us nothing this time. Prefer serving stale cache over
    // an empty page — even an old shape is more useful than "unavailable".
    if (cachedReport) {
      return NextResponse.json(
        { inspection: cachedReport as InspectionReport, cached: true, stale: true },
        { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } }
      );
    }
    return NextResponse.json(
      { inspection: null, cached: false, reason: "no-data" },
      { status: 404 }
    );
  }

  const inspection = normalizeInspection(raw);

  // ---- 3. persist for next time ------------------------------------------
  const { error: insertError } = await supabase
    .from("car_inspections")
    .upsert(
      {
        car_id: fullId,
        accident: inspection.accident,
        simple_repair: inspection.simpleRepair,
        data: inspection,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "car_id" }
    );
  if (insertError) {
    // Persistence failure isn't fatal — return the data anyway.
    console.warn(
      `car_inspections upsert failed for ${fullId}: ${insertError.message}`
    );
  }

  return NextResponse.json(
    { inspection, cached: false },
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
  );
}
