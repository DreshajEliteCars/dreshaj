import "./globals.css";

export const metadata = {
  title: "AutoScout24 – Used and New Cars",
  description: "Find used vehicles and new vehicles on AutoScout24, Europe's largest online car market.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
