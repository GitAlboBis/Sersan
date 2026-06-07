"use client";

/**
 * RouteHero — the generalized per-route 3D "ritual object" (award sprint, P4).
 *
 * The loved `GatewayPortal` is now ONE config of this component (see
 * GatewayPortal.tsx, a thin wrapper). RouteHero owns the gateway's proven
 * pattern verbatim and exposes it as data:
 *
 *  - world-anchored to its `[data-line-anchor=anchorId]` via the SAME math the
 *    gateway used: `k = WORLD_VIEW_HEIGHT / size.height`, then
 *    `worldY = -fraction * scrollHeight * k`. (`useThree().size` is allowed —
 *    resize-stable; `useThree().viewport` is FORBIDDEN — camera-distance-derived.)
 *  - culling: only rendered when the camera is within ~2.2 view-heights.
 *  - presence: `smoothstep` scale-in by camera distance as the reader arrives.
 *  - inner emissive cyan↔violet pulse (>1, toneMapped:false) so it rides the
 *    SAME threshold Bloom as the line; a scroll flick feeds extra glow energy.
 *  - outer ring turns slowly, inner ring counter-rotates; gentle presentation
 *    wobble so the object is never flat-on.
 *  - tier-gated rim lights sculpting the form against the navy.
 *
 * Two object families:
 *  - `kind:"glb"`   — load a small geometry-only GLB and assign materials here
 *    (the export carries none so everything stays tunable). The GLB loader is
 *    isolated in a lazy + Suspense-wrapped child, so interior-route GLBs never
 *    bloat the home bundle. If a named node is missing, it fails gracefully to
 *    the procedural fallback of the SAME motif rather than throwing.
 *  - `kind:"procedural"` — the default, no-Blender deliverable. `"ring"` echoes
 *    the gateway (segmented diamond-profile torus); `"lattice"` is an
 *    icosahedron EDGE-FRAME cage + a small inner emissive core. Both read as an
 *    "engineered scaffold", never a faceted glass gem (a gem was rejected).
 */
import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";
import type { SceneTier } from "./store/tierStore";

/** Which procedural motif to build when no GLB is supplied (or as fallback). */
export type ProceduralShape = "ring" | "lattice";

export type RouteHeroKind =
  | {
      type: "glb";
      /** Public path to a geometry-only GLB (materials assigned in R3F). */
      path: string;
      /** Node names to look up in the loaded GLB's `nodes` map. */
      nodeNames: { outer?: string; inner?: string };
      /**
       * Procedural motif to fall back to if the GLB load or a named node is
       * unavailable — keeps the route's ritual object on-brand without throwing.
       */
      fallbackShape: ProceduralShape;
    }
  | {
      type: "procedural";
      shape: ProceduralShape;
    };

export interface RimLightConfig {
  /** Position of the always-on rim light. */
  keyPosition?: [number, number, number];
  keyIntensity?: number;
  keyColor?: string;
  /** Position of the full-tier-only fill light. */
  fillPosition?: [number, number, number];
  fillIntensity?: number;
  fillColor?: string;
}

export interface RouteHeroProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
  /** Which `[data-line-anchor=...]` the object glues to. */
  anchorId: string;
  /** What to render. */
  kind: RouteHeroKind;
  /** Base scale before the presence breathe-in. */
  scale?: number;
  /** Z offset of the world anchor (the gateway sits at +0.6). */
  z?: number;
  /** Outer-body PBR colour. */
  outerColor?: string;
  outerMetalness?: number;
  outerRoughness?: number;
  /** Inner emissive endpoints (the pulse lerps A↔B). */
  emissiveA?: string;
  emissiveB?: string;
  /** Base emissive intensity (gets the pulse + velocity boost on top). */
  emissiveIntensity?: number;
  /** Outer rotation rate (rad/s, about local Z). Default matches gateway. */
  outerSpin?: number;
  /** Inner rotation rate (rad/s, about local Z). Default matches gateway. */
  innerSpin?: number;
  rim?: RimLightConfig;
}

// === Gateway-derived choreography constants (do not retune for home). ======
const NEAR_VIEW_HEIGHTS = 2.2;
const PRESENCE_NEAR = 0.6;
const PRESENCE_FAR = 2.2;

/**
 * The shared driver: world-anchoring, culling, presence, rotation, wobble and
 * the inner emissive pulse — all carried over byte-for-byte from GatewayPortal.
 * The geometry (GLB or procedural) is passed in as `outerGeo`/`innerGeo`, so
 * every code path animates identically.
 */
