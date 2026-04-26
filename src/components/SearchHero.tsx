"use client";

import { useState } from "react";
import styles from "../app/page.module.css";

export default function SearchHero() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);

  return (
    <>
      <section className={styles.searchSection}>
        <div className={styles.searchBox}>
          {/* Tabs */}
          <div className={styles.searchTabs}>
            <div className={`${styles.searchTab} ${styles.searchTabActive}`}>
              {/* Car icon */}
              <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 18h20M6 18l2-6h12l2 6M8 12l1-4h10l1 4" />
                <circle cx="8" cy="20" r="2" />
                <circle cx="20" cy="20" r="2" />
              </svg>
            </div>
          </div>

          <div className={styles.searchBody}>
            <div className={styles.searchTitle}>Gjeni makina të përdorura dhe të reja</div>

            <div className={styles.searchRow}>
              <div className={styles.selectWrapper}>
                <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                  <option value="" disabled>Marka</option>
                  <option>Audi</option>
                  <option>BMW</option>
                  <option>Mercedes-Benz</option>
                  <option>Volkswagen</option>
                  <option>Toyota</option>
                  <option>Ford</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
              <div className={styles.selectWrapper}>
                <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                  <option value="" disabled>Modeli</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
              <div className={styles.selectWrapper}>
                <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                  <option value="" disabled>Çmimi deri në (€)</option>
                  <option>€5,000</option>
                  <option>€10,000</option>
                  <option>€15,000</option>
                  <option>€20,000</option>
                  <option>€30,000</option>
                  <option>€50,000</option>
                  <option>€100,000</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
            </div>

            <div className={styles.searchRow2}>
              <div className={styles.selectWrapper} style={{ flex: "0 0 200px" }}>
                <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                  <option value="" disabled>Viti i regjistrimit nga</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                  <option>2020</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button className={styles.searchButton}>
                  Kërko
                </button>
                {hasFilters && (
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-and-icon-muted)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      textDecoration: 'underline'
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      setHasFilters(false);
                      const selects = document.querySelectorAll('select');
                      selects.forEach(s => s.value = '');
                    }}
                  >
                    Pastro Filtrat
                  </button>
                )}
              </div>
            </div>

            <a
              href="#"
              className={styles.refineLink}
              onClick={(e) => {
                e.preventDefault();
                setShowAdvanced(true);
              }}
            >
              Kërkimi i detajuar
            </a>
          </div>
        </div>
      </section>

      {/* ===== ADVANCED SEARCH MODAL ===== */}
      <div
        className={styles.modalOverlay}
        style={{ display: showAdvanced ? "flex" : "none" }}
        onClick={() => setShowAdvanced(false)}
      >
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Kërkimi i Detajuar</h2>
            <button className={styles.closeButton} onClick={() => setShowAdvanced(false)}>
              &times;
            </button>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.selectWrapper}>
              <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                <option value="" disabled>Kilometrazhi nga</option>
                <option>0 km</option>
                <option>50,000 km</option>
                <option>100,000 km</option>
                <option>150,000 km</option>
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
            <div className={styles.selectWrapper}>
              <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                <option value="" disabled>Kilometrazhi deri në</option>
                <option>50,000 km</option>
                <option>100,000 km</option>
                <option>150,000 km</option>
                <option>200,000 km</option>
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.selectWrapper}>
              <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                <option value="" disabled>Karburanti</option>
                <option>Diesel</option>
                <option>Petrol</option>
                <option>Elektrik</option>
                <option>Hibrid</option>
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
            <div className={styles.selectWrapper}>
              <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                <option value="" disabled>Transmisioni</option>
                <option>Automatike</option>
                <option>Manuale</option>
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '16px', justifyContent: 'flex-end', alignItems: 'center' }}>
            {hasFilters && (
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-and-icon-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'underline'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setHasFilters(false);
                  const selects = document.querySelectorAll('select');
                  selects.forEach(s => s.value = '');
                }}
              >
                Pastro Filtrat
              </button>
            )}
            <button
              className={styles.searchButton}
              style={{ flex: 'none', marginLeft: '0' }}
              onClick={() => setShowAdvanced(false)}
            >
              Aplikoni Filtrat
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
