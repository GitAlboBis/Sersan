"use client";

/**
 * HeroTextParticles — the particle-text brand intro ("Sersan AI").
 *
 * ENTRY (automatic, time-driven — ICS-media particle-text choreography): the
 * moment the preloader lifts, "Sersan AI" assembles ITSELF out of a noisy
 * scattered particle field — left→right staggered wave (delay = normalized
 * glyph x), per-particle alpha fade-in, spring + transit turbulence shaping
 * each flight. No scroll input is needed or counted during the entrance
 * (the gate locks the page and only shakes the camera).
 *
 * SCROLL (gate-driven, ONE beat — client decision 2026-07-23: the old
 * three-stage chain "Sersan AI" → headline → "see what we build" was too
 * long; only the brand keeps the particle treatment, bigger and in the
 * foreground): once assembled, wheel/touch accumulates
 * textMorphStore.gateProgress. The brand HOLDS briefly, then UN-ASSEMBLES —
 * uAssemble is driven back toward 0, which plays the entry wave in reverse
 * (right→left, per-particle alpha out, spring flights back to the scatter
 * field) — while the crisp DOM hero (H1 + eyebrow + sub + CTAs) cascades in
 * underneath via domReveal. When the cascade lands the gate releases and
 * normal scroll takes over. Fully reversible: scrolling back up to the very
 * top re-engages the gate and re-forms the brand.
 *
 * The compute build keeps its 4-target signature; B/C/D are fed homeA and
 * uMorph/uMorph2/uMorph3 stay 0 forever — the legs never play.
 *
 * Mounts its sim ONLY when: true WebGPU compute backend + fonts ready + the
 * desktop pinned H1 + brand elements exist. Every other path leaves
 * textMorphStore inactive → no scroll gate, DOM hero exactly as before.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { sampleTextPoints, type TextSpec } from "./text/sampleTextPoints";
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
// Unlike the old morph legs (one-shot clocks), the dissolve is SCRUBBED — a
// pure function of g, so it tracks the wheel directly and reverses for free.
// The spring integrator underneath gives every particle its organic lag, so
// the scrub still reads as flight, not as a linear wipe.
/** Gate fraction where the brand starts un-assembling. Before this the brand
 * holds fully formed against scroll — the deliberate "look at it" beat. */
const DISSOLVE_START = 0.2;
/** Gate fraction where the un-assemble completes (uAssemble back at 0; the
 * last left-edge particles release and fade). */
const DISSOLVE_END = 0.75;
/** DOM hero cascade window (H1 crossfade + eyebrow → sub → CTAs stagger,
 * consumed by StagePanel). Overlaps the dissolve so the brand hands the
 * stage to the real hero in one crossed beat instead of two serial ones. */
const REVEAL_START = 0.42;
const REVEAL_END = 0.88;

