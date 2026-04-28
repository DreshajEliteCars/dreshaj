"use client";

import styles from "./Footer.module.css";
import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className={styles.classicFooter}>
      <div className={styles.classicFooterInner}>

        <div className={styles.classicMain}>
          <div className={styles.classicLeft}>
            <div className={styles.classicHeader}>
              Dreshaj Elite Cars
            </div>
            <div className={styles.classicColTitle}>{t("company")}</div>
            <ul className={styles.classicLinks}>
              <li><a href="#">{t("about")}</a></li>
              <li><a href="#">{t("contact")}</a></li>
              <li><a href="/garancioni">{t("data_protection")}</a></li>
            </ul>

            <div className={styles.socialRow}>
              {/* Instagram */}
              <a
                href="https://www.instagram.com/dreshajelitecars"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
                aria-label="Instagram"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/37744202673"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
                aria-label="WhatsApp"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.41A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25D366"/>
                  <path d="M8.5 8.5c.2-.5.7-.8 1.2-.8.3 0 .5.1.7.2l.9 2-.6.9c.4.7.9 1.4 1.5 1.9l1-.5 2 .9c.2.2.3.5.2.8-.3.8-1.1 1.6-2 1.6-2.5-.2-5.8-3.5-5.8-6 0-.9.7-1.7 1.5-2h.4z" fill="#fff"/>
                </svg>
              </a>
            </div>
          </div>

          <div className={styles.classicRight}>
            <div className={styles.classicHeader}>{t("location")}</div>
            <iframe 
              src="https://maps.google.com/maps?q=Bulevardi%20Nena%20Tereza,%20Pristina&t=&z=14&ie=UTF8&iwloc=&output=embed" 
              width="260" 
              height="140" 
              style={{ border: 0, borderRadius: '8px', display: 'inline-block' }} 
              allowFullScreen 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        <div className={styles.classicBottom}>
          © Copyright 2026 by Dreshaj Elite Cars. {t("all_rights")}
        </div>
      </div>
    </footer>
  );
}
