import type { MetadataRoute } from "next";

const BASE = "https://eltaulell.aulaia.cat";

// Només pàgines públiques: la resta demana sessió.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/privacitat`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/termes`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
