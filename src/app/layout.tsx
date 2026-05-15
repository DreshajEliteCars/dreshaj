import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { LanguageProvider } from "../context/LanguageContext";

const SITE_URL = "https://dreshajelitecars.com";
const GA_ID = "G-SJDVSZG07N";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dreshaj Elite Cars — Vetura Premium nga Korea",
    template: "%s | Dreshaj Elite Cars",
  },
  description:
    "Import dhe shitje e veturave cilësore nga Koreja Jugore. Inspektim i plotë, garancion nga kompania, dërgim deri në Durrës. Pejë, Kosovë.",
  keywords: [
    "vetura",
    "makina",
    "auto",
    "import",
    "Kosovë",
    "Pejë",
    "Korea",
    "Encar",
    "Dreshaj",
    "Elite Cars",
    "BMW",
    "Mercedes",
    "Volkswagen",
    "Audi",
    "garancion",
  ],
  authors: [{ name: "Dreshaj Elite Cars" }],
  creator: "Dreshaj Elite Cars",
  publisher: "Dreshaj Elite Cars",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "sq_AL",
    url: SITE_URL,
    siteName: "Dreshaj Elite Cars",
    title: "Dreshaj Elite Cars — Vetura Premium nga Korea",
    description:
      "Import dhe shitje e veturave cilësore nga Koreja Jugore. Inspektim i plotë, garancion, dërgim deri në Durrës.",
    images: [
      {
        url: "/images/logo.png",
        width: 512,
        height: 512,
        alt: "Dreshaj Elite Cars Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dreshaj Elite Cars — Vetura Premium nga Korea",
    description:
      "Import dhe shitje e veturave cilësore nga Koreja Jugore. Inspektim i plotë, garancion, dërgim deri në Durrës.",
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: "/images/favicon.jpg",
  },
  verification: {
    google: "M3HyUrYmG0AdtH_X7BVl3MdATWZlO5tzYmLA8Tx_GUE",
  },
};

// Organization + WebSite JSON-LD for rich results in Google.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Dreshaj Elite Cars",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/logo.png`,
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+383-44-202-673",
        contactType: "sales",
        availableLanguage: ["Albanian", "English"],
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: "Rruga Smail Quku 34, Nabergjan",
        addressLocality: "Pejë",
        addressCountry: "XK",
        postalCode: "30000",
      },
      sameAs: [
        "https://www.instagram.com/dreshajelitecars",
        "https://wa.me/37744202673",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Dreshaj Elite Cars",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "sq",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sq">
      <head>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
