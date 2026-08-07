"use client";

/**
 * AuditSingularity — the /audit hero: a TSL raymarched black hole
 * (gravitationally-lensed accretion disc) behind the audit H1.
 *
 * THE METAPHOR: one week where the entire business — six surfaces of systems,
 * data, workflows — gets pulled into a single scored map with an unblinking
 * black center. The raymarch itself lives in singularity/blackHoleMaterial.ts
 * (re-implemented from an unlicensed study reference — our own code, our own
 * runtime-generated textures; see that file's header + the dossier).
 *
 * GATING (Scene.tsx): mounted only on `pathname === "/audit" && tier ===
 * "full" && webgpu` — TSL-only, no GLSL twin. Non-WebGPU /audit keeps today's
 * DOM hero untouched. The heavy three/webgpu + three/tsl namespaces are
 * lazy-imported inside the build effect (NeuralLattice's discipline).
 *
 * PLACEMENT ARITHMETIC (the ~50vh apparent diameter)
 * --------------------------------------------------
 * The proxy sphere is radius 1 (diameter D = 2 world units) and MUST stay
 * unscaled (every raymarch constant is calibrated to the unit sphere, and the
 * uCamLocal shortcut is only exact translation-only) — so apparent size comes
 * purely from camera distance. With CAMERA_FOV = 50°:
 *
 *   viewport height at distance d  =  2·tan(FOV/2)·d  =  0.93263·d
 *   apparent fraction = D / (0.93263·d)  →  d = D / (0.93263·frac)
 *
 * For frac = 0.5 (≈50vh): d = 2 / (0.93263·0.5) ≈ 4.289 world units, i.e. the
 * group sits at z = CAMERA_Z − 4.289 ≈ 7.711 (between camera and the z=0
 * content plane). Self-check: the view height AT the group's plane is then
 * exactly D/frac = 4.0 world units, of which the sphere's 2 = 50%.
 *
 * Horizontal: "+0.22 of world view width" is computed at the GROUP's plane
 * (0.22 · 4.0 · aspect), so it lands ≈22vw right of screen center at any
 * aspect. (Computed at z=0 it would land ~62vw off-center — off screen.)
 * Vertical: world-anchored to the hero anchor's center fraction — the same
 * `worldY = −fraction·scrollHeight·k` mapping RouteHero uses. Note the group
 * is CAMERA_Z/d ≈ 2.8× nearer than the content plane, so it parallax-scrolls
 * ~2.8× faster than the DOM — the scroll fade below retires it before that
 * reads as drift. All three knobs live in `placeRef` (dev handle
 * `window.__sersanSingularity.place`) for live fine-tuning.
 *
 * FRAME LOOP: single useFrame at default priority, and the component MUST
 * stay mounted AFTER SignatureLine in Scene.tsx — the world anchor, fade and
 * the virtual-camera writes (uCamWorld/uCamLocal) are camera-relative and
 * rely on the single camera authority having written camera.position earlier
 * in the same priority-0 frame pass (same contract as RailPlanes /
 * NeuralLattice). A slow continuous orbit (period/radius/bob in `orbitRef`,
 * live-tunable via the dev handle) drifts the VIRTUAL march camera around
 * the hole — genuine 3D motion (the disc's inclination, lensed stars and
 * core all shift) with the anchored silhouette unmoved. No per-frame
 * allocations; damps + the orbit clock use the conventional clamped dt (1/30).
 *
 * SCROLL FADE: mirrors HeroLogo's recede+fade convention, adapted to a short
 * unpinned hero — hp is the fraction of the hero scrolled past the viewport
 * top, and uFade smoothsteps out over the LAST THIRD of that range
 * (material transparent, opacityNode = uFade). group.visible flips off when
 * fully faded, so the march costs nothing past the hero.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { webgpuEnabled } from "./renderer/createRenderer";
import { CAMERA_FOV, CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import { usePointerStore, installPointerTracking } from "./store/pointerStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";
import type { SingularityBuild } from "./singularity/blackHoleMaterial";

/** The audit page's first [data-line-anchor] (audit-client.tsx wraps the hero). */
const HERO_ANCHOR = "hero";

/** tan(FOV/2) — the one trig constant the placement math needs. */
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);
/** Unit proxy sphere: radius 1 → diameter 2 (NEVER scaled — see header). */
const SPHERE_DIAMETER = 2;
/** Target apparent diameter as a fraction of viewport height (~50vh). */
const APPARENT_HEIGHT_FRAC = 0.5;
/** Camera→group distance for that apparent size: ≈ 4.289 world units. */
const DEFAULT_DIST = SPHERE_DIAMETER / (2 * TAN_HALF_FOV * APPARENT_HEIGHT_FRAC);
/** Right-of-center offset, as a fraction of the view WIDTH at the group's plane. */
const DEFAULT_X_FRAC = 0.22;

