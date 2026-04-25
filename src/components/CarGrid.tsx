import styles from "../app/page.module.css";

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
      <h2 className={styles.mostWantedTitle}>{title}</h2>
      <div className={styles.mostWantedGrid}>
        {cars.map((car, i) => (
          <div key={i} className={styles.listingCard} style={showOpacity ? { opacity: 0.75 } : undefined}>
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
          </div>
        ))}
      </div>
    </div>
  );
}
