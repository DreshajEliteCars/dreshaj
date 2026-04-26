"use client";

import { useState } from "react";
import styles from "./SearchHero.module.css";
import { useLanguage } from "../context/LanguageContext";

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

export default function SearchHero() {
  const { t } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);
  
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const models = selectedBrand ? brandModels[selectedBrand] : [];

  function handleBrandChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedBrand(e.target.value);
    setSelectedModel(""); 
    setHasFilters(true);
  }

  return (
    <>
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

          <div className={styles.searchBody}>
            <div className={styles.searchTitle}>{t("search_title")}</div>

            <div className={styles.searchRow}>
              <div className={styles.selectWrapper}>
                <select 
                  className={styles.selectField} 
                  value={selectedBrand}
                  onChange={handleBrandChange}
                >
                  <option value="" disabled>{t("make")}</option>
                  {allBrands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
              <div className={styles.selectWrapper}>
                <select 
                  className={styles.selectField} 
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setHasFilters(true);
                  }}
                  disabled={!selectedBrand || models.length === 0}
                >
                  <option value="" disabled>
                    {!selectedBrand
                      ? t("choose_make_first")
                      : models.length === 0
                      ? t("no_models")
                      : t("model")}
                  </option>
                  {models.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
              <div className={styles.selectWrapper}>
                <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                  <option value="" disabled>{t("price_up_to")}</option>
                  <option>€5,000</option>
                  <option>€10,000</option>
                  <option>€15,000</option>
                  <option>€20,000</option>
                  <option>€30,000</option>
                  <option>€50,000</option>
                  <option>€100,000</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>
            </div>

            <div className={styles.searchRow2}>
              <div className={styles.selectWrapper} style={{ flex: "0 0 200px" }}>
                <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                  <option value="" disabled>{t("year_from")}</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                  <option>2020</option>
                </select>
                <span className={styles.selectArrow}>▾</span>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button className={styles.searchButton}>
                  {t("search_btn")}
                </button>
                {hasFilters && (
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-and-icon-muted)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      textDecoration: 'underline'
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      setHasFilters(false);
                      const selects = document.querySelectorAll('select');
                      selects.forEach(s => s.value = '');
                    }}
                  >
                    {t("clear_filters")}
                  </button>
                )}
              </div>
            </div>

            <a
              href="#"
              className={styles.refineLink}
              onClick={(e) => {
                e.preventDefault();
                setShowAdvanced(true);
              }}
            >
              {t("detailed_search")}
            </a>
          </div>
        </div>
      </section>

      {/* ===== ADVANCED SEARCH MODAL ===== */}
      <div
        className={styles.modalOverlay}
        style={{ display: showAdvanced ? "flex" : "none" }}
        onClick={() => setShowAdvanced(false)}
      >
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Kërkimi i Detajuar</h2>
            <button className={styles.closeButton} onClick={() => setShowAdvanced(false)}>
              &times;
            </button>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.selectWrapper}>
              <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                <option value="" disabled>Kilometrazhi nga</option>
                <option>0 km</option>
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
            <div className={styles.selectWrapper}>
              <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                <option value="" disabled>Kilometrazhi deri në</option>
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

          <div className={styles.searchRow}>
            <div className={styles.selectWrapper}>
              <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                <option value="" disabled>Karburanti</option>
                <option>Diesel</option>
                <option>Petrol</option>
                <option>Elektrik</option>
                <option>Hibrid</option>
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
            <div className={styles.selectWrapper}>
              <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                <option value="" disabled>Transmisioni</option>
                <option>Automatike</option>
                <option>Manuale</option>
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.selectWrapper} style={{ flex: "0 0 calc(50% - 6px)" }}>
              <select className={styles.selectField} defaultValue="" onChange={() => setHasFilters(true)}>
                <option value="" disabled>Tërheqja</option>
                <option>2WD</option>
                <option>4WD</option>
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '16px', justifyContent: 'flex-end', alignItems: 'center' }}>
            {hasFilters && (
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-and-icon-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'underline'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setHasFilters(false);
                  const selects = document.querySelectorAll('select');
                  selects.forEach(s => s.value = '');
                }}
              >
                Pastro Filtrat
              </button>
            )}
            <button
              className={styles.searchButton}
              style={{ flex: 'none', marginLeft: '0' }}
              onClick={() => setShowAdvanced(false)}
            >
              Aplikoni Filtrat
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

