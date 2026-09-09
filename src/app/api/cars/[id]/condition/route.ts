import { NextResponse } from "next/server";

const ENCAR_DIAGNOSIS_URL = "https://api.encar.com/v1/readside/diagnosis/vehicle";

const ENCAR_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://fem.encar.com/",
  Origin: "https://fem.encar.com",
};

type RouteParams = Promise<{ id: string }>;

function resolveSourceId(idParam: string): string | null {
  const trimmed = decodeURIComponent(idParam || "").trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [, source_id] = trimmed.split(":");
    return source_id ?? "";
  }
  return trimmed;
}

// Same transient-failure retry already applied to /api/cars,
// /api/featured, and the detail/inspection routes: VehicleCondition.tsx
// silently hides this whole section on any !res.ok (no visible error,
// just vanishes), so a single momentary Encar hiccup used to remove
// real condition data from the page with nothing to explain why. A
// confirmed 404 (Encar has no diagnosis for this listing) still
// short-circuits immediately — that's a real answer, not a hiccup —
// only other failures (5xx/network error) get one retry (300ms gap).
// Response shape is unchanged from before on every path, on purpose.
const MAX_ATTEMPTS = 2;

export async function GET(
  _req: Request,
  { params }: { params: RouteParams }
): Promise<Response> {
  const { id } = await params;
  const sourceId = resolveSourceId(id);

  if (!sourceId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const url = `${ENCAR_DIAGNOSIS_URL}/${encodeURIComponent(sourceId)}`;
  let lastStatus = 500;
  let lastErrorMessage = "unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: ENCAR_HEADERS,
        cache: "no-store",
      });

      if (res.status === 404) {
        // Confirmed: no diagnosis for this listing — not a hiccup.
        return NextResponse.json({ condition: null }, { status: 404 });
      }
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(
          { condition: data },
          { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
        );
      }
      lastStatus = res.status;
      lastErrorMessage = `HTTP ${res.status}`;
    } catch (error) {
      lastErrorMessage = (error as Error).message;
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  console.error(
    `Condition proxy failed for ${sourceId} after ${MAX_ATTEMPTS} attempts: ${lastErrorMessage}`
  );
  return NextResponse.json(
    { error: lastErrorMessage },
    { status: lastStatus, headers: { "Cache-Control": "no-store" } }
  );
}
