"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { useLanguage } from "@/components/language-provider";
import {
  createPreloaderTunnel,
  type PreloaderTunnel,
} from "@/components/fx/preloader-tunnel";
import { SPINE_COPY } from "@/components/sections/cinematic-system-scroll";
import { getLenis } from "@/lib/lenis-singleton";
import { suspendSnap } from "@/lib/scroll-snap";
import { START_HREF } from "@/lib/site";
import {
  SEQ,
  SEQ_APPARENT_K,
  SEQ_PAN_FRAC,
  seqRamp,
  seqSmooth,
  useSeqStore,
  resetSeqStore,
} from "@/webgl/store/seqStore";
import { useTierStore } from "@/webgl/store/tierStore";

/**
 * SingularityPassage — "THE LONG TAKE" v2: section 05 ("handover") IS this
 * section now, and the shot around it runs in TWO regimes.
 *
 * WHAT LIVES HERE (owner corrections 2026-08-07):
 *   1. Stage 05 exists ONCE — the spine runs 01→04 and its old handover
 *      panel moved here WHOLESALE (HANDOVER_STAGE below: eyebrow · title ·
 *      body · capability line · 13/5/1 proof chips · both CTAs, EN+IT
 *      byte-identical). It is REAL content: never blanket aria-hidden, CTAs
 *      focusable/clickable while on screen, readable on every tier.
 *   2. The traverse is a TRUE horizontal parallax passage (the deleted
 *      credibility-strip / domus-tua grammar): a DOM track carries panel 05
 *      off-LEFT in vw units while seqStore.pan01 pans the WebGL camera
 *      right — the world (tube/dust/hole) travels through frame at 1.0×,
 *      the DOM foreground at TRACK_RATE_FG (1.15×), far dust slower via
 *      DriftParticles' z-spread. You travel RIGHT through space from 05.
 *      Since 2026-08-09 the traverse PLAYS ITSELF as the one-shot's first
 *      segment on the forward path — the scrub owns it only on reverse
 *      entry.
 *   3. The plunge is a triggered ONE-SHOT, not a scrub ("solo con uno
 *      scroll deve fare tutto... andando sempre più veloce da solo"). And
 *      the hole never fades — we ENTER it (see THE SHOT below). Owner
 *      2026-08-09: the one-shot fires on the FIRST forward scroll of the
 *      horizontal regime, the rightward pan plays BEFORE the warp, and the
 *      hole stays dead-center at near-constant apparent size through the
 *      whole light-speed effect — entry happens only at the end, slowly.
 *
 * THE SHOT:
 *   SCRUBBED (pure function of p — fully reversible):
 *     SETTLE   p 0–0.08   panel 05 MATERIALIZES in place (opacity ramp
 *                         PANEL_ENTER 0.005–0.029 + the spine StagePanel's
 *                         (1−α)·16px rise — the 02→03 crossfade grammar;
 *                         owner 2026-08-09: the 04→05 handoff must never
 *                         read as a scroll. The spine's stage 04 dissolves
 *                         across its own final band and this section is
 *                         pulled up one viewport (THE PINNED HANDOFF below),
 *                         so the seam crosses as black on black UNDER A
 *                         FRAME THAT NEVER MOVES and 05 appears in place a
 *                         short breath later) then rests frame-left; 2% pan
 *                         pre-drift. Scrolling UP out of the passage fades
 *                         it back out across 0.029→0.005 before the section
 *                         detaches — the symmetric exit.
 *                         Tunnel created PARKED at p 0.02 (calm beat).
 *     TRIGGER  p 0.10     the FIRST forward scroll past SETTLE hands the
 *                         shot to the one-shot — the forward SCROLL flow
 *                         never scrubs past this window. p 0.10–1 (traverse
 *                         → hold → approach, the beat map in seqStore.SEQ)
 *                         remains pure-scrub territory for REVERSE ENTRY
 *                         (and for single-tick native jumps past FIRE_MAX_P
 *                         — see TRIGGER MECHANICS): scrolling UP from the
 *                         divario lands on the p = 1 NEAR HOLD (hole
 *                         dead-center at dist 2.6,
 *                         ~82.5vh — the designed re-entry pose) and scrubs
 *                         back through the beats from there.
 *   ONE-SHOT (triggered timeline ≈ 6.9s, input locked, accelerating):
 *     TRIGGER    forward crossing of p 0.10 (right after SETTLE) → Lenis
 *                stopped, wheel/touch consumed, snap suspended.
 *     TRAVERSE   ~1.7s power2.inOut — the pan the scrub used to own plays
 *                as cinema: pan01 completes launch→1 (DOM track carries
 *                panel 05 off-left, opacity ramp in segment-t 0.25–0.6),
 *                the hole rides dist launch→12 (17.9vh) fading in
 *                lensing-first to full, yFrac →0. Warp stays WARP_MIN,
 *                veil untouched; the hole is exactly centered as the
 *                tunnel's center lock completes (PLUNGE_LOCK_T ≈ end of
 *                TRAVERSE).
 *     LIGHTSPEED ~1.6s power2.in — the jump: warp 2→100, streaks rise to
 *                0.85 (tunnel z-40 paints over the veil z-38), stars fall
 *                0.9→0.4 — and the hole stays FULLY VISIBLE, DEAD-CENTER,
 *                through the WHOLE warp at near-constant apparent size
 *                (dist 12→10, 17.9→21.4vh — a barely-perceptible approach:
 *                it reads as an enormous, distant body). No veil.
 *     ENTER      ~1.8s power1.in — the viewer actually goes in: dist 10→1.9
 *                SLOWLY (apparent crosses ~113vh); the #000 veil (same
 *                black as the march's uRampCol3) completes coverage ONLY
 *                in the tail (segment-t 0.55–1) — by dist ≈2 the hole's
 *                own black core exceeds ~107vh, so the completion is
 *                invisible (the color seam). Then, under the FULLY BLACK
 *                frame: march hidden (holeFade→0 — the swap is invisible)
 *                and the COVERT JUMP: scrollTo(#problem, immediate) — the
 *                user never sees a downward scroll.
 *     SPEED      ~0.7s — inside the black: streaks at full, warp holds
 *                WARP_MAX; the camera pan silently unwinds 1→0.
 *     EMERGE     ~1.1s power2.out — the black opens, warp 100→8, streaks
 *                die, and the divario lands as a ZOOM-IN: [data-emerge]
 *                scales 0.8→1 from the vanishing point to identity
 *                (transform-only). Lenis restarts at timeline end.
 *   TRIGGER MECHANICS: fires only on a genuine forward crossing of
 *   TRIGGER_P (prev < 0.10 ≤ p, direction down — SPA landings prime `p`
 *   without firing), and only when the crossing tick lands at
 *   p ≤ FIRE_MAX_P — a window wide enough to swallow a fast fling's
 *   one-tick momentum jump through the TRACK band (the captured launch
 *   state makes a deep launch safe), while a single-tick native jump (End
 *   key, scrollbar click-jump, p ≈ 1) stays a scrub, never launching the
 *   locked shot off-stage.
 *   Esc or ≥120px of cumulative reverse-wheel during the
 *   one-shot SKIPS to the end state (never traps); any un-consumed scroll
 *   drift (keyboard) also skips — after a young-shot GRACE (tl < 0.08)
 *   that re-bases the drift anchor instead, absorbing the fire fling's
 *   momentum/settle tail. Re-arm hysteresis: after a played plunge
 *   the trigger re-arms only once p < REARM_P (0.05 — BELOW the trigger,
 *   so a re-armed user can always produce the forward crossing again).
 *   Re-entering from below lands on the near-hold state (compose(p≈1))
 *   without ever replaying the one-shot backward; a forward exit past the
 *   container end with NO shot in flight (a reverse entry that turned
 *   around above REARM_P, or a jump past FIRE_MAX_P) is CLOSED by mainST's
 *   onLeave — holeFade/pan01/DPR-cap reset, so the camera-locked hole can
 *   never ride over the divario and the sections below.
 *
 * HOUSE SCROLL GRAMMAR (credibility-strip lineage): CSS sticky stage +
 * explicit container height (NO ScrollTrigger pin — a pin-spacer breaks
 * every [data-line-anchor] measurement) + the one-viewport overlap margin
 * (THE PINNED HANDOFF, in the armed desktop context below),
 * transform/opacity-only scrub paths
 * via quickSetters, CustomEase, height re-asserted on refreshInit, rect
 * caches refreshed only on ScrollTrigger "refresh" (never in a frame loop),
 * fonts.ready refresh, focusin net (focus inside the overflow-hidden stage
 * re-zeroes its scroll offsets so the browser can never shear the
 * composition), useGSAP dependencies:[language] with revertOnUpdate.
 *
 * FALLBACK MATRIX (no tier loses section 05's content):
 *   desktop + fine + motion-ok            → the full sequence above; when
 *     the WebGPU march never goes live (seqStore.marchLive false) a
 *     pure-CSS hole imposter rides the SAME 1/d curve — applyHoleVisuals
 *     runs on every one-shot segment (traverse → lightspeed → enter) — and
 *     the REAL tunnel plunge still runs (raw WebGL1).
 *   createPreloaderTunnel returns null    → graft 5: the veil carries the
 *     entry alone — a dark plunge, never a dead cut.
 *   coarse pointer / <1024px + motion-ok  → panel 05 renders as a normal
 *     fully-readable VERTICAL section (CTAs work), then the ~180vh cheap
 *     beat: the CSS imposter scales along the same precomputed 1/d curve
 *     (transform/opacity only) and crossfades to navy.
 *   prefers-reduced-motion / no JS        → the static vertical section 05
 *     + a static 60vh deep-navy gradient spacer. No transforms, no tunnel.
 * Decorative layers ONLY (imposter, veil, pulse, tunnel host, lite beat,
 * spacer) are aria-hidden — panel 05 is real content on every path.
 */

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);
  // CustomEase.create is idempotent (same id → overwrite), safe under HMR.
  // The TRACK pan reuses the credibility reel's horizontal-scrub family.
  CustomEase.create("seqPanEase", "0.25, 0, 0.75, 1");
  // plungeEase: the APPROACH sub-progress u in d = 12·(2.6/12)^u — eases off
  // the HOLD-1 rest, plateaus FLAT at u = ln(12/6)/ln(12/2.6) ≈ 0.4532 (the
  // d≈6 micro-hold: hold… hold…), then steepens power2.in toward the near
  // hold so the growth accelerates in scroll-space exactly as it does
  // physically.
  CustomEase.create(
    "seqPlungeEase",
    "M0,0 C0.15,0.08 0.32,0.4532 0.4423,0.4532 C0.49,0.4532 0.51,0.4532 0.5577,0.4532 C0.78,0.4532 0.92,0.62 1,1",
  );
}

