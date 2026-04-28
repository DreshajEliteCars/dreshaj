import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { Car } from "../../../../../lib/cars";

/**
 * Render an Instagram-friendly share card for one car listing.
 *
 *   GET /api/cars/{id}/og?photo=2
 *
 * Returns a 1080×1350 (4:5 portrait, the format Instagram crops least)
 * PNG with:
 *   - the selected gallery photo on top
 *   - the make/model + trim + price in the bottom panel
 *   - 4 specs (mileage, gearbox, registration, fuel) in a 2×2 grid
 *
 * The route is server-side, which is what makes it possible to embed the
 * Encar CDN image — a browser-side canvas would taint the canvas thanks
 * to CORS and `toDataURL` would throw.
 */

// Use nodejs runtime so the supabase-js client behaves predictably.
export const runtime = "nodejs";
// We never want this cached at the framework level — different `?photo=`
// values must produce different PNGs.
export const dynamic = "force-dynamic";

// Encar's image CDN serves fine to browsers but sometimes refuses
// generic Node fetches. We always include browser-like headers + a
// Referer so the request looks like a normal page-load.
//
// IMPORTANT: Satori's image decoder only reliably handles JPEG and PNG.
// If we accept WebP/AVIF the CDN will happily serve them and Satori will
// crash deep inside its WASM with a cryptic "x is not iterable" error
// that surfaces as `failed to pipe response`. So we restrict the Accept
// header to formats Satori can decode.
const PHOTO_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Referer: "https://www.encar.com/",
  Accept: "image/jpeg,image/png;q=0.9,*/*;q=0.1",
};

// Satori is loaded into memory; very large source images will explode
// the base64 string (and have hit Buffer.toString MAX_STRING_LENGTH in
// reported issues). Cap at 8 MB which is comfortably above any sane
// listing photo.
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/**
 * Sniff the actual image format from the magic bytes. We don't trust
 * the Content-Type header — some CDNs lie or send `application/octet-stream`,
 * and a wrong mime in the data: URL is the #1 cause of the Satori crash.
 * Returns the canonical mime type Satori understands, or null if the
 * bytes don't look like a supported format.
 */
function sniffImageMime(bytes: Uint8Array): "image/jpeg" | "image/png" | null {
  if (bytes.length < 4) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  return null;
}

/**
 * Fetch the chosen gallery photo and return it as a base64 data URL,
 * or null if anything goes wrong. We do this server-side ourselves
 * (instead of letting Satori fetch the URL) so we control the headers
 * and so a single bad image can't crash the whole image pipeline.
 */
