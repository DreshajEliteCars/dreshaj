import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veturat — Katalogi",
  description:
    "Shfletoni katalogun e plotë të veturave të importuara nga Koreja Jugore. BMW, Mercedes-Benz, Volkswagen, Audi e shumë të tjera — me garancion dhe dërgim deri në Durrës.",
  alternates: {
    canonical: "https://dreshajelitecars.com/cars",
  },
};

export default function CarsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
