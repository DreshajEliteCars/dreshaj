"use client";

import styles from "./page.module.css";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

// ─── Brand → Models data ───────────────────────────────────────────────────
const brandModels: Record<string, string[]> = {
  "Volkswagen": [
    "Arteon","Atlas","Beetle","CC","Corrado","Eos","Golf","ID.4","ID.5",
    "Jetta","Microbus","Multivan","Passat","Phaeton","Polo","Rialta",
    "Scirocco","Sharan","T-Roc","Tiguan","Touareg","Transporter","up!","Vento",
  ],
  "BMW": [
    "1 Series","1M","2 Series","3 Series","4 Series","5 Series","6 Series",
    "7 Series","8 Series","Gran Turismo (GT)","i3","i4","i5","i7","i8",
    "iX","iX1","iX2","iX3","M2","M3","M4","M5","M6","M8","M Coupe/Roadster",
    "X1","X2","X3","X3M","X4","X4M","X5","X5M","X6","X6M","X7","XM","Z3","Z4","Z8",
  ],
  "Mercedes-Benz": [
    "190-Class","A-Class","AMG GT","B-Class","C-Class","CL-Class","CLA-Class",
    "CLE-Class","CLK-Class","CLS-Class","E-Class","EQA","EQB","EQC","EQE","EQS",
    "G-Class","GL-Class","GLA-Class","GLB-Class","GLC-Class","GLE-Class",
    "GLK-Class","GLS-Class","M-Class","R-Class","S-Class","SEL/SEC",
    "SL-Class","SLC-Class","SLK-Class","SLR","SLS AMG","Sprinter","V-Class",
  ],
  "Audi": [
    "80","90","100","A1","A3","A4","A5","A6","A6 e-tron","A7","A8",
    "Allroad Quattro","e-tron","e-tron GT","Q2","Q3","Q4 e-tron","Q5",
    "Q6 e-tron","Q7","Q8","Q8 e-tron","R8","RS3","RS4","RS5","RS6",
    "RS7","RS e-tron GT","RSQ8","S3","S4","S5","S6","S6 e-tron","S7",
    "S8","S e-tron GT","SQ5","SQ6 e-tron","SQ7","SQ8","SQ8 e-tron",
    "TT","TTRS","TTS","V8",
  ],
  "Aston Martin": [
    "DB11","DB12","DB7","DB9","DBS","DBX","Rapide","Vanquish","Vantage","Virage",
  ],
  "BYD": [
    "Atto 3","Dolphin","e6","Seal","Sealion 7",
  ],
  "Ferrari": [
    "296","308","328","348","360","456","458","488","512 TR","550","575M",
    "599","612","812","Amalfi","California","Enzo Ferrari","F12 Berlinetta",
    "F355","F40","F430","F50","F8","FF","GTC4 Lusso","LaFerrari",
    "LC","Portofino","Purosangue","Roma","SF90","12Cilindri",
  ],
  "Fiat": [
    "124","500","500L","500X","Barchetta","Coupe","Croma","Ducato","Freemont",
    "Lancia","Multipla","Panda","Punto",
  ],
  "Ford": [
    "Bronco","Contour","E-Series","Econoline","EcoSport","Escape",
    "Expedition","Explorer","Explorer Sport Trac","F-150","F-250",
    "F-350","Fiesta","Five Hundred","Flex","Focus","Freestyle","Fusion",
    "GT","Kuga","Mondeo","Mustang","Probe","Ranger","S-MAX","Taurus",
    "Thunderbird","Transit","Windstar",
  ],
  "Honda": [
    "Accord","Beat","CR-V","CR-Z","Civic","Crossroad","Crosstour","Del Sol",
    "Element","Fit","Fit Aria","Freed","HR-V","Insight","Inspire","Integra",
    "Legend","Life","N-BOX","N-ONE","Odyssey","Passport","Pilot","Prelude",
    "Ridgeline","S2000","S660","Stepwgn","Stream","That's",
  ],
  "Hyundai": [],
  "Jaguar": [
    "Daimler","E-PACE","E-TYPE","F-PACE","F-TYPE","I-PACE","S-TYPE",
    "Sovereign","XE","XF","XJ","XJ-6","XJ-8","XJ-C","XJR","XJS","XK",
    "XK8","XKR","X-TYPE",
  ],
  "Jeep": [
    "Avenger","Cherokee","CJ","Commander","Compass","Gladiator",
    "Patriot","Renegade","Wrangler",
  ],
  "Kia": [
    "Avella","Bisto","Bongo III Minibus","Brisa","Capital","Carens","Carnival",
    "Carstar","Ceed","Cerato","Concord","Credos","Delta","Elan","Enterprise",
    "EV3","EV4","EV5","EV6","EV9","Fiat 132","Forte","K3","K5","K7","K8","K9",
    "Mohave","Morning","Niro","Opirus","Optima","Parktown","Potentia","Pregio",
    "Pride","PV5","Ray","Regal","Retona","Rio","Roche","Rocsta","Seltos","Sephia",
    "Shuma","Sorento","Soul","Spectra","Sportage","Stinger","Stonic","Tasman",
    "Telluride","Topic","Towner","Vesta","X-TREK",
  ],
  "Lexus": [
    "CT200h","ES","GS","GX","IS","LC","LM","LS","LX","NX","RC","RX","RZ","SC","UX",
  ],
  "Mazda": [
    "AZ-1","CX-3","CX-5","CX-7","CX-9","Demio","Flare Crossover","Mazda 3",
    "Mazda 5","Mazda 6","Millenia","MPV","MX-3","MX-5 Miata","MX-6",
    "Protégé","RX-7","RX-8","Viante","Yunos","626",
  ],
  "Nissan": [
    "180SX","200SX","240SX","280ZX","300ZX","350Z","370Z","Altima",
    "Armada","Bluebird","Bluebird Sylphy","Cedric","Cefiro","Cima",
    "Cube","Elgrand","Figaro","Frontier","Fuga","GT-R","Juke",
    "Lafesta","Laurel","Leaf","Maxima","Moco","Murano","Note",
    "NV","Pao","Pathfinder","Prairie","President","Pulsar","Qashqai",
    "Quest","Rogue","Sentra","Serena","Silvia","Skyline","Stagea",
    "Teana","Titan","Versa","Wingroad","X-Trail","Xterra",
  ],
  "Peugeot": [],
  "Porsche": [
    "718","911","928","944","968","Boxster","Carrera GT","Cayenne","Cayman","Macan","Panamera","Taycan",
  ],
  "Renault": [
    "Alpine","Clio","Laguna","Megane","Talisman",
  ],
  "Renault Samsung": [
    "Arkana","Captur","Clio","Filante","Koleos","Master","QM3","QM5","QM6",
    "Scenic","SM3","SM5","SM6","SM7","Twizy","XM3","ZOE",
  ],
  "Smart": [
    "Forfour","Fortwo","Roadster",
  ],
  "Suzuki": [
    "Alto","Alto Lapin","Cappuccino","Grand Vitara","Hustler",
    "Ignis","Jimny","Sidekick","Spacia","Swift","Twin","Wagon R","X-90",
  ],
  "Tesla": [
    "Cybertruck","Model 3","Model S","Model X","Model Y",
  ],
  "Toyota": [
    "4Runner","86","Alphard","Altezza","Aristo","Avalon","bB","C-HR","Cami",
    "Camry","Carina","Celica","Celsior","Chaser","Corona","Corolla","Corsa",
    "Crown","Esquire","Estima","FJ Cruiser","Fun Cargo","Gaia","Harrier","Hiace",
    "Highlander","Hilux Surf","iQ","Ipsum","Isis","ist","Land Cruiser","Mark II",
    "Mark X","Matrix","MR-2","MR-S","Noah","Passo","Pickup","Porte","Premio",
    "Previa","Prius","Ractis","Raum","RAV4","Roomy","Sequoia","Sera","Sienna",
    "Sienta","Soarer","Solara","Supra","Tacoma","Tundra","Vellfire","Venza",
    "Verso","Vista","Vitz","WiLL","Wish","Xtra Cab","Yaris",
  ],
  "Volvo": [
    "740","760","850","940","960","C30","C40","C70","EX30","EX40","S40",
    "S60","S70","S80","S90","V40","V50","V60","V70","V90","XC40","XC60",
    "XC70","XC90",
  ],
};

