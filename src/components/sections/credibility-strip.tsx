"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/count-up";
import {
  GlowTwin,
  INSTITUTION_MARKS,
  type InstitutionKey,
} from "@/components/logos/institution-marks";
import {
  caseStudies,
  type CaseStudy,
  type CaseStudyMetric,
} from "@/data/case-studies";

/**
 * CredibilityStrip — "DELIVERY REEL": the horizontal passage between the
 * spine's final beat and the Problem section, redesigned as a cinematic
 * lateral tracking shot through five full-height FRAMES — one per tier-1
 * institution (Revolut, J.P. Morgan, Deloitte, Brevan Howard, Accenture).
 *
 * Each frame stages three depth systems (zero cards, zero boxes):
 *   z-0   BACKPLATE — the brand's own mark as a giant sub-luminous
 *         silhouette (opacity ≤ BACK_ALPHA), bleeding right into the next
 *         gutter, cropped by the screen (deliberate cinema crop), drifting
 *         slower than the track ("behind glass": xPercent −9→9).
 *   z-10  CONTENT — mono context line (existing case-study strings), the
 *         crafted duotone LOCKUP (institution-marks.tsx — never plain
 *         text) with a pre-blurred glow twin + viewfinder corner ticks +
 *         a scrubbed glint sweep, a drawn cyan→blue hairline, ONE measured
 *         delivery metric from src/data/case-studies.ts as the foreground
 *         actor (counter-stair xPercent ±14), and its verbatim label.
 *   z-20  RAIL — a screen-level (non-translating) progress filament along
 *         the bottom: 1px base rail + a cyan→blue charge line scrubbed
 *         scaleX 0→1 at TRUE gesture progress (linear, deliberately
 *         un-eased against the eased track) + a glowing head dot.
 *
 * MECHANICS (the engine is UNCHANGED from the previous version):
 *   - CSS `position: sticky` screen + flex track. NO ScrollTrigger pin —
 *     a pin-spacer would re-parent the section and break every
 *     [data-line-anchor] measurement. Section HEIGHT = track.scrollWidth
 *     (1:1 gesture), re-asserted on every ScrollTrigger refreshInit.
 *   - Track tween: x → −(scrollWidth − clientWidth), scrub 0.25, ease
 *     "credHorScroll" (CustomEase 0.25,0,0.75,1, registered locally per
 *     the navbar convention), start "2.5% top" — but end "100% bottom":
 *     the old "97.5% bottom" trailing dead zone AND the near-empty P5
 *     decompression runway are DELETED (they were the rejected slide-up
 *     beat: the sticky release used to happen over a frozen, blank navy
 *     band). The credHorScroll ease-out tail means the final few % of
 *     progress carry near-zero x-motion, so the un-stick now lands on a
 *     settled, fully-composed Accenture frame.
 *   - EXIT (no curtain, nothing slides): F5 closes with a 30vw luminance
 *     ramp (transparent → accent-2/RAMP_ALPHA) tuned to ProblemSection's
 *     .section-accent-tint wash — the surface scrolling in is chromatically
 *     identical to the surface scrolling out (both transparent over the
 *     same WebGL starfield), plus a terminus stamp ("5 / Tier-1
 *     institutions", the About-page literals). At the exact release
 *     ("bottom bottom") the filament's head dot streaks off frame-right
 *     (x +=140, power2.in) while a 1px vertical accent-2 segment at F5's
 *     right edge has scrubbed scaleY 0→1 — the machined line visibly turns
 *     90° downward toward the divario's own left→right eyebrow rule, which
 *     is already mid-composition (ProblemSection's IO root margins are
 *     positive-expanded). Continuity of axis, zero vertical grammar.
 *   - The track tween is the containerAnimation for the inner triggers:
 *       data-cred-reveal="enter"   vertical reveal (P0, in view at engage)
 *       data-cred-reveal="track"   reveal keyed to horizontal travel
 *                                  ("left 85%", replay via persistent
 *                                  tween restart/reverse)
 *       per-frame IGNITION         "left 70%": backplate fade/settle,
 *                                  lockup + glow rise, viewfinder ticks
 *                                  pop (0.04s stagger), hairline draws,
 *                                  metric rises; Deloitte's dot scales in
 *                                  back.out(2), Brevan Howard's underline
 *                                  draws — restart/reverse on every pass.
 *   - Depth scrubs (root "top top" → "bottom bottom", ease none, scrub
 *     0.25 — this sibling's motion verb, same as the old stairs):
 *     backplates −9→9, metric values wrap(±14) alternating, context+lockup
 *     blocks wrap(±4).
 *   - ACTIVE STATION: exactly one frame (nearest screen centre) breathes
 *     its glow (0.35 ↔ 0.5, sine, ~2.2s). Centres cached on ScrollTrigger
 *     "refresh" (no getBoundingClientRect in any frame loop); the nearest-
 *     centre pick runs in the track trigger's onUpdate from pure numbers
 *     (progress → eased x → centre), like practice-ledger's scrubbed pick.
 *   - HOVER (armed only): lockup rect cached once on pointerenter, then
 *     mousemove drives quickTo x/y clamped ±HOVER_MAG px and the glow's
 *     inner opacity → 1 (0.5 effective); pointerleave re-targets 0/0.
 *   - Per-char SplitText is still NOT used here: the site's split grammar
 *     is HeadingChoreographer's [data-split-reveal] + key={language},
 *     which only P0's audience band (in view before the track moves)
 *     subscribes to, per the documented contract.
 *
 * i18n: this file's established inline isEn-ternary pattern. All copy is
 * REUSED site strings: the audience band + eyebrow (this section's own),
 * case-study engagement/client/metric strings (src/data/case-studies.ts,
 * verbatim incl. labelIt), the practice-ledger FinTech sentence, and the
 * About proof-strip literals ("8 yrs/anni", "Senior delivery", "5",
 * "Tier-1 institutions"). Nothing invented.
 *
 * DESKTOP ≥1024 + fine pointer + motionOk ONLY. Below that / no-JS /
 * reduced-motion: a static vertical column — eyebrow, audience band, then
 * five stacked entries (lockup component + metric + label + context)
 * separated by hairlines. Everything visible, zero hidden state; the
 * [data-on] attribute that flips the layout horizontal is set exclusively
 * via JS inside gsap.matchMedia, and every hidden pose is applied only on
 * that armed path. Backplates/rail/ramp/glow/ticks are .cred-decor
 * (display:none until armed).
 */

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);
  // CustomEase.create is idempotent (same id → overwrite), safe under HMR.
  CustomEase.create("credHorScroll", "0.25, 0, 0.75, 1");
}

