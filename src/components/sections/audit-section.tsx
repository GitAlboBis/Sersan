"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { useLanguage } from "@/components/language-provider";

const OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Refusal = {
  id: string;
  titleEn: string;
  titleIt: string;
  reasonEn: string;
  reasonIt: string;
  strikeRotate: number;
  strikeDuration: number;
};

const REFUSALS: Refusal[] = [
  {
    id: "r1",
    titleEn: "Vibe-coded production",
    titleIt: "Produzione “vibe-coded”",
    reasonEn:
      "If your CTO can't explain why it works, it won't survive an outage.",
    reasonIt:
      "Se il vostro CTO non sa spiegare perché funziona, non sopravvive al primo outage.",
    strikeRotate: -1.2,
    strikeDuration: 0.55,
  },
  {
    id: "r2",
    titleEn: "Junior-staffed audits",
    titleIt: "Audit affidati a junior",
    reasonEn:
      "Senior judgement can't be discovered. It has to be on the engagement from day one.",
    reasonIt:
      "Il giudizio senior non si scopre strada facendo. Deve essere sull'ingaggio dal primo giorno.",
    strikeRotate: 0.8,
    strikeDuration: 0.6,
  },
  {
    id: "r3",
    titleEn: "Multi-year retainers",
    titleIt: "Retainer pluriennali",
    reasonEn:
      "Lock-in is a smell. We scope monthly because we want to earn the next month.",
    reasonIt:
      "Il lock-in è un campanello d'allarme. Definiamo lo scope mese per mese. Vogliamo guadagnarci il prossimo, non darlo per scontato.",
    strikeRotate: -0.6,
    strikeDuration: 0.7,
  },
  {
    id: "r4",
    titleEn: "AI without a kill switch",
    titleIt: "AI senza kill switch",
    reasonEn:
      "If you can't turn it off in 30 seconds, it isn't ready for production.",
    reasonIt: "Se non si spegne in 30 secondi, non è pronta per la produzione.",
    strikeRotate: 1.4,
    strikeDuration: 0.5,
  },
  {
    id: "r5",
    titleEn: "Demos without eval sets",
    titleIt: "Demo senza eval set",
    reasonEn:
      "An agent without 100 graded test cases isn't an agent. It's a coin toss.",
    reasonIt:
      "Un agente senza 100 test case valutati non è un agente. È testa o croce.",
    strikeRotate: -1.0,
    strikeDuration: 0.65,
  },
  {
    id: "r6",
    titleEn: "Offshore handoff",
    titleIt: "Handoff offshore",
    reasonEn:
      "We don't write a deck and ship the codebase to a different timezone. We operate what we build.",
    reasonIt:
      "Non scriviamo un deck per poi spedire la codebase in un altro fuso orario. Operiamo ciò che costruiamo.",
    strikeRotate: 0.5,
    strikeDuration: 0.6,
  },
];

function RefusalTile({
  refusal,
  index,
  reduce,
}: {
  refusal: Refusal;
  index: number;
  reduce: boolean;
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [3, -3]), {
    stiffness: 200,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-3, 3]), {
    stiffness: 200,
    damping: 22,
  });
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.55,
        delay: reduce ? 0 : index * 0.07,
        ease: OUT_EXPO,
      }}
      style={
        reduce
          ? undefined
          : { rotateX, rotateY, transformStyle: "preserve-3d" }
      }
      className="group relative rounded-xl border border-rule/70 bg-surface/50 backdrop-blur-[1px] p-5 sm:p-6 lg:p-7 flex flex-col gap-3 overflow-hidden hover:bg-surface/80 hover:border-rule transition-colors duration-300"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <span
        aria-hidden="true"
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-3xl"
        style={{ background: "hsl(var(--refusal) / 0.25)" }}
      />

      <div className="relative inline-block">
        <h4 className="font-display text-[1.35rem] sm:text-[1.5rem] text-ink leading-tight tracking-tight pr-2">
          {isEn ? refusal.titleEn : refusal.titleIt}
        </h4>
        <motion.span
          aria-hidden="true"
          className="absolute left-0 right-2 top-1/2 origin-left h-[2px] sm:h-[2.5px] z-10 pointer-events-none"
          style={{
            background: "hsl(var(--refusal))",
            transform: `translateY(-50%) rotate(${refusal.strikeRotate}deg)`,
            boxShadow: "0 0 12px hsl(var(--refusal) / 0.55)",
          }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{
            duration: reduce ? 0 : refusal.strikeDuration,
            delay: reduce ? 0 : 0.5 + index * 0.07,
            ease: [0.65, 0, 0.35, 1],
          }}
        />
      </div>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 6 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{
          duration: 0.45,
          delay: reduce ? 0 : 0.8 + index * 0.07,
          ease: OUT_EXPO,
        }}
        className="text-sm text-ink-mute leading-[1.6] group-hover:text-ink/85 transition-colors duration-300"
      >
        {isEn ? refusal.reasonEn : refusal.reasonIt}
      </motion.p>

      <span
        aria-hidden="true"
        className="absolute left-6 right-6 sm:left-7 sm:right-7 bottom-0 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
        style={{ background: "hsl(var(--refusal))" }}
      />
    </motion.div>
  );
}

