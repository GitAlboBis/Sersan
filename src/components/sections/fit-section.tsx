"use client";

import { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, X } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * FitSection: "Selective on purpose".
 *
 * Two equal columns: good-fit signals on the left, not-a-fit signals on
 * the right. This section is deliberately disqualifying: it is how a
 * studio that values its time signals seriousness. CTOs read the not-a-fit
 * column more carefully than the good-fit column.
 *
 * PRESENTATION (cards/scroll refactor, package D — reimplementation of the
 * Codrops "On-Scroll SVG Filter Effect" technique, MIT):
 *   - Every row leads with a ✓/✗ MEDALLION revealed through an SVG <mask>
 *     whose white circle radius is scrubbed 0→final. The circle is passed
 *     through a STATIC feTurbulence(fractalNoise 0.06, 2 octaves) →
 *     feDisplacementMap(scale 40) chain, so the growing edge boils like
 *     ink — the noise field never animates, only the shape moving through
 *     it does. Radius writes are integer-quantized attr sets (each change
 *     re-rasterizes the filter on the CPU; identical values are skipped).
 *   - NOT-A-FIT rows additionally arrive REDACTED: a solid ink bar covers
 *     the row and TEARS AWAY left→right as the mask opens. The bar is an
 *     SVG rect whose `x` is scrubbed off-canvas through the same filter
 *     chain plus feMorphology(dilate 2) for the chunky torn edge. The real
 *     text is in the DOM at all times (the bar is an aria-hidden overlay),
 *     so SSR / crawlers / screen readers always get plain readable copy.
 *   - Row text follows inside the same scrubbed window with transform-only
 *     motion (y + opacity on the good column, y only on the redacted one —
 *     there the bar IS the entrance).
 *   - The title's italic span plays the template's Flip move WITHOUT DOM
 *     re-parenting (React owns the nodes): an invisible, aria-hidden proxy
 *     marks the centered pose; we measure proxy↔span deltas ONCE per
 *     refresh (never per frame) and scrub x/y/scale from the 1.4× centered
 *     pose into the real layout slot, ease:none.
 *   - One master ScrollTrigger scrubs a staggered timeline for all rows
 *     (windows: good row i at t=i, warn row i at t=i+0.45, each 1 unit
 *     long) so AT MOST 3 SVG filters rasterize concurrently — the hard
 *     budget for CPU-side feDisplacementMap. scrub:true, never a number:
 *     Lenis already smooths the scroll the progress derives from.
 *   - SSR + prefers-reduced-motion + coarse pointers render the FINAL
 *     state statically (masks open, bars gone, rows visible): the effect
 *     only arms the initial covered state on capable clients.
 *
 * Hovering one column dims the other via the `fit-grid`/`fit-col`
 * sibling-hover rule (CSS only), unchanged from the previous version.
 */

const GOOD_FIT_EN = [
  "You have a real workflow with cost or revenue tied to it.",
  "You have an internal owner who'll run the system after handover.",
  "You're moving prototype → production, or hardening live AI.",
  "You're regulated (or about to be) and want to be ready.",
  "You're technical, or have technical authority on the team.",
  "You can budget for senior engineering, not just license costs.",
];

const GOOD_FIT_IT = [
  "Avete un workflow reale con costi o ricavi che ne dipendono.",
  "Avete un referente interno che gestirà il sistema dopo il passaggio di consegne.",
  "State portando un prototipo in produzione, o irrobustendo un'AI già live.",
  "Siete regolamentati (o lo sarete a breve) e volete farvi trovare pronti.",
  "Siete tecnici, o avete autorità tecnica nel team.",
  "Potete mettere a budget ingegneria senior, non solo i costi di licenza.",
];

const NOT_A_FIT_EN = [
  "You want a chatbot gimmick for a press release.",
  "No internal owner, no roadmap, no operational plan.",
  "You're at the slide-deck stage with no engineering budget.",
  "You want to skip compliance to ship faster.",
  "You need a partner to convince your CTO this is a good idea.",
  "“Can you do it for equity?”",
];

