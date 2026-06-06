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

function SectionDivider() {
  return (
    <div aria-hidden="true" className="container-px py-1 relative z-10">
      <div className="section-rule mx-auto max-w-3xl" />
    </div>
  );
}

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
      <CinematicSystemScroll />
      <CredibilityStrip />
      <SectionDivider />
      <ProblemSection />
      <SectionDivider />
      <ServicesSection />
      <SectionDivider />
      <ProductionGradeSection />
      <SectionDivider />
      <UseCasesSection />
      <SectionDivider />
      <CaseStudiesSection />
      <SectionDivider />
      <WorkInProgress variant="teaser" />
      <SectionDivider />
      <FoundersSection />
      <SectionDivider />
      <ProcessSection />
      <SectionDivider />
      <FitSection />
      <SectionDivider />
      <FinalCTA />
    </div>
  );
}
