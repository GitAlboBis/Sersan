"use client";

/**
 * FeaturedWorkPlanes — DOM-synced depth-parallax planes over the home
 * Featured Work grid (work-section refactor 2026-08-20; the WebGL half of
 * components/sections/featured-work.tsx, materials/depthParallaxNodeMaterial).
 *
 * One plane per [data-featured-media] whose study ships a depthImage (the
 * Sersan builds with product stills; logo cards stay DOM-only). Successor to
 * RailPlanes with the same architecture decisions, inherited wholesale:
 *
 *   - TSL-only (no GLSL twin): Scene mounts this exclusively on the
 *     WebGPU-flag full-tier home path; everywhere else the DOM still + CSS
 *     hover is the whole card (featured-work.tsx is complete on its own).
 *   - CAMERA-LOCKED billboards: each plane sits in camera space at view
 *     distance CAMERA_Z and inherits the camera quaternion, so registration
 *     with the DOM rect is exact under the signature line's camera drift
 *     (see RailPlanes' header for the full derivation).
 *   - No getBoundingClientRect in the frame loop: rects are measured into
 *     DOCUMENT space on mount/resize/layout shifts; per-frame vpY is
 *     docTop − window.scrollY (normal-flow section — no sticky phase math).
 *   - Per-frame state via getState() only (pointerStore, featuredStore,
 *     scrollStore); the sole reactive reads are the rare-change measure keys.
 *
 * MOTION (CPU-integrated per card, ANALISI_LUSION_WORK.md §2.3–2.4 ported
 * verbatim; the material only reads uniforms):
 *   - ENTRANCE: showTime ramps while on screen (reset off-screen → re-entry
 *     replays, as Lusion does): drives uShow (SDF mask 70→100%) and the mesh
 *     slide-in from the card's own column side (±10% vw, rot.z ±0.1·(1−t),
 *     expoOut over 2s).
 *   - HOVER: hoverRatio integrates ±dt; the focus spring
 *     SecondOrderDynamics(1, .6, 2) chases the pointer in card-px space with
 *     the entry micro-wobble (cos(t·20) decaying over the first 0.3 of
 *     hover); the zoom spring (2.2, .7, 3) pushes 2.5%; random uShift
 *     impulses fire crossing hover thresholds [0, .2, .3] then decay ×0.95;
 *     dofRatio (+0.75/−1 per s) racks uDofOffset 0 → −0.5.
 *   - RIPPLE: page scroll velocity (self-sampled px/s, damped) →
 *     uRipple = min(0.15, |v|·strength) — the §2.5 screen-space shear.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { webgpuEnabled } from "./renderer/createRenderer";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { useFeaturedStore } from "./store/featuredStore";
import { useScrollStore } from "./store/scrollStore";
import { usePointerStore } from "./store/pointerStore";
import { caseStudies } from "@/data/case-studies";
import type { DepthParallaxUniforms } from "./materials/depthParallaxNodeMaterial";

/** Off-screen cull margin in CSS px. */
const CULL_PAD = 160;
/** px/s of page scroll that maps to full ripple drive. */
const RIPPLE_VEL_NORM = 1 / 2400;
/** Hover reframe-impulse thresholds (port source `hoverThresholds`). */
const HOVER_THRESHOLDS = [0, 0.2, 0.3];

/* ------------------------------------------------------------------------- */
/* SecondOrderDynamics — t3ssel8r's critically-tunable spring, the port
   source's motion primitive (f = frequency Hz, z = damping, r = response). */
