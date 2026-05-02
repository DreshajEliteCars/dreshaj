"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useLanguage } from "../../context/LanguageContext";
import styles from "./contact.module.css";

export default function ContactPage() {
  const { language, t } = useLanguage();
  const sq = language === "sq";

  return (
    <>
      <Header />
      <div className={styles.pageWrapper}>
        <Suspense fallback={null}>
          <BackLink />
        </Suspense>
        <h1 className={styles.pageTitle}>
          {sq ? "Na Kontaktoni" : "Contact Us"}
        </h1>
        <p className={styles.pageSubtitle}>
          {sq
            ? "Keni ndonjë pyetje? Ne jemi këtu për t'ju ndihmuar. Na kontaktoni përmes telefonit ose na vizitoni në lokacionin tonë."
            : "Have a question? We are here to help. Contact us via phone or visit our location."}
        </p>

        <div className={styles.contactContainer}>
          <div className={styles.infoCard}>
            <h2 className={styles.cardTitle}>{sq ? "Informacionet e Kontaktit" : "Contact Information"}</h2>
            
            <div className={styles.contactMethod}>
              <div className={styles.iconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <div className={styles.methodDetails}>
                <span className={styles.methodLabel}>{sq ? "Telefoni / WhatsApp" : "Phone / WhatsApp"}</span>
                <a href="https://wa.me/37744202673" target="_blank" rel="noopener noreferrer" className={styles.methodValue}>
                  +377 44 202 673
                </a>
              </div>
            </div>

            <div className={styles.contactMethod}>
              <div className={styles.iconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className={styles.methodDetails}>
                <span className={styles.methodLabel}>{sq ? "Orari i Punës" : "Working Hours"}</span>
                <span className={styles.methodValue}>
                  {sq ? "E Hënë - E Diel: 08:00 - 22:00" : "Monday - Sunday: 08:00 - 22:00"}
                </span>
              </div>
            </div>

            <div className={styles.contactMethod}>
              <div className={styles.iconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <div className={styles.methodDetails}>
                <span className={styles.methodLabel}>Email</span>
                <a href="mailto:dreshajelitecars@gmail.com" className={styles.methodValue}>
                  dreshajelitecars@gmail.com
                </a>
              </div>
            </div>

            <div className={styles.contactMethod}>
              <div className={styles.iconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div className={styles.methodDetails}>
                <span className={styles.methodLabel}>{t("location")}</span>
                <span className={styles.methodValue}>
                  Peja, Nabergjan Rruga Smail Quku 34
                </span>
              </div>
            </div>
            
            <a href="https://wa.me/37744202673" target="_blank" rel="noopener noreferrer" className={styles.whatsappBtn}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.41A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#fff"/>
                  <path d="M8.5 8.5c.2-.5.7-.8 1.2-.8.3 0 .5.1.7.2l.9 2-.6.9c.4.7.9 1.4 1.5 1.9l1-.5 2 .9c.2.2.3.5.2.8-.3.8-1.1 1.6-2 1.6-2.5-.2-5.8-3.5-5.8-6 0-.9.7-1.7 1.5-2h.4z" fill="#25D366"/>
                </svg>
              {sq ? "Dërgo mesazh në WhatsApp" : "Message on WhatsApp"}
            </a>
          </div>

          <div className={styles.mapCard}>
            <a 
              href="https://maps.app.goo.gl/xUmUgjiD2Vo6gX4n7" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.mapLink}
            >
              <iframe 
                src="https://maps.google.com/maps?q=34%20Smail%20Quku,%20Nabërgjan%2030000&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                className={styles.mapIframe}
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function BackLink() {
  const { t } = useLanguage();
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
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
