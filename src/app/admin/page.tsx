"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import CarGrid from "../../components/CarGrid";
import Footer from "../../components/Footer";
import styles from "./page.module.css";
import { useLanguage } from "../../context/LanguageContext";

const INITIAL_SOLD_CARS = [
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

export default function AdminPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [soldCars, setSoldCars] = useState(INITIAL_SOLD_CARS);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminEmail");
    router.push("/admin/login");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newImage = URL.createObjectURL(file);
      setImages([newImage]);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Only image is required now; admin does not provide title/details/price
    if (images.length > 0) {
      const newCar = {
        img: images[0],
        badge: "SHITUR",
        title: "",
        details: "",
        price: "",
      };

      setSoldCars([newCar, ...soldCars]);

      // Reset form after upload
      e.currentTarget.reset();
      setImages([]);
      alert("Foto e makinës u ngarkua me sukses!");
    } else {
      alert("Ju lutem ngarkoni një foto.");
    }
  };

  return (
    <>
      <Header />
      <div className={styles.adminContainer}>
        <div className={styles.adminHeader}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1>Paneli i Adminit</h1>
            <button
              onClick={handleLogout}
              style={{
                background: "#dc3545",
                color: "#fff",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: 600,
              }}
            >
              Dilni
            </button>
          </div>
          <p>Këtu mund të ngarkoni makinat që janë shitur së fundmi. Mund të përdorni edhe telefonin për të ngarkuar foto direkte.</p>
        </div>

        <section className={styles.uploadSection}>
          <h2>Ngarko Makinë të Shitur</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Ngarko foton e makinës (vetëm foto)</label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={handleImageUpload}
                className={styles.fileInput}
              />
            </div>

            <button type="submit" className={styles.submitBtn}>
              Ngarko Fotën
            </button>
          </form>
        </section>

        {/* Dizajni është identik si tek faqja kryesore, vetëm për makinat e shitura */}
        <CarGrid title={t("recently_sold") || "Shitur Së Fundmi"} cars={soldCars} showOpacity={true} />
      </div>
      <Footer />
    </>
  );
}
