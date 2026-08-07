"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/components/language-provider";

/**
 * CredibilityStrip — the horizontal parallax passage between the spine's
 * final beat and the Problem section (owner request 3/3; technique ported
 * from the lead-read reference: domus-tua HorizonScroller.tsx, era-residence
 * §11 grammar). Replaces the velocity-reactive marquee presentation; the
 * copy is byte-identical (audience trust band, "Where our team trained",
 * the five tier-1 institution names — now set huge in the display serif).
 *
 * MECHANICS (the reference's exact values, adapted to this repo's rules):
 *   - CSS `position: sticky` screen + flex track. NO ScrollTrigger pin —
 *     a pin-spacer would re-parent the section and break every
 *     [data-line-anchor] measurement (same rule as the spine and the work
 *     rail). The section's HEIGHT IS the track's scrollWidth (1:1 gesture
 *     speed), asserted in px and re-measured on every ScrollTrigger
 *     refreshInit; SectionBus's body ResizeObserver picks the height assert
 *     up and re-derives the anchor fractions (documented cadence).
 *   - Track tween: x → −(scrollWidth − clientWidth), scrub 0.25, start
 *     "2.5% top" / end "97.5% bottom" (the reference's 2.5% dead zones),
 *     invalidateOnRefresh, ease "credHorScroll" (CustomEase 0.25,0,0.75,1 —
 *     no existing site token matches: the navbar's menu eases are
 *     0.16,1,0.3,1 / 0.7,0,0.84,0, so it is registered locally per the
 *     navbar's local-registration convention). NOTE: containerAnimation
 *     trigger positions are computed against this eased tween exactly as in
 *     the reference — accepted there, kept identical here.
 *   - The track tween is the containerAnimation for the inner reveals:
 *       data-cred-reveal="enter"  vertical reveal (panel in view at engage)
 *       data-cred-reveal="track"  reveal keyed to horizontal travel
 *                                 (left 85%, autoAlpha+y, replay on every
 *                                 pass via persistent tween restart/reverse)
 *       data-cred-stair           the huge institution lines — counter-
 *                                 parallax xPercent wrap [−5,25,−15]→
 *                                 [5,−25,25] scrubbed across the whole
 *                                 runway (the "wow" carrier)
 *       data-cred-slide           curtain panel: clip-path
 *                                 inset(0% 100% 0% 0%)→0 at left 90%
 *       data-cred-slide-img       the slide's inner fill (scale 1.15→1)
 *   - Per-char split reveals were deliberately NOT ported: the repo's
 *     SplitText grammar is HeadingChoreographer's [data-split-reveal]
 *     (vertical once:true triggers) which does not compose with
 *     containerAnimation — so only the panel-1 opening line (in view before
 *     the track moves) subscribes to it, per the site-wide contract
 *     (key={language} + data-split-reveal). No second SplitText rig.
 *   - Focus safety net (ported): focusin inside a not-yet-revealed block
 *     completes its reveal instantly.
 *
 * DESKTOP ≥1024 + fine pointer + motionOk ONLY. Below that / no-JS /
 * reduced-motion: a static vertical column, everything visible, zero hidden
 * state — the [data-on] attribute that flips the layout horizontal is set
 * exclusively via JS inside gsap.matchMedia (the reference's pattern), and
 * every hidden reveal state is applied only on that same path.
 *
 * The final panel is a near-empty decompression runway so the sticky
 * release into ProblemSection's dark backdrop reads as one continuous
 * motion (no hard cut at the end of the track).
 */

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);
  // The reference's "dtHorScroll" curve. CustomEase.create is idempotent
  // (same id → overwrite), safe under HMR / double mount.
  CustomEase.create("credHorScroll", "0.25, 0, 0.75, 1");
}

// Like the reference's HORIZON_MQ: below 1024 the horizontal set piece
// would touch the content. Fine pointer + motionOk are hard gates too.
const HORIZON_MQ = "(min-width: 1024px)";
const FINE_MQ = "(pointer: fine)";
const MOTION_OK_MQ = "(prefers-reduced-motion: no-preference)";