const HORIZON_MQ = "(min-width: 1024px)";
const FINE_MQ = "(pointer: fine)";
const MOTION_OK_MQ = "(prefers-reduced-motion: no-preference)";

// ── Owner tuning knobs (single consts, one-line tuning at review) ─────────
const BACK_ALPHA = 0.07; // backplate silhouette opacity at ignition
const RAMP_ALPHA = 0.07; // F5 luminance-ramp peak (matches .section-accent-tint)
const GLOW_PEAK = 0.5; // glow wrapper alpha at ignition (× inner base = rest)
const GLOW_INNER_BASE = 0.7; // glow inner base → rest glow = 0.5 × 0.7 = 0.35
const GLINT_ALPHA = 0.22; // glint band peak alpha
const HOVER_MAG = 6; // magnetic hover travel (px, clamped)

// ── Reel data: metrics resolved from the case-study source of truth. ──────
// Strict-safe throwing helpers (no non-null assertions): a missing id or
// metric is a data regression we want loudly at build/dev time.
function caseStudyById(id: string): CaseStudy {
  const found = caseStudies.find((c) => c.id === id);
  if (!found) throw new Error(`CredibilityStrip: case study "${id}" missing`);
  return found;
}
function metricAt(cs: CaseStudy, i: number): CaseStudyMetric {
  const m = cs.metrics[i];
  if (!m) throw new Error(`CredibilityStrip: metric ${i} missing on "${cs.id}"`);
  return m;
}

const CS_REVOLUT = caseStudyById("revolut");
const CS_JPM = caseStudyById("jp-morgan");
const CS_APPLE = caseStudyById("apple-uk"); // client = "Apple UK (via Deloitte)"
const CS_SARDEGNA = caseStudyById("regione-sardegna"); // "… (via Accenture)"

type FrameDef = {
  index: string;
  brand: InstitutionKey;
  /** Context line (mono label, or a sentence for Brevan Howard). */
  context: string;
  sentence?: boolean;
  value: ReactNode;
  valueLong?: boolean;
  label: string;
  /** About-style mono label treatment (F4). */
  labelMono?: boolean;
};

