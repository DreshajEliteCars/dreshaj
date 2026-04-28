"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useLanguage } from "../../context/LanguageContext";
import styles from "./page.module.css";

const WARRANTY_ROWS: {
  point: { sq: string; en: string };
  desc: { sq: string; en: string };
  covered: boolean;
}[] = [
  {
    point: { sq: "Dorëzimi i veturës", en: "Vehicle Delivery" },
    desc: {
      sq: "Dorëzimi i veturës sipas numrit të shasisë të prezantuar gjatë inspektimit.",
      en: "Vehicle delivery according to the chassis number presented during inspection.",
    },
    covered: true,
  },
  {
    point: { sq: "Kilometrat", en: "Mileage" },
    desc: { sq: "Të garantuara", en: "Guaranteed" },
    covered: true,
  },
  {
    point: { sq: "Motori", en: "Engine" },
    desc: { sq: "Pjesët e brendshme jo-harxhuese", en: "Non-consumable internal parts" },
    covered: true,
  },
  {
    point: { sq: "Ndërruesi i shpejtësive (Transmisioni)", en: "Gearbox (Transmission)" },
    desc: { sq: "Pjesët e brendshme jo-harxhuese", en: "Non-consumable internal parts" },
    covered: true,
  },
  {
    point: { sq: "Dëmtime gjatë transportit", en: "Damage During Transport" },
    desc: {
      sq: "Dritat, xhamat, dyert, panelet, parakolpët dhe prapakolpët",
      en: "Lights, glass, doors, panels, front and rear bumpers",
    },
    covered: true,
  },
  {
    point: { sq: "Veturat nuk janë të fundosura në ujë", en: "Not Water-Submerged" },
    desc: { sq: "I/e garantuar", en: "Guaranteed" },
    covered: true,
  },
  {
    point: { sq: "Siguri dokumentacioni dhe pronësia", en: "Documentation & Ownership Security" },
    desc: {
      sq: "Dokumentacion original, vetura nuk është e vjedhur; mbrojtje nga falsifikime dokumentesh",
      en: "Original documentation, vehicle is not stolen; protection against document forgery",
    },
    covered: true,
  },
  {
    point: { sq: "Çelësi primar", en: "Primary Key" },
    desc: {
      sq: "Në rast mungese të çelësit primar, kompania rimburson koston e çelësit të ri",
      en: "In case of missing primary key, the company reimburses the cost of a new key",
    },
    covered: true,
  },
  {
    point: { sq: "Përjashtimet", en: "Exclusions" },
    desc: {
      sq: "Aksesorët, çelësi i dytë, tepihët, goma rezervë, dhe gjëra tjera lëvizëse",
      en: "Accessories, second key, floor mats, spare tire, and other moveable items",
    },
    covered: false,
  },
  {
    point: { sq: "Kohëzgjatja e kompensimit", en: "Compensation Timeline" },
    desc: {
      sq: "Kompensimi kryhet brenda 14 ditëve pune nga pranimi i kërkesës me shkrim (apo në formë elektronike)",
      en: "Compensation is processed within 14 business days of receiving a written (or electronic) request",
    },
    covered: true,
  },
];

export default function GarancioniPage() {
  const { language } = useLanguage();
  const sq = language === "sq";

  return (
    <>
      <Header />
      <div className={styles.pageWrapper}>
        {/* useSearchParams must live inside a Suspense boundary in the App Router. */}
        <Suspense fallback={null}>
          <BackLink />
        </Suspense>
        <h1 className={styles.pageTitle}>
          {sq ? "Garancioni i Kompanisë" : "Company Warranty"}
        </h1>
        <p className={styles.pageSubtitle}>
          {sq
            ? "Tabela e mëposhtme paraqet pikat kryesore të mbulimit të garancisë së ofruar nga Dreshaj Elite Cars."
            : "The table below outlines the key coverage points of the warranty provided by Dreshaj Elite Cars."}
        </p>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{sq ? "Pika e Garancionit" : "Warranty Point"}</th>
                <th>{sq ? "Përshkrimi" : "Description"}</th>
                <th>{sq ? "Mbulueshmëria" : "Coverage"}</th>
              </tr>
            </thead>
            <tbody>
              {WARRANTY_ROWS.map((row, i) => (
                <tr key={i}>
                  <td>
                    <span className={styles.pointName}>
                      {sq ? row.point.sq : row.point.en}
                    </span>
                  </td>
                  <td>{sq ? row.desc.sq : row.desc.en}</td>
                  <td>
                    {row.covered ? (
                      <span className={styles.covered}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {sq ? "Mbulohet" : "Covered"}
                      </span>
                    ) : (
                      <span className={styles.notCovered}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        {sq ? "Nuk mbulohet" : "Not covered"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={styles.footnote}>
          {sq
            ? "* Kjo tabelë është përmbledhje e garancionit të plotë të kompanisë. Për garancionin e plotë na kontaktoni."
            : "* This table is a summary of the company's full warranty. For the full warranty, please contact us."}
        </p>
      </div>
      <Footer />
    </>
  );
}

/**
 * Smart "Kthehu mbrapa" button.
 *
 * - If we arrived from a specific car (the warranty CTA on /cars/[id]
 *   passes ?from=<source_id>), navigate straight back to that car.
 *   This is robust even if the page was opened in a new tab — there's
 *   no router history but we still know where to go.
 * - Otherwise, prefer the browser back button so the user lands on
 *   whatever page they came from (footer link, direct link, etc.).
 * - If there's no history at all (direct visit / fresh tab), fall
 *   back to the cars listing.
 */
function BackLink() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const handleClick = () => {
    if (from) {
      router.push(`/cars/${encodeURIComponent(from)}`);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/cars");
  };

  return (
    <button type="button" className={styles.backLink} onClick={handleClick}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {t("back")}
    </button>
  );
}
