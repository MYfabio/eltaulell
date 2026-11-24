import type { Metadata } from "next";
import { URL_PUBLICA } from "@/lib/seo";
import "./globals.css";
import "./portal.css";

// Sense canònica ni Open Graph globals i amb noindex per defecte: només les pàgines públiques
// (portada, privacitat i termes, via lib/seo.ts) es deixen indexar i porten canònica, perquè
// cap pàgina privada n'hereti una que apunti a la portada.
export const metadata: Metadata = {
  metadataBase: new URL(URL_PUBLICA),
  title: "El Taulell · La comunitat educativa, més connectada",
  description:
    "Plataforma educativa multi-centre per comunicar, escoltar l’alumnat i millorar l’acompanyament tutorial.",
  robots: { index: false, follow: false },
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
