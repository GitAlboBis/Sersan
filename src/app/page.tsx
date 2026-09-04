import CinematicSystemScroll from "@/components/sections/cinematic-system-scroll";
import SingularityPassage from "@/components/sections/singularity-passage";
import ProblemSection from "@/components/sections/problem-section";
import FeaturedWork from "@/components/sections/featured-work";
import ServicesSection from "@/components/sections/services-section";
import ProductionGradeSection from "@/components/sections/production-grade-section";
import FoundersRail from "@/components/sections/founders-rail";
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
 *   02  Singularity passage  — THE LONG TAKE: beat 05 → black-hole plunge
 *                              (replaced the credibility reel, 2026-08-07;
 *                              institution-marks.tsx stays parked for reuse)
 *   03  Problem              — name the demo → production gap
 *   04  Production-grade     — the answer, DIRECTLY under the problem (D19
 *                              merge, owner 2026-08-26: death → rebirth is one
 *                              continuous on-camera passage, no interlude)
 *   05  Work                 — sticky horizontal rail (caseStudies + WIP)
 *   06  Services             — what we build (pains surfaced per card)
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
      {/* The passage claims the "credibility" anchor slot so the signature
          line's route-curve waypoint (routeCurves.ts) keeps resolving — a
          missing anchor with no `at` fallback collapses that waypoint to
          document fraction 0 and deforms the whole home curve. */}
      <div data-line-anchor="credibility">
        <SingularityPassage />
      </div>
      <div data-line-anchor="problem">
        <ProblemSection />
      </div>
      {/* D19 MERGE (owner 2026-08-26): the healthy act sits DIRECTLY under the
          broken one — death → rebirth happens on camera, no interlude. The
          problem→production boundary deliberately has NO PostFX cut
          (CUT_BOUNDARY_PAIRS omits it): the passage owns its own transition.
          routeCurves.ts "/" waypoints mirror this order — move them together. */}
      <div data-line-anchor="production">
        <ProductionGradeSection />
      </div>
      {/* Work-section refactor (2026-08-20, ANALISI_LUSION_WORK.md): the
          Lusion-grammar Featured Work grid — two columns of large media
          cards with rolling titles. Replaces the sticky horizontal rail;
          the WebGL depth-parallax planes (webgl/FeaturedWorkPlanes) sync to
          its [data-featured-media] rects on the flag-ON full-tier path. */}
      <div data-line-anchor="case-studies">
        <FeaturedWork />
      </div>
      {/* Zero-height anchor kept so the signature-line curve waypoint stays
          stable now that the WIP teaser's entry lives on the rail above. */}
      <div data-line-anchor="work-in-progress" />
      <div data-line-anchor="services">
        <ServicesSection />
      </div>
      <div data-line-anchor="founders">
        <FoundersRail />
      </div>
      {/* REMOVED 2026-09-04 (owner: "ci sono disclaimer con scritte piccole
          inutili" — the fixed-scope strip was named). It was a 13.5px card
          restating CONTINUATION, which /consulting renders in full under "How
          we engage"; the two /#process links that pointed here (start-client,
          service-detail) now go straight to /consulting#process.
          The ANCHOR STAYS as a zero-height div — same treatment as
          "work-in-progress" above: routeCurves has a waypoint keyed on
          "process" and an unresolvable anchor collapses it to document
          fraction 0, which deforms the whole home curve. The component file
          is parked, not deleted (institution-marks precedent). */}
      <div data-line-anchor="process" />
      <div data-line-anchor="fit">
        <FitSection />
      </div>
      {/* The gateway gap: the WebGL portal world-anchors here (transparent
          backdrop between sections) and the signature line threads it on
          its way into the final CTA.

          MOBILE_HOME_SPEC §5.5: `py-36` → `py-24` cuts the phone's gap 288 →
          192px. Deliberately a third off and NOT the 128px a pure
          scroll-budget argument would take: GatewayPortal already mounts on
          lite, it is the one 3D object a phone gets, and the anchor above must
          stay resolvable (see the :68 warning) — an anchor squeezed to nothing
          deforms the curve waypoint it feeds. `sm:py-52` is untouched, so
          every viewport ≥640px is byte-identical. */}
      <div data-line-anchor="gateway" className="py-24 sm:py-52" />
      <div data-line-anchor="final-cta">
        <FinalCTA />
      </div>
    </div>
  );
}
