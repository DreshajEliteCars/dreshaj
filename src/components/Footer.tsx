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
            <ul className={styles.classicLinks}>
              <li><a href="#">{t("about")}</a></li>
              <li><a href="#">{t("contact")}</a></li>
              <li><a href="#">{t("data_protection")}</a></li>
            </ul>
          </div>

          <div className={styles.classicMiddle}>
            <div className={styles.classicHeader}>Veturat më të shitura</div>
            <ul className={styles.classicLinks}>
              <li><a href="#">Audi</a></li>
              <li><a href="#">Volkswagen</a></li>
              <li><a href="#">BMW</a></li>
              <li><a href="#">Mercedes-Benz</a></li>
            </ul>
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
