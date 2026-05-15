import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rreth Nesh",
  description:
    "Dreshaj Elite Cars — kompani e specializuar në importin e veturave cilësore nga Koreja Jugore. Mësoni më shumë rreth procesit tonë.",
  alternates: {
    canonical: "https://dreshajelitecars.com/about",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
