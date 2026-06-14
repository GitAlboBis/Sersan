"use client";

/**
 * NeuralLattice — the FIX 3 unified neural-lattice WebGL island.
 *
 * Replaces the Problem section's IncidentConsole ("the network that BREAKS")
 * and the ProductionGrade section's three file panels ("the network that is
 * HEALTHY") with ONE shared visual vocabulary: a small feed-forward lattice
 * (input → hidden → output) of billboarded emissive nodes + additive edges +
 * a travelling signal packet per pathway, all cyan→violet on the existing
 * selective-bloom path. The signature line threads THROUGH it (the lattice is
 * additive / renderOrder -1 / depthWrite:false, so the line — depthTest:true —
 * is never occluded and the lattice never occludes it).
 *
 *   mode "broken"  (Problem, anchor "problem"): three pathways, each goes DARK
 *     at its break edge and its travelling packet DIES there → the 3 failure
 *     modes (no evals / no traces / no boundaries).
 *   mode "healthy" (ProductionGrade, anchor "production"): three clusters pulse
 *     in sequence (eval baseline → trace propagation → guardrail clamp) and the
 *     packets complete the path.
 *
 * ANCHORING — camera-LOCKED screen-space placement, identical contract to
 * CompliancePipeline3D / RailPlanes (see their headers for the full derivation):
 *
 *     camera-space (x, y, −CAMERA_Z), x = (cx − vw/2)·k, y = (ih/2 − cy)·k
 *     world = camera.position + camera.quaternion · (x, y, −CAMERA_Z)
 *     group.quaternion = camera.quaternion ; group.scale = (rectW·k, rectH·k, 1)
 *
 * A mid-page world object de-registers under SignatureLine's lookAt tilt; a
 * camera-locked group at constant camera-space depth projects to an EXACT affine
 * screen rect under any camera pose, so it stays pixel-registered to the section
 * rect while the line's tilt is active. The rect is read from a measured
 * [data-lattice-anchor] element on measureVersion bumps — NEVER
 * getBoundingClientRect per frame; cy is derived from the live window scroll.
 *
 * GATING (the fallback matrix): Scene.tsx mounts this only on
 * `pathname === "/" && tier === "full" && webgpu`. Inside, a defense-in-depth
 * webgpuEnabled() guard fences the lazy TSL import. On lite / off / reduced-motion
 * / WebGL2-only the island never mounts and the DOM SVG fallback
 * (neural-graph-fallback.tsx) carries the same metaphor statically.
 *
 * BRIDGE: the DOM sections bump useNeuralLatticeStore on their in-view edge
 * (broken/healthy per-cluster targets); this island reads .getState() in
 * useFrame and decays the targets back — the exact globalThis-pinned cross-bundle
 * pattern of compliancePipelineStore (solves Turbopack's duplicate-store desync).
 *
 * Frame order: mounted AFTER SignatureLine (Scene JSX order), so within R3F's
 * priority-0 list its useFrame runs AFTER the single camera authority has written
 * camera.position/quaternion for the frame. It NEVER writes the camera.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { webgpuEnabled } from "./renderer/createRenderer";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { useSectionStore } from "./store/sectionStore";
import { useScrollStore } from "./store/scrollStore";
import { useNeuralLatticeStore } from "./store/neuralLatticeStore";
import {
  buildLatticeLayout,
  CLUSTER_COUNT,
  COL_CYAN,
  COL_VIOLET,
  NODE_SIZE,
  PACKET_SIZE,
  PACKET_PERIOD,
  PACKET_STAGGER,
  type LatticeMode,
} from "./neural/neuralLatticeConfig";
import type {
  LatticeNodeUniforms,
  LatticeEdgeUniforms,
  LatticePacketUniforms,
} from "./neural/neuralLatticeNodeMaterial";

/** Off-screen cull margin in CSS px. */
const CULL_PAD = 220;

/** Shared unit-quad corners for the billboards (z=0, xy ∈ [-0.5,0.5]). */
const QUAD_CORNERS = new Float32Array([
  -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
]);
const QUAD_INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

interface CardRect {
  /** Viewport-x center when scrollY would place the card top at `docTop`. */
  cxBase: number;
  w: number;
  h: number;
  /** Document-space top of the anchor. */
  docTop: number;
}

interface NodeBuild {
  material: THREE.Material;
  uniforms: LatticeNodeUniforms;
}
interface EdgeBuild {
  material: THREE.Material;
  uniforms: LatticeEdgeUniforms;
}
interface PacketBuild {
  material: THREE.Material;
  uniforms: LatticePacketUniforms;
}

