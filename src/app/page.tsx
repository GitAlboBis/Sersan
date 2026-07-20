import CinematicSystemScroll from "@/components/sections/cinematic-system-scroll";
import CredibilityStrip from "@/components/sections/credibility-strip";
import ProblemSection from "@/components/sections/problem-section";
import CaseStudiesRail from "@/components/sections/case-studies-rail";
import ServicesSection from "@/components/sections/services-section";
import ProductionGradeSection from "@/components/sections/production-grade-section";
import FoundersRail from "@/components/sections/founders-rail";
import FixedScopeStrip from "@/components/sections/fixed-scope-strip";
import FitSection from "@/components/sections/fit-section";
import FinalCTA from "@/components/sections/final-cta";

/**
 * SerSan v2 — cinematic homepage.
 *
 * Section order follows PIANO_RESTYLE.md §3 (restyle step 2: proof lands by
 * viewport ~5). This intentionally desyncs docs/STRATEGY.md — the restyle
 * plan supersedes it. The flow front-loads credibility and named work:
 *
 *   01  Cinematic spine      — who/what/why-now (the wedge + H1)
 *   02  Credibility strip    — tier-1 names immediately after the spine
 *   03  Problem              — name the demo → production gap
 *   04  Work                 — sticky horizontal rail (13 engagements + WIP)
 *   05  Services             — what we build (pains surfaced per card)
 *   06  Production-grade     — operational definition + live artifacts
 *   07  Founders             — the people who ship every engagement
 *   08  Fixed-scope strip    — one-line process distillation (full map → /consulting)
 *   09  Fit                  — disqualify honestly
 *   10  Final CTA            — into /start
 *
 * Removed in restyle step 2: UseCasesSection (pains absorbed into Services +
 * /start intake), WorkInProgress teaser (its entry is the rail's closing
 * "In development" card), ProcessSection (moved to /consulting "How we
 * engage"), and the old CaseStudiesSection grid (replaced by the rail).
 */
export default function Home() {
  return (
    <div
      className="relative"
      itemScope
      itemType="https://schema.org/WebPage"
    >
      {/* data-line-anchor wrappers glue the WebGL signature line's curve
          waypoints to real section positions (src/webgl/curves/routeCurves.ts).
          Plain block divs — zero layout impact. The "hero" anchor also feeds
          the WebGL HeroLogo its pin range (span start/end). */}
      <div data-line-anchor="hero">
        <CinematicSystemScroll />
      </div>
      <div data-line-anchor="credibility">
        <CredibilityStrip />
      </div>
      <div data-line-anchor="problem">
        <ProblemSection />
      </div>
      {/* Restyle part B: the sticky horizontal rail of all 13 case studies +
          the "In development" card, scrubbed by vertical scroll (desktop) or
          natively swipeable (mobile/reduced-motion). The WebGL card planes
          (webgl/RailPlanes) sync to its [data-rail-card] rects. */}
      <div data-line-anchor="case-studies">
        <CaseStudiesRail />
      </div>
      {/* Zero-height anchor kept so the signature-line curve waypoint stays
          stable now that the WIP teaser's entry lives on the rail above. */}
      <div data-line-anchor="work-in-progress" />
      <div data-line-anchor="services">
        <ServicesSection />
      </div>
      <div data-line-anchor="production">
        <ProductionGradeSection />
      </div>
      <div data-line-anchor="founders">
        <FoundersRail />
      </div>
      <div data-line-anchor="process">
        <FixedScopeStrip />
      </div>
      <div data-line-anchor="fit">
        <FitSection />
      </div>
      {/* The gateway gap: the WebGL portal world-anchors here (transparent
          backdrop between sections) and the signature line threads it on
          its way into the final CTA. */}
      <div data-line-anchor="gateway" className="py-36 sm:py-52" />
      <div data-line-anchor="final-cta">
        <FinalCTA />
      </div>
    </div>
  );
}