/** Pointer parallax: max translation in world units (±), damped. */
const PARALLAX_MAX = 0.15;
const PARALLAX_DAMP = 4;
/** Route-transition reveal damp (fade-in with the route beat). */
const REVEAL_DAMP = 4;

/** Slow continuous orbit defaults (FIX 2, owner 2026-08-07: "it doesn't look
 * animated in 3D"). The orbit offsets the VIRTUAL march camera (uCamWorld) —
 * the anchored silhouette never moves; the ray origins/directions do. */
const ORBIT_PERIOD = 26; // seconds per lateral revolution
const ORBIT_RADIUS = 0.5; // lateral (x/z) drift radius, world units
/** Vertical bob amplitude, world units (half rate). 0.45, not the originally
 * specced 0.22 — live-calibrated 2026-08-07: the wider inclination breathing
 * keeps the disc ellipse open through more of the 26s cycle. */
const ORBIT_BOB = 0.45;

export function AuditSingularity({ anchors }: { anchors: SectionAnchors }) {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // --- Lazy build (three/webgpu chunk loads ONLY here) ----------------------
  const [build, setBuild] = useState<SingularityBuild | null>(null);
  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: SingularityBuild | null = null;

    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./singularity/blackHoleMaterial"),
    ]).then(([webgpu, tslNs, mod]) => {
      if (cancelled) return;
      built = mod.createBlackHoleBuild(webgpu as never, tslNs as never);
      setBuild(built);
    });

    return () => {
      cancelled = true;
      built?.dispose();
      setBuild(null);
    };
  }, []);

  // Pointer tracking for the parallax (refcounted window listener; no-op on
  // coarse pointers / reduced-motion — parallax simply stays centered there).
  useEffect(() => installPointerTracking(), []);

  // --- Live placement knobs (lead fine-tunes via the dev handle) ------------
  const placeRef = useRef({
    /** Camera→group distance (world units). Smaller = bigger on screen.
     * CALIBRATED EMPIRICALLY: the header's 50vh arithmetic gives 4.289
     * (DEFAULT_DIST — kept above as the documented derivation), but once the
     * true-transparency fix removed the env silhouette the presence read too
     * small; 3.2 (~65vh apparent, browser-verified live 2026-08-07) governs. */
    dist: 3.2,
    /** Horizontal offset as a fraction of the view width at the group plane. */
    xFrac: DEFAULT_X_FRAC,
    /** Vertical lift as a fraction of the ON-SCREEN viewport height
     * (positive = up), applied at the group's plane. 0 = the hero anchor's
     * measured center — but the value is CALIBRATED EMPIRICALLY, not from
     * anchor math (same framing as HeroLogo's lockup offset): at 0 the
     * sphere's bottom edge fell past the fold on the 1568×764 reference
     * viewport; 0.15 (browser-verified live, 2026-08-07) lands it fully in
     * frame with the disc band at headline height and a slight text overlap
     * that reads as depth. */
    yLift: 0.15,
  });

  // --- Live orbit knobs (lead fine-tunes via the dev handle) ----------------
  const orbitRef = useRef({
    /** Seconds per full lateral revolution. */
    period: ORBIT_PERIOD,
    /** Lateral (x/z) orbit radius, world units. */
    radius: ORBIT_RADIUS,
    /** Vertical bob amplitude, world units — runs at HALF the orbit rate. */
    bob: ORBIT_BOB,
  });

  // --- Per-frame scratch (no allocations in the loop) -----------------------
  const parallax = useRef({ x: 0, y: 0 });
  const revealDamped = useRef(0);
  const fadeRef = useRef(0);
  /** Orbit clock — accumulated clamped delta (sibling convention; no Date.now). */
  const clockRef = useRef(0);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group || !build) return;
    const delta = Math.min(rawDelta, 1 / 30);

    // World anchor guards (RouteHero's, plus the measuredPath race guard from
    // useSectionAnchors' header: on a route change the curve/anchors rebuild
    // before SectionBus re-measures — hold hidden until the fresh measure).
    const fraction = anchors.fractions[HERO_ANCHOR];
    if (
      fraction === undefined ||
      anchors.scrollHeight <= 1 ||
      anchors.measuredPath !== "/audit"
    ) {
      group.visible = false;
      return;
    }

    const ih = size.height;
    const sh = anchors.scrollHeight;
    const k = WORLD_VIEW_HEIGHT / ih;

    // --- Scroll fade over the hero range (HeroLogo convention, short hero) --
    const { progress, reveal } = useScrollStore.getState();
    const scrollPx = progress * Math.max(sh - ih, 0);
    const heroSpan = anchors.spans[HERO_ANCHOR];
    // Scroll position at which the hero's bottom passes the viewport TOP —
    // the hero is fully "scrolled past" there. (HeroLogo subtracts ih because
    // the home hero is a 520vh pinned spine; this hero is a short unpinned
    // section, so that variant would fade within ~5% of a viewport.)
    const heroOutPx = heroSpan ? Math.max(heroSpan.end * sh, 1) : ih;
    const hp = THREE.MathUtils.clamp(scrollPx / heroOutPx, 0, 1);
    // Smoothstep out over the last third of the hero range.
    const fade = 1 - THREE.MathUtils.smoothstep(hp, 0.66, 0.97);

    // Route-transition beat: ease in with scrollStore.reveal like the sibling
    // islands, so the hole ignites through the opening curtain.
    revealDamped.current = THREE.MathUtils.damp(
      revealDamped.current,
      reveal,
      REVEAL_DAMP,
      delta,
    );
    const opacity = fade * revealDamped.current;
    fadeRef.current = opacity;
    build.u.uFade.value = opacity;
    group.visible = opacity > 0.005;
    if (!group.visible) return;

    // --- Pointer parallax: TRANSLATION ONLY (±PARALLAX_MAX, damped). The
    // group is nearer than the content plane, so it counter-moves (classic
    // near-layer depth parallax); uCamLocal below keeps the march correct
    // under any translation. -------------------------------------------------
    const ptr = usePointerStore.getState();
    const px = ptr.active ? (ptr.smooth.x - 0.5) * 2 : 0;
    const py = ptr.active ? (ptr.smooth.y - 0.5) * 2 : 0;
    parallax.current.x = THREE.MathUtils.damp(
      parallax.current.x,
      -px * PARALLAX_MAX,
      PARALLAX_DAMP,
      delta,
    );
    parallax.current.y = THREE.MathUtils.damp(
      parallax.current.y,
      py * PARALLAX_MAX,
      PARALLAX_DAMP,
      delta,
    );

    // --- Placement (see the header arithmetic) ------------------------------
    const place = placeRef.current;
    const viewHAtGroup = 2 * TAN_HALF_FOV * place.dist; // = 4.0 at default dist
    const aspect = size.width / ih;
    const offX = place.xFrac * viewHAtGroup * aspect;
    const worldY = -fraction * sh * k + place.yLift * viewHAtGroup;
    group.position.set(
      offX + parallax.current.x,
      worldY + parallax.current.y,
      CAMERA_Z - place.dist,
    );
    // ROTATION/SCALE STAY IDENTITY FOREVER (translation only) — the raymarch
    // constants and the uCamLocal shortcut both depend on it. Never scale.

    // --- Slow continuous orbit (FIX 2, owner: "make it breathe in 3D"). A
    // circular x/z drift around the hole + a half-rate vertical bob, composed
    // into the VIRTUAL march camera — the disc's ellipse slowly changes
    // inclination, the lensed stars swim, the core shifts, while the anchored
    // silhouette (real camera raster) stays put. (cos − 1) keeps the offset
    // zero at t=0 so the rest framing matches the tuned placement. Composed
    // WITH the pointer parallax: the group translation and this camera offset
    // simply sum inside uCamLocal below. ------------------------------------
    clockRef.current += delta;
    const orbit = orbitRef.current;
    const oa = clockRef.current * ((Math.PI * 2) / orbit.period);
    const ox = Math.sin(oa) * orbit.radius;
    const oz = (Math.cos(oa) - 1) * orbit.radius;
    const oy = Math.sin(oa * 0.5) * orbit.bob;

    // --- Virtual march camera: real camera + orbit. uCamWorld drives the
    // per-fragment view direction in the shader; uCamLocal is the same point
    // in the group's local frame (backface ray origin). The group is a
    // scene-root child with identity rotation/scale, so worldToLocal
    // degenerates to an exact subtraction (no matrixWorld refresh needed —
    // position IS the world position this frame). ---------------------------
    const camX = camera.position.x + ox;
    const camY = camera.position.y + oy;
    const camZ = camera.position.z + oz;
    build.u.uCamWorld.value.set(camX, camY, camZ);
    build.u.uCamLocal.value.set(
      camX - group.position.x,
      camY - group.position.y,
      camZ - group.position.z,
    );
  });

  // Dev-only debug handle: live placement knobs + uniform handles + a screen
  // projection of the group center (NeuralLattice's pattern).
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__sersanSingularity = {
      place: placeRef.current,
      orbit: orbitRef.current,
      get uniforms() {
        return build?.u ?? null;
      },
      get fade() {
        return fadeRef.current;
      },
      hasBuild: !!build,
      project: () => {
        const g = groupRef.current;
        if (!g || !g.visible) return null;
        const v = g.position.clone().project(camera);
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      },
    };
  }

  if (!build) return null;

  return (
    <group ref={groupRef} visible={false}>
      <mesh
        geometry={build.geometry}
        material={build.material}
        frustumCulled={false}
      />
    </group>
  );
}