// The brand now samples MUCH larger (~16vw Switzer semibold vs the old 9vw
// serif — client 2026-07-23: bigger, foreground): the ink area roughly
// tripled, so the particle budget grows with it to keep the strokes reading
// as solid light instead of a sparse dust. The kernel is a simple
// spring+turb integration — 48k instances is routine for the full tier.
const COUNT_BY_TIER: Record<"full" | "lite", number> = {
  full: 48000,
  lite: 20000,
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
  const brandRef = useRef<HTMLElement | null>(null);
  const timeRef = useRef(0);
  const gSmoothRef = useRef(0);
  // Entry-assemble clock 0..1. Persists across rebuilds (resize re-runs the
  // build effect but never unmounts the component), and is pre-completed when
  // a previous mount already played the entrance (store.assembleDone is
  // page-lifetime) — the entry plays ONCE per load.
  const entryRef = useRef(0);
  const [build, setBuild] = useState<MorphBuild | null>(null);

  const count = COUNT_BY_TIER[tier] ?? COUNT_BY_TIER.lite;

  // World units per CSS pixel at the z=0 content plane (camera at CAMERA_Z).
  const worldPerPx = WORLD_VIEW_HEIGHT / size.height;

  // === Build: sample the brand from the live DOM, spin up the sim ===========
  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: MorphBuild | null = null;

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

      // The H1 is no longer sampled (the headline is pure DOM now), but its
      // presence still gates the mount: it marks the desktop pinned layout —
      // mobile fallback / interior routes render neither element → inactive.
      const h1 = document.querySelector<HTMLElement>("[data-hero-headline]");
      const brand = document.querySelector<HTMLElement>("[data-hero-brand]");
      if (!h1 || !brand) return;
      brandRef.current = brand;

      // --- BRAND sample, with the big [data-hero-brand]'s own typography ----
      const bcs = getComputedStyle(brand);
      const brandSizePx = parseFloat(bcs.fontSize) || 120;
      const bls = parseFloat(bcs.letterSpacing);
      const brandSpec: TextSpec = {
        fontFamily: bcs.fontFamily,
        fontWeight: bcs.fontWeight || "600",
        fontSizePx: brandSizePx,
        lineHeightPx: brandSizePx,
        letterSpacingPx: Number.isFinite(bls) ? bls : 0,
        lines: [(brand.textContent ?? "Sersan AI").trim()],
      };
      const a = sampleTextPoints(brandSpec, count);

      const toWorld = (xy: Float32Array) => {
        const out = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          out[i * 3] = xy[i * 2] * worldPerPx;
          out[i * 3 + 1] = xy[i * 2 + 1] * worldPerPx;
          out[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        }
        return out;
      };
      const homeAWorld = toWorld(a.xy);

      // Entry seed (ICS-media style): each particle starts at a noisy offset
      // from its glyph home, spread WIDER toward the left of the block
      // (ICS: `spread = (1 - nx) * 100 + 100`) so the left edge billows out
      // and forms first while the right tail streams in — combined with the
      // sim's left→right stagger this reads as the reference's travelling
      // assemble wave. The same field is the DISSOLVE destination: driving
      // uAssemble back down sends every particle back out to this cloud.
      // FIX 3a: decide replay vs preserve from THIS instance's lifecycle, not
      // the cross-bundle store flag (which raced the provider's nav-into-home
      // reset and left the intro frozen on a route return). A fresh MOUNT
      // (first load / route-return) still has entryRef at its initial 0 →
      // replay the whole intro; an in-place REBUILD (resize) kept entryRef at
      // 1 → preserve the finished state. A session skip also preserves.
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
      // The scatter cloud is built UNCONDITIONALLY: it is not just the entry
      // seed anymore but the LIVE dissolve field the scrubbed uAssemble
      // interpolates the anchor toward. A rebuild that seeded it at the glyph
      // homes (the old three-leg-era rule) would pin the anchor and silently
      // degrade every later dissolve/re-form to a flat alpha wipe.
      const scatter = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
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
        // B/C/D targets are dead legs — fed the brand field so the buffers
        // are valid, with their morph uniforms parked at 0 forever.
        homeAWorld,
        homeAWorld,
        homeAWorld,
        count,
        // ICS-media-reference look (user 2026-06-10): bright glowing sprites,
        // dense enough to read as solid strokes — bigger discs, hotter
        // emissive, near-white ink. POINT_SIZE 8 (was 7): the 16vw brand's
        // thicker strokes carry the larger disc without clogging counters.
        {
          SPRING: 42,
          DAMPING: 6.5,
          MAX_SPEED: 9,
          TURB: 14,
          POINT_SIZE: 8,
          POINT_ALPHA: 1.0,
          EMISSIVE: 4,
          COL_COLD: [1, 1, 1.0], // bright white-lavender ink
          COL_HOT: [0.4, 1, 1.0], // cyan while travelling
        },
        // POSITION seed: a rebuild of an already-formed brand pops the
        // particles in place at their homes (no spurious re-flight); a fresh
        // intro starts them out in the cloud.
        replayDone ? homeAWorld : scatter,
        undefined,
        // START field: ALWAYS the scatter cloud (see the note above).
        scatter,
      );
      built = bm as unknown as MorphBuild;
      // Resume state: a rebuild mid/after entry must not restart the wave.
      // On a genuine full-intro replay (fresh mount) start from a clean
      // store, regardless of stale journey flags that survived on the
      // globalThis-pinned store across a soft route round-trip. (The provider
      // also resets these, but this makes the replay self-contained.)
      if (replayDone) {
        entryRef.current = 1;
      } else {
        // A mid-entry rebuild (resize during the 3.6s assemble) lands here
        // too: the seed is a fresh scatter cloud, so the entry clock must
        // restart with it — a preserved half-elapsed clock would saturate the
        // left glyphs' stagger windows and snap them home as one unstaggered
        // clump. The gate holds the page either way, so a replayed entrance
        // costs nothing but its own choreography.
        entryRef.current = 0;
        useTextMorphStore.setState({
          assembleDone: false,
          gateProgress: 0,
          morphDone: false,
          morph2Done: false,
        });
      }
      built.uAssemble.value = entryRef.current;
      setBuild(built);
      // Republish the CURRENT reveal, not a flat 0: a rebuild after the gate
      // released (or mid-gate) must not blink the already-revealed hero
      // (H1/stagger cluster, scrims, HeroLogo all multiply by domReveal).
      // gSmoothRef persists across rebuilds, so this derivation is exact;
      // on a fresh intro it is 0 as before.
      useTextMorphStore.setState({
        active: true,
        domReveal: THREE.MathUtils.smoothstep(
          gSmoothRef.current,
          REVEAL_START,
          REVEAL_END,
        ),
      });
    });

    return () => {
      cancelled = true;
      built?.dispose();
      setBuild(null);
      if (brandRef.current) brandRef.current.style.opacity = "0";
      // Reset ONLY the visual-handoff fields. The gate/journey state
      // (gateProgress, morphDone, …) deliberately SURVIVES: rebuilds happen
      // mid-session (resize, and a phantom prod remount seen 2026-06-10) and
      // zeroing the progress yanked the visitor's intro back to the start.
      // entryRef persists across rebuilds and re-primes the fresh sim.
      useTextMorphStore.setState({
        active: false,
        domReveal: 1,
      });
    };
    // worldPerPx/size changes re-run (resize → resample at the new metrics).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, count, worldPerPx, size.width]);

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

    // --- Intro skip (Esc / session flag): pin every driver at its end state.
    // gateProgress is held at 1 by the gate's own tick; pinning the smoothed
    // g and the entry clock here means the derivations below immediately
    // resolve to "dissolved, DOM revealed" — no partial brand can flash.
    if (useTextMorphStore.getState().introSkipped) {
      entryRef.current = 1;
      gSmoothRef.current = 1;
    }

    // --- ENTRY clock: the automatic assemble, time-driven ----------------
    // Advances once the curtain is up; flips the page-lifetime assembleDone
    // when complete so the gate starts counting scroll from a formed brand.
    if (entryRef.current < 1) {
      entryRef.current = Math.min(entryRef.current + delta / ENTRY_DURATION, 1);
      if (entryRef.current >= 1 && !useTextMorphStore.getState().assembleDone) {
        useTextMorphStore.setState({ assembleDone: true });
      }
    }

    // The gate accumulates in discrete wheel ticks — smooth it here so the
    // whole transition glides (frame-rate independent damp).
    const gTarget = useTextMorphStore.getState().gateProgress;
    const g = THREE.MathUtils.damp(gSmoothRef.current, gTarget, 7, delta);
    gSmoothRef.current = g;

    // --- Dissolve: the single scroll beat, scrubbed & reversible ----------
    // uAssemble = entry × (1 − dissolve): during the entry it plays the
    // forming wave; once formed, scroll melts it back into the scatter field
    // (the reverse wave, right→left). Scrolling back re-forms it — the whole
    // journey is one pure function of (entry clock, smoothed g).
    const dissolve = THREE.MathUtils.smoothstep(g, DISSOLVE_START, DISSOLVE_END);
    const assembleEff = entryRef.current * (1 - dissolve);
    build.uAssemble.value = assembleEff;

    // The gate caps its progress just under 1 until morph2Done — with the
    // legs gone that flag now means "the payoff is in": the dissolve is
    // essentially complete and the DOM cascade has landed. Derived from the
    // smoothed g so a rushed flick parks at the cap for the ~0.2s the damp
    // needs to catch up, then the next notch releases the page — same feel
    // as before, one beat shorter. morphDone mirrors it for the provider's
    // reset + the skip path, which write both.
    const payoffDone = g >= 0.9;
    const st = useTextMorphStore.getState();
    if (payoffDone !== st.morphDone || payoffDone !== st.morph2Done) {
      useTextMorphStore.setState({
        morphDone: payoffDone,
        morph2Done: payoffDone,
      });
    }

    // DOM cascade: H1 crossfade + hero cluster ([data-hero-stagger]:
    // eyebrow → sub → CTAs) stagger in as the brand melts — StagePanel
    // consumes this. Pure in g, so the reverse replay mirrors it.
    const reveal = THREE.MathUtils.smoothstep(g, REVEAL_START, REVEAL_END);
    useTextMorphStore.setState({ domReveal: reveal });

    // After the gate releases, real scroll resumes: the particle block —
    // anchor frozen below — slides up out of the viewport with the world,
    // dissolving over the first ~70% of a screen of scroll. (Normally the
    // brand is already alpha-0 by then; this covers a rushed release.)
    const scrollPx = typeof window !== "undefined" ? window.scrollY : 0;
    const fade = 1 - Math.min(scrollPx / (size.height * 0.7), 1);
    build.uFade.value = fade;
    const dpr = Math.min(gl.getPixelRatio(), 2);
    build.uPixelRatio.value = dpr;
    build.uViewport.value.set(size.width * dpr, size.height * dpr);

    // Sleep when nothing can move: brand fully dissolved, gate released and
    // not re-engaged (raw gateProgress pinned at 1). A reverse re-engage
    // drops gateProgress below 1 → the loop wakes and re-forms the brand.
    const resting =
      assembleEff <= 0.002 && gTarget >= 1 && entryRef.current >= 1;
    group.visible = !resting && fade > 0.004;

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
