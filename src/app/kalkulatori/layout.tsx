import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalkulatori i Doganës",
  description:
    "Llogaritni taksat doganore për importin e veturës në Kosovë — akciza, tatimi në import dhe TVSH. Vlerësim i përafërt në sekonda.",
  alternates: {
    canonical: "https://dreshajelitecars.com/kalkulatori",
  },
};

export default function KalkulatoriLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
