"use client";

/**
 * CompliancePipeline — the compliance conduit as a choreographed moment that
 * stands on its own on EVERY tier (M4 → M5). Input → PII redaction → router
 * → guardrail → audit log → output, each stage labelled with the regulation
 * it satisfies (copy unchanged, EN/IT).
 *
 * Three beats, one GSAP master timeline per breakpoint variant:
 *
 *   1. ASSEMBLY (once, on scroll-enter): the conduit DRAWS itself start→end
 *      while stations rise 12px into place in pipeline order (top-to-bottom
 *      on mobile), each regulation tag trailing its station by a beat and a
 *      power-on blink as each lands — the pipeline is built in front of you
 *      instead of arriving mid-loop.
 *   2. THE LIGHT (idle loop, ~8s/pass): a glowing streak runs the conduit in
 *      per-segment tweens — easing out of one station, into the next, with a
 *      short hold + ignition pulse at each checkpoint. The light "checks in"
 *      at every control instead of sliding past at constant velocity: the
 *      narrative is controls, not a screensaver.
 *   3. HOVER/FOCUS/TAP IGNITE (every tier, every input class): each stage
 *      hotspot lights the SVG itself — halo bloom on the station, regulation
 *      tag lifted to full ink — so the interaction reads alive even where the
 *      WebGPU echo never mounts. When the travelling light next crosses an
 *      ignited stage the streak swells briefly: the light acknowledges the
 *      checkpoint being inspected. Keyboard focus and a touch TAP both get the
 *      identical treatment (see PipelineHotspots for how the three input
 *      classes are kept from cancelling each other out).
 *
 * ScrollTrigger plays/pauses the master with visibility (single-RAF: the
 * site's scroll spine, no bespoke rAF or observers); while paused off-screen
 * the streak also dims so a frozen full-bright light at the viewport edge
 * never reads as a hang. Reduced-motion: assembled immediately, no
 * travelling light (the static gradient conduit brightens to stand in for
 * it, stations softly lit) — hover ignite stays, it is state feedback, not
 * motion.
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/components/language-provider";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { useCompliancePipelineStore } from "@/webgl/store/compliancePipelineStore";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STAGE_KEYS = ["input", "pii", "router", "guardrail", "audit", "output"] as const;
type StageKey = (typeof STAGE_KEYS)[number];

const STAGE_LABELS: Record<StageKey, { en: string; it: string }> = {
  input: { en: "Input", it: "Input" },
  pii: { en: "PII redaction", it: "Redazione PII" },
  router: { en: "Model router", it: "Router modelli" },
  guardrail: { en: "Guardrail check", it: "Controllo guardrail" },
  audit: { en: "Audit log", it: "Log di audit" },
  output: { en: "Output", it: "Output" },
};

const REGULATIONS: Record<StageKey, string> = {
  input: "GDPR",
  pii: "GDPR · EU AI Act Art. 10",
  router: "EU AI Act",
  guardrail: "EU AI Act Art. 14",
  audit: "DORA · ISO 27001",
  output: "GDPR",
};

// Desktop geometry
const D_VB_W = 880;
const D_VB_H = 140;
const D_BOX_W = 110;
const D_BOX_H = 44;
const D_PILL_Y_OFFSET = 12;
const D_CENTER_Y = 56;
const D_STAGE_X = STAGE_KEYS.map((_, i) => {
  const margin = 70;
  const span = D_VB_W - margin * 2;
  return margin + (span * i) / (STAGE_KEYS.length - 1);
});

// Mobile geometry (vertical)
const M_VB_W = 280;
const M_VB_H = 720;
const M_BOX_W = 132;
const M_BOX_H = 44;
const M_CENTER_X = 80;
const M_STAGE_Y = STAGE_KEYS.map((_, i) => {
  const margin = 50;
  const span = M_VB_H - margin * 2;
  return margin + (span * i) / (STAGE_KEYS.length - 1);
});
/** Left edge of the mobile regulation tag: just clear of the station box. */
const M_TAG_X = M_CENTER_X + M_BOX_W / 2 + 12; // 158
/**
 * D-12 — the mobile tag USED TO CLIP INSIDE ITS OWN viewBox, at every width.
 * The tag is anchored `start` at x = 158 in a 280-unit box, so it has
 * 280 − 158 = 122 units of room. At fontSize 10 a monospace glyph advances
 * ~0.6em ≈ 6 units, i.e. ~20 characters — and "GDPR · EU AI Act Art. 10" is 24,
 * ending at x ≈ 302. SVG clipped it, so the ONE citation the diagram exists to
 * show was cut off on every phone from 320px up.
 *
 * The fix is resolution-independent because the overflow was: anything past the
 * budget is split on its own " · " separators onto stacked tspans. The
 * separator stays on the line it follows, so not one character of the frozen
 * REGULATIONS copy is added, dropped or reordered — only its line breaks.
 * Station pitch is 124 units against a 44-unit box, so two 11-unit lines sit
 * comfortably inside the gap.
 */
