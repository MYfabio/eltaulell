import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "El Taulell",
  description: "Espai educatiu multi-centre"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ca"><body>{children}</body></html>;
}
