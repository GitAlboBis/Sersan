"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/components/language-provider";
import {
  createPreloaderTunnel,
  type PreloaderTunnel,
} from "@/components/fx/preloader-tunnel";
import { HANDOVER_ECHO } from "@/components/sections/cinematic-system-scroll";
import {
  SEQ,
  SEQ_APPARENT_K,
  seqRamp,
  seqSmooth,
  useSeqStore,
  resetSeqStore,
} from "@/webgl/store/seqStore";
import { useTierStore } from "@/webgl/store/tierStore";

/**
 * SingularityPassage — "THE LONG TAKE": one unbroken 460vh camera shot from
 * the spine's beat 05 (the handover line, echoed here frame-left) into the
 * ProblemSection's "demo-to-production gap". Replaces the credibility reel
 * in the home flow and claims its `data-line-anchor="credibility"` slot
 * (routeCurves.ts stays untouched — the waypoint keeps resolving).
 *
 * THE SHOT (every value a pure function of scrub progress p — reversible):
 *   SETTLE   p 0–0.10   echo line rests frame-left; camera pre-drifts +x 2%.
 *   TRACK    p 0.10–0.38 camera pans right (seqStore.pan01 → SignatureLine's
 *                        seqPan term); the world slides left; a SECOND
 *                        raymarched hole enters frame-right at dist 16→12
 *                        (13.4→17.9vh), fading in LENSING-FIRST (uFade 0→1
 *                        while still small: you notice the warp before the
 *                        hole) and riding a −0.08 yFrac high-composition
 *                        entrance to dead-center. Echo line translates
 *                        −115vw (1.15× world rate, foreground plate).
 *                        Tunnel instance created PARKED at p 0.30.
 *   HOLD 1   p 0.38–0.46 rest at dist 12 — only the disc shimmers.
 *   APPROACH p 0.46–0.72 dist 12→2.6 exponential in the plungeEase-eased
 *                        sub-progress (apparent size = 2.1445/dist — the
 *                        1/distance law, growth accelerating), with the d≈6
 *                        micro-hold plateau baked into the ease; star alpha
 *                        0.9→0.4. Tunnel warm renders (alpha 0) from p 0.60.
 *   IGNITION p 0.72–0.80 dist 2.6→1.9 (hard floor); tunnel alpha 0→1 over
 *                        0.72–0.80 OVERLAPPING uFade 1→0 over 0.74–0.80 —
 *                        streaks are born around the still-black core; at
 *                        0.80 the march is invisible AND its group hides
 *                        (replace, never stack — the crossfade mandate).
 *                        DPR force-capped ≤1.5 from p 0.70 (tierStore).
 *   SPEED    p 0.80–0.90 wordless breath: timeCoef → 100, zoom streaks at
 *                        full, the black-core veil closes UNDER the tunnel;
 *                        the camera pan silently unwinds 1→0 beneath it.
 *   EMERGENCE p 0.90–1 + seam: the sticky releases; a second scrubbed
 *                        trigger (sequence p 0.92 → divario top +40vh)
 *                        scrubs timeCoef 100→8, tunnel alpha 1→0, and the
 *                        divario heading's [data-emerge] wrapper from
 *                        scale(0.96)+6%-toward-vanishing-point → identity —
 *                        the heading condenses out of the dying streaks
 *                        while ProblemSection's existing pre-compose hooks
 *                        (positive ioRootMargin) run its cascade behind the
 *                        overlay.
 *
 * HOUSE SCROLL GRAMMAR (credibility-strip lineage): CSS sticky stage +
 * explicit container height (NO ScrollTrigger pin — a pin-spacer breaks
 * every [data-line-anchor] measurement), scrubbed triggers only, CustomEase,
 * height re-asserted on refreshInit, rect caches refreshed only on
 * ScrollTrigger "refresh" (never in a frame loop), fonts.ready refresh,
 * useGSAP dependencies:[language] with revertOnUpdate. No snap station is
 * registered here; ProblemSection's own data-snap settles the arrival.
 *
 * FALLBACK MATRIX:
 *   desktop + fine + motion-ok            → the full sequence above; the
 *     raymarch itself additionally needs the WebGL island (tier "full" +
 *     WebGPU flag) — when it never goes live (seqStore.marchLive false) a
 *     pure-CSS hole imposter rides the SAME 1/d curve in its place, and the
 *     REAL tunnel plunge still runs (raw WebGL1, works everywhere).
 *   createPreloaderTunnel returns null    → graft 5: the closing veil rises
 *     earlier and the march's uFade tail lengthens — a dark plunge, never a
 *     dead cut.
 *   coarse pointer / <1024px + motion-ok  → ~180vh beat: the CSS imposter
 *     scales along the same precomputed 1/d curve (transform/opacity only)
 *     then crossfades to navy — the physics rule survives on a div.
 *   prefers-reduced-motion / no JS        → a static 60vh deep-navy gradient
 *     spacer (simple fade-through); no camera term, no tunnel, no transforms.
 * Every tier ends byte-identical on the divario heading; this section is
 * aria-hidden decorative throughout (the echo is a repeat of spine copy the
 * reader just passed — real content lives in the spine + ProblemSection).
 */

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);
  // CustomEase.create is idempotent (same id → overwrite), safe under HMR.
  // The TRACK pan reuses the credibility reel's horizontal-scrub family.
  CustomEase.create("seqPanEase", "0.25, 0, 0.75, 1");
  // plungeEase: the APPROACH sub-progress u in d = 12·(2.6/12)^u — eases off
  // the HOLD-1 rest, plateaus FLAT at u = ln(12/6)/ln(12/2.6) ≈ 0.4532 (the
  // d≈6 micro-hold: hold… hold…), then steepens power2.in into the bloom so
  // the growth accelerates in scroll-space exactly as it does physically.
  CustomEase.create(
    "seqPlungeEase",
    "M0,0 C0.15,0.08 0.32,0.4532 0.4423,0.4532 C0.49,0.4532 0.51,0.4532 0.5577,0.4532 C0.78,0.4532 0.92,0.62 1,1",
  );
}

