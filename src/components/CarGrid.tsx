import styles from "./CarGrid.module.css";

type CarItem = {
  img: string;
  title: string;
  details: string;
  price: string;
  badge?: string | null;
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
        {cars.map((car, i) => (
          <div key={i} className={styles.listingCard} style={showOpacity ? { opacity: 0.75 } : undefined}>
            <div className={styles.listingImage}>
              {car.img ? (
                <img
                  src={car.img}
                  alt={car.title}
                  style={showOpacity ? { filter: 'grayscale(50%)' } : undefined}
                />
              ) : (
                <div className={styles.listingNoImage} />
              )}
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
          </div>
        ))}
      </div>
    </div>
  );
}