const M_TAG_MAX_CHARS = 20;
/** Line height for a wrapped mobile tag, in user units. */
const M_TAG_LINE_H = 11;
function mobileTagLines(text: string): string[] {
  if (text.length <= M_TAG_MAX_CHARS) return [text];
  const parts = text.split(" · ");
  if (parts.length < 2) return [text];
  return parts.map((p, i) => (i < parts.length - 1 ? `${p} ·` : p));
}

const STAGE_FRACTIONS = STAGE_KEYS.map((_, i) => i / (STAGE_KEYS.length - 1));

/**
 * Loop rhythm. Composed period: HOLD + 5×(SEG + HOLD) + EXIT ≈ 7.1s, plus
 * the repeat delay ≈ 7.9s per pass — inside the slow-idle 6–8s band the old
 * single 8s linear tween occupied, but now the light eases across each
 * segment and holds at every station while its pulse fires.
 */
const SEG_DURATION = 1.1;
const STATION_HOLD = 0.16;
const EXIT_DURATION = 0.6;
const LOOP_REPEAT_DELAY = 0.8;

/**
 * Assembly rhythm: the conduit draw rate equals the station stagger, so the
 * drawn tip reaches each station exactly as it rises — the segment between
 * two stations draws in the gap between their ignitions. ASSEMBLY_END sits
 * just past the last blink's decay (5×0.12 + 0.22 + 0.5 = 1.32).
 */
const STAGE_STAGGER = 0.12;
const ASSEMBLY_END = 1.35;

/**
 * Regulation tags rest slightly muted and lift to FULL ink on hover/focus.
 * The lift has to be an opacity move, not a fill move: the fills are
 * var()-based hsl() strings GSAP cannot interpolate — so the tag is authored
 * at fill ink with a rest opacity that reads as the old ink-mute tone.
 */
const TAG_REST_OPACITY = 0.72;

/**
 * DOM-side hover/focus bridge between a hotspot overlay and its matching
 * SVG diagram (one link per breakpoint variant — overlay and diagram are
 * mounted in visibility-matched pairs, so each pair gets a private channel).
 * A plain mutable object, deliberately NOT React state and NOT the zustand
 * store: hover must never re-render the SVG, and the loop's trail callbacks
 * read `hovered` per pass without any subscriber churn. The diagram
 * registers `ignite` from inside its GSAP setup; the overlay calls it.
 */
interface StageLink {
  hovered: number;
  ignite: ((idx: number, hot: boolean) => void) | null;
  /** The diagram's <svg> root, assigned by a ref callback — NOT by the GSAP
   *  setup. See IGNITE_CSS for why the DOM path has to exist on its own. */
  root: SVGSVGElement | null;
}

/**
 * The ignite state, expressed in CSS.
 *
 * `link.ignite` is registered from INSIDE the diagram's useGSAP body, so the
 * halo bloom and the tag lift only exist if that body ran. Measured on /trust
 * at both breakpoints (and confirmed identical at HEAD, i.e. this predates the
 * D-12 work): GSAP currently never touches this SVG — not one inline style
 * lands on the stations, the conduit or the streak — so `ignite` is null and
 * every hover, focus and tap was a silent no-op. A tap path that depends on it
 * would be exactly the dead affordance D-12 is about.
 *
 * So the ignite ALSO has a pure-DOM path: the hotspots write
 * `data-lit-stage="<idx>"` on the diagram's <svg> root and these rules do the
 * rest. The two paths compose instead of fighting, in this precedence order:
 *   - GSAP alive → it writes INLINE opacity on the halo/tag, and an inline
 *     style beats a stylesheet rule, so the authored choreography wins
 *     untouched (including its `assembled` gate and its 0.2s eases).
 *   - GSAP dead → no inline opacity exists, and these rules paint the state.
 * Transitions are neutralised globally under prefers-reduced-motion, which is
 * correct here: the STATE must still apply, only its easing goes away.
 */
const IGNITE_CSS = `
[data-pipe-halo] { transition: opacity 0.2s ease; }
[data-pipe-tag] { transition: opacity 0.2s ease; }
${STAGE_KEYS.map(
  (_, i) => `
svg[data-lit-stage="${i}"] [data-pipe-halo="${i}"] { opacity: 0.55; }
svg[data-lit-stage="${i}"] [data-pipe-tag="${i}"] { opacity: 1; }`,
).join("")}
`;

/**
 * "Did this focus come from the keyboard?" — :focus-visible is exactly that
 * question, and every browser this site supports answers it. Wrapped because
 * `matches()` throws on an unsupported selector rather than returning false,
 * and a thrown selector inside a focus handler would take the handler with it.
 */