const DESKTOP_MQ = "(min-width: 1024px)";
const FINE_MQ = "(pointer: fine)";
const MOTION_OK_MQ = "(prefers-reduced-motion: no-preference)";

// ── Owner tuning knobs (one-line tuning at review) ──────────────────────────
/** Panel 05 leaves the focus order / a11y tree below this opacity. */
const PANEL_LIT_MIN = 0.6;
/**
 * Graft 7 — owner-gated horizon pulse (ship dark by default): a restrained
 * #EAF6FF luminance veil BELOW the tunnel canvas so the additive cyan/white
 * streaks burn through it at peak warp. Flip to true for the "sorprendimi"
 * review; one-commit removal if vetoed.
 */
const ENABLE_HORIZON_PULSE = false;
/** Horizon-pulse peak opacity (capped per the graft: 0.15–0.2). */
const PULSE_PEAK = 0.18;

// ── Stage 05 — THE single source (moved wholesale from the spine's
// STAGE_CONTENT "handover" block, owner 2026-08-07: it must exist ONCE).
// Copy byte-identical to the pre-move spine strings, EN + IT. ───────────────
const HANDOVER_STAGE = {
  eyebrow: { en: "05 / Handover", it: "05 / Consegna" },
  title: {
    en: (
      <>
        We hand over something you can{" "}
        <span className="text-[hsl(var(--accent))] font-display font-medium">
          run.
        </span>
      </>
    ),
    it: (
      <>
        Consegniamo un sistema che potete{" "}
        <span className="text-[hsl(var(--accent))] font-display font-medium">
          gestire.
        </span>
      </>
    ),
  },
  body: {
    en: "A production system with its evals, traces, and boundaries documented. Your team owns it from day one, and you talk to one of us, not an account manager.",
    it: "Un sistema in produzione con eval, trace e limiti documentati. Il vostro team lo gestisce dal primo giorno, e parlate con uno di noi, non con un account manager.",
  },
  // Closing proof (user decision 2026-06-10): categorical commit + real
  // counts pulled from the actual case-studies.ts data and founders.ts
  // credentials. No invented metrics.
  extras: {
    en: (
      <div className="mt-5 flex flex-col gap-3">
        <p className="text-[13px] sm:text-[14px] font-mono uppercase tracking-[0.14em] text-ink/85 leading-relaxed">
          Custom Software <span aria-hidden="true">·</span> AI Agents{" "}
          <span aria-hidden="true">·</span> Automation{" "}
          <span aria-hidden="true">·</span> MLOps{" "}
          <span aria-hidden="true">·</span> Audits
          <br />
          <span className="text-ink-mute/80">
            For SaaS, fintech &amp; regulated teams
          </span>
        </p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink/75 list-none">
          <ProofChip value="13" label="named engagements" />
          <li aria-hidden="true" className="text-ink-mute/55">/</li>
          <ProofChip value="5" label="tier-1 institutions" />
          <li aria-hidden="true" className="text-ink-mute/55">/</li>
          <ProofChip value="1" label="PhD, applied maths" />
        </ul>
      </div>
    ),
    it: (
      <div className="mt-5 flex flex-col gap-3">
        <p className="text-[13px] sm:text-[14px] font-mono uppercase tracking-[0.14em] text-ink/85 leading-relaxed">
          Software su misura <span aria-hidden="true">·</span> Agenti AI{" "}
          <span aria-hidden="true">·</span> Automazione{" "}
          <span aria-hidden="true">·</span> MLOps{" "}
          <span aria-hidden="true">·</span> Audit
          <br />
          <span className="text-ink-mute/80">
            Per SaaS, fintech e team regolamentati
          </span>
        </p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink/75 list-none">
          <ProofChip value="13" label="progetti nominali" />
          <li aria-hidden="true" className="text-ink-mute/55">/</li>
          <ProofChip value="5" label="istituzioni tier-1" />
          <li aria-hidden="true" className="text-ink-mute/55">/</li>
          <ProofChip value="1" label="PhD, matematica applicata" />
        </ul>
      </div>
    ),
  },
} as const;

// === Proof-chip count-up (moved here with stage 05) ========================
// A11y contract mirrors CountUp (ui/count-up.tsx): sr-only static final
// value, aria-hidden animated span, direct textContent writes (no React
// state per frame), and reduced-motion never animates (the animated span
// ships with the final value in the SSR HTML, so "do nothing" = final value).
function ProofChip({ value, label }: { value: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="text-ink tabular-nums">
        <span className="sr-only">{value}</span>
        <span data-chip-count={value} aria-hidden="true">
          {value}
        </span>
      </span>
      <span>{label}</span>
    </li>
  );
}

function animateChipCount(node: HTMLElement) {
  // One-shot per DOM node. A language toggle remounts the chips (fresh
  // nodes, no flag), so a replay after EN↔IT runs once — same re-arm
  // semantics as the site's other text engines.
  if (node.dataset.chipCounted === "1") return;
  node.dataset.chipCounted = "1";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const final = node.dataset.chipCount ?? "";
  const target = Number.parseInt(final, 10);
  if (!Number.isFinite(target)) return;
  const obj = { n: 0 };
  node.textContent = "0";
  gsap.to(obj, {
    n: target,
    duration: 0.8,
    ease: "expo.out",
    onUpdate: () => {
      if (!node.isConnected) return; // remounted mid-tween (language toggle)
      node.textContent = String(Math.round(obj.n));
    },
    onComplete: () => {
      if (node.isConnected) node.textContent = final;
    },
  });
}

// ── Pure beat-map evaluators (p → value; see seqStore.SEQ for the map) ──────

