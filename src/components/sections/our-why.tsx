"use client";

import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { useLanguage } from "@/components/language-provider";

/**
 * OurWhy — the manifesto beat for the About page. The thesis stated in long
 * form, three operating principles, and a closing line. Editorial brass +
 * midnight, no neon, no gradient text.
 */
export default function OurWhy() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const principles = [
    {
      title: isEn ? "Opposite backgrounds." : "Background opposti.",
      desc: isEn
        ? "One deeply technical. One deeply commercial. Both senior. Both in the room from week one."
        : "Uno fortemente tecnico. Uno fortemente commerciale. Entrambi senior. Entrambi presenti dalla prima settimana.",
    },
    {
      title: isEn ? "AI that extends." : "AI che estende.",
      desc: isEn
        ? "We build systems that make people sharper, faster, and more capable. Not systems that remove them."
        : "Costruiamo sistemi che rendono le persone più precise, più rapide, più capaci. Non sistemi che le sostituiscono.",
    },
    {
      title: isEn ? "Production-grade." : "Pronto alla produzione.",
      desc: isEn
        ? "If we built it, we operate it. Demos are easy. Surviving 3am, regulated workloads, and a real bill is not."
        : "Quello che costruiamo, lo gestiamo. Le demo sono facili. Sopravvivere alle 3 di notte, ai carichi regolamentati e a un costo reale no.",
    },
    {
      title: isEn ? "Honest scope." : "Scope onesto.",
      desc: isEn
        ? "We tell you when AI isn't the answer. The fastest path to ROI is often a smaller, plainer system."
        : "Vi diciamo quando l'AI non è la risposta. La via più rapida al ROI è spesso un sistema più piccolo e più semplice.",
    },
  ];

  return (
    <section
      className="section-lg relative overflow-hidden"
      aria-labelledby="our-why-heading"
    >
      <div className="container-px relative z-10">
        {/* Eyebrow + H2 sit OUTSIDE the RevealOnScroll fade: the eyebrow's
            entrance is the LabelScrambler decode, the H2's is the
            HeadingChoreographer line-mask (data-split-reveal) — wrapping
            either in the block fade would double-animate them. */}
        <div className="max-w-4xl mx-auto text-center">
          <p className="eyebrow mb-6">
            {isEn ? "Our Why" : "Il nostro perché"}
          </p>
          {/* key={language}: SplitText owns this subtree once split; a
              language swap must remount it or React reconciles against
              orphaned nodes (same contract as SectionHeading's h2). */}
          <h2
            key={language}
            data-split-reveal
            id="our-why-heading"
            className="heading-2 mb-10 sm:mb-12 text-balance"
          >
              {isEn ? (
                <>
                  AI works best when it{" "}
                  <span className="font-display font-medium text-accent">
                    extends judgement
                  </span>
                  , not when it replaces it.
                </>
              ) : (
                <>
                  L&apos;AI funziona meglio quando{" "}
                  <span className="font-display font-medium text-accent">
                    estende il giudizio
                  </span>
                  , non quando lo sostituisce.
                </>
              )}
          </h2>

          <RevealOnScroll delay={0}>
            <div className="space-y-6 sm:space-y-7 font-display text-[clamp(1.35rem,2.6vw,2.15rem)] leading-[1.2] tracking-[-0.015em] text-ink/92 max-w-3xl mx-auto">
              {isEn ? (
                <>
                  <p className="text-balance">
                    Sersan was built by two people with{" "}
                    <span className="text-ink">opposite backgrounds</span>. One
                    deeply technical, one deeply commercial. Working together
                    produced something neither could build alone.
                  </p>
                  <p className="text-balance text-ink/72">
                    That isn&apos;t a coincidence. It&apos;s the thesis.
                  </p>
                  <p className="text-balance text-ink/72">
                    The most valuable AI systems are the ones that make people
                    sharper, faster, and more capable. Not the ones that take
                    them out of the loop.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-balance">
                    Sersan è nata dall&apos;incontro di due persone con{" "}
                    <span className="text-ink">background opposti</span>. Uno
                    profondamente tecnico, uno profondamente commerciale.
                    Lavorando insieme abbiamo prodotto qualcosa che nessuno dei
                    due avrebbe potuto creare da solo.
                  </p>
                  <p className="text-balance text-ink/72">
                    Non è una coincidenza. È la tesi.
                  </p>
                  <p className="text-balance text-ink/72">
                    I sistemi AI più preziosi sono quelli che rendono le
                    persone più precise, più rapide, più capaci. Non quelli
                    che le tolgono dall&apos;equazione.
                  </p>
                </>
              )}
            </div>
          </RevealOnScroll>
        </div>

        {/* Operating principles */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 md:grid-cols-2 gap-px bg-rule/60 border-y border-rule/60 max-w-5xl mx-auto">
          {principles.map((p, i) => (
            <div
              key={i}
              className="group bg-bg px-5 sm:px-7 py-7 sm:py-8 flex flex-col gap-2 hover:bg-surface transition-colors duration-300 relative h-full"
            >
              <div className="flex items-baseline gap-3 mb-1">
                <span className="font-mono text-[11px] tracking-[0.14em] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-rule" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-semibold text-ink">
                {p.title}
              </h3>
              <p className="text-sm text-ink-mute leading-relaxed">{p.desc}</p>
              <span
                aria-hidden="true"
                className="absolute left-5 right-5 sm:left-7 sm:right-7 bottom-0 h-px origin-left scale-x-0 group-hover:scale-x-100 bg-accent transition-transform duration-500"
              />
            </div>
          ))}
        </div>

        {/* Section divider */}
        <div className="section-divider mt-20 sm:mt-24" aria-hidden="true" />

        {/* Closing line */}
        <RevealOnScroll delay={0.05} className="mt-16 sm:mt-20 text-center">
          <p className="font-display font-semibold leading-[1.15] tracking-[-0.02em] text-[clamp(1.75rem,4.2vw,3.25rem)] text-ink text-balance max-w-4xl mx-auto">
            {isEn ? (
              <>
                The intelligence is artificial.
                <br />
                <span className="italic text-accent">
                  The judgement stays human.
                </span>
              </>
            ) : (
              <>
                L&apos;intelligenza è artificiale.
                <br />
                <span className="italic text-accent">
                  Il giudizio rimane umano.
                </span>
              </>
            )}
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