async function fetchPhotoAsDataUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      headers: PHOTO_FETCH_HEADERS,
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[og] photo fetch ${res.status} for ${url}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength === 0) return null;
    if (arrayBuffer.byteLength > MAX_PHOTO_BYTES) {
      console.warn(
        `[og] photo too large (${arrayBuffer.byteLength} bytes) — skipping`
      );
      return null;
    }
    const bytes = new Uint8Array(arrayBuffer);
    const mime = sniffImageMime(bytes);
    if (!mime) {
      console.warn(
        `[og] photo is not JPEG/PNG (header: ${res.headers.get(
          "content-type"
        )}) — skipping to avoid Satori decoder crash`
      );
      return null;
    }
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.warn(
      `[og] photo fetch threw:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

type RouteParams = Promise<{ id: string }>;

const numberFormatter = new Intl.NumberFormat("en-US");

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function resolveSourceId(idParam: string): {
  fullId: string;
  sourceId: string;
} | null {
  const trimmed = decodeURIComponent(idParam || "").trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [, source_id] = trimmed.split(":");
    return { fullId: trimmed, sourceId: source_id ?? "" };
  }
  return { fullId: `encar:${trimmed}`, sourceId: trimmed };
}

function formatPriceText(eur: number | null): string {
  if (eur == null) return "Kontakto për çmimin";
  return `€ ${numberFormatter.format(eur)}`;
}

function formatMileage(km: number | null): string {
  if (km == null) return "—";
  return `${numberFormatter.format(km)} km`;
}

function formatRegistration(year: number, month: number | null): string {
  if (month && month >= 1 && month <= 12) {
    return `${String(month).padStart(2, "0")}/${year}`;
  }
  return String(year);
}

export async function GET(
  req: Request,
  { params }: { params: RouteParams }
): Promise<Response> {
  try {
    const { id } = await params;
    const resolved = resolveSourceId(id);
    if (!resolved) return new Response("Invalid id", { status: 400 });

    const url = new URL(req.url);
    const photoIndex = Math.max(
      0,
      Number.parseInt(url.searchParams.get("photo") || "0", 10) || 0
    );

    const supabase = getServerClient();
    if (!supabase) {
      return new Response("Backend unavailable: missing Supabase env", {
        status: 503,
      });
    }

    // Lookup by full id first, fall back to source_id (URL-shareable form).
    const lookupKey = resolved.fullId.includes(":") ? "id" : "source_id";
    const lookupValue = resolved.fullId.includes(":")
      ? resolved.fullId
      : resolved.sourceId;
    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .eq(lookupKey, lookupValue)
      .maybeSingle();

    if (error) {
      console.error(`[og] Supabase lookup failed:`, error.message);
      return new Response("Lookup failed", { status: 502 });
    }
    if (!data) return new Response("Car not found", { status: 404 });
    const car = data as Car;

    const photoUrl =
      car.images?.[photoIndex] || car.image_url || car.images?.[0] || null;

    // Pre-fetch the photo into a data URL. If that fails we still render
    // the card — just without the photo — instead of crashing the whole
    // route and showing the user a generic "check your connection" error.
    const photoDataUrl = photoUrl
      ? await fetchPhotoAsDataUrl(photoUrl)
      : null;

    const title = `${car.make} ${car.model}`;
    const trim = car.trim?.trim() || "";
    const price = formatPriceText(car.price_eur);
    const mileage = formatMileage(car.mileage_km);
    const registration = formatRegistration(
      car.registration_year,
      car.registration_month
    );
    const fuel = car.fuel_type || "—";
    const transmission = car.transmission || "—";

    const ACCENT = "#076fe6";
    const TEXT = "#1f2937";
    const MUTED = "#6b7280";
    const SURFACE = "#ffffff";
    const STROKE = "#e5e7eb";

    const renderCard = (includePhoto: boolean) => (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: SURFACE,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ---- Photo (top 64% of canvas) ---- */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 864,
            background: "#0f172a",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {includePhoto && photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={photoDataUrl}
              width={1080}
              height={864}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            // Fallback panel when the photo fetch failed — better than a
            // broken response. Just renders the make/model centered.
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#cbd5e1",
                fontSize: 64,
                fontWeight: 800,
                letterSpacing: -2,
                background:
                  "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              }}
            >
              {car.make} {car.model}
            </div>
          )}
          {/* Gradient at the bottom so the photo never hard-cuts into the white panel */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 100%)",
              display: "flex",
            }}
          />
        </div>

        {/* ---- Info panel (bottom 36%) ---- */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "32px 48px 48px",
            gap: 16,
          }}
        >
          {/* Title row */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: TEXT,
                lineHeight: 1.1,
                letterSpacing: -1,
                display: "flex",
              }}
            >
              {title}
            </div>
            {trim && (
              <div
                style={{
                  fontSize: 26,
                  color: MUTED,
                  fontWeight: 500,
                  display: "flex",
                }}
              >
                {trim}
              </div>
            )}
          </div>

          {/* Price */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: ACCENT,
              lineHeight: 1,
              letterSpacing: -1,
              display: "flex",
            }}
          >
            {price}
          </div>

          {/* Specs 2×2 (flex rows — Satori doesn't support CSS Grid) */}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
              <Spec label="Kilometrazhi" value={mileage} stroke={STROKE} muted={MUTED} text={TEXT} />
              <Spec label="Transmisioni" value={transmission} stroke={STROKE} muted={MUTED} text={TEXT} />
            </div>
            <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
              <Spec label="Regjistrimi i parë" value={registration} stroke={STROKE} muted={MUTED} text={TEXT} />
              <Spec label="Karburanti" value={fuel} stroke={STROKE} muted={MUTED} text={TEXT} />
            </div>
          </div>

          {/* Footer / branding */}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 16,
              borderTop: `1px solid ${STROKE}`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 18, color: MUTED, fontWeight: 500, display: "flex" }}>
                Dreshaj Elite Cars
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    // We can't just `return new ImageResponse(...)` because Satori
    // renders lazily while Next.js pipes the response. If it throws
    // mid-stream the error escapes our try/catch and Next surfaces it
    // as `failed to pipe response`. Instead we materialize the PNG
    // bytes here so any Satori error happens *inside* this try block
    // and we can fall back gracefully.
    const renderToBuffer = async (
      includePhoto: boolean
    ): Promise<ArrayBuffer> => {
      const r = new ImageResponse(renderCard(includePhoto), {
        width: 1080,
        height: 1350,
      });
      return r.arrayBuffer();
    };

    let png: ArrayBuffer;
    try {
      png = await renderToBuffer(Boolean(photoDataUrl));
    } catch (renderErr) {
      // Almost always Satori choking on the embedded photo. Re-render
      // without it instead of returning 500 — a card with no photo is
      // strictly better than a broken share image.
      const msg =
        renderErr instanceof Error ? renderErr.message : String(renderErr);
      console.warn(`[og] photo render failed (${msg}) — retrying without photo`);
      png = await renderToBuffer(false);
    }

    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // Most likely cause: Satori threw even on the photo-less fallback,
    // a font issue, or a Supabase/network failure. Don't let it stream
    // a half-broken PNG — return a clean 500 with an explanation.
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[og] render failed:", message);
    return new Response(`Image render failed: ${message}`, { status: 500 });
  }
}

function Spec({
  label,
  value,
  stroke,
  muted,
  text,
}: {
  label: string;
  value: string;
  stroke: string;
  muted: string;
  text: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "12px 16px",
        border: `1px solid ${stroke}`,
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 18, color: muted, fontWeight: 500, display: "flex" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, color: text, fontWeight: 700, display: "flex" }}>
        {value}
      </div>
    </div>
  );
}
