"use client";

import styles from "./kalkulatori.module.css";
import Link from "next/link";
import { useState } from "react";
import Footer from "../../components/Footer";
import Header from "../../components/Header";

// Akciza table: [0-2000cc, 2001-3000cc, 3001+cc]
// Years 2016+. Anything ≤ 2015 uses the 2016 row (oldest available bracket).
const AKCIZA_TABLE: Record<number, [number, number, number]> = {
  2016: [700,  800,  1800],
  2017: [600,  600,  1500],
  2018: [400,  400,  1000],
  2019: [400,  400,  1000],
  2020: [400,  400,  1000],
  2021: [400,  400,  1000],
  2022: [400,  400,  1000],
  2023: [400,  400,  1000],
  2024: [400,  400,  1000],
  2025: [400,  400,  1000],
  2026: [0,    400,  1000],
};

function getAkciza(year: number, cc: string): number {
  const clampedYear = Math.max(year, 2016);
  const row = AKCIZA_TABLE[clampedYear] ?? AKCIZA_TABLE[2016];
  if (cc === "0 - 2000") return row[0];
  if (cc === "2001 - 3000") return row[1];
  return row[2]; // 3001+
}

export default function Kalkulatori() {
  const [vlera, setVlera] = useState<string>("10000");
  const [viti, setViti] = useState<string>("2020");
  const [kubikazha, setKubikazha] = useState<string>("0 - 2000");

  const carValue = parseFloat(vlera) || 0;
  const year = parseInt(viti, 10);

  // Akciza based on year + CC range
  const exciseTax = getAkciza(year, kubikazha);

  // Import tax = 10% of car value
  const importTax = carValue * 0.10;

  // VAT = 18% of (car value + import tax + excise)
  const vatBase = carValue + importTax + exciseTax;
  const vatTax = vatBase * 0.18;

  const totalCustoms = importTax + exciseTax + vatTax;
  const grandTotal = carValue + totalCustoms;

  const formatEuro = (num: number) =>
    new Intl.NumberFormat("de-DE").format(Math.round(num)) + " €";

  return (
    <>
      <Header />

      <main className={styles.calcPage}>
        <div className={styles.calcContainer}>
          <Link href="/" style={{ color: '#0050d2', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '18px', marginBottom: '24px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Back
          </Link>
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
                  <option>2014</option>
                  <option>2013</option>
                  <option>2012</option>
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
              <span>TVSH — 18% × (Vlera + Akcizë + Tatim)</span>
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

      <Footer />
    </>
  );
}
