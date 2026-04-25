import Image from "next/image";
import styles from "../app/page.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <Image
              src="/images/logo.png"
              alt="Dreshaj Elite Cars"
              width={200}
              height={100}
              priority
              style={{ objectFit: "contain" }}
            />
          </div>
          <nav className={styles.headerNav}>
          </nav>
        </div>
        <div className={styles.headerRight}>
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
  );
}
