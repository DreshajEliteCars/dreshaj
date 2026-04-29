"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./Header.module.css";
import { useLanguage } from "../context/LanguageContext";

export default function Header() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerLeft}>
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
  );
}
