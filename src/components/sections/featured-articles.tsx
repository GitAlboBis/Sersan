"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { resources } from "@/data/resources";

/**
 * FeaturedArticles — three latest pieces from the resource hub, rendered as
 * editorial cards. Title in Geist Sans display, mono eyebrow for category + read
 * time, ink-mute excerpt, brass "Read more →" link.
 */
export default function FeaturedArticles() {
  const { language } = useLanguage();
  const reduce = useReducedMotion();
  const isEn = language === "en";

  const articles = resources.slice(0, 3);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(isEn ? "en-GB" : "it-IT", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  return (
    <section
      className="section-lg relative overflow-hidden"
      aria-labelledby="featured-articles-heading"
    >
      <div className="container-px relative z-10 max-w-6xl mx-auto">
        <RevealOnScroll delay={0}>
          <div className="text-center mb-12 sm:mb-14 max-w-3xl mx-auto">
            <p className="eyebrow mb-5">
              {isEn ? "Writing" : "Scritti"}
            </p>
            <h2
              id="featured-articles-heading"
              className="heading-2 mb-5 text-balance"
            >
              {isEn ? (
                <>
                  Field{" "}
                  <span className="font-display font-medium text-accent">
                    notes.
                  </span>
                </>
              ) : (
                <>
                  Note dal{" "}
                  <span className="font-display font-medium text-accent">
                    campo.
                  </span>
                </>
              )}
            </h2>
            <p className="text-base sm:text-lg text-ink-mute leading-relaxed">
              {isEn
                ? "Short pieces on how we audit, scope, and ship production AI. No thought leadership theatre."
                : "Brevi scritti su come facciamo audit, scoping e produzione di sistemi AI. Senza teatrini da thought leadership."}
            </p>

            <div
              aria-hidden="true"
              className="flex items-center justify-center gap-3 mt-8"
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
          </div>
        </RevealOnScroll>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {articles.map((article, i) => {
            const categoryLabel = isEn
              ? article.category
              : article.category === "guide"
                ? "guida"
                : article.category === "case-study"
                  ? "case study"
                  : article.category === "whitepaper"
                    ? "whitepaper"
                    : "articolo";

            const cardInner = (
              <Link
                href={`/resources/${article.slug}`}
                className="group block h-full rounded-xl border border-rule/70 bg-surface/60 overflow-hidden hover:border-rule/70 hover:bg-surface transition-colors duration-300 p-6 sm:p-7 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span
                    className="text-[10px] uppercase tracking-[0.14em] font-mono px-2 py-0.5 rounded-full border border-rule/50 text-accent"
                  >
                    {categoryLabel}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-mute">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {article.readMinutes} min
                  </span>
                </div>

                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-mute mb-3">
                  {formatDate(article.publishedAt)}
                </p>

                <h3 className="font-display text-xl sm:text-[1.4rem] text-ink leading-[1.15] tracking-[-0.018em] mb-4 group-hover:text-accent transition-colors">
                  {article.title}
                </h3>

                <p className="text-sm text-ink-mute leading-[1.55] mb-6 flex-1">
                  {article.excerpt}
                </p>

                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-accent mt-auto">
                  {isEn ? "Read more" : "Leggi"}
                  <ArrowRight
                    className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            );

            if (reduce) {
              return <div key={article.slug}>{cardInner}</div>;
            }
            return (
              <motion.div
                key={article.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {cardInner}
              </motion.div>
            );
          })}
        </div>

        <RevealOnScroll delay={0.15} className="text-center mt-12">
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute hover:text-accent transition-colors"
          >
            {isEn ? "All writing" : "Tutti gli scritti"}
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </RevealOnScroll>
      </div>
    </section>
  );
}
