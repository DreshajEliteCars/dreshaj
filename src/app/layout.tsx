import "./globals.css";

export const metadata = {
  title: "Dreshaj Elite Cars",
  description: "Find used vehicles and new vehicles on Dreshaj Elite Cars, Europe's largest online car market.",
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
