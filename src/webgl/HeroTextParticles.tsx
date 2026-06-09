"use client";

/**
 * HeroTextParticles — the Lusion-style scroll-hijacked text intro.
 *
 * On entry the hero shows a BIG solid DOM "Sersan AI" ([data-hero-brand]).
 * The page does NOT scroll at the top: HeroIntroGate consumes wheel/touch and
 * accumulates textMorphStore.gateProgress, the SOLE driver here. As it
 * advances, the solid brand text dissolves INTO particles, the particles
 * scatter and recompose into the real localized headline shape, and the
 * crisp DOM H1 cross-fades in — particles exist ONLY during the transition;
 * both endpoints are solid text. Camera/mark/line never move (document
 * scroll is genuinely zero until the gate releases). Fully reversible.
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

// Gate-progress timeline (g = textMorphStore.gateProgress, smoothed locally).
// ENTRY (g=0): "Sersan AI" exists ONLY as a small diffuse particle cloud —
// no white text. Scrolling GROWS the block and CONDENSES the cloud (size +
// density animate with scroll) until the white solid text takes over,
// legible; further scroll dissolves it, morphs the particles into the real
// headline shape and reveals the crisp DOM H1. Fully reversible.
/** Particle cloud grows + condenses (scale up, spread → 0, alpha up). */
const GROW_START = 0.0;
const GROW_END = 0.42;
/** Crossfade condensed particles → solid white brand text (the payoff). */
const SOLID_IN_START = 0.42;
const SOLID_IN_END = 0.52;
/** Solid brand dissolves back into particles. */
const BRAND_OUT_START = 0.6;
const BRAND_OUT_END = 0.68;
/** Particle A→B recomposition wave (brand → headline shape). */
const MORPH_START = 0.62;
const MORPH_END = 0.86;
/** Crisp DOM H1 cross-fades in over the settled particle headline. */
const REVEAL_START = 0.88;
const REVEAL_END = 0.97;

/** Block scale at g=0 (grows to 1 across the GROW window). */
const SCALE_MIN = 0.62;
/** Diffuse-cloud jitter radius at g=0, world units (condenses to 0). */
const SPREAD_MAX = 0.55;
/** Cloud alpha at g=0 (density feel — brightens as it condenses). */
const ALPHA_MIN = 0.4;

const COUNT_BY_TIER: Record<"full" | "lite", number> = {
  full: 18000,
  lite: 9000,
};

interface MorphBuild {
  geometry: THREE.InstancedBufferGeometry;
  material: THREE.Material;
  uMorph: { value: number };
  uFade: { value: number };
  uSpread: { value: number };
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
  const [build, setBuild] = useState<MorphBuild | null>(null);
  // Bumped by the MutationObserver on language switch → resample + rebuild.
  const [textEpoch, setTextEpoch] = useState(0);

  const count = COUNT_BY_TIER[tier] ?? COUNT_BY_TIER.lite;

  // World units per CSS pixel at the z=0 content plane (camera at CAMERA_Z).
  const worldPerPx = WORLD_VIEW_HEIGHT / size.height;

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

      // The instanced group anchors to the BRAND rect per frame (so the
      // scroll-driven scale grows the cloud around its own center); the
      // headline homes carry the offset to the H1 block instead.
      const h1Rect = h1.getBoundingClientRect();
      const brandRect = brand.getBoundingClientRect();
      const offBx =
        (h1Rect.left + h1Rect.width / 2 - (brandRect.left + brandRect.width / 2)) *
        worldPerPx;
      const offBy =
        (brandRect.top + brandRect.height / 2 - (h1Rect.top + h1Rect.height / 2)) *
        worldPerPx;

      const toWorld = (xy: Float32Array, ox: number, oy: number) => {
        const out = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          out[i * 3] = xy[i * 2] * worldPerPx + ox;
          out[i * 3 + 1] = xy[i * 2 + 1] * worldPerPx + oy;
          out[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        }
        return out;
      };