function RouteHeroBody({
  tier,
  anchors,
  anchorId,
  outerGeo,
  innerGeo,
  scale,
  z,
  outerColor,
  outerMetalness,
  outerRoughness,
  emissiveA,
  emissiveB,
  emissiveIntensity,
  outerSpin,
  innerSpin,
  rim,
  /** Set when the geometry came from a GLB (assembly lies in Blender's ground
   *  plane → rotate upright). Procedural geometry is already camera-facing. */
  uprightFromGround,
  /** Dev debug handle key, e.g. "__sersanGate" for the home gateway. */
  debugKey,
  /** Extra fields merged into the dev debug handle (e.g. GLB node names). */
  debugExtra,
}: {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
  anchorId: string;
  outerGeo: THREE.BufferGeometry | undefined;
  innerGeo: THREE.BufferGeometry | undefined;
  scale: number;
  z: number;
  outerColor: string;
  outerMetalness: number;
  outerRoughness: number;
  emissiveA: string;
  emissiveB: string;
  emissiveIntensity: number;
  outerSpin: number;
  innerSpin: number;
  rim: Required<RimLightConfig>;
  uprightFromGround: boolean;
  debugKey?: string;
  debugExtra?: Record<string, unknown>;
}) {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const emissiveColor = useMemo(() => new THREE.Color(), []);
  const colorA = useMemo(() => new THREE.Color(emissiveA), [emissiveA]);
  const colorB = useMemo(() => new THREE.Color(emissiveB), [emissiveB]);

  const outerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: outerColor,
        metalness: outerMetalness,
        roughness: outerRoughness,
      }),
    [outerColor, outerMetalness, outerRoughness],
  );
  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0B1422",
        emissive: emissiveA,
        emissiveIntensity,
        roughness: 0.4,
        toneMapped: false,
      }),
    [emissiveA, emissiveIntensity],
  );
  useEffect(
    () => () => {
      outerMaterial.dispose();
      innerMaterial.dispose();
    },
    [outerMaterial, innerMaterial],
  );

  const k = WORLD_VIEW_HEIGHT / size.height;

  useFrame((state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const delta = Math.min(rawDelta, 1 / 30);

    const fraction = anchors.fractions[anchorId];
    if (
      debugKey &&
      process.env.NODE_ENV !== "production" &&
      typeof window !== "undefined"
    ) {
      (window as unknown as Record<string, unknown>)[debugKey] = {
        fraction,
        scrollHeight: anchors.scrollHeight,
        camY: camera.position.y,
        hasOuter: !!outerGeo,
        hasInner: !!innerGeo,
        ...debugExtra,
      };
    }
    if (fraction === undefined || anchors.scrollHeight <= 1) {
      group.visible = false;
      return;
    }

    // World anchor at the section's center; same x/z as the line's last
    // waypoint so the beam threads the object.
    const worldY = -fraction * anchors.scrollHeight * k;
    group.position.set(0, worldY, z);

    // Only worth rendering when the camera is approaching the section.
    const distance = Math.abs(camera.position.y - worldY);
    const near = distance < WORLD_VIEW_HEIGHT * NEAR_VIEW_HEIGHTS;
    group.visible = near;
    if (!near) return;

    // Approach choreography: the object breathes up to size as you arrive.
    const presence =
      1 -
      THREE.MathUtils.smoothstep(
        distance,
        WORLD_VIEW_HEIGHT * PRESENCE_NEAR,
        WORLD_VIEW_HEIGHT * PRESENCE_FAR,
      );
    group.scale.setScalar(scale * (0.82 + 0.18 * presence));

    const t = state.clock.elapsedTime;
    if (outerRef.current) outerRef.current.rotation.z += delta * outerSpin;
    if (innerRef.current) innerRef.current.rotation.z -= delta * innerSpin;
    // Gentle presentation wobble, never flat-on.
    group.rotation.x = Math.sin(t * 0.16) * 0.1;
    group.rotation.y = Math.cos(t * 0.12) * 0.14;

    // Inner element breathes between the brand hues; a scroll flick feeds a
    // little extra energy into the glow, same trick as the line.
    const mix = 0.5 + 0.5 * Math.sin(t * 0.5);
    emissiveColor.copy(colorA).lerp(colorB, mix);
    innerMaterial.emissive = emissiveColor;
    const boost = Math.min(
      Math.abs(useScrollStore.getState().velocity) * 0.003,
      0.5,
    );
    innerMaterial.emissiveIntensity =
      (1.9 + 0.5 * Math.sin(t * 0.9) + boost) * presence;
  });

  if (!outerGeo) return null;

  // GLB tori lie in Blender's ground plane — rotate the assembly upright so the
  // ring faces the camera and the line can thread it. Procedural geometry is
  // authored already facing the camera, so it needs no extra rotation.
  const assembly = (
    <group rotation={uprightFromGround ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <group ref={outerRef}>
        <mesh geometry={outerGeo} material={outerMaterial} />
      </group>
      {innerGeo && (
        <group ref={innerRef}>
          <mesh geometry={innerGeo} material={innerMaterial} />
        </group>
      )}
    </group>
  );

  return (
    <group ref={groupRef} visible={false}>
      {assembly}
      {/* Rim lights sculpting the form against the navy. */}
      <pointLight
        position={rim.keyPosition}
        intensity={rim.keyIntensity}
        color={rim.keyColor}
      />
      {tier === "full" && (
        <pointLight
          position={rim.fillPosition}
          intensity={rim.fillIntensity}
          color={rim.fillColor}
        />
      )}
    </group>
  );
}

