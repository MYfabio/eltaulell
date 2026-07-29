import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://eltaulell-production.up.railway.app"),
  title: "El Taulell · Institut Can Roca",
  description:
    "El suro digital de la classe: avisos, tasques, activitats, consultes i orientació educativa.",
  openGraph: {
    title: "El Taulell",
    description: "Tot el que passa a classe, en un sol lloc.",
    images: [{ url: "/og.png", width: 1733, height: 909 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "El Taulell",
    description: "Tot el que passa a classe, en un sol lloc.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body>{children}</body>
    </html>
  );
}
