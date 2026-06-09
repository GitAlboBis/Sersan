"use client";

/**
 * HeroTextParticles — the Lusion-style pinned text intro on the home hero.
 *
 * On entry the headline area shows "Sersan AI" as a particle field. The hero
 * section is ALREADY pinned (sticky 520vh), so the first scroll doesn't move
 * the page — it drives uMorph: the particles scatter and recompose into the
 * real localized headline (sampled from the live DOM H1, so EN/IT both work),
 * then the crisp DOM H1 cross-fades in over the settled particle text
 * (textMorphStore.domReveal → StagePanel). Fully reversible by scrolling up.
 *
 * Mounts its sim ONLY when: true WebGPU compute backend + fonts ready + the
 * desktop pinned H1 ([data-hero-headline]) exists. Every other path leaves
 * textMorphStore inactive → the DOM hero renders exactly as before.
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
import { useScrollStore } from "./store/scrollStore";
import { useTextMorphStore } from "./store/textMorphStore";
import type { SceneTier } from "./store/tierStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";

interface HeroTextParticlesProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}

/** Morph window in hero-progress units (hero stage = hp 0 → 0.1). */
const MORPH_START = 0.005;
const MORPH_END = 0.055;
/** DOM H1 cross-fade window — particles hand off to crisp text. */
const REVEAL_START = 0.055;
const REVEAL_END = 0.075;

/** Particle count per tier (count² grid-free — flat). */
const COUNT_BY_TIER: Record<"full" | "lite", number> = {
  full: 18000,
  lite: 9000,
};

interface MorphBuild {
  geometry: THREE.InstancedBufferGeometry;
  material: THREE.Material;
  uMorph: { value: number };
  uFade: { value: number };
  uPointSize: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  tick: (p: { dt: number; time: number }) => void;
  dispose: () => void;
}

export function HeroTextParticles({ tier, anchors }: HeroTextParticlesProps) {
  const { camera, size, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const elRef = useRef<HTMLElement | null>(null);
  const timeRef = useRef(0);
  const [build, setBuild] = useState<MorphBuild | null>(null);
  // Bumped by the MutationObserver on language switch → resample + rebuild.
  const [textEpoch, setTextEpoch] = useState(0);

  const count = COUNT_BY_TIER[tier] ?? COUNT_BY_TIER.lite;

  // World units per CSS pixel at the z=0 content plane (camera at CAMERA_Z).
  const worldPerPx = WORLD_VIEW_HEIGHT / size.height;

  // === Build: sample both texts from the live DOM H1 + spin up the sim =====
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

      const el = document.querySelector<HTMLElement>("[data-hero-headline]");
      if (!el) return; // mobile fallback / interior route → stay inactive
      elRef.current = el;

      // --- Sample both texts with the H1's computed typography -------------
      const cs = getComputedStyle(el);
      const fontSizePx = parseFloat(cs.fontSize) || 64;
      const ls = parseFloat(cs.letterSpacing);
      const specBase = {
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight || "500",
        fontSizePx,
        lineHeightPx: fontSizePx * 0.98,
        letterSpacingPx: Number.isFinite(ls) ? ls : 0,
      };
      const headlineText = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      const maxW = Math.max(el.clientWidth, 200);
      const headlineSpec: TextSpec = {
        ...specBase,
        lines: wrapTextToLines(headlineText, specBase, maxW),
      };
      // "Sersan AI" — single line, larger display cut, capped to the column.
      let brandSize = fontSizePx * 1.5;
      const brandLines = ["Sersan AI"];
      {
        const probe = document.createElement("canvas").getContext("2d");
        if (probe) {
          for (; brandSize > fontSizePx * 0.8; brandSize -= 2) {
            probe.font = `${specBase.fontWeight} ${brandSize}px ${specBase.fontFamily}`;
            if (probe.measureText(brandLines[0]).width <= maxW) break;
          }
        }
      }
      const brandSpec: TextSpec = {
        ...specBase,
        fontSizePx: brandSize,
        lineHeightPx: brandSize * 0.98,
        lines: brandLines,
      };

      const a = sampleTextPoints(brandSpec, count);
      const b = sampleTextPoints(headlineSpec, count);

      // CSS-px (block-centered, y-up) → world units + a whisper of z depth.
      const toWorld = (xy: Float32Array) => {
        const out = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          out[i * 3] = xy[i * 2] * worldPerPx;
          out[i * 3 + 1] = xy[i * 2 + 1] * worldPerPx;
          out[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        }
        return out;
      };

      const bm = mod.createTextMorphComputeBuild(
        gl as never,
        webgpu as never,
        tslNs as never,
        toWorld(a.xy),
        toWorld(b.xy),
        count,
        {
          SPRING: 42,
          DAMPING: 6.5,
          MAX_SPEED: 9,
          TURB: 14,
          // Big enough to read as INK at a glance (the first pass at 2.6px /
          // 1.5 emissive was a faint dust that barely read as "Sersan AI").
          POINT_SIZE: 3.6,
          POINT_ALPHA: 1.0,
          EMISSIVE: 2.4,
          COL_COLD: [0.85, 0.87, 1.0], // bright lavender-white ink
          COL_HOT: [0.3, 0.95, 1.0], // cyan while travelling
        },
      );
      built = bm as unknown as MorphBuild;
      setBuild(built);
      useTextMorphStore.setState({ active: true, domReveal: 0 });

      // Language switch swaps the H1 text → resample (rebuild).
      observer = new MutationObserver(() => {
        const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        if (t && t !== headlineText) setTextEpoch((e) => e + 1);
      });
      observer.observe(el, { childList: true, characterData: true, subtree: true });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      built?.dispose();
      setBuild(null);
      useTextMorphStore.setState({ active: false, domReveal: 1 });
    };
    // worldPerPx/size changes re-run (resize → resample at the new metrics).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, count, worldPerPx, size.width, textEpoch]);

  // === Per frame: anchor to the H1 rect, drive morph + reveal ==============
  const scratch = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    if (!build) {
      group.visible = false;
      return;
    }
    const delta = Math.min(rawDelta, 1 / 30);

    // Same hero-progress math as HeroLogo (progress through the 520vh pin).
    const { progress } = useScrollStore.getState();
    const sh = anchors.scrollHeight;
    const ih = size.height;
    const scrollPx = progress * Math.max(sh - ih, 0);
    const heroSpan = anchors.spans["hero"];
    const heroEndPx = heroSpan ? Math.max(heroSpan.end * sh - ih, 1) : ih * 4.2;
    const hp = THREE.MathUtils.clamp(scrollPx / heroEndPx, 0, 1);

    const morph = THREE.MathUtils.smoothstep(hp, MORPH_START, MORPH_END);
    const reveal = THREE.MathUtils.smoothstep(hp, REVEAL_START, REVEAL_END);
    useTextMorphStore.setState({ active: true, domReveal: reveal });

    // Particles own the text while the DOM is hidden; fade out as it reveals.
    const fade = 1 - reveal;
    group.visible = fade > 0.004;

    build.uMorph.value = morph;
    build.uFade.value = fade;
    const dpr = Math.min(gl.getPixelRatio(), 2);
    build.uPixelRatio.value = dpr;
    build.uViewport.value.set(size.width * dpr, size.height * dpr);

    if (group.visible) {
      // Anchor the particle block to the live H1 rect (viewport == canvas).
      const el = elRef.current;
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
