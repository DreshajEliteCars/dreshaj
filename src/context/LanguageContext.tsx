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
  nav_warranty: { sq: "Garancioni", en: "Warranty" },
  nav_calculator: { sq: "Kalkulatori i Doganës", en: "Customs Calculator" },
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
  in_stock_peja: { sq: "Në Stock (Pejë)", en: "In Stock (Peja)" },
  recently_sold: { sq: "Shitur Së Fundmi", en: "Recently Sold" },
  company: { sq: "Kompania", en: "Company" },
  about: { sq: "Rreth Dreshaj Elite Cars", en: "About Dreshaj Elite Cars" },
  contact: { sq: "Kontakt", en: "Contact" },
  data_protection: { sq: "Garancioni", en: "Warranty" },
  location: { sq: "Vendndodhja Jonë", en: "Our Location" },
  quick_links: { sq: "Linqe të Shpejta", en: "Quick Links" },
  home: { sq: "Ballina", en: "Home" },
  inventory: { sq: "Inventari", en: "Inventory" },
  saved: { sq: "Të Ruajtura", en: "Saved" },
  all_rights: { sq: "Të gjitha të drejtat e rezervuara.", en: "All rights reserved." },
  back: { sq: "Kthehu mbrapa", en: "Back" },
  choose_make_first: { sq: "Zgjidhni markën fillimisht", en: "Choose make first" },
  no_models: { sq: "Nuk ka modele", en: "No models" },

  // /cars page — sidebar
  filters: { sq: "Filtrat", en: "Filters" },
  clear_all: { sq: "Pastro të gjitha", en: "Clear all" },
  filter_make_model: { sq: "Marka, Modeli, Versioni", en: "Make, Model, Trim" },
  filter_body_type: { sq: "Lloji i veturës", en: "Body type" },
  filter_registration: { sq: "Regjistrimi", en: "Registration" },
  filter_fuel_type: { sq: "Lloji i karburantit", en: "Fuel type" },
  filter_price: { sq: "Çmimi", en: "Price" },
  filter_mileage: { sq: "Kilometrazhi (km)", en: "Mileage (km)" },
  filter_transmission: { sq: "Tipi i transmisionit", en: "Transmission type" },

  // /cars page — filter modal shared
  modal_clear: { sq: "Pastro", en: "Clear" },
  modal_show_results: { sq: "Shfaq rezultate", en: "Show results" },
  modal_from: { sq: "Nga", en: "From" },
  modal_to: { sq: "Deri", en: "To" },
  modal_up_to: { sq: "Deri në", en: "Up to" },
  modal_min: { sq: "Min", en: "Min" },
  modal_max: { sq: "Maks", en: "Max" },
  modal_all: { sq: "Të gjitha", en: "All" },
  modal_make: { sq: "Marka", en: "Make" },
  modal_model: { sq: "Modeli", en: "Model" },

  // /cars page — results header
  offers_for_search: { sq: "oferta për kërkimin tuaj", en: "Offers for your search" },
  search_placeholder: { sq: "Kërko modele, opsione...", en: "Search models, options..." },
  loading: { sq: "Duke ngarkuar…", en: "Loading…" },
  price_on_request: { sq: "Kontakto për çmimin", en: "Contact for price" },
  // Car detail page
  add_to_list: { sq: "Shto në listë", en: "Add to list" },
  share: { sq: "Shpërnda", en: "Share" },
  print: { sq: "Printo", en: "Print" },
  send_email: { sq: "Dërgo Email", en: "Send Email" },
  show_number: { sq: "Shfaq numrin", en: "Show number" },
  cta_whatsapp: { sq: "Kontakto në WhatsApp", en: "Contact on WhatsApp" },
  cta_instagram: { sq: "Kontakto në Instagram", en: "Contact on Instagram" },
  cta_warranty: { sq: "Garancioni", en: "Warranty" },
  view_on_encar: { sq: "Encar", en: "Encar" },
  download_card: { sq: "Shkarko", en: "Download" },
  monthly_insurance: { sq: "Sigurimi mujor", en: "Monthly insurance" },
  spec_mileage: { sq: "Kilometrazhi", en: "Mileage" },
  spec_gearbox: { sq: "Transmisioni", en: "Gearbox" },
  spec_first_registration: { sq: "Regjistrimi i parë", en: "First registration" },
  spec_fuel_type: { sq: "Karburanti", en: "Fuel type" },
  spec_power: { sq: "Fuqia", en: "Power" },
  spec_seller: { sq: "Shitësi", en: "Seller" },
  spec_body_type: { sq: "Lloji i karrocerisë", en: "Body type" },
  spec_color: { sq: "Ngjyra", en: "Color" },
  not_found_title: { sq: "Vetura nuk u gjet", en: "Car not found" },
  not_found_body: {
    sq: "Kjo veturë mund të jetë shitur ose hequr nga lista. Provo një kërkim tjetër.",
    en: "This car may have been sold or removed. Try a different search.",
  },
  back_to_listings: { sq: "Kthehu te listimet", en: "Back to listings" },
  prev_image: { sq: "Foto e mëparshme", en: "Previous photo" },
  next_image: { sq: "Foto tjetër", en: "Next photo" },
  copy_link: { sq: "Kopjo lidhjen", en: "Copy link" },
  link_copied: { sq: "Lidhja u kopjua!", en: "Link copied!" },
  major_options: { sq: "Pajisjet kryesore", en: "Major Options" },
  view_all_options_prefix: { sq: "Shiko të gjitha", en: "View all" },
  view_all_options_suffix: { sq: "pajisjet", en: "options" },
  hide_all_options: { sq: "Fshih pajisjet", en: "Hide options" },

  // Inspection
  vehicle_condition: { sq: "Gjendja e automjetit", en: "Vehicle condition" },
  encar_accident_free: { sq: "Encar e diagnostikoi si pa aksidente.", en: "Encar diagnosed it as accident-free." },
  encar_diagnosed: { sq: "Encar ka diagnostikuar këtë automjet.", en: "Encar diagnosed this vehicle." },
  frame_diagnosis: { sq: "Diagnoza e kornizës", en: "Frame diagnosis" },
  external_panel_diagnosis: { sq: "Diagnoza e paneleve të jashtme", en: "External panel diagnosis" },
  frame_diagnostic_items: { sq: "Elementet e diagnozës së kornizës", en: "Frame diagnostic items" },
  external_panel_diagnostic_items: { sq: "Elementet e diagnozës së paneleve të jashtme", en: "External panel diagnostic items" },
  normal: { sq: "Normale", en: "normal" },
  review: { sq: "Rishiko", en: "Review" },
  view_encar_diagnosis: { sq: "Shiko Diagnozën Encar", en: "View Encar Diagnosis" },
  accident_history: { sq: "Historiku i aksidenteve", en: "Accident History" },
  owner_changes: { sq: "Ndërrimet e pronarit", en: "Owner Changes" },
  total_accidents: { sq: "Totali i aksidenteve", en: "Total Accidents" },
  damage_to_my_car: { sq: "Historiku i siguracionit (dëme në këtë makinë)", en: "Insurance accident history (damage to my car)" },
  times: { sq: "herë", en: "times" },
  won: { sq: "won", en: "won" },
  no_accidents: { sq: "Asnjë aksident", en: "No accidents" },
  panel_front_door_left: { sq: "Dera e përparme (majtas)", en: "Front Door Left" },
  panel_back_door_left: { sq: "Dera e pasme (majtas)", en: "Back Door Left" },
  panel_trunk_lid: { sq: "Kapak bagazhi", en: "Trunk Lid" },
  panel_back_door_right: { sq: "Dera e pasme (djathtas)", en: "Back Door Right" },
  panel_front_door_right: { sq: "Dera e përparme (djathtas)", en: "Front Door Right" },
  panel_hood: { sq: "Kofano", en: "Hood" },
  panel_front_fender_right: { sq: "Fenderi i përparmë (djathtas)", en: "Front Fender Right" },
  panel_front_fender_left: { sq: "Fenderi i përparmë (majtas)", en: "Front Fender Left" },
  panel_roof: { sq: "Çati", en: "Roof" },
  panel_quarter_panel_left: { sq: "Paneli anësor (majtas)", en: "Quarter Panel Left" },
  panel_quarter_panel_right: { sq: "Paneli anësor (djathtas)", en: "Quarter Panel Right" },
  panel_side_sill_left: { sq: "Pragu anësor (majtas)", en: "Side Sill Left" },
  panel_side_sill_right: { sq: "Pragu anësor (djathtas)", en: "Side Sill Right" },
  inspection_report: { sq: "Raporti i inspektimit", en: "Inspection Report" },
  inspection_loading: { sq: "Duke ngarkuar inspektimin…", en: "Loading inspection…" },
  inspection_unavailable: {
    sq: "Inspektimi nuk është i disponueshëm për këtë veturë.",
    en: "Inspection report is not available for this car.",
  },
  inspection_summary: { sq: "Përmbledhja", en: "Summary" },
  inspection_mechanical: { sq: "Inspektimi mekanik", en: "Mechanical Inspection" },
  inspection_panels: { sq: "Karroceria", en: "Body Panels" },
  inspection_no_panel_issues: {
    sq: "Asnjë problem i identifikuar në karroceri.",
    en: "No body panel issues recorded.",
  },
  insp_accident: { sq: "Aksident", en: "Accident" },
  insp_simple_repair: { sq: "Riparim i thjeshtë", en: "Simple repair" },
  insp_mileage_match: { sq: "Kilometrazhi i verifikuar", en: "Verified mileage" },
  insp_warranty_engine: { sq: "Garanci motori", en: "Engine warranty" },
  insp_warranty_trans: { sq: "Garanci transmisioni", en: "Transmission warranty" },
  insp_color: { sq: "Ngjyra", en: "Color" },
  insp_inspector: { sq: "Inspektori", en: "Inspector" },
  insp_inspected_at: { sq: "Data e inspektimit", en: "Inspection date" },
  insp_yes: { sq: "Po", en: "Yes" },
  insp_no: { sq: "Jo", en: "No" },
  insp_unknown: { sq: "I/E panjohur", en: "Unknown" },
  insp_engine: { sq: "Motori", en: "Engine" },
  insp_transmission: { sq: "Transmisioni", en: "Transmission" },
  insp_drivetrain: { sq: "Sistemi i tërheqjes", en: "Drivetrain" },
  insp_steering: { sq: "Drejtimi", en: "Steering" },
  insp_brakes: { sq: "Frenat", en: "Brakes" },
  insp_electrical: { sq: "Sistemi elektrik", en: "Electrical" },
  insp_fuel: { sq: "Karburanti", en: "Fuel system" },
  insp_status_good: { sq: "Mirë", en: "Good" },
  insp_status_adequate: { sq: "I/E mjaftueshme", en: "Adequate" },
  insp_status_minor: { sq: "Rrjedhje e lehtë", en: "Minor seepage" },
  insp_status_leak: { sq: "Rrjedhje", en: "Leak" },
  insp_status_insufficient: { sq: "I/E pamjaftueshme", en: "Insufficient" },
  insp_status_excessive: { sq: "I/E tepërt", en: "Excessive" },
  insp_status_bad: { sq: "Defekt", en: "Faulty" },
  insp_status_present: { sq: "I/E pranishëm", en: "Present" },
  insp_status_unknown: { sq: "—", en: "—" },
  // Body panel statuses
  insp_panel_replaced: { sq: "I zëvendësuar", en: "Replaced" },
  insp_panel_panel_beat: { sq: "I rrahur", en: "Panel-beat" },
  insp_panel_corrosion: { sq: "Korrozion", en: "Corrosion" },
  insp_panel_scratch: { sq: "Gërvishtje", en: "Scratch" },
  insp_panel_damage: { sq: "I dëmtuar", en: "Damage" },
  insp_panel_welded: { sq: "I salduar", en: "Welded" },
  insp_panel_painted: { sq: "I lyer", en: "Painted" },
  insp_panel_dent: { sq: "I gërvishtur", en: "Dent" },
  insp_panel_unknown: { sq: "—", en: "—" },
  // Detailed inspection modal
  insp_view_more: { sq: "shiko më shumë →", en: "view more →" },
  insp_detailed_title: { sq: "Inspektimi i detajuar", en: "Detailed Inspection" },
  insp_table_section: { sq: "Pjesa", en: "Section" },
  insp_table_item: { sq: "Komponenti", en: "Component" },
  insp_table_status: { sq: "Statusi", en: "Status" },
  insp_close: { sq: "Mbyll", en: "Close" },
  sort_label: { sq: "Rendit", en: "Sort" },
  sort_best: { sq: "Rezultate më të mira", en: "Best results" },
  sort_price_asc: { sq: "Çmimi (ulët-lartë)", en: "Price (low to high)" },
  sort_price_desc: { sq: "Çmimi (lartë-ulët)", en: "Price (high to low)" },
  sort_newest: { sq: "Më të rejat", en: "Newest" },
  sort_mileage: { sq: "Kilometrazhi më i ulët", en: "Lowest mileage" },

  // /cars page — empty / error states
  could_not_load: { sq: "Nuk u ngarkuan rezultatet", en: "Could not load listings" },
  no_cars_match: { sq: "Asnjë makinë nuk përputhet me filtrat", en: "No cars match your filters" },
  try_widening: { sq: "Provoni të zgjeroni kërkimin ose pastro filtrat.", en: "Try widening your search or clearing some filters." },
  no_listings: { sq: "Nuk ka lista të disponueshme tani. Kontrolloni përsëri.", en: "There are no listings available right now. Please check back later." },
  clear_all_filters: { sq: "Pastro të gjitha filtrat", en: "Clear all filters" },
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
