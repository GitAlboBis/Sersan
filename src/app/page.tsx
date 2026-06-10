import CinematicSystemScroll from "@/components/sections/cinematic-system-scroll";
// CredibilityStrip ("Pensato per SaaS · fintech · …") temporarily unmounted
// (user 2026-06-10): the spine now hands off to the rest of the page through
// the 3D camera-descent beat, and the divider strip broke that flow. Restore
// by re-adding the import + the block below.
// import CredibilityStrip from "@/components/sections/credibility-strip";
import ProblemSection from "@/components/sections/problem-section";
import ServicesSection from "@/components/sections/services-section";
import UseCasesSection from "@/components/sections/use-cases-section";
import ProductionGradeSection from "@/components/sections/production-grade-section";
import CaseStudiesSection from "@/components/sections/case-studies-section";
import WorkInProgress from "@/components/sections/work-in-progress";
import FoundersSection from "@/components/sections/founders-section";
import ProcessSection from "@/components/sections/process-section";
import FitSection from "@/components/sections/fit-section";
import FinalCTA from "@/components/sections/final-cta";

/**
 * SerSan v2 — cinematic homepage.
 *
 * Section order is set in docs/STRATEGY.md (the consolidated rebuild brief).
 * Re-ordering here without updating that doc will desync the two. The flow
 * answers a CTO's questions in the order they actually ask them:
 *
 *   01  Cinematic spine      — who/what/why-now (the wedge + H1)
 *   02  Credibility strip    — earn permission to keep reading
 *   03  Problem              — name the demo → production gap
 *   04  Services             — what we build, concretely
 *   05  Production-grade     — operational definition + live artifacts
 *   06  Use cases            — self-locate ("that's our situation")
 *   07  Work                 — real named engagements (13 case studies)
 *   08  Founders             — the two people who ship every engagement
 *   09  Process              — Diagnose / Architect / Build / Harden
 *   10  Fit                  — disqualify honestly
 *   11  Final CTA            — into /start
 *
 * Demoted (return when there's a reason): ContactForm.
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
      {/* Zero-height anchor kept so the signature-line curve waypoints stay
          stable while the strip is unmounted. */}
      <div data-line-anchor="credibility" />
      <div data-line-anchor="problem">
        <ProblemSection />
      </div>
      <div data-line-anchor="services">
        <ServicesSection />
      </div>
      <div data-line-anchor="production">
        <ProductionGradeSection />
      </div>
      <div data-line-anchor="use-cases">
        <UseCasesSection />
      </div>
      <div data-line-anchor="case-studies">
        <CaseStudiesSection />
      </div>
      <div data-line-anchor="work-in-progress">
        <WorkInProgress variant="teaser" />
      </div>
      <div data-line-anchor="founders">
        <FoundersSection />
      </div>
      <div data-line-anchor="process">
        <ProcessSection />
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