function SersanRefusals() {
  const reduce = useReducedMotion() ?? false;
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {REFUSALS.map((r, i) => (
          <RefusalTile key={r.id} refusal={r} index={i} reduce={reduce} />
        ))}
      </div>
      <p className="mt-10 text-center text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
        {isEn
          ? "What we refuse is half of what we are."
          : "Ciò che rifiutiamo è metà di ciò che siamo."}
      </p>
    </div>
  );
}

/**
 * AuditSection — pitches the technical audit, then surfaces the six things
 * Sersan refuses to do. The refusals tile-grid is co-located here because
 * it's only ever used inside this section.
 */
export default function AuditSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <section
      id="book-audit"
      className="section-lg relative overflow-hidden"
    >
      {/* Brass aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55rem] max-w-[110vw] h-[28rem] opacity-25 blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--accent) / 0.35), transparent 75%)",
        }}
      />

      <div className="container-px relative z-10">
        <RevealOnScroll>
          <div className="max-w-3xl mx-auto text-center">
            <p
              className="eyebrow mb-6"
              style={{ color: "hsl(var(--accent))" }}
            >
              {isEn ? "The Technical Audit" : "Il Technical Audit"}
            </p>
            <h2 className="heading-2 mb-6 text-balance">
              {isEn ? (
                <>
                  A scored map of what to
                  <br />
                  <span className="italic text-accent">
                    build, fix, and ship next.
                  </span>
                </>
              ) : (
                <>
                  Una mappa con scoring di cosa
                  <br />
                  <span className="italic text-accent">
                    costruire, sistemare e rilasciare.
                  </span>
                </>
              )}
            </h2>

            <div
              aria-hidden="true"
              className="flex items-center justify-center gap-3 my-8"
            >
              <span
                className="h-px w-16 sm:w-24"
                style={{ background: "hsl(var(--rule) / 0.7)" }}
              />
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
              />
              <span
                className="h-px w-16 sm:w-24"
                style={{ background: "hsl(var(--rule) / 0.7)" }}
              />
            </div>

            <p className="text-base sm:text-lg text-ink-mute max-w-2xl mx-auto leading-relaxed mb-4">
              {isEn
                ? "We spend a week inside your business: your product, your systems, your data, the work your people are doing manually. Then we hand you a written report on what's broken, what's manual, where AI could power your product, and what we'd build first if you hired us."
                : "Trascorriamo una settimana dentro la vostra azienda: il prodotto, i sistemi, i dati, il lavoro che le persone fanno a mano. Al termine consegniamo un report scritto su cosa non funziona, cosa è ancora manuale, dove l'AI può alimentare il vostro prodotto, e cosa svilupperemmo per primo se ci ingaggiaste."}
            </p>
            <p className="text-base sm:text-lg text-ink-mute max-w-2xl mx-auto leading-relaxed italic">
              {isEn
                ? "You leave with a roadmap. Whether you build it with us or someone else is up to you."
                : "Riceverete una roadmap concreta. La decisione di realizzarla con noi o con altri partner resta interamente vostra."}
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.1}>
          <div className="max-w-5xl mx-auto mt-20 sm:mt-28">
            <div className="text-center mb-10 sm:mb-14">
              <p
                className="eyebrow mb-4"
                style={{ color: "hsl(var(--refusal))" }}
              >
                {isEn ? "What we refuse" : "Cosa rifiutiamo"}
              </p>
              <h3 className="font-display text-2xl sm:text-3xl text-ink mb-4 text-balance leading-tight">
                {isEn ? (
                  <>
                    Six things we{" "}
                    <span className="italic text-accent">refuse</span> to
                    do.
                  </>
                ) : (
                  <>
                    Sei cose che{" "}
                    <span className="italic text-accent">rifiutiamo</span>{" "}
                    di fare.
                  </>
                )}
              </h3>
              <p className="text-sm sm:text-base text-ink-mute max-w-xl mx-auto leading-relaxed">
                {isEn
                  ? "These are the practices AI engagements actually break on. We've watched them fail at scale. We won't sell them, even when asked."
                  : "Sono le pratiche su cui gli ingaggi AI si rompono davvero. Le abbiamo viste fallire su scala. Non le vendiamo, neanche su richiesta."}
              </p>
            </div>
            <SersanRefusals />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
