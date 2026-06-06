"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { START_HREF, CONTACT_EMAIL } from "@/lib/site";

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
 */
export default function FinalCTA() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <section
      id="contact"
      className="relative section-lg scroll-mt-24 overflow-hidden"
    >
      <div className="container-px relative">
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[hsl(var(--rule))] bg-[hsl(var(--surface)/0.4)]">
          {/* One glow, behind the single most important element. */}
          <SectionGlow position="top-right" intensity={0.9} size="46rem" />

          <div className="relative grid grid-cols-1 gap-10 px-6 py-14 sm:px-12 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:px-16">
            <div className="flex flex-col gap-5 lg:col-span-7">
              <p className="eyebrow inline-flex items-center gap-2 text-ink-mute">
                <span
                  aria-hidden="true"
                  className="inline-block h-px w-6 bg-[hsl(var(--accent))]"
                />
                <span>
                  {isEn ? "Start with a scoping call" : "Si parte da una scoping call"}
                </span>
              </p>

              <h2 className="font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.028em] text-ink text-balance">
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
                <Link href={START_HREF}>
                  <Button
                    variant="hero"
                    size="xl"
                    className="group w-full sm:w-auto"
                  >
                    {isEn
                      ? "Book a 30-min scoping call"
                      : "Prenota una scoping call di 30 min"}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href={BRIEF_MAILTO}>
                  <Button
                    variant="heroOutline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    {isEn ? "Send a brief by email" : "Inviate un brief via email"}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: the refined what_you_get.ts artifact. */}
            <div className="flex flex-col gap-4 lg:col-span-5">
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[hsl(var(--rule))] bg-[hsl(var(--bg)/0.7)] backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-[hsl(var(--rule))] px-4 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
                    what_you_get.ts
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
                    {isEn ? "fixed scope" : "scope fisso"}
                  </span>
                </div>
                <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-[1.65] text-ink/90">
                  <span className="text-ink-mute">
                    {isEn
                      ? `// after the scoping call`
                      : `// dopo la scoping call`}
                  </span>
                  {"\n"}
                  <span className="text-ink-mute">const</span>{" "}
                  <span className="text-[hsl(var(--accent))]">whatYouGet</span>{" "}
                  <span className="text-ink-mute">= {"{"}</span>
                  {"\n"}
                  {"  "}
                  <span className="text-ink">duration</span>:{" "}
                  <span className="text-[hsl(var(--accent))]">
                    {isEn ? `"30 min, 1 founder"` : `"30 min, 1 fondatore"`}
                  </span>
                  <span className="text-ink-mute">,</span>
                  {"\n"}
                  {"  "}
                  <span className="text-ink">price</span>:{" "}
                  <span className="text-[hsl(var(--accent))]">
                    {isEn ? `"free"` : `"gratis"`}
                  </span>
                  <span className="text-ink-mute">,</span>
                  {"\n"}
                  {"  "}
                  <span className="text-ink">deliverable</span>:{" "}
                  <span className="text-[hsl(var(--accent))]">
                    {isEn ? `"a written next step"` : `"un prossimo step scritto"`}
                  </span>
                  <span className="text-ink-mute">,</span>
                  {"\n"}
                  {"  "}
                  <span className="text-ink">verdict</span>:{" "}
                  <span className="text-[hsl(var(--accent))]">
                    {isEn
                      ? `"build | harden | stop"`
                      : `"costruire | consolidare | fermarsi"`}
                  </span>
                  <span className="text-ink-mute">,</span>
                  {"\n"}
                  <span className="text-ink-mute">{`};`}</span>
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
    </section>
  );
}