/* ------------------------------------------------------------------------- */
class SOD {
  private k1: number;
  private k2: number;
  private k3: number;
  private xp: number;
  y: number;
  private yd = 0;
  target: number;
  constructor(x0: number, f: number, z: number, r: number) {
    this.k1 = z / (Math.PI * f);
    this.k2 = 1 / (2 * Math.PI * f) ** 2;
    this.k3 = (r * z) / (2 * Math.PI * f);
    this.xp = x0;
    this.y = x0;
    this.target = x0;
  }
  update(dt: number) {
    if (dt <= 0) return this.y;
    const xd = (this.target - this.xp) / dt;
    this.xp = this.target;
    // Stability clamp (the standard k2 floor for large dt).
    const k2 = Math.max(this.k2, (dt * dt) / 2 + (dt * this.k1) / 2, dt * this.k1);
    this.y += dt * this.yd;
    this.yd += (dt * (this.target + this.k3 * xd - this.y - this.k1 * this.yd)) / k2;
    return this.y;
  }
}

class SOD3 {
  x: SOD;
  yv: SOD;
  z: SOD;
  constructor(f: number, z: number, r: number) {
    this.x = new SOD(0, f, z, r);
    this.yv = new SOD(0, f, z, r);
    this.z = new SOD(-1, f, z, r);
  }
  update(dt: number, out: THREE.Vector3) {
    out.set(this.x.update(dt), this.yv.update(dt), this.z.update(dt));
  }
}

const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const fit01 = (v: number, lo: number, hi: number) =>
  THREE.MathUtils.clamp((v - lo) / (hi - lo), 0, 1);

interface PlaneRect {
  id: string;
  docX: number;
  docY: number;
  w: number;
  h: number;
  side: 1 | -1;
}

type PlaneMaterial = {
  material: THREE.Material;
  uniforms: DepthParallaxUniforms;
};

/** Per-card CPU motion state (springs + integrators). */
interface CardMotion {
  hoverRatio: number;
  prevHoverRatio: number;
  showTime: number;
  dofRatio: number;
  focus: SOD3;
  zoom: SOD;
  shiftTarget: THREE.Vector2;
  shift: THREE.Vector2;
}

const newMotion = (): CardMotion => ({
  hoverRatio: 0,
  prevHoverRatio: 0,
  showTime: 0,
  dofRatio: 0,
  focus: new SOD3(1, 0.6, 2),
  zoom: new SOD(0, 2.2, 0.7, 3),
  shiftTarget: new THREE.Vector2(),
  shift: new THREE.Vector2(),
});

function thresholdIndex(v: number): number {
  for (let i = 0; i < HOVER_THRESHOLDS.length; i++)
    if (v < HOVER_THRESHOLDS[i]) return i;
  return HOVER_THRESHOLDS.length;
}

