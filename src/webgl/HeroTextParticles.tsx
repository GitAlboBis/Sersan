"use client";

/**
 * HeroTextParticles — the Lusion-style scroll-hijacked text intro.
 *
 * ENTRY (automatic, time-driven — ICS-media particle-text choreography): the
 * moment the preloader lifts, "Sersan AI" assembles ITSELF out of a noisy
 * scattered particle field — left→right staggered wave (delay = normalized
 * glyph x), per-particle alpha fade-in, spring + transit turbulence shaping
 * each flight. No scroll input is needed or counted during the entrance
 * (the gate locks the page and only shakes the camera).
 *
 * SCROLL (gate-driven): once assembled, wheel/touch accumulates
 * textMorphStore.gateProgress — the brand HOLDS as particles, then
 * recomposes into the real localized headline shape, holds again, and the
 * crisp DOM H1 cross-fades in. The DOM [data-hero-brand] element stays
 * invisible forever (opacity 0 — layout anchor + typography source only).
 * The camera keeps its alive scroll shake via gateKick while document
 * scroll stays at zero. Fully reversible back to the assembled brand.
 *
 * Mounts its sim ONLY when: true WebGPU compute backend + fonts ready + the
 * desktop pinned H1 + brand elements exist. Every other path leaves
 * textMorphStore inactive → no scroll gate, DOM hero exactly as before.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { WORLD_VIEW_HEIGHT } from "./constants";
import {
  sampleTextPoints,
  wrapTextToLines,
  type TextSpec,
} from "./text/sampleTextPoints";
import { webgpuEnabled } from "./renderer/createRenderer";
import { useIntroStore } from "./store/introStore";
import { useTextMorphStore } from "./store/textMorphStore";
import type { SceneTier } from "./store/tierStore";

interface HeroTextParticlesProps {
  tier: Exclude<SceneTier, "off">;
}

// ENTRY clock (seconds): the automatic "Sersan AI" assemble on site entry —
// time-driven, NOT scroll-driven (user decision 2026-06-10). ~3.6s mirrors
// the ICS-media reference's 4s tween; the per-particle stagger + easing live
// in the sim (uAssemble + delay buffer).
const ENTRY_DURATION = 3.6;

// Gate-progress timeline (g = textMorphStore.gateProgress, smoothed locally).
// gateProgress only advances AFTER the entry assemble completes (the gate
// checks assembleDone), so g=0 always means "brand fully formed".
//
// The MORPH is NOT scrubbed (user decision 2026-06-10): scrolling past
// MORPH_TRIGGER only STARTS it — it then plays to completion on its own
// clock with the exact same staggered-wave choreography as the entry.
// Scrolling back below the trigger plays it in reverse, again on its own
// clock. The gate refuses to release the page until the headline is fully
// composed (store.morphDone), so the visitor can never out-scroll it.
//
// The payoffs HOLD against scroll, but the FINAL cue's tail is kept short so
// the page unlocks soon after "see what we build" forms (user decision
// 2026-06-17). At GATE_DISTANCE 6300px (hero-intro-gate.tsx): the brand
// "Sersan AI" holds 0→~0.30 (~1890px), the headline holds ~0.30→~0.59
// (~1830px), and the "see what we build" cue holds ~0.59→1.0 (~2580px) before
// the gate releases. No solid white DOM text anywhere: [data-hero-brand] stays
// opacity:0 forever (anchor/typography source only).
/** Scroll-intent threshold that triggers the (automatic) A→B morph
 * ("Sersan AI" → headline). */
const MORPH_TRIGGER = 0.3;
/** Scroll-intent threshold that triggers the SECOND (and FINAL) morph B→C
 * (headline → "see what we build" at the BOTTOM). Only fires once the first
 * morph has composed. Pushed later (0.44→0.59) to shorten the post-cue tail
 * so the page unlocks sooner once the cue is formed. */
const MORPH2_TRIGGER = 0.59;
/** Seconds for the one-shot morph animation (entry-style wave). Shared by
 * all morph legs. */
