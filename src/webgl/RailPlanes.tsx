"use client";

/**
 * RailPlanes — DOM-synced WebGL planes behind the home case-studies rail
 * (restyle step 2 part B; research/webgl-card-planes.md).
 *
 * One plane per [data-rail-card] in the sticky horizontal rail, painted by
 * the persistent canvas BEHIND the DOM (the cards keep a semi-transparent
 * background so the planes show through). TSL-only: mounted by Scene.tsx
 * exclusively on the WebGPU-flag path at full tier on "/" — on the classic
 * flag-OFF path or lite/off tiers this component never mounts and the DOM
 * rail is complete on its own (see railPlaneNodeMaterial header for the
 * GLSL-twin decision).
 *
 * ANCHORING — camera-LOCKED screen-space placement (deliberate deviation from
 * the research sketch's world-strip anchoring, documented here):
 *
 *   1. World anchoring fails outright: during the sticky pin the cards are
 *      FIXED in viewport space while the camera keeps gliding down the world
 *      strip — a fixed world-Y plane drifts a full `travel` worth of pixels.
 *   2. Position-only camera gluing ALSO fails: the signature line's
 *      lookAt-ahead tilts the camera by up to ~0.4 rad pitch mid-page
 *      (measured), which shifts a z=0 world plane hundreds of px on screen.
 *
 *   So each plane is placed in CAMERA SPACE at view distance CAMERA_Z and
 *   inherits the camera quaternion (a screen-locked billboard):
 *
 *     camera-space (x, y, −CAMERA_Z), x = (cx − vw/2)·k, y = (ih/2 − cy)·k
 *     world = camera.position + camera.quaternion · (x, y, −CAMERA_Z)
 *
 *   A camera-facing plane at constant camera-space depth projects to an EXACT
 *   affine screen rect (x_screen = f·X/Z with Z constant), so registration
 *   with the DOM card is pixel-exact under any camera pose: damped progress,
 *   lookAt tilt, the descent beat and the gate shake all cancel by
 *   construction (k = WORLD_VIEW_HEIGHT/ih is exact at this distance).
 *
 * cy is derived analytically from the live window scroll and the rail's
 * measured layout (secTop/travel → the sticky frame's three phases: entering,
 * pinned, released), and cx from the cached un-translated rect minus the live
 * trackX — NO getBoundingClientRect in the frame loop. The 0.96 inset +
 * material edge feather keep the plane inside the DOM card's rounded border
 * (prd caveat 7).
 *
 * CENTER-FOCUS MOTION MIRROR: the DOM rail applies an analytic center-focus
 * model to every card's inner wrapper (scale 1−0.06f, pyramidal y-arc 12·f²
 * px — see webgl/store/railMotion.ts, the single shared formula). Because
 * those transforms live on an INNER wrapper, the measured [data-rail-card]
 * rects stay untransformed; this component applies the SAME railCardMotion()
 * to its scale + cy so the planes track the DOM cards through the falloff
 * pixel-exactly. t/f also feed the material's uParallax/uFocus (procedural
 * interior parallax + defocus). The rail's velocity STRETCH (a damped,
 * transient skewX ≤2.2° + scaleY compress ≤1.5% on the track wrapper) is
 * deliberately NOT mirrored: it is only ever non-zero during fast scrub and
 * vanishes at rest — invisible behind the 0.96 inset + edge feather.
 *
 * Rects are measured ONLY on railStore.measureVersion bumps (the rail's
 * measure() runs on mount + every ScrollTrigger.refresh via onRefreshInit +
 * its one-shot fonts.ready refresh), at z = 0 where the k mapping is exact
 * (prd caveat 5). Per-frame state flows through useRailStore.getState() —
 * never reactive reads in the hot path.
 *
 * Frame order: this component mounts after SignatureLine (Scene JSX order),
 * so within R3F's priority-0 list its useFrame runs AFTER the single camera
 * authority has written camera.position.y for the frame.
 *
 * TOUCH / NATIVE BRANCH (mobile-parity plan Phase 4d, behind
 * lib/spine.ts RAIL_ISLANDS_TOUCH; `touch` prop from Scene.tsx, true only on
 * a capable phone — tier "lite" + level ≥ 2 + true WebGPU — never on tier
 * "full"). There the DOM rail is a NATIVE snap scroller and the continuous
 * source is the passive `scroll` listener case-studies-rail.tsx registers on
 * it, publishing into the SAME railStore fields with `native` as the liveness
 * flag: trackX := scrollLeft, secTop := the scroller's document top,
 * travel := 0. With travel = 0 the sticky model above degenerates exactly —
 * clampedTop = secTop ⇒ stickyVpTop = secTop − scrollY = the viewport top of
 * a normal-flow element — so the per-frame placement is UNCHANGED; only the
 * measure caches `offsetY` document-relative (`r.top + scrollY − secTop`,
 * the equivalent of `r.top − stickyTop`) instead of against a sticky frame.
 * Two deliberate differences: (1) the native DOM applies NO inner-wrapper
 * center-focus transforms (case-studies-rail header, "No focus motion"), so
 * the mirror is scale 1 / y 0 (t still feeds uParallax; uFocus is 0 because
 * the DOM carries no DoF filter on touch); (2) a touch-only speed fade rides
 * uRouteFade (full at rest, 0 above ~1800 px/s) where speed = max(|rail
 * velocity|, |page scroll velocity|), both px/s: the compositor scrolls the
 * DOM asynchronously on BOTH axes and the passive event + rAF can trail the
 * composited card by a frame under a fast flick, so the plane hides for the
 * beat where it could peek out from under the 45% navy card. With `touch`
 * false the `native` selector is constant false and the pinned path is
 * byte-identical.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { webgpuEnabled } from "./renderer/createRenderer";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { useRailStore } from "./store/railStore";
import { useScrollStore } from "./store/scrollStore";
import { railCardMotion, RAIL_PLANE_PARALLAX } from "./store/railMotion";
import type { RailPlaneUniforms } from "./materials/railPlaneNodeMaterial";

interface CardRect {
  /** data-rail-index (hover key). */
  index: number;
  /** Viewport-x of the card's LEFT edge when trackX = 0. */
  baseVpX: number;
  /** Card top offset within the sticky frame. */
  offsetY: number;
  w: number;
  h: number;
}