const DESKTOP_MQ = "(min-width: 1024px)";
const FINE_MQ = "(pointer: fine)";
const MOTION_OK_MQ = "(prefers-reduced-motion: no-preference)";

// ── Owner tuning knobs (one-line tuning at review) ──────────────────────────
/** Echo line lateral rate vs the world pan (foreground plate). */
const ECHO_RATE_VW = 1.15;
/** [data-emerge] pull toward the vanishing point at seam start (fraction of
 * the heading's distance to viewport center). */
const EMERGE_PULL = 0.06;
/** [data-emerge] scale at seam start. */
const EMERGE_SCALE = 0.96;
/**
 * Graft 7 — owner-gated horizon pulse (ship dark by default): a restrained
 * #EAF6FF luminance veil BELOW the tunnel canvas so the additive cyan/white
 * streaks burn through it at peak warp. Flip to true for the "sorprendimi"
 * review; one-commit removal if vetoed.
 */
const ENABLE_HORIZON_PULSE = false;
/** Horizon-pulse peak opacity (capped per the graft: 0.15–0.2). */
const PULSE_PEAK = 0.18;

// ── Pure beat-map evaluators (p → value; see seqStore.SEQ for the map) ──────

function panAt(p: number, panEase: (t: number) => number): number {
  let pan: number;
  if (p <= 0) pan = 0;
  else if (p < SEQ.SETTLE_END) {
    // SETTLE pre-drift: 2% of the pan so no frame is static.
    pan = 0.02 * (p / SEQ.SETTLE_END);
  } else if (p < SEQ.TRACK_END) {
    pan =
      0.02 +
      0.98 * panEase((p - SEQ.SETTLE_END) / (SEQ.TRACK_END - SEQ.SETTLE_END));
  } else {
    pan = 1;
  }
  // Hidden unwind under the tunnel + veil: the camera must be back at x=0
  // before the divario world becomes visible again.
  return pan * (1 - seqSmooth(p, SEQ.PAN_UNWIND_START, SEQ.PAN_UNWIND_END));
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
  if (p < SEQ.APPROACH_END) {
    // APPROACH: exponential in the plunge-eased sub-progress u — the
    // micro-hold plateau and the accelerating tail live in the ease.
    const u = plungeEase(
      (p - SEQ.HOLD1_END) / (SEQ.APPROACH_END - SEQ.HOLD1_END),
    );
    return SEQ.DIST_MID * Math.pow(SEQ.DIST_NEAR / SEQ.DIST_MID, u);
  }
  if (p < SEQ.IGNITION_END) {
    const s = seqSmooth(p, SEQ.APPROACH_END, SEQ.IGNITION_END);
    return SEQ.DIST_NEAR * Math.pow(SEQ.DIST_FLOOR / SEQ.DIST_NEAR, s);
  }
  return SEQ.DIST_FLOOR;
}

