import styles from "./ProcessSection.module.css";
import Image from "next/image";

export default function ProcessSection() {
  return (
    <section className={styles.processSection}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Proces i thjeshtë, rezultat i sigurt.</h2>
        <p className={styles.subtitle}>Më shumë se vetura — ne ofrojmë<br/>besim dhe përvojë të sigurt blerjeje.</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.imageWrapper}>
            <Image src="/images/get-car-inspected.jpg" alt="Inspektim i detajuar" fill style={{ objectFit: "cover" }} />
          </div>
          <h3 className={styles.cardTitle}>Inspektim i detajuar</h3>
          <p className={styles.cardText}>
            Çdo veturë inspektohet nga ekspertë për gjendjen reale teknike dhe vizuale, duke garantuar transparencë dhe siguri në blerje.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.imageWrapper}>
            <Image src="/images/kontrat.png" alt="Kontratë dhe garancion" fill style={{ objectFit: "cover" }} />
          </div>
          <h3 className={styles.cardTitle}>Kontratë dhe garancion</h3>
          <p className={styles.cardText}>
            Çdo blerje shoqërohet me kontratë zyrtare dhe garancion për dokumentacionin dhe gjendjen reale të veturës.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.imageWrapper}>
            <Image src="/images/siguria.png" alt="Proces i qartë dhe sigurt" fill style={{ objectFit: "cover" }} />
          </div>
          <h3 className={styles.cardTitle}>Proces i qartë dhe sigurt</h3>
          <p className={styles.cardText}>
            Çdo hap — nga përzgjedhja deri te dorëzimi — realizohet me transparencë të plotë dhe informim të vazhdueshëm për klientin.
          </p>
        </div>
      </div>
    </section>
  );
}
