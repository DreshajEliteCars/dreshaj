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
  try {
    const res = await fetch(url, {
      headers: ENCAR_HEADERS,
      cache: "no-store",
    });
    
    if (res.status === 404) {
      return NextResponse.json({ condition: null }, { status: 404 });
    }
    
    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}` }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(
      { condition: data },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
