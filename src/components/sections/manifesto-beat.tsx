"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";

const OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * ManifestoBeat — full-bleed, theatrical moment for the manifesto closing
 * line. Clip-path reveal on the two display lines, brass underline scribes
 * beneath the final word, single sustained pause.
 */
export default function ManifestoBeat() {
  const reduce = useReducedMotion();
  const { language } = useLanguage();
  const isEn = language === "en";
  const finalWord = isEn ? "human." : "umano.";

  return (
    <section
      aria-label={isEn ? "Our thesis" : "La nostra tesi"}
      className="relative w-full py-20 sm:py-32 lg:py-44 overflow-hidden"
    >
      {/* Soft warm halo backlight */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[55vw] max-w-[1200px] max-h-[700px] rounded-full blur-3xl opacity-35"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--accent) / 0.22), transparent 70%)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[35vw] max-w-[800px] max-h-[480px] rounded-full blur-2xl opacity-30"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--accent) / 0.18), transparent 70%)",
          }}
        />
      </div>

      <div className="relative w-full text-center px-4 sm:px-8">
        {/* Brass hairline above with center node */}
        <motion.div
          aria-hidden="true"
          initial={reduce ? false : { opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: reduce ? 0 : 0.9, ease: OUT_EXPO }}
          className="relative mx-auto mb-12 sm:mb-20 h-px w-full max-w-[680px] origin-center"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(var(--rule)) 20%, hsl(var(--rule)) 80%, transparent 100%)",
          }}
        >
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ background: "hsl(var(--accent))" }}
          />
        </motion.div>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: OUT_EXPO }}
          className="eyebrow mb-10 sm:mb-16"
        >
          {isEn ? "The thesis" : "La tesi"}
        </motion.p>

        <h2
          className="font-display tracking-[-0.022em] leading-[1.12] text-[clamp(1.875rem,8vw,6.5rem)] [text-wrap:balance]"
          aria-label={
            isEn
              ? "The intelligence is artificial. The judgement stays human."
              : "L'intelligenza è artificiale. Il giudizio rimane umano."
          }
        >
          <span className="block overflow-hidden pb-1.5 sm:pb-2">
            <motion.span
              className="block text-ink"
              initial={
                reduce ? false : { clipPath: "inset(110% 0 0 0)", y: "0.15em" }
              }
              animate={{ clipPath: "inset(0% 0 0 0)", y: 0 }}
              transition={{
                duration: reduce ? 0 : 0.85,
                delay: reduce ? 0 : 0.35,
                ease: OUT_EXPO,
              }}
            >
              {isEn
                ? "The intelligence is artificial."
                : "L'intelligenza è artificiale."}
            </motion.span>
          </span>

          <span className="block overflow-hidden pb-2 sm:pb-3 mt-1 sm:mt-2">
            <motion.span
              className="block italic"
              style={{ color: "hsl(var(--accent))" }}
              initial={
                reduce ? false : { clipPath: "inset(110% 0 0 0)", y: "0.15em" }
              }
              animate={{ clipPath: "inset(0% 0 0 0)", y: 0 }}
              transition={{
                duration: reduce ? 0 : 0.85,
                delay: reduce ? 0 : 1.05,
                ease: OUT_EXPO,
              }}
            >
              {isEn ? "The judgement stays " : "Il giudizio rimane "}
              <span className="relative inline-block">
                {finalWord}
                <motion.span
                  aria-hidden="true"
                  className="absolute left-0 right-0 bottom-[-0.08em] h-[2px] sm:h-[3px] origin-left rounded-full"
                  style={{
                    background: "hsl(var(--accent))",
                    boxShadow: "0 0 14px hsl(var(--accent) / 0.55)",
                  }}
                  initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: reduce ? 0 : 1.2,
                    delay: reduce ? 0 : 1.75,
                    ease: OUT_EXPO,
                  }}
                />
                {!reduce && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute right-0 bottom-[-0.18em] w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                    style={{
                      background: "hsl(var(--accent))",
                      boxShadow: "0 0 12px hsl(var(--accent) / 0.75)",
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0.65, 1, 0.65],
                      scale: [0, 1.4, 1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2.4,
                      delay: 2.7,
                      times: [0, 0.2, 0.5, 0.75, 1],
                      ease: "easeOut",
                    }}
                  />
                )}
              </span>
            </motion.span>
          </span>
        </h2>

        {/* Brass hairline below */}
        <motion.div
          aria-hidden="true"
          initial={reduce ? false : { opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{
            duration: reduce ? 0 : 0.9,
            delay: reduce ? 0 : 2.4,
            ease: OUT_EXPO,
          }}
          className="relative mx-auto mt-14 sm:mt-24 h-px w-full max-w-[680px] origin-center"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(var(--rule)) 20%, hsl(var(--rule)) 80%, transparent 100%)",
          }}
        >
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ background: "hsl(var(--accent))" }}
          />
        </motion.div>
      </div>
    </section>
  );
}
