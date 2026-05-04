import styles from "./CarGrid.module.css";
import Link from "next/link";

type CarItem = {
  img: string;
  title: string;
  details: string;
  price: string;
  badge?: string | null;
  href?: string;
};

export default function CarGrid({ title, cars, showOpacity }: { title: string, cars: CarItem[], showOpacity?: boolean }) {
  return (
    <div className={styles.mostWantedSection} style={showOpacity ? { marginTop: '48px' } : undefined}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <h2 className={styles.mostWantedTitle} style={{ marginBottom: 0 }}>{title}</h2>
        {title === "Më të kërkuarat" && (
          <a href="/cars" style={{ color: 'var(--color-primary-default)', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
            Shiko të gjithat →
          </a>
        )}
      </div>
      <div className={styles.mostWantedGrid}>
        {cars.map((car, i) => {
          const CardContent = (
            <>
              <div className={styles.listingImage}>
                <img 
                  src={car.img} 
                  alt={car.title} 
                  style={showOpacity ? { filter: 'grayscale(50%)' } : undefined} 
                />
              </div>
              <div className={styles.listingBody}>
                <div className={styles.listingTitle}>{car.title}</div>
                <div className={styles.listingDetails}>{car.details}</div>
                <div className={styles.priceContainer}>
                  <div className={styles.listingPrice}>{car.price}</div>
                  {car.badge && (
                    <span className={styles.listingBadgeInline}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '-1px' }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {car.badge}
                    </span>
                  )}
                </div>
              </div>
            </>
          );

          if (car.href) {
            const isExternal = car.href.startsWith('http');
            if (isExternal) {
              return (
                <a 
                  key={i} 
                  href={car.href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.listingCard} 
                  style={{ ...(showOpacity ? { opacity: 0.75 } : {}), textDecoration: 'none', color: 'inherit' }}
                >
                  {CardContent}
                </a>
              );
            }
            return (
              <Link 
                key={i} 
                href={car.href} 
                className={styles.listingCard} 
                style={{ ...(showOpacity ? { opacity: 0.75 } : {}), textDecoration: 'none', color: 'inherit' }}
              >
                {CardContent}
              </Link>
            );
          }

          return (
            <div key={i} className={styles.listingCard} style={showOpacity ? { opacity: 0.75 } : undefined}>
              {CardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}
