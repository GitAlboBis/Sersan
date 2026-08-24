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
import { cn } from "@/lib/utils";

const BRIEF_MAILTO = `mailto:${CONTACT_EMAIL}?subject=Technical%20scoping%20brief`;

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
                <span>
                  {isEn ? "Start with a scoping call" : "Si parte da una scoping call"}
                </span>
              </p>

              {/* key={language}: SplitText owns this subtree once split; a
                  language swap must remount it or React reconciles against
                  orphaned nodes (same contract as SectionHeading's h2). */}
              {/* reveal='skew': the line-mask rise + a 3D rotationX/skewY
                  tilt-in gives the hard commercial closer its assertive beat. */}
              <h2 key={language} data-split-reveal data-reveal="skew" className="font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.028em] text-ink text-balance">
                {isEn ? (
                  <>
                    Bring us the system you{" "}
                    <span className="font-medium text-[hsl(var(--accent))]">
                      need to ship.
                    </span>
                  </>
                ) : (
                  <>
                    Portateci il sistema che{" "}
                    <span className="font-medium text-[hsl(var(--accent))]">
                      dovete mandare in produzione.
                    </span>
                  </>
                )}
              </h2>

              <p className="max-w-xl text-base leading-relaxed text-ink-mute sm:text-lg">
                {isEn
                  ? "Thirty minutes, one founder. Bring your workflow, your current stack, and where it breaks. We tell you whether to build, harden, or stop."
                  : "Trenta minuti, un fondatore. Portate il vostro flusso di lavoro, lo stack attuale e il punto in cui si rompe. Vi diciamo se conviene costruire, consolidare o fermarsi."}
              </p>

              <p className="max-w-xl text-sm leading-relaxed text-ink-mute">
                {isEn
                  ? "Read by one of the founders, not a queue. No marketing follow-ups, no demo decks."
                  : "La legge uno dei fondatori, non una coda di ticket. Nessun follow-up commerciale, nessuna presentazione demo."}
              </p>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* The pair was already `w-full sm:w-auto`, but the cva base's
                    `whitespace-nowrap` kept min-content at the full label
                    width — and a flex item's `min-width: auto` refuses to
                    compress past that, so at 320px it forced the column open.
                    CTA_FLUID_SM adds the wrap (see button.tsx). */}
                <Link href={START_HREF} className={CTA_WRAPPER_SM}>
                  <Button
                    variant="hero"
                    size="xl"
                    className={cn("group", CTA_FLUID_SM)}
                  >
                    {isEn
                      ? "Book a 30-min scoping call"
                      : "Prenota una scoping call di 30 min"}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href={BRIEF_MAILTO} className={CTA_WRAPPER_SM}>
                  <Button
                    variant="heroOutline"
                    size="lg"
                    className={CTA_FLUID_SM}
                  >
                    {isEn ? "Send a brief by email" : "Inviate un brief via email"}
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
                        ? `// after the scoping call`
                        : `// dopo la scoping call`}
                    </span>
                  </span>
                  <span className="cta-code-line" style={{ animationDelay: "120ms" }}>
                    <span className="text-ink-mute">const</span>{" "}
                    <span className="text-[hsl(var(--accent))]">whatYouGet</span>{" "}
                    <span className="text-ink-mute">= {"{"}</span>
                  </span>
                  <span className="cta-code-line" style={{ animationDelay: "240ms" }}>
                    {"  "}
                    <span className="text-ink">duration</span>:{" "}
                    <span className="text-[hsl(var(--accent))]">
                      {isEn ? `"30 min, 1 founder"` : `"30 min, 1 fondatore"`}
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
                {isEn
                  ? "Reply within 1 business day"
                  : "Risposta entro 1 giorno lavorativo"}
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
