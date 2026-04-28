"use client";

import Link from "next/link";
import { useLanguage } from "../context/LanguageContext";
import styles from "./BodyTypeGrid.module.css";

// `label` values match the body-type filter values in
// src/app/cars/page.tsx BODY_TYPES, so the URL produced here lights up
// the matching tile in the /cars sidebar automatically.
const BODY_TYPES = [
  { label: "SUV", icon: "/cars/suv_1x_car.png" },
  { label: "Kabriolet", icon: "/cars/convertible_1x_car.png" },
  { label: "Furgon", icon: "/cars/transport_1x_car.png" },
  { label: "Sedan", icon: "/cars/sedan_1x_car.png" },
  { label: "Kupe", icon: "/cars/coupe_1x_car.png" },
];

export default function BodyTypeGrid() {
  const { t } = useLanguage();

  return (
    <div className={styles.bodyTypeSection}>
      <h2 className={styles.sectionTitle}>{t("search_by_body")}</h2>
      <div className={styles.bodyTypeGrid}>
        {BODY_TYPES.map((type) => (
          <Link
            key={type.label}
            href={`/cars?bodyTypes=${encodeURIComponent(type.label)}`}
            className={styles.bodyTypeItem}
            aria-label={`${t("search_by_body")}: ${type.label}`}
          >
            <div className={styles.bodyTypeIcon}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={type.icon} alt="" />
            </div>
            <span className={styles.bodyTypeLabel}>{type.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
