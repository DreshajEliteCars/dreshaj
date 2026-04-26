"use client";

import styles from "./kalkulatori.module.css";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Kalkulatori() {
  const [vlera, setVlera] = useState<string>("10000");
  const [viti, setViti] = useState<string>("2020");
  const [kubikazha, setKubikazha] = useState<string>("0 - 2000");
  const [isNew, setIsNew] = useState<boolean>(false);

  // Logic calculation
  const carValue = parseFloat(vlera) || 0;
  
  // Baseline excise for now (this can be expanded later into a full table)
  // E.g. assume 400€ for 0-2000cc from the screenshot.
  let exciseTax = 400;
  if (kubikazha === "2001 - 3000") exciseTax = 1000;
  if (kubikazha === "3001+") exciseTax = 2000;
  if (isNew) exciseTax = 0; // Example rule: maybe new cars have 0 excise

  // Import tax 10%
  const importTax = carValue * 0.10;

  // VAT 18% applied to (Car Value + Import Tax + Excise Tax)
  const vatBase = carValue + importTax + exciseTax;
  const vatTax = vatBase * 0.18;

  const totalCustoms = importTax + exciseTax + vatTax;
  const grandTotal = carValue + totalCustoms;

  const formatEuro = (num: number) => {
    return new Intl.NumberFormat('de-DE').format(Math.round(num)) + " €";
  };

  return (
    <>
      {/* ===== HEADER ===== */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>
              <Link href="/">
                <Image
                  src="/images/logo.png"
                  alt="Dreshaj Elite Cars"
                  width={200}
                  height={100}
                  priority
                  style={{ objectFit: "contain" }}
                />
              </Link>
            </div>
            <nav className={styles.headerNav}>
            </nav>
          </div>
          <div className={styles.headerRight}>
            <Link href="/" className={styles.calcButton}>Kthehu mbrapa</Link>
            <span className={styles.starIcon}>★</span>
            <div className={styles.langSelector}>
              Shqip
              <svg viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 4l4 4 4-4z" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* ===== CALCULATOR PAGE ===== */}
      <main className={styles.calcPage}>
        <div className={styles.calcContainer}>
          <h1 className={styles.pageTitle}>Kalkulatori i Doganës</h1>
          <p className={styles.pageDescription}>
            Për të marrë një vlerësim të përafërt të taksave doganore për importin e një automjeti në Kosovë, ju lutem përdorni këtë mjet. Ky vlerësim është vetëm një vlerësim i përafërt dhe nuk është i saktë. Për një vlerësim më të saktë dhe të detajuar, ose për çdo pyetje të mëtejshme, ju lutemi kontaktoni stafin tonë.
          </p>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Të dhënat e automjetit</h2>
            
            <div className={styles.formGrid}>
              {/* Vlera */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>
                  Vlera e Veturës (€)
                </label>
                <input 
                  type="number" 
                  className={styles.inputField} 
                  value={vlera}
                  onChange={(e) => setVlera(e.target.value)}
                  placeholder="Psh. 10000"
                />
              </div>

              {/* Viti */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Viti i Prodhimit
                </label>
                <select 
                  className={styles.selectField}
                  value={viti}
                  onChange={(e) => setViti(e.target.value)}
                >
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
              </div>

              {/* Kubikazha */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Kubikazha (cm³)
                </label>
                <select 
                  className={styles.selectField}
                  value={kubikazha}
                  onChange={(e) => setKubikazha(e.target.value)}
                >
                  <option>0 - 2000</option>
                  <option>2001 - 3000</option>
                  <option>3001+</option>
                </select>
              </div>
            </div>

            <label className={styles.checkboxGroup}>
              <input 
                type="checkbox" 
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
              />
              Veturë e re
            </label>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
              Përmbledhja e Taksave
            </h2>

            <div className={styles.summaryRow}>
              <span>Akciza</span>
              <span>{formatEuro(exciseTax)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Tatimi në Import (10%)</span>
              <span>{formatEuro(importTax)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>TVSH (18%)</span>
              <span>{formatEuro(vatTax)}</span>
            </div>
            
            <div className={`${styles.summaryRow} ${styles.blueRow}`}>
              <span>Dogana (Totali i Taksave)</span>
              <span>{formatEuro(totalCustoms)}</span>
            </div>

            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>Totali (Vetura + Dogana)</span>
              <span>{formatEuro(grandTotal)}</span>
            </div>

          </div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerMain}>
            
            {/* Column 1 */}
            <div className={styles.footerCol}>
              <h3 className={styles.footerLogoTitle}>DRESHAJ<br />ELITE CARS</h3>
              <p className={styles.footerText}>Besueshmëri në Çdo Hap!</p>
            </div>

            {/* Column 2 */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Linqe të Shpejta</h4>
              <ul className={styles.footerLinks}>
                <li><Link href="/">Ballina</Link></li>
                <li><Link href="/">Inventari</Link></li>
                <li><Link href="/">Të Ruajtura</Link></li>
              </ul>
            </div>

            {/* Column 3 */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Kontakti</h4>
              <p className={styles.footerText}>Shpend Malaj, Prishtinë,<br />Kosovë</p>
              <p className={styles.footerText} style={{ marginTop: "12px" }}>info@dreshajelitecars.com</p>
              <p className={styles.footerText} style={{ marginTop: "8px" }}>+383 44 202 673</p>
            </div>

            {/* Column 4 */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Na Ndiqni</h4>
              <div className={styles.footerSocials}>
                <a href="#" aria-label="Facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href="#" aria-label="Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href="#" aria-label="TikTok">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.23-.9 4.45-2.35 6.13-1.45 1.68-3.52 2.72-5.74 2.98-2.22.26-4.52-.09-6.42-1.25-1.9-1.16-3.32-2.98-3.95-5.11-.63-2.13-.42-4.46.61-6.43 1.03-1.97 2.78-3.48 4.88-4.17 2.1-.69 4.41-.53 6.38.45V14.1c-1.07-.64-2.35-.8-3.51-.43-1.16.37-2.13 1.25-2.6 2.37-.47 1.12-.4 2.4.19 3.47.59 1.07 1.65 1.83 2.85 2.03 1.2.2 2.46-.08 3.39-.77.93-.69 1.5-1.78 1.52-2.97.02-4.63.01-9.26.01-13.89z"/></svg>
                </a>
                <a href="#" aria-label="WhatsApp">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </a>
              </div>
            </div>

          </div>

          <div className={styles.footerBottom}>
            © 2026 Dreshaj Elite Cars. Të gjitha të drejtat e rezervuara.
          </div>
        </div>
      </footer>
    </>
  );
}
