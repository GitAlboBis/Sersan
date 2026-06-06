"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles, RotateCcw } from "lucide-react";
import Link from "next/link";
import {
  QUESTIONS,
  TOTAL_QUESTIONS,
  matchFindings,
  type Finding,
} from "@/data/audit-questions";
import { useLanguage } from "@/components/language-provider";

const OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const cardEnter = {
  hidden: { opacity: 0, x: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 220,
      damping: 24,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    x: -24,
    scale: 0.97,
    transition: { duration: 0.35, ease: OUT_EXPO },
  },
};

const chipsContainer = {
  hidden: {},
  visible: { transition: { delayChildren: 0.2, staggerChildren: 0.07 } },
};

const chipVariant = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: OUT_EXPO } },
};

const resultsContainer = {
  hidden: {},
  visible: { transition: { delayChildren: 0.4, staggerChildren: 0.18 } },
};

const resultItem = {
  hidden: { opacity: 0, x: -18, scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 220, damping: 22 },
  },
};

/**
 * InteractiveAudit — five-question diagnostic that maps answers to first
 * moves Sersan would recommend. Deterministic match, no email required.
 */
export default function InteractiveAudit() {
  const reduce = useReducedMotion() ?? false;
  const { language } = useLanguage();
  const isEn = language === "en";

  const [step, setStep] = useState(0); // 0..TOTAL_QUESTIONS (last = results)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const advancingRef = useRef(false);

  const findings = useMemo(() => matchFindings(answers), [answers]);
  const isResults = step >= TOTAL_QUESTIONS;
  const current = !isResults ? QUESTIONS[step] : null;

  const handleAnswer = (questionId: string, choiceId: string) => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setPendingChoice(choiceId);
    window.setTimeout(() => {
      setAnswers((a) => ({ ...a, [questionId]: choiceId }));
      setStep((s) => s + 1);
      setPendingChoice(null);
      advancingRef.current = false;
    }, 480);
  };

  const restart = () => {
    setAnswers({});
    setStep(0);
    setPendingChoice(null);
  };

  return (
    <section
      aria-label={isEn ? "60-second self-audit" : "Auto-audit di 60 secondi"}
      className="relative w-full py-20 sm:py-28 overflow-hidden"
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--accent) / 0.45), transparent 70%)",
          }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <p
            className="eyebrow mb-4"
            style={{ color: "hsl(var(--accent))" }}
          >
            {isEn ? "60-second self-audit" : "Auto-audit di 60 secondi"}
          </p>
          <h2 className="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance">
            {isEn ? (
              <>
                Five questions.{" "}
                <span className="italic text-accent">
                  Your first three moves.
                </span>
              </>
            ) : (
              <>
                Cinque domande.{" "}
                <span className="italic text-accent">
                  Le vostre prime tre mosse.
                </span>
              </>
            )}
          </h2>
        </div>

        {/* Progress strip */}
        <div className="flex gap-1.5 mb-6 sm:mb-8" aria-hidden="true">
          {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => {
            const filled = i < step || (i === step - 1 && pendingChoice);
            return (
              <span
                key={i}
                className="flex-1 h-1 rounded-full overflow-hidden"
                style={{ background: "hsl(var(--rule) / 0.7)" }}
              >
                <motion.span
                  className="block h-full origin-left"
                  style={{ background: "hsl(var(--accent))" }}
                  initial={false}
                  animate={{ scaleX: filled ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: OUT_EXPO }}
                />
              </span>
            );
          })}
        </div>

        {/* Card stage */}
        <div className="relative min-h-[26rem]" style={{ perspective: 1200 }}>
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={`q-${current.id}`}
                variants={reduce ? undefined : cardEnter}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative rounded-2xl border border-rule/80 bg-surface p-7 sm:p-9 overflow-hidden"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, hsl(var(--accent) / 0.7) 20%, hsl(var(--accent) / 0.7) 80%, transparent)",
                  }}
                />

                <p className="text-[10px] font-mono uppercase tracking-[0.14em] mb-3 inline-flex items-baseline gap-2">
                  <span style={{ color: "hsl(var(--accent))" }}>
                    {String(step + 1).padStart(2, "0")}
                  </span>
                  <span className="text-ink-mute/70">
                    / {String(TOTAL_QUESTIONS).padStart(2, "0")}
                  </span>
                  <span className="text-ink-mute">
                    {isEn ? "Question" : "Domanda"}
                  </span>
                </p>

                <h3 className="font-display text-2xl sm:text-[1.7rem] text-ink leading-snug tracking-tight mb-6 sm:mb-8 [text-wrap:balance]">
                  {isEn ? current.promptEn : current.promptIt}
                </h3>

                <motion.div
                  variants={reduce ? undefined : chipsContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-2.5"
                >
                  {current.choices.map((c) => {
                    const isPending = pendingChoice === c.id;
                    return (
                      <motion.button
                        key={c.id}
                        type="button"
                        variants={reduce ? undefined : chipVariant}
                        onClick={() => handleAnswer(current.id, c.id)}
                        whileHover={reduce ? undefined : { scale: 1.015, x: 2 }}
                        whileTap={reduce ? undefined : { scale: 0.98 }}
                        disabled={!!pendingChoice}
                        className="group relative text-left rounded-md border border-rule/80 bg-bg/40 hover:bg-surface-elev/60 hover:border-[hsl(var(--rule)/0.7)] transition-colors duration-200 px-5 py-4 flex items-center justify-between gap-3"
                        style={
                          isPending
                            ? {
                                borderColor: "hsl(var(--accent))",
                                background: "hsl(var(--accent) / 0.08)",
                              }
                            : undefined
                        }
                      >
                        <span className="text-[15px] sm:text-base text-ink transition-colors">
                          {isEn ? c.labelEn : c.labelIt}
                        </span>
                        <motion.span
                          aria-hidden="true"
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                          style={{
                            background: isPending
                              ? "hsl(var(--accent))"
                              : "transparent",
                            border: isPending
                              ? "1px solid hsl(var(--accent))"
                              : "1px solid hsl(var(--rule))",
                          }}
                          animate={
                            isPending ? { scale: [1, 1.2, 1] } : { scale: 1 }
                          }
                          transition={{ duration: 0.4, ease: OUT_EXPO }}
                        >
                          <ArrowRight
                            className="w-3 h-3 transition-transform"
                            style={{
                              color: isPending
                                ? "hsl(var(--primary-foreground))"
                                : "hsl(var(--ink-mute))",
                            }}
                          />
                        </motion.span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            ) : (
              // RESULTS
              <motion.div
                key="results"
                initial={reduce ? false : { opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 24,
                  mass: 0.85,
                }}
                className="relative rounded-2xl border border-[hsl(var(--rule)/0.6)] bg-surface-elev p-7 sm:p-10 overflow-hidden"
              >
                <motion.span
                  aria-hidden="true"
                  className="absolute top-0 left-0 right-0 h-[2px] origin-left"
                  style={{ background: "hsl(var(--accent))" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.9, ease: OUT_EXPO }}
                />

                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.5, ease: OUT_EXPO }}
                  className="flex items-start justify-between gap-4 mb-2"
                >
                  <div>
                    <p
                      className="text-[10px] font-mono uppercase tracking-[0.18em] mb-2 inline-flex items-center gap-1.5"
                      style={{ color: "hsl(var(--accent))" }}
                    >
                      <Sparkles className="w-3 h-3" />
                      {isEn ? "Your audit focus" : "Il vostro focus di audit"}
                    </p>
                    <h3 className="font-display text-2xl sm:text-[1.85rem] text-ink leading-tight tracking-tight">
                      {isEn ? (
                        findings.length === 0 ? (
                          <>
                            Looking solid.{" "}
                            <span className="italic text-accent">
                              Let&apos;s still talk.
                            </span>
                          </>
                        ) : (
                          <>
                            {findings.length === 1
                              ? "One"
                              : findings.length === 2
                                ? "Two"
                                : "Three"}{" "}
                            first {findings.length === 1 ? "move" : "moves"}.
                          </>
                        )
                      ) : findings.length === 0 ? (
                        <>
                          Sembra solido.{" "}
                          <span className="italic text-accent">
                            Parliamone comunque.
                          </span>
                        </>
                      ) : (
                        <>
                          {findings.length === 1
                            ? "Una"
                            : findings.length === 2
                              ? "Due"
                              : "Tre"}{" "}
                          prim
                          {findings.length === 1 ? "a mossa" : "e mosse"}.
                        </>
                      )}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-mute hover:text-ink transition-colors mt-2"
                    aria-label={isEn ? "Run again" : "Riavvia"}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {isEn ? "Run again" : "Riavvia"}
                  </button>
                </motion.div>

                <motion.ol
                  variants={reduce ? undefined : resultsContainer}
                  initial="hidden"
                  animate="visible"
                  className="mt-8 space-y-5"
                >
                  {findings.length > 0 ? (
                    findings.map((f: Finding, i) => (
                      <motion.li
                        key={f.id}
                        variants={reduce ? undefined : resultItem}
                        className="relative pl-8 sm:pl-10"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 font-mono text-[11px] tracking-[0.14em] text-accent pt-1.5"
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <motion.span
                          aria-hidden="true"
                          className="absolute left-[1.6rem] sm:left-[2rem] top-2.5 w-1.5 h-1.5 rounded-full"
                          style={{ background: "hsl(var(--accent))" }}
                          animate={{
                            opacity: [0.5, 1, 0.5],
                            scale: [1, 1.3, 1],
                          }}
                          transition={{
                            duration: 2.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5 + i * 0.18,
                          }}
                        />
                        <div>
                          <div className="flex items-baseline gap-3 flex-wrap mb-1">
                            <h4 className="font-display text-lg sm:text-xl text-ink leading-snug">
                              {isEn ? f.nameEn : f.nameIt}
                            </h4>
                            <span
                              className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border"
                              style={{
                                color: "hsl(var(--accent))",
                                borderColor: "hsl(var(--accent) / 0.4)",
                                background: "hsl(var(--accent) / 0.06)",
                              }}
                            >
                              {isEn ? f.effortEn : f.effortIt}
                            </span>
                          </div>
                          <p className="text-sm text-ink-mute leading-relaxed">
                            {isEn ? f.descEn : f.descIt}
                          </p>
                        </div>
                      </motion.li>
                    ))
                  ) : (
                    <motion.li
                      variants={reduce ? undefined : resultItem}
                      className="text-sm text-ink-mute leading-relaxed"
                    >
                      {isEn
                        ? "Your inputs suggest a mature setup. Kill switch, evals, cost visibility, and ownership all look healthy. If you're hitting a specific wall, that's where we should focus a scoping call."
                        : "I vostri input suggeriscono un setup maturo. Kill switch, eval, visibilità costi e ownership sembrano in salute. Se state colpendo un muro specifico, è lì che dovremmo focalizzare una scoping call."}
                    </motion.li>
                  )}
                </motion.ol>

                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.6 + findings.length * 0.18,
                    duration: 0.5,
                    ease: OUT_EXPO,
                  }}
                  className="mt-8 pt-6 border-t border-[hsl(var(--rule)/0.45)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <p className="text-sm text-ink-mute">
                    {isEn
                      ? "Want the full audit? It's a week. Fixed scope, fixed price."
                      : "Volete l'audit completo? È una settimana. Scope fisso, prezzo fisso."}
                  </p>
                  <Link
                    href="/contact"
                    className="group inline-flex items-center gap-2 px-5 py-3 rounded-md font-semibold tracking-[-0.005em] bg-[hsl(var(--accent))] text-[hsl(var(--bg))] shadow-[0_1px_0_0_hsl(0_0%_100%/0.18)_inset,0_10px_30px_-12px_hsl(var(--accent)/0.55)] hover:bg-[hsl(var(--accent)/0.92)] hover:shadow-[0_1px_0_0_hsl(0_0%_100%/0.22)_inset,0_16px_40px_-12px_hsl(var(--accent)/0.7)] transition-all duration-200"
                  >
                    {isEn ? "Book a scoping call" : "Prenota una scoping call"}
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isResults && (
          <p className="mt-5 text-center text-[10px] font-mono uppercase tracking-[0.14em] text-ink-mute/70">
            {isEn
              ? "No email required · No follow-up unless you ask"
              : "Nessuna email richiesta · Nessun follow-up se non lo chiedete"}
          </p>
        )}
      </div>
    </section>
  );
}
