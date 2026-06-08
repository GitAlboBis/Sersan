import CinematicSystemScroll from "@/components/sections/cinematic-system-scroll";
import CredibilityStrip from "@/components/sections/credibility-strip";
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
import { SectionDivider } from "@/components/ui/section-divider";

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
 * Demoted (return when there's a reason): HowWeThinkSection,
 * FoundersNoteSection (older variant — superseded by FoundersSection),
 * ContactForm, AuditSection.
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
      <SectionDivider />
      <div data-line-anchor="problem">
        <ProblemSection />
      </div>
      <SectionDivider />
      <div data-line-anchor="services">
        <ServicesSection />
      </div>
      <SectionDivider />
      <div data-line-anchor="production">
        <ProductionGradeSection />
      </div>
      <SectionDivider />
      <div data-line-anchor="use-cases">
        <UseCasesSection />
      </div>
      <SectionDivider />
      <div data-line-anchor="case-studies">
        <CaseStudiesSection />
      </div>
      <SectionDivider />
      <div data-line-anchor="work-in-progress">
        <WorkInProgress variant="teaser" />
      </div>
      <SectionDivider />
      <div data-line-anchor="founders">
        <FoundersSection />
      </div>
      <SectionDivider />
      <div data-line-anchor="process">
        <ProcessSection />
      </div>
      <SectionDivider />
      <div data-line-anchor="fit">
        <FitSection />
      </div>
      {/* The gateway gap: the WebGL portal world-anchors here (transparent
          backdrop between sections) and the signature line threads it on
          its way into the final CTA. */}
      <div data-line-anchor="gateway" className="py-36 sm:py-52">
        <SectionDivider />
      </div>
      <div data-line-anchor="final-cta">
        <FinalCTA />
      </div>
    </div>
  );
}