function holeFadeAt(p: number, tunnelNull: boolean): number {
  const fadeIn = seqSmooth(p, SEQ.FADE_IN_START, SEQ.FADE_IN_END);
  const outEnd = tunnelNull ? SEQ.FADE_OUT_NULL_END : SEQ.FADE_OUT_END;
  const fadeOut = 1 - seqRamp(p, SEQ.FADE_OUT_START, outEnd);
  return fadeIn * fadeOut;
}

export default function SingularityPassage() {
  const { language } = useLanguage();
  const rootRef = useRef<HTMLElement | null>(null);

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
          // Reduced motion → the static CSS gradient spacer only (no JS at
          // all — the simple fade cut).
          if (!c.motionOk) return;

          // ==================================================================
          // MOBILE / COARSE — the cheap ~180vh beat: CSS hole imposter on the
          // SAME 1/d curve (transform/opacity only), then a navy crossfade.
          // ==================================================================
          if (!c.desktop || !c.fine) {
            const stage = root.querySelector<HTMLElement>(".seq-lite");
            const imposter = root.querySelector<HTMLElement>(
              "[data-seq-imposter]",
            );
            const cover = root.querySelector<HTMLElement>("[data-seq-cover]");
            if (!stage || !imposter || !cover) return;

            root.setAttribute("data-on", "lite");
            const size = () => {
              root.style.height = `${SEQ.LITE_HEIGHT_VH}vh`;
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
              trigger: root,
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
              root.style.height = "";
            };
          }

          // ==================================================================
          // FULL DESKTOP SEQUENCE
          // ==================================================================
          const stage = root.querySelector<HTMLElement>(".seq-stage");
          const echo = root.querySelector<HTMLElement>("[data-seq-echo]");
          const veil = root.querySelector<HTMLElement>("[data-seq-veil]");
          const pulse = root.querySelector<HTMLElement>("[data-seq-pulse]");
          const host = root.querySelector<HTMLElement>(
            "[data-seq-tunnel-host]",
          );
          const imposter = root.querySelector<HTMLElement>(
            "[data-seq-desk-imposter]",
          );
          if (!stage || !echo || !veil || !host) return;

          root.setAttribute("data-on", "seq");
          const size = () => {
            root.style.height = `${SEQ.DESKTOP_HEIGHT_VH}vh`;
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
          // Clear the emerge transform BEFORE ScrollTrigger measures so the
          // cached center is the layout position, not a mid-seam offset pose.
          const clearEmerge = () => {
            if (emergeEl) gsap.set(emergeEl, { x: 0, y: 0, scale: 1 });
          };
          ScrollTrigger.addEventListener("refreshInit", clearEmerge);
          const cache = () => {
            ih = window.innerHeight;
            vw = window.innerWidth;
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
          const echoX = gsap.quickSetter(echo, "x", "px") as (
            v: number,
          ) => void;
          const echoAlpha = gsap.quickSetter(echo, "opacity") as (
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
          gsap.set(echo, { x: 0, opacity: 1 });
          gsap.set(veil, { opacity: 0, scale: 0.5 });
          if (pulse) gsap.set(pulse, { opacity: 0 });
          if (imposter) gsap.set(imposter, { scale: 1, opacity: 0 });

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
              // Graft 5: no WebGL1 → the veil carries the plunge alone
              // (earlier rise + longer march-fade tail — see compose()).
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
          // inside the active band — parked everywhere else) ────────────────
          let raf = 0;
          let rafOn = false;
          let prev = 0;
          const rafTick = (now: number) => {
            if (!rafOn) return;
            const dt = Math.min((now - prev) / 1000, 1 / 30);
            prev = now;
            const s = useSeqStore.getState();
            if (tunnel) {
              const a = s.tunnelAlpha;
              if (tunnelCanvas && a !== lastAlpha) {
                lastAlpha = a;
                tunnelCanvas.style.opacity = String(a);
              }
              // Warp drive: 2→100 across p 0.72→0.90 (the module lerps its
              // timeCoef at 0.02/frame — smooth both directions), then the
              // seam scrubs it down toward 8 as the streaks die.
              const warpP = seqRamp(s.p, SEQ.WARP_START_P, SEQ.WARP_END_P);
              const warp =
                (SEQ.WARP_MIN + (SEQ.WARP_MAX - SEQ.WARP_MIN) * warpP) *
                  (1 - s.seamT) +
                SEQ.WARP_SEAM * s.seamT;
              tunnel.setTargetTimeCoef(warp);
              // Center lock: particle convergence + zoom-blur center sit on
              // the marched core (island-published UV, eased to exact center
              // by p 0.80; 0.5/0.5 whenever no island is live).
              tunnel.setCenter(s.holeNdcX, s.holeNdcY);
              tunnel.render(dt);
            }
            raf = requestAnimationFrame(rafTick);
          };
          const startRaf = () => {
            if (rafOn) return;
            rafOn = true;
            prev = performance.now();
            raf = requestAnimationFrame(rafTick);
          };
          const stopRaf = () => {
            if (!rafOn) return;
            rafOn = false;
            cancelAnimationFrame(raf);
          };

          // ── DPR cap hysteresis (tierStore → AdaptiveResolution) ──────────
          let capOn = false;
          const applyDprCap = (p: number) => {
            if (!capOn && p > SEQ.DPR_CAP_ON) {
              capOn = true;
              useTierStore.getState().setDprCap(SEQ.DPR_CAP);
            } else if (capOn && p < SEQ.DPR_CAP_OFF) {
              capOn = false;
              useTierStore.getState().setDprCap(null);
            }
          };

          // ── compose(): the single evaluator — every visual below is a pure
          // function of (p, seamT), so the whole take reverses cleanly ──────
          let p = 0;
          let seamT = 0;
          const compose = () => {
            const s = useSeqStore.getState();
            const tunnelNull = s.tunnelNull;

            const pan = panAt(p, panEase);
            const dist = distAt(p, panEase, plungeEase);
            const holeFade = holeFadeAt(p, tunnelNull);
            const trackT = seqSmooth(p, SEQ.SETTLE_END, SEQ.TRACK_END);
            const holeYFrac = SEQ.Y_FRAC_ENTER * (1 - trackT);
            const starAlpha =
              SEQ.STAR_HI -
              (SEQ.STAR_HI - SEQ.STAR_LO) *
                seqSmooth(p, SEQ.HOLD1_END, SEQ.APPROACH_END);
            const seamEase = seqSmooth(seamT, 0, 1);
            const tunnelAlpha =
              seqRamp(p, SEQ.TUNNEL_IN_START, SEQ.TUNNEL_IN_END) *
              (1 - seamEase);

            useSeqStore.setState({
              p,
              seamT,
              pan01: pan,
              dist,
              holeYFrac,
              holeFade,
              starAlpha,
              tunnelAlpha,
            });

            // Echo line: foreground plate at 1.15× the world rate; fully
            // gone before HOLD 1 settles.
            echoX(-ECHO_RATE_VW * vw * pan);
            echoAlpha(1 - seqSmooth(p, 0.3, 0.4));

            // Closing black-core veil (earlier + alone on the null-tunnel
            // path — graft 5), releasing across the seam.
            const veilT =
              (tunnelNull
                ? seqSmooth(p, SEQ.VEIL_NULL_START, SEQ.VEIL_NULL_END)
                : seqSmooth(p, SEQ.VEIL_START, SEQ.VEIL_END)) *
              (1 - seamEase);
            veilSet({ opacity: veilT, scale: 0.5 + 1.8 * veilT });

            // Owner-gated horizon pulse (graft 7; dark unless enabled).
            if (pulseAlpha) {
              const bell = Math.sin(Math.PI * seqRamp(p, 0.8, 0.94));
              pulseAlpha(PULSE_PEAK * bell * (1 - seamEase));
            }

            // CSS hole imposter (desktop non-WebGPU / fallback-tier stand-in
            // for the march during TRACK/APPROACH; suppressed the moment the
            // real march is live). Rides the SAME dist curve: apparent
            // height fraction = 2.1445/dist of the viewport.
            if (imposterSet) {
              if (s.marchLive) {
                imposterSet({ opacity: 0 });
              } else {
                const apparentVh = (SEQ_APPARENT_K / dist) * 100;
                imposterSet({
                  scale: apparentVh / SEQ.LITE_START_VH,
                  opacity: holeFade,
                });
              }
            }

            // Divario heading emergence: condense out of the streaks toward
            // its grid seat (transform-only; doc-position cached on refresh,
            // viewport position derived from scrollY — no rect reads here).
            if (emergeSet) {
              const hold = 1 - seamEase;
              const dx = (vw / 2 - emergeCx) * EMERGE_PULL * hold;
              const dy =
                (ih / 2 - (emergeDocCy - window.scrollY)) * EMERGE_PULL * hold;
              emergeSet({
                x: dx,
                y: dy,
                scale: EMERGE_SCALE + (1 - EMERGE_SCALE) * seamEase,
              });
            }

            // Tunnel lifecycle bands (graft 6): create parked on the calm
            // TRACK beat; rAF only inside the hot band; park (rAF halted,
            // instance kept) on reverse below p 0.55; hard-dispose only via
            // the distance band trigger below.
            if (s.armed && p >= SEQ.TUNNEL_CREATE_P) ensureTunnel();
            const wantRaf =
              !!tunnel &&
              (tunnelAlpha > 0.001 ||
                (p >= SEQ.TUNNEL_WARM_P && (p < 1 || seamT < 1)));
            if (wantRaf) startRaf();
            else if (p < SEQ.TUNNEL_PARK_P || (seamT >= 1 && tunnelAlpha <= 0))
              stopRaf();

            applyDprCap(p);
          };

          // ── Main scrub — ONE trigger, CSS sticky does the pinning ────────
          const mainST = ScrollTrigger.create({
            trigger: root,
            start: "2.5% top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              p = self.progress;
              compose();
            },
          });

          // ── Seam scrub — sequence p 0.92 → divario top +40vh ─────────────
          const seamST = ScrollTrigger.create({
            trigger: root,
            start: () => {
              const top = root.getBoundingClientRect().top + window.scrollY;
              const h = root.offsetHeight;
              const startOff = h * 0.025; // the main trigger's "2.5% top"
              const travel = h - startOff - ih;
              return top + startOff + travel * SEQ.SEAM_START;
            },
            end: () => {
              const top = root.getBoundingClientRect().top + window.scrollY;
              // Sticky release (p=1) + 40vh into the divario's arrival.
              return top + (root.offsetHeight - ih) + ih * 0.4;
            },
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              seamT = self.progress;
              compose();
            },
          });

          // ── Approach/leave band: arms the island build (compileAsync warm
          // during SpineExitGate's locked beat, one viewport early) and
          // hard-disposes tunnel + build ~250vh past the seam or back above
          // the spine end — init on approach, destroy on leave ──────────────
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
          // mid-page) and once webfonts settle (the echo's display serif
          // changes nothing structural, but keep the house grammar).
          cache();
          p = mainST.progress;
          seamT = seamST.progress;
          compose();
          let fontsCancelled = false;
          document.fonts?.ready
            .then(() => {
              if (!fontsCancelled) ScrollTrigger.refresh();
            })
            .catch(() => {});

          return () => {
            fontsCancelled = true;
            stopRaf();
            mainST.kill();
            seamST.kill();
            bandST.kill();
            ScrollTrigger.removeEventListener("refreshInit", size);
            ScrollTrigger.removeEventListener("refreshInit", clearEmerge);
            ScrollTrigger.removeEventListener("refresh", cache);
            disposeTunnel();
            useTierStore.getState().setDprCap(null);
            if (emergeEl) gsap.set(emergeEl, { clearProps: "transform" });
            resetSeqStore();
            root.removeAttribute("data-on");
            root.style.height = "";
          };
        },
      );
    },
    // EN↔IT swaps the echo copy in place; revert + recreate everything
    // against the fresh layout (credibility-strip lineage).
    { scope: rootRef, dependencies: [language], revertOnUpdate: true },
  );

  return (
    <section
      ref={rootRef}
      id="singularity-passage"
      aria-hidden="true"
      className="seq-root relative"
    >
      {/* Static fallback: reduced-motion / no-JS — a quiet deep-navy
          fade-through between the spine's release and the divario. */}
      <div className="seq-static" />

      {/* ── Full desktop sticky stage ─────────────────────────────────── */}
      <div className="seq-stage sticky top-0 h-screen overflow-hidden">
        {/* Beat 05 echo — byte-identical spine copy (HANDOVER_ECHO), held
            frame-left exactly where the handover panel rested, then tracked
            off as the foreground plate of the pan. Decorative repeat: the
            whole section is aria-hidden. */}
        <div className="absolute inset-0 flex items-center pb-12 sm:pb-16 pointer-events-none">
          <div className="container-px w-full">
            <div data-seq-echo className="max-w-[42rem] will-change-transform">
              <p className="eyebrow inline-flex items-center gap-2 text-ink/80 mb-4">
                <span aria-hidden="true" className="status-dot" />
                <span>{HANDOVER_ECHO.eyebrow[language]}</span>
              </p>
              <p className="font-display leading-[0.98] text-ink text-balance text-[clamp(2.25rem,4.5vw,4rem)] tracking-[-0.028em]">
                {HANDOVER_ECHO.title[language]}
              </p>
            </div>
          </div>
        </div>
        {/* Desktop CSS hole imposter — stands in for the raymarch on the
            non-WebGPU / fallback-GL tier (suppressed while marchLive). */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div data-seq-desk-imposter className="seq-imposter" />
        </div>
      </div>

      {/* ── Mobile/coarse sticky stage (cheap 1/d beat) ────────────────── */}
      <div className="seq-lite sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div data-seq-imposter className="seq-imposter" />
        </div>
        <div data-seq-cover className="seq-cover" />
      </div>

      {/* ── Fixed overlays (desktop sequence only; below the z-50 navbar).
          Fixed, not in-stage: they must hold the frame THROUGH the sticky
          release so the emergence fade plays over the arriving divario. ── */}
      <div data-seq-veil className="seq-veil" />
      {ENABLE_HORIZON_PULSE ? (
        <div data-seq-pulse className="seq-pulse" />
      ) : null}
      <div data-seq-tunnel-host className="seq-tunnel-host" />

      <style>{`
        /* Default (SSR / no-JS / reduced-motion): the 60vh fade-through
           spacer. The armed paths override height inline via JS. */
        .seq-root { height: 60vh; }
        .seq-static {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            transparent,
            #060b16 38%,
            #04070f 55%,
            transparent
          );
        }
        .seq-stage, .seq-lite { display: none; }
        .seq-root[data-on] .seq-static { display: none; }
        .seq-root[data-on="seq"] .seq-stage { display: block; }
        .seq-root[data-on="lite"] .seq-lite { display: block; }

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
           fixed navbar (z-50). All decorative, never interactive. */
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
             swap is invisible (the color seam). */
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
