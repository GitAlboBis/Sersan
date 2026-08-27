/**
 * Telemetry-rain material — instanced-column TSL NodeMaterial (WebGPU / flag-ON
 * path ONLY; this module imports `three/webgpu` + `three/tsl` and MUST only be
 * reached through the dynamic import in TeamGlyphRain.tsx — the dual-namespace
 * pitfall: never let `three` and `three/webgpu` both land in one scene graph).
 *
 * RECIPE (Lusion `AboutHeroLetters`, docs/recon-2026-08-27/lusion-team-reverse.md
 * §4, re-authored for SerSan "production telemetry"):
 *   - One InstancedBufferGeometry PER LAYER (2 layers, 2 draw calls): a unit
 *     quad, one instance per COLUMN. The vertex stage stretches each quad to
 *     (column width × QUAD_H_FRAC of the frame height) and places it at its
 *     normalised x across the frame. Every quad lies ON the content plane
 *     (z = 0) and INSIDE the frame — nothing is shaded outside it.
 *   - Each column is a stack of `cells` token cells; cells = quadH / (colW ·
 *     CELL_H_OVER_W) so a cell on screen keeps the atlas cell aspect (text is
 *     never stretched).
 *   - The stack scrolls UPWARD like a log tail: cellY = uv.y·cells + offset(t),
 *     with offset(t) the CLOSED-FORM integral of a per-column speed that
 *     breathes between ~5 % and 100 % of its base (speed·(s0·t + (1−s0)·½·(t −
 *     cos(ωt+φ)/ω))) — columns crawl/idle for long stretches, no accumulation
 *     state on the CPU, phase-continuous forever.
 *   - Per cell: idx = floor(hash(cell, column, epoch)·N) re-randomised on a
 *     slow, per-cell staggered epoch (uSwitchRate) — a token "settles" rather
 *     than flickering. Rare tokens: a second (derived) gate (uRare) picks from
 *     the accent partition of the atlas (indices ≥ uAccentStart) and tints the
 *     cell accent cyan at HDR (uAccentHdr > bloom threshold); everything else
 *     is cool white far below the threshold (uIntensity 0.16 — a faint wall).
 *   - Atlas sample at ((col + uv.x)/COLS, (row + v)/ROWS), coverage = alpha.
 *     PLAIN sample (no bias/LOD ops); the far layer is softened by brightness
 *     alone.
 *   - Vertical fade smoothstep(.5,.33,|uv.y−.5|) inside the quad; long-period
 *     on/off along the stream smoothstep(.35P,.45P, mod(cellY − P·rand, P)) ×
 *     tail fade; per-layer brightness from the instance attribute.
 *   - Additive blending, depthWrite/depthTest off, toneMapped off.
 *
 * FRAGMENT COST DISCIPLINE (Adreno-class budget, ≤ 5 ms):
 *   1. gate = on × vf × bright × uFade from varyings + one mod → Discard
 *      before ANY hash or fetch (≈ half the fragments leave here: the gap term
 *      keeps a column dark ~50 % of its stream).
 *   2. glyph band: the text occupies ≈ cy ∈ [0.12, 0.80] of a cell → Discard
 *      the empty rows before the fetch (another ≈ 30 %).
 *   3. Only then: 2 uint hashes (stagger + token pick; the rare gate, accent
 *      index and cell brightness are DERIVED from the pick by fract scaling)
 *      + ONE texture sample + blend.
 *
 * TSL VARYING CONTRACT (HANDOFF_FOUNDER_MORPH.md §3, gpgpuNodeSim.ts): every
 * `varying(...)` below wraps a SELF-CONTAINED expression built from attributes /
 * uniforms — never an outer `.toVar()` that a Fn assigns into (three hoists
 * varying assignment above the vertex body, so such a varying stays at its
 * initial value forever, silently).
 *
 * `hash(seed)` in three/tsl converts its seed to UINT first (fraction dropped),
 * so every seed fed to it here is an integer-valued expression.
 *
 * Node names verified against the installed r184 build via
 * require("three/tsl") / require("three/webgpu"); the graph was compiled
 * headlessly with both the GLSL and WGSL node builders.
 */
