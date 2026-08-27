import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  async redirects() {
    return [
      // /faq was retired in restyle step 2: its engagement answers moved to
      // /consulting#faq (+ one to /audit), data-privacy answers to /trust.
      {
        source: "/faq",
        destination: "/consulting#faq",
        permanent: true,
      },
      // The navbar's second item is labelled "Services" and points at
      // /#services (services-section.tsx renders that id), and four
      // /services/<area> detail routes exist — but the bare /services path
      // never did, so a visitor who truncates /services/automation in the
      // address bar hits a 404.
      //
      // A REDIRECT, deliberately not a new route: routeCurves.ts keys its
      // detail-curve behaviour off DETAIL_PREFIXES = [… "/services/"], so a
      // real /services page would introduce a section-index route sitting
      // just outside that prefix and change what the signature line does.
      // Redirecting lands the visitor on the homepage section the nav already
      // points at, which is the same destination the label promises.
      {
        source: "/services",
        destination: "/#services",
        permanent: true,
      },
      // The "weekly scope, not multi-year retainers" article was repositioned
      // in the 2026-08 pass: SerSan now sells a Technical Partnership rung, so
      // an article arguing against long engagements contradicted the offer.
      // Title, excerpt and body were rewritten and the slug followed them.
      //
      // The old slug was live and in the sitemap, so it keeps working: a
      // renamed slug is invisible to a reader, but a dead inbound link is not.
      {
        source: "/resources/weekly-scope-not-multi-year-retainers",
        destination: "/resources/scope-you-can-stop-after-any-phase",
        permanent: true,
      },
    ];
  },
  images: {
    // AVIF first for better compression on photographic assets, with WebP
    // fallback for older clients.
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for a year — site imagery is static.
    minimumCacheTTL: 31536000,
    // Next 16 restricts the image-optimizer quality allow-list to [75] by
    // default. We allow 90 as well so any high-quality asset can opt in
    // without the optimizer returning 400 for that quality.
    qualities: [75, 90],
  },
};

export default nextConfig;