      const homeAWorld = toWorld(a.xy, 0, 0);
      // Entry seed: a loose cloud around the brand block — the spring pulls
      // it home the moment the sim starts ticking (= when the preloader
      // curtain lifts), playing the "particles assemble into Sersan AI" beat.
      const scatter = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        scatter[i * 3] = homeAWorld[i * 3] + (Math.random() - 0.5) * 5.5;
        scatter[i * 3 + 1] = homeAWorld[i * 3 + 1] + (Math.random() - 0.5) * 3.5;
        scatter[i * 3 + 2] = homeAWorld[i * 3 + 2] + (Math.random() - 0.5) * 2.0;
      }

      const bm = mod.createTextMorphComputeBuild(
        gl as never,
        webgpu as never,
        tslNs as never,
        homeAWorld,
        toWorld(b.xy, offBx, offBy),
        count,
        {
          SPRING: 42,
          DAMPING: 6.5,
          MAX_SPEED: 9,
          TURB: 14,
          POINT_SIZE: 3.6,
          POINT_ALPHA: 1.0,
          EMISSIVE: 2.4,
          COL_COLD: [0.85, 0.87, 1.0], // bright lavender-white ink
          COL_HOT: [0.3, 0.95, 1.0], // cyan while travelling
        },
        scatter,
      );
      built = bm as unknown as MorphBuild;
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
      useTextMorphStore.setState({
        active: false,
        domReveal: 1,
        gateProgress: 0,
        gateEngaged: false,
      });
    };
    // worldPerPx/size changes re-run (resize → resample at the new metrics).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, count, worldPerPx, size.width, textEpoch]);

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

    // The gate accumulates in discrete wheel ticks — smooth it here so the
    // whole transition glides (frame-rate independent damp).
    const gTarget = useTextMorphStore.getState().gateProgress;
    const g = THREE.MathUtils.damp(gSmoothRef.current, gTarget, 7, delta);
    gSmoothRef.current = g;

    // --- Scroll-driven timeline ------------------------------------------
    const grow = THREE.MathUtils.smoothstep(g, GROW_START, GROW_END);
    const solidIn = THREE.MathUtils.smoothstep(g, SOLID_IN_START, SOLID_IN_END);
    const brandOut = THREE.MathUtils.smoothstep(g, BRAND_OUT_START, BRAND_OUT_END);
    const morph = THREE.MathUtils.smoothstep(g, MORPH_START, MORPH_END);
    const reveal = THREE.MathUtils.smoothstep(g, REVEAL_START, REVEAL_END);
    useTextMorphStore.setState({ domReveal: reveal });

    // ONE text at a time: the white brand appears only when the condensed
    // particles hand off to it, and dissolves away as the gate advances.
    const brand = brandRef.current;
    if (brand) brand.style.opacity = String(solidIn * (1 - brandOut));

    // Particles: visible at entry as the diffuse cloud (alpha grows with the
    // density), hidden while the solid white brand holds, back for the
    // dissolve→morph, gone as the DOM headline reveals.
    const cloudAlpha = ALPHA_MIN + (1 - ALPHA_MIN) * grow;
    const fade = Math.max(1 - solidIn, brandOut) * (1 - reveal) * cloudAlpha;
    group.visible = fade > 0.004;

    // Size + density animate with scroll: the block scales up while the
    // per-particle spread shrinks to 0 (cloud condenses onto the glyphs).
    group.scale.setScalar(SCALE_MIN + (1 - SCALE_MIN) * grow);
    build.uSpread.value = SPREAD_MAX * (1 - grow);

    build.uMorph.value = morph;
    build.uFade.value = fade;
    const dpr = Math.min(gl.getPixelRatio(), 2);
    build.uPixelRatio.value = dpr;
    build.uViewport.value.set(size.width * dpr, size.height * dpr);

    if (group.visible) {
      // Anchor the particle block to the live BRAND rect (viewport == canvas).
      const el = brandRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);
        scratch.set(
          (cx / size.width - 0.5) * worldViewWidth,
          camera.position.y + (0.5 - cy / size.height) * WORLD_VIEW_HEIGHT,
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