const NOT_A_FIT_IT = [
  "Volete un chatbot d'effetto per un comunicato stampa.",
  "Nessun referente interno, nessuna roadmap, nessun piano operativo.",
  "Siete alla fase di slide-deck, senza budget per l'ingegneria.",
  "Volete saltare la compliance per rilasciare più in fretta.",
  "Vi serve un partner per convincere il vostro CTO che sia una buona idea.",
  "«Lo fareste in cambio di equity?»",
];

/* ------------------------------------------------------------------ *
 *  Scrub choreography constants (all resolution-independent SVG user
 *  units, except the viewport-fraction scroll windows).
 * ------------------------------------------------------------------ */

/** Medallion viewBox is 200×200; the disc is r=88. Final mask radius must
 *  cover disc + stroke + the ±40 displacement excursion of the edge. */
const MEDALLION_R_FINAL = 140;
/** Redaction bar viewBox (stretched over the row pill, aspect-agnostic). */
const BAR_W = 400;
const BAR_H = 64;
/** Bar rest-out x: past the right edge + displacement/dilate margin, so
 *  the torn edge fully clears the viewBox when the scrub completes. */
const BAR_X_OUT = 440;
/** Timeline geometry: one unit per row window; the warn column lags its
 *  paired good row by 0.45 so concurrent filter count never exceeds 3
 *  (good mask ×1 + warn mask ×1 + warn bar ×1). */
const ROW_STEP = 1;
const WARN_LAG = 0.45;
/** Bar tear runs inside the row window (starts late, ends before it). */
const BAR_DELAY = 0.12;
const BAR_DURATION = 0.85;
/** Title pose: starting scale of the italic span at the centered proxy. */
const POSE_SCALE = 1.4;
/** Scroll window lengths as viewport-height fractions (explicit px via a
 *  function-based `end`, so refreshes stay deterministic — a bare "+=70%"
 *  would resolve against the trigger's height, not the viewport). */
const ROWS_WINDOW_VH = 0.7;
const POSE_WINDOW_VH = 0.35;

/** Integer-quantized SVG attribute writer. Quantizing (a) matches the
 *  template's discrete attr interpolation and (b) lets us skip identical
 *  writes — every accepted write re-rasterizes the displacement filter. */
function quantizedAttrWriter(el: Element, attr: string) {
  let last = Number.NaN;
  return (value: number) => {
    const q = Math.round(value);
    if (q === last) return;
    last = q;
    el.setAttribute(attr, String(q));
  };
}

/**
 * Per-row ✓/✗ medallion. A white circle inside a <mask>, displaced by a
 * static fractal-noise field; the scrub grows `r` from 0 so the medallion
 * boils into existence. SSR ships the mask fully open (final state) — the
 * effect arms r=0 only on capable clients. One filter per medallion, ids
 * sanitized from useId (duplicated ids silently break masks).
 */
function FitMedallion({ kind }: { kind: "good" | "warn" }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `fit-medal-f-${uid}`;
  const maskId = `fit-medal-m-${uid}`;
  const good = kind === "good";
  const tone = good ? "hsl(var(--accent))" : "hsl(36 84% 62%)";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      className="mt-2 h-[22px] w-[22px] shrink-0"
    >
      <defs>
        <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.06"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="40"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="200"
          height="200"
        >
          <circle
            data-fit-mask
            cx="100"
            cy="100"
            r={MEDALLION_R_FINAL}
            style={{ fill: "#fff", filter: `url(#${filterId})` }}
          />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <circle
          cx="100"
          cy="100"
          r="88"
          strokeWidth="6"
          style={{
            fill: good ? "hsl(var(--accent) / 0.15)" : "hsl(36 84% 56% / 0.1)",
            stroke: good
              ? "hsl(var(--accent) / 0.5)"
              : "hsl(36 84% 56% / 0.32)",
          }}
        />
        {good ? (
          <path
            d="M62 104 L90 132 L140 72"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ fill: "none", stroke: tone }}
          />
        ) : (
          <path
            d="M72 72 L128 128 M128 72 L72 128"
            strokeWidth="12"
            strokeLinecap="round"
            style={{ fill: "none", stroke: tone }}
          />
        )}
      </g>
    </svg>
  );
}

