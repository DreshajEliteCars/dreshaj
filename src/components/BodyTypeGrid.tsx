import styles from "../app/page.module.css";

export default function BodyTypeGrid() {
  const bodyTypes = [
    { label: "SUV", icon: "/cars/suv_1x_car.png" },
    { label: "Kabriolet", icon: "/cars/convertible_1x_car.png" },
    { label: "Furgon", icon: "/cars/suv_1x_car.png" },
    { label: "Sedan", icon: "/cars/sedan_1x_car.png" },
    { label: "Kupe", icon: "/cars/coupe_1x_car.png" },
  ];

  return (
    <div className={styles.bodyTypeSection}>
      <h2 className={styles.sectionTitle}>Kërko sipas llojit</h2>
      <div className={styles.bodyTypeGrid}>
        {bodyTypes.map((type) => (
          <div key={type.label} className={styles.bodyTypeItem}>
            <div className={styles.bodyTypeIcon}>
              <img src={type.icon} alt={type.label} />
            </div>
            <span className={styles.bodyTypeLabel}>{type.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
