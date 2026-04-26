import styles from "./page.module.css";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function CarsPage() {
  const horizontalCars = [
    {
      img: "/images/listing-1.png",
      title: "Volkswagen Golf",
      subtitle: "Golf VII Diesel 2.0 TDI BMT Comfortline",
      price: "€ 5,990",
      finance: "From 85 € p.m. financing",
      insurance: "From 13,13 € p.m. insurance",
      date: "07/2015",
      mileage: "254,000 km",
      fuel: "Diesel",
      power: "110 kW (150 hp)",
      photos: 14,
      seller: "Automobile Bittl",
      address: "DE-86807 Buchloe",
      logo: "B"
    },
    {
      img: "/images/listing-2.png",
      title: "Ford Fiesta",
      subtitle: 'Trend "Vermittlungsverkauf"',
      price: "€ 8,990",
      finance: "From 120 € p.m. financing",
      insurance: "From 15,00 € p.m. insurance",
      date: "05/2018",
      mileage: "82,000 km",
      fuel: "Petrol",
      power: "63 kW (85 hp)",
      photos: 8,
      seller: "CarWorld GmbH",
      address: "DE-10115 Berlin",
      logo: "CW"
    },
    {
      img: "/images/listing-3.png",
      title: "Audi A4",
      subtitle: "Avant 2.0 TDI S tronic Sport",
      price: "€ 18,500",
      finance: "From 199 € p.m. financing",
      insurance: "From 25,50 € p.m. insurance",
      date: "11/2019",
      mileage: "115,000 km",
      fuel: "Diesel",
      power: "140 kW (190 hp)",
      photos: 22,
      seller: "Premium Cars AG",
      address: "DE-80331 Munich",
      logo: "PC"
    }
  ];

  return (
    <>
      <Header />
      
      <div className={styles.carsLayout}>
        {/* SIDEBAR */}
        <aside className={styles.filtersSidebar}>
          <div className={styles.filterHeader}>
            <h2 className={styles.filterTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
              Filters
            </h2>
            <button className={styles.clearFilters}>Clear all</button>
          </div>

          {[
            { icon: "car", label: "Make, Model, Trim" },
            { icon: "layout", label: "Body type" },
            { icon: "calendar", label: "Registration" },
            { icon: "award", label: "Vehicle condition" },
            { icon: "droplet", label: "Fuel type" },
            { icon: "dollar-sign", label: "Price" },
            { icon: "trending-up", label: "Mileage (km)" },
            { icon: "settings", label: "Transmission type" }
          ].map((item, idx) => (
            <div key={idx} className={`${styles.accordionItem} ${item.label === 'Body type' ? styles.active : ''}`}>
              <div className={styles.accordionIconTitle}>
                <span className={styles.accordionIcon}>
                  {/* Just rendering a generic placeholder icon visually resembling the ones in the screenshot */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                </span>
                {item.label}
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          ))}
        </aside>

        {/* MAIN RESULTS */}
        <main className={styles.mainContent}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsCount}>
              <strong>406,509 Offers</strong> for your search
            </div>
            <div className={styles.sortWrapper}>
              Sort: <select defaultValue="best"><option value="best">Best results</option><option value="price">Price</option></select>
            </div>
          </div>

          <div className={styles.searchChips}>
            <div className={styles.chip}>
              Europe
            </div>
            <div className={styles.chip}>
              Sedan <span className={styles.chipClose}>&times;</span>
            </div>
          </div>

          {horizontalCars.map((car, idx) => (
            <div key={idx} className={styles.horizontalCard}>
              <div className={styles.cardImageArea}>
                <img src={car.img} alt={car.title} />
                <div className={styles.photoCount}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  {car.photos}
                </div>
              </div>
              
              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                  <div>
                    <h2 className={styles.cardTitle}>{car.title}</h2>
                    <div className={styles.cardSubtitle}>{car.subtitle}</div>
                  </div>
                  <button className={styles.favButton}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </button>
                </div>

                <div className={styles.priceWrapper}>
                  <div className={styles.cardPrice}>{car.price}</div>
                  <div className={styles.financeOptions}>
                    <span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      {car.finance}
                    </span>
                    <span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                      {car.insurance}
                    </span>
                  </div>
                </div>

                <div className={styles.traitsContainer}>
                  <div className={styles.traitBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    {car.date}
                  </div>
                  <div className={styles.traitBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    {car.mileage}
                  </div>
                  <div className={styles.traitBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.22l-5.36 5.36M10.5 13.5l5.36-5.36"></path></svg>
                    {car.fuel}
                  </div>
                  <div className={styles.traitBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                    {car.power}
                  </div>
                </div>

                <div className={styles.sellerRow}>
                  <div className={styles.sellerInfo}>
                    <div className={styles.sellerLogo}>{car.logo}</div>
                    <div>
                      <div>{car.seller}</div>
                      <div>{car.address}</div>
                    </div>
                  </div>
                  
                  <a href="#" className={styles.showMoreLink}>+ Show more vehicles</a>
                </div>
              </div>
            </div>
          ))}

        </main>
      </div>

      <Footer />
    </>
  );
}