// === Procedural geometry families ==========================================

/**
 * "ring" — a segmented, diamond-profile torus echoing the gateway's machined
 * double ring. Outer torus (legible facets via low radial segments) + a thin
 * inner counter-ring that carries the emissive glow.
 */
function buildRingGeometry(): {
  outer: THREE.BufferGeometry;
  inner: THREE.BufferGeometry;
} {
  // radialSegments 4 → a diamond cross-section (faceted, "machined"); low
  // tubularSegments would polygonise the ring, so keep it high.
  const outer = new THREE.TorusGeometry(1, 0.12, 4, 96);
  const inner = new THREE.TorusGeometry(0.78, 0.03, 8, 128);
  return { outer, inner };
}

/**
 * "lattice" — an icosahedron EDGE-FRAME cage (thin struts along the icosa's
 * edges, built as a single merged tube-per-edge geometry via cylinders) plus a
 * small inner emissive core sphere. Reads as an engineered scaffold, NOT a
 * faceted crystal.
 */
function buildLatticeGeometry(): {
  outer: THREE.BufferGeometry;
  inner: THREE.BufferGeometry;
} {
  const ico = new THREE.IcosahedronGeometry(1, 0);
  // Unique edges from the (non-indexed for Icosahedron r0) triangle soup.
  const pos = ico.getAttribute("position") as THREE.BufferAttribute;
  const v = (i: number) =>
    new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
  const edgeKey = (a: THREE.Vector3, b: THREE.Vector3) => {
    const ka = `${a.x.toFixed(4)},${a.y.toFixed(4)},${a.z.toFixed(4)}`;
    const kb = `${b.x.toFixed(4)},${b.y.toFixed(4)},${b.z.toFixed(4)}`;
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
  };
  const seen = new Set<string>();
  const edges: [THREE.Vector3, THREE.Vector3][] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const tri = [v(i), v(i + 1), v(i + 2)];
    for (let e = 0; e < 3; e++) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      const key = edgeKey(a, b);
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b]);
    }
  }
  ico.dispose();

  // A thin strut per edge: a unit cylinder oriented + scaled along the edge.
  const struts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const STRUT_RADIUS = 0.022;
  for (const [a, b] of edges) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const strut = new THREE.CylinderGeometry(
      STRUT_RADIUS,
      STRUT_RADIUS,
      len,
      6,
      1,
    );
    const quat = new THREE.Quaternion().setFromUnitVectors(
      up,
      dir.clone().normalize(),
    );
    const m = new THREE.Matrix4()
      .makeRotationFromQuaternion(quat)
      .setPosition(mid);
    strut.applyMatrix4(m);
    struts.push(strut);
  }
  const outer = mergeGeometries(struts);
  struts.forEach((g) => g.dispose());

  const inner = new THREE.IcosahedronGeometry(0.34, 1);
  return { outer, inner };
}

/**
 * Minimal BufferGeometry merge (avoids importing three's examples util, which
 * would pull addons into the bundle). All inputs share the same non-indexed
 * position+normal layout produced by CylinderGeometry, so concatenating their
 * position/normal/uv attributes is sufficient.
 */
function mergeGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Ensure all are non-indexed and share attributes.
  const nonIndexed = geoms.map((g) => (g.index ? g.toNonIndexed() : g));
  let posCount = 0;
  for (const g of nonIndexed) {
    posCount += (g.getAttribute("position") as THREE.BufferAttribute).count;
  }
  const positions = new Float32Array(posCount * 3);
  const normals = new Float32Array(posCount * 3);
  let offset = 0;
  for (const g of nonIndexed) {
    const p = g.getAttribute("position") as THREE.BufferAttribute;
    const n = g.getAttribute("normal") as THREE.BufferAttribute | undefined;
    positions.set(p.array as Float32Array, offset * 3);
    if (n) normals.set(n.array as Float32Array, offset * 3);
    offset += p.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  // Dispose the throwaway non-indexed copies we created.
  nonIndexed.forEach((g, i) => {
    if (g !== geoms[i]) g.dispose();
  });
  return merged;
}