function ReelFrame({
  frame,
  isEn,
  isLast,
}: {
  frame: FrameDef;
  isEn: boolean;
  isLast: boolean;
}) {
  const Mark = INSTITUTION_MARKS[frame.brand];
  return (
    <div className={`cred-panel cred-frame cred-f-${frame.brand}`}>
      {/* z-0 backplate silhouette — bleeds right, cropped by the screen. */}
      <div className="cred-back cred-decor" aria-hidden="true" data-reel-back>
        <Mark variant="back" />
      </div>

      {/* z-10 content column */}
      <div className="cred-col">
        {/* near-plane block: context + lockup ride the subtle counter-drift */}
        <div className="cred-fore" data-reel-fore>
          {frame.sentence ? (
            <p
              data-cred-reveal="track"
              className="cred-context cred-context-sentence text-[13px] leading-relaxed text-ink-mute max-w-[52ch]"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                {frame.index}
                {" · "}
              </span>
              {frame.context}
            </p>
          ) : (
            <p
              data-cred-reveal="track"
              className="cred-context font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute max-w-[46ch]"
            >
              {frame.index}
              {" · "}
              {frame.context}
            </p>
          )}

          <div className="cred-lockup" data-reel-lockup>
            <Mark variant="fore" />
            <GlowTwin brand={frame.brand} className="cred-glow cred-decor" />
            {/* viewfinder corner ticks — brackets, not borders */}
            <span className="cred-tick cred-tick-tl cred-decor" aria-hidden="true" data-corner-tick />
            <span className="cred-tick cred-tick-tr cred-decor" aria-hidden="true" data-corner-tick />
            <span className="cred-tick cred-tick-br cred-decor" aria-hidden="true" data-corner-tick />
            <span className="cred-tick cred-tick-bl cred-decor" aria-hidden="true" data-corner-tick />
            {/* centre-crossing glint sweep (clipped to the lockup box) */}
            <span className="cred-glint cred-decor" aria-hidden="true">
              <span className="cred-glint-band" data-reel-glint />
            </span>
          </div>
        </div>

        {/* drawn hairline (ignition actor) */}
        <div className="cred-hairline cred-decor" aria-hidden="true" data-reel-rule />

        {/* the metric — foreground actor, counter-stair carrier */}
        <div
          className={cn(
            "cred-value font-display text-ink",
            frame.valueLong && "cred-value-long",
          )}
          data-reel-value
        >
          {frame.value}
        </div>

        <p
          className={cn(
            "cred-label",
            frame.labelMono
              ? "font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute"
              : "text-[15px] leading-relaxed text-ink-mute max-w-[30ch]",
          )}
        >
          {frame.label}
        </p>
      </div>

      {/* rail tick — index marker just above the screen-level filament */}
      <div
        className="cred-frametick cred-decor"
        aria-hidden="true"
        data-cred-reveal="track"
      >
        <span className="cred-frametick-bar" />
        <span className="font-mono text-[10px] tracking-[0.14em] text-ink-mute">
          {frame.index}
        </span>
      </div>

      {isLast ? (
        <>
          {/* Luminance ramp — chromatic bridge into ProblemSection's
              .section-accent-tint wash (same surface, no light seam). */}
          <div className="cred-ramp cred-decor" aria-hidden="true">
            {/* terminus stamp — the About proof-strip literals */}
            <div className="cred-terminus" data-cred-reveal="track">
              <div className="font-display text-4xl xl:text-5xl text-ink leading-none mb-2">
                <CountUp value="5" duration={0.8} force />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
                {isEn ? "Tier-1 institutions" : "Istituzioni tier-1"}
              </p>
            </div>
          </div>
          {/* Corner-turn: the machined line turns 90° downward at the exit,
              handing the axis to the divario's eyebrow rule. */}
          <div
            className="cred-corner cred-decor"
            aria-hidden="true"
            data-corner-turn
          />
        </>
      ) : null}
    </div>
  );
}

