import type { Metadata } from "next";
import { getServerSupabase } from "../../../lib/supabaseServer";

const SITE_URL = "https://dreshajelitecars.com";

const numberFormatter = new Intl.NumberFormat("en-US");

function getServerClient() {
  return getServerSupabase();
}

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const sourceId = decodeURIComponent(id).trim();

  const supabase = getServerClient();
  if (!supabase) {
    return { title: "Detajet e Veturës" };
  }

  // Look up car — same logic as the OG route.
  const fullId = sourceId.includes(":") ? sourceId : `encar:${sourceId}`;
  const lookupKey = fullId.includes(":") ? "id" : "source_id";
  const lookupValue = fullId.includes(":") ? fullId : sourceId;

  const { data: car } = await supabase
    .from("cars")
    .select("make, model, trim, price_eur, mileage_km, fuel_type, transmission, registration_year, source_id, image_url, images")
    .eq(lookupKey, lookupValue)
    .maybeSingle();

  if (!car) {
    return { title: "Vetura nuk u gjet" };
  }

  // Fetch ship price for accurate display price.
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
    // Keep the default.
  }

  const displayPrice =
    car.price_eur != null
      ? `€ ${numberFormatter.format(car.price_eur + shipPriceEur)}`
      : "Kontakto për çmimin";

  const title = `${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""} — ${displayPrice}`;

  const detailParts: string[] = [];
  if (car.registration_year) detailParts.push(String(car.registration_year));
  if (car.mileage_km)
    detailParts.push(`${numberFormatter.format(car.mileage_km)} km`);
  if (car.transmission) detailParts.push(car.transmission);
  if (car.fuel_type) detailParts.push(car.fuel_type);

  const description = `${detailParts.join(" · ")} — Deri në Durrës, me garancion nga Dreshaj Elite Cars.`;

  const ogImageUrl = `${SITE_URL}/api/cars/${encodeURIComponent(car.source_id)}/og?photo=0`;
  const thumbnail = car.image_url || (car.images && car.images[0]) || ogImageUrl;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/cars/${encodeURIComponent(car.source_id)}`,
    },
    openGraph: {
      title: `${car.make} ${car.model} — ${displayPrice}`,
      description,
      url: `${SITE_URL}/cars/${encodeURIComponent(car.source_id)}`,
      images: [
        {
          url: ogImageUrl,
          width: 1080,
          height: 1920,
          alt: `${car.make} ${car.model}`,
        },
        {
          url: thumbnail,
          width: 800,
          height: 600,
          alt: `${car.make} ${car.model}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${car.make} ${car.model} — ${displayPrice}`,
      description,
      images: [thumbnail],
    },
  };
}

export default function CarDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