/**
 * Torn-away redaction bar for the NOT-A-FIT rows (built locally — the
 * shared fx/redacted-reveal stays untouched). An ink rect stretched over
 * the row pill; the scrub slides `x` off-canvas through turbulence →
 * displacement → feMorphology(dilate 2), so the retreating LEFT edge reads
 * as paper tearing (the fixed noise field boils the moving edge; dilate
 * chunks it). SSR ships x = BAR_X_OUT (bar gone, text readable).
 */
function TornRedactionBar() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `fit-tear-${uid}`;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${BAR_W} ${BAR_H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.06"
            numOctaves="2"
            result="noise"
          />
          {/* Displacement is tuned below the medallion's 40: the bar's
              viewBox is non-uniformly stretched (400×64 over a ~450×40px
              pill), so 40 user-units would shred half the bar height. */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="28"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displacement"
          />
          <feMorphology operator="dilate" radius="2" in="displacement" />
        </filter>
      </defs>
      {/* Width == viewBox width: the right edge always hangs past the SVG
          viewport (clipped straight, invisible), so `x` is the ONLY attr
          the scrub touches and the left edge is the only torn one. */}
      <rect
        data-fit-bar
        x={BAR_X_OUT}
        y="3"
        width={BAR_W}
        height={BAR_H - 6}
        rx="4"
        style={{
          fill: "hsl(var(--ink) / 0.92)",
          filter: `url(#${filterId})`,
        }}
      />
    </svg>
  );
}

