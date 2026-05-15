import type { MetadataRoute } from "next";
import { getServerSupabase } from "../lib/supabaseServer";

const SITE_URL = "https://dreshajelitecars.com";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // regenerate at most once per hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/cars`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/garancioni`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/kalkulatori`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic car pages
  let carPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = getServerSupabase();
    if (supabase) {
      const { data } = await supabase
        .from("cars")
        .select("source_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5000);

      if (data) {
        carPages = data.map((car) => ({
          url: `${SITE_URL}/cars/${encodeURIComponent(car.source_id)}`,
          lastModified: car.updated_at ? new Date(car.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));
      }
    }
  } catch (err) {
    console.warn("[sitemap] Failed to fetch cars:", err);
  }

  return [...staticPages, ...carPages];
}
