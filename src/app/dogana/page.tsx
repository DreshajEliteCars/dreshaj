"use client";

import styles from "./page.module.css";
import rootStyles from "../page.module.css";
import Link from "next/link";
import Image from "next/image";

export default function DoganaPage() {
  return (
    <>
      {/* ===== HEADER ===== */}
      <header className={rootStyles.header}>
        <div className={rootStyles.headerInner}>
          <div className={rootStyles.headerLeft}>
            <div className={rootStyles.logo}>
              <Image
                src="/images/logo.png"
                alt="Dreshaj Elite Cars"
                width={200}
                height={100}
                priority
                style={{ objectFit: "contain" }}
              />
            </div>
            <nav className={rootStyles.headerNav}>
            </nav>
          </div>
          <div className={rootStyles.headerRight}>
            <Link href="/dogana">
              <button className={rootStyles.calcButton}>Kalkulo doganen</button>
            </Link>
            <span className={rootStyles.starIcon}>★</span>
            <div className={rootStyles.langSelector}>
              Shqip
              <svg viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 4l4 4 4-4z" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
        <div className={styles.container}>
          <Link href="/" style={{ color: "#007bff", textDecoration: "none", marginBottom: "32px", display: "inline-block", fontWeight: "500" }}>
            ← Kthehu tek faqja kryesore
          </Link>
          
          <h1 className={styles.headerTitle}>Kalkulatori i Doganës</h1>
          <p className={styles.headerDesc}>
            Për të marrë një vlerësim të përafërt të taksave doganore për importin e një automjeti në Kosovë, ju lutem përdorni këtë mjet. Ky vlerësim është vetëm një vlerësim i përafërt dhe nuk është i saktë. Për një vlerësim më të saktë dhe të detajuar, ose për çdo pyetje të mëtejshme, ju lutemi kontaktoni stafin tonë.
          </p>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Të dhënat e automjetit</h2>
            
            <div className={styles.formGrid}>
              {/* Vlera */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Vlera e Veturës (€)
                </label>
                <input type="number" className={styles.input} defaultValue="10000" />
              </div>

              {/* Viti */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Viti i Prodhimit
                </label>
                <div className={styles.selectWrapper}>
                  <select className={styles.select} defaultValue="2020">
                    <option>2026</option>
                    <option>2025</option>
                    <option>2024</option>
                    <option>2023</option>
                    <option>2022</option>
                    <option>2021</option>
                    <option>2020</option>
                    <option>2019</option>
                    <option>2018</option>
                    <option>2017</option>
                    <option>2016</option>
                    <option>2015</option>
                  </select>
                  <span className={styles.selectArrow}>▾</span>
                </div>
              </div>

              {/* Kubikazha */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Kubikazha (cm³)
                </label>
                <div className={styles.selectWrapper}>
                  <select className={styles.select} defaultValue="0 - 2000">
                    <option>0 - 2000</option>
                    <option>2001 - 3000</option>
                    <option>Mbi 3000</option>
                  </select>
                  <span className={styles.selectArrow}>▾</span>
                </div>
              </div>
            </div>

            <div className={styles.checkboxGroup}>
              <input type="checkbox" id="veture-e-re" className={styles.checkbox} />
              <label htmlFor="veture-e-re" className={styles.checkboxLabel}>
                Veturë e re
              </label>
            </div>
          </div>

          {/* ===== TAX SUMMARY CARD ===== */}
          <div className={styles.summaryCard}>
            <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M7 15h4"/>
                <path d="M7 19h10"/>
                <path d="M13 15h4"/>
              </svg>
              Përmbledhja e Taksave
            </h2>
            
            <div className={styles.summaryRow}>
              <span>Akciza</span>
              <span className={styles.summaryValue}>400 €</span>
            </div>
            
            <div className={styles.summaryRow}>
              <span>Tatimi në Import (10%)</span>
              <span className={styles.summaryValue}>1.000 €</span>
            </div>
            
            <div className={styles.summaryRow}>
              <span>TVSH (18%)</span>
              <span className={styles.summaryValue}>2.052 €</span>
            </div>
            
            <div className={styles.divider}></div>
            
            <div className={styles.summaryRowTotal}>
              <span>Dogana (Totali i Taksave)</span>
              <span className={styles.summaryTotalValueBlue}>3.452 €</span>
            </div>
            
            <div className={styles.divider}></div>
            
            <div className={styles.summaryRowGrandTotal}>
              <span>Totali (Vetura + Dogana)</span>
              <span>13.452 €</span>
            </div>
          </div>

        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className={rootStyles.footer}>
        <div className={rootStyles.footerInner}>
          <div className={rootStyles.footerMain}>
            
            {/* Column 1: Brand */}
            <div className={rootStyles.footerCol}>
              <div className={rootStyles.footerBrand}>
                DRESHAJ<br />ELITE CARS
              </div>
              <p className={rootStyles.footerSlogan}>Besueshmëri në Çdo Hap!</p>
            </div>

            {/* Column 2: Links */}
            <div className={rootStyles.footerCol}>
              <h4 className={rootStyles.footerColTitle}>Linqe të Shpejta</h4>
              <ul className={rootStyles.footerLinks}>
                <li><a href="#">Ballina</a></li>
                <li><a href="#">Inventari</a></li>
                <li><a href="#">Të Ruajtura</a></li>
              </ul>
            </div>

            {/* Column 3: Contact */}
            <div className={rootStyles.footerCol}>
              <h4 className={rootStyles.footerColTitle}>Kontakti</h4>
              <ul className={rootStyles.footerContact}>
                <li>Shpend Malaj, Prishtinë, Kosovë</li>
                <li>info@dreshajelitecars.com</li>
                <li>+383 44 202 673</li>
              </ul>
            </div>

            {/* Column 4: Socials */}
            <div className={rootStyles.footerCol}>
              <h4 className={rootStyles.footerColTitle}>Na Ndiqni</h4>
              <div className={rootStyles.footerSocials}>
                {/* Facebook Icon */}
                <a href="#" aria-label="Facebook">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/></svg>
                </a>
                {/* Instagram Icon */}
                <a href="https://www.instagram.com/dreshajelitecars/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                {/* TikTok Icon */}
                <a href="#" aria-label="TikTok">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
                {/* WhatsApp Icon */}
                <a href="#" aria-label="WhatsApp">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.119.553 4.174 1.603 5.986L.045 23.945l6.104-1.601A11.968 11.968 0 0 0 12.031 24c6.645 0 12.031-5.384 12.031-12.031C24.062 5.385 18.677 0 12.031 0zm6.541 17.382c-.279.791-1.373 1.517-2.146 1.665-.733.14-1.66.27-4.733-1.002-3.712-1.536-6.106-5.334-6.289-5.58-.184-.246-1.5-1.996-1.5-3.805 0-1.81 1.01-2.696 1.341-3.064.296-.328.643-.41.859-.41.215 0 .43.003.626.012.2.01.468-.077.733.56.279.673.953 2.33 1.036 2.494.084.164.14.356.028.586-.112.229-.168.373-.335.569-.168.196-.356.417-.503.551-.168.164-.344.341-.148.678.195.336.873 1.442 1.874 2.333 1.295 1.152 2.368 1.51 2.704 1.668.336.158.533.136.73-.087.195-.224.84-1.02 1.066-1.373.226-.353.453-.293.759-.176.307.118 1.942.915 2.277 1.082.335.167.558.25.642.392.084.143.084.831-.195 1.622z"/></svg>
                </a>
              </div>
            </div>

          </div>

          <div className={rootStyles.footerBottom}>
            © 2026 Dreshaj Elite Cars. Të gjitha të drejtat e rezervuara.
          </div>
        </div>
      </footer>
    </>
  );
}