function panAt(p: number, panEase: (t: number) => number): number {
  if (p <= 0) return 0;
  if (p < SEQ.SETTLE_END) {
    // SETTLE pre-drift: 2% of the pan so no frame is static.
    return 0.02 * (p / SEQ.SETTLE_END);
  }
  if (p < SEQ.TRACK_END) {
    return (
      0.02 +
      0.98 * panEase((p - SEQ.SETTLE_END) / (SEQ.TRACK_END - SEQ.SETTLE_END))
    );
  }
  // Holds at 1 through HOLD/APPROACH; the one-shot unwinds it under black.
  return 1;
}

function distAt(
  p: number,
  panEase: (t: number) => number,
  plungeEase: (t: number) => number,
): number {
  if (p < SEQ.SETTLE_END) return SEQ.DIST_FAR;
  if (p < SEQ.TRACK_END) {
    // TRACK: 16→12 on the same eased clock as the pan (already growing 1/d).
    const t = panEase((p - SEQ.SETTLE_END) / (SEQ.TRACK_END - SEQ.SETTLE_END));
    return SEQ.DIST_FAR * Math.pow(SEQ.DIST_MID / SEQ.DIST_FAR, t);
  }
  if (p < SEQ.HOLD1_END) return SEQ.DIST_MID;
  // APPROACH: exponential in the plunge-eased sub-progress u — the
  // micro-hold plateau and the accelerating tail live in the ease. Ends at
  // DIST_NEAR (the near hold); the one-shot owns NEAR→FLOOR.
  const u = plungeEase(
    (p - SEQ.HOLD1_END) / (SEQ.APPROACH_END - SEQ.HOLD1_END),
  );
  return SEQ.DIST_MID * Math.pow(SEQ.DIST_NEAR / SEQ.DIST_MID, u);
}

/** Lensing-first ramp-in ONLY — the hole NEVER fades out on scroll (owner:
 * we enter it; holeFade drops to 0 only under the one-shot's black frame). */
function holeFadeAt(p: number): number {
  return seqSmooth(p, SEQ.FADE_IN_START, SEQ.FADE_IN_END);
}

