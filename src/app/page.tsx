"use client";

import Header from "../components/Header";
import SearchHero from "../components/SearchHero";
import BodyTypeGrid from "../components/BodyTypeGrid";
import CarGrid from "../components/CarGrid";
import Footer from "../components/Footer";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../context/LanguageContext";
import { useState, useEffect } from "react";
import { getSupabase } from "../lib/supabase";
import { useShipPrice } from "../lib/useShipPrice";
import { applyShipPrice } from "../lib/appSettings";

export default function Home() {
  const { t } = useLanguage();
  const [localCars, setLocalCars] = useState<any[]>([]);
  const [famousCars, setFamousCars] = useState<any[]>([]);
  const shipPrice = useShipPrice();

  useEffect(() => {
    async function fetchLocalCars() {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data } = await supabase
        .from('local_cars')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      if (data) {
        setLocalCars(data);
      }
    }
    async function fetchFamousCars() {
      const supabase = getSupabase();
      if (!supabase) return;

      // Fetch a mix of famous brands, sorted by newest or most photos
      const { data } = await supabase
        .from('cars')
        .select('*')
        .in('make', ['BMW', 'Volkswagen', 'Mercedes-Benz', 'Audi'])
        .order('photo_count', { ascending: false })
        .limit(4);

      if (data) {
        setFamousCars(data);
      }
    }
    fetchLocalCars();
    fetchFamousCars();
  }, []);

  const localCarItems = localCars.map(c => {
    const parts = [];
    if (c.registration_year) parts.push(c.registration_year);
    if (c.mileage_km) parts.push(`${new Intl.NumberFormat("en-US").format(c.mileage_km)} km`);
    if (c.fuel_type) parts.push(c.fuel_type);

    return {
      img: c.image_url,
      title: c.title,
      details: parts.join(" · "),
      price: t("price_on_request") || "Kontakto për çmimin",
      badge: null,
      href: "https://wa.me/37744202673"
    };
  });

  const famousCarItems = famousCars.map(c => {
    const parts = [];
    if (c.registration_year) parts.push(c.registration_year);
    if (c.mileage_km) parts.push(`${new Intl.NumberFormat("en-US").format(c.mileage_km)} km`);
    if (c.fuel_type) parts.push(c.fuel_type);
    if (c.power_hp) parts.push(`${c.power_hp} HP`);

    const finalPrice = applyShipPrice(c.price_eur, shipPrice);
    const priceStr = finalPrice != null ? `€${new Intl.NumberFormat("en-US").format(finalPrice)}` : t("price_on_request") || "Kontakto për çmimin";

    const thumbnail = c.image_url || (c.images && c.images[0]) || "/cars/sedan_1x_car.png";

    return {
      img: thumbnail,
      title: `${c.make} ${c.model} ${c.trim || ''}`.trim(),
      details: parts.join(" · "),
      price: priceStr,
      badge: "Deri në Durrës",
      href: `/cars/${encodeURIComponent(c.source_id)}`
    };
  });

  return (
    <>
      <Header />
      <SearchHero />
      <div className={styles.mainContent}>
        <BodyTypeGrid />
        {famousCarItems.length > 0 && (
          <CarGrid title={t("most_wanted")} cars={famousCarItems} showOpacity={false} />
        )}
        {localCarItems.length > 0 && (
          <CarGrid title={t("in_stock_peja")} cars={localCarItems} showOpacity={false} />
        )}

        {/* CALCULATOR BANNER */}
        <div className={styles.calcBanner}>
          <div className={styles.calcBannerLeft}>
            <div className={styles.calcBannerTitle} dangerouslySetInnerHTML={{ __html: t("customs_calc_title") }}></div>
            <Link href="/kalkulatori" className={styles.calcBannerLink}>
              {t("calc_now")}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <div className={styles.calcBannerRight}>
            <img src="/images/this.png" alt="Auto illustration" width="200" height="auto" className={styles.calcBannerImage} />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
