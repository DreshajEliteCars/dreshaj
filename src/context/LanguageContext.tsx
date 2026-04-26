"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "sq" | "en";

interface TranslationDictionary {
  [key: string]: {
    sq: string;
    en: string;
  };
}

export const translations: TranslationDictionary = {
  customs_calc: { sq: "Kalkulatori i doganës", en: "Customs Calculator" },
  customs_calc_title: { sq: "Llogaritni taksat doganore", en: "Calculate customs taxes" },
  customs_calc_desc: { sq: "Llogaritni shpenzimet e doganës dhe regjistrimit për automjetin tuaj në vetëm pak sekonda.", en: "Calculate customs and registration fees for your vehicle in just a few seconds." },
  calc_now: { sq: "Kalkulo tani", en: "Calculate now" },
  search_title: { sq: "Gjeni makina të përdorura dhe të reja", en: "Find used and new cars" },
  make: { sq: "Marka", en: "Make" },
  model: { sq: "Modeli", en: "Model" },
  price_up_to: { sq: "Çmimi deri", en: "Price up to" },
  km_up_to: { sq: "Km deri", en: "Mileage up to" },
  year_from: { sq: "Viti i prodhimit nga", en: "Registration from" },
  search_btn: { sq: "Kërko", en: "Search" },
  detailed_search: { sq: "Kërkimi i detajuar", en: "Detailed search" },
  clear_filters: { sq: "Pastro Filtrat", en: "Clear Filters" },
  search_by_body: { sq: "Kërko sipas llojit", en: "Search by body type" },
  most_wanted: { sq: "Më të kërkuarat", en: "Most Wanted" },
  recently_sold: { sq: "Shitur Së Fundmi", en: "Recently Sold" },
  company: { sq: "Company", en: "Company" },
  about: { sq: "About Dreshaj Elite Cars", en: "About Dreshaj Elite Cars" },
  contact: { sq: "Contact", en: "Contact" },
  data_protection: { sq: "Data Protection Information", en: "Data Protection Information" },
  location: { sq: "Vendndodhja Jonë", en: "Our Location" },
  quick_links: { sq: "Linqe të Shpejta", en: "Quick Links" },
  home: { sq: "Ballina", en: "Home" },
  inventory: { sq: "Inventari", en: "Inventory" },
  saved: { sq: "Të Ruajtura", en: "Saved" },
  all_rights: { sq: "Të gjitha të drejtat e rezervuara.", en: "All rights reserved." },
  back: { sq: "Kthehu mbrapa", en: "Back" },
  choose_make_first: { sq: "Zgjidhni markën fillimisht", en: "Choose make first" },
  no_models: { sq: "Nuk ka modele", en: "No models" }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("sq");

  // On mount, check if there is a language in local storage
  useEffect(() => {
    const savedLang = localStorage.getItem("dreshaj_lang") as Language;
    if (savedLang === "sq" || savedLang === "en") {
      setLanguage(savedLang);
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("dreshaj_lang", lang);
  };

  const t = (key: string): string => {
    if (!translations[key]) return key;
    return translations[key][language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
