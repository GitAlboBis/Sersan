"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { founders } from "@/data/founders";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";

/**
 * FounderPhoto — pointer-tracked tilt on a WRAPPER element, kept entirely
 * separate from the parent `.card-steel` (which the global CardTiltController
 * owns). Compounding two tilt transforms on one node is forbidden, so the
 * tilt lives here on an inner wrapper that the controller never touches, and
 * a small translateZ parallax on the inner <img> gives it depth.
 *
 * Fine-pointer only; inert on touch / reduced-motion (matchMedia guards reuse
 * the CardTiltController pattern). The `next/image` element is NOT the tilt
 * node — the alt text + intrinsic sizing stay intact.
 */
const PHOTO_TILT = 4; // degrees

function FounderPhoto({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }

    gsap.set(wrap, { transformPerspective: 700, transformStyle: "preserve-3d" });
    const rx = gsap.quickTo(wrap, "rotationX", { duration: 0.5, ease: "power3.out" });
    const ry = gsap.quickTo(wrap, "rotationY", { duration: 0.5, ease: "power3.out" });
    const iz = gsap.quickTo(img, "z", { duration: 0.5, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width; // 0..1
      const py = (e.clientY - r.top) / r.height;
      rx(-(py - 0.5) * 2 * PHOTO_TILT);
      ry((px - 0.5) * 2 * PHOTO_TILT);
      iz(24);
    };
    const onLeave = () => {
      rx(0);
      ry(0);
      iz(0);
    };

    wrap.addEventListener("pointermove", onMove, { passive: true });
    wrap.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      gsap.set(wrap, { rotationX: 0, rotationY: 0 });
      gsap.set(img, { z: 0 });
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[4/3] w-full overflow-hidden bg-[hsl(var(--bg))] will-change-transform"
    >
      <div ref={imgRef} className="absolute inset-0">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 36vw, 100vw"
          className="object-cover object-center grayscale saturate-[0.4] group-hover:grayscale-0 group-hover:saturate-100 transition-[filter] duration-700 ease-out"
          priority={priority}
        />
      </div>
      {/* Bottom gradient so the role label sits on a dark base */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, hsl(var(--bg) / 0.85) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

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
                {/* Photo — tilt lives inside FounderPhoto on its own wrapper,
                    kept separate from the .card-steel root tilt. The name /
                    role / LinkedIn overlay sits OUTSIDE the tilted wrapper so
                    its text never warps. */}
                <div className="relative">
                  <FounderPhoto
                    src={f.image}
                    alt={`${f.name}, ${isEn ? f.roleEn : f.roleIt}`}
                    priority={i === 0}
                  />
                  <div className="pointer-events-none absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
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
                      className="pointer-events-auto inline-flex items-center justify-center w-9 h-9 rounded-full border border-[hsl(var(--ink)/0.25)] bg-[hsl(var(--bg)/0.6)] text-ink-mute hover:text-ink hover:border-[hsl(var(--accent)/0.6)] transition-colors backdrop-blur"
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

                  {/* Credentials — each chip fades in with a ±5° rotate3d as
                      the card reveals (CSS-only, staggered, reduced-motion
                      neutralized in the scoped style block). Copy untouched. */}
                  <ul className="flex flex-col gap-1.5 list-none">
                    {(isEn ? f.credentialsEn : f.credentialsIt).map((c, ci) => (
                      <li
                        key={c}
                        className="founder-chip flex items-start gap-2 text-[13px] text-ink leading-relaxed"
                        style={{
                          animationDelay: `${i * 120 + 200 + ci * 70}ms`,
                          ["--chip-rot" as string]: ci % 2 === 0 ? "5deg" : "-5deg",
                        }}
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
            {/* Plain text on purpose: the /start link that lived here was
                removed in the restyle-step-2 CTA dedupe (home keeps exactly
                three /start moments). */}
            {isEn ? (
              <>
                Read by one of us, not a queue. Briefs sent through{" "}
                <span className="text-ink">/start</span> get a reply within
                one business day.
              </>
            ) : (
              <>
                Letto da uno di noi, non da una coda. I brief inviati tramite{" "}
                <span className="text-ink">/start</span> ricevono risposta
                entro un giorno lavorativo.
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

      <style>{`
        .founder-chip {
          opacity: 0;
          transform: perspective(600px) rotate3d(1, 0.4, 0, var(--chip-rot, 5deg)) translateY(6px);
          animation: founder-chip-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes founder-chip-in {
          to {
            opacity: 1;
            transform: perspective(600px) rotate3d(1, 0.4, 0, 0deg) translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .founder-chip {
            opacity: 1;
            transform: none;
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
