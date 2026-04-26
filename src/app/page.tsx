"use client";

import Header from "../components/Header";
import SearchHero from "../components/SearchHero";
import BodyTypeGrid from "../components/BodyTypeGrid";
import CarGrid from "../components/CarGrid";
import ProcessSection from "../components/ProcessSection";
import Footer from "../components/Footer";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../context/LanguageContext";

const DUMMY_CARS = [
  {
    img: "/images/listing-1.png",
    badge: "AUTOFLEX24",
    title: "Volkswagen Tiguan 2.0 TDI",
    details: "2021 · 45,000 km · Diesel · 150 HP",
    price: "€28,900",
  },
  {
    img: "/images/listing-2.png",
    badge: null,
    title: "BMW 320d xDrive Touring",
    details: "2020 · 62,000 km · Diesel · 190 HP",
    price: "€32,500",
  },
  {
    img: "/images/listing-3.png",
    badge: null,
    title: "Volkswagen Golf 1.5 TSI",
    details: "2022 · 28,000 km · Petrol · 130 HP",
    price: "€24,700",
  },
  {
    img: "/images/listing-4.png",
    badge: null,
    title: "Audi Q5 40 TDI quattro",
    details: "2021 · 38,000 km · Diesel · 204 HP",
    price: "€41,900",
  },
];

export default function Home() {
  const { t } = useLanguage();
  return (
    <>
      <Header />
      <SearchHero />
      <div className={styles.mainContent}>
        <BodyTypeGrid />
        <CarGrid title={t("most_wanted")} cars={DUMMY_CARS} showOpacity={false} />
        
        <ProcessSection />

        <CarGrid title={t("recently_sold")} cars={DUMMY_CARS.map(c => ({ ...c, badge: "SHITUR" }))} showOpacity={true} />

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