/** Renders the procedural family + drives it through the shared body. */
function ProceduralRouteHero(
  props: Omit<RouteHeroProps, "kind"> & { shape: ProceduralShape },
) {
  const { shape, ...rest } = props;
  const geo = useMemo(
    () => (shape === "lattice" ? buildLatticeGeometry() : buildRingGeometry()),
    [shape],
  );
  useEffect(
    () => () => {
      geo.outer.dispose();
      geo.inner.dispose();
    },
    [geo],
  );
  return (
    <RouteHeroBody
      {...resolveBodyProps(rest)}
      outerGeo={geo.outer}
      innerGeo={geo.inner}
      uprightFromGround={false}
    />
  );
}

// === GLB family (lazy-isolated so it never bloats non-home bundles) ========

interface GlbInnerProps extends Omit<RouteHeroProps, "kind"> {
  path: string;
  nodeNames: { outer?: string; inner?: string };
  fallbackShape: ProceduralShape;
}

/**
 * The actual GLB-reading component. Split into its own module-lazy chunk
 * (see `LazyGlb` below) so `useGLTF`/loader code is not pulled into the home
 * bundle for procedural-only routes.
 */
const LazyGlb = lazy(() =>
  import("./RouteHeroGlb").then((m) => ({ default: m.RouteHeroGlb })),
);

export type { GlbInnerProps };

/**
 * Normalizes RouteHeroProps' optional knobs into the fully-resolved set
 * RouteHeroBody expects. Defaults reproduce the gateway exactly.
 */
function resolveBodyProps(
  p: Omit<RouteHeroProps, "kind">,
): Omit<
  Parameters<typeof RouteHeroBody>[0],
  "outerGeo" | "innerGeo" | "uprightFromGround" | "debugKey" | "debugExtra"
> {
  const rim = p.rim ?? {};
  return {
    tier: p.tier,
    anchors: p.anchors,
    anchorId: p.anchorId,
    scale: p.scale ?? 2.1,
    z: p.z ?? 0.6,
    outerColor: p.outerColor ?? "#1a2c49",
    outerMetalness: p.outerMetalness ?? 0.85,
    outerRoughness: p.outerRoughness ?? 0.28,
    emissiveA: p.emissiveA ?? "#3BE1FF",
    emissiveB: p.emissiveB ?? "#7C5CFF",
    emissiveIntensity: p.emissiveIntensity ?? 2.2,
    outerSpin: p.outerSpin ?? 0.16,
    innerSpin: p.innerSpin ?? 0.34,
    rim: {
      keyPosition: rim.keyPosition ?? [2.6, 1.6, 2.4],
      keyIntensity: rim.keyIntensity ?? 2.6,
      keyColor: rim.keyColor ?? "#3BE1FF",
      fillPosition: rim.fillPosition ?? [-2.4, -1.8, 1.8],
      fillIntensity: rim.fillIntensity ?? 1.6,
      fillColor: rim.fillColor ?? "#7C5CFF",
    },
  };
}

/**
 * Public component. Picks the GLB or procedural path, defaults every knob to
 * the gateway's values, and shares ALL choreography through RouteHeroBody.
 *
 * For the GLB path, the loader chunk is lazy + Suspense-wrapped here so the
 * import only lands when a GLB route is actually mounted; the fallback (and any
 * missing-node case) renders the procedural motif of the same family.
 */
export function RouteHero({
  kind,
  debugKey,
  ...rest
}: RouteHeroProps & { debugKey?: string }) {
  if (kind.type === "procedural") {
    return <ProceduralRouteHero {...rest} shape={kind.shape} />;
  }
  // GLB path. While the GLB streams in, render NOTHING (fallback={null}) — the
  // ritual object is anchored deep in the page and the GLB is preloaded, so it
  // is virtually always resolved by the time the object is near; this matches
  // the gateway's prior loading behavior exactly (home byte-identical). The
  // procedural same-motif fallback for a genuinely MISSING node is handled
  // inside RouteHeroGlb (a loaded-but-empty GLB), not here.
  return (
    <Suspense fallback={null}>
      <LazyGlb
        {...rest}
        path={kind.path}
        nodeNames={kind.nodeNames}
        fallbackShape={kind.fallbackShape}
        debugKey={debugKey}
      />
    </Suspense>
  );
}

// Internals re-exported for the lazy GLB chunk to share the exact driver +
// defaults, so the GLB and procedural paths can never drift.
export { RouteHeroBody, ProceduralRouteHero, resolveBodyProps };