/** The five tier-1 names, byte-identical to the wordmarks' rendered text,
 *  regrouped 2–3 per panel (task spec). Styling (serif, size, italics) is
 *  CSS-only. */
const NAMES_A = ["Revolut", "J.P.Morgan", "Deloitte"] as const;
const NAMES_B = ["Brevan Howard", "Accenture"] as const;

export default function CredibilityStrip() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const rootRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add(
        { desktop: HORIZON_MQ, fine: FINE_MQ, motionOk: MOTION_OK_MQ },
        (ctx) => {
          const c = ctx.conditions as {
            desktop: boolean;
            fine: boolean;
            motionOk: boolean;
          };
          if (!c.desktop || !c.fine || !c.motionOk) return;

          const screen = root.querySelector<HTMLElement>(".cred-screen");
          const track = root.querySelector<HTMLElement>(".cred-track");
          if (!screen || !track) return;

          // Horizontal layout ONLY from here on (CSS on [data-on] below).
          root.setAttribute("data-on", "");

          // Section height = track width: the vertical distance to travel
          // coincides with the horizontal one (1:1 gesture). Re-measured on
          // every refresh — the known dynamic-heights + ScrollTrigger trap.
          const size = () => {
            root.style.height = `${track.scrollWidth}px`;
          };
          size();
          ScrollTrigger.addEventListener("refreshInit", size);

          const tween = gsap.to(track, {
            x: () => -(track.scrollWidth - screen.clientWidth),
            ease: "credHorScroll",
            scrollTrigger: {
              trigger: root,
              start: "2.5% top",
              end: "97.5% bottom",
              scrub: 0.25,
              invalidateOnRefresh: true,
            },
          });

          // ── Reveals ─────────────────────────────────────────────────────
          // Hidden state ONLY via JS on this armed path. Focus safety net:
          // keyboard entering a not-yet-revealed block completes it at once.
          const undoFocus: Array<() => void> = [];
          const revealOf = (el: HTMLElement) => {
            gsap.set(el, { autoAlpha: 0, y: 28 });
            // Replay on every pass: the tween lives in closure — restart on
            // each entry, reverse when travelling back past the start.
            let tw: gsap.core.Tween | null = null;
            const play = () => {
              if (!tw) {
                tw = gsap.to(el, {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.85,
                  ease: "expo.out",
                  paused: true,
                });
              }
              tw.restart();
            };
            const back = () => tw?.reverse();
            const onFocus = () => {
              play();
              tw?.progress(1);
            };
            el.addEventListener("focusin", onFocus);
            undoFocus.push(() => el.removeEventListener("focusin", onFocus));
            return { play, back };
          };

          gsap.utils
            .toArray<HTMLElement>('[data-cred-reveal="enter"]', track)
            .forEach((el, i) => {
              const r = revealOf(el);
              ScrollTrigger.create({
                trigger: root,
                start: "top 70%",
                onEnter: () => gsap.delayedCall(i * 0.12, r.play),
                onLeaveBack: () => r.back(),
              });
            });

          gsap.utils
            .toArray<HTMLElement>('[data-cred-reveal="track"]', track)
            .forEach((el) => {
              const r = revealOf(el);
              ScrollTrigger.create({
                trigger: el,
                containerAnimation: tween,
                start: "left 85%",
                onEnter: () => r.play(),
                onLeaveBack: () => r.back(),
              });
            });

          // ── Stair lines: the huge names slide in alternating directions,
          // counter to the track, scrubbed across the whole runway. ────────
          const stairs = gsap.utils.toArray<HTMLElement>(
            "[data-cred-stair]",
            track,
          );
          if (stairs.length) {
            gsap.fromTo(
              stairs,
              { xPercent: gsap.utils.wrap([-5, 25, -15]) },
              {
                xPercent: gsap.utils.wrap([5, -25, 25]),
                ease: "none",
                scrollTrigger: {
                  trigger: root,
                  start: "top top",
                  end: "bottom bottom",
                  scrub: 0.25,
                },
              },
            );
          }

          // ── Curtain panel: clip-path wipe + inner scale settle. ─────────
          gsap.utils
            .toArray<HTMLElement>("[data-cred-slide]", track)
            .forEach((el) => {
              const img = el.querySelector<HTMLElement>(
                "[data-cred-slide-img]",
              );
              gsap.set(el, { clipPath: "inset(0% 100% 0% 0%)" });
              if (img) gsap.set(img, { scale: 1.15 });
              // Replay on every pass: persistent timeline in closure.
              let stl: gsap.core.Timeline | null = null;
              ScrollTrigger.create({
                trigger: el,
                containerAnimation: tween,
                start: "left 90%",
                onEnter: () => {
                  if (!stl) {
                    stl = gsap.timeline({ paused: true });
                    stl.to(
                      el,
                      {
                        clipPath: "inset(0% 0% 0% 0%)",
                        duration: 1.6,
                        ease: "expo.out",
                      },
                      0,
                    );
                    if (img) {
                      stl.to(img, { scale: 1, duration: 1.6, ease: "expo.out" }, 0);
                    }
                  }
                  stl.restart();
                },
                onLeaveBack: () => stl?.reverse(),
              });
            });

          // One-shot late refresh once webfonts land: the huge display-serif
          // names materially change track.scrollWidth, and the provider
          // deliberately never refreshes ScrollTrigger on "/" (the spine
          // owns its refresh bursts) — same self-coverage as the work rail.
          let fontsCancelled = false;
          document.fonts?.ready
            .then(() => {
              if (!fontsCancelled) ScrollTrigger.refresh();
            })
            .catch(() => {});

          return () => {
            fontsCancelled = true;
            ScrollTrigger.removeEventListener("refreshInit", size);
            undoFocus.forEach((off) => off());
            root.removeAttribute("data-on");
            root.style.height = "";
          };
        },
      );
    },
    // Language toggle swaps EN/IT text in place → widths change → the whole
    // context is reverted and recreated against the fresh copy (the
    // reference's refreshKey pattern).
    { scope: rootRef, dependencies: [language], revertOnUpdate: true },
  );

  return (
    <section
      ref={rootRef}
      id="credibility"
      aria-label={
        isEn
          ? "Trust band: audience and tier-1 institutions"
          : "Fascia di fiducia: pubblico e istituzioni di primo livello"
      }
      className="relative cred-horizon"
    >
      <div className="cred-screen">
        <div className="cred-track">
          {/* Panel 1 — opening: the strip's existing audience trust band,
              re-staged as the big-type display line. Site-wide split-reveal
              grammar (HeadingChoreographer): data-split-reveal +
              key={language} per the documented contract. */}
          <div className="cred-panel cred-p-open flex flex-col gap-6">
            <p
              key={language}
              data-split-reveal
              className="cred-open font-display text-ink tracking-tight"
            >
              <span className="text-ink/80">
                {isEn ? "Built for" : "Pensato per"}
              </span>{" "}
              <span className="text-ink">SaaS</span>
              <span aria-hidden="true" className="text-ink-mute/40">
                {" · "}
              </span>
              <span className="text-ink">fintech</span>
              <span aria-hidden="true" className="text-ink-mute/40">
                {" · "}
              </span>
              <span className="text-ink">
                {isEn ? "regulated teams" : "team regolamentati"}
              </span>
              <span aria-hidden="true" className="text-ink-mute/40">
                {" · "}
              </span>
              <span className="text-ink italic">
                {isEn ? "technical founders" : "founder tecnici"}
              </span>
            </p>
            {/* Decorative rule (echoes the strip's old wordmark separators). */}
            <div
              data-cred-reveal="enter"
              aria-hidden="true"
              className="h-px w-24 bg-[hsl(var(--rule))]"
            />
          </div>

          {/* Panel 2 — curtain bridge (decorative, horizontal mode only):
              the accent-gradient slab wipes open as it enters. */}
          <div className="cred-panel cred-p-bridge cred-decor" aria-hidden="true">
            <div data-cred-slide className="cred-slab">
              <div data-cred-slide-img className="cred-slab-fill" />
            </div>
          </div>

          {/* Panel 3 — provenance label + first name group, huge in the
              display serif with counter-parallax stair lines. */}
          <div className="cred-panel cred-p-names flex flex-col gap-7 lg:gap-9">
            <p
              data-cred-reveal="track"
              className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-ink-mute"
            >
              {isEn ? "Where our team trained" : "Dove si è formato il nostro team"}
            </p>
            <ul className="flex flex-col gap-2 lg:gap-3">
              {NAMES_A.map((name, i) => (
                <li
                  key={name}
                  data-cred-stair
                  className={`cred-name font-display text-ink${i === 1 ? " italic" : ""}`}
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>

          {/* Panel 4 — second name group. */}
          <div className="cred-panel cred-p-names flex flex-col justify-center">
            <ul className="flex flex-col gap-2 lg:gap-3">
              {NAMES_B.map((name, i) => (
                <li
                  key={name}
                  data-cred-stair
                  className={`cred-name font-display text-ink${i === 1 ? " italic" : ""}`}
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>

          {/* Panel 5 — handover: near-empty decompression so the sticky
              release into ProblemSection's dark backdrop reads as one
              motion. A single trailing rule, then air. */}
          <div className="cred-panel cred-p-out cred-decor" aria-hidden="true">
            <div
              data-cred-reveal="track"
              className="h-px w-full bg-gradient-to-r from-[hsl(var(--rule))] to-transparent"
            />
          </div>
        </div>
      </div>

      <style>{`
        /* Static vertical column — SSR, <1024px, coarse pointer, reduced
           motion, no-JS. Everything visible, nothing clipped or hidden. */
        .cred-horizon .cred-track {
          display: flex;
          flex-direction: column;
          gap: 2.75rem;
          padding-block: 3.5rem;
          padding-inline: var(--margin);
        }
        .cred-horizon .cred-decor { display: none; }
        .cred-open {
          font-size: clamp(1.75rem, 4.6vw, 3rem);
          line-height: 1.1;
          text-wrap: balance;
        }
        .cred-name {
          font-size: clamp(2.4rem, 8.5vw, 4.75rem);
          line-height: 1.04;
          letter-spacing: -0.02em;
        }

        /* Horizontal set piece — [data-on] is set exclusively via JS inside
           gsap.matchMedia (desktop ≥1024 + fine pointer + motionOk). */
        .cred-horizon[data-on] .cred-screen {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
          display: flex;
          align-items: center;
        }
        .cred-horizon[data-on] .cred-track {
          flex-direction: row;
          align-items: center;
          width: max-content;
          height: 100%;
          gap: 5vw;
          padding-block: 0;
          padding-inline: var(--margin);
          will-change: transform;
        }
        .cred-horizon[data-on] .cred-panel { flex-shrink: 0; }
        .cred-horizon[data-on] .cred-decor { display: block; }
        .cred-horizon[data-on] .cred-p-open { width: 60vw; }
        .cred-horizon[data-on] .cred-p-bridge { width: 13vw; }
        .cred-horizon[data-on] .cred-p-names { width: max-content; }
        .cred-horizon[data-on] .cred-p-out { width: 46vw; }
        .cred-horizon[data-on] .cred-open {
          font-size: clamp(2.75rem, 4.4vw, 4.25rem);
          line-height: 1.06;
        }
        .cred-horizon[data-on] .cred-name {
          font-size: clamp(5rem, 9.5vw, 8.5rem);
          line-height: 0.98;
          white-space: nowrap;
        }
        .cred-slab {
          height: 56vh;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .cred-slab-fill {
          height: 100%;
          width: 100%;
          border-left: 1px solid hsl(var(--rule));
          background: linear-gradient(
            165deg,
            hsl(var(--accent) / 0.2),
            hsl(var(--accent-2) / 0.12) 55%,
            transparent 92%
          );
        }
      `}</style>
    </section>
  );
}