export default function SingularityPassage() {
  const { language } = useLanguage();
  const copy = SPINE_COPY[language];
  const rootRef = useRef<HTMLElement | null>(null);

  // Proof chips (13/5/1): standard one-shot IO — honest on every path (the
  // panel is in the viewport when the section scrolls in, sticky or not;
  // opacity never gates intersection, so on the armed path the count may
  // start under the PANEL_ENTER materialize and land mid-flight — fine, the
  // sr-only value is always final). Re-runs on language toggle (fresh
  // nodes). Reduced motion: zero-cost skip (chips ship with final values).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-chip-count]"),
    );
    if (targets.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.unobserve(entry.target);
            animateChipCount(entry.target as HTMLElement);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.4 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [language]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add(
        { desktop: DESKTOP_MQ, fine: FINE_MQ, motionOk: MOTION_OK_MQ },
        (ctx) => {
          const c = ctx.conditions as {
            desktop: boolean;
            fine: boolean;
            motionOk: boolean;
          };
          // Reduced motion → the static vertical section 05 + gradient
          // spacer only (default CSS — no JS at all, the simple fade cut).
          if (!c.motionOk) return;

          // ==================================================================
          // MOBILE / COARSE — panel 05 stays a normal vertical section in
          // flow (default CSS, CTAs work), followed by the cheap ~180vh
          // beat: CSS hole imposter on the SAME 1/d curve, then a navy
          // crossfade.
          // ==================================================================
          if (!c.desktop || !c.fine) {
            const liteRun = root.querySelector<HTMLElement>(
              "[data-seq-lite-run]",
            );
            const imposter = root.querySelector<HTMLElement>(
              "[data-seq-imposter]",
            );
            const cover = root.querySelector<HTMLElement>("[data-seq-cover]");
            if (!liteRun || !imposter || !cover) return;

            root.setAttribute("data-on", "lite");
            const size = () => {
              liteRun.style.height = `${SEQ.LITE_HEIGHT_VH}vh`;
            };
            size();
            ScrollTrigger.addEventListener("refreshInit", size);

            const impSet = gsap.quickSetter(imposter, "css") as (
              v: Record<string, number | string>,
            ) => void;
            const coverSet = gsap.quickSetter(cover, "opacity") as (
              v: number,
            ) => void;
            gsap.set(imposter, { scale: 1, opacity: 0 });
            gsap.set(cover, { opacity: 0 });

            const st = ScrollTrigger.create({
              trigger: liteRun,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const t = self.progress;
                // The physics rule on a div: apparent = 12·(160/12)^(t²) vh —
                // exponential in a power2.in-eased clock, i.e. d ∝ 1/apparent
                // shrinking with accelerating growth toward the horizon.
                const u = t * t;
                const apparent =
                  SEQ.LITE_START_VH *
                  Math.pow(SEQ.LITE_MAX_VH / SEQ.LITE_START_VH, u);
                impSet({
                  scale: apparent / SEQ.LITE_START_VH,
                  opacity: seqRamp(t, 0, 0.15),
                });
                coverSet(seqSmooth(t, 0.72, 0.95));
              },
            });

            let fontsCancelled = false;
            document.fonts?.ready
              .then(() => {
                if (!fontsCancelled) ScrollTrigger.refresh();
              })
              .catch(() => {});

            return () => {
              fontsCancelled = true;
              st.kill();
              ScrollTrigger.removeEventListener("refreshInit", size);
              root.removeAttribute("data-on");
              liteRun.style.height = "";
            };
          }

          // ==================================================================
          // FULL DESKTOP SEQUENCE
          // ==================================================================
          const stage = root.querySelector<HTMLElement>(".seq-stage");
          const track = root.querySelector<HTMLElement>("[data-seq-track]");
          const panel = root.querySelector<HTMLElement>("[data-seq-panel]");
          const veil = root.querySelector<HTMLElement>("[data-seq-veil]");
          const pulse = root.querySelector<HTMLElement>("[data-seq-pulse]");
          const host = root.querySelector<HTMLElement>(
            "[data-seq-tunnel-host]",
          );
          const imposter = root.querySelector<HTMLElement>(
            "[data-seq-desk-imposter]",
          );
          if (!stage || !track || !panel || !veil || !host) return;

          root.setAttribute("data-on", "seq");

          // ── THE PINNED HANDOFF ────────────────────────────────────────────
          // Owner, round 4 (2026-08-09): "da 04 a 05 se scrollo la pagina
          // scende giu, non e' pinnato come da 01-02 a 03-04."
          //
          // Inside the spine every group swap happens while its stage is
          // PINNED (sticky top:0): the copy crossfades and NOTHING on screen
          // travels. Between 04 and 05 there are TWO sections, so the seam
          // used to hand over through ONE VIEWPORT OF UNPINNED TRANSIT — the
          // spine's sticky stage travels out during the final 100vh of its
          // section (a sticky stage unpins when its container's BOTTOM reaches
          // the viewport bottom) while this section's own sticky stage rides
          // UP with the page until its container top reaches the viewport top.
          // That transit is exactly what the owner sees "going down".
          //
          // The fix is an OVERLAP, not a longer or slower scrub: a slower
          // transit is still a transit — the handoff has to be PINNED, not
          // gentler. Pulling this section up by exactly one viewport puts its
          // container top ON the spine's pin end, so this stage is ALREADY
          // stuck at top:0 the moment the spine's pin releases, and stays
          // stuck across the whole 100vh the spine takes to leave. During that
          // window the exiting spine stage is EMPTY (stage 04's opacity is
          // faded out across spine progress 0.97→1 — the panelOpacity band —
          // and the left StageRail fades on that same band, see
          // cinematic-system-scroll.tsx) and TRANSPARENT, sliding away over an
          // already-pinned frame: nothing visible moves. This section comes
          // LATER in the DOM, so it paints above the exiting stage — panel 05
          // stays clickable while the spine's own (unlit, inert) panels stay
          // inert.
          //
          // WHY A JS WRITE IN THE ARMED CONTEXT AND NOT A CSS RULE: only this
          // path has a sticky stage waiting to cover the overlap. The lite
          // (mobile/coarse) and reduced-motion/no-JS layouts render panel 05
          // as a normal vertical section and MUST keep normal document flow —
          // a CSS rule would drag their section up over the spine's last
          // viewport with nothing pinned underneath. It lives INSIDE size(),
          // next to the height write, so the refreshInit re-assertion can
          // never clobber it, and it is cleared in the context cleanup
          // alongside height + data-on.
          //
          // Every ScrollTrigger re-measures on refresh, so the shifted layout
          // propagates on its own: this section's mainST/bandST, every trigger
          // below it, and the [data-line-anchor] bus (which re-measures on
          // mount + its two late passes + fonts.ready).
          const size = () => {
            root.style.height = `${SEQ.DESKTOP_HEIGHT_VH}vh`;
            root.style.marginTop = "-100vh";
          };
          size();
          ScrollTrigger.addEventListener("refreshInit", size);

          useSeqStore.setState({ active: true });

          const panEase = gsap.parseEase("seqPanEase");
          const plungeEase = gsap.parseEase("seqPlungeEase");

          // ── Caches — refreshed ONLY on ScrollTrigger "refresh" ───────────
          let ih = window.innerHeight;
          let vw = window.innerWidth;
          let emergeEl =
            document.querySelector<HTMLElement>("#problem [data-emerge]");
          let emergeSet: ((v: Record<string, number | string>) => void) | null =
            null;
          let emergeCx = 0;
          let emergeDocCy = 0;
          /** Covert-jump destination: the divario's document top. */
          let problemTopDoc = 0;
          // Clear the emerge transform BEFORE ScrollTrigger measures so the
          // cached center is the layout position, not a mid-zoom pose.
          const clearEmerge = () => {
            if (emergeEl) gsap.set(emergeEl, { x: 0, y: 0, scale: 1 });
          };
          ScrollTrigger.addEventListener("refreshInit", clearEmerge);
          const cache = () => {
            ih = window.innerHeight;
            vw = window.innerWidth;
            const problemEl = document.querySelector<HTMLElement>("#problem");
            problemTopDoc = problemEl
              ? problemEl.getBoundingClientRect().top + window.scrollY
              : root.getBoundingClientRect().top +
                window.scrollY +
                root.offsetHeight;
            emergeEl =
              document.querySelector<HTMLElement>("#problem [data-emerge]");
            if (emergeEl) {
              const r = emergeEl.getBoundingClientRect();
              emergeCx = r.left + r.width / 2;
              emergeDocCy = r.top + window.scrollY + r.height / 2;
              emergeSet = gsap.quickSetter(emergeEl, "css") as (
                v: Record<string, number | string>,
              ) => void;
            } else {
              emergeSet = null;
            }
            tunnel?.resize();
          };
          ScrollTrigger.addEventListener("refresh", cache);

          // ── quickSetters (transform/opacity only on scrub paths) ─────────
          const trackX = gsap.quickSetter(track, "x", "px") as (
            v: number,
          ) => void;
          const panelAlpha = gsap.quickSetter(panel, "opacity") as (
            v: number,
          ) => void;
          // Panel 05's entry Y (px) — the spine StagePanel's exact
          // (1-opacity)*16 offset, written by compose() only. The one-shot
          // TRAVERSE keeps writing panelAlpha alone: its exit verb is the
          // horizontal track-off, and at fire time (p ≈ 0.10 >
          // PANEL_ENTER_END) the entry ramp is already 1, so y sits at 0.
          const panelY = gsap.quickSetter(panel, "y", "px") as (
            v: number,
          ) => void;
          const veilSet = gsap.quickSetter(veil, "css") as (
            v: Record<string, number | string>,
          ) => void;
          const pulseAlpha = pulse
            ? (gsap.quickSetter(pulse, "opacity") as (v: number) => void)
            : null;
          const imposterSet = imposter
            ? (gsap.quickSetter(imposter, "css") as (
                v: Record<string, number | string>,
              ) => void)
            : null;
          gsap.set(track, { x: 0 });
          // opacity 1 here is DELIBERATE (never 0 — the fallback layouts this
          // node can flip into rely on a visible panel, and cleanup restores
          // that default). No flash on the armed path: the prime compose()
          // at the bottom of this same synchronous block immediately applies
          // the p-state (entry ramp 0 at p ≈ 0 → hidden) before any paint.
          gsap.set(panel, { opacity: 1 });
          gsap.set(veil, { opacity: 0, scale: 0.5 });
          if (pulse) gsap.set(pulse, { opacity: 0 });
          if (imposter) gsap.set(imposter, { scale: 1, opacity: 0 });

          // ── Panel 05 interactivity (real content — StagePanel's lit
          // discipline): focusable/clickable while on screen, inert + out of
          // the a11y tree once it has tracked off and faded ─────────────────
          let panelLit: boolean | null = null;
          const setPanelInteractive = (on: boolean) => {
            if (on === panelLit) return;
            panelLit = on;
            panel.style.pointerEvents = on ? "auto" : "none";
            (panel as HTMLElement & { inert: boolean }).inert = !on;
            if (on) panel.removeAttribute("aria-hidden");
            else panel.setAttribute("aria-hidden", "true");
          };

          // Focusin net (credibility-strip lineage, adapted): focus landing
          // inside the overflow-hidden sticky stage must never let the
          // browser shear the composition via native scroll-into-view —
          // re-zero the stage's scroll offsets on every focusin.
          const onStageFocusIn = () => {
            stage.scrollLeft = 0;
            stage.scrollTop = 0;
          };
          stage.addEventListener("focusin", onStageFocusIn);

          // ── Tunnel lifecycle (graft 6: park cheap, dispose on distance) ──
          // A fresh <canvas> per instance: dispose() loses the GL context
          // permanently, so re-entry re-creates the element (static 50k-point
          // buffer — ms-scale).
          let tunnel: PreloaderTunnel | null = null;
          let tunnelCanvas: HTMLCanvasElement | null = null;
          let lastAlpha = -1;
          const ensureTunnel = () => {
            if (tunnel || useSeqStore.getState().tunnelNull) return;
            const cv = document.createElement("canvas");
            cv.style.opacity = "0";
            host.appendChild(cv);
            const t = createPreloaderTunnel(cv, { tilt: false });
            if (!t) {
              host.removeChild(cv);
              // Graft 5: no WebGL1 → the veil carries the entry alone (a
              // dark plunge, never a dead cut).
              useSeqStore.setState({ tunnelNull: true });
              return;
            }
            tunnel = t;
            tunnelCanvas = cv;
            lastAlpha = -1;
            t.resize();
          };
          const disposeTunnel = () => {
            if (!tunnel) return;
            stopRaf();
            tunnel.dispose();
            tunnel = null;
            if (tunnelCanvas) {
              tunnelCanvas.remove();
              tunnelCanvas = null;
            }
          };

          // ── Tunnel rAF (the ONLY frame loop this section owns; runs only
          // while warm/hot — parked everywhere else) ───────────────────────
          let raf = 0;
          let rafOn = false;
          let prevT = 0;
          const rafTick = (now: number) => {
            if (!rafOn) return;
            const dt = Math.min((now - prevT) / 1000, 1 / 30);
            prevT = now;
            const s = useSeqStore.getState();
            if (tunnel) {
              const a = s.tunnelAlpha;
              if (tunnelCanvas && a !== lastAlpha) {
                lastAlpha = a;
                tunnelCanvas.style.opacity = String(a);
              }
              // Warp target comes straight from the store (the one-shot
              // timeline writes it; WARP_MIN at rest). The module lerps its
              // timeCoef at 0.02/frame — smooth both directions.
              tunnel.setTargetTimeCoef(s.warp);
              // Center lock: particle convergence + zoom-blur center sit on
              // the marched core (island-published UV, eased to exact center
              // across the one-shot's first PLUNGE_LOCK_T; 0.5/0.5 whenever
              // no island is live).
              tunnel.setCenter(s.holeNdcX, s.holeNdcY);
              tunnel.render(dt);
            }
            raf = requestAnimationFrame(rafTick);
          };
          const startRaf = () => {
            if (rafOn) return;
            rafOn = true;
            prevT = performance.now();
            raf = requestAnimationFrame(rafTick);
          };
          const stopRaf = () => {
            if (!rafOn) return;
            rafOn = false;
            cancelAnimationFrame(raf);
          };

          // ── DPR cap (tierStore → AdaptiveResolution): hysteresis on the
          // heavy near-hold; the one-shot asserts it for the fullscreen-march
          // burst and releases it under the black frame ─────────────────────
          let capOn = false;
          const setCap = (on: boolean) => {
            if (on === capOn) return;
            capOn = on;
            useTierStore.getState().setDprCap(on ? SEQ.DPR_CAP : null);
          };
          const applyDprCap = (p: number) => {
            if (!capOn && p > SEQ.DPR_CAP_ON) setCap(true);
            else if (capOn && p < SEQ.DPR_CAP_OFF) setCap(false);
          };

          // ── Hole visuals shared by the scrub AND the one-shot: the CSS
          // imposter (non-WebGPU stand-in) rides the SAME 1/d curve ─────────
          const applyHoleVisuals = (dist: number, fade: number) => {
            if (!imposterSet) return;
            if (useSeqStore.getState().marchLive) {
              imposterSet({ opacity: 0 });
            } else {
              const apparentVh = (SEQ_APPARENT_K / dist) * 100;
              imposterSet({
                scale: apparentVh / SEQ.LITE_START_VH,
                opacity: fade,
              });
            }
          };

          // ── compose(): the single SCRUB evaluator — every visual below is
          // a pure function of p, so the traverse/approach reverse cleanly
          // (reverse-entry territory past TRIGGER_P). Never runs while the
          // one-shot owns the frame, nor while parked past the end after a
          // played plunge (mainST's parked-past-end guard). ─────────────────
          let p = 0;
          const compose = () => {
            const s = useSeqStore.getState();

            const pan = panAt(p, panEase);
            const dist = distAt(p, panEase, plungeEase);
            const holeFade = holeFadeAt(p);
            const trackT = seqSmooth(p, SEQ.SETTLE_END, SEQ.TRACK_END);
            const holeYFrac = SEQ.Y_FRAC_ENTER * (1 - trackT);
            const starAlpha =
              SEQ.STAR_HI -
              (SEQ.STAR_HI - SEQ.STAR_LO) *
                seqSmooth(p, SEQ.HOLD1_END, SEQ.APPROACH_END);

            useSeqStore.setState({
              p,
              pan01: pan,
              dist,
              holeYFrac,
              holeFade,
              starAlpha,
            });

            // The horizontal DOM track: panel 05 rides off-left as the
            // foreground plate — TRACK_RATE_FG × the world's screen-space
            // pan (world 1.0× via the camera, far dust slower per-mote).
            trackX(-SEQ.TRACK_RATE_FG * SEQ_PAN_FRAC * vw * pan);
            // Panel 05 opacity = entry ramp × exit ramp. It MATERIALIZES in
            // place across PANEL_ENTER during SETTLE (the spine's 02→03
            // crossfade grammar — owner 2026-08-09: the 04→05 handoff must
            // never read as a scroll, and with the one-viewport overlap the
            // frame it materializes into is pinned and motionless; symmetric
            // on reverse, so up-scrubbing out of the passage fades it back
            // out in place), then tracks off-left and fades across
            // PANEL_FADE. The y write is
            // StagePanel's exact (1-opacity)*16px entry offset.
            const panelA =
              seqSmooth(p, SEQ.PANEL_ENTER_START, SEQ.PANEL_ENTER_END) *
              (1 - seqSmooth(p, SEQ.PANEL_FADE_START, SEQ.PANEL_FADE_END));
            panelAlpha(panelA);
            panelY((1 - panelA) * 16);
            setPanelInteractive(panelA > PANEL_LIT_MIN);

            applyHoleVisuals(dist, holeFade);

            // Tunnel lifecycle bands (graft 6): create parked during SETTLE
            // (TUNNEL_CREATE_P 0.02 — the forward flow never scrubs past
            // ~0.10, so this early park is what keeps the one-shot's first
            // hot frame hitch-free); warm renders (alpha 0) through late
            // APPROACH on reverse entry; park on reverse.
            if (s.armed && p >= SEQ.TUNNEL_CREATE_P) ensureTunnel();
            const wantRaf =
              !!tunnel && (s.tunnelAlpha > 0.001 || p >= SEQ.TUNNEL_WARM_P);
            if (wantRaf) startRaf();
            else if (p < SEQ.TUNNEL_PARK_P) stopRaf();

            applyDprCap(p);
          };

          // ══════════════════════════════════════════════════════════════════
          // THE ONE-SHOT PLUNGE (owner 2026-08-07: one scroll triggers
          // everything, it plays itself accelerating, arrival is a zoom-in;
          // owner 2026-08-09: it fires on the FIRST forward scroll after
          // SETTLE and now owns the traverse + light-speed + slow entry).
          // Deliberate owner-requested exception to the no-hijack rule —
          // input locked ONLY for the ~6.9s timeline, always skippable.
          // ══════════════════════════════════════════════════════════════════
          let plungeActive = false;
          let plungePlayed = false;
          let covertJumped = false;
          let plungeTl: gsap.core.Timeline | null = null;
          let anchorY = 0;
          let reverseAccum = 0;
          let touchY: number | null = null;
          let releaseSnapHold: (() => void) | null = null;
          let snapHoldTimer = 0;

          // Under total black: jump the page to the divario instantly — the
          // user never sees a downward scroll; when the black opens we ARE
          // there. Idempotent (the skip path may call it first).
          const covertJump = () => {
            if (covertJumped) return;
            covertJumped = true;
            const lenis = getLenis();
            if (lenis) {
              lenis.scrollTo(problemTopDoc, { immediate: true, force: true });
            } else {
              window.scrollTo(0, problemTopDoc);
            }
            anchorY = problemTopDoc; // drift guard re-bases past the jump
          };

          // Terminal state — reached by BOTH the natural onComplete and the
          // skip path (Esc / reverse gesture / un-consumed drift). Never
          // traps: it always unlocks input.
          const finishPlunge = () => {
            if (!plungeActive) return;
            plungeActive = false;
            plungePlayed = true;
            plungeTl?.kill();
            plungeTl = null;
            covertJump();
            useSeqStore.setState({
              plungeT: 0,
              dist: SEQ.DIST_FLOOR,
              holeFade: 0,
              tunnelAlpha: 0,
              warp: SEQ.WARP_MIN,
              pan01: 0,
            });
            veilSet({ opacity: 0, scale: 2.3 });
            if (pulseAlpha) pulseAlpha(0);
            if (imposterSet) imposterSet({ opacity: 0 });
            if (emergeSet) emergeSet({ x: 0, y: 0, scale: 1 });
            // Panel 05's end pose (the traverse's own terminal state): the
            // shot fires at p ≈ 0.10 with the panel fully LIT, so an early
            // skip (Esc / reverse wheel / drift before segment-t ≈ 0.43)
            // would otherwise park the offscreen panel pointer-interactive
            // and in the a11y tree behind the arrived divario — the
            // parked-past-end guard blocks the compose tick that used to
            // repair it, and a Shift-Tab from the divario would focus the
            // stale CTA and let native focus-scroll yank the page back up.
            trackX(-SEQ.TRACK_RATE_FG * SEQ_PAN_FRAC * vw);
            panelAlpha(0);
            setPanelInteractive(false);
            stopRaf();
            setCap(false);
            removePlungeListeners();
            getLenis()?.start();
            window.clearTimeout(snapHoldTimer);
            snapHoldTimer = window.setTimeout(() => {
              releaseSnapHold?.();
              releaseSnapHold = null;
            }, 1200);
          };
          const skipPlunge = () => finishPlunge();

          // Locked-input handlers: consume the gesture; a strong reverse
          // intent (cumulative ≥ SKIP_REVERSE_PX) or Esc skips to the end.
          const onPlungeWheel = (e: WheelEvent) => {
            if (!plungeActive) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const s = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1;
            const d = e.deltaY * s;
            if (d < 0) {
              reverseAccum -= d;
              if (reverseAccum >= SEQ.SKIP_REVERSE_PX) skipPlunge();
            } else {
              reverseAccum = 0;
            }
          };
          const onPlungeTouchStart = (e: TouchEvent) => {
            touchY = e.touches[0]?.clientY ?? null;
          };
          const onPlungeTouchMove = (e: TouchEvent) => {
            if (!plungeActive || touchY == null) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const y = e.touches[0]?.clientY ?? touchY;
            const d = (touchY - y) * 2.2;
            touchY = y;
            if (d < 0) {
              reverseAccum -= d;
              if (reverseAccum >= SEQ.SKIP_REVERSE_PX) skipPlunge();
            } else {
              reverseAccum = 0;
            }
          };
          const onPlungeKey = (e: KeyboardEvent) => {
            if (plungeActive && e.key === "Escape") skipPlunge();
          };
          const addPlungeListeners = () => {
            window.addEventListener("wheel", onPlungeWheel, {
              passive: false,
              capture: true,
            });
            window.addEventListener("touchstart", onPlungeTouchStart, {
              passive: true,
            });
            window.addEventListener("touchmove", onPlungeTouchMove, {
              passive: false,
              capture: true,
            });
            window.addEventListener("keydown", onPlungeKey, true);
          };
          const removePlungeListeners = () => {
            window.removeEventListener("wheel", onPlungeWheel, {
              capture: true,
            });
            window.removeEventListener("touchstart", onPlungeTouchStart);
            window.removeEventListener("touchmove", onPlungeTouchMove, {
              capture: true,
            });
            window.removeEventListener("keydown", onPlungeKey, true);
          };

          const startPlunge = () => {
            if (plungeActive || plungePlayed) return;
            plungeActive = true;
            covertJumped = false;
            reverseAccum = 0;
            window.clearTimeout(snapHoldTimer);
            releaseSnapHold ??= suspendSnap();
            getLenis()?.stop();
            // The shot launches from wherever the trigger tick found the
            // page (p ≈ 0.10 — the sticky stage holds the frame regardless):
            // NO scrollTo alignment here. Teleporting to mainST.end would be
            // a ~270vh jump and SignatureLine's damped camera-Y chase would
            // visibly slide the whole world down through the traverse. The
            // current scrollY is simply the drift-guard base.
            anchorY = window.scrollY;
            addPlungeListeners();
            ensureTunnel();
            startRaf(); // streaks must be alive when their alpha rises
            setCap(true); // the brief fullscreen-march burst (graft 4 pair)

            // Launch state, captured ONCE: the traverse tweens FROM the
            // exact scrubbed pose at the trigger tick (pan ≈ 0.02-drift,
            // dist ≈ 16, fade ≈ lensing ramp start, yFrac ≈ −0.08).
            const s0 = useSeqStore.getState();
            const pan0 = s0.pan01;
            const dist0 = s0.dist;
            const fade0 = s0.holeFade;
            const y0 = s0.holeYFrac;

            // Segment proxies — each tween's ease bakes the acceleration
            // into .t, so the apply functions stay pure in t.
            const traverse = { t: 0 };
            const lightspeed = { t: 0 };
            const enter = { t: 0 };
            const speed = { t: 0 };
            const emerge = { t: 0 };
            const tunnelNull = () => useSeqStore.getState().tunnelNull;

            const tl = gsap.timeline({
              paused: true,
              onComplete: finishPlunge,
            });
            plungeTl = tl;

            // Every tick: publish overall progress (island center-lock ramp)
            // + the un-consumed-drift guard (keyboard scroll etc. → skip,
            // never fight the user). While the shot is YOUNG (tl < 0.08,
            // the first ~0.55s) the guard is a momentum-tail absorber
            // instead: the fire tick can leave a residual Lenis momentum/
            // settle tail that lands right after startPlunge captured
            // anchorY, and skipping there would kill the shot the user just
            // earned — so drift RE-BASES the anchor. Past the grace, drift
            // means the USER moved the page → skip, exactly as before. (The
            // covert jump later re-bases anchorY itself.)
            tl.eventCallback("onUpdate", () => {
              const prog = tl.progress();
              useSeqStore.setState({ plungeT: prog });
              if (Math.abs(window.scrollY - anchorY) > 12) {
                if (prog < 0.08) anchorY = window.scrollY;
                else skipPlunge();
              }
            });

            // T — TRAVERSE: the horizontal passage plays itself. Pan
            // completes launch→1 (world + DOM track in the scrub's exact
            // parallax grammar), the hole rides dist launch→DIST_MID fading
            // in lensing-first to full, yFrac eases to 0, panel 05 tracks
            // off-left. Warp stays WARP_MIN, tunnelAlpha 0, veil untouched.
            tl.to(traverse, {
              t: 1,
              duration: SEQ.PLUNGE_TRAVERSE_S,
              ease: "power2.inOut",
              onUpdate: () => {
                const t = traverse.t;
                const pan = pan0 + (1 - pan0) * t;
                const dist = dist0 * Math.pow(SEQ.DIST_MID / dist0, t);
                const holeFade = Math.max(fade0, seqRamp(t, 0, 0.7));
                useSeqStore.setState({
                  pan01: pan,
                  dist,
                  holeFade,
                  holeYFrac: y0 * (1 - t),
                  starAlpha: SEQ.STAR_HI, // stars stay HI until the warp
                });
                trackX(-SEQ.TRACK_RATE_FG * SEQ_PAN_FRAC * vw * pan);
                // Opacity only — the exit verb is the horizontal track-off;
                // panelY is compose()'s (entry ramp = 1 at fire, so y = 0).
                const panelA = 1 - seqSmooth(t, 0.25, 0.6);
                panelAlpha(panelA);
                setPanelInteractive(panelA > PANEL_LIT_MIN);
                applyHoleVisuals(dist, holeFade);
              },
            });

            // L — LIGHT-SPEED: the jump. Warp MIN→MAX, streaks rise, stars
            // fall — and THE HOLE REMAINS FULLY VISIBLE, DEAD-CENTER,
            // THROUGH THE WHOLE WARP (the core owner note): dist
            // DIST_MID→DIST_LS_END is a barely-perceptible approach
            // (17.9→21.4vh) so it reads as an enormous, distant body.
            // holeFade stays 1; veil stays 0.
            tl.to(lightspeed, {
              t: 1,
              duration: SEQ.PLUNGE_LIGHTSPEED_S,
              ease: "power2.in",
              onUpdate: () => {
                const t = lightspeed.t;
                const dist =
                  SEQ.DIST_MID * Math.pow(SEQ.DIST_LS_END / SEQ.DIST_MID, t);
                useSeqStore.setState({
                  dist,
                  warp: SEQ.WARP_MIN + (SEQ.WARP_MAX - SEQ.WARP_MIN) * t,
                  tunnelAlpha: tunnelNull() ? 0 : 0.85 * t,
                  starAlpha:
                    SEQ.STAR_HI + (SEQ.STAR_LO - SEQ.STAR_HI) * t,
                });
                applyHoleVisuals(dist, 1); // NO fade — full presence
              },
            });

            // E — ENTER: the slow final approach — dist DIST_LS_END→FLOOR,
            // apparent size through ~113vh. The #000 veil (the march's own
            // core black) completes coverage ONLY in the tail (t 0.55–1):
            // by dist ≈2 the hole's own black core exceeds ~107vh, so the
            // completion is invisible (the color-seam trick, unchanged).
            // Warp holds WARP_MAX, tunnelAlpha holds.
            tl.to(enter, {
              t: 1,
              duration: SEQ.PLUNGE_ENTER_S,
              ease: "power1.in",
              onUpdate: () => {
                const t = enter.t;
                const dist =
                  SEQ.DIST_LS_END *
                  Math.pow(SEQ.DIST_FLOOR / SEQ.DIST_LS_END, t);
                useSeqStore.setState({ dist });
                const v = seqRamp(t, 0.55, 1);
                veilSet({ opacity: v, scale: 0.5 + 1.8 * v });
                applyHoleVisuals(dist, 1); // NO fade — full presence
              },
            });

            // The frame is now fully black: hide the march invisibly (the
            // viewer must never SEE it disappear — it swallowed them),
            // release the island DPR cap (burst over), and make the covert
            // jump to the divario under cover. ORDERING REQUIRED: this call
            // runs while plungeActive is still TRUE, so the ScrollTrigger
            // tick the jump causes (p → 1) can never run compose() and
            // repaint scrub state over the black frame.
            tl.call(() => {
              useSeqStore.setState({ holeFade: 0 });
              if (imposterSet) imposterSet({ opacity: 0 });
              setCap(false);
              covertJump();
            });

            // S — PURE SPEED: inside the black, light falling toward the
            // center ahead. Warp holds WARP_MAX, streaks reach full; the
            // camera pan silently unwinds beneath the covered frame.
            tl.to(speed, {
              t: 1,
              duration: SEQ.PLUNGE_SPEED_S,
              ease: "power1.in",
              onUpdate: () => {
                const t = speed.t;
                const e = t * t * (3 - 2 * t);
                useSeqStore.setState({
                  warp: SEQ.WARP_MAX,
                  tunnelAlpha: tunnelNull() ? 0 : 0.85 + 0.15 * t,
                  pan01: 1 - e,
                });
                if (pulseAlpha) {
                  pulseAlpha(PULSE_PEAK * Math.sin(Math.PI * t));
                }
              },
            });

            // M — EMERGENCE: the black opens, the streaks die, and the
            // divario lands as a ZOOM-IN from the vanishing point
            // (transform-only; doc-position cached on refresh, viewport
            // position derived from scrollY — no rect reads here).
            tl.to(emerge, {
              t: 1,
              duration: SEQ.PLUNGE_EMERGE_S,
              ease: "power2.out",
              onUpdate: () => {
                const t = emerge.t;
                useSeqStore.setState({
                  warp: SEQ.WARP_MAX + (SEQ.WARP_EMERGE - SEQ.WARP_MAX) * t,
                  tunnelAlpha: tunnelNull() ? 0 : 1 - t,
                });
                veilSet({ opacity: 1 - t, scale: 2.3 });
                if (pulseAlpha) pulseAlpha(0);
                if (emergeSet) {
                  const hold = 1 - t;
                  const dx = (vw / 2 - emergeCx) * SEQ.ZOOM_PULL * hold;
                  const dy =
                    (ih / 2 - (emergeDocCy - window.scrollY)) *
                    SEQ.ZOOM_PULL *
                    hold;
                  emergeSet({
                    x: dx,
                    y: dy,
                    scale:
                      SEQ.ZOOM_SCALE_START +
                      (1 - SEQ.ZOOM_SCALE_START) * t,
                  });
                }
              },
            });

            tl.play();
          };

          // ── Main scrub — ONE trigger, CSS sticky does the pinning. Also
          // the one-shot's arm/trigger/re-arm clock. Its range is measured
          // against THIS root, so the overlap margin shifts it bodily and
          // changes none of the fractions: start "2.5% top" is 9.5vh into the
          // 380vh container (now 9.5vh AFTER the spine's pin end, i.e. inside
          // the overlap, with this stage already pinned) and "bottom bottom"
          // is 280vh in — 270.5vh of scrub. Consequence of the overlap worth
          // knowing: the one-shot's TRIGGER_P (0.10 ≈ 36.5vh past the pin end)
          // now fires while the spine's stage is still ~63vh from gone, so it
          // freezes there for the locked shot — empty, transparent, and behind
          // this section's paint, then covered outright by the veil/tunnel.
          // `primed` gates the trigger logic until the prime block below has
          // latched the real landing progress (create/refresh can fire
          // onUpdate synchronously — an SPA landing past the trigger must
          // never fire the plunge). ────────────────────────────────────────
          let primed = false;
          const mainST = ScrollTrigger.create({
            trigger: root,
            start: "2.5% top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const prev = p;
              p = self.progress;
              // Parked-past-end guard: the covert jump moves this trigger's
              // progress from ~0.10 to 1. On the SKIP path that scroll event
              // lands asynchronously AFTER finishPlunge set plungeActive =
              // false, and an unguarded compose(p = 1) would rewrite
              // pan01 = 1 / dist = 2.6 / holeFade = 1 — the hole and the
              // panned world reappearing behind the arrived divario. Reverse
              // entry still works: the first genuine up-scroll tick has
              // p < 0.9995 (and plungePlayed re-arms below REARM_P).
              if (!plungeActive && !(plungePlayed && p >= 0.9995)) compose();
              if (!primed) return;
              // Re-arm hysteresis: only back inside SETTLE (p < REARM_P,
              // 0.05 — BELOW the trigger, so the forward crossing prev <
              // TRIGGER ≤ p is always reproducible) may it fire again.
              if (plungePlayed && p < SEQ.REARM_P) plungePlayed = false;
              // Fire on a genuine forward CROSSING of the trigger (never on
              // SPA-landing primes — `prev` starts at the primed progress),
              // and only when the tick lands inside the launch window
              // (≤ FIRE_MAX_P — wide enough that a fast fling's one-tick
              // momentum jump still fires; startPlunge's captured launch
              // state adapts the TRAVERSE to the deeper pose): a single-tick
              // native jump — End key, scrollbar click-jump, p ≈ 1 — must
              // not launch the 6.9s locked shot off-stage (the onLeave
              // close below tidies the map if the jump overshoots the
              // container).
              if (
                !plungeActive &&
                !plungePlayed &&
                self.direction === 1 &&
                prev < SEQ.TRIGGER_P &&
                p >= SEQ.TRIGGER_P &&
                p <= SEQ.FIRE_MAX_P
              ) {
                startPlunge();
              }
            },
            onLeave: () => {
              // Forward exit past the container end with NO shot in flight:
              // a reverse-entry visitor who turned around above REARM_P (the
              // trigger never re-armed) scrubs the beat map forward and
              // walks out the bottom — without this close the near-hold
              // state (holeFade 1 / dist ≈ 2.6 / pan01 1) would strand: the
              // camera-locked hole would ride the viewport over the divario
              // and every section below until bandST disposes the island,
              // the world would stay panned 0.55× view-width, and the DPR
              // cap would stay latched. Mirrors finishPlunge's terminal
              // store write (idempotent with the skip path's async past-end
              // tick); the one-frame close lands exactly on the section
              // boundary, with the divario already entering the frame. The
              // plungeActive guard keeps the mid-shot covert jump (which
              // crosses this same edge) in the timeline's hands, and the
              // plungePlayed latch arms the parked-past-end guard against
              // stray refresh ticks at p = 1 (re-arms below REARM_P).
              if (plungeActive) return;
              plungePlayed = true;
              useSeqStore.setState({
                plungeT: 0,
                dist: SEQ.DIST_FLOOR,
                holeFade: 0,
                tunnelAlpha: 0,
                warp: SEQ.WARP_MIN,
                pan01: 0,
              });
              if (imposterSet) imposterSet({ opacity: 0 });
              stopRaf();
              setCap(false);
            },
          });

          // ── Approach/leave band: arms the island build one viewport early
          // (the compileAsync warm happens during plain scrolling — the
          // SpineExitGate locked beat that used to cover this window was
          // removed 2026-08-09; see the island's late-resolve seeding) and
          // hard-disposes tunnel + build ~250vh past the passage or back
          // above the spine end — init on approach, destroy on leave ───────
          const bandST = ScrollTrigger.create({
            trigger: root,
            start: "top bottom",
            end: () => `bottom+=${Math.round(ih * 2.5)} top`,
            onToggle: (self) => {
              useSeqStore.setState({ armed: self.isActive });
              if (!self.isActive) disposeTunnel();
            },
          });

          // Prime against the current scroll position (SPA nav can land
          // mid-page) and once webfonts settle (the display serif changes
          // panel 05's box — keep the house grammar).
          cache();
          p = mainST.progress;
          primed = true;
          // Prime the visuals — EXCEPT when the fresh closure lands parked
          // past the end (language-toggle remount at the divario, scroll-
          // restored landing): plungePlayed starts false here, so the
          // parked-past-end guard can't block this pass, and an
          // unconditional compose(p ≈ 1) would repaint the near-hold hole +
          // pan + DPR cap behind the arrived divario. Latch plungePlayed
          // (the fonts-ready refresh re-ticks at p = 1) and park panel 05's
          // end pose instead; reverse entry composes normally from its
          // first genuine up-scroll tick.
          if (p >= 0.9995) {
            plungePlayed = true;
            trackX(-SEQ.TRACK_RATE_FG * SEQ_PAN_FRAC * vw);
            panelAlpha(0);
            setPanelInteractive(false);
          } else {
            compose();
          }
          let fontsCancelled = false;
          document.fonts?.ready
            .then(() => {
              if (!fontsCancelled) ScrollTrigger.refresh();
            })
            .catch(() => {});

          return () => {
            fontsCancelled = true;
            // Mid-plunge teardown (language toggle etc.): unlock everything.
            if (plungeActive) {
              plungeActive = false;
              plungeTl?.kill();
              plungeTl = null;
              removePlungeListeners();
              getLenis()?.start();
            }
            stopRaf();
            mainST.kill();
            bandST.kill();
            ScrollTrigger.removeEventListener("refreshInit", size);
            ScrollTrigger.removeEventListener("refreshInit", clearEmerge);
            ScrollTrigger.removeEventListener("refresh", cache);
            stage.removeEventListener("focusin", onStageFocusIn);
            disposeTunnel();
            setCap(false);
            window.clearTimeout(snapHoldTimer);
            releaseSnapHold?.();
            releaseSnapHold = null;
            if (emergeEl) gsap.set(emergeEl, { clearProps: "transform" });
            // Panel 05 is REAL content on the static/lite layouts this node
            // may flip into — clear every armed-path inline pose (opacity +
            // the compose() entry-Y transform).
            gsap.set(track, { clearProps: "transform" });
            gsap.set(panel, { clearProps: "opacity,transform" });
            panel.style.pointerEvents = "";
            (panel as HTMLElement & { inert: boolean }).inert = false;
            panel.removeAttribute("aria-hidden");
            resetSeqStore();
            root.removeAttribute("data-on");
            root.style.height = "";
            // The overlap margin belongs to the armed desktop path ONLY (see
            // THE PINNED HANDOFF above): the layouts this node flips into on
            // teardown — lite, reduced-motion, static — must go back to normal
            // document flow.
            root.style.marginTop = "";
          };
        },
      );
    },
    // EN↔IT swaps panel 05's copy in place → widths change → revert +
    // recreate everything against the fresh layout (credibility lineage).
    { scope: rootRef, dependencies: [language], revertOnUpdate: true },
  );

  return (
    <section ref={rootRef} id="singularity-passage" className="seq-root relative">
      {/* ── The stage. Default (SSR / no-JS / reduced-motion / lite): a
          normal vertical section — panel 05 fully readable, CTAs live.
          data-on="seq": CSS-sticky viewport, the track goes horizontal. ── */}
      <div className="seq-stage">
        {/* The horizontal DOM track — panel 05 is its first (and only)
            panel: the foreground plate of the lateral tracking shot. */}
        <div data-seq-track className="seq-track">
          <div className="container-px w-full">
            <div data-seq-panel className="seq-panel max-w-[42rem]">
              <p className="eyebrow inline-flex items-center gap-2 text-ink/80 mb-4">
                <span aria-hidden="true" className="status-dot" />
                <span>{HANDOVER_STAGE.eyebrow[language]}</span>
              </p>
              {/* Type scale = the spine StagePanel's GROUPED-LEAD scale (what
                  stage 04 actually renders at), NOT the single-block scale —
                  owner 2026-08-09: section 05 must read as a sibling of
                  stages 02–04 in the same seat, so its title matches 04's
                  visual size exactly. */}
              <h2 className="font-display leading-[0.98] text-ink mb-5 text-balance text-[clamp(2rem,3.6vw,3.25rem)] tracking-[-0.026em]">
                {HANDOVER_STAGE.title[language]}
              </h2>
              <p className="text-base sm:text-lg text-foreground/80 leading-[1.55] max-w-[40rem]">
                {HANDOVER_STAGE.body[language]}
              </p>
              {HANDOVER_STAGE.extras[language]}
              <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                <Magnetic>
                  <Link href={START_HREF} className="block">
                    <Button variant="hero" size="xl" className="group">
                      {copy.ctaPrimary}
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </Magnetic>
                <Link href="#work" className="block">
                  <Button variant="heroOutline" size="xl">
                    {copy.seeSelectedWork}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop CSS hole imposter — stands in for the raymarch on the
            non-WebGPU / fallback-GL tier (suppressed while marchLive).
            Decorative. */}
        <div
          aria-hidden="true"
          className="seq-decor absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div data-seq-desk-imposter className="seq-imposter" />
        </div>
      </div>

      {/* Static fallback spacer: reduced-motion / no-JS — a quiet deep-navy
          fade-through between section 05 above and the divario. Decorative. */}
      <div aria-hidden="true" className="seq-static" />

      {/* ── Mobile/coarse runway (cheap 1/d beat below the vertical 05).
          Decorative throughout. ────────────────────────────────────────── */}
      <div data-seq-lite-run aria-hidden="true" className="seq-lite-run">
        <div className="seq-lite sticky top-0 h-screen overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div data-seq-imposter className="seq-imposter" />
          </div>
          <div data-seq-cover className="seq-cover" />
        </div>
      </div>

      {/* ── Fixed overlays (desktop sequence only; below the z-50 navbar).
          Fixed, not in-stage: they must hold the frame THROUGH the covert
          jump so the emergence plays over the arrived divario. All
          decorative. ─────────────────────────────────────────────────── */}
      <div data-seq-veil aria-hidden="true" className="seq-veil" />
      {ENABLE_HORIZON_PULSE ? (
        <div data-seq-pulse aria-hidden="true" className="seq-pulse" />
      ) : null}
      <div data-seq-tunnel-host aria-hidden="true" className="seq-tunnel-host" />

      <style>{`
        /* ── Default layout (SSR / no-JS / reduced-motion / pre-arm): panel
           05 is a normal, fully readable vertical section. ─────────────── */
        .seq-track {
          display: flex;
          align-items: center;
          min-height: 80svh;
          padding-block: 5rem;
        }
        .seq-decor { display: none; }
        .seq-static {
          height: 60vh;
          background: linear-gradient(
            180deg,
            transparent,
            #060b16 38%,
            #04070f 55%,
            transparent
          );
        }
        .seq-lite-run { display: none; position: relative; }
        .seq-root[data-on] .seq-static { display: none; }
        .seq-root[data-on="lite"] .seq-lite-run { display: block; }

        /* ── Full desktop sequence ([data-on="seq"], JS-armed only): sticky
           stage, absolute horizontal track, decor visible. ─────────────── */
        .seq-root[data-on="seq"] .seq-stage {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
        }
        .seq-root[data-on="seq"] .seq-track {
          position: absolute;
          inset: 0;
          min-height: 0;
          padding-block: 0;
          padding-bottom: 3rem;
          will-change: transform;
          pointer-events: none;
        }
        @media (min-width: 640px) {
          .seq-root[data-on="seq"] .seq-track { padding-bottom: 4rem; }
        }
        .seq-root[data-on="seq"] .seq-panel {
          /* Interactivity is JS-managed (setPanelInteractive): clickable
             while on screen, inert once tracked off + faded. Transform is
             the compose() entry-Y ((1-opacity)*16px, spine grammar). */
          pointer-events: auto;
          will-change: opacity, transform;
        }
        .seq-root[data-on="seq"] .seq-decor { display: flex; }

        /* The CSS hole imposter — #000 core, faint cyan #3BE1FF ring over a
           whisper of blue #2A7FFF (brand palette, no violet). Base diameter
           ${SEQ.LITE_START_VH}vh; scaled along the 1/d curve. */
        .seq-imposter {
          width: ${SEQ.LITE_START_VH}vh;
          height: ${SEQ.LITE_START_VH}vh;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            #000 52%,
            rgba(0, 0, 0, 0.92) 60%,
            rgba(59, 225, 255, 0.30) 67%,
            rgba(42, 127, 255, 0.10) 76%,
            transparent 88%
          );
          will-change: transform, opacity;
          opacity: 0;
        }
        .seq-cover {
          position: absolute;
          inset: 0;
          background: hsl(var(--bg));
          opacity: 0;
        }

        /* Fixed overlay stack: veil (38) < pulse (39) < tunnel (40) < the
           fixed navbar (z-50). All decorative, never interactive. The
           tunnel paints OVER the veil: once the veil is closed the streaks
           live INSIDE the black. */
        .seq-veil, .seq-pulse, .seq-tunnel-host {
          display: none;
          position: fixed;
          inset: 0;
          pointer-events: none;
        }
        .seq-root[data-on="seq"] .seq-veil,
        .seq-root[data-on="seq"] .seq-pulse,
        .seq-root[data-on="seq"] .seq-tunnel-host { display: block; }
        .seq-veil {
          z-index: 38;
          opacity: 0;
          /* Center-black: the same #000 the march's uRampCol3 painted — the
             coverage completion is invisible (the color seam). */
          background: radial-gradient(circle at 50% 50%, #000 62%, transparent 100%);
          transform: scale(0.5);
          will-change: transform, opacity;
        }
        .seq-pulse {
          z-index: 39;
          opacity: 0;
          background: #EAF6FF;
          will-change: opacity;
        }
        .seq-tunnel-host { z-index: 40; }
        .seq-tunnel-host canvas {
          position: absolute;
          top: 0;
          left: 0;
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
