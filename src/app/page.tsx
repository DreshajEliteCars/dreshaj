import styles from "./page.module.css";
import Header from "../components/Header";
import SearchHero from "../components/SearchHero";
import BodyTypeGrid from "../components/BodyTypeGrid";
import CarGrid from "../components/CarGrid";
import Footer from "../components/Footer";

export default function Home() {
  const wantedCars = [
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
  ];

  const soldCars = [
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
  ];

  return (
    <>
      {/* ===== HEADER ===== */}
      <Header />

      {/* ===== SEARCH SECTION ===== */}
      <SearchHero />

      {/* ===== MAIN CONTENT ===== */}
      <div className={styles.mainContent}>

        {/* Body Type Section */}
        <BodyTypeGrid />

        {/* Most Wanted */}
        <CarGrid title="Më të kërkuarat" cars={wantedCars} />

        {/* Recently Sold */}
        <CarGrid title="Shitur Së Fundmi" cars={soldCars} showOpacity={true} />
      </div>

      {/* ===== FOOTER ===== */}
      <Footer />
    </>
  );
}
