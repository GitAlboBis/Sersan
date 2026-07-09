"use client";

/**
 * ResourcePreviewPlane — the camera-locked WebGL "signal" plane that condenses
 * under the cursor while the visitor hovers an article on /resources (BEAT 3;
 * research/step-6-resources-band.md §3b).
 *
 * A single plane painted by the persistent canvas, following the eased cursor
 * position published by resource-preview.tsx into resourcePreviewStore. TSL-
 * only: mounted by Scene.tsx exclusively on the WebGPU-flag path at full tier
 * on "/resources" — on the classic flag-OFF path or lite/off tiers this
 * component never mounts and the DOM gradient card in resource-preview.tsx is
 * the whole preview (see resourcePreviewNodeMaterial header for the GLSL-twin
 * decision).
 *
 * ANCHORING — camera-LOCKED screen-space placement, identical contract to
 * RailPlanes (see its header for the full derivation):
 *
 *     camera-space (x, y, −CAMERA_Z), x = (cx − vw/2)·k, y = (ih/2 − cy)·k
 *     world = camera.position + camera.quaternion · (x, y, −CAMERA_Z)
 *
 * A camera-facing plane at constant camera-space depth projects to an EXACT
 * affine screen rect, so the plane tracks the published cursor position
 * pixel-exactly under any camera pose (the signature line's lookAt tilt, the
 * descent beat) — all cancel by construction. cx/cy come from the store's eased
 * targetX/targetY (clip [0..1] top-left) × the live viewport size; NO
 * getBoundingClientRect in the frame loop.
 *
 * The plane "inherits the pointer flowmap" by reading the SAME smoothed
 * pointerStore.vel that feeds the global PointerFlowmap — the preview bows with
 * the cursor exactly like the global liquid-glass breath, without coupling to
 * PostFXNodes' private flowmap closure.
 *
 * Frame order: mounted AFTER SignatureLine (Scene JSX order), so within R3F's
 * priority-0 list its useFrame runs AFTER the single camera authority has
 * written camera.position/quaternion for the frame.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useFrame, useThree } from "@react-three/fiber";
import { webgpuEnabled } from "./renderer/createRenderer";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { useResourcePreviewStore } from "./store/resourcePreviewStore";
import { usePointerStore } from "./store/pointerStore";
import type { ResourcePreviewUniforms } from "./materials/resourcePreviewNodeMaterial";

type PlaneMaterial = {
  material: THREE.Material;
  uniforms: ResourcePreviewUniforms;
};

/** Preview plane size in CSS px (camera-locked, scaled by k). */
const PREVIEW_W = 320;
const PREVIEW_H = 220;
/** px/s of pointer velocity (clip units/s) that maps to |uVel| = 1. */
const VEL_NORM = 1 / 2.2;