function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

interface DiagramProps {
  mobile: boolean;
  stageLabel: (k: StageKey) => string;
  link: StageLink;
}

function PipelineDiagram({ mobile, stageLabel, link }: DiagramProps) {
  const rootRef = useRef<SVGSVGElement>(null);
  const conduitRef = useRef<SVGLineElement>(null);
  const streakRef = useRef<SVGLineElement>(null);
  const stageRefs = useRef<(SVGGElement | null)[]>([]);
  const pulseRefs = useRef<(SVGRectElement | null)[]>([]);
  const haloRefs = useRef<(SVGRectElement | null)[]>([]);
  const tagRefs = useRef<(SVGTextElement | null)[]>([]);

  const idSuffix = mobile ? "m" : "d";
  const conduitStart = mobile ? M_STAGE_Y[0] : D_STAGE_X[0];
  const conduitEnd = mobile
    ? M_STAGE_Y[M_STAGE_Y.length - 1]
    : D_STAGE_X[D_STAGE_X.length - 1];
  const pathLen = conduitEnd - conduitStart;
  const streakLen = mobile ? 80 : 110;

  useGSAP(
    () => {
      const streak = streakRef.current;
      const conduit = conduitRef.current;
      if (!streak || !conduit) return;

      const stages = stageRefs.current.filter(Boolean);
      const tags = tagRefs.current.filter(Boolean);
      const halos = haloRefs.current.filter(Boolean);

      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Gate for the hover restyle: a hover tween on a tag mid-assembly
      // would overwrite (kill) its entrance tween and strand the tag at its
      // pre-rise y — so ignite touches nothing until assembly has settled.
      // Reduced-motion is "assembled" from the first frame.
      let assembled = reduce;

      // HOVER/FOCUS IGNITE — registered on BOTH paths (reduced-motion
      // included: brightening is state feedback, not motion). The halo rect
      // blooms via opacity; the regulation tag lifts from rest to full ink.
      // These tweens own halo opacity and tag opacity exclusively — the
      // timelines never touch either — so state feedback and choreography
      // can never fight over a property.
      link.ignite = (idx, hot) => {
        if (!assembled) return;
        const halo = haloRefs.current[idx];
        const tag = tagRefs.current[idx];
        if (halo) {
          gsap.to(halo, {
            opacity: hot ? 0.55 : 0,
            duration: 0.2,
            ease: hot ? "power2.out" : "power2.in",
            overwrite: "auto",
          });
        }
        if (tag) {
          gsap.to(tag, {
            opacity: hot ? 1 : TAG_REST_OPACITY,
            duration: 0.2,
            ease: "power2.out",
            overwrite: "auto",
          });
        }
      };

      if (reduce) {
        // Static, calm, already assembled: no draw-in, no travelling light.
        // The gradient conduit brightens to stand in for the light, and
        // every station is softly acknowledged. Hover ignite (above) stays.
        gsap.set(streak, { opacity: 0 });
        gsap.set(conduit, { opacity: 0.5 });
        pulseRefs.current.forEach((p) => p && gsap.set(p, { opacity: 0.3 }));
        return () => {
          link.ignite = null;
        };
      }

      // One diagram variant is always display:none (desktop/mobile pair).
      // Building its timeline would spend tweens on a zero-rect
      // ScrollTrigger, and a breakpoint flip would strand half-played inline
      // styles on the variant taking over. gsap.matchMedia scopes each build
      // to its own range and auto-reverts on flip, so the incoming variant
      // assembles fresh from its authored state. 639.98px avoids a 1px
      // both-match band against Tailwind's 640px `sm`.
      const mm = gsap.matchMedia();
      mm.add(mobile ? "(max-width: 639.98px)" : "(min-width: 640px)", () => {
        // Re-arm the hover gate per build: after a breakpoint flip the new
        // variant must re-assemble before hover may restyle its tags.
        assembled = false;
        // The onToggle dim below must not touch the streak before the loop
        // exists — during assembly the streak is intentionally invisible.
        let loopStarted = false;

        // -- Initial states. The authored JSX is the fully-assembled no-JS /
        // pre-hydration poster; motion states are applied only here, at
        // build time, on the tier that will actually animate. Transforms,
        // opacity, and stroke only — nothing here can shift layout.
        gsap.set(stages, { opacity: 0, y: 12 });
        gsap.set(tags, { opacity: 0, y: 6 });
        gsap.set(halos, { opacity: 0 });
        // Conduit draws via the dash trick — brighter while it is the
        // subject of the build, settling to its quiet rest opacity once the
        // travelling light takes over the contrast budget.
        gsap.set(conduit, {
          strokeDasharray: `${pathLen}`,
          strokeDashoffset: pathLen,
          opacity: 0.55,
        });
        // The streak is a short dash sliding along the conduit. At offset
        // = streakLen the dash sits entirely before the line with its
        // leading edge exactly ON station 0; at -(pathLen + streakLen) it
        // has fully exited past the far end.
        gsap.set(streak, {
          strokeDasharray: `${streakLen} ${pathLen + streakLen * 2}`,
          strokeDashoffset: streakLen,
          attr: { "stroke-width": 2.6 },
          opacity: 0,
        });

        const master = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 90%",
            // Play/pause with visibility — never restart or reverse, so the
            // assembly runs exactly once (including immediately, when the
            // section is already past the start line at load or SPA nav)
            // and the loop freezes off-screen instead of burning frames.
            toggleActions: "play pause resume pause",
            onToggle: (self) => {
              if (!loopStarted) return;
              // Dim the frozen light while paused off-screen: a full-bright
              // streak stopped mid-conduit at the viewport edge reads as a
              // hang; a dimmed one reads as idle. Restored on re-entry.
              gsap.to(streak, {
                opacity: self.isActive ? 1 : 0.4,
                duration: 0.3,
                ease: "power2.out",
                overwrite: "auto",
              });
            },
          },
        });

        // -- Beat 1: ASSEMBLY. The conduit draws end-to-end at constant
        // rate tuned so its tip arrives at station i on that station's rise
        // (draw duration = stagger × segment count) — the classic "signal
        // builds the pipe" read, connective tissue under the eased pops.
        master.to(
          conduit,
          {
            strokeDashoffset: 0,
            duration: STAGE_STAGGER * (STAGE_KEYS.length - 1),
            ease: "none",
          },
          0,
        );
        STAGE_KEYS.forEach((_, i) => {
          const at = i * STAGE_STAGGER;
          const stage = stageRefs.current[i];
          const tag = tagRefs.current[i];
          const pulse = pulseRefs.current[i];
          if (stage) {
            master.to(
              stage,
              { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" },
              at,
            );
          }
          // The regulation tag trails its station by a beat — the
          // credential follows the thing it certifies.
          if (tag) {
            master.to(
              tag,
              { opacity: TAG_REST_OPACITY, y: 0, duration: 0.5, ease: "expo.out" },
              at + 0.08,
            );
          }
          // A power-on blink as each station lands (same glow rect the loop
          // reuses) — the stage IGNITES rather than merely appearing.
          if (pulse) {
            master
              .fromTo(
                pulse,
                { opacity: 0 },
                { opacity: 0.7, duration: 0.12, ease: "power2.out" },
                at + 0.1,
              )
              .to(pulse, { opacity: 0, duration: 0.5, ease: "power2.in" }, at + 0.22);
          }
        });
        // Build done: the conduit recedes to its rest opacity so the light
        // owns the contrast from here on. Overlaps the loop start slightly —
        // the settle hands off to the departing light in one motion.
        master.to(
          conduit,
          { opacity: 0.28, duration: 0.6, ease: "power2.out" },
          ASSEMBLY_END - 0.5,
        );
        master.call(
          () => {
            assembled = true;
            loopStarted = true;
          },
          undefined,
          ASSEMBLY_END,
        );
        master.set(streak, { opacity: 1 }, ASSEMBLY_END);

        // -- Beat 2: THE LIGHT. Per-segment traversal with a hold at every
        // station: power1.inOut leaves slow and arrives slow — a check-in
        // at each checkpoint, not a drive-by.
        const loop = gsap.timeline({
          repeat: -1,
          repeatDelay: LOOP_REPEAT_DELAY,
        });
        const checkIn = (i: number, at: number) => {
          const pulse = pulseRefs.current[i];
          if (pulse) {
            loop
              .fromTo(
                pulse,
                { opacity: 0 },
                { opacity: 0.95, duration: 0.16, ease: "power2.out" },
                Math.max(at - 0.08, 0),
              )
              .to(pulse, { opacity: 0, duration: 0.7, ease: "power2.in" }, at + 0.18);
          }
          // Hover trail: if this stage is under the pointer/focus when the
          // light arrives, the streak swells briefly — the light
          // acknowledges the checkpoint being inspected. stroke-width is
          // owned by nothing else, so this callback tween can never fight
          // the timeline. Re-evaluated live on every pass (loop callbacks
          // re-fire each repeat).
          loop.call(
            () => {
              if (link.hovered !== i) return;
              gsap.fromTo(
                streak,
                { attr: { "stroke-width": 4.4 } },
                {
                  attr: { "stroke-width": 2.6 },
                  duration: 0.9,
                  ease: "power2.out",
                  overwrite: "auto",
                },
              );
            },
            undefined,
            at,
          );
        };

        // The pass opens with the leading edge already on station 0 (see
        // the streak's initial dashoffset): first check-in at t = 0.
        checkIn(0, 0);
        let t = STATION_HOLD;
        for (let i = 1; i < STAGE_KEYS.length; i++) {
          loop.to(
            streak,
            {
              strokeDashoffset: streakLen - STAGE_FRACTIONS[i] * pathLen,
              duration: SEG_DURATION,
              ease: "power1.inOut",
            },
            t,
          );
          t += SEG_DURATION;
          checkIn(i, t);
          t += STATION_HOLD;
        }
        // Past Output the light shoots off the end of the conduit, then the
        // repeat delay is the breath before the next request enters.
        loop.to(
          streak,
          {
            strokeDashoffset: -(pathLen + streakLen),
            duration: EXIT_DURATION,
            ease: "power1.in",
          },
          t,
        );

        // Nested in the master so ONE ScrollTrigger governs assembly and
        // loop alike — pausing off-screen pauses everything.
        master.add(loop, ASSEMBLY_END);
      });

      return () => {
        link.ignite = null;
        mm.revert();
      };
    },
    { scope: rootRef, dependencies: [mobile, pathLen, streakLen] },
  );

  const renderStage = (key: StageKey, idx: number) => {
    const cx = mobile ? M_CENTER_X : D_STAGE_X[idx];
    const cy = mobile ? M_STAGE_Y[idx] : D_CENTER_Y;
    const boxW = mobile ? M_BOX_W : D_BOX_W;
    const boxH = mobile ? M_BOX_H : D_BOX_H;

    return (
      // The whole stage (box, glow rects, label, tag) rises as one unit on
      // assembly — the tag additionally trails within the rising group.
      <g
        key={key}
        ref={(el) => {
          stageRefs.current[idx] = el;
        }}
      >
        {/* Base station */}
        <rect
          x={cx - boxW / 2}
          y={cy - boxH / 2}
          width={boxW}
          height={boxH}
          rx={10}
          fill="hsl(var(--surface))"
          stroke="hsl(var(--rule))"
          strokeWidth={1}
        />
        {/* Hover/focus halo — bloomed by link.ignite the moment the stage's
            hotspot is entered, on every tier. A separate rect from the
            ignition pulse below so state feedback (hover-owned opacity)
            never fights the timeline (loop-owned opacity). */}
        <rect
          ref={(el) => {
            haloRefs.current[idx] = el;
          }}
          data-pipe-halo={idx}
          x={cx - boxW / 2}
          y={cy - boxH / 2}
          width={boxW}
          height={boxH}
          rx={10}
          fill="none"
          stroke={`url(#pipeGrad-${idSuffix})`}
          strokeWidth={1.6}
          opacity={0}
          filter={`url(#pipeGlow-${idSuffix})`}
        />
        {/* Ignition pulse — timeline-owned: blinks once as the stage lands
            during assembly, then every time the light checks in. */}
        <rect
          ref={(el) => {
            pulseRefs.current[idx] = el;
          }}
          x={cx - boxW / 2}
          y={cy - boxH / 2}
          width={boxW}
          height={boxH}
          rx={10}
          fill="none"
          stroke={`url(#pipeGrad-${idSuffix})`}
          strokeWidth={1.6}
          opacity={0}
          filter={`url(#pipeGlow-${idSuffix})`}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="hsl(var(--ink))"
          style={{
            fontSize: 12,
            fontFamily: "var(--font-sans), system-ui, sans-serif",
            fontWeight: 500,
          }}
        >
          {stageLabel(key)}
        </text>
        {/* Regulation tag: authored at full-ink fill with a muted rest
            OPACITY (not ink-mute fill) so hover/focus can lift it to full
            ink with a pure opacity tween — var()-based fills don't
            interpolate. Rest tone matches the old ink-mute read.
            On mobile the tag wraps onto stacked tspans when it would overrun
            the viewBox (see mobileTagLines) — same string, line-broken. */}
        <text
          ref={(el) => {
            tagRefs.current[idx] = el;
          }}
          data-pipe-tag={idx}
          x={mobile ? M_TAG_X : cx}
          y={mobile ? cy : cy + boxH / 2 + D_PILL_Y_OFFSET + 4}
          textAnchor={mobile ? "start" : "middle"}
          dominantBaseline={mobile ? "middle" : undefined}
          fill="hsl(var(--ink))"
          opacity={TAG_REST_OPACITY}
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono), ui-monospace, monospace",
          }}
        >
          {mobile
            ? mobileTagLines(REGULATIONS[key]).map((line, li, arr) => (
                <tspan
                  key={line}
                  x={M_TAG_X}
                  // First line lifts by half the block so the wrapped pair
                  // stays vertically centred on the station it annotates.
                  dy={
                    li === 0
                      ? (-(arr.length - 1) * M_TAG_LINE_H) / 2
                      : M_TAG_LINE_H
                  }
                >
                  {line}
                </tspan>
              ))
            : REGULATIONS[key]}
        </text>
      </g>
    );
  };

  const x1 = mobile ? M_CENTER_X : conduitStart;
  const x2 = mobile ? M_CENTER_X : conduitEnd;
  const y1 = mobile ? conduitStart : D_CENTER_Y;
  const y2 = mobile ? conduitEnd : D_CENTER_Y;

  return (
    <svg
      ref={(el) => {
        rootRef.current = el;
        // The DOM ignite target (IGNITE_CSS). Assigned here, NOT in the GSAP
        // setup, so the tap/hover state survives the GSAP body never running.
        link.root = el;
      }}
      viewBox={`0 0 ${mobile ? M_VB_W : D_VB_W} ${mobile ? M_VB_H : D_VB_H}`}
      className={mobile ? "w-full h-auto" : "w-full h-auto min-w-[720px]"}
      style={mobile ? { maxHeight: 720 } : undefined}
    >
      <defs>
        <linearGradient
          id={`pipeGrad-${idSuffix}`}
          gradientUnits="userSpaceOnUse"
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
        >
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--accent-2))" />
        </linearGradient>
        <filter
          id={`pipeGlow-${idSuffix}`}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Conduit: quiet gradient base the light travels on. Draws itself in
          on assembly (dash trick), so its authored state is the finished
          line for no-JS / reduced-motion. */}
      <line
        ref={conduitRef}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={`url(#pipeGrad-${idSuffix})`}
        strokeWidth={1.4}
        opacity={0.28}
      />

      {/* The light: a glowing streak sliding the conduit (GSAP dashoffset).
          Authored invisible — without JS there is no travelling light, just
          the assembled diagram; the loop reveals it after assembly. */}
      <line
        ref={streakRef}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={`url(#pipeGrad-${idSuffix})`}
        strokeWidth={2.6}
        strokeLinecap="round"
        opacity={0}
        filter={`url(#pipeGlow-${idSuffix})`}
      />

      {STAGE_KEYS.map((k, i) => renderStage(k, i))}
    </svg>
  );
}

