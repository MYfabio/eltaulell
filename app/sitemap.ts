import type { MetadataRoute } from "next";
import { URL_PUBLICA } from "@/lib/seo";

// Només pàgines públiques: la resta demana sessió.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${URL_PUBLICA}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${URL_PUBLICA}/privacitat`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${URL_PUBLICA}/termes`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
