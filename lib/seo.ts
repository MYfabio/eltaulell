import type { Metadata } from "next";

/**
 * Adreça pública canònica. Les URL canòniques, l'og:url i el sitemap en depenen.
 * És fixa (no ve de cap variable) perquè el domini tècnic de Railway o una instal·lació
 * de prova no s'anunciïn mai als cercadors com a adreça bona.
 */
export const URL_PUBLICA = "https://eltaulell.aulaia.cat";

export const NOM_SITE = "El Taulell";

/** Il·lustració del suro de classe que ja fa servir la portada. */
export const IMATGE_OG = {
  url: "/og.png",
  width: 1733,
  height: 909,
  alt: "El Taulell representat com un suro de classe amb notes de colors",
};

/**
 * Metadades d'una pàgina pública: canònica, indexació, Open Graph i targeta de X/Twitter.
 * Next.js substitueix (no fusiona) l'objecte openGraph del layout quan una pàgina en defineix un,
 * per això cada pàgina el rep sencer des d'aquí. El layout no en posa cap i marca noindex per
 * defecte, perquè les pàgines privades (taulell, tutoria, coordinació...) no heretin canònica,
 * og:url ni indexació.
 */
export function metadadesPublica({ titol, descripcio, cami, titolAbsolut = false }: {
  titol: string; descripcio: string; cami: string; titolAbsolut?: boolean;
}): Metadata {
  return {
    title: titolAbsolut ? { absolute: titol } : titol,
    description: descripcio,
    alternates: { canonical: cami },
    robots: { index: true, follow: true },
    openGraph: {
      title: titol,
      description: descripcio,
      url: cami,
      siteName: NOM_SITE,
      images: [IMATGE_OG],
      locale: "ca_ES",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: titol, description: descripcio, images: [IMATGE_OG.url] },
  };
}

/** JSON-LD dins un <script> sense risc d'injecció d'HTML. */
export const jsonLdSegur = (dades: unknown) => JSON.stringify(dades).replace(/</g, "\\u003c");
