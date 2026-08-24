/**
 * neuralLinkLines — the ROUND-8-G geometry baker for the plexus LINK LAYER.
 *
 * THE FINDING (2026-08-24, live-verified with the owner watching): the
 * reference brain-plexus shows thin CRISP CONTINUOUS lines between bright star
 * nodes. Our links were strung from PARTICLES; raising NEURAL_POINT_SIZE to
 * 7.5 → 10 and the strand envelope to 3.2 never produced a line, it produced a
 * chain of glowing blobs. A glowing sprite ≥4px cannot render a 1px line — the
 * two are different primitives, so no constant could ever have fixed it.
 *
 * THE CHANGE: the links are REAL LINE GEOMETRY now — ONE `LineSegments`, the
 * idiom crystalPlexus.ts already proves in this repo (position-only,
 * alpha-masked, depthWrite:false, renderOrder −2, cross-backend). This module
 * is the PURE part of that: it bakes the vertex tables. The material lives in
 * neuralFieldCompute (`buildLinkLineLayer`) because every per-link effect it
 * has to carry — nodeDrift, dispFactor, surgeAt, flashAt, rowResponse,
 * dofAlphaAt — is already authored there as a closure over the build's
 * uniforms; re-plumbing 25 nodes through a context object would only add a
 * place for the two to diverge.
 *
 * SINGLE SOURCE OF TRUTH: the tables come from the SAME `getPlexus(mode,
 * density)` node/edge lists the particles read (`Plexus` type imported below).
 * There is no second generator and no second topology.
 *
 * WHAT IS BAKED (2 vertex-buffer slots, zero UBO blocks, zero storage):
 *   - `position` : the REST chord point mix(A, B, s), undrifted. It defines
 *     the draw count (three sizes the draw from `attributes.position.count`),
 *     it is the honest static fallback, and — load-bearing — it is the
 *     fragment stage's dash-phase anchor, so the broken side's dashes are
 *     welded to the rest geometry instead of crawling with nodeDrift.
 *   - `aLink` : vec2 [edgeIdx, s]. The vertex stage re-derives the LIVE chord
 *     from it exactly the way `edgeFrame` does — uEdgeA/uEdgeB → uNodePos +
 *     nodeDrift — so a drifted (broken) endpoint takes its line with it, and a
 *     live uNodePos edit moves line and particles together.
 *
 * SUB-SEGMENTS: a link is subdivided into `segments` LineSegments pairs (so
 * `segments · 2` vertices per link, interior points duplicated). The chord
 * itself is straight and would need 2 vertices; the subdivision exists so the
 * VERTEX-stage brightness terms that vary along the link resolve — the surge
 * wavefront (SURGE_K 150 ⇒ gaussian half-width 0.068 of nodeT) and the
 * fracture death-flash (FLASH_K 500 ⇒ 0.037).
 *
 * ROUND 9-B — NOTHING IS BAKED FOR THE COPY-COLUMN MASK, deliberately. The
 * mask is a pure function of the LIVE local position, and the vertex stage
 * already re-derives that (`posL` = the drifted chord point) — so it is
 * evaluated there, per vertex, exactly as the particle layer evaluates it at
 * its own live position. Baking a per-link mask value here would freeze it at
 * the REST chord and, worse, give the two layers different sample points the
 * moment an endpoint drifts (broken) or `uNodePos` is tuned live: the boundary
 * would then sit in two different places for lines and stars. The `position`
 * attribute stays what it always was — the draw-count carrier and the dash
 * anchor.
 *
 * THE ONE RESIDUAL DIFFERENCE, MEASURED. A particle evaluates the mask once,
 * per instance; a line evaluates it at LINK_SEGMENTS + 1 vertices and the
 * rasteriser interpolates between them — and a linear interpolation of a
 * smoothstep is not the smoothstep. Over the real tables (all six mode×density
 * builds) the per-link |Δx| is mean 0.031 / max 0.106, so one SUB-SEGMENT spans
 * at most 0.0176 of the band against a COPY_RAMP_SOFT of 0.10: the worst-case
 * gate overshoot is **+0.013** (healthy/full, x ≈ +0.069), and the worst value
 * that leaks LEFT of uCopyEdge — where the true gate is exactly 0 — is gate
 * **0.0058**, i.e. line mask 0.0088 instead of the 0.003 floor. That sits 0.035
 * of band width (COPY_EDGE_PAD ≈ 45 px at 1280) to the RIGHT of the last glyph,
 * never on the copy, and it delivers ≤ 0.0085 where the AA budget is 0.0194.
 * Invisible in both senses: no contrast cost, and a 0.013 wobble inside a ramp
 * whose neighbouring values sweep 0 → 1 over 128 px has nothing to read against.
 * (The NEBULA quads are the case where this does NOT hold — half-extent 0.39 of
 * the band at phone aspects — which is why that layer masks per fragment; see
 * neuralFieldCompute C5.)
 *
 * Sufficiency, MEASURED off the real tables rather than assumed (the per-link
 * |ΔnodeT| over all six mode×density builds is full mean 0.035 / max 0.106,
 * lite mean 0.043 / max 0.122): LINK_SEGMENTS = 6 samples the MEAN link every
 * 0.006 and the WORST-CASE longest link every 0.018 — 3.9 samples inside the
 * surge half-width and 2.1 inside the flash's even there, i.e. a linear-interp
 * error of ~1% / ~4% of peak. No visible stair-step at either end of the
 * length distribution. The sharp masks (tip fade, clean break, fray dash) are
 * computed per-FRAGMENT instead, where 1px lines make vertex interpolation
 * useless.
 */
import type { Plexus } from "./neuralLatticeConfig";

export interface LinkLineGeometryData {
  /** Rest-chord positions, 3 floats/vertex (also the draw-count carrier). */
  position: Float32Array;
  /** [edgeIdx, s] per vertex, 2 floats/vertex. */
  aLink: Float32Array;
  /** edges · segments · 2. */
  vertexCount: number;
  /** Diagnostics for the dev handle / docs. */
  edgeCount: number;
  segments: number;
}

/**
 * Bake the LineSegments vertex tables for a plexus. Pure and deterministic:
 * same plexus + same segment count always give the same buffers, so the
 * compute tier, the analytic tier and any future twin agree without sharing
 * runtime state. BUILD-TIME only — never called per frame.
 */
export function bakeLinkLineGeometry(
  plexus: Plexus,
  segments: number,
): LinkLineGeometryData {
  const { nodes, edges } = plexus;
  const seg = Math.max(1, Math.floor(segments));
  const edgeCount = edges.length;
  const vertexCount = edgeCount * seg * 2;
  const position = new Float32Array(vertexCount * 3);
  const aLink = new Float32Array(vertexCount * 2);

  let v = 0;
  for (let e = 0; e < edgeCount; e++) {
    const [ia, ib] = edges[e];
    const ax = nodes[ia][0];
    const ay = nodes[ia][1];
    const az = nodes[ia][2];
    const bx = nodes[ib][0];
    const by = nodes[ib][1];
    const bz = nodes[ib][2];
    for (let k = 0; k < seg; k++) {
      // LineSegments consumes vertex PAIRS — emit [s0, s1] per sub-segment.
      for (let end = 0; end < 2; end++) {
        const s = (k + end) / seg;
        position[v * 3] = ax + (bx - ax) * s;
        position[v * 3 + 1] = ay + (by - ay) * s;
        position[v * 3 + 2] = az + (bz - az) * s;
        aLink[v * 2] = e;
        aLink[v * 2 + 1] = s;
        v++;
      }
    }
  }

  return { position, aLink, vertexCount, edgeCount, segments: seg };
}
