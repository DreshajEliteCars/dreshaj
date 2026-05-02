"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import styles from "./BodyTypeGrid.module.css";

const BODY_TYPES = [
  { label: "SUV", icon: "/cars/suv_1x_car.png" },
  { label: "Kabriolet", icon: "/cars/convertible_1x_car.png" },
  { label: "Furgon", icon: "/cars/transport_1x_car.png" },
  { label: "Sedan", icon: "/cars/sedan_1x_car.png" },
  { label: "Kupe", icon: "/cars/coupe_1x_car.png" },
];

export default function BodyTypeGrid() {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 0);
    // Add a small buffer (e.g. 2px) to account for fractional pixel scrolling issues
    setShowRight(scrollLeft + clientWidth < scrollWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scrollRightBtn = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 150, behavior: "smooth" });
    }
  };

  const scrollLeftBtn = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -150, behavior: "smooth" });
    }
  };

  return (
    <div className={styles.bodyTypeSection}>
      <h2 className={styles.sectionTitle}>{t("search_by_body")}</h2>
      <div className={styles.bodyTypeGridWrapper}>
        {showLeft && (
          <button className={`${styles.scrollArrow} ${styles.scrollArrowLeft}`} onClick={scrollLeftBtn} aria-label="Scroll left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}
        
        <div className={styles.bodyTypeGrid} ref={scrollRef} onScroll={checkScroll}>
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
        
        {showRight && (
          <button className={`${styles.scrollArrow} ${styles.scrollArrowRight}`} onClick={scrollRightBtn} aria-label="Scroll right">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
