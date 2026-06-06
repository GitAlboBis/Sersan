import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

/**
 * HowWeThinkSection — three opinionated takes that give SerSan a voice,
 * not just a services list. Each is short enough to skim, sharp enough
 * that a serious buyer either agrees or moves on (both fine outcomes).
 */

type Take = {
  number: string;
  thesis: string;
  body: React.ReactNode;
};

const TAKES: Take[] = [
  {
    number: "01",
    thesis: "Most AI projects fail because they ship demos.",
    body: (
      <>
        A demo is a system without consequences. Production AI has consequences —
        cost, latency, failure modes, and someone whose Monday morning depends
        on it.
        <br />
        <br />
        Most consultancies sell demos and call them prototypes. We don&apos;t. We
        will not start a build until we&apos;ve agreed what success looks like at
        the 90-day mark, after the launch slide deck is forgotten.
      </>
    ),
  },
  {
    number: "02",
    thesis: "An audit isn't a deck. It's a refusal letter.",
    body: (
      <>
        Half the value of a technical AI audit is permission to say no. We tell
        you what to ship, what to delay, and what to never build.
        <br />
        <br />
        The deliverable is two pages. The work is the conversation that gets
        there — usually a week of architecture review, evaluation harness sketch,
        and risk register. If your audit doesn&apos;t fit on two pages, the
        auditor was charging for slide-deck volume, not judgement.
      </>
    ),
  },
  {
    number: "03",
    thesis: "Weekly scoping beats fixed-bid every time.",
    body: (
      <>
        Fixed-bid AI projects price for the wrong unknowns. The hard parts of
        production AI — eval design, prompt economics, data quality, latency —
        only get clearer once the team is in the system.
        <br />
        <br />
        Weekly scoping lets us re-cut the next step based on what we just
        learned. Most teams ship faster, not slower. You can stop any week. If
        a vendor refuses to work this way, ask why.
      </>
    ),
  },
];

export default function HowWeThinkSection() {
  return (
    <section
      id="how-we-think"
      className="relative section-lg scroll-mt-24"
    >
      <div className="container-px">
        <SectionHeading
          eyebrow="How we think"
          title={
            <>
              Three things we believe —
              <br className="hidden sm:block" />
              <span className="text-ink-mute"> stated clearly so you can disagree.</span>
            </>
          }
          description="If any of these read as wrong to you, we're probably not a fit. That's a useful thing to know early."
          className="mb-12 sm:mb-16"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {TAKES.map((t, i) => (
            <Reveal key={t.number} delay={i * 120}>
              <article className="flex flex-col gap-5 h-full">
                <div className="flex items-center justify-between border-b border-[hsl(var(--rule)/0.6)] pb-4">
                  <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-mute">
                    {t.number}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute/60">
                    Belief {t.number} / 03
                  </span>
                </div>
                <h3 className="font-display text-[1.5rem] sm:text-[1.7rem] leading-[1.18] tracking-[-0.012em] text-ink">
                  {t.thesis}
                </h3>
                <div className="text-[14.5px] text-ink-mute leading-[1.65]">
                  {t.body}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