export function ResourcePreviewPlane() {
  const { size, camera } = useThree();

  // Lazy TSL factory — the three/webgpu + three/tsl chunk loads only here,
  // mirroring RailPlanes/SignatureLine. Hard no-op when the flag is off
  // (defense in depth; Scene.tsx already gates the mount).
  const [factory, setFactory] = useState<(() => PlaneMaterial) | null>(null);
  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    void import("./materials/resourcePreviewNodeMaterial").then(
      ({ createResourcePreviewMaterial }) => {
        if (cancelled) return;
        setFactory(
          () => () => createResourcePreviewMaterial() as unknown as PlaneMaterial,
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const mat = useMemo<PlaneMaterial | null>(
    () => (factory ? factory() : null),
    [factory],
  );
  useEffect(() => {
    if (!mat) return;
    return () => mat.material.dispose();
  }, [mat]);

  // Unit plane; y-subdivisions carry the velocity bend (sin(uv.y·π)).
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 4, 16), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const meshRef = useRef<THREE.Mesh | null>(null);
  const hoverEased = useRef(0);
  const velSmooth = useRef(0);
  // Click-wipe: last consumed nonce + the live timeline driving uWipe.value.
  const lastWipeNonce = useRef(0);
  const wipeTl = useRef<gsap.core.Timeline | null>(null);
  useEffect(() => () => {
    wipeTl.current?.kill();
  }, []);
  // Eased screen-space follower (px) — smooths any residual step at the store
  // level and lets the plane settle to rest center while hidden.
  const cxEased = useRef(size.width / 2);
  const cyEased = useRef(size.height / 2);
  const scratch = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mat || !mesh) return;

    const { activeIndex, targetX, targetY, seed, wipeNonce, wipeOriginX, wipeOriginY } =
      useResourcePreviewStore.getState();
    const hoverTarget = activeIndex >= 0 ? 1 : 0;
    hoverEased.current = THREE.MathUtils.damp(
      hoverEased.current,
      hoverTarget,
      6,
      delta,
    );

    // Fully hidden + idle → skip the placement work entirely. Stay visible while
    // a click-wipe is playing even if the hover has already eased out.
    if (
      hoverEased.current < 0.002 &&
      hoverTarget === 0 &&
      mat.uniforms.uWipe.value < 0.002
    ) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;

    // Fire a fresh click-wipe when the store's nonce bumps. Origin is the click
    // point expressed in PLANE-LOCAL uv (the plane is centered on the eased
    // follower; clip-y grows downward, uv-y upward → flip). Mutate .value only
    // (island rule); gsap drives it off React on its own ticker.
    if (wipeNonce !== lastWipeNonce.current) {
      lastWipeNonce.current = wipeNonce;
      const lx = 0.5 + ((wipeOriginX - targetX) * vw) / PREVIEW_W;
      const ly = 0.5 - ((wipeOriginY - targetY) * ih) / PREVIEW_H;
      mat.uniforms.uWipeOrigin.value.set(
        THREE.MathUtils.clamp(lx, 0, 1),
        THREE.MathUtils.clamp(ly, 0, 1),
      );
      wipeTl.current?.kill();
      mat.uniforms.uWipe.value = 0;
      wipeTl.current = gsap
        .timeline()
        .to(mat.uniforms.uWipe, { value: 1, duration: 0.5, ease: "power2.out" })
        .to(mat.uniforms.uWipe, { value: 0, duration: 0.32, ease: "power1.in" });
    }

    // Follow the published cursor target (clip [0..1] top-left → px).
    cxEased.current = THREE.MathUtils.damp(
      cxEased.current,
      targetX * vw,
      18,
      delta,
    );
    cyEased.current = THREE.MathUtils.damp(
      cyEased.current,
      targetY * ih,
      18,
      delta,
    );
    const cx = cxEased.current;
    const cy = cyEased.current;

    // Inherit the pointer flowmap: same smoothed pointerStore.vel the global
    // PointerFlowmap reads. X drives the bend.
    const vel = usePointerStore.getState().vel;
    const velTarget = THREE.MathUtils.clamp(vel.x / VEL_NORM, -1, 1);
    velSmooth.current = THREE.MathUtils.damp(
      velSmooth.current,
      velTarget,
      6,
      delta,
    );

    // Camera-locked placement (see header): camera-space offset at view
    // distance CAMERA_Z, rotated into world by the camera's live pose.
    scratch.current
      .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -CAMERA_Z)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    mesh.position.copy(scratch.current);
    mesh.quaternion.copy(camera.quaternion);
    mesh.scale.set(PREVIEW_W * k, PREVIEW_H * k, 1);

    const u = mat.uniforms;
    u.uHover.value = hoverEased.current;
    u.uVel.value = velSmooth.current;
    u.uSeed.value = seed;
  });

  // Dev-only debug handle (mirrors __sersanRailPlanes): screen-projects the
  // plane through the LIVE camera so registration can be asserted in QA.
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__sersanResourcePreview = {
      hasMat: !!mat,
      project: () => {
        const m = meshRef.current;
        if (!m || !m.visible) return null;
        const v = m.position.clone().project(camera);
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      },
    };
  }

  if (!mat) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={mat.material}
      renderOrder={-1}
      frustumCulled={false}
      visible={false}
    />
  );
}