import {
  MeshBasicNodeMaterial,
  CanvasTexture,
  AdditiveBlending,
  DoubleSide,
  NoColorSpace,
  LinearFilter,
  LinearMipmapLinearFilter,
  ClampToEdgeWrapping,
  Vector2,
} from "three/webgpu";
import {
  Fn,
  uniform,
  attribute,
  positionGeometry,
  texture,
  varying,
  floor,
  fract,
  mod,
  abs,
  smoothstep,
  step,
  mix,
  cos,
  hash,
  float,
  vec2,
  vec3,
  vec4,
  Discard,
} from "three/tsl";
import { ATLAS_COLS, ATLAS_ROWS, CELL_H_OVER_W } from "./telemetryTokens";

/** Glyph colour (linear), cool cyan-white, kept far UNDER the bloom threshold. */
const NORMAL_RGB = [0.55, 0.8, 1.0] as const;
/** Accent cyan #3BE1FF (linear ≈), pushed OVER the threshold by uAccentHdr. */
const ACCENT_RGB = [0.05, 0.75, 1.0] as const;
/** Stream gap period (cells) for the long-period on/off term. */
const GAP_PERIOD = 56;
/** Constant bias keeping cellY positive for the uint hash at t ≈ 0 (the
 * breath integral dips to −speed/ω ≈ −32 cells at most). */
const CELL_BIAS = 64;
/** Quad height as a fraction of the frame height (the fade reaches 0 at the
 * quad edge, so the clipped 5 % top/bottom bands were never visible). */
export const QUAD_H_FRAC = 0.9;
/** Glyph band inside a cell (cy from the cell bottom): rows outside carry no
 * ink for a 17 px face centred in a 32 px cell — discarded before the fetch. */
const BAND_LO = 0.12;
const BAND_HI = 0.8;

export type TelemetryRainUniforms = {
  uTime: { value: number };
  uFade: { value: number };
  /** Normal-token peak brightness (× NORMAL_RGB). Default 0.16 — faint wall. */
  uIntensity: { value: number };
  /** Accent-token brightness (× ACCENT_RGB). Default 1.1 (HDR, blooms). */
  uAccentHdr: { value: number };
  /** Global scroll-speed multiplier. Default 0.7. */
  uSpeed: { value: number };
  /** Probability a cell draws from the accent partition. */
  uRare: { value: number };
  /** Token re-randomisation rate (epochs / s, per-cell staggered). */
  uSwitchRate: { value: number };
  /** Column width as a fraction of the frame width (layer scale 1). */
  uColW: { value: number };
  /** Frame plane size in WORLD units (w, h) at CAMERA_Z. */
  uPlane: { value: Vector2 };
  /** 0 = atlas row 0 is the TOP (flipY=false math, verified live); 1 = flipped. */
  uVFlip: { value: number };
  uAccentStart: { value: number };
  uAccentCount: { value: number };
};

export interface TelemetryRainBuild {
  material: MeshBasicNodeMaterial;
  uniforms: TelemetryRainUniforms;
  atlas: CanvasTexture;
  dispose: () => void;
}

