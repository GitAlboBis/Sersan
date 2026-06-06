import type { MetadataRoute } from "next";

const BASE = "https://www.sersan.io";

/**
 * robots.txt — allow everything index-able, point crawlers at the sitemap.
 * Disallow only ephemeral / preview routes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      // AI training crawlers — allow (Sersan WRITES about AI, surface presence is on-brand).
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot"],
        allow: "/",
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