type PlaneMaterial = {
  material: THREE.Material;
  uniforms: RailPlaneUniforms;
};

/** Plane inset vs the DOM card so tilt de-registration never peeks out. */
const PLANE_INSET = 0.96;
/** px/s of rail velocity that maps to |uVelocity| = 1 (full bend). */
const VEL_NORM = 1 / 1800;
/** Off-screen cull margin in CSS px. */
const CULL_PAD = 160;
/** Touch-only |velocity| fade on uRouteFade (see header): fully visible at or
 *  below TOUCH_FADE_LO px/s, fully hidden at or above TOUCH_FADE_HI. */
const TOUCH_FADE_LO = 600;
const TOUCH_FADE_HI = 1800;

export function RailPlanes({ touch = false }: { touch?: boolean } = {}) {
  const { size, camera } = useThree();

  // Rare-change reactive reads (allowed): pinned + measureVersion drive the
  // measure passes; everything per-frame goes through getState(). `native`
  // (Phase 4d touch source) is folded behind the `touch` prop so on tier
  // "full" the selector is a constant false — no subscription-driven
  // re-render, no behaviour change on the pinned path.
  const pinned = useRailStore((s) => s.pinned);
  const native = useRailStore((s) => touch && s.native);
  const measureVersion = useRailStore((s) => s.measureVersion);

  // Lazy TSL factory — the `three/webgpu`/`three/tsl` chunk loads only here,
  // mirroring SignatureLine/DriftParticles. Hard no-op when the flag is off
  // (defense in depth; Scene.tsx already gates the mount).
  const [factory, setFactory] = useState<
    ((seed: number) => PlaneMaterial) | null
  >(null);
  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    void import("./materials/railPlaneNodeMaterial").then(
      ({ createRailPlaneMaterial }) => {
        if (cancelled) return;
        setFactory(
          () => (seed: number) =>
            createRailPlaneMaterial(seed) as unknown as PlaneMaterial,
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Card rect measurement — on pin + every measureVersion bump. The bump is
  // emitted from the rail's measure() (a React state write), so this effect
  // runs after the triggering ScrollTrigger.refresh completed: rects reflect
  // settled post-refresh layout.
  const [rects, setRects] = useState<CardRect[]>([]);
  // Touch-only: window.scrollY at the previous native frame, for the page's
  // vertical px/s in the touch fade (NaN = no sample yet). Never read on the
  // pinned path.
  const lastScrollYRef = useRef(Number.NaN);
  useEffect(() => {
    // Touch fade's page-scroll sample: forget it whenever the native source
    // is not armed, so a re-arm (route back, budget step-up) starts from "no
    // delta" instead of one spurious flick-sized delta. Ref write only.
    if (!native) lastScrollYRef.current = Number.NaN;
    if (!pinned && !native) {
      setRects([]);
      return;
    }
    // Reference top the per-card offsetY is cached against. Pinned: the sticky
    // frame's live viewport top (the frame translates with the pin, so the
    // offset is frame-relative). Native (touch): the scroller's document top
    // as published by the DOM writer (`secTop`), so the offset is
    // document-relative — with travel = 0 the frame loop's stickyVpTop is
    // exactly `secTop − scrollY`, and vpY = stickyVpTop + offsetY = card top.
    let refTop: number;
    if (pinned) {
      const sticky = document.querySelector<HTMLElement>("[data-rail-sticky]");
      if (!sticky) {
        setRects([]);
        return;
      }
      refTop = sticky.getBoundingClientRect().top;
    } else {
      refTop = useRailStore.getState().secTop - window.scrollY;
    }
    const { trackX } = useRailStore.getState();
    const next: CardRect[] = [];
    document
      .querySelectorAll<HTMLElement>("[data-rail-card]")
      .forEach((el, i) => {
        const r = el.getBoundingClientRect();
        next.push({
          index: Number(el.dataset.railIndex ?? i),
          baseVpX: r.left + trackX, // un-translate to the trackX = 0 frame
          offsetY: r.top - refTop,
          w: r.width,
          h: r.height,
        });
      });
    setRects(next);
  }, [pinned, native, measureVersion]);

  // One material per card, keyed by COUNT (not by the rects array identity) so
  // re-measures never churn materials. Identical node graphs → one compiled
  // program; each card keeps its own small uniform group.
  const count = rects.length;
  const mats = useMemo<PlaneMaterial[] | null>(() => {
    if (!factory || count === 0) return null;
    return Array.from({ length: count }, (_, i) =>
      factory((i * 0.618034) % 1),
    );
  }, [factory, count]);
  useEffect(() => {
    if (!mats) return;
    return () => mats.forEach((m) => m.material.dispose());
  }, [mats]);

  // Shared unit plane. y-subdivisions carry the velocity bend (sin(uv.y·π)).
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 4, 16), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const hoverEased = useRef<number[]>([]);
  const velSmooth = useRef(0);
  const revealDamped = useRef(0);
  // Per-card noisy-reveal progress, damped toward railStore.reveal[index].
  const cardRevealEased = useRef<number[]>([]);
  // Touch-only |velocity| visibility (1 at rest → 0 under a fast flick).
  const touchFadeRef = useRef(1);
  // Scratch vector for the camera-space → world transform (no per-frame alloc).
  const scratch = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!mats || rects.length === 0) return;
    const rail = useRailStore.getState();
    // `touch` (prop) AND-ed in: a `native` write can only ever come from the
    // touch DOM writer, but the guard mirrors the reactive selector above so
    // the pinned path never depends on it.
    const isNative = touch && rail.native;
    if (!rail.pinned && !isNative) return;
    const { trackX, travel, secTop, progress, velocity, hover, reveal } = rail;

    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;
    // Live Lenis-smoothed scroll (Lenis animates the real window scroll).
    const scrollY = window.scrollY;
    // The sticky frame's viewport top across its three phases (entering /
    // pinned at 0 / released): clamp(scrollY, secTop, secTop+travel) − scrollY.
    const clampedTop = Math.min(Math.max(scrollY, secTop), secTop + travel);
    const stickyVpTop = clampedTop - scrollY;

    revealDamped.current = THREE.MathUtils.damp(
      revealDamped.current,
      useScrollStore.getState().reveal,
      8,
      delta,
    );

    // Bend drive: ScrollTrigger's px/s velocity, normalized + damped. Gated to
    // the active scrub window so parked cards never wobble while the rest of
    // the page scrolls (getVelocity is page-wide).
    const scrubbing = progress > 0.0005 && progress < 0.9995;
    const velTarget = scrubbing
      ? THREE.MathUtils.clamp(velocity * VEL_NORM, -1, 1)
      : 0;
    velSmooth.current = THREE.MathUtils.damp(
      velSmooth.current,
      velTarget,
      6,
      delta,
    );

    // Touch-only compositor-skew guard (see header): hide under a fast flick,
    // recover as the DOM writer publishes velocity 0 on settle. Fast damp so
    // the hide leads the flick rather than trailing it. Constant 1 when pinned.
    //
    // BOTH axes feed the same smoothstep: the compositor scrolls the PAGE
    // asynchronously too (touch scroll is native — lenis-singleton keeps
    // syncTouch off — so a vertical flick over the rail moves the cards under
    // us exactly like a horizontal one, with the plane trailing by the same
    // frame). The vertical speed is window.scrollY's per-frame delta in px/s
    // (useScrollStore.velocity is Lenis' px-per-event figure under native
    // touch scroll and 0 under reduced motion — not a px/s signal); the rail's
    // own |velocity| is already px/s from the DOM writer. speed = max of the
    // two so either flick alone hides the planes.
    if (isNative) {
      const dtSafe = delta > 0 ? delta : 1 / 60;
      const prevY = lastScrollYRef.current;
      // First native frame (NaN sentinel) → no delta yet, treat as at rest.
      const pageVelocityPx = Number.isNaN(prevY) ? 0 : (scrollY - prevY) / dtSafe;
      lastScrollYRef.current = scrollY;
      const speed = Math.max(Math.abs(velocity), Math.abs(pageVelocityPx));
      const target =
        1 -
        THREE.MathUtils.smoothstep(speed, TOUCH_FADE_LO, TOUCH_FADE_HI);
      touchFadeRef.current = THREE.MathUtils.damp(
        touchFadeRef.current,
        target,
        12,
        delta,
      );
    } else if (touchFadeRef.current !== 1) {
      touchFadeRef.current = 1;
    }

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const mesh = meshRefs.current[i];
      const mat = mats[i];
      if (!mesh || !mat) continue;

      const vpX = r.baseVpX - trackX;
      const vpY = stickyVpTop + r.offsetY;
      // Cheap manual cull (frustumCulled is off — positions are per-frame).
      if (
        vpX + r.w < -CULL_PAD ||
        vpX > vw + CULL_PAD ||
        vpY + r.h < -CULL_PAD ||
        vpY > ih + CULL_PAD
      ) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;

      const cx = vpX + r.w / 2;
      // Shared center-focus model (railMotion.ts) — the DOM applies the same
      // scale/arc to the card's inner wrapper, so mirroring it here keeps the
      // plane glued to the card through the falloff (see header). NATIVE
      // (touch): the DOM applies NO inner-wrapper transforms, so the mirror is
      // scale 1 / y 0 or the plane de-registers by up to 6% / 12px; t still
      // drives the interior parallax, f is zeroed (no DOM DoF on touch).
      const motion = railCardMotion(cx, vw);
      const mScale = isNative ? 1 : motion.scale;
      const mY = isNative ? 0 : motion.y;
      const cy = vpY + r.h / 2 + mY;
      // Camera-locked placement (see header): camera-space offset at view
      // distance CAMERA_Z, rotated into world by the camera's live pose.
      scratch.current
        .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -CAMERA_Z)
        .applyQuaternion(camera.quaternion)
        .add(camera.position);
      mesh.position.copy(scratch.current);
      mesh.quaternion.copy(camera.quaternion);
      mesh.scale.set(
        r.w * k * PLANE_INSET * mScale,
        r.h * k * PLANE_INSET * mScale,
        1,
      );

      const target = hover[r.index] ?? 0;
      hoverEased.current[i] = THREE.MathUtils.damp(
        hoverEased.current[i] ?? 0,
        target,
        5,
        delta,
      );
      // Per-card noisy reveal: fire-once target from railStore, damped so the
      // card resolves out of the navy over ~0.5s (island rule: getState, no
      // React commit). Distinct from uRouteFade (the global route transition).
      const revealTarget = reveal[r.index] ?? 0;
      cardRevealEased.current[i] = THREE.MathUtils.damp(
        cardRevealEased.current[i] ?? 0,
        revealTarget,
        4,
        delta,
      );

      const u = mat.uniforms;
      u.uHover.value = hoverEased.current[i];
      u.uVelocity.value = velSmooth.current;
      // touchFadeRef is exactly 1 on the pinned path (see above), so the
      // product is byte-identical there.
      u.uRouteFade.value = revealDamped.current * touchFadeRef.current;
      u.uReveal.value = cardRevealEased.current[i];
      // Analytic center-focus feed: interior counter-parallax + procedural
      // defocus. Both are pure functions of the (Lenis-smoothed) card center,
      // so no extra damping — damping here would lag the plane's interior
      // behind the DOM media parallax driven by the same signal.
      u.uParallax.value = motion.t * RAIL_PLANE_PARALLAX;
      u.uFocus.value = isNative ? 0 : motion.f;
    }
  });

  // Dev-only debug handle (mirrors Scene.tsx's __sersan* console handles):
  // screen-projects each plane through the LIVE camera so registration with
  // the DOM card rects can be asserted in headless QA.
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__sersanRailPlanes = {
      pinned,
      native,
      rectCount: rects.length,
      matCount: mats?.length ?? 0,
      project: (i: number) => {
        const m = meshRefs.current[i];
        if (!m || !m.visible) return null;
        const v = m.position.clone().project(camera);
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      },
    };
  }

  if (!mats || count === 0 || mats.length !== count) return null;

  return (
    <group>
      {rects.map((r, i) => (
        <mesh
          key={r.index}
          ref={(m) => {
            meshRefs.current[i] = m;
          }}
          geometry={geometry}
          material={mats[i].material}
          renderOrder={-1}
          frustumCulled={false}
          visible={false}
        />
      ))}
    </group>
  );
}
