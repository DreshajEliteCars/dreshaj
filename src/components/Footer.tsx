import styles from "../app/page.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerTop}>
          <a href="#" className={styles.toTop}>Kthehu lart ↑</a>
        </div>

        <div className={styles.footerMain}>
          <div className={styles.footerLeft}>
            <div className={styles.footerBrand}>Dreshaj Elite Cars</div>
            <ul className={styles.footerLinks}>
              <li><a href="#">Kompania</a></li>
              <li><a href="#">Rreth Dreshaj Elite Cars</a></li>
              <li><a href="#">Kontakt</a></li>
            </ul>
          </div>
          <div className={styles.footerRight}>
            <div className={styles.appLinks}>
            </div>
            <div className={styles.footerLang}>
              <span className={styles.footerSelectArrow}>▾</span>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          © Copyright 2026 by Dreshaj Elite Cars. Të gjitha të drejtat e rezervuara.
        </div>
      </div>
    </footer>
  );
}
