import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/$", "/_next/", "/privacitat", "/termes"], disallow: "/" },
    sitemap: "https://eltaulell.aulaia.cat/sitemap.xml",
  };
}
