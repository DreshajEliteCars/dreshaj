"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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
  "Aston Martin": ["DB11","DB12","DB7","DB9","DBS","DBX","Rapide","Vanquish","Vantage","Virage"],
  "BYD": ["Atto 3","Dolphin","e6","Seal","Sealion 7"],
  "Ferrari": ["296","308","328","348","360","456","458","488","512 TR","550","575M","599","612","812","Amalfi","California","Enzo Ferrari","F12 Berlinetta","F355","F40","F430","F50","F8","FF","GTC4 Lusso","LaFerrari","LC","Portofino","Purosangue","Roma","SF90","12Cilindri"],
  "Fiat": ["124","500","500L","500X","Barchetta","Coupe","Croma","Ducato","Freemont","Lancia","Multipla","Panda","Punto"],
  "Ford": ["Bronco","Contour","E-Series","Econoline","EcoSport","Escape","Expedition","Explorer","Explorer Sport Trac","F-150","F-250","F-350","Fiesta","Five Hundred","Flex","Focus","Freestyle","Fusion","GT","Kuga","Mondeo","Mustang","Probe","Ranger","S-MAX","Taurus","Thunderbird","Transit","Windstar"],
  "Honda": ["Accord","Beat","CR-V","CR-Z","Civic","Crossroad","Crosstour","Del Sol","Element","Fit","Fit Aria","Freed","HR-V","Insight","Inspire","Integra","Legend","Life","N-BOX","N-ONE","Odyssey","Passport","Pilot","Prelude","Ridgeline","S2000","S660","Stepwgn","Stream","That's"],
  "Hyundai": [],
  "Jaguar": ["Daimler","E-PACE","E-TYPE","F-PACE","F-TYPE","I-PACE","S-TYPE","Sovereign","XE","XF","XJ","XJ-6","XJ-8","XJ-C","XJR","XJS","XK","XK8","XKR","X-TYPE"],
  "Jeep": ["Avenger","Cherokee","CJ","Commander","Compass","Gladiator","Patriot","Renegade","Wrangler"],
  "Kia": ["Avella","Bisto","Bongo III Minibus","Brisa","Capital","Carens","Carnival","Carstar","Ceed","Cerato","Concord","Credos","Delta","Elan","Enterprise","EV3","EV4","EV5","EV6","EV9","Fiat 132","Forte","K3","K5","K7","K8","K9","Mohave","Morning","Niro","Opirus","Optima","Parktown","Potentia","Pregio","Pride","PV5","Ray","Regal","Retona","Rio","Roche","Rocsta","Seltos","Sephia","Shuma","Sorento","Soul","Spectra","Sportage","Stinger","Stonic","Tasman","Telluride","Topic","Towner","Vesta","X-TREK"],
  "Lexus": ["CT200h","ES","GS","GX","IS","LC","LM","LS","LX","NX","RC","RX","RZ","SC","UX"],
  "Mazda": ["AZ-1","CX-3","CX-5","CX-7","CX-9","Demio","Flare Crossover","Mazda 3","Mazda 5","Mazda 6","Millenia","MPV","MX-3","MX-5 Miata","MX-6","Protégé","RX-7","RX-8","Viante","Yunos","626"],
  "Nissan": ["180SX","200SX","240SX","280ZX","300ZX","350Z","370Z","Altima","Armada","Bluebird","Bluebird Sylphy","Cedric","Cefiro","Cima","Cube","Elgrand","Figaro","Frontier","Fuga","GT-R","Juke","Lafesta","Laurel","Leaf","Maxima","Moco","Murano","Note","NV","Pao","Pathfinder","Prairie","President","Pulsar","Qashqai","Quest","Rogue","Sentra","Serena","Silvia","Skyline","Stagea","Teana","Titan","Versa","Wingroad","X-Trail","Xterra"],
  "Peugeot": [],
  "Porsche": ["718","911","928","944","968","Boxster","Carrera GT","Cayenne","Cayman","Macan","Panamera","Taycan"],
  "Renault": ["Alpine","Clio","Laguna","Megane","Talisman"],
  "Renault Samsung": ["Arkana","Captur","Clio","Filante","Koleos","Master","QM3","QM5","QM6","Scenic","SM3","SM5","SM6","SM7","Twizy","XM3","ZOE"],
  "Smart": ["Forfour","Fortwo","Roadster"],
  "Suzuki": ["Alto","Alto Lapin","Cappuccino","Grand Vitara","Hustler","Ignis","Jimny","Sidekick","Spacia","Swift","Twin","Wagon R","X-90"],
  "Tesla": ["Cybertruck","Model 3","Model S","Model X","Model Y"],
  "Toyota": ["4Runner","86","Alphard","Altezza","Aristo","Avalon","bB","C-HR","Cami","Camry","Carina","Celica","Celsior","Chaser","Corona","Corolla","Corsa","Crown","Esquire","Estima","FJ Cruiser","Fun Cargo","Gaia","Harrier","Hiace","Highlander","Hilux Surf","iQ","Ipsum","Isis","ist","Land Cruiser","Mark II","Mark X","Matrix","MR-2","MR-S","Noah","Passo","Pickup","Porte","Premio","Previa","Prius","Ractis","Raum","RAV4","Roomy","Sequoia","Sera","Sienna","Sienta","Soarer","Solara","Supra","Tacoma","Tundra","Vellfire","Venza","Verso","Vista","Vitz","WiLL","Wish","Xtra Cab","Yaris"],
  "Volvo": ["740","760","850","940","960","C30","C40","C70","EX30","EX40","S40","S60","S70","S80","S90","V40","V50","V60","V70","V90","XC40","XC60","XC70","XC90"]
};

