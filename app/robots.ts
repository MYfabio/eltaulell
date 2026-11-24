import type { MetadataRoute } from "next";
import { BOTS_CERCA_IA, BOTS_ENTRENAMENT } from "@/lib/bots";
import { URL_PUBLICA } from "@/lib/seo";

// Zones sense contingut públic: l'API, l'accés i l'activació de comptes, la demostració i
// tots els espais amb sessió (taulell, tutoria, coordinació, administració...). Les pàgines
// privades també porten noindex des del layout, per si se n'afegeix alguna que no sigui aquí.
const PRIVAT = [
  "/api/",
  "/acces",
  "/activar",
  "/administracio-plataforma",
  "/alumnat",
  "/calendari",
  "/consultes",
  "/coordinacio",
  "/demo",
  "/integracions",
  "/recuperar-contrasenya",
  "/restablir-contrasenya",
  "/sense-permis",
  "/taulell",
  "/tutoria",
  "/unirse",
];

// Els cercadors i els assistents que citen amb enllaç poden entrar a les pàgines públiques
// (portada, privacitat i termes, i els recursos de /_next); els bots que copien el web per
// entrenar models no poden entrar enlloc.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVAT },
      { userAgent: BOTS_CERCA_IA, allow: "/", disallow: PRIVAT },
      { userAgent: BOTS_ENTRENAMENT, disallow: "/" },
    ],
    sitemap: `${URL_PUBLICA}/sitemap.xml`,
  };
}