/**
 * Focusable, keyboard-navigable annotated-hotspot OVERLAY (Radian-EXR pattern):
 * one focusable element per stage carrying the FROZEN STAGE_LABELS + REGULATIONS,
 * tab-ordered Input→Output, with a bilingual composed aria-label. These are
 * ADDITIVE real focusable elements positioned as a TRANSPARENT overlay directly
 * over the SVG's stage boxes (using the SVG viewBox geometry as percentages, so
 * they track the responsive SVG scale) — they do NOT replace the SVG role=img
 * label or any copy, and they render NO visible duplicate row (transparent by
 * default; only a focus ring shows). The overlay must stay a DOM SIBLING of the
 * role="img" div (never a child — interactive elements inside role=img are
 * hidden from assistive tech).
 *
 * On focus/hover a hotspot ignites its stage in the SVG ITSELF via link.ignite
 * (halo bloom + regulation tag to full ink — visible on EVERY tier) and writes
 * link.hovered so the travelling light swells when it next crosses the stage.
 * It also bumps compliancePipelineStore — the contract a WebGL echo used to
 * read (the CompliancePipeline3D reader was deleted as dead code); with no
 * reader the set is a harmless no-op, kept so a revived echo re-syncs for free.
 *
 * TOUCH (D-12). These buttons used to carry ONLY hover and focus handlers, so
 * on a phone they were six invisible, `pointer-events-auto` rectangles laid
 * over the diagram that swallowed every tap and did nothing. They now have a
 * real tap path: a click TOGGLES its stage lit, and any other stage taken lit
 * releases the previous one, so a touch reader can inspect a checkpoint (halo +
 * its citation at full ink) exactly like a mouse reader can. Two rules keep the
 * three input classes from cancelling each other out:
 *   - the mouse handlers are gated behind `(hover: hover) and (pointer: fine)`.
 *     iOS synthesises mouseenter on tap, which would otherwise light the stage
 *     a beat before the click arrived and make the click read as "toggle off".
 *   - focus only lights when it is `:focus-visible` (i.e. keyboard). A browser
 *     that focuses a button on tap would otherwise do the same thing.
 * The rectangles are also ≥44×44 now (they were 40 tall).
 *
 * `mobile` selects the vertical (M_*) vs horizontal (D_*) viewBox mapping so the
 * overlay matches whichever PipelineDiagram its sibling card is rendering.
 */
