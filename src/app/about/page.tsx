"use client";

import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useLanguage } from "../../context/LanguageContext";
import styles from "./page.module.css";



export default function AboutPage() {
  const { language } = useLanguage();
  const sq = language === "sq";

  return (
    <>
      <Header />
      <div className={styles.pageWrapper}>

        {/* Back link */}
        <Link href="/" className={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {sq ? "Kthehu" : "Back"}
        </Link>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroLabel}>
            {sq ? "Rreth nesh" : "About us"}
          </div>
          <h1 className={styles.heroTitle}>Dreshaj Elite Cars</h1>
          <p className={styles.heroDesc}>
            {sq
              ? "Dreshaj Elite Cars është kompani e specializuar në importin dhe shitjen e veturave cilësore nga Koreja Jugore. Me ekspertizë të thellë në tregun e automjeteve, ne sjellim çdo muaj makinat më të mira direkt tek klientët tanë në Kosovë."
              : "Dreshaj Elite Cars is a company specializing in importing and selling quality vehicles from South Korea. With deep expertise in the automotive market, we bring the best cars every month directly to our customers in Kosovo."}
          </p>
        </div>



        {/* How it works */}
        <div className={styles.sectionTitle}>
          {sq ? "Si funksionon procesi" : "How it works"}
        </div>
        <div className={styles.stepsCard}>
          {[
            {
              n: "01",
              t: { sq: "Zgjidhni veturën", en: "Choose your car" },
              d: { sq: "Shfletoni inventarin tonë ose kërkoni modelin tuaj të preferuar.", en: "Browse our inventory or search for your preferred model." },
            },
            {
              n: "02",
              t: { sq: "Kontaktoni stafin", en: "Contact our team" },
              d: { sq: "Na kontaktoni në WhatsApp ose Instagram. Do t'ju dërgojmë çdo detaj dhe raport.", en: "Reach us on WhatsApp or Instagram. We'll send you every detail and report." },
            },
            {
              n: "03",
              t: { sq: "Importimi dhe dogana", en: "Import & customs" },
              d: { sq: "Ne menaxhojmë tërë procesin e importit, doganimit dhe transportit deri në Durrës.", en: "We handle the entire import, customs clearance and transport process to Durrës." },
            },
            {
              n: "04",
              t: { sq: "Dorëzimi i veturës", en: "Vehicle delivery" },
              d: { sq: "Vetura juaj dorëzohet me dokumentacion të plotë dhe garancion nga kompania.", en: "Your car is delivered with complete documentation and a company warranty." },
            },
          ].map((step) => (
            <div key={step.n} className={styles.step}>
              <div className={styles.stepNum}>{step.n}</div>
              <div className={styles.stepBody}>
                <div className={styles.stepTitle}>{sq ? step.t.sq : step.t.en}</div>
                <div className={styles.stepDesc}>{sq ? step.d.sq : step.d.en}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={styles.cta}>
          <div className={styles.ctaText}>
            {sq ? "Gati të gjeni veturën tuaj?" : "Ready to find your car?"}
          </div>
          <div className={styles.ctaBtns}>
            <Link href="/cars" className={styles.ctaBtnPrimary}>
              {sq ? "Shfleto inventarin →" : "Browse inventory →"}
            </Link>
            <a href="https://wa.me/37744202673" target="_blank" rel="noopener noreferrer" className={styles.ctaBtnSecondary}>
              {sq ? "Na kontaktoni" : "Contact us"}
            </a>
          </div>
        </div>

      </div>
      <Footer />
    </>
  );
}
