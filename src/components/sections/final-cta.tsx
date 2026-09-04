"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  Button,
  CTA_FLUID_SM,
  CTA_WRAPPER_SM,
} from "@/components/ui/button";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { START_HREF, CONTACT_EMAIL } from "@/lib/site";
import { track, EVENTS } from "@/lib/analytics";
import { CTA, FACTS, pick } from "@/data/copy";
import { cn } from "@/lib/utils";

const BRIEF_MAILTO = `mailto:${CONTACT_EMAIL}?subject=Project%20brief`;

/**
 * FinalCTA — the page closer.
 *
 * Premium closing panel that conforms to the shared section grammar: a single
 * card-steel-equivalent surface (hairline rule, --radius-lg), one SectionGlow
 * behind the most important element, --accent used sparingly (one emphasis in
 * the headline plus the artifact values), Geist type, container-px width.
 *
 * Primary CTA goes to /start (the technical intake page). Secondary CTA is the
 * mailto for the buyer who'd rather write a brief than fill a form. The right
 * panel renders the refined `what_you_get.ts` artifact: the one place on the
 * homepage we use code as the closing promise. Calm, no hype.
 *
 * The artifact <pre> is a genuine horizontal scroller on phones (its lines are
 * `white-space: pre` and the longest overruns a ~340px column), so it carries
 * `data-lenis-prevent` — the site-wide contract for any overflow-x child, so a
 * sideways drag inside it is never stolen by the smooth-scroll wrapper.
 */