const MORPH_DURATION = 2.6;
/** FINAL cue: the headline dissolves into this, recomposed near the BOTTOM
 * (replacing the old standalone "scroll" hint). Sampled smaller than the
 * headline; its home block is pushed DOWN by CUE_OFFSET_Y view-heights so the
 * particles travel downward to form it where the old scroll hint lived. */
const CUE_TEXT = "see what we build";
/** View-heights below center where "see what we build" homes. The old "scroll"
 * cue used -0.38; "see what we build" is longer so it sits a touch higher. */
const CUE_OFFSET_Y = -0.34;
/** White-panel cascade window (paragraph → chips → CTAs stagger in over the
 * last gate stretch, gated on the morph having actually composed). The 3D
 * camera-descent beat now lives at the END of the cinematic spine
 * (SpineExitGate in cinematic-system-scroll.tsx), not here. */
const REVEAL_START = 0.8;
const REVEAL_END = 0.92;

const COUNT_BY_TIER: Record<"full" | "lite", number> = {
  full: 26000,
  lite: 12000,
};

interface MorphBuild {
  geometry: THREE.InstancedBufferGeometry;
  material: THREE.Material;
  uMorph: { value: number };
  uMorph2: { value: number };
  uMorph3: { value: number };
  uFade: { value: number };
  uSpread: { value: number };
  uAssemble: { value: number };
  uSizeComp: { value: number };
  uSizeComp2: { value: number };
  uSizeComp3: { value: number };
  uPointSize: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  tick: (p: { dt: number; time: number }) => void;
  dispose: () => void;
}

