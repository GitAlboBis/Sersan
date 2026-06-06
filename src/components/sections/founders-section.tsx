"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { founders } from "@/data/founders";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";

/**
 * FoundersSection — founder-led credibility block for the homepage.
 *
 * Pulls everything from src/data/founders.ts. No invented credentials.
 * Each card surfaces:
 *
 *   - real headshot (webp, 1:1 cropped)
 *   - name + role
 *   - short bio (shortBioEn — the card-tier bio explicitly written for
 *     this surface; long-form bio stays on /about)
 *   - credentials as chips
 *   - "previously at" line (Michele only — Alessandro has badges instead)
 *   - LinkedIn deep link
 *
 * Positioned between CaseStudies and Process on the homepage so the
 * commercial proof (named work) directly hands off to the people who
 * delivered it.
 */

export default function FoundersSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <section
      id="founders"
      className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="top-left" intensity={1.2} size="60rem" />
      <SectionGlow position="bottom-right" intensity={0.9} size="45rem" />
      <div className="container-px relative">
        <SectionHeading
          eyebrow={
            isEn
              ? "Founder-led AI engineering studio"
              : "Studio di AI engineering guidato dai fondatori"
          }
          title={
            isEn ? (
              <>
                Built by engineers who{" "}
                <span className="font-display italic text-ink">
                  ship production systems.
                </span>
              </>
            ) : (
              <>
                Costruito da ingegneri che{" "}
                <span className="font-display italic text-ink">
                  portano sistemi in produzione.
                </span>
              </>
            )
          }
          description={
            isEn
              ? "Every engagement is owned by the people who scope, architect, and ship it. No account layer, no junior bench, no second team you didn't sign for."
              : "Ogni ingaggio è seguito dalle persone che ne definiscono lo scope, lo progettano e lo portano in produzione. Nessun livello di account, nessuna panchina di junior, nessun secondo team che non hai ingaggiato."
          }
          className="mb-12 sm:mb-16 max-w-3xl"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {founders.map((f, i) => (
            <Reveal key={f.anchor} delay={i * 120}>
              <article
                id={`founder-${f.anchor}`}
                className="card-steel group flex flex-col h-full overflow-hidden"
              >
                {/* Top-edge accent line — fades in on hover */}
                <span
                  aria-hidden="true"
                  className="
                    pointer-events-none absolute top-0 left-0 right-0 h-px z-10
                    bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.7)] to-transparent
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-500
                  "
                />
                {/* Photo */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[hsl(var(--bg))]">
                  <Image
                    src={f.image}
                    alt={`${f.name}, ${isEn ? f.roleEn : f.roleIt}`}
                    fill
                    sizes="(min-width: 1024px) 36vw, 100vw"
                    className="object-cover object-center grayscale-[0.15] group-hover:grayscale-0 transition-all duration-500"
                    priority={i === 0}
                  />
                  {/* Bottom gradient so the role label sits on a dark base */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(to top, hsl(var(--bg) / 0.85) 0%, transparent 100%)",
                    }}
                  />
                  <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl sm:text-2xl leading-tight text-ink">
                        {f.name}
                      </h3>
                      <p className="mt-0.5 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">
                        {isEn ? f.roleEn : f.roleIt}
                      </p>
                    </div>
                    <Link
                      href={f.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${f.name} on LinkedIn`}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[hsl(var(--ink)/0.25)] bg-[hsl(var(--bg)/0.6)] text-ink-mute hover:text-ink hover:border-[hsl(var(--accent)/0.6)] transition-colors backdrop-blur"
                    >
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-4 p-6 sm:p-7">
                  <p className="text-[14px] sm:text-[15px] text-ink-mute leading-relaxed">
                    {isEn ? f.shortBioEn : f.shortBioIt}
                  </p>

                  {/* Credentials */}
                  <ul className="flex flex-col gap-1.5 list-none">
                    {(isEn ? f.credentialsEn : f.credentialsIt).map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-2 text-[13px] text-ink leading-relaxed"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-[7px] block w-1 h-1 rounded-full bg-[hsl(var(--accent)/0.8)] shrink-0"
                        />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Previously at (if present) */}
                  {f.previouslyAt && f.previouslyAt.length > 0 ? (
                    <div className="pt-3 border-t border-[hsl(var(--rule)/0.7)]">
                      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute/70 mb-2">
                        {isEn ? "Previously" : "In precedenza"}
                      </p>
                      <ul className="flex flex-wrap gap-1.5 list-none">
                        {f.previouslyAt.map((co) => (
                          <li
                            key={co}
                            className="inline-flex items-center px-2.5 py-1 rounded-full border border-[hsl(var(--rule))] bg-[hsl(var(--bg))] font-mono text-[10px] tracking-[0.1em] uppercase text-ink-mute"
                          >
                            {co}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Closer + CTA */}
        <div className="mt-12 sm:mt-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <p className="max-w-2xl text-[14px] text-ink-mute leading-relaxed">
            {isEn ? (
              <>
                Read by one of us, not a queue. Briefs sent through{" "}
                <Link
                  href="/start"
                  className="text-ink underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.4)] hover:decoration-[hsl(var(--accent))] transition-colors"
                >
                  /start
                </Link>{" "}
                get a reply within one business day.
              </>
            ) : (
              <>
                Letto da uno di noi, non da una coda. I brief inviati tramite{" "}
                <Link
                  href="/start"
                  className="text-ink underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.4)] hover:decoration-[hsl(var(--accent))] transition-colors"
                >
                  /start
                </Link>{" "}
                ricevono risposta entro un giorno lavorativo.
              </>
            )}
          </p>
          <Link
            href="/about"
            className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors shrink-0"
          >
            {isEn ? "Full founder bios" : "Bio complete dei fondatori"}
            <ArrowUpRight
              className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