export function NeuralLattice({
  mode,
  anchorId,
}: {
  mode: LatticeMode;
  anchorId: string;
}) {
  const { size, camera } = useThree();
  const measureVersion = useSectionStore((s) => s.measureVersion);

  // The deterministic lattice layout (shared by 3D + the SVG fallback shape).
  const layout = useMemo(() => buildLatticeLayout(), []);
  const broken = mode === "broken";

  // --- Lazy TSL material builds (three/webgpu chunk loads ONLY here) ---------
  const [node, setNode] = useState<NodeBuild | null>(null);
  const [edge, setEdge] = useState<EdgeBuild | null>(null);
  const [packet, setPacket] = useState<PacketBuild | null>(null);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    const builds: Array<{ dispose: () => void }> = [];
    void import("./neural/neuralLatticeNodeMaterial").then((m) => {
      if (cancelled) return;
      const n = m.createLatticeNodeMaterial(NODE_SIZE);
      const e = m.createLatticeEdgeMaterial();
      const p = m.createLatticePacketMaterial(PACKET_SIZE);
      n.uniforms.uBroken.value = broken ? 1 : 0;
      e.uniforms.uBroken.value = broken ? 1 : 0;
      builds.push(
        { dispose: () => n.material.dispose() },
        { dispose: () => e.material.dispose() },
        { dispose: () => p.material.dispose() },
      );
      setNode({ material: n.material as unknown as THREE.Material, uniforms: n.uniforms });
      setEdge({ material: e.material as unknown as THREE.Material, uniforms: e.uniforms });
      setPacket({ material: p.material as unknown as THREE.Material, uniforms: p.uniforms });
    });
    return () => {
      cancelled = true;
      builds.forEach((b) => b.dispose());
      setNode(null);
      setEdge(null);
      setPacket(null);
    };
  }, [broken]);

  // --- Per-node "dead" flags (broken mode): nodes downstream of each cluster's
  // break edge go dark. Computed once from the deterministic layout. -----------
  const deadByNode = useMemo(() => {
    const dead = new Float32Array(layout.nodes.length).fill(0);
    if (!broken) return dead;
    // A node is "dead" if it is the OUTPUT-layer node (layer 2) of its cluster
    // (the packet never reaches it) — the simplest readable "severed pathway".
    for (let i = 0; i < layout.nodes.length; i++) {
      if (layout.nodes[i].layer === 2) dead[i] = 1;
    }
    return dead;
  }, [layout, broken]);

  // --- Node geometry (InstancedBufferGeometry: shared quad + per-node attrs) --
  const nodeGeometry = useMemo(() => {
    const count = layout.nodes.length;
    const centers = new Float32Array(count * 3);
    const clusters = new Float32Array(count);
    const layers = new Float32Array(count);
    const seeds = new Float32Array(count);
    const dead = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const n = layout.nodes[i];
      centers[i * 3] = n.pos.x;
      centers[i * 3 + 1] = n.pos.y;
      centers[i * 3 + 2] = n.pos.z;
      clusters[i] = n.cluster;
      layers[i] = n.layer;
      seeds[i] = (i * 0.61803398875) % 1;
      dead[i] = deadByNode[i];
    }
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(QUAD_CORNERS, 3));
    geo.setIndex(new THREE.BufferAttribute(QUAD_INDEX, 1));
    geo.setAttribute("aCenter", new THREE.InstancedBufferAttribute(centers, 3));
    geo.setAttribute("aCluster", new THREE.InstancedBufferAttribute(clusters, 1));
    geo.setAttribute("aLayer", new THREE.InstancedBufferAttribute(layers, 1));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    geo.setAttribute("aDead", new THREE.InstancedBufferAttribute(dead, 1));
    geo.instanceCount = count;
    return geo;
  }, [layout, deadByNode]);
  useEffect(() => () => nodeGeometry.dispose(), [nodeGeometry]);

  // --- Edge geometry (LineSegments: 2 vertices per edge) ----------------------
  const edgeGeometry = useMemo(() => {
    const cA = new THREE.Color(COL_CYAN);
    const cB = new THREE.Color(COL_VIOLET);
    const n = layout.edges.length;
    const positions = new Float32Array(n * 2 * 3);
    const colors = new Float32Array(n * 2 * 3);
    const edgeDead = new Float32Array(n * 2);
    const edgeSeed = new Float32Array(n * 2);
    const tmp = new THREE.Color();
    for (let e = 0; e < n; e++) {
      const ed = layout.edges[e];
      const a = ed.a;
      const b = ed.b;
      positions[e * 6] = a.x;
      positions[e * 6 + 1] = a.y;
      positions[e * 6 + 2] = a.z;
      positions[e * 6 + 3] = b.x;
      positions[e * 6 + 4] = b.y;
      positions[e * 6 + 5] = b.z;
      // color by layer endpoint: from-node layer → to-node layer along cyan→violet
      const fromL = layout.nodes[ed.from].layer / 2;
      const toL = layout.nodes[ed.to].layer / 2;
      tmp.copy(cA).lerp(cB, fromL);
      colors[e * 6] = tmp.r;
      colors[e * 6 + 1] = tmp.g;
      colors[e * 6 + 2] = tmp.b;
      tmp.copy(cA).lerp(cB, toL);
      colors[e * 6 + 3] = tmp.r;
      colors[e * 6 + 4] = tmp.g;
      colors[e * 6 + 5] = tmp.b;
      // broken: edges from the hidden layer onward (l>=1) read as severed.
      const isDead = broken && layout.nodes[ed.from].layer >= 1 ? 1 : 0;
      edgeDead[e * 2] = isDead;
      edgeDead[e * 2 + 1] = isDead;
      const seed = (e * 0.381966) % 1;
      edgeSeed[e * 2] = seed;
      edgeSeed[e * 2 + 1] = seed;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aEdgeDead", new THREE.BufferAttribute(edgeDead, 1));
    geo.setAttribute("aEdgeSeed", new THREE.BufferAttribute(edgeSeed, 1));
    return geo;
  }, [layout, broken]);
  useEffect(() => () => edgeGeometry.dispose(), [edgeGeometry]);

  // --- Packet geometry: one billboarded disc per cluster ----------------------
  const packetGeometry = useMemo(() => {
    const count = CLUSTER_COUNT;
    const centers = new Float32Array(count * 3);
    const alive = new Float32Array(count).fill(1);
    const flow = new Float32Array(count);
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(QUAD_CORNERS, 3));
    geo.setIndex(new THREE.BufferAttribute(QUAD_INDEX, 1));
    geo.setAttribute("aCenter", new THREE.InstancedBufferAttribute(centers, 3));
    geo.setAttribute("aAlive", new THREE.InstancedBufferAttribute(alive, 1));
    geo.setAttribute("aFlow", new THREE.InstancedBufferAttribute(flow, 1));
    geo.instanceCount = count;
    return geo;
  }, []);
  useEffect(() => () => packetGeometry.dispose(), [packetGeometry]);

  // --- Per-cluster pathway (the ordered node positions a packet rides) --------
  // Pick the central fan node per (cluster, layer) so the packet rides the spine
  // of each pathway: input-center → hidden-center → output-center.
  const pathways = useMemo(() => {
    const paths: THREE.Vector3[][] = [];
    for (let c = 0; c < CLUSTER_COUNT; c++) {
      const pts: THREE.Vector3[] = [];
      for (let l = 0; l < 3; l++) {
        const cell = layout.nodes.filter(
          (nd) => nd.cluster === c && nd.layer === l,
        );
        // The center node of the (cluster, layer) cell — the build order puts
        // fan index 1 (center) as the 2nd of the 3, with the 1st as a fallback.
        const center = cell[1] ?? cell[0];
        pts.push(center.pos.clone());
      }
      paths.push(pts);
    }
    return paths;
  }, [layout]);

  // --- Card rect: measured on measureVersion bumps (NOT per frame) -----------
  const [rect, setRect] = useState<CardRect | null>(null);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-lattice-anchor="${anchorId}"]`,
    );
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    setRect({
      cxBase: r.left + r.width / 2,
      w: r.width,
      h: r.height,
      docTop: r.top + scrollY,
    });
  }, [measureVersion, anchorId]);

  // --- Per-frame: camera-lock placement + ignition + packet flow --------------
  const groupRef = useRef<THREE.Group>(null);
  const scratch = useRef(new THREE.Vector3());
  const lerpScratch = useRef(new THREE.Vector3());
  const revealDamped = useRef(0);
  const clock = useRef(0);
  const pulseEased = useRef<number[]>(new Array(CLUSTER_COUNT).fill(0));

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group || !rect || !node || !edge || !packet) return;
    const delta = Math.min(rawDelta, 1 / 30);

    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;
    const scrollY = window.scrollY;

    const vpTop = rect.docTop - scrollY;
    const cx = rect.cxBase;
    const cy = vpTop + rect.h / 2;

    if (vpTop + rect.h < -CULL_PAD || vpTop > ih + CULL_PAD) {
      group.visible = false;
      return;
    }
    group.visible = true;

    // Camera-locked placement (see header).
    scratch.current
      .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -CAMERA_Z)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    group.position.copy(scratch.current);
    group.quaternion.copy(camera.quaternion);
    group.scale.set(rect.w * k, rect.h * k, 1);

    revealDamped.current = THREE.MathUtils.damp(
      revealDamped.current,
      useScrollStore.getState().reveal,
      8,
      delta,
    );
    const reveal = revealDamped.current;

    clock.current += delta;
    const t = clock.current;

    // --- Cluster ignition: decay the DOM-bumped targets, ease toward them ----
    const store = useNeuralLatticeStore.getState();
    const surface = broken ? store.broken : store.healthy;
    let anyPulse = false;
    const decayed: number[] = new Array(CLUSTER_COUNT);
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const target = surface[i] ?? 0;
      decayed[i] = THREE.MathUtils.damp(target, 0, 4, delta);
      if (target !== 0) anyPulse = true;
    }
    if (anyPulse) {
      store.setPulse(
        broken ? "broken" : "healthy",
        decayed.map((d) => (d < 0.001 ? 0 : d)),
      );
    }
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      pulseEased.current[i] = THREE.MathUtils.damp(
        pulseEased.current[i],
        surface[i] ?? 0,
        6,
        delta,
      );
    }

    // --- Drive node + edge uniforms -----------------------------------------
    const nu = node.uniforms;
    nu.uTime.value = t;
    nu.uReveal.value = reveal;
    for (let i = 0; i < CLUSTER_COUNT; i++) nu.uPulse.value[i] = pulseEased.current[i];

    const eu = edge.uniforms;
    eu.uTime.value = t;
    eu.uReveal.value = reveal;

    // --- Drive the packets: lerp each cluster's disc along its pathway -------
    // broken: the packet rides input→hidden then DIES (aAlive→0) at the break;
    // healthy: it completes input→hidden→output and loops.
    const pu = packet.uniforms;
    pu.uTime.value = t;
    pu.uReveal.value = reveal;

    const pg = packetGeometry;
    const centerAttr = pg.getAttribute("aCenter") as THREE.BufferAttribute;
    const aliveAttr = pg.getAttribute("aAlive") as THREE.BufferAttribute;
    const flowAttr = pg.getAttribute("aFlow") as THREE.BufferAttribute;
    for (let c = 0; c < CLUSTER_COUNT; c++) {
      const path = pathways[c];
      // staggered phase per cluster.
      const phase = ((t - c * PACKET_STAGGER) % PACKET_PERIOD) / PACKET_PERIOD;
      const tt = phase < 0 ? phase + 1 : phase;
      // broken pathways only traverse the FIRST half (input→hidden) before dying.
      const span = broken ? 0.5 : 1.0;
      // map tt over [0, span] of the path; segments = path.length - 1.
      const u = Math.min(tt, span) / 1.0; // 0..span
      const segs = path.length - 1;
      const fu = u * segs;
      const seg = Math.min(Math.floor(fu), segs - 1);
      const local = fu - seg;
      lerpScratch.current.copy(path[seg]).lerp(path[seg + 1], local);
      centerAttr.setXYZ(
        c,
        lerpScratch.current.x,
        lerpScratch.current.y,
        lerpScratch.current.z,
      );
      flowAttr.setX(c, u / Math.max(span, 0.0001));
      // broken: packet vanishes once it reaches the break (tt > span) and only
      // when that cluster is NOT actively pulsing (a fired pulse re-lights it).
      const alive = broken
        ? tt <= span
          ? 1
          : pulseEased.current[c] > 0.05
            ? pulseEased.current[c]
            : 0
        : 1;
      aliveAttr.setX(c, alive);
    }
    centerAttr.needsUpdate = true;
    aliveAttr.needsUpdate = true;
    flowAttr.needsUpdate = true;
  });

  // Dev-only debug handle (mirrors __sersanPipeline3D): screen-projects the group
  // center so registration with the DOM section rect can be asserted in QA.
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    const key = `__sersanNeuralLattice_${anchorId}`;
    (window as unknown as Record<string, unknown>)[key] = {
      mode,
      hasNode: !!node,
      rect,
      project: () => {
        const g = groupRef.current;
        if (!g || !g.visible) return null;
        const v = g.position.clone().project(camera);
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      },
    };
  }

  if (!node || !edge || !packet) return null;

  return (
    <group ref={groupRef} renderOrder={-1} visible={false}>
      <lineSegments geometry={edgeGeometry} material={edge.material} renderOrder={-1} frustumCulled={false} />
      <mesh geometry={nodeGeometry} material={node.material} renderOrder={-1} frustumCulled={false} />
      <mesh
        geometry={packetGeometry}
        material={packet.material}
        renderOrder={-1}
        frustumCulled={false}
      />
    </group>
  );
}
