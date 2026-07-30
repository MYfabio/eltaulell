import type { Metadata } from "next";
import "./globals.css";
import "./portal.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://eltaulell-production.up.railway.app"),
  title: "El Taulell · La comunitat educativa, més connectada",
  description:
    "Plataforma educativa multi-centre per comunicar, escoltar l’alumnat i millorar l’acompanyament tutorial.",
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