export function HeroTextParticles({ tier }: HeroTextParticlesProps) {
  const { camera, size, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const h1Ref = useRef<HTMLElement | null>(null);
  const brandRef = useRef<HTMLElement | null>(null);
  const timeRef = useRef(0);
  const gSmoothRef = useRef(0);
  // Entry-assemble clock 0..1. Persists across rebuilds (resize / language
  // switch re-run the build effect but never unmount the component), and is
  // pre-completed when a previous mount already played the entrance
  // (store.assembleDone is page-lifetime) — the entry plays ONCE per load.
  const entryRef = useRef(0);
  // One-shot morph clock 0..1 (brand → headline). Scroll only flips its
  // direction (forward past MORPH_TRIGGER, reverse below); it advances on
  // its own time like the entry. Persists across rebuilds like entryRef.
  const morphTRef = useRef(0);
  // Second (and FINAL) morph clock 0..1 (headline → "see what we build" at the
  // bottom). Same one-shot, time-driven, reversible behaviour as morphTRef;
  // persists across rebuilds.
  const morph2TRef = useRef(0);
  // Per-leg completion LATCHES (FIX 2). A leg's target is normally a pure
  // function of the smoothed gate progress `g`, so it reverses whenever `g`
  // dips back below the trigger. At unlock the gate hands the page back
  // (gateProgress→1, release) then re-engages in reverse on the next up-scroll,
  // dragging `g` back DOWN across the triggers — which would un-build and
  // rebuild a just-completed leg ("scroll" replay bug). Once a leg has finished
  // AND the gate has fully handed off (gateProgress >= 1), latch it so its
  // target is pinned at 1 and the advance block can never reverse it. The latch
  // engages ONLY after completion+handoff, so scrolling up BEFORE a leg
  // finishes still reverses normally. Cleared only on a genuine full-intro
  // replay (assembleDone observed false at build time).
  const morph1LatchedRef = useRef(false);
  const morph2LatchedRef = useRef(false);
  const [build, setBuild] = useState<MorphBuild | null>(null);
  // Bumped by the MutationObserver on language switch → resample + rebuild.
  const [textEpoch, setTextEpoch] = useState(0);

  const count = COUNT_BY_TIER[tier] ?? COUNT_BY_TIER.lite;

  // World units per CSS pixel at the z=0 content plane (camera at CAMERA_Z).
  // Held in a REF, not a build dep: R3F publishes `size` on every
  // ResizeObserver tick (Scene passes no `resize` prop → debounce 0), so
  // depending on it directly rebuilt the whole 26k sim on every pixel of a
  // window drag. The build reads the ref, so it always samples at the CURRENT
  // metrics whenever a rebuild actually is warranted (see sizeEpoch below).
  const worldPerPx = WORLD_VIEW_HEIGHT / size.height;
  const worldPerPxRef = useRef(worldPerPx);
  worldPerPxRef.current = worldPerPx;

  // Quantized resize signal: only a MEANINGFUL viewport change (>5% on either
  // axis) bumps the epoch and re-samples the text. Sub-threshold ticks — a slow
  // window-edge drag, the mobile URL bar collapsing — leave the sim alone. The
  // bump is also debounced ~200ms so a drag rebuilds once at the end rather
  // than at each 5% step.
  const lastSizeRef = useRef({ w: 0, h: 0 });
  const [sizeEpoch, setSizeEpoch] = useState(0);
  useEffect(() => {
    const { w, h } = lastSizeRef.current;
    // First observation: seed the baseline WITHOUT bumping — the build effect
    // already runs at mount with these exact metrics, so a bump here would only
    // buy a redundant 26k rebuild 200ms into the intro.
    if (!w || !h) {
      lastSizeRef.current = { w: size.width, h: size.height };
      return;
    }
    if (
      Math.abs(size.width - w) / w < 0.05 &&
      Math.abs(size.height - h) / h < 0.05
    ) {
      return;
    }
    const id = window.setTimeout(() => {
      lastSizeRef.current = { w: size.width, h: size.height };
      setSizeEpoch((e) => e + 1);
    }, 200);
    return () => window.clearTimeout(id);
  }, [size.width, size.height]);

  // === Build: sample brand + headline from the live DOM, spin up the sim ===
  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: MorphBuild | null = null;
    let observer: MutationObserver | null = null;

    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./gpgpu/gpgpuNodeSim"),
      document.fonts?.ready ?? Promise.resolve(),
    ]).then(([webgpu, tslNs, mod]) => {
      if (cancelled) return;
      // True-WebGPU compute only (storage indexing no-ops on WebGL2, #31221).
      const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } })
        .backend;
      const isWebGPUBackend =
        !!bk &&
        bk.isWebGLBackend !== true &&
        typeof (gl as unknown as { compute?: unknown }).compute === "function";
      if (!isWebGPUBackend) return;

      const h1 = document.querySelector<HTMLElement>("[data-hero-headline]");
      const brand = document.querySelector<HTMLElement>("[data-hero-brand]");
      if (!h1 || !brand) return; // mobile fallback / interior route → inactive
      h1Ref.current = h1;
      brandRef.current = brand;

      // --- HEADLINE sample, with the H1's computed typography ---------------
      const cs = getComputedStyle(h1);
      const fontSizePx = parseFloat(cs.fontSize) || 64;
      const ls = parseFloat(cs.letterSpacing);
      const headlineSpecBase = {
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight || "500",
        fontSizePx,
        lineHeightPx: fontSizePx * 0.98,
        letterSpacingPx: Number.isFinite(ls) ? ls : 0,
      };
      const headlineText = (h1.textContent ?? "").replace(/\s+/g, " ").trim();
      const maxW = Math.max(h1.clientWidth, 200);
      const headlineSpec: TextSpec = {
        ...headlineSpecBase,
        lines: wrapTextToLines(headlineText, headlineSpecBase, maxW),
      };

      // --- BRAND sample, with the big [data-hero-brand]'s own typography ----
      const bcs = getComputedStyle(brand);
      const brandSizePx = parseFloat(bcs.fontSize) || 120;
      const bls = parseFloat(bcs.letterSpacing);
      const brandSpec: TextSpec = {
        fontFamily: bcs.fontFamily,
        fontWeight: bcs.fontWeight || "500",
        fontSizePx: brandSizePx,
        lineHeightPx: brandSizePx,
        letterSpacingPx: Number.isFinite(bls) ? bls : 0,
        lines: [(brand.textContent ?? "Sersan AI").trim()],
      };

      const a = sampleTextPoints(brandSpec, count);
      const b = sampleTextPoints(headlineSpec, count);

      // --- CUE sample ("see what we build") — the FINAL morph target. -------
      // Derived from the headline's own typography at a reduced size so the
      // closing cue reads smaller than the headline. Single line; its world
      // home is offset DOWN (below) so the B→C leg carries the particles toward
      // the bottom, recomposing where the old standalone "scroll" hint lived.
      const cueSpec: TextSpec = {
        ...headlineSpecBase,
        fontSizePx: headlineSpecBase.fontSizePx * 0.5,
        lineHeightPx: headlineSpecBase.fontSizePx * 0.5,
        lines: [CUE_TEXT],
      };
      const c = sampleTextPoints(cueSpec, count);

      // The instanced group anchors to the BRAND rect per frame. The headline
      // homes used to carry an offset to the H1 block; the user (2026-06-10)
      // wants the morphed "We build..." particles to recompose IN PLACE —
      // same position as "Sersan AI", not up at the H1 — so both home fields
      // share the brand block center (offset 0,0). The crisp DOM H1 still
      // fades in at its own layout spot at the very end of the gate.
      const offBx = 0;
      const offBy = 0;

      const wpp = worldPerPxRef.current;
      const toWorld = (xy: Float32Array, ox: number, oy: number) => {
        const out = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          out[i * 3] = xy[i * 2] * wpp + ox;
          out[i * 3 + 1] = xy[i * 2 + 1] * wpp + oy;
          out[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        }
        return out;
      };

      const homeAWorld = toWorld(a.xy, 0, 0);
      // "see what we build" homes near the BOTTOM (CUE_OFFSET_Y view-heights
      // below center) so the headline→cue leg carries the particles downward.
      const homeCWorld = toWorld(c.xy, 0, WORLD_VIEW_HEIGHT * CUE_OFFSET_Y);
      // Entry seed (ICS-media style): each particle starts at a noisy offset
      // from its glyph home, spread WIDER toward the left of the block
      // (ICS: `spread = (1 - nx) * 100 + 100`) so the left edge billows out
      // and forms first while the right tail streams in — combined with the
      // sim's left→right stagger this reads as the reference's travelling
      // assemble wave. If a previous mount already played the entrance,
      // seed at home instead (no replay on route round-trips).
      // FIX 3a: decide replay vs preserve from THIS instance's lifecycle, not the
      // cross-bundle store flag (which raced the provider's nav-into-home reset and
      // left the intro frozen on a route return). A fresh MOUNT (first load /
      // route-return) still has entryRef at its initial 0 → replay the whole intro;
      // an in-place REBUILD (resize / language switch) kept entryRef at 1 → preserve
      // the finished state. A session skip also preserves (jumps to the end).
      const isRebuild = entryRef.current >= 1;
      const replayDone = isRebuild || useTextMorphStore.getState().introSkipped;
      let minX = Infinity;
      let maxX = -Infinity;
      for (let i = 0; i < count; i++) {
        const x = homeAWorld[i * 3];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      const spanX = Math.max(maxX - minX, 1e-4);
      const scatter = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        if (replayDone) {
          scatter[i * 3] = homeAWorld[i * 3];
          scatter[i * 3 + 1] = homeAWorld[i * 3 + 1];
          scatter[i * 3 + 2] = homeAWorld[i * 3 + 2];
          continue;
        }
        const nx = (homeAWorld[i * 3] - minX) / spanX;
        // Random unit-ish direction with damped z; magnitude leftward-biased.
        const ang = Math.random() * Math.PI * 2;
        const mag = ((1 - nx) * 2.6 + 1.3) * (0.4 + Math.random() * 0.9);
        scatter[i * 3] = homeAWorld[i * 3] + Math.cos(ang) * mag;
        scatter[i * 3 + 1] =
          homeAWorld[i * 3 + 1] + Math.sin(ang) * mag * 0.75;
        scatter[i * 3 + 2] =
          homeAWorld[i * 3 + 2] + (Math.random() - 0.5) * 1.6;
      }

      const bm = mod.createTextMorphComputeBuild(
        gl as never,
        webgpu as never,
        tslNs as never,
        homeAWorld,
        toWorld(b.xy, offBx, offBy),
        homeCWorld,
        // gpgpu stays a 4-target compute; feed C into the 4th (homeD) slot so
        // the inert 4th target is identical to C. uMorph3 is never advanced.
        homeCWorld,
        count,
        // ICS-media-reference look (user 2026-06-10): bright glowing sprites,
        // dense enough to read as solid strokes — bigger discs, hotter
        // emissive, near-white ink.
        {
          SPRING: 42,
          DAMPING: 6.5,
          MAX_SPEED: 9,
          TURB: 14,
          POINT_SIZE: 7,
          POINT_ALPHA: 1.0,
          EMISSIVE: 4,
          COL_COLD: [1, 1, 1.0], // bright white-lavender ink
          COL_HOT: [0.4, 1, 1.0], // cyan while travelling
        },
        scatter,
      );
      built = bm as unknown as MorphBuild;
      // Resume state: a rebuild mid/after entry must not restart the wave.
      // When a previous mount already completed the intro (replayDone), pin the
      // morph clocks AND re-latch every leg (FIX 2) so a remount / nav-return
      // shows the assembled state, not a replay. On a genuine full-intro replay
      // (replayDone false — the same `assembleDone: false` reset the
      // nav-into-home path uses) clear all latches so the whole intro can play
      // (and reverse) from the top again.
      if (replayDone) {
        entryRef.current = 1;
        morphTRef.current = 1;
        morph2TRef.current = 1;
        morph1LatchedRef.current = true;
        morph2LatchedRef.current = true;
      } else {
        morph1LatchedRef.current = false;
        morph2LatchedRef.current = false;
        // FIX 3a: a fresh replay must start from a clean store, regardless of any
        // stale journey flags that survived on the globalThis-pinned store across a
        // soft route round-trip. (The provider also resets these, but this makes the
        // replay self-contained and race-proof.)
        useTextMorphStore.setState({
          assembleDone: false,
          gateProgress: 0,
          morphDone: false,
          morph2Done: false,
        });
      }
      built.uAssemble.value = entryRef.current;
      built.uMorph.value = morphTRef.current;
      built.uMorph2.value = morph2TRef.current;
      // The 4th compute target equals C (inert) — uMorph3 is set to 0 at build
      // time and never advanced, so the leg never plays.
      built.uMorph3.value = 0;
      // Ink-density compensation (uSizeComp): the same particle count covers
      // the headline's larger ink area, so points grow by ~sqrt(areaB/areaA)
      // (slight extra for the thinner strokes) as the morph settles — the
      // headline reads as bright and dense as the brand.
      built.uSizeComp.value =
        Math.min(2.4, Math.sqrt(b.inkPx / Math.max(a.inkPx, 1))) * 1.1;
      built.uSizeComp2.value =
        Math.min(2.4, Math.sqrt(c.inkPx / Math.max(a.inkPx, 1))) * 1.1;
      // uSizeComp3 stays at its default — the inert 4th target never composes.
      setBuild(built);
      useTextMorphStore.setState({ active: true, domReveal: 0 });

      // Language switch swaps the H1 text → resample (rebuild).
      observer = new MutationObserver(() => {
        const t = (h1.textContent ?? "").replace(/\s+/g, " ").trim();
        if (t && t !== headlineText) setTextEpoch((e) => e + 1);
      });
      observer.observe(h1, { childList: true, characterData: true, subtree: true });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      built?.dispose();
      setBuild(null);
      if (brandRef.current) brandRef.current.style.opacity = "0";
      // NOTE: the visual-handoff reset (active/domReveal) deliberately does NOT
      // live here — see the unmount-only effect below. This cleanup also runs on
      // an IN-PLACE rebuild (language switch, meaningful resize), and publishing
      // `active:false, domReveal:1` there is observed by the DOM side
      // (cinematic-system-scroll.tsx restores the crisp H1 + clears every
      // [data-hero-stagger] inline style), so the particle text blinked out and
      // the full white hero copy popped in at 100% for the rebuild's duration.
      // The gate/journey state (gateProgress, morphDone, …) likewise SURVIVES a
      // rebuild: the component refs (entryRef, morphTRef) persist and re-prime
      // the fresh sim's uniforms.
    };
    // Rebuild ONLY on a real change: renderer identity, particle count, a
    // quantized+debounced viewport change (sizeEpoch — NOT raw size, which ticks
    // per ResizeObserver observation), or a language swap (textEpoch). The
    // current metrics are read from worldPerPxRef inside the build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, count, sizeEpoch, textEpoch]);

  // Unmount-only visual handoff. This is the ONLY correct discriminator between
  // "the island is going away, hand the hero back to the DOM" and "the sim is
  // being rebuilt in place, keep the DOM suppressed". (entryRef >= 1 is NOT a
  // usable discriminator: it is 0 during the entry, i.e. exactly the mid-intro
  // case this protects.)
  useEffect(
    () => () => {
      useTextMorphStore.setState({ active: false, domReveal: 1 });
    },
    [],
  );

  // === Per frame: gate-driven timeline ======================================
  const scratch = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    if (!build) {
      group.visible = false;
      return;
    }
    const delta = Math.min(rawDelta, 1 / 30);

    // HOLD until the preloader curtain lifts: the sim doesn't tick, so the
    // scattered seed stays frozen and the cloud settles ON SCREEN.
    if (!useIntroStore.getState().introComplete) {
      group.visible = false;
      return;
    }

    // --- Intro skip (double wheel-flick / session flag): jump every clock
    // to its end state ONCE. The clocks live in refs (persist across
    // rebuilds), so this also covers fresh builds on later home visits when
    // the provider pinned the store at its end state. After the jump the
    // normal derivations below keep morphDone/morph2Done true and domReveal at
    // 1 — the timeline stays deterministic (g is pinned at 1, nothing can flip
    // a direction back). The FINAL stage is now morph2 ("see what we build" at
    // the bottom); uMorph3 stays 0 (inert 4th target).
    if (useTextMorphStore.getState().introSkipped && morph2TRef.current < 1) {
      entryRef.current = 1;
      morphTRef.current = 1;
      morph2TRef.current = 1;
      gSmoothRef.current = 1;
      build.uAssemble.value = 1;
      build.uMorph.value = 1;
      build.uMorph2.value = 1;
    }

    // --- ENTRY clock: the automatic assemble, time-driven ----------------
    // Advances once the curtain is up; flips the page-lifetime assembleDone
    // when complete so the gate starts counting scroll from a formed brand.
    if (entryRef.current < 1) {
      entryRef.current = Math.min(entryRef.current + delta / ENTRY_DURATION, 1);
      build.uAssemble.value = entryRef.current;
      if (entryRef.current >= 1 && !useTextMorphStore.getState().assembleDone) {
        useTextMorphStore.setState({ assembleDone: true });
      }
    }

    // The gate accumulates in discrete wheel ticks — smooth it here so the
    // whole transition glides (frame-rate independent damp).
    const gTarget = useTextMorphStore.getState().gateProgress;
    const g = THREE.MathUtils.damp(gSmoothRef.current, gTarget, 7, delta);
    gSmoothRef.current = g;

    // FIX 3b: the latch only pins the leg while the page is released/forward
    // (raw gateProgress >= 1). Once the gate re-engages in reverse (gateProgress
    // < 1, scrolling back up to the very top) the target follows `g` again, so the
    // morph plays in reverse — the user-requested reverse replay.
    const rawGate = useTextMorphStore.getState().gateProgress;

    // --- Morph clock: scroll TRIGGERS it, time PLAYS it -------------------
    // Past the trigger the morph runs to 1 on its own (entry-style wave);
    // back below the trigger it runs to 0. Constant-speed, never scrubbed.
    const morphTarget = (morph1LatchedRef.current && rawGate >= 1)
      ? 1
      : g >= MORPH_TRIGGER ? 1 : 0;
    if (morphTRef.current !== morphTarget) {
      const dir = morphTarget > morphTRef.current ? 1 : -1;
      morphTRef.current = THREE.MathUtils.clamp(
        morphTRef.current + (dir * delta) / MORPH_DURATION,
        0,
        1,
      );
      build.uMorph.value = morphTRef.current;
    }
    const morphDone = morphTRef.current >= 0.95;
    if (morphDone && useTextMorphStore.getState().gateProgress >= 1)
      morph1LatchedRef.current = true;
    if (morphDone !== useTextMorphStore.getState().morphDone) {
      useTextMorphStore.setState({ morphDone });
    }

    // --- Second morph clock: B (headline) → C ("see what we build") -------
    // Triggers only once the first morph has fully composed AND scroll intent
    // passes MORPH2_TRIGGER; plays / reverses on its own clock like the first.
    const morph2Target = (morph2LatchedRef.current && rawGate >= 1)
      ? 1
      : g >= MORPH2_TRIGGER && morphTRef.current >= 0.95 ? 1 : 0;
    if (morph2TRef.current !== morph2Target) {
      const dir = morph2Target > morph2TRef.current ? 1 : -1;
      morph2TRef.current = THREE.MathUtils.clamp(
        morph2TRef.current + (dir * delta) / MORPH_DURATION,
        0,
        1,
      );
      build.uMorph2.value = morph2TRef.current;
    }
    const morph2Done = morph2TRef.current >= 0.95;
    if (morph2Done && useTextMorphStore.getState().gateProgress >= 1)
      morph2LatchedRef.current = true;
    if (morph2Done !== useTextMorphStore.getState().morph2Done) {
      useTextMorphStore.setState({ morph2Done });
    }

    // (The former THIRD morph leg — "see what we build" → "scroll" — was
    // removed: "see what we build" is now the FINAL stage and homes at the
    // bottom. The compute's 4th target equals C, uMorph3 stays 0 / inert.)

    // DOM cascade: the hero panel's white texts ([data-hero-stagger]:
    // paragraph → chips → CTAs) stagger in over the last gate stretch,
    // gated on the morph having actually composed (rushing the wheel parks
    // g at the cap; the cascade then eases in as the wave completes). The
    // white H1 itself stays suppressed — the particle headline IS the title.
    const morphGate = THREE.MathUtils.smoothstep(morphTRef.current, 0.85, 1);
    const reveal =
      THREE.MathUtils.smoothstep(g, REVEAL_START, REVEAL_END) * morphGate;
    useTextMorphStore.setState({ domReveal: reveal });

    // After the gate releases, real scroll resumes (logo dissolve + comet
    // descend, as before): the particle headline — anchor frozen below —
    // slides up out of the viewport with the world, dissolving over the
    // first ~70% of a screen of scroll.
    const scrollPx = typeof window !== "undefined" ? window.scrollY : 0;
    const fade = 1 - Math.min(scrollPx / (size.height * 0.7), 1);
    group.visible = fade > 0.004;
    build.uFade.value = fade;
    const dpr = Math.min(gl.getPixelRatio(), 2);
    build.uPixelRatio.value = dpr;
    build.uViewport.value.set(size.width * dpr, size.height * dpr);

    if (group.visible) {
      // Anchor the particle block to the live BRAND rect — but ONLY while
      // the page is parked at the very top (the gate). The moment real
      // scroll starts the position FREEZES in world space, so the camera's
      // descent carries the text up and out of the viewport in true 3D
      // (instead of it tracking the pinned hero forever).
      const el = brandRef.current;
      if (el && scrollPx <= 2) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);
        // + camDescend: hold the pre-descent station during the camera-dive
        // beat (SignatureLine publishes the applied offset) so the camera
        // genuinely leaves the text behind above the frame.
        scratch.set(
          (cx / size.width - 0.5) * worldViewWidth,
          camera.position.y +
            useTextMorphStore.getState().camDescend +
            (0.5 - cy / size.height) * WORLD_VIEW_HEIGHT,
          0,
        );
        group.position.copy(scratch);
      }
      timeRef.current += delta;
      build.tick({ dt: delta, time: timeRef.current });
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {build ? (
        <mesh
          geometry={build.geometry}
          material={build.material}
          frustumCulled={false}
        />
      ) : null}
    </group>
  );
}
