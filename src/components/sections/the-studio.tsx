"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";

const OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * TheStudio — full-bleed editorial photo moment. Ken-Burns slow zoom into a
 * cobalt-lit studio image, brass scribe + mono caption anchor it.
 *
 * Image expected at /public/photos/studio-cobalt-dual.jpg — once it's added
 * the section is live; until then the gradient fallback covers the gap.
 */
export default function TheStudio() {
  const reduce = useReducedMotion();
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <section
      aria-label={isEn ? "The studio" : "Lo studio"}
      className="relative w-full overflow-hidden"
    >
      {/* Brass hairline above */}
      <div
        aria-hidden="true"
        className="relative mx-auto h-px w-full max-w-[1200px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--rule)) 18%, hsl(var(--rule)) 82%, transparent 100%)",
        }}
      >
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: "hsl(var(--accent))" }}
        />
      </div>

      <div className="relative w-full h-[78vh] min-h-[520px] max-h-[820px]">
        {/* Fallback dark cobalt gradient sits beneath the image so the
            section reads even before /photos/studio-cobalt-dual.jpg lands. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 30%, hsl(210 60% 18%) 0%, hsl(var(--bg)) 70%)",
          }}
        />
        <motion.img
          src="/photos/studio-cobalt-dual.jpg"
          alt={
            isEn
              ? "Sersan studio, late-night build session"
              : "Studio Sersan, sessione di build notturna"
          }
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-top"
          initial={reduce ? false : { scale: 1.08, opacity: 0 }}
          whileInView={reduce ? undefined : { scale: 1.0, opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: reduce ? 0 : 2.4, ease: OUT_EXPO }}
        />

        {/* Aubergine wash */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--bg) / 0.55) 0%, hsl(var(--bg) / 0.25) 35%, hsl(var(--bg) / 0.55) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 35%, hsl(var(--bg) / 0.6) 100%)",
          }}
        />

        <div className="absolute inset-0 flex items-end">
          <div className="container-px pb-12 sm:pb-20 lg:pb-24 relative">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.2, ease: OUT_EXPO }}
              className="eyebrow mb-5 inline-flex items-center gap-2"
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn ? "The studio · Sardinia" : "Lo studio · Sardegna"}
            </motion.p>

            <motion.h2
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.75, delay: 0.35, ease: OUT_EXPO }}
              className="heading-2 text-ink text-balance max-w-3xl"
            >
              {isEn ? (
                <>
                  When something breaks in production, the person responding is
                  the one who{" "}
                  <span
                    className="italic"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    designed it.
                  </span>
                </>
              ) : (
                <>
                  Quando qualcosa si rompe in produzione, a rispondere è chi
                  l&apos;ha{" "}
                  <span
                    className="italic"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    progettato.
                  </span>
                </>
              )}
            </motion.h2>

            <motion.div
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={reduce ? undefined : { scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, delay: 0.85, ease: OUT_EXPO }}
              className="mt-7 h-px w-48 origin-left"
              style={{
                background:
                  "linear-gradient(90deg, hsl(var(--accent)) 0%, hsl(var(--rule)) 60%, transparent 100%)",
              }}
            />

            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              whileInView={reduce ? undefined : { opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 1.1, ease: OUT_EXPO }}
              className="mt-5 text-sm sm:text-base text-ink-mute max-w-xl leading-[1.55]"
            >
              {isEn
                ? "We don't write a deck and ship the codebase to a different timezone. Architecture, build, on-call. The same pair, all the way through."
                : "Non scriviamo un deck per poi passare la codebase a un altro fuso orario. Architettura, build, reperibilità: la stessa coppia, dall'inizio alla fine."}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