export default function FinalCTA() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // Trigger the line-by-line clip reveal only when the code block scrolls
  // into view (it sits at the very bottom of the page). The `is-writing`
  // class kicks off the staggered CSS animation; under reduced-motion the
  // class is harmless (the reduced-motion rule keeps every line visible).
  const codeRef = useRef<HTMLPreElement | null>(null);
  useEffect(() => {
    const el = codeRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-writing");
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="contact"
      // Round 8-A: `data-snap` removed (free sections no longer settle).
      // `scroll-mt-24` stays — it serves native `#contact` anchor navigation,
      // which the snap engine never read.
      className="relative section-lg scroll-mt-24 overflow-hidden"
    >
      <div className="container-px relative">
        {/* TASK 6 — zero-height content-edge marker (section-cut driver). */}
        <div data-cut-edge="top" aria-hidden="true" />
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[hsl(var(--rule))] bg-[hsl(var(--surface)/0.4)]">
          {/* One glow, behind the single most important element. */}
          <SectionGlow position="top-right" intensity={0.9} size="46rem" />

          {/* MOBILE_HOME_SPEC §5.5: the panel's inner padding goes 56 → 40px
              per side below `sm`. `sm:py-20` already owned everything from
              640px up, so the base value was only ever a phone value and this
              is `sm:`-gated by construction. */}
          {/* `gap-10` → `gap-7` is the copy-block-to-artifact step while the
              panel is stacked; `sm:gap-10` restores it. Together with the
              padding above and the two column gaps below this is the 1035 →
              923px the §2 table budgets for this section — §5.5's padding line
              alone only accounts for two thirds of it. */}
          <div className="relative grid grid-cols-1 gap-7 px-6 py-10 sm:gap-10 sm:px-12 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:px-16">
            <div className="flex flex-col gap-4 sm:gap-5 lg:col-span-7">
              <p className="eyebrow inline-flex items-center gap-2 text-ink-mute">
                <span
                  aria-hidden="true"
                  className="inline-block h-px w-6 bg-[hsl(var(--accent))]"
                />
                <span>{pick(isEn, CTA.startWithProblem)}</span>
              </p>

              {/* key={language}: SplitText owns this subtree once split; a
                  language swap must remount it or React reconciles against
                  orphaned nodes (same contract as SectionHeading's h2). */}
              {/* reveal='skew': the line-mask rise + a 3D rotationX/skewY
                  tilt-in gives the hard commercial closer its assertive beat. */}
              <h2 key={language} data-split-reveal data-reveal="skew" className="font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.028em] text-ink text-balance">
                {isEn ? (
                  <>
                    Bring us the problem.{" "}
                    <span className="font-medium text-[hsl(var(--accent))]">
                      We&apos;ll bring the plan.
                    </span>
                  </>
                ) : (
                  <>
                    Portateci il problema.{" "}
                    <span className="font-medium text-[hsl(var(--accent))]">
                      Noi portiamo il piano.
                    </span>
                  </>
                )}
              </h2>

              <p className="max-w-xl text-base leading-relaxed text-ink-mute sm:text-lg">
                {isEn
                  ? "One workflow, one product idea, one system that keeps breaking, or something your team still does manually. Tell us what's happening. We'll tell you what we'd do next."
                  : "Un processo, un'idea di prodotto, un sistema che continua a rompersi o qualcosa che il vostro team fa ancora a mano. Raccontateci cosa succede. Vi diciamo cosa faremmo dopo."}
              </p>

              {/* REMOVED 2026-09-04 (owner: "disclaimer con scritte piccole
                  inutili"): "Two or three sentences is enough. No marketing
                  follow-ups, no demo decks." — a 14px permission-giver under a
                  paragraph that already says "Tell us what's happening. We'll
                  tell you what we'd do next." FACTS.briefIsEnough survives: it
                  still renders on /audit, /case-studies and the case-study
                  detail pages. */}

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* The pair was already `w-full sm:w-auto`, but the cva base's
                    `whitespace-nowrap` kept min-content at the full label
                    width — and a flex item's `min-width: auto` refuses to
                    compress past that, so at 320px it forced the column open.
                    CTA_FLUID_SM adds the wrap (see button.tsx). */}
                <Link
                  href={START_HREF}
                  className={CTA_WRAPPER_SM}
                  onClick={() =>
                    track(EVENTS.CTA_PROJECT_BRIEF, {
                      source_section: "final_cta",
                      lang: language,
                    })
                  }
                >
                  <Button
                    variant="hero"
                    size="xl"
                    className={cn("group", CTA_FLUID_SM)}
                  >
                    {pick(isEn, CTA.primary)}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link
                  href={BRIEF_MAILTO}
                  className={CTA_WRAPPER_SM}
                  onClick={() =>
                    track(EVENTS.CTA_EMAIL, { source_section: "final_cta" })
                  }
                >
                  <Button
                    variant="heroOutline"
                    size="lg"
                    className={CTA_FLUID_SM}
                  >
                    {pick(isEn, CTA.emailUs)}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: the refined what_you_get.ts artifact. */}
            <div className="flex flex-col gap-3 sm:gap-4 lg:col-span-5">
              <div className="cta-code-block overflow-hidden rounded-[var(--radius-lg)] border border-[hsl(var(--rule))] bg-[hsl(var(--bg)/0.7)] backdrop-blur-sm transition-[border-color,box-shadow] duration-500 hover:border-[hsl(var(--accent)/0.45)] hover:shadow-[0_0_40px_-12px_hsl(var(--accent)/0.4)]">
                <div className="flex items-center justify-between border-b border-[hsl(var(--rule))] px-4 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
                    what_you_get.ts
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
                    {isEn ? "fixed scope" : "scope fisso"}
                  </span>
                </div>
                {/* "Living code" — the full frozen text is ALWAYS present in
                    the DOM (screen-reader-visible). Only clip/opacity animate
                    each line left-to-right (no retype, no char-split). A
                    blinking cursor pseudo-element trails the last line. Under
                    reduced-motion every line is fully visible (cta-code class
                    neutralized below). */}
                {/* data-lenis-prevent (D-21): .cta-code-line is `white-space:
                    pre`, so the longest line overflows a ~340px phone column
                    and this <pre> is a real horizontal scroller. Without the
                    attribute Lenis swallows the drag and the block fights
                    vertical page scroll — the same guard the two horizontal
                    rails already carry (case-studies-rail, founders-rail). */}
                <pre
                  ref={codeRef}
                  data-lenis-prevent
                  className="cta-code overflow-x-auto px-4 py-4 font-mono text-[12px] leading-[1.65] text-ink/90"
                >
                  <span className="cta-code-line" style={{ animationDelay: "0ms" }}>
                    <span className="text-ink-mute">
                      {isEn
                        ? `// after your brief`
                        : `// dopo il vostro brief`}
                    </span>
                  </span>
                  <span className="cta-code-line" style={{ animationDelay: "120ms" }}>
                    <span className="text-ink-mute">const</span>{" "}
                    <span className="text-[hsl(var(--accent))]">whatYouGet</span>{" "}
                    <span className="text-ink-mute">= {"{"}</span>
                  </span>
                  <span className="cta-code-line" style={{ animationDelay: "240ms" }}>
                    {"  "}
                    <span className="text-ink">readBy</span>:{" "}
                    <span className="text-[hsl(var(--accent))]">
                      {isEn ? `"a founder"` : `"un fondatore"`}
                    </span>
                    <span className="text-ink-mute">,</span>
                  </span>
                  <span className="cta-code-line" style={{ animationDelay: "360ms" }}>
                    {"  "}
                    <span className="text-ink">price</span>:{" "}
                    <span className="text-[hsl(var(--accent))]">
                      {isEn ? `"free"` : `"gratis"`}
                    </span>
                    <span className="text-ink-mute">,</span>
                  </span>
                  <span className="cta-code-line" style={{ animationDelay: "480ms" }}>
                    {"  "}
                    <span className="text-ink">deliverable</span>:{" "}
                    <span className="text-[hsl(var(--accent))]">
                      {isEn ? `"a written next step"` : `"un prossimo step scritto"`}
                    </span>
                    <span className="text-ink-mute">,</span>
                  </span>
                  <span className="cta-code-line" style={{ animationDelay: "600ms" }}>
                    {"  "}
                    <span className="text-ink">verdict</span>:{" "}
                    <span className="text-[hsl(var(--accent))]">
                      {isEn
                        ? `"build | harden | stop"`
                        : `"costruire | consolidare | fermarsi"`}
                    </span>
                    <span className="text-ink-mute">,</span>
                  </span>
                  <span
                    className="cta-code-line cta-code-line--last"
                    style={{ animationDelay: "720ms" }}
                  >
                    <span className="text-ink-mute">{`};`}</span>
                  </span>
                </pre>
              </div>

              <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
                <span aria-hidden="true" className="status-dot" />
                {pick(isEn, FACTS.replyTime)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Each code line is a block; the full frozen text is always in the
           DOM. The reveal animates clip + opacity left-to-right ONLY after the
           block enters view (.is-writing), staggered via inline animationDelay.
           No retype, no character split. */
        .cta-code-line {
          display: block;
          white-space: pre;
        }
        .cta-code.is-writing .cta-code-line {
          opacity: 0;
          clip-path: inset(0 100% 0 0);
          animation: cta-line-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: inherit;
        }
        @keyframes cta-line-in {
          to { opacity: 1; clip-path: inset(0 0 0 0); }
        }
        /* Blinking cursor trails the last line once the block has written in. */
        .cta-code.is-writing .cta-code-line--last::after {
          content: "";
          display: inline-block;
          width: 0.5em;
          height: 1em;
          margin-left: 0.15em;
          vertical-align: -0.12em;
          background: hsl(var(--accent));
          opacity: 0;
          animation: cta-cursor-blink 1s step-end 1.3s infinite;
        }
        @keyframes cta-cursor-blink {
          0%, 49% { opacity: 0.9; }
          50%, 100% { opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cta-code.is-writing .cta-code-line {
            opacity: 1;
            clip-path: inset(0 0 0 0);
            animation: none;
          }
          .cta-code.is-writing .cta-code-line--last::after {
            display: none;
          }
          .cta-code-block { transition: none; }
        }
      `}</style>
    </section>
  );
}
