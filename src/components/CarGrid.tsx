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
                {car.badge && (
                  <span 
                    className={styles.listingBadge} 
                    style={showOpacity ? { backgroundColor: '#dc3545', color: '#fff' } : undefined}
                  >
                    {car.badge}
                  </span>
                )}
              </div>
              <div className={styles.listingBody}>
                <div className={styles.listingTitle}>{car.title}</div>
                <div className={styles.listingDetails}>{car.details}</div>
                <div className={styles.listingPrice}>{car.price}</div>
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