export default function FitSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const goodFit = isEn ? GOOD_FIT_EN : GOOD_FIT_IT;
  const notAFit = isEn ? NOT_A_FIT_EN : NOT_A_FIT_IT;

  const headingRef = useRef<HTMLDivElement | null>(null);
  const poseProxyRef = useRef<HTMLSpanElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Scrub choreography. Re-armed per language: the copy swaps in place and
  // the <h2> subtree remounts (SectionHeading keys it by language), so the
  // pose span must be re-resolved and the row windows replayed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const headingWrap = headingRef.current;
    const proxy = poseProxyRef.current;
    const grid = gridRef.current;
    if (!headingWrap || !grid) return;

    // Reduced motion / coarse pointers keep the SSR markup: final state,
    // no filters ever animating (same gate as the pinned rails).
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    /* ---- Row reveals: one master trigger, staggered windows ---------- */

    interface RowTarget {
      inner: HTMLElement;
      good: boolean;
      writeMask: (v: number) => void;
      writeBar: ((v: number) => void) | null;
    }

    const toTargets = (els: HTMLElement[]): RowTarget[] =>
      els.map((el) => {
        const mask = el.querySelector<SVGCircleElement>("[data-fit-mask]");
        const bar = el.querySelector<SVGRectElement>("[data-fit-bar]");
        return {
          inner: el,
          good: el.dataset.fitRow === "good",
          writeMask: mask ? quantizedAttrWriter(mask, "r") : () => {},
          writeBar: bar ? quantizedAttrWriter(bar, "x") : null,
        };
      });

    const rows = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-fit-row]"),
    );
    const goodTargets = toTargets(rows.filter((r) => r.dataset.fitRow === "good"));
    const warnTargets = toTargets(rows.filter((r) => r.dataset.fitRow === "warn"));

    // Arm the covered initial state imperatively BEFORE the trigger exists
    // (timeline children later than the playhead never render their start
    // values, and the SSR markup ships the FINAL state on purpose). The
    // trigger created below immediately re-renders at the real scrubbed
    // progress, which also covers reloads that restore a mid-page scroll.
    const arm = (t: RowTarget) => {
      t.writeMask(0);
      t.writeBar?.(0);
      gsap.set(t.inner, t.good ? { y: 16, autoAlpha: 0 } : { y: 16 });
    };
    goodTargets.forEach(arm);
    warnTargets.forEach(arm);

    const tl = gsap.timeline({ defaults: { ease: "none" } });
    const addRow = (t: RowTarget, at: number) => {
      // Text follow — transform/opacity only. The redacted rows keep full
      // opacity: there the tearing bar IS the entrance.
      if (t.good) {
        tl.fromTo(
          t.inner,
          { y: 16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 1 },
          at,
        );
      } else {
        tl.fromTo(t.inner, { y: 16 }, { y: 0, duration: 1 }, at);
      }
      // Medallion mask radius — proxy tween + quantized attr write.
      const m = { r: 0 };
      tl.fromTo(
        m,
        { r: 0 },
        {
          r: MEDALLION_R_FINAL,
          duration: 1,
          onUpdate: () => t.writeMask(m.r),
        },
        at,
      );
      // Redaction tear — starts late in the window, ends inside it.
      if (t.writeBar) {
        const wb = t.writeBar;
        const b = { x: 0 };
        tl.fromTo(
          b,
          { x: 0 },
          {
            x: BAR_X_OUT,
            duration: BAR_DURATION,
            onUpdate: () => wb(b.x),
          },
          at + BAR_DELAY,
        );
      }
    };
    // Stagger: good i at t=i, warn i at t=i+0.45 ⇒ at any playhead position
    // the live filters are at most {good mask, warn mask, warn bar} = 3.
    goodTargets.forEach((t, i) => addRow(t, i * ROW_STEP));
    warnTargets.forEach((t, i) => addRow(t, i * ROW_STEP + WARN_LAG));

    const stRows = ScrollTrigger.create({
      trigger: grid,
      start: "clamp(top bottom-=10%)",
      end: () => "+=" + Math.round(window.innerHeight * ROWS_WINDOW_VH),
      scrub: true, // raw — Lenis is the only smoother (double-smoothing gotcha)
      animation: tl,
    });

    /* ---- Title pose: centered/1.4× proxy → real layout slot ---------- */

    // The italic span lives inside SectionHeading's <h2>, which SplitText
    // temporarily rewraps (and may orphan on revert / language swap), so the
    // node is re-resolved whenever the cached one leaves the document —
    // an O(1) isConnected check per write, never a per-frame rect read.
    let poseSpan: HTMLElement | null = null;
    let setPose: ReturnType<typeof gsap.quickSetter> | null = null;
    const ensureSpan = () => {
      if (poseSpan && poseSpan.isConnected) return;
      poseSpan = headingWrap.querySelector<HTMLElement>("[data-fit-pose]");
      setPose = poseSpan ? gsap.quickSetter(poseSpan, "css") : null;
    };

    const pose = { dx: 0, dy: 0 };
    const poseProps = { x: 0, y: 0, scale: 1 };
    const applyPose = (p: number) => {
      ensureSpan();
      if (!setPose) return;
      const inv = 1 - p;
      poseProps.x = pose.dx * inv;
      poseProps.y = pose.dy * inv;
      poseProps.scale = 1 + (POSE_SCALE - 1) * inv;
      setPose(poseProps);
    };

    // Measured ONCE per refresh (onRefreshInit), with the span's transform
    // flattened first — rects include transforms. Scaling happens about the
    // span's center, so the deltas are scale-independent.
    const measurePose = () => {
      ensureSpan();
      if (!poseSpan || !proxy) return;
      gsap.set(poseSpan, { x: 0, y: 0, scale: 1 });
      const sr = poseSpan.getBoundingClientRect();
      const pr = proxy.getBoundingClientRect();
      pose.dx = pr.left + pr.width / 2 - (sr.left + sr.width / 2);
      pose.dy = pr.top + pr.height / 2 - (sr.top + sr.height / 2);
    };
    measurePose();

    // Arm the starting pose imperatively BEFORE the trigger exists — same
    // pitfall as the rows above: the fromTo's immediate render suppresses
    // events, and a scrub sync onto a playhead that is ALREADY at the target
    // progress (0 when the section is below the fold) never renders, so
    // applyPose would not run until the first tick past `start` — a visible
    // teleport of the italic span. The trigger below re-syncs any restored
    // mid-page scroll position.
    applyPose(0);

    const poseState = { p: 0 };
    const poseTween = gsap.fromTo(
      poseState,
      { p: 0 },
      { p: 1, ease: "none", onUpdate: () => applyPose(poseState.p) },
    );

    const stPose = ScrollTrigger.create({
      trigger: headingWrap,
      start: "clamp(top bottom-=10%)",
      end: () => "+=" + Math.round(window.innerHeight * POSE_WINDOW_VH),
      scrub: true,
      animation: poseTween,
      invalidateOnRefresh: true,
      onRefreshInit: measurePose,
      // measurePose flattens the span's transform to read clean rects; if the
      // refresh leaves progress unchanged the scrub never re-renders, so
      // re-apply the last scrubbed pose explicitly (idempotent with onUpdate).
      onRefresh: () => applyPose(poseState.p),
    });

    // Late re-measure once webfonts land AND SectionHeading's SplitText
    // intro has reverted (~1.6s): the display serif changes the span's slot,
    // and measuring mid-split would read a line-shifted rect. The provider
    // deliberately never refreshes ScrollTrigger on "/", so the section owns
    // this one-shot (refresh() is global and idempotent — the rails' own
    // onRefreshInit measures self-heal on the same pass).
    let cancelled = false;
    let fontTimer = 0;
    document.fonts?.ready
      .then(() => {
        if (cancelled) return;
        fontTimer = window.setTimeout(() => {
          if (!cancelled) ScrollTrigger.refresh();
        }, 1800);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      window.clearTimeout(fontTimer);
      stRows.kill();
      stPose.kill();
      tl.kill();
      poseTween.kill();
      // Leave the DOM in the readable FINAL state (same markup SSR ships):
      // masks open, bars torn away, transforms/opacity cleared.
      const settle = (t: RowTarget) => {
        t.writeMask(MEDALLION_R_FINAL);
        t.writeBar?.(BAR_X_OUT);
        gsap.set(t.inner, { clearProps: "transform,opacity,visibility" });
      };
      goodTargets.forEach(settle);
      warnTargets.forEach(settle);
      ensureSpan();
      if (poseSpan) gsap.set(poseSpan, { clearProps: "transform" });
    };
  }, [language]);

  return (
    <section
      id="fit"
      className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
    >
      <SectionGlow position="top-left" intensity={1} size="50rem" />
      <div className="container-px relative">
        {/* Heading wrapper spans the full container so the invisible pose
            proxy can mark a CENTERED stage position; SectionHeading itself
            keeps its usual measure. The italic span carries data-fit-pose
            (inline-block so transforms apply) and scrubs from the proxy's
            centered/1.4× pose into its natural slot in the sentence. */}
        <div ref={headingRef} className="relative mb-12 sm:mb-16">
          <SectionHeading
            eyebrow={isEn ? "Selective on purpose" : "Selettivi per scelta"}
            title={
              isEn ? (
                <>
                  We are honest about{" "}
                  <span
                    data-fit-pose
                    className="inline-block will-change-transform font-display italic text-ink"
                  >
                    who we work with.
                  </span>
                </>
              ) : (
                <>
                  Siamo onesti su{" "}
                  <span
                    data-fit-pose
                    className="inline-block will-change-transform font-display italic text-ink"
                  >
                    con chi lavoriamo.
                  </span>
                </>
              )
            }
            description={
              isEn
                ? "A clear no protects both of us. About a third of scoping calls end with us recommending you don't engage SerSan: sometimes because it's the wrong moment, sometimes because we're the wrong studio."
                : "Un no chiaro tutela entrambi. Circa un terzo delle scoping call si chiude con la nostra raccomandazione di non ingaggiare SerSan: a volte perché è il momento sbagliato, a volte perché siamo lo studio sbagliato."
            }
            className="max-w-3xl"
          />
          {/* Invisible proxy — the "before" pose the italic span scrubs in
              from. Measured, never shown; copy duplicated here is aria-hidden
              and invisible (not user-facing). */}
          <span
            ref={poseProxyRef}
            aria-hidden="true"
            className="invisible pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 whitespace-nowrap heading-2 font-display italic text-ink"
          >
            {isEn ? "who we work with." : "con chi lavoriamo."}
          </span>
        </div>

        {/* Two columns. Each row reveals in its own scrub window: the ✓/✗
            medallion boils in through a displacement-filtered circle mask,
            the text follows transform-only, and the not-a-fit rows arrive
            covered by an ink bar that tears away as the mask opens (the
            de-classification metaphor: this column is what we refuse).
            Hovering one column dims the other via the `fit-grid`/`fit-col`
            sibling-hover rule (CSS only). Reduced motion / coarse pointers /
            SSR show the settled final state. */}
        <div
          ref={gridRef}
          className="fit-grid grid grid-cols-1 lg:grid-cols-2 gap-px bg-[hsl(var(--rule))] border border-[hsl(var(--rule))] rounded-lg overflow-hidden"
        >
          {/* Good fit column */}
          <div className="fit-col fit-col--good bg-[hsl(var(--bg))] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span
                aria-hidden="true"
                className="fit-icon flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(var(--accent)/0.15)] border border-[hsl(var(--accent)/0.5)] shadow-[0_0_0_0_hsl(var(--accent)/0)]"
                style={{ ["--fit-glow" as string]: "var(--accent)" }}
              >
                <Check className="w-3 h-3 text-[hsl(var(--accent))]" aria-hidden="true" />
              </span>
              <h3 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink">
                {isEn ? "Good fit" : "Buon fit"}
              </h3>
            </div>
            <ul className="flex flex-col gap-3.5">
              {goodFit.map((line, i) => (
                <li key={i}>
                  <div
                    data-fit-row="good"
                    className="flex items-start gap-3 will-change-transform"
                  >
                    <FitMedallion kind="good" />
                    <p className="fit-good flex-1 rounded-md px-3 py-2 text-[14px] sm:text-[15px] text-ink leading-relaxed">
                      {line}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Not a fit column */}
          <div className="fit-col fit-col--warn bg-[hsl(var(--bg))] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span
                aria-hidden="true"
                className="fit-icon flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(36_84%_56%/0.1)] border border-[hsl(36_84%_56%/0.32)]"
                style={{ ["--fit-glow" as string]: "36 84% 56%" }}
              >
                <X className="w-3 h-3 text-[hsl(36_84%_62%)]" aria-hidden="true" />
              </span>
              <h3 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute">
                {isEn ? "Not a fit" : "Non è un fit"}
              </h3>
            </div>
            <ul className="flex flex-col gap-3.5">
              {notAFit.map((line, i) => (
                <li key={i}>
                  <div
                    data-fit-row="warn"
                    className="flex items-start gap-3 will-change-transform"
                  >
                    <FitMedallion kind="warn" />
                    {/* The row stays fully visible — the torn redaction bar
                        IS the entrance. Real text always in the DOM; the bar
                        overlay is aria-hidden and pointer-transparent. */}
                    <div className="relative flex-1">
                      <p className="fit-warn rounded-md px-3 py-2 text-[14px] sm:text-[15px] text-ink-mute leading-relaxed">
                        {line}
                      </p>
                      <TornRedactionBar />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Plain closer — the /start button that lived here was removed in
            the restyle-step-2 CTA dedupe (FinalCTA sits right below this
            section, past the gateway gap). */}
        <div className="mt-10 sm:mt-12">
          <p className="text-[14px] text-ink-mute max-w-md">
            {isEn ? (
              <>
                If you&apos;re unsure, book the call. We&apos;ll tell you
                quickly, and in writing.
              </>
            ) : (
              <>
                Se avete dubbi, prenotate la call. Ve lo diremo in fretta, e per
                iscritto.
              </>
            )}
          </p>
        </div>
      </div>

      <style>{`
        /* Check / X icon scales up with a glow on mount. */
        .fit-icon {
          transform: scale(0.6);
          opacity: 0;
          animation: fit-icon-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
        }
        @keyframes fit-icon-in {
          0%   { transform: scale(0.6); opacity: 0; box-shadow: 0 0 0 0 hsl(var(--fit-glow) / 0); }
          60%  { transform: scale(1.12); opacity: 1; box-shadow: 0 0 14px 2px hsl(var(--fit-glow) / 0.45); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 8px 0 hsl(var(--fit-glow) / 0.25); }
        }

        /* Hovering one column dims the sibling column (focus the read). */
        .fit-col { transition: opacity 350ms cubic-bezier(0.215, 0.61, 0.355, 1); }
        @media (hover: hover) and (pointer: fine) {
          .fit-grid:has(.fit-col--good:hover) .fit-col--warn,
          .fit-grid:has(.fit-col--warn:hover) .fit-col--good {
            opacity: 0.45;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fit-icon {
            transform: none;
            opacity: 1;
            animation: none;
            box-shadow: none;
          }
          .fit-col { transition: none; }
        }
      `}</style>
    </section>
  );
}