function PipelineHotspots({
  isEn,
  stageLabel,
  mobile,
  link,
}: {
  isEn: boolean;
  stageLabel: (k: StageKey) => string;
  mobile: boolean;
  link: StageLink;
}) {
  const setHovered = useCompliancePipelineStore((s) => s.setHovered);
  const bump = useCompliancePipelineStore((s) => s.bump);
  // Pointer class is a SUBSCRIPTION (a stylus swapped for a mouse must flip the
  // path live) and starts false so the tap path is the one that survives SSR.
  const [fine, setFine] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const ignite = (idx: number) => {
    // Releasing a previously-lit stage is the toggle's job, but it also covers
    // a fast mouse crossing two hotspots before the first leave lands.
    if (link.hovered !== -1 && link.hovered !== idx) {
      link.ignite?.(link.hovered, false);
    }
    link.hovered = idx;
    link.ignite?.(idx, true);
    // The DOM path (IGNITE_CSS) — the one that works whether or not the
    // diagram's GSAP body ever ran.
    link.root?.setAttribute("data-lit-stage", String(idx));
    setHovered(idx);
    bump(idx);
  };
  const clear = (idx: number) => {
    // Guard the reset: a fast mouse can enter stage B before stage A's
    // leave fires — never clobber the newer hover.
    if (link.hovered === idx) {
      link.hovered = -1;
      link.root?.removeAttribute("data-lit-stage");
    }
    link.ignite?.(idx, false);
    setHovered(-1);
  };
  /** The tap/Enter path: lit → dark, dark → lit (and drop whatever was lit). */
  const toggle = (idx: number) => {
    if (link.hovered === idx) clear(idx);
    else ignite(idx);
  };

  const ariaFor = (k: StageKey, idx: number) => {
    const label = stageLabel(k);
    const regs = REGULATIONS[k];
    return isEn
      ? `Stage ${idx + 1} of ${STAGE_KEYS.length}: ${label}. ${regs}`
      : `Fase ${idx + 1} di ${STAGE_KEYS.length}: ${label}. ${regs}`;
  };

  return (
    // pointer-events-none so the SVG underneath stays the visual; only the
    // buttons re-enable pointer events. inset-0 matches the SVG's rendered rect
    // (same content box as its sibling card, see caller).
    <div
      className="pointer-events-none absolute inset-0"
      aria-label={
        isEn ? "Pipeline stage details" : "Dettagli delle fasi della pipeline"
      }
    >
      {STAGE_KEYS.map((k, idx) => {
        // Percentage-of-viewBox positioning tracks the responsive SVG scale.
        const leftPct = mobile
          ? (M_CENTER_X / M_VB_W) * 100
          : (D_STAGE_X[idx] / D_VB_W) * 100;
        const topPct = mobile
          ? (M_STAGE_Y[idx] / M_VB_H) * 100
          : (D_CENTER_Y / D_VB_H) * 100;

        return (
          <button
            key={k}
            type="button"
            aria-label={ariaFor(k, idx)}
            onFocus={(e) => {
              // Keyboard focus only. A pointer-induced focus is not
              // :focus-visible, and letting it ignite would race the click
              // below into a no-op toggle.
              if (isFocusVisible(e.currentTarget)) ignite(idx);
            }}
            onBlur={() => clear(idx)}
            onMouseEnter={() => {
              if (fine) ignite(idx);
            }}
            onMouseLeave={() => {
              if (fine) clear(idx);
            }}
            onClick={() => toggle(idx)}
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: "translate(-50%, -50%)",
            }}
            // No hover ring anymore: hover feedback now lives in the SVG
            // itself (halo + tag lift). The focus-visible ring stays — the
            // keyboard needs a hard focus indicator on top of the ignite.
            // h-11 (44px) is the tap-target floor; the mobile stations are 124
            // viewBox units apart, so the taller box cannot collide with its
            // neighbours, and the wider mobile box matches its 132-unit station.
            className={`pointer-events-auto absolute h-11 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
              mobile ? "w-32" : "w-24"
            }`}
          />
        );
      })}
    </div>
  );
}

