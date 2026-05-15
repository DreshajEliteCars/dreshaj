import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Garancioni i Kompanisë",
  description:
    "Garancioni i plotë i Dreshaj Elite Cars — motor, transmision, dëmtime gjatë transportit, dokumentacion dhe më shumë. Mbrojtje e plotë për blerësin.",
  alternates: {
    canonical: "https://dreshajelitecars.com/garancioni",
  },
};

export default function GarancioniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
