import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { Analytics } from "@vercel/analytics/next";

// Self-hosted via next/font/google (no CDN). Geist Sans drives both display
// and body; Geist Mono handles eyebrows/code. The serif is gone — the brand
// now reads as modern-technical, not editorial.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sersan.io"),
  // Title structure: page-specific value goes first (template appends the
  // brand). Default fronts the hero promise + the buyer query.
  title: {
    default: "SerSan — Production AI Systems Beyond the Demo",
    template: "%s · SerSan",
  },
  // ~155 chars — under the 160 cap, leads with the value (production AI
  // that works), names the actual deliverables, names the audience.
  description:
    "Founder-led AI engineering studio for SaaS, fintech, and regulated teams. We build custom software and web apps with AI agents inside — plus automation, MLOps, architecture, and audits to keep them reliable in production.",
  keywords: [
    "AI engineering studio",
    "production AI",
    "AI agents",
    "AI workflow automation",
    "MLOps",
    "AI systems architecture",
    "technical AI audit",
    "AI consulting",
    "AI product builds",
    "AI engineering",
    "AI infrastructure",
    "EU AI Act",
    "DORA",
    "agentic systems",
    "fintech AI",
    "regulated AI",
    "AI software development",
  ],
  authors: [{ name: "SerSan Limited" }],
  creator: "SerSan",
  alternates: {
    canonical: "/",
    languages: { en: "/", it: "/" },
  },
  openGraph: {
    type: "website",
    title: "Production AI systems that work beyond the demo",
    description:
      "Founder-led AI engineering studio for technical teams. Custom software and web apps with AI agents inside — plus automation, MLOps, architecture, and audits. Built for real operations, not stage demos.",
    url: "https://www.sersan.io/",
    siteName: "SerSan",
    locale: "en_GB",
    alternateLocale: ["it_IT"],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SerSan — production AI systems beyond the demo. Founder-led engineering studio.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@sersan_io",
    title: "Production AI systems that work beyond the demo",
    description:
      "Founder-led AI engineering studio. Custom software and web apps with AI agents inside — plus automation, MLOps, architecture, and audits. Reliable systems, not prototypes.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Organization JSON-LD — helps search & AI surfaces understand SerSan's
  // positioning at a glance. Kept tight: claims we can verify only.
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SerSan",
    legalName: "SerSan Limited",
    url: "https://www.sersan.io",
    logo: "https://www.sersan.io/og-image.png",
    description:
      "AI engineering studio. Production-grade AI systems — agents, automation, MLOps, architecture, and audits.",
    foundingLocation: { "@type": "Place", name: "London, United Kingdom" },
    areaServed: ["United Kingdom", "European Union"],
    knowsAbout: [
      "AI agents",
      "Workflow automation",
      "MLOps",
      "AI systems architecture",
      "Technical AI audits",
      "Production AI",
    ],
    sameAs: [
      "https://www.linkedin.com/company/sersan-limited/",
    ],
  };

  return (
    /* Static lang="en" keeps this a non-dynamic Server Component (so the page
       stays statically prerendered). LanguageProvider updates document.lang
       client-side when the user switches to Italian. */
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <a href="#main" className="skip-to-content">
          Skip to content
        </a>
        <LanguageProvider>
          <SmoothScrollProvider>
            <Navbar />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
          </SmoothScrollProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