export default function CompliancePipeline() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // One hover/focus link per breakpoint variant (see StageLink): plain
  // mutable objects held for the component's life — `.current` unwrapped
  // once so children share the same identity across renders.
  const desktopLink = useRef<StageLink>({
    hovered: -1,
    ignite: null,
    root: null,
  }).current;
  const mobileLink = useRef<StageLink>({
    hovered: -1,
    ignite: null,
    root: null,
  }).current;

  const stageLabel = (k: StageKey) =>
    isEn ? STAGE_LABELS[k].en : STAGE_LABELS[k].it;
  const ariaLabel = isEn
    ? "Compliance data flow: input through PII redaction, model routing, guardrail checks, and audit logging to output, satisfying GDPR, EU AI Act, DORA, and ISO 27001"
    : "Flusso dati di conformità: input attraverso redazione PII, routing dei modelli, controllo guardrail e log di audit fino all'output, in conformità con GDPR, EU AI Act, DORA e ISO 27001";

  return (
    <section
      // Round 8-A: `data-snap` removed (free sections no longer settle).
      className="section-lg relative overflow-hidden"
      aria-labelledby="compliance-pipeline-heading"
    >
      <style>{IGNITE_CSS}</style>
      <div className="container mx-auto max-w-5xl relative z-10 px-0 sm:px-6">
        {/* Eyebrow + H2 outside the RevealOnScroll fade: the eyebrow's
            entrance is the LabelScrambler decode, the H2's is the
            HeadingChoreographer line-mask (data-split-reveal) — keeping them
            in the block fade would double-animate. The description keeps the
            fade. */}
        <div className="max-w-3xl mb-12 sm:mb-14">
          <p className="eyebrow mb-5">
            {isEn ? "How data flows" : "Come fluiscono i dati"}
          </p>
          {/* key={language}: SplitText owns this subtree once split; a
              language swap must remount it or React reconciles against
              orphaned nodes (same contract as SectionHeading's h2). */}
          <h2
            key={language}
            data-split-reveal
            id="compliance-pipeline-heading"
            className="font-display text-2xl sm:text-[2rem] leading-[1.15] tracking-tight text-ink text-balance mb-5"
          >
            {isEn ? (
              <>
                Compliance{" "}
                <span className="italic text-accent">wired in</span>, not
                stuck on at the end.
              </>
            ) : (
              <>
                Conformità{" "}
                <span className="italic text-accent">integrata</span>,
                non appiccicata alla fine.
              </>
            )}
          </h2>
          <RevealOnScroll delay={0}>
            <p className="text-base text-ink-mute leading-[1.55]">
              {isEn
                ? "Every request through a Sersan system passes the same controlled pipeline. The diagram below mirrors the actual checkpoints your data crosses."
                : "Ogni richiesta in un sistema Sersan attraversa la stessa pipeline controllata. Lo schema qui sotto rispecchia i checkpoint reali che i vostri dati attraversano."}
            </p>
          </RevealOnScroll>
        </div>

        {/* position: relative so the focusable hotspot OVERLAY (a DOM sibling
            of the role="img" div, never a child) can lay over the SVG's stage
            boxes. The overlay matches the SVG's rendered content box: it is
            inset by the card padding (p-6 sm:p-8) so inset-0 inside it lands on
            the SVG rect, not the card border. */}
        <div className="relative">
          <div
            role="img"
            aria-label={ariaLabel}
            className="w-full rounded-xl border border-rule/70 bg-surface/40 p-6 sm:p-8"
          >
            {/* Desktop horizontal */}
            <div className="hidden sm:block w-full overflow-x-auto">
              <PipelineDiagram
                mobile={false}
                stageLabel={stageLabel}
                link={desktopLink}
              />
            </div>

            {/* Mobile vertical */}
            <div className="sm:hidden w-full">
              <PipelineDiagram mobile stageLabel={stageLabel} link={mobileLink} />
            </div>
          </div>

          {/* Focusable, keyboard-navigable stage hotspots (ADDITIVE to the SVG
              role=img diagram above). Kept OUTSIDE (a SIBLING of) the role="img"
              wrapper: that element collapses its whole subtree into one
              presentational image for assistive tech, which would hide these
              real interactive buttons. Rendered as a TRANSPARENT overlay over
              the SVG stage boxes — no visible duplicate row. The padding insets
              align the overlay's inset-0 with the SVG content box. Separate
              desktop/mobile instances so each maps the matching viewBox AND
              carries the matching StageLink to its visibility-paired diagram.
              Tab Input→Output; bilingual aria-labels reuse the frozen
              STAGE_LABELS/REGULATIONS. Focus/hover ignites the stage in the
              SVG on every tier (plus the store bump for the retired WebGPU
              echo's contract). */}
          <div className="pointer-events-none absolute inset-0 hidden p-6 sm:block sm:p-8">
            <PipelineHotspots
              isEn={isEn}
              stageLabel={stageLabel}
              mobile={false}
              link={desktopLink}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 p-6 sm:hidden">
            <PipelineHotspots
              isEn={isEn}
              stageLabel={stageLabel}
              mobile
              link={mobileLink}
            />
          </div>
        </div>

        <p className="mt-5 text-xs text-ink-mute leading-[1.55]">
          {isEn
            ? "GDPR · EU AI Act · DORA · ISO 27001 — each checkpoint backed by the regulation it satisfies."
            : "GDPR · EU AI Act · DORA · ISO 27001 — ogni checkpoint coperto dalla normativa che soddisfa."}
        </p>
      </div>
    </section>
  );
}