export function createTelemetryRainNodeMaterial(opts: {
  atlasCanvas: HTMLCanvasElement;
  accentStart: number;
  accentCount: number;
}): TelemetryRainBuild {
  // --- Atlas texture --------------------------------------------------------
  // Coverage-only (alpha) sampling → colour space irrelevant: keep it linear
  // (NoColorSpace) so no decode touches the mask. flipY=false: v=0 is the TOP
  // row of the canvas, and the shader flips the in-cell v (verified upright
  // live on WebGPU). Trilinear mips: the near layer minifies the 32 px cell
  // ~2×; the sample itself is a plain textureSample (no bias).
  const atlas = new CanvasTexture(opts.atlasCanvas);
  atlas.colorSpace = NoColorSpace;
  atlas.flipY = false;
  atlas.premultiplyAlpha = false;
  atlas.generateMipmaps = true;
  atlas.minFilter = LinearMipmapLinearFilter;
  atlas.magFilter = LinearFilter;
  atlas.wrapS = ClampToEdgeWrapping;
  atlas.wrapT = ClampToEdgeWrapping;
  atlas.needsUpdate = true;

  // --- Uniforms (defaults = live-tuned 2026-08-27 on the Adreno laptop) ------
  const uTime = uniform(0);
  const uFade = uniform(0);
  const uIntensity = uniform(0.16);
  const uAccentHdr = uniform(0.9);
  const uSpeed = uniform(0.7);
  const uRare = uniform(0.03);
  const uSwitchRate = uniform(0.18);
  const uColW = uniform(0.042);
  const uPlane = uniform(new Vector2(1, 1));
  const uVFlip = uniform(0);
  const uAccentStart = uniform(opts.accentStart);
  const uAccentCount = uniform(Math.max(1, opts.accentCount));

  // --- Per-instance attributes (one per column) -----------------------------
  //   aPlace = (x 0..1 across the frame, layer scale, layer brightness, spare)
  //   aRand  = 4 uniform randoms (x: spare, y: hash seed, z: spare, w: gap phase)
  //   aMeta  = (spare, base speed cells/s, breath phase φ, breath ω)
  const aPlace = attribute<"vec4">("aPlace");
  const aRand = attribute<"vec4">("aRand");
  const aMeta = attribute<"vec4">("aMeta");

  const material = new MeshBasicNodeMaterial();

  // --- Vertex: place + stretch the column quad (on the plane, in the frame) --
  // `positionGeometry` (the raw `position` attribute), NOT `positionLocal`:
  // once `positionNode` is set, the builder ASSIGNS its result into the
  // `positionLocal` variable at the top of the vertex flow, so any later read
  // of `positionLocal` (e.g. the vQuad varying below) would see the stretched
  // world-scale quad instead of the unit corners.
  const colW = uColW.mul(uPlane.x).mul(aPlace.y); // world width at layer scale
  const quadH = uPlane.y.mul(QUAD_H_FRAC);
  const px = aPlace.x.sub(0.5).mul(uPlane.x).add(positionGeometry.x.mul(colW));
  const py = positionGeometry.y.mul(quadH);
  material.positionNode = vec3(px, py, 0.0);

  // Cells stacked along the quad so the on-screen cell keeps the atlas aspect.
  const cells = quadH.div(colW.mul(CELL_H_OVER_W));

  // Closed-form stream offset (cells): integral of speed(t) = base·uSpeed·(s0 +
  // (1−s0)·½(1+sin(ωt+φ))). Phase-continuous, no CPU state.
  const s0 = float(0.05);
  const omega = aMeta.w;
  const phi = aMeta.z;
  const breath = uTime.sub(cos(uTime.mul(omega).add(phi)).div(omega)).mul(0.5);
  const offset = aMeta.y
    .mul(uSpeed)
    .mul(uTime.mul(s0).add(breath.mul(float(1).sub(s0))));

  // Varyings — each a self-contained vertex-stage expression (see header).
  const vQuad = varying(positionGeometry.xy.add(0.5));
  const vSeed = varying(floor(aRand.y.mul(9973.0))); // integer column seed
  const vGapPhase = varying(aRand.w.mul(GAP_PERIOD));
  const vCells = varying(cells);
  const vOffset = varying(offset);
  const vBright = varying(aPlace.z);

  // --- Fragment -------------------------------------------------------------
  const shade = Fn(() => {
    const q = vQuad;
    const cellY = q.y.mul(vCells).add(vOffset).add(CELL_BIAS);

    // (1) Cheap gate FIRST: stream on/off × vertical fade × layer × in-view.
    // Long-period on/off along the stream (Lusion's term, period GAP_PERIOD):
    // off → ramp on → on → soft tail so bursts end without a hard cut.
    const m = mod(cellY.sub(vGapPhase), GAP_PERIOD);
    const on = smoothstep(GAP_PERIOD * 0.35, GAP_PERIOD * 0.45, m).mul(
      smoothstep(GAP_PERIOD, GAP_PERIOD * 0.92, m),
    );
    // Vertical fade to 0 at the quad's top/bottom edges (the quad IS the
    // visible band — QUAD_H_FRAC of the frame).
    const vf = smoothstep(0.5, 0.33, abs(q.y.sub(0.5)));
    const gate = on.mul(vf).mul(vBright).mul(uFade);
    Discard(gate.lessThan(0.004));

    // (2) Glyph band: skip the ink-free rows of the cell before any fetch.
    const cy = fract(cellY);
    const inBand = step(BAND_LO, cy).mul(step(cy, BAND_HI));
    Discard(inBand.lessThan(0.5));

    // (3) Token pick — 2 uint hashes total.
    const ci = floor(cellY);
    const cellSeed = ci.mul(131.0).add(vSeed);
    // Slow, per-cell staggered epoch → token swaps never sync across cells.
    const stagger = hash(cellSeed.add(77.0));
    const epoch = floor(uTime.mul(uSwitchRate).add(stagger));
    const h1 = hash(cellSeed.add(epoch.mul(4099.0)));
    // Derived (cheap) sub-randoms from the one pick.
    const h2 = fract(h1.mul(61.7)); // rare gate
    const h3 = fract(h1.mul(133.3)); // accent index
    const h4 = fract(h1.mul(29.9)); // cell brightness

    const rare = step(float(1).sub(uRare), h2);
    const idxNormal = floor(h1.mul(uAccentStart));
    const idxAccent = uAccentStart.add(floor(h3.mul(uAccentCount)));
    const idx = mix(idxNormal, idxAccent, rare);
    const col = mod(idx, ATLAS_COLS);
    const row = floor(idx.div(ATLAS_COLS));

    // In-cell v: cy grows UP the screen; atlas row 0 is the canvas top with
    // flipY=false, so the cell top is at v = row/ROWS → v = row + (1 − cy).
    const vCell = mix(float(1).sub(cy), cy, uVFlip);
    const auv = vec2(
      col.add(q.x).div(ATLAS_COLS),
      row.add(vCell).div(ATLAS_ROWS),
    );
    const cov = texture(atlas, auv).a;

    // Per-cell brightness (re-rolled with the token, like a fresh log line);
    // accents always full.
    const cb = mix(mix(0.3, 1.0, h4), float(1), rare);

    const alpha = cov.mul(cb).mul(gate);
    Discard(alpha.lessThan(0.002));

    const normal = vec3(NORMAL_RGB[0], NORMAL_RGB[1], NORMAL_RGB[2]).mul(
      uIntensity,
    );
    const accent = vec3(ACCENT_RGB[0], ACCENT_RGB[1], ACCENT_RGB[2]).mul(
      uAccentHdr,
    );
    const rgb = mix(normal, accent, rare);
    return vec4(rgb, alpha);
  })();

  material.colorNode = shade.xyz;
  material.opacityNode = shade.w;

  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;
  material.side = DoubleSide;

  const uniforms: TelemetryRainUniforms = {
    uTime,
    uFade,
    uIntensity,
    uAccentHdr,
    uSpeed,
    uRare,
    uSwitchRate,
    uColW,
    uPlane,
    uVFlip,
    uAccentStart,
    uAccentCount,
  };

  return {
    material,
    uniforms,
    atlas,
    dispose: () => {
      material.dispose();
      atlas.dispose();
    },
  };
}