const topBrands = ["BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Toyota"];
const sortedKeys = Object.keys(brandModels).sort();
const allBrands = [
  ...topBrands,
  ...sortedKeys.filter((brand) => !topBrands.includes(brand))
];

export default function CarsPage() {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const models = selectedBrand ? brandModels[selectedBrand] : [];

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
            <h2 className={styles.filterTitle}>Detajet</h2>
            <button className={styles.closeSidebarBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className={styles.filterBody}>
            {/* Prodhuesi */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Prodhuesi</label>
              <select 
                className={styles.inputSelect} 
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedModel("");
                }}
              >
                <option value="" disabled>Zgjedh..</option>
                {allBrands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
              <span className={styles.selectArrow}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
            </div>

            {/* Modeli */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Modeli</label>
              <select 
                className={styles.inputSelect} 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedBrand || models.length === 0}
              >
                <option value="" disabled>Zgjedh..</option>
                {models.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <span className={styles.selectArrow}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
            </div>

            {/* Lloji i Modelit */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Lloji i Modelit</label>
              <select className={styles.inputSelect} defaultValue="Të gjitha">
                <option value="Të gjitha">Të gjitha</option>
              </select>
              <span className={styles.selectArrow}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
            </div>

            {/* Viti */}
            <div className={styles.filterSection}>
              <h3 className={styles.sectionTitle}>Viti</h3>
              <div className={styles.rowInputs}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Nga</label>
                  <select className={styles.inputSelect} defaultValue="">
                    <option value="" disabled>Zgjedh..</option>
                    {Array.from({length: 35}, (_, i) => 2024 - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <span className={styles.selectArrow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Deri në</label>
                  <select className={styles.inputSelect} defaultValue="">
                    <option value="" disabled>Zgjedh..</option>
                    {Array.from({length: 35}, (_, i) => 2024 - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <span className={styles.selectArrow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Kilometrazhi */}
            <div className={styles.filterSection}>
              <h3 className={styles.sectionTitle}>Kilometrazhi</h3>
              <div className={styles.rowInputs}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Nga</label>
                  <select className={styles.inputSelect} defaultValue="">
                    <option value="" disabled>Zgjedh..</option>
                    <option value="0">0 km</option>
                    <option value="10000">10,000 km</option>
                    <option value="20000">20,000 km</option>
                    <option value="50000">50,000 km</option>
                    <option value="100000">100,000 km</option>
                    <option value="200000">200,000 km</option>
                  </select>
                  <span className={styles.selectArrow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Deri në</label>
                  <select className={styles.inputSelect} defaultValue="">
                    <option value="" disabled>Zgjedh..</option>
                    <option value="10000">10,000 km</option>
                    <option value="20000">20,000 km</option>
                    <option value="50000">50,000 km</option>
                    <option value="100000">100,000 km</option>
                    <option value="200000">200,000 km</option>
                    <option value="500000">500,000 km</option>
                  </select>
                  <span className={styles.selectArrow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Çmimi */}
            <div className={styles.filterSection}>
              <h3 className={styles.sectionTitle}>Çmimi</h3>
              <div className={styles.rowInputs}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Nga</label>
                  <select className={styles.inputSelect} defaultValue="">
                    <option value="" disabled>Zgjedh..</option>
                    <option value="500">€500</option>
                    <option value="1000">€1,000</option>
                    <option value="5000">€5,000</option>
                    <option value="10000">€10,000</option>
                    <option value="20000">€20,000</option>
                    <option value="50000">€50,000</option>
                  </select>
                  <span className={styles.selectArrow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Deri në</label>
                  <select className={styles.inputSelect} defaultValue="">
                    <option value="" disabled>Zgjedh..</option>
                    <option value="5000">€5,000</option>
                    <option value="10000">€10,000</option>
                    <option value="20000">€20,000</option>
                    <option value="50000">€50,000</option>
                    <option value="100000">€100,000</option>
                  </select>
                  <span className={styles.selectArrow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Karburanti */}
            <div className={styles.filterSection}>
              <h3 className={styles.sectionTitle}>Karburanti</h3>
              <div className={styles.checkboxList}>
                <label className={styles.checkboxLabel}><input type="checkbox"/> <span className={styles.checkmark}></span> Naftë</label>
                <label className={styles.checkboxLabel}><input type="checkbox"/> <span className={styles.checkmark}></span> Benzinë</label>
                <label className={styles.checkboxLabel}><input type="checkbox"/> <span className={styles.checkmark}></span> Hibrid</label>
                <label className={styles.checkboxLabel}><input type="checkbox"/> <span className={styles.checkmark}></span> Elektrik</label>
                <label className={styles.checkboxLabel}><input type="checkbox"/> <span className={styles.checkmark}></span> Hidrogjen</label>
              </div>
            </div>

            {/* Motori */}
            <div className={styles.filterSection}>
              <h3 className={styles.sectionTitle}>Motori</h3>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Madhësia e motorit</label>
                <select className={styles.inputSelect} defaultValue="">
                  <option value="" disabled>Zgjedh..</option>
                </select>
                <span className={styles.selectArrow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN RESULTS */}
        <main className={styles.mainContent}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsCount}>
              <strong>406,509 Oferta</strong> për kërkimin tuaj
            </div>
            <div className={styles.sortWrapper}>
              Rëndit: <select defaultValue="best"><option value="best">Rezultatet më të mira</option><option value="price">Çmimi</option></select>
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
