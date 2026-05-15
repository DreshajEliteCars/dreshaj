import { ImageResponse } from "next/og";
import { getServerSupabase } from "../../../../../lib/supabaseServer";
import { Car } from "../../../../../lib/cars";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Render an Instagram-friendly share card for one car listing.
 *
 *   GET /api/cars/{id}/og?photo=2
 *
 * Returns a 1080×1920 (9:16 portrait, perfect for Instagram Stories)
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
  return getServerSupabase();
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

    // Apply the configurable shipping fee from app_settings so the OG
    // card matches the price displayed on the live site. Falls back to
    // the in-code default if the row doesn't exist yet.
    let shipPriceEur = 1300;
    try {
      const { data: settings } = await supabase
        .from("app_settings")
        .select("ship_price_eur")
        .eq("id", 1)
        .maybeSingle();
      if (settings && typeof settings.ship_price_eur === "number") {
        shipPriceEur = settings.ship_price_eur;
      }
    } catch {
      // Keep the default — the OG card must always render.
    }
    const displayPriceEur =
      car.price_eur != null ? car.price_eur + shipPriceEur : null;

    const photoUrl =
      car.images?.[photoIndex] || car.image_url || car.images?.[0] || null;

    // Pre-fetch the photo into a data URL. If that fails we still render
    // the card — just without the photo — instead of crashing the whole
    // route and showing the user a generic "check your connection" error.
    const photoDataUrl = photoUrl
      ? await fetchPhotoAsDataUrl(photoUrl)
      : null;

    // Fetch logo from disk and prepare it for the white card footer.
    //
    // The source logo is white-on-transparent (designed for dark headers
    // on the live site). If we just flatten it onto white it disappears.
    // Satori also drops PNGs with an alpha channel silently, so we have
    // to produce a fully-opaque image. The trick: use the original alpha
    // channel as a mask and paint black wherever the logo had any
    // opacity, then flatten that onto white. End result is a black-on-
    // white version of the logo that's visible on the card footer.
    let logoDataUrl: string | null = null;
    try {
      const logoBuffer = await readFile(join(process.cwd(), "public", "images", "logo.png"));
      const sharp = (await import("sharp")).default;
      // Trim transparent / uniform borders from the source PNG so the
      // logo content fills the buffer. Without this the logo looks
      // floating/centered inside the <img> element on the OG card
      // because the source asset has padding around the actual artwork.
      const trimmedLogo = await sharp(logoBuffer)
        .ensureAlpha()
        .trim()
        .toBuffer();
      const meta = await sharp(trimmedLogo).metadata();
      const w = meta.width ?? 280;
      const h = meta.height ?? 96;
      // Pull the alpha channel out as a single-channel grayscale buffer.
      const alphaBuffer = await sharp(trimmedLogo)
        .ensureAlpha()
        .extractChannel("alpha")
        .toBuffer();
      // Build a solid-black RGB canvas the same size, then re-attach the
      // logo's alpha so only the logo shape is opaque.
      const blackOnTransparent = await sharp({
        create: {
          width: w,
          height: h,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .joinChannel(alphaBuffer)
        .png()
        .toBuffer();
      // Finally flatten onto white so we hand Satori a fully-opaque PNG.
      const flattenedBuffer = await sharp(blackOnTransparent)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toBuffer();
      logoDataUrl = `data:image/png;base64,${flattenedBuffer.toString("base64")}`;
    } catch (e) {
      // sharp not available or failed — fall back to raw buffer. The
      // logo may render as white-on-white in this case but that's no
      // worse than today's behavior and the rest of the card still works.
      console.warn(
        "[og] sharp recolor failed, using raw logo:",
        e instanceof Error ? e.message : e
      );
      try {
        const logoBuffer = await readFile(join(process.cwd(), "public", "images", "logo.png"));
        logoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      } catch {
        console.warn("[og] Could not load logo.png");
      }
    }

    const title = `${car.make} ${car.model}`;
    const trim = car.trim?.trim() || "";
    const price = formatPriceText(displayPriceEur);
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
        {/* ---- Photo (top section) ---- */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 810,
            background: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {includePhoto && photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={photoDataUrl}
              width={1080}
              height={810}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
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

        {/* ---- Info panel (bottom) ---- */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "48px 64px 64px",
            gap: 20,
          }}
        >
          {/* Title row */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: TEXT,
                lineHeight: 1.1,
                letterSpacing: -2,
                display: "flex",
              }}
            >
              {title}
            </div>
            {trim && (
              <div
                style={{
                  fontSize: 32,
                  color: MUTED,
                  fontWeight: 500,
                  display: "flex",
                }}
              >
                {trim}
              </div>
            )}
          </div>

          {/* Price & Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <div
              style={{
                fontSize: 80,
                fontWeight: 800,
                color: ACCENT,
                lineHeight: 1,
                letterSpacing: -2,
                display: "flex",
                whiteSpace: "nowrap",
              }}
            >
              {price}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 600,
                marginTop: 6,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ display: "flex" }}>Deri në Durrës</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 600,
                marginTop: 6,
                marginLeft: "auto",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span style={{ display: "flex" }}>Me Garancion</span>
            </div>
          </div>

          {/* Specs 2×2 (flex rows — Satori doesn't support CSS Grid) */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
              <Spec label="Kilometrazhi" value={mileage} stroke={STROKE} muted={MUTED} text={TEXT} />
              <Spec label="Transmisioni" value={transmission} stroke={STROKE} muted={MUTED} text={TEXT} />
            </div>
            <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
              <Spec label="Regjistrimi i parë" value={registration} stroke={STROKE} muted={MUTED} text={TEXT} />
              <Spec label="Karburanti" value={fuel} stroke={STROKE} muted={MUTED} text={TEXT} />
            </div>
          </div>

          {/* Footer / branding — just the logo, centered. */}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 24,
              marginBottom: 12,
              borderTop: `2px solid ${STROKE}`,
            }}
          >
            {logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              <img
                src={logoDataUrl}
                alt="Dreshaj Elite Cars"
                width={420}
                height={140}
                style={{ display: "flex", objectFit: "contain" }}
              />
            )}
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
        height: 1920,
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
        gap: 6,
        padding: "20px 28px",
        border: `2px solid ${stroke}`,
        borderRadius: 20,
      }}
    >
      <div style={{ fontSize: 24, color: muted, fontWeight: 500, display: "flex" }}>
        {label}
      </div>
      <div style={{ fontSize: 36, color: text, fontWeight: 700, display: "flex" }}>
        {value}
      </div>
    </div>
  );
}
