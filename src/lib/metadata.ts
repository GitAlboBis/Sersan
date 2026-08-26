/**
 * Per-page metadata builder.
 *
 * WHY THIS EXISTS
 * ---------------
 * Next.js does NOT derive `openGraph.title` from a page's `title` when the root
 * layout already declares an `openGraph` block — the parent's value simply
 * wins. `src/app/layout.tsx` declares one, and no page overrode it, so every
 * one of the ~20 routes shared the SAME social card: the homepage pitch.
 *
 * That was worst on the case-study detail pages. The 2026-08 repositioning went
 * to some trouble to make provenance unmissable — a prior-employer engagement
 * renders as "Prior experience — Michele Sanna at Revolut" on the card, in the
 * meta description and in the <title>. But the OG title fell back to the
 * generic studio line, so the one context where the attribution matters most —
 * a link pasted into LinkedIn or Slack, where the title is often ALL a reader
 * sees — was the one context that lost it.
 *
 * Use `pageMetadata()` for every route that has its own title. It keeps the OG
 * and Twitter cards locked to the page's own title and description so they
 * cannot drift apart again.
 */

import type { Metadata } from "next";

interface PageMetadataInput {
  /** The page title, WITHOUT the " · SerSan" suffix — the layout template adds it. */
  title: string;
  /** Meta description. Keep under ~160 characters. */
  description: string;
  /** Route path for the canonical URL, e.g. "/services/automation". */
  path: string;
  /**
   * Optional OG image path, relative to the site root. Routes with a
   * generated `opengraph-image` file do not need this — Next wires that up
   * automatically and it takes precedence.
   */
  image?: string;
  /** Set false for pages that should not be indexed. Defaults to true. */
  index?: boolean;
}

/**
 * Build a Metadata object whose OG and Twitter cards match the page's own
 * title and description, rather than silently inheriting the layout's.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  index = true,
}: PageMetadataInput): Metadata {
  /**
   * Declaring `openGraph` here REPLACES the layout's block outright — Next
   * does not deep-merge it. So every field the layout set has to be restated,
   * or the page silently loses it. The first cut of this helper set only
   * title/description/url and dropped og:image, siteName, locale and
   * alternateLocale from fifteen indexable routes, which is a worse failure
   * than the generic-title bug it was written to fix: a card with the right
   * words and no image is a grey rectangle in a LinkedIn feed.
   *
   * Routes that ship their own `opengraph-image` file still win over this
   * default — Next wires that up per-route and it takes precedence.
   */
  const images = [
    {
      url: image ?? "/og-image.png",
      width: 1200,
      height: 630,
      alt: title,
    },
  ];

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: path,
      siteName: "SerSan",
      locale: "en_GB",
      alternateLocale: ["it_IT"],
      images,
    },
    twitter: {
      card: "summary_large_image",
      site: "@sersan_io",
      title,
      description,
      images: [image ?? "/og-image.png"],
    },
  };
}
