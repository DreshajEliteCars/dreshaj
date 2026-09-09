import { NextResponse } from "next/server";

const ENCAR_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://fem.encar.com/",
  Origin: "https://fem.encar.com",
};

// Same transient-failure retry already applied to /api/cars,
// /api/featured, and the detail/inspection routes: AccidentHistory.tsx
// silently hides this whole section on any !res.ok (no visible error,
// just vanishes), so a single momentary Encar hiccup used to remove
// real accident-history data from the page with nothing to explain
// why. One retry (300ms gap) absorbs that. Response shape on both
// success and final failure is unchanged from before, on purpose —
// the frontend contract stays exactly the same.
const MAX_ATTEMPTS = 2;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sourceId = id.includes(":") ? id.split(":")[1] : id;
  const url = `https://api.encar.com/v1/readside/record/vehicle/${encodeURIComponent(sourceId)}/open`;

  let lastStatus = 500;
  let lastErrorMessage = "unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: ENCAR_HEADERS,
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ data });
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
    `Accident proxy failed for ${sourceId} after ${MAX_ATTEMPTS} attempts: ${lastErrorMessage}`
  );
  return NextResponse.json(
    { error: "Failed to fetch accidents from Encar" },
    { status: lastStatus, headers: { "Cache-Control": "no-store" } }
  );
}