const topBrands = ["BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Toyota"];
const sortedKeys = Object.keys(brandModels).sort();
const allBrands = [
  ...topBrands,
  ...sortedKeys.filter((brand) => !topBrands.includes(brand))
];

export default function Home() {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const models = selectedBrand ? brandModels[selectedBrand] : [];

  function handleBrandChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedBrand(e.target.value);
    setSelectedModel(""); // reset model when brand changes
  }

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
            <Link href="/kalkulatori" className={styles.calcButton}>Kalkulo Doganën</Link>
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

              {/* MARKA */}
              <div className={styles.selectWrapper}>
                <select
                  className={styles.selectField}
                  value={selectedBrand}
                  onChange={handleBrandChange}
                >
                  <option value="" disabled>Marka</option>
                  {allBrands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>

              {/* MODELI — filtrohet sipas markës */}
              <div className={styles.selectWrapper}>
                <select
                  className={styles.selectField}
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={!selectedBrand || models.length === 0}
                >
                  <option value="" disabled>
                    {!selectedBrand
                      ? "Zgjidhni markën fillimisht"
                      : models.length === 0
                      ? "Nuk ka modele"
                      : "Modeli"}
                  </option>
                  {models.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>

              {/* ÇMIMI */}
              <div className={styles.selectWrapper}>
                <select className={styles.selectField} defaultValue="">
                  <option value="" disabled>Çmimi deri</option>
                  <option>5,000 €</option>
                  <option>7,000 €</option>
                  <option>9,000 €</option>
                  <option>10,000 €</option>
                  <option>12,000 €</option>
                  <option>15,000 €</option>
                  <option>20,000 €</option>
                  <option>25,000 €</option>
                  <option>30,000 €</option>
                  <option>40,000 €</option>
                  <option>50,000 €</option>
                  <option>75,000 €</option>
                  <option>100,000 €</option>
                  <option>1,000,000 €</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>

              {/* KILOMETRAT */}
              <div className={styles.selectWrapper}>
                <select className={styles.selectField} defaultValue="">
                  <option value="" disabled>Km deri</option>
                  <option>10,000 km</option>
                  <option>20,000 km</option>
                  <option>30,000 km</option>
                  <option>40,000 km</option>
                  <option>50,000 km</option>
                  <option>60,000 km</option>
                  <option>70,000 km</option>
                  <option>80,000 km</option>
                  <option>90,000 km</option>
                  <option>100,000 km</option>
                  <option>110,000 km</option>
                  <option>120,000 km</option>
                  <option>130,000 km</option>
                  <option>140,000 km</option>
                  <option>150,000 km</option>
                  <option>160,000 km</option>
                  <option>170,000 km</option>
                  <option>180,000 km</option>
                  <option>190,000 km</option>
                  <option>200,000 km</option>
                  <option>250,000 km</option>
                  <option>300,000 km</option>
                  <option>500,000 km</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
            </div>

            {/* Row 2: Registration, Button */}
            <div className={styles.searchRow2}>
              <div className={styles.selectWrapper} style={{ flex: "0 0 200px" }}>
                <select className={styles.selectField} defaultValue="">
                  <option value="" disabled>Viti i prodhimit nga</option>
                  <option>2028</option>
                  <option>2027</option>
                  <option>2026</option>
                  <option>2025</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                  <option>2020</option>
                  <option>2019</option>
                  <option>2018</option>
                  <option>2017</option>
                  <option>2016</option>
                  <option>2015</option>
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
              { label: "SUV", icon: "/cars/suv_1x_car.png" },
              { label: "Transporter", icon: "/cars/transport_1x_car.png" },
              { label: "Kabriolet", icon: "/cars/convertible_1x_car.png" },
              { label: "Furgon", icon: "/cars/suv_1x_car.png" },
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
        <div className={styles.mostWantedSection} style={{ marginTop: "48px" }}>
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
                  <img src={car.img} alt={car.title} style={{ filter: "grayscale(50%)" }} />
                  {car.badge && (
                    <span className={styles.listingBadge} style={{ backgroundColor: "#dc3545", color: "#fff" }}>
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
      </div>

      {/* ===== FOOTER ===== */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerMain}>
            
            {/* Column 1 */}
            <div className={styles.footerCol}>
              <h3 className={styles.footerLogoTitle}>DRESHAJ<br />ELITE CARS</h3>
              <p className={styles.footerText}>Besueshmëri në Çdo Hap!</p>
            </div>

            {/* Column 2 */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Linqe të Shpejta</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#">Ballina</a></li>
                <li><a href="#">Inventari</a></li>
                <li><a href="#">Të Ruajtura</a></li>
              </ul>
            </div>

            {/* Column 3 */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Kontakti</h4>
              <p className={styles.footerText}>Shpend Malaj, Prishtinë,<br />Kosovë</p>
              <p className={styles.footerText} style={{ marginTop: "12px" }}>info@dreshajelitecars.com</p>
              <p className={styles.footerText} style={{ marginTop: "8px" }}>+383 44 202 673</p>
            </div>

            {/* Column 4 */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Na Ndiqni</h4>
              <div className={styles.footerSocials}>
                <a href="#" aria-label="Facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href="#" aria-label="Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href="#" aria-label="TikTok">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.23-.9 4.45-2.35 6.13-1.45 1.68-3.52 2.72-5.74 2.98-2.22.26-4.52-.09-6.42-1.25-1.9-1.16-3.32-2.98-3.95-5.11-.63-2.13-.42-4.46.61-6.43 1.03-1.97 2.78-3.48 4.88-4.17 2.1-.69 4.41-.53 6.38.45V14.1c-1.07-.64-2.35-.8-3.51-.43-1.16.37-2.13 1.25-2.6 2.37-.47 1.12-.4 2.4.19 3.47.59 1.07 1.65 1.83 2.85 2.03 1.2.2 2.46-.08 3.39-.77.93-.69 1.5-1.78 1.52-2.97.02-4.63.01-9.26.01-13.89z"/></svg>
                </a>
                <a href="#" aria-label="WhatsApp">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </a>
              </div>
            </div>

          </div>

          <div className={styles.footerBottom}>
            © 2026 Dreshaj Elite Cars. Të gjitha të drejtat e rezervuara.
          </div>
        </div>
      </footer>
    </>
  );
}
