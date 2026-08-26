import type { MetadataRoute } from "next";
import { caseStudies } from "@/data/case-studies";
import { resources } from "@/data/resources";

const BASE = "https://www.sersan.io";

/**
 * Sitemap generator — picks up the static route table + the two dynamic
 * collections (case studies, writing). Next 16 caches the output unless
 * a request-time API is used; we use none, so this is precomputed at
 * build time and served as a single XML response.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // The four /services/* routes and /start were indexable but absent here,
  // and unreachable from the navbar and footer — the pages that describe what
  // SerSan actually builds, plus the page every primary CTA points at, were
  // the only ones a crawler could not find. Priority sits with /audit and
  // /consulting: these are the buying pages.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,             priority: 1.0, changeFrequency: "weekly",  lastModified: now },
    { url: `${BASE}/services/engineering`,   priority: 0.9, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/services/automation`,    priority: 0.9, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/services/mlops`,         priority: 0.9, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/services/architecture`,  priority: 0.9, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/start`,        priority: 0.9, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/audit`,        priority: 0.9, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/consulting`,   priority: 0.9, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/case-studies`, priority: 0.8, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/resources`,    priority: 0.7, changeFrequency: "weekly",  lastModified: now },
    { url: `${BASE}/about`,        priority: 0.6, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/contact`,      priority: 0.8, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/trust`,        priority: 0.4, changeFrequency: "yearly",  lastModified: now },
    { url: `${BASE}/privacy`,      priority: 0.2, changeFrequency: "yearly",  lastModified: now },
    { url: `${BASE}/terms`,        priority: 0.2, changeFrequency: "yearly",  lastModified: now },
    { url: `${BASE}/cookies`,      priority: 0.2, changeFrequency: "yearly",  lastModified: now },
  ];

  const caseStudyRoutes: MetadataRoute.Sitemap = caseStudies.map((cs) => ({
    url: `${BASE}/case-studies/${cs.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const articleRoutes: MetadataRoute.Sitemap = resources.map((a) => ({
    url: `${BASE}/resources/${a.slug}`,
    lastModified: a.publishedAt ? new Date(a.publishedAt) : now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...caseStudyRoutes, ...articleRoutes];
}
