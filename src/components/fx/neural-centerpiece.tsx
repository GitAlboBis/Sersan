"use client";

/**
 * NeuralCenterpiece — the FIX 3 v5 NETWORK CENTERPIECE.
 *
 * RECOMPOSE (v5): the 3D particle network is now a clearly-visible CENTERPIECE in
 * its own unobstructed area (nothing overlaps it); the cards moved to a side
 * column. This component owns that area:
 *   - The `[data-lattice-anchor]` container the WebGL island measures for the
 *     SECTION rect (camera-lock placement) — the persistent canvas paints the
 *     dense particle orbs + arcs + travelling signal behind it.
 *   - The 3 focusable NODE MARKERS (neural-node-marker.tsx), absolutely placed to
 *     read as a 3D GRAPH (a triangle/sweep, NOT collinear with the card list).
 *     Each marker carries `data-lattice-node="<anchorId>:<i>"` so the island pins
 *     hub i to it; hovering/focusing it flares + bursts the hub AND opens its
 *     side card (via the shared store hovered state).
 *   - The SVG fallback (neural-graph-fallback.tsx) when the WebGL island is
 *     absent (lite / off / reduced-motion / no-WebGPU). Both are aria-hidden.
 *
 * The markers' positions (MARKER_LAYOUT) mirror the WebGL hub default LOCAL xy
 * (HUB_DEFAULT_XY in neuralLatticeConfig) mapped to CSS % of this box, so the DOM
 * markers and the WebGL orbs coincide even before the per-marker measure lands.
 */
import type { ReactNode } from "react";
import { NeuralGraphFallback } from "@/components/fx/neural-graph-fallback";
import { NeuralNodeMarker } from "@/components/fx/neural-node-marker";
import type { NeuralSurface } from "@/components/fx/neural-card";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";

export interface CenterpieceNode {
  /** Short label beside the number (the card's cause/claim eyebrow). */
  label: string;
  /** The id of the card body this node controls (aria-controls). */
  controls: string;
}

/**
 * CSS-% placement of the 3 markers inside the centerpiece box. Mirrors
 * HUB_DEFAULT_XY (local [-0.5,0.5]) → percent: x% = 50 + localX*100 (clamped),
 * y% = 50 - localY*100 (screen-y down). Reads as a triangle/sweep in 3D.
 *   node0 upper-left · node1 lower-center · node2 upper-right.
 */
const MARKER_LAYOUT: { left: string; top: string }[] = [
  { left: "20%", top: "30%" },
  { left: "52%", top: "74%" },
  { left: "82%", top: "36%" },
];

interface NeuralCenterpieceProps {
  /** Section anchor id ("problem" | "production"). */
  anchorId: string;
  /** Which store surface this network drives. */
  surface: NeuralSurface;
  /** broken vs healthy resting accent. */
  tone?: NeuralSurface;
  /** The 3 nodes (label + the controlled card body id). */
  nodes: [CenterpieceNode, CenterpieceNode, CenterpieceNode];
  /** Whether to render the DOM SVG fallback (WebGL island absent). */
  showFallback: boolean;
  /** Min height of the centerpiece area (so the network has room to read). */
  className?: string;
  /** Optional ref/extra wrapper content. */
  children?: ReactNode;
}

export function NeuralCenterpiece({
  anchorId,
  surface,
  tone = surface,
  nodes,
  showFallback,
  className,
  children,
}: NeuralCenterpieceProps) {
  const hoveredIdx = useNeuralLatticeStore((s) => s.hovered[surface]);
  const broken = tone === "broken";

  return (
    <div
      data-lattice-anchor={anchorId}
      className={`neural-centerpiece relative ${className ?? ""}`}
    >
      {/* Decorative network. WebGL NeuralLattice paints the dense particle orbs +
          arcs behind this (camera-locked to this rect); when WebGL is absent the
          SVG fallback shows the same severed/healthy-pathway metaphor. Both
          aria-hidden, pointer-events-none. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        {showFallback && (
          <NeuralGraphFallback
            variant={broken ? "broken" : "healthy"}
            className="w-full max-w-md opacity-90"
          />
        )}
      </div>

      {/* The 3 focusable node markers, laid out as a 3D-reading graph. These ARE
          the interactive triggers (the canvas is pointer-events-none). */}
      {nodes.map((n, i) => (
        <NeuralNodeMarker
          key={i}
          anchorId={anchorId}
          index={i}
          surface={surface}
          tone={tone}
          controls={n.controls}
          label={n.label}
          open={hoveredIdx === i}
          style={MARKER_LAYOUT[i]}
        />
      ))}

      {children}
    </div>
  );
}
