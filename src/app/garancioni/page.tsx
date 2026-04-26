"use client";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "./garancioni.module.css";
import { useLanguage } from "../../context/LanguageContext";
import Link from "next/link";

export default function Garancioni() {
  const { t } = useLanguage();

  const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );

  const XIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  return (
    <>
      <Header />
      
      <main className={styles.container}>
        <div style={{ marginBottom: "20px" }}>
          <Link href="/" style={{ color: "#0056b3", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px", background: "#f0f6ff", padding: "8px 16px", borderRadius: "8px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Kthehu në ballinë
          </Link>
        </div>
        <h1 className={styles.pageTitle}>Garancioni</h1>
        

        {/* Garancioni Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Garancioni</h2>
          
          <div className={styles.tableContainer}>
            <table className={styles.warrantyTable}>
              <thead>
                <tr>
                  <th>Pika e Garancionit</th>
                  <th>Përshkrimi</th>
                  <th>Mbulueshmëria</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.itemTitle}>Dorëzimi i veturës</td>
                  <td className={styles.itemDesc}>Dorëzimi i veturës sipas numrit të shasisë të prezantuar gjatë inspektimit.</td>
                  <td className={styles.statusCovered}><CheckIcon /> Mbulohet</td>
                </tr>
                <tr>
                  <td className={styles.itemTitle}>Kilometrat</td>
                  <td className={styles.itemDesc}>Të garantuara</td>
                  <td className={styles.statusCovered}><CheckIcon /> Mbulohet</td>
                </tr>
                <tr>
                  <td className={styles.itemTitle}>Motori</td>
                  <td className={styles.itemDesc}>Pjesët e brendshme jo-harxhuese</td>
                  <td className={styles.statusCovered}><CheckIcon /> Mbulohet</td>
                </tr>
                <tr>
                  <td className={styles.itemTitle}>Ndërruesi i shpejtësive (Transmisioni)</td>
                  <td className={styles.itemDesc}>Pjesët e brendshme jo-harxhuese</td>
                  <td className={styles.statusCovered}><CheckIcon /> Mbulohet</td>
                </tr>
                <tr>
                  <td className={styles.itemTitle}>Dëmtime gjatë transportit</td>
                  <td className={styles.itemDesc}>Dritat, xhamat, dyert, panelet, parakolpët dhe prapakolpët</td>
                  <td className={styles.statusCovered}><CheckIcon /> Mbulohet</td>
                </tr>
                <tr>
                  <td className={styles.itemTitle}>Veturat nuk janë të fundosura në ujë</td>
                  <td className={styles.itemDesc}>I/e garantuar</td>
                  <td className={styles.statusCovered}><CheckIcon /> Mbulohet</td>
                </tr>
                <tr>
                  <td className={styles.itemTitle}>Siguri dokumentacioni dhe pronësia</td>
                  <td className={styles.itemDesc}>Dokumentacion origjinal, vetura nuk është e vjedhur; mbrojtje nga falsifikime dokumentesh</td>
                  <td className={styles.statusCovered}><CheckIcon /> Mbulohet</td>
                </tr>
                <tr>
                  <td className={styles.itemTitle}>Çelësi primar</td>
                  <td className={styles.itemDesc}>Në rast mungese të çelësit primar, kompania rimburson koston e çelësit të ri</td>
                  <td className={styles.statusCovered}><CheckIcon /> Mbulohet</td>
                </tr>
                <tr>
                  <td className={styles.itemTitle}>Përjashtimet</td>
                  <td className={styles.itemDesc}>Aksesorët, çelësi i dytë, tepihët, goma rezervë, dhe gjëra tjera lëvizëse</td>
                  <td className={styles.statusNotCovered}><XIcon /> Nuk mbulohet</td>
                </tr>
                <tr>
                  <td className={styles.itemTitle}>Kohëzgjatja e kompensimit</td>
                  <td className={styles.itemDesc}>Kompensimi kryhet brenda 14 ditëve pune nga pranimi i kërkesës me shkrim (apo në formë elektronike)</td>
                  <td className={styles.statusCovered}><CheckIcon /> Mbulohet</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className={styles.disclaimer}>
            *Kjo tabelë është përmbledhje e garancionit të plotë të kompanisë. Për garancionin e plotë na kontaktoni.
          </p>
        </section>

      </main>

      <Footer />
    </>
  );
}