export function FeaturedWorkPlanes() {
  const { size, camera } = useThree();

  /* Lazy TSL factory + per-study textures (flag-gated, defense in depth). */
  const [built, setBuilt] = useState<
    | {
        mats: Map<string, PlaneMaterial>;
        dispose: () => void;
      }
    | null
  >(null);
  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    const owned = caseStudies.filter((s) => s.previewImage && s.depthImage);
    if (owned.length === 0) return;
    void import("./materials/depthParallaxNodeMaterial").then(
      ({ createDepthParallaxMaterial }) => {
        if (cancelled) return;
        const loader = new THREE.TextureLoader();
        const mats = new Map<string, PlaneMaterial>();
        const textures: THREE.Texture[] = [];
        for (const s of owned) {
          const still = loader.load(s.previewImage!, (t) => {
            // Intrinsic size lands async — cover-fit reads it via uniform.
            sizeU.set(t.image.width, t.image.height);
          });
          still.colorSpace = THREE.SRGBColorSpace;
          const depth = loader.load(s.depthImage!);
          depth.colorSpace = THREE.NoColorSpace;
          depth.minFilter = THREE.LinearFilter;
          depth.generateMipmaps = false;
          textures.push(still, depth);
          // Placeholder aspect until the still resolves (preview shots are
          // landscape product frames; 3:2 is close enough for frame one).
          const sizeU = new THREE.Vector2(1200, 800);
          mats.set(
            s.id,
            createDepthParallaxMaterial({
              still,
              depth,
              textureSize: sizeU,
            }) as unknown as PlaneMaterial,
          );
        }
        setBuilt({
          mats,
          dispose: () => {
            mats.forEach((m) => m.material.dispose());
            textures.forEach((t) => t.dispose());
          },
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => built?.dispose, [built]);

  /* Ownership flag → the DOM fades its stills (featured-work.tsx mirror). */
  useEffect(() => {
    if (!built) return;
    useFeaturedStore.getState().setPlanesLive(true);
    return () => useFeaturedStore.getState().setPlanesLive(false);
  }, [built]);

  /* Rect measurement — document space, re-run on resize + layout shifts
     (body ResizeObserver debounced to a frame) + font settle. */
  const [rects, setRects] = useState<PlaneRect[]>([]);
  const [measureTick, setMeasureTick] = useState(0);
  useEffect(() => {
    if (!built) return;
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMeasureTick((t) => t + 1));
    };
    window.addEventListener("resize", bump);
    const ro = new ResizeObserver(bump);
    ro.observe(document.body);
    void document.fonts?.ready.then(bump);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", bump);
      ro.disconnect();
    };
  }, [built]);
  useEffect(() => {
    if (!built) return;
    const next: PlaneRect[] = [];
    const els = document.querySelectorAll<HTMLElement>("[data-featured-media]");
    let gridIndex = 0;
    els.forEach((el) => {
      const id = el.dataset.featuredMedia ?? "";
      const side: 1 | -1 = gridIndex % 2 ? 1 : -1;
      gridIndex++;
      if (!built.mats.has(id)) return; // DOM-only card (no depth twin)
      const r = el.getBoundingClientRect();
      next.push({
        id,
        docX: r.left,
        docY: r.top + window.scrollY,
        w: r.width,
        h: r.height,
        side,
      });
    });
    setRects(next);
  }, [built, measureTick]);

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 1), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const motions = useRef(new Map<string, CardMotion>());
  const routeFade = useRef(0);
  const rippleSmooth = useRef(0);
  const lastScrollY = useRef(Number.NaN);
  const scratch = useRef(new THREE.Vector3());
  const time = useRef(0);

  useFrame((_, delta) => {
    if (!built || rects.length === 0) return;
    time.current += delta;
    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;
    const scrollY = window.scrollY;

    routeFade.current = THREE.MathUtils.damp(
      routeFade.current,
      useScrollStore.getState().reveal,
      8,
      delta,
    );

    /* Page-velocity ripple (self-sampled px/s — robust under both Lenis and
       native scroll, unlike scrollStore.velocity's px/frame figure). */
    const dtSafe = delta > 0 ? delta : 1 / 60;
    const prevY = lastScrollY.current;
    const pageVel = Number.isNaN(prevY) ? 0 : (scrollY - prevY) / dtSafe;
    lastScrollY.current = scrollY;
    rippleSmooth.current = THREE.MathUtils.damp(
      rippleSmooth.current,
      Math.min(0.15, Math.abs(pageVel) * RIPPLE_VEL_NORM * 0.5),
      6,
      delta,
    );

    const hoverId = useFeaturedStore.getState().hoverId;
    const pointer = usePointerStore.getState().raw;
    const mx = pointer.x * vw;
    const my = pointer.y * ih;

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const mesh = meshRefs.current[i];
      const mat = built.mats.get(r.id);
      if (!mesh || !mat) continue;

      const vpX = r.docX;
      const vpY = r.docY - scrollY;
      if (
        vpX + r.w < -CULL_PAD ||
        vpX > vw + CULL_PAD ||
        vpY + r.h < -CULL_PAD ||
        vpY > ih + CULL_PAD
      ) {
        mesh.visible = false;
        const mOut = motions.current.get(r.id);
        if (mOut) {
          // Off-screen reset → re-entry replays the entrance (port §2.4).
          mOut.showTime = 0;
        }
        continue;
      }
      mesh.visible = true;

      let m = motions.current.get(r.id);
      if (!m) {
        m = newMotion();
        motions.current.set(r.id, m);
      }

      /* --- hover ratio + impulses (port §2.3) --- */
      const isHover = hoverId === r.id;
      m.prevHoverRatio = m.hoverRatio;
      m.hoverRatio = THREE.MathUtils.clamp(
        m.hoverRatio + (isHover ? 1 : -1) * delta,
        0,
        1,
      );
      if (m.prevHoverRatio < m.hoverRatio) {
        const was = thresholdIndex(m.prevHoverRatio);
        const now = thresholdIndex(m.hoverRatio);
        if (now !== was) {
          m.shiftTarget
            .set(Math.random() - 0.5, Math.random() - 0.5)
            .normalize()
            .multiplyScalar(1 - fit01(m.hoverRatio, 0, 0.6));
          if (now === HOVER_THRESHOLDS.length) m.shiftTarget.multiplyScalar(0.5);
        }
      } else {
        m.shiftTarget.multiplyScalar(0.95);
      }
      m.shift.lerp(m.shiftTarget, 0.2);

      /* --- focus spring target (card-px space, y up to match uv) --- */
      if (isHover) {
        const wobble =
          m.hoverRatio > 0 ? (1 - fit01(m.hoverRatio, 0, 0.3)) * r.h * 0.75 : 0;
        const localX = mx - vpX - r.w / 2 + Math.cos(time.current * 20) * wobble;
        const localY = my - vpY - r.h / 2 - Math.sin(time.current * 30) * wobble;
        m.focus.x.target = (localX / r.w) * -r.h;
        // Shader px-space is y-up (uv−.5 domain); pointer y is DOM y-down.
        m.focus.yv.target = (localY / r.h) * r.h;
        m.focus.z.target = 0.5;
      } else {
        m.focus.x.target = 0;
        m.focus.yv.target = 0;
        m.focus.z.target = -1;
      }
      m.zoom.target = isHover ? 1 : 0;
      m.dofRatio = THREE.MathUtils.clamp(
        m.dofRatio + (isHover ? 0.75 : -1) * delta,
        0,
        1,
      );

      /* --- entrance (§2.4): mask grow + side slide on the mesh --- */
      m.showTime += delta;
      const show = expoOut(fit01(m.showTime, 0, 1.5));
      const slide = expoOut(fit01(m.showTime, 0, 2));

      const u = mat.uniforms;
      m.focus.update(delta, u.uFocusPos.value);
      u.uZoom.value = m.zoom.update(delta);
      u.uShift.value.copy(m.shift);
      u.uDofOffset.value = THREE.MathUtils.lerp(0, -0.5, m.dofRatio);
      u.uShow.value = show;
      u.uActive.value = 0;
      u.uRipple.value = rippleSmooth.current;
      u.uRouteFade.value = routeFade.current;
      u.uDomWH.value.set(r.w, r.h);

      const cx = r.docX + r.w / 2 + (1 - slide) * r.side * vw * 0.1;
      const cy = vpY + r.h / 2;
      scratch.current
        .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -CAMERA_Z)
        .applyQuaternion(camera.quaternion)
        .add(camera.position);
      mesh.position.copy(scratch.current);
      mesh.quaternion.copy(camera.quaternion);
      if (slide < 1) mesh.rotateZ((1 - slide) * r.side * -0.1);
      mesh.scale.set(r.w * k, r.h * k, 1);
    }
  });

  if (!built || rects.length === 0) return null;

  return (
    <>
      {rects.map((r, i) => {
        const mat = built.mats.get(r.id);
        if (!mat) return null;
        return (
          <mesh
            key={r.id}
            ref={(el) => {
              meshRefs.current[i] = el;
            }}
            geometry={geometry}
            material={mat.material}
            frustumCulled={false}
            renderOrder={-1}
            visible={false}
          />
        );
      })}
    </>
  );
}
