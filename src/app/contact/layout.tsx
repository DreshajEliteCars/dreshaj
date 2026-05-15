import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Na Kontaktoni",
  description:
    "Kontaktoni Dreshaj Elite Cars përmes WhatsApp, email ose na vizitoni në Pejë. Jemi të gatshëm t'ju ndihmojmë me çdo pyetje rreth veturave.",
  alternates: {
    canonical: "https://dreshajelitecars.com/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
