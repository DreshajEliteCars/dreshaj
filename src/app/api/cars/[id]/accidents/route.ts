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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sourceId = id.includes(":") ? id.split(":")[1] : id;

    const url = `https://api.encar.com/v1/readside/record/vehicle/${encodeURIComponent(sourceId)}/open`;
    const res = await fetch(url, {
      headers: ENCAR_HEADERS,
      cache: "no-store",
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch accidents from Encar" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Accident proxy error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
