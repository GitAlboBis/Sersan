import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { ScrollSnapSections } from "@/components/scroll-snap-sections";
import { SectionBus } from "@/components/section-bus";
import { CanvasHost } from "@/webgl/CanvasHost";
import { Preloader } from "@/components/fx/preloader";
import { PerfHud } from "@/components/fx/perf-hud";
import { CardTiltController } from "@/components/fx/card-tilt-controller";
import { HeadingChoreographer } from "@/components/fx/heading-choreographer";
import { LabelScrambler } from "@/components/fx/label-scrambler";
import { CustomCursor } from "@/components/fx/custom-cursor";
import { FlipHandoffOverlay } from "@/components/fx/flip-handoff-overlay";
import { CommandPalette } from "@/components/fx/command-palette";
import { AudioTriggers } from "@/components/fx/audio-triggers";
import { Analytics } from "@vercel/analytics/next";

// Brand type stack (self-hosted via next/font, no runtime CDN requests):
// - Brand: Sersan Display — the custom logotype face (Jost, SIL OFL, see
//   ../fonts/LICENSE-Jost.txt) with two glyph amputations baked in: the A has
//   no crossbar and the R's bowl stops short of the stem. Weights 200/300
//   only; used for the SERSAN wordmark, nothing else.
// - Display: Fraunces (variable, optical sizing + italic) — the editorial
//   serif for big headings. Editorial New is no longer distributed by
//   Fontshare; Fraunces is what the live site already resolves to.
// - Body: Switzer (Fontshare, self-hosted woff2) — modern distinctive sans.
// - Mono: JetBrains Mono — eyebrows, labels, tabular numerics.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const sersanDisplay = localFont({
  variable: "--font-sersan-display",
  src: [
    { path: "../fonts/sersan-display-200.woff2", weight: "200", style: "normal" },
    { path: "../fonts/sersan-display-300.woff2", weight: "300", style: "normal" },
  ],
  display: "swap",
});

const switzer = localFont({
  variable: "--font-switzer",
  src: [
    { path: "../fonts/switzer-300.woff2", weight: "300", style: "normal" },
    { path: "../fonts/switzer-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/switzer-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/switzer-600.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jbm",
  subsets: ["latin"],
  weight: ["400", "500"],
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
  themeColor: "#0B1422",
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

  // Pre-hydration language stamp — the dark-mode-toggle trick, applied to
  // EN/IT. Reading cookies() here would flip every statically prerendered
  // route to dynamic rendering, so the shell stays static English and this
  // blocking inline script (SSR'd into <head>, runs before first paint)
  // resolves the visitor's persisted language and stamps <html lang> +
  // data-lang. It cannot retranslate the static English text — that swap is
  // LanguageProvider's pre-paint fade-through at hydration — but it makes the
  // document's declared language correct from the very first frame for
  // returning Italian visitors, and hands the provider a pre-paint source of
  // truth (detectInitial reads data-lang first). Storage priority mirrors
  // detectInitial: localStorage, then cookie. Everything is try-wrapped:
  // storage access can throw under hardened privacy modes, and a 404 page in
  // the wrong language beats a scripting error before paint.
  const langStamp = `(function(){try{var l=null;try{var s=localStorage.getItem("sersan_language");if(s==="en"||s==="it")l=s}catch(e){}if(!l){var m=document.cookie.match(/(?:^|;\\s*)sersan_language=(en|it)/);if(m)l=m[1]}if(l&&l!=="en"){var d=document.documentElement;d.lang=l;d.setAttribute("data-lang",l)}}catch(e){}})();`;

  return (
    /* Static lang="en" keeps this a non-dynamic Server Component (so the page
       stays statically prerendered). The inline stamp above corrects lang +
       data-lang pre-paint for returning Italian visitors, and LanguageProvider
       keeps document.lang in sync on every later switch.
       suppressHydrationWarning is scoped to THIS element only (one level
       deep): the stamp legitimately mutates <html> attributes before React
       hydrates, and the mismatch is by design, not a bug to surface. */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${switzer.variable} ${jetbrainsMono.variable} ${sersanDisplay.variable} h-full antialiased`}
    >
      <head>
        {/* Must run BEFORE first paint — a plain blocking inline script, the
            only reliable pre-paint hook a static shell has. */}
        <script dangerouslySetInnerHTML={{ __html: langStamp }} />
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
            {/* First-load preloader — a sober mono % counter + bar + 52. mark
                that counts real readiness to 100, then wipes up while the
                signature line draws in (introStore hand-off). Client-only
                (mounts after hydration → no SSR mismatch), shows once per hard
                load (layout persists across soft navigations), and is skipped
                entirely under prefers-reduced-motion. */}
            <Preloader />
            {/* Persistent WebGL layer — fixed, behind everything (z-0).
                Mounted at layout level so the GL context survives route
                changes. Decorative only: aria-hidden + pointer-events:none
                live inside CanvasHost. */}
            <CanvasHost />
            {/* Dev/preview `?perf=1` overlay (mobile-parity plan Phase 6.1):
                fps / dpr / draw calls / fxBudget / renderer readout fed by the
                in-Canvas PerfProbe. Self-gated on tierStore.perfHud (only ever
                true after resolve() on the client, behind devOverridesAllowed)
                → renders null on the server and in production. */}
            <PerfHud />
            {/* Section-state bus writer — measures [data-line-anchor] spans,
                publishes the active section + scroll direction to
                useSectionStore. Lives OUTSIDE the Canvas so the bus works on
                every tier, including "off". Renders nothing. */}
            <SectionBus />
            {/* Site-wide scroll snap: registers [data-snap] sections on each
                route into lib/scroll-snap (client request 2026-07-23 — every
                section settles centered; hard flicks still lock on). */}
            <ScrollSnapSections />
            <CardTiltController />
            <HeadingChoreographer />
            {/* Mono eyebrow/label decode-scramble — one delegated observer. */}
            <LabelScrambler />
            <CustomCursor />
            {/* Persistent card→detail Flip "flying image" handoff overlay.
                Renders null normally; on arrival at a /case-studies/<slug> with
                a fresh armed snapshot it flies a fixed image clone (z-70, above
                the curtain) from the clicked card onto the detail hero. */}
            <FlipHandoffOverlay />
            {/* Procedural UI sounds (hover/click via delegated listeners +
                AudioContext autoplay-gesture unlock). Renders nothing. */}
            <AudioTriggers />
            {/* ⌘K / Ctrl+K quick-nav palette (fx/command-palette). Renders a
                portal dialog on demand; nothing at rest. */}
            <CommandPalette />
            <Navbar />
            {/* Content wrapper above the canvas (z-1). The canvas adds
                light behind this layer; text stays DOM-crisp.
                data-lang-fade: LanguageProvider's swap beat dims THIS wrapper
                (opacity only — no transform, so fixed descendants keep the
                viewport as their containing block) while the EN↔IT copy
                swaps, then fades it back up. The navbar sits outside on
                purpose: its one translated label isn't worth dimming the
                persistent chrome, and the toggle itself must stay crisp
                mid-beat. */}
            <div
              data-lang-fade
              className="relative z-[1] flex flex-1 flex-col"
            >
              <main id="main" className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </SmoothScrollProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