export default function CredibilityStrip() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const rootRef = useRef<HTMLElement | null>(null);

  const m1 = metricAt(CS_REVOLUT, 0); // −47% false-positive rate
  const m2 = metricAt(CS_JPM, 1); // ~$140M/day collateral released
  const m3 = metricAt(CS_APPLE, 0); // 19% → 8.4% MAPE
  const m5 = metricAt(CS_SARDEGNA, 0); // 2.1M+ records reconciled

  const frames: FrameDef[] = [
    {
      index: "01",
      brand: "revolut",
      context: isEn ? CS_REVOLUT.engagement : CS_REVOLUT.engagementIt,
      value: m1.value,
      label: isEn ? m1.label : m1.labelIt,
    },
    {
      index: "02",
      brand: "jpmorgan",
      context: isEn ? CS_JPM.engagement : CS_JPM.engagementIt,
      value: m2.value,
      label: isEn ? m2.label : m2.labelIt,
    },
    {
      index: "03",
      brand: "deloitte",
      // The attribution IS the honesty — client string verbatim.
      context: CS_APPLE.client,
      value: m3.value,
      label: isEn ? m3.label : m3.labelIt,
    },
    {
      index: "04",
      brand: "brevanhoward",
      // practice-ledger "FinTech engineering" sentence, verbatim (EN + IT).
      context: isEn
        ? "Low-latency, regulated, real money. Eight years of senior delivery at JPM, Revolut, Brevan Howard."
        : "Bassa latenza, regolamentato, denaro reale. Otto anni di delivery senior in JPM, Revolut, Brevan Howard.",
      sentence: true,
      // About proof-strip literal: 8 + italic accent unit.
      value: (
        <>
          8
          <span className="italic" style={{ color: "hsl(var(--accent))" }}>
            {" "}
            {isEn ? "yrs" : "anni"}
          </span>
        </>
      ),
      label: isEn ? "Senior delivery" : "Delivery senior",
      labelMono: true,
    },
    {
      index: "05",
      brand: "accenture",
      context: CS_SARDEGNA.client,
      value: m5.value,
      valueLong: true,
      label: isEn ? m5.label : m5.labelIt,
    },
  ];

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

          // Section height = track width (1:1 gesture), re-measured on every
          // refresh — the known dynamic-heights + ScrollTrigger trap.
          const size = () => {
            root.style.height = `${track.scrollWidth}px`;
          };
          size();
          ScrollTrigger.addEventListener("refreshInit", size);

          const teardown: Array<() => void> = [];

          // ── Station cache: frame centres in track space, refreshed only on
          // ScrollTrigger "refresh" — never a rect read in a frame loop. ────
          const frameEls = gsap.utils.toArray<HTMLElement>(
            ".cred-frame",
            track,
          );
          const glowInners = frameEls.map((f) =>
            f.querySelector<HTMLElement>("[data-glow-inner]"),
          );
          let centers: number[] = [];
          let maxX = 0;
          let viewCenter = 0;
          const cache = () => {
            maxX = Math.max(0, track.scrollWidth - screen.clientWidth);
            viewCenter = screen.clientWidth / 2;
            const trackRect = track.getBoundingClientRect();
            centers = frameEls.map((f) => {
              const r = f.getBoundingClientRect();
              // Both rects share the track's live transform → the delta is
              // transform-invariant.
              return r.left - trackRect.left + r.width / 2;
            });
          };
          ScrollTrigger.addEventListener("refresh", cache);

          const easeFn = gsap.parseEase("credHorScroll");

          // ── Exactly-one-active-station glow breathing ───────────────────
          let active = -1;
          let hovered = -1;
          let breath: gsap.core.Tween | null = null;
          const stopBreath = () => {
            breath?.kill();
            breath = null;
          };
          const startBreath = (i: number) => {
            const inner = glowInners[i];
            if (!inner || hovered === i) return;
            breath = gsap.to(inner, {
              opacity: 1,
              duration: 1.1,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
            });
          };
          const updateStation = (progress: number) => {
            if (!centers.length || maxX <= 0) return;
            // The track tween is eased, so map gesture progress through the
            // same ease to get the real x — pure arithmetic, no DOM reads.
            const center = easeFn(progress) * maxX + viewCenter;
            let best = 0;
            let bestD = Infinity;
            for (let i = 0; i < centers.length; i++) {
              const d = Math.abs(centers[i] - center);
              if (d < bestD) {
                bestD = d;
                best = i;
              }
            }
            if (best === active) return;
            const prev = glowInners[active];
            stopBreath();
            if (prev) {
              gsap.to(prev, {
                opacity: GLOW_INNER_BASE,
                duration: 0.5,
                ease: "sine.out",
              });
            }
            active = best;
            startBreath(best);
          };

          // ── Track tween — end "100% bottom": no trailing dead zone, the
          // release lands on the settled Accenture frame. ──────────────────
          const tween = gsap.to(track, {
            x: () => -(track.scrollWidth - screen.clientWidth),
            ease: "credHorScroll",
            scrollTrigger: {
              trigger: root,
              start: "2.5% top",
              end: "100% bottom",
              scrub: 0.25,
              invalidateOnRefresh: true,
              onUpdate: (self) => updateStation(self.progress),
            },
          });

          // ── Reveals (unchanged machinery) ───────────────────────────────
          // Hidden state ONLY via JS on this armed path. Focus safety net:
          // keyboard entering a not-yet-revealed block completes it at once.
          const revealOf = (el: HTMLElement) => {
            gsap.set(el, { autoAlpha: 0, y: 28 });
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
            teardown.push(() => el.removeEventListener("focusin", onFocus));
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

          // ── Per-frame: rest poses, ignition timeline, glint, hover ──────
          frameEls.forEach((frame, i) => {
            const back = frame.querySelector<HTMLElement>("[data-reel-back]");
            const lockup =
              frame.querySelector<HTMLElement>("[data-reel-lockup]");
            const glowWrap =
              frame.querySelector<HTMLElement>("[data-mark-glow]");
            const inner = glowInners[i];
            const rule = frame.querySelector<HTMLElement>("[data-reel-rule]");
            const value =
              frame.querySelector<HTMLElement>("[data-reel-value]");
            const ticks = gsap.utils.toArray<HTMLElement>(
              "[data-corner-tick]",
              frame,
            );
            const dots = gsap.utils.toArray<HTMLElement>(
              "[data-mark-dot]",
              frame,
            );
            const underlines = gsap.utils.toArray<HTMLElement>(
              "[data-mark-underline]",
              frame,
            );

            // Rest poses (armed path only — static column never hides).
            if (back) gsap.set(back, { yPercent: -50, autoAlpha: 0, scale: 1.05 });
            if (lockup) gsap.set(lockup, { autoAlpha: 0.55 });
            if (glowWrap) gsap.set(glowWrap, { autoAlpha: 0 });
            if (inner) gsap.set(inner, { opacity: GLOW_INNER_BASE });
            if (ticks.length) gsap.set(ticks, { autoAlpha: 0, scale: 0.4 });
            if (rule)
              gsap.set(rule, { scaleX: 0, transformOrigin: "left center" });
            if (value) gsap.set(value, { autoAlpha: 0, yPercent: 18 });
            if (dots.length)
              gsap.set(dots, { scale: 0, transformOrigin: "center center" });
            if (underlines.length)
              gsap.set(underlines, {
                scaleX: 0,
                transformOrigin: "left center",
              });

            // Ignition — persistent timeline, restart/reverse on every pass.
            const ign = gsap.timeline({
              paused: true,
              defaults: { ease: "expo.out" },
            });
            if (back) {
              ign.fromTo(
                back,
                { autoAlpha: 0, scale: 1.05 },
                { autoAlpha: BACK_ALPHA, scale: 1, duration: 1.2, immediateRender: false },
                0,
              );
            }
            if (lockup) {
              ign.fromTo(
                lockup,
                { autoAlpha: 0.55 },
                { autoAlpha: 1, duration: 0.9, immediateRender: false },
                0,
              );
            }
            if (glowWrap) {
              ign.fromTo(
                glowWrap,
                { autoAlpha: 0 },
                { autoAlpha: GLOW_PEAK, duration: 0.9, immediateRender: false },
                0,
              );
            }
            if (ticks.length) {
              ign.fromTo(
                ticks,
                { autoAlpha: 0, scale: 0.4 },
                {
                  autoAlpha: 1,
                  scale: 1,
                  duration: 0.4,
                  stagger: 0.04,
                  immediateRender: false,
                },
                0.05,
              );
            }
            if (rule) {
              ign.fromTo(
                rule,
                { scaleX: 0 },
                { scaleX: 1, duration: 0.6, immediateRender: false },
                0.1,
              );
            }
            if (value) {
              ign.fromTo(
                value,
                { autoAlpha: 0, yPercent: 18 },
                {
                  autoAlpha: 1,
                  yPercent: 0,
                  duration: 1.0,
                  immediateRender: false,
                },
                0.2,
              );
            }
            if (dots.length) {
              ign.fromTo(
                dots,
                { scale: 0 },
                {
                  scale: 1,
                  duration: 0.5,
                  ease: "back.out(2)",
                  immediateRender: false,
                },
                0.25,
              );
            }
            if (underlines.length) {
              ign.fromTo(
                underlines,
                { scaleX: 0 },
                { scaleX: 1, duration: 0.7, immediateRender: false },
                0.25,
              );
            }
            ScrollTrigger.create({
              trigger: frame,
              containerAnimation: tween,
              start: "left 70%",
              onEnter: () => ign.restart(),
              onLeaveBack: () => ign.reverse(),
            });

            // Glint sweep across the lockup as the frame crosses centre —
            // fully reversible under scrub.
            const glint = frame.querySelector<HTMLElement>("[data-reel-glint]");
            if (glint) {
              gsap.fromTo(
                glint,
                { xPercent: -160 },
                {
                  xPercent: 320,
                  ease: "none",
                  scrollTrigger: {
                    trigger: frame,
                    containerAnimation: tween,
                    start: "left 78%",
                    end: "left 22%",
                    scrub: 0.25,
                  },
                },
              );
            }

            // Magnetic hover — rect cached once on enter (never in a frame
            // loop), quickTo re-targeting, glow inner to full.
            if (lockup) {
              const xTo = gsap.quickTo(lockup, "x", {
                duration: 0.4,
                ease: "expo.out",
              });
              const yTo = gsap.quickTo(lockup, "y", {
                duration: 0.4,
                ease: "expo.out",
              });
              const clampMag = gsap.utils.clamp(-HOVER_MAG, HOVER_MAG);
              let rect: DOMRect | null = null;
              const onEnter = () => {
                rect = lockup.getBoundingClientRect();
                hovered = i;
                if (active === i) stopBreath();
                if (inner) {
                  gsap.to(inner, {
                    opacity: 1,
                    duration: 0.4,
                    ease: "expo.out",
                  });
                }
              };
              const onMove = (e: MouseEvent) => {
                if (!rect) return;
                xTo(
                  clampMag(
                    ((e.clientX - (rect.left + rect.width / 2)) / rect.width) *
                      14,
                  ),
                );
                yTo(
                  clampMag(
                    ((e.clientY - (rect.top + rect.height / 2)) /
                      rect.height) *
                      14,
                  ),
                );
              };
              const onLeave = () => {
                hovered = -1;
                rect = null;
                xTo(0);
                yTo(0);
                if (inner) {
                  gsap.to(inner, {
                    opacity: GLOW_INNER_BASE,
                    duration: 0.5,
                    ease: "expo.out",
                  });
                }
                if (active === i) startBreath(i);
              };
              lockup.addEventListener("pointerenter", onEnter);
              lockup.addEventListener("mousemove", onMove);
              lockup.addEventListener("pointerleave", onLeave);
              teardown.push(() => {
                lockup.removeEventListener("pointerenter", onEnter);
                lockup.removeEventListener("mousemove", onMove);
                lockup.removeEventListener("pointerleave", onLeave);
              });
            }
          });

          // ── Depth systems: three scrubbed planes across the whole runway
          // (the old stair verb, now carried by backplates/values/fores). ──
          const backs = gsap.utils.toArray<HTMLElement>(
            "[data-reel-back]",
            track,
          );
          if (backs.length) {
            gsap.fromTo(
              backs,
              { xPercent: -9 },
              {
                xPercent: 9,
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
          const values = gsap.utils.toArray<HTMLElement>(
            "[data-reel-value]",
            track,
          );
          if (values.length) {
            gsap.fromTo(
              values,
              { xPercent: gsap.utils.wrap([14, -14]) },
              {
                xPercent: gsap.utils.wrap([-14, 14]),
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
          const fores = gsap.utils.toArray<HTMLElement>(
            "[data-reel-fore]",
            track,
          );
          if (fores.length) {
            gsap.fromTo(
              fores,
              { xPercent: gsap.utils.wrap([4, -4]) },
              {
                xPercent: gsap.utils.wrap([-4, 4]),
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

          // ── Filament: screen-level rail, TRUE gesture progress (linear,
          // deliberately un-eased against the eased track). ────────────────
          let handoff: gsap.core.Tween | null = null;
          const rail = screen.querySelector<HTMLElement>(".cred-rail");
          if (rail) {
            const charge = rail.querySelector<HTMLElement>(
              "[data-rail-charge]",
            );
            const head = rail.querySelector<HTMLElement>("[data-rail-head]");
            gsap.set(rail, { autoAlpha: 0 });
            ScrollTrigger.create({
              trigger: root,
              start: "top 70%",
              onEnter: () =>
                gsap.to(rail, { autoAlpha: 1, duration: 0.85, ease: "expo.out" }),
              onLeaveBack: () =>
                gsap.to(rail, { autoAlpha: 0, duration: 0.4, ease: "expo.out" }),
            });
            if (charge) {
              gsap.fromTo(
                charge,
                { scaleX: 0 },
                {
                  scaleX: 1,
                  transformOrigin: "left center",
                  ease: "none",
                  scrollTrigger: {
                    trigger: root,
                    start: "2.5% top",
                    end: "100% bottom",
                    scrub: 0.25,
                  },
                },
              );
            }
            if (head) {
              gsap.fromTo(
                head,
                { x: 0 },
                {
                  x: () => rail.clientWidth,
                  ease: "none",
                  scrollTrigger: {
                    trigger: root,
                    start: "2.5% top",
                    end: "100% bottom",
                    scrub: 0.25,
                    invalidateOnRefresh: true,
                  },
                },
              );
              // Handoff: at the exact sticky release the head streaks off
              // frame-right, passing the light to the divario's eyebrow rule
              // (already mid-composition via its positive IO root margin).
              ScrollTrigger.create({
                trigger: root,
                start: "bottom bottom",
                onEnter: () => {
                  handoff?.kill();
                  handoff = gsap.to(head, {
                    x: "+=140",
                    autoAlpha: 0,
                    duration: 0.7,
                    ease: "power2.in",
                  });
                },
                onLeaveBack: () => {
                  handoff?.kill();
                  handoff = null;
                  // The scrubbed x tween re-takes ownership on the next
                  // scroll update; only visibility needs restoring.
                  gsap.set(head, { autoAlpha: 1 });
                },
              });
            }
          }

          // ── Corner-turn: the line turns 90° downward at F5's right edge,
          // scrubbed over the final approach. ──────────────────────────────
          const corner = track.querySelector<HTMLElement>("[data-corner-turn]");
          if (corner) {
            gsap.fromTo(
              corner,
              { scaleY: 0 },
              {
                scaleY: 1,
                transformOrigin: "top center",
                ease: "none",
                scrollTrigger: {
                  trigger: root,
                  start: "80% bottom",
                  end: "100% bottom",
                  scrub: 0.25,
                },
              },
            );
          }

          // Prime the caches/station against the freshly-asserted layout.
          cache();
          updateStation(tween.scrollTrigger ? tween.scrollTrigger.progress : 0);

          // One-shot late refresh once webfonts land: the display serif and
          // the type lockups materially change track.scrollWidth, and the
          // provider deliberately never refreshes ScrollTrigger on "/".
          let fontsCancelled = false;
          document.fonts?.ready
            .then(() => {
              if (!fontsCancelled) ScrollTrigger.refresh();
            })
            .catch(() => {});

          return () => {
            fontsCancelled = true;
            ScrollTrigger.removeEventListener("refreshInit", size);
            ScrollTrigger.removeEventListener("refresh", cache);
            teardown.forEach((off) => off());
            stopBreath();
            handoff?.kill();
            glowInners.forEach((el) => el && gsap.killTweensOf(el));
            if (rail) gsap.killTweensOf(rail);
            root.removeAttribute("data-on");
            root.style.height = "";
          };
        },
      );
    },
    // Language toggle swaps EN/IT text in place → widths change → the whole
    // context is reverted and recreated against the fresh copy.
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
          {/* P0 — title card: eyebrow (moved here from the old names panel)
              + the existing audience trust band, byte-identical spans on the
              site-wide split-reveal grammar (HeadingChoreographer contract:
              data-split-reveal + key={language} — the one legal SplitText
              spot, in view before the track moves). */}
          <div className="cred-panel cred-p-open flex flex-col gap-6">
            <p
              data-cred-reveal="enter"
              className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-ink-mute"
            >
              {isEn ? "Where our team trained" : "Dove si è formato il nostro team"}
            </p>
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
            <div
              data-cred-reveal="enter"
              aria-hidden="true"
              className="h-px w-24 bg-[hsl(var(--rule))]"
            />
          </div>

          {/* F1–F5 — the delivery reel frames */}
          {frames.map((frame) => (
            <ReelFrame
              key={frame.brand}
              frame={frame}
              isEn={isEn}
              isLast={frame.brand === "accenture"}
            />
          ))}
        </div>

        {/* Screen-level progress filament — does NOT translate with the
            track: 1px base rail + cyan→blue charge + glowing head dot. */}
        <div className="cred-rail cred-decor" aria-hidden="true">
          <div className="cred-rail-base" />
          <div className="cred-rail-charge" data-rail-charge />
          <div className="cred-rail-head" data-rail-head />
        </div>
      </div>

      <style>{`
        /* ── Static vertical column — SSR, <1024px, coarse pointer, reduced
           motion, no-JS. Everything visible, nothing clipped or hidden. ── */
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
        .cred-horizon .cred-col {
          display: flex;
          flex-direction: column;
        }
        .cred-value {
          line-height: 0.95;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }
        .cred-lockup { position: relative; display: inline-flex; align-items: center; width: fit-content; }
        /* Static entries: hairline-separated stack, reading order
           lockup → value → label → context. */
        .cred-horizon:not([data-on]) .cred-frame {
          border-top: 1px solid hsl(var(--rule));
          padding-top: 2.25rem;
        }
        .cred-horizon:not([data-on]) .cred-col { gap: 0.9rem; }
        .cred-horizon:not([data-on]) .cred-fore { display: contents; }
        .cred-horizon:not([data-on]) .cred-lockup { order: 1; font-size: 1.4rem; }
        .cred-horizon:not([data-on]) .cred-value {
          order: 2;
          font-size: clamp(2.6rem, 9vw, 4rem);
          white-space: normal;
        }
        .cred-horizon:not([data-on]) .cred-label { order: 3; }
        .cred-horizon:not([data-on]) .cred-context { order: 4; }

        /* ── Horizontal set piece — [data-on] is set exclusively via JS
           inside gsap.matchMedia (≥1024 + fine pointer + motionOk). ────── */
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
        .cred-horizon[data-on] .cred-p-open {
          width: 50vw;
          justify-content: center;
        }
        .cred-horizon[data-on] .cred-open {
          font-size: clamp(2.75rem, 4.4vw, 4.25rem);
          line-height: 1.06;
        }
        .cred-horizon[data-on] .cred-frame {
          position: relative;
          width: 62vw;
          height: 100%;
        }
        .cred-horizon[data-on] .cred-f-accenture { width: 84vw; }

        /* z-0 backplate silhouette — bleeds right, cropped by the screen. */
        .cred-horizon[data-on] .cred-back {
          position: absolute;
          left: 18vw;
          top: 50%;
          z-index: 0;
          color: hsl(var(--ink));
          line-height: 1;
          white-space: nowrap;
        }
        .cred-horizon[data-on] .cred-f-revolut .cred-back { height: 52vh; }
        .cred-horizon[data-on] .cred-f-jpmorgan .cred-back { height: 16vh; }
        .cred-horizon[data-on] .cred-f-deloitte .cred-back,
        .cred-horizon[data-on] .cred-f-brevanhoward .cred-back { font-size: 15vh; }
        .cred-horizon[data-on] .cred-f-accenture .cred-back { height: 15vh; }

        /* z-10 content column */
        .cred-horizon[data-on] .cred-col {
          position: relative;
          z-index: 10;
          width: 44vw;
          height: 100%;
          justify-content: center;
          gap: 1.4rem;
        }
        .cred-horizon[data-on] .cred-fore {
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
          width: fit-content;
        }
        .cred-horizon[data-on] .cred-lockup {
          font-size: clamp(1.7rem, 2.1vw, 2.25rem);
          padding: 0.9rem 1.1rem;
        }
        .cred-horizon[data-on] .cred-value {
          font-size: clamp(5.5rem, 9.5vw, 8.5rem);
        }
        .cred-horizon[data-on] .cred-value-long {
          font-size: clamp(3.4rem, 5.6vw, 5.4rem);
        }

        /* glow twin — STATIC blur, only opacities are animated */
        .cred-horizon[data-on] .cred-glow {
          display: flex;
          position: absolute;
          inset: 0;
          align-items: center;
          padding: 0.9rem 1.1rem;
          color: hsl(var(--accent));
          filter: blur(16px);
          pointer-events: none;
        }

        /* viewfinder corner ticks — brackets, not borders */
        .cred-tick {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 0 solid hsl(var(--rule) / 0.4);
          pointer-events: none;
        }
        .cred-tick-tl { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
        .cred-tick-tr { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
        .cred-tick-br { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }
        .cred-tick-bl { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }

        /* centre-crossing glint sweep, clipped to the lockup box */
        .cred-glint {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .cred-glint-band {
          position: absolute;
          top: -25%;
          bottom: -25%;
          left: 0;
          width: 38%;
          transform: skewX(-18deg);
          background: linear-gradient(
            90deg,
            transparent,
            hsl(var(--accent) / ${GLINT_ALPHA}),
            transparent
          );
        }

        /* drawn hairline (ignition actor) */
        .cred-hairline {
          height: 1px;
          width: 9rem;
          background: linear-gradient(
            90deg,
            hsl(var(--accent)),
            hsl(var(--accent-2))
          );
        }

        /* per-frame rail tick — just above the screen-level filament */
        .cred-horizon[data-on] .cred-frametick {
          position: absolute;
          left: 0;
          bottom: calc(9vh + 6px);
          z-index: 10;
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
        }
        .cred-frametick-bar {
          display: block;
          width: 1px;
          height: 8px;
          background: hsl(var(--rule));
        }

        /* F5 luminance ramp → ProblemSection's .section-accent-tint wash */
        .cred-ramp {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: 30vw;
          z-index: 0;
          background: linear-gradient(
            90deg,
            transparent,
            hsl(var(--accent-2) / 0.05) 60%,
            hsl(var(--accent-2) / ${RAMP_ALPHA})
          );
        }
        .cred-terminus {
          position: absolute;
          right: 1rem;
          bottom: calc(9vh + 2.25rem);
          text-align: right;
        }

        /* corner-turn — the line turns 90° down into the divario's rule */
        .cred-corner {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 1px;
          height: 9vh;
          z-index: 10;
          background: linear-gradient(
            180deg,
            hsl(var(--accent-2)),
            transparent
          );
        }

        /* screen-level progress filament */
        .cred-horizon[data-on] .cred-rail {
          position: absolute;
          left: var(--margin);
          right: var(--margin);
          bottom: 9vh;
          z-index: 20;
          height: 9px;
          pointer-events: none;
        }
        .cred-rail-base {
          position: absolute;
          inset-inline: 0;
          top: 4px;
          height: 1px;
          background: hsl(var(--rule) / 0.6);
        }
        .cred-rail-charge {
          position: absolute;
          inset-inline: 0;
          top: 3.5px;
          height: 2px;
          background: linear-gradient(
            90deg,
            hsl(var(--accent) / 0.35),
            hsl(var(--accent)) 40%,
            hsl(var(--accent-2))
          );
        }
        .cred-rail-head {
          position: absolute;
          left: -4px;
          top: 0.5px;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: hsl(var(--accent));
          box-shadow: 0 0 18px hsl(var(--accent) / 0.55);
        }
      `}</style>
    </section>
  );
}
