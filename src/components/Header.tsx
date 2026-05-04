"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./Header.module.css";
import { useLanguage } from "../context/LanguageContext";

export default function Header() {
  const { language, setLanguage, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <div className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </div>
            <Link href="/" className={styles.logo}>
              <Image
                src="/images/logo.png"
                alt="Dreshaj Elite Cars"
                width={200}
                height={100}
                priority
                style={{ objectFit: "contain" }}
              />
            </Link>
            <nav className={styles.headerNav}>
              <Link href="/">{t("home")}</Link>
              <Link href="/contact">{t("contact")}</Link>
              <Link href="/garancioni">{t("nav_warranty")}</Link>
              <Link href="/kalkulatori">{t("nav_calculator")}</Link>
            </nav>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.langSelector} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as "sq" | "en")}
                style={{ 
                  appearance: 'none', 
                  background: 'transparent', 
                  border: 'none', 
                  outline: 'none', 
                  color: 'inherit', 
                  fontFamily: 'inherit',
                  fontWeight: 600, 
                  fontSize: '15px',
                  cursor: 'pointer',
                  paddingRight: '16px'
                }}
              >
                <option value="sq" style={{ background: '#1c1c1c', color: 'white' }}>Shqip</option>
                <option value="en" style={{ background: '#1c1c1c', color: 'white' }}>English</option>
              </select>
              <svg viewBox="0 0 12 12" fill="currentColor" style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '12px', height: '12px' }}>
                <path d="M2 4l4 4 4-4z" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE MENU DROPDOWN */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <div className={styles.mobileMenuInner}>
            <Link href="/" className={styles.mobileMenuItem} onClick={() => setMenuOpen(false)}>
              {t("home")}
            </Link>
            <Link href="/contact" className={styles.mobileMenuItem} onClick={() => setMenuOpen(false)}>
              {t("contact")}
            </Link>
            <Link href="/garancioni" className={styles.mobileMenuItem} onClick={() => setMenuOpen(false)}>
              {t("nav_warranty")}
            </Link>
            <Link href="/kalkulatori" className={styles.mobileMenuItem} onClick={() => setMenuOpen(false)}>
              {t("nav_calculator")}
            </Link>
            <div className={styles.mobileMenuItem} style={{ position: 'relative' }}>
              <select 
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value as "sq" | "en");
                  setMenuOpen(false);
                }}
                className={styles.mobileMenuSelect}
              >
                <option value="sq">Shqip</option>
                <option value="en">English</option>
              </select>
              <svg viewBox="0 0 12 12" fill="#333" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '12px', height: '12px' }}>
                <path d="M2 4l4 4 4-4z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
