import styles from "./page.module.css";
import Image from "next/image";

export default function Home() {
  return (
    <>
      {/* ===== HEADER ===== */}
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

      {/* ===== SEARCH SECTION ===== */}
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

          {/* Search Body */}
          <div className={styles.searchBody}>
            <div className={styles.searchTitle}>Gjeni makina të përdorura dhe të reja</div>

            {/* Row 1: Make, Model, Price */}
            <div className={styles.searchRow}>
              <div className={styles.selectWrapper}>
                <select className={styles.selectField} defaultValue="">
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
                <select className={styles.selectField} defaultValue="">
                  <option value="" disabled>Modeli</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
              <div className={styles.selectWrapper}>
                <select className={styles.selectField} defaultValue="">
                  <option value="" disabled>Çmimi deri në (€)</option>
                  <option>€5,000</option>
                  <option>€10,000</option>
                  <option>€15,000</option>
                  <option>€20,000</option>
                  <option>€30,000</option>
                  <option>€50,000</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
            </div>

            {/* Row 2: Registration, Europe, City, Button */}
            <div className={styles.searchRow2}>
              <div className={styles.selectWrapper} style={{ flex: "0 0 200px" }}>
                <select className={styles.selectField} defaultValue="">
                  <option value="" disabled>Viti i regjistrimit nga</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                  <option>2020</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>


              <button className={styles.searchButton}>
                2,077,200 rezultate
              </button>
            </div>

            <a href="#" className={styles.refineLink}>
              Kërkimi i detajuar
            </a>
          </div>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <div className={styles.mainContent}>

        {/* Body Type Section */}
        <div className={styles.bodyTypeSection}>
          <h2 className={styles.sectionTitle}>Kërko sipas llojit</h2>
          <div className={styles.bodyTypeGrid}>
            {[
              { label: "Kompakte", icon: "/cars/compact_1x_car.webp" },
              { label: "Fuoristradë & Pick-up", icon: "/cars/suv_1x_car.png" },
              { label: "Transporter", icon: "/cars/transport_1x_car.png" },
              { label: "Kabriolet", icon: "/cars/convertible_1x_car.png" },
              { label: "Furgon", icon: "/cars/suv_1x_car.png" }, /* Reusing SUV or Van if missing */
              { label: "Vetura", icon: "/cars/sedan_1x_car.png" },
              { label: "Kombi", icon: "/cars/station-wagon_1x_car.png" },
              { label: "Kupe", icon: "/cars/coupe_1x_car.png" },
            ].map((type) => (
              <div key={type.label} className={styles.bodyTypeItem}>
                <div className={styles.bodyTypeIcon}>
                  <img src={type.icon} alt={type.label} />
                </div>
                <span className={styles.bodyTypeLabel}>{type.label}</span>
              </div>
            ))}
          </div>
        </div>



        {/* Most Wanted */}
        <div className={styles.mostWantedSection}>
          <h2 className={styles.mostWantedTitle}>Më të kërkuarat</h2>
          <div className={styles.mostWantedGrid}>
            {[
              {
                img: "/images/listing-1.png",
                badge: "AUTOFLEX24",
                title: "Volkswagen Tiguan 2.0 TDI",
                details: "2021 · 45,000 km · Diesel · 150 HP",
                price: "€28,900",
              },
              {
                img: "/images/listing-2.png",
                badge: null,
                title: "BMW 320d xDrive Touring",
                details: "2020 · 62,000 km · Diesel · 190 HP",
                price: "€32,500",
              },
              {
                img: "/images/listing-3.png",
                badge: null,
                title: "Volkswagen Golf 1.5 TSI",
                details: "2022 · 28,000 km · Petrol · 130 HP",
                price: "€24,700",
              },
              {
                img: "/images/listing-4.png",
                badge: null,
                title: "Audi Q5 40 TDI quattro",
                details: "2021 · 38,000 km · Diesel · 204 HP",
                price: "€41,900",
              },
            ].map((car, i) => (
              <div key={i} className={styles.listingCard}>
                <div className={styles.listingImage}>
                  <img src={car.img} alt={car.title} />
                  {car.badge && (
                    <span className={styles.listingBadge}>{car.badge}</span>
                  )}
                </div>
                <div className={styles.listingBody}>
                  <div className={styles.listingTitle}>{car.title}</div>
                  <div className={styles.listingDetails}>{car.details}</div>
                  <div className={styles.listingPrice}>{car.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Sold */}
        <div className={styles.mostWantedSection} style={{ marginTop: '48px' }}>
          <h2 className={styles.mostWantedTitle}>Shitur Së Fundmi</h2>
          <div className={styles.mostWantedGrid}>
            {[
              {
                img: "/images/listing-1.png",
                badge: "SHITUR",
                title: "Volkswagen Tiguan 2.0 TDI",
                details: "2021 · 45,000 km · Diesel · 150 HP",
                price: "€28,900",
              },
              {
                img: "/images/listing-2.png",
                badge: "SHITUR",
                title: "BMW 320d xDrive Touring",
                details: "2020 · 62,000 km · Diesel · 190 HP",
                price: "€32,500",
              },
              {
                img: "/images/listing-3.png",
                badge: "SHITUR",
                title: "Volkswagen Golf 1.5 TSI",
                details: "2022 · 28,000 km · Petrol · 130 HP",
                price: "€24,700",
              },
              {
                img: "/images/listing-4.png",
                badge: "SHITUR",
                title: "Audi Q5 40 TDI quattro",
                details: "2021 · 38,000 km · Diesel · 204 HP",
                price: "€41,900",
              },
            ].map((car, i) => (
              <div key={i} className={styles.listingCard} style={{ opacity: 0.75 }}>
                <div className={styles.listingImage}>
                  <img src={car.img} alt={car.title} style={{ filter: 'grayscale(50%)' }} />
                  {car.badge && (
                    <span className={styles.listingBadge} style={{ backgroundColor: '#dc3545', color: '#fff' }}>{car.badge}</span>
                  )}
                </div>
                <div className={styles.listingBody}>
                  <div className={styles.listingTitle}>{car.title}</div>
                  <div className={styles.listingDetails}>{car.details}</div>
                  <div className={styles.listingPrice}>{car.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
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
                <li><a href="#">Karrierë</a></li>
                <li><a href="#">Kontakt</a></li>
                <li><a href="#">Impressum</a></li>
                <li><a href="#">Informacione për Mbrojtjen e të Dhënave</a></li>
                <li><a href="#">Deklarata e Aksesueshmërisë</a></li>
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
    </>
  );
}

