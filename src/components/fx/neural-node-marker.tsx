"use client";

/**
 * NeuralNodeMarker — the FIX 3 v5 interactive NODE trigger.
 *
 * RECOMPOSE (v5): the network is now a clearly-visible CENTERPIECE and the cards
 * live OFF it in a side column. The interactive trigger moved FROM the card TO
 * the node. The persistent WebGL canvas is `pointer-events:none`, so each hub
 * gets a small focusable DOM hit-zone/marker placed inside the network area:
 *
 *   - Carries `data-lattice-node="<anchorId>:<index>"` (the island measures its
 *     center → pins hub `index` to it; this REPLACES the marker that used to live
 *     on the card root). The markers are laid out to read as a 3D graph (a
 *     triangle/sweep), NOT collinear with the card list.
 *   - A real <button> (keyboard-focusable, Space/Enter), `aria-controls` → its
 *     card body, `aria-expanded`, and a visible number/label (01/02/03).
 *   - On hover/focus → useNeuralLatticeStore.setHovered(surface, index) → the hub
 *     flares + bursts and the matching side card opens; on leave/blur →
 *     setHovered(surface, null). Touch: tap toggles. Keyboard focus = hover.
 *
 * The marker is a small glowing dot that sits where the WebGL hub orb renders
 * (the canvas paints the dense particle orb behind/around it); the marker chrome
 * itself is minimal so the WebGL centerpiece reads as the hero. Reduced-motion:
 * no transition, still toggles.
 *
 * BOOT CONTRACT (production surface): the ProductionGrade section's one boot
 * timeline ignites the dot on its beat — it primes the dot to scale 0 (safe:
 * the scale composes around the dot's own center, so the WebGL hub measure is
 * unaffected), stamps `.is-booting` (suspends the hover transition while GSAP
 * owns the transform) then `.is-igniting` (one-shot halo ring, globals.css),
 * and hands the transform back to the stylesheet on completion so the hover
 * surge below keeps working. This file renders no boot state of its own —
 * SSR/no-JS/reduced-motion always see the resting marker.
 */
import { useEffect, useRef, useState } from "react";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { cn } from "@/lib/utils";
import type { NeuralSurface } from "@/components/fx/neural-card";

interface NeuralNodeMarkerProps {
  /** Section anchor id ("problem" | "production") — the node hook namespace. */
  anchorId: string;
  /** This node/hub index (0..2). */
  index: number;
  /** Which store surface this node drives. */
  surface: NeuralSurface;
  /** The id of the card body this marker controls (aria-controls). */
  controls: string;
  /** Short label shown beside the number (e.g. the cause / claim eyebrow). */
  label: string;
  /** broken nodes get a faint desaturated resting cue. */
  tone?: NeuralSurface;
  /** Whether this node is currently the open/hovered one (for the marker chrome).*/
  open: boolean;
  /** Absolute placement inside the centerpiece (CSS %). Reads as a 3D graph. */
  style?: React.CSSProperties;
}

function useHoverCapable() {
  const [canHover, setCanHover] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const on = () => setCanHover(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return canHover;
}

// Per-marker label placement. The DOT stays ON the orb center (it carries
// data-lattice-node); the number/label is offset VERTICALLY away from the dot —
// the two UPPER hubs (0, 2) caption ABOVE, the LOWER hub (1) captions BELOW. The
// label is horizontally CENTERED on its dot (not fanned sideways) so a
// whitespace-nowrap label can never overflow the centerpiece box on the narrow
// single-column stack (avoids clipping under the section's overflow-hidden). The
// 34px gap clears the dense WebGL hub orb (~30px screen radius); on mobile (no
// orb — the small SVG fallback hub) it simply reads as a tidy caption. NOTE: the
// orb's screen size scales with the centerpiece height — fine-tune the 34px on
// the x86 desktop (live WebGPU) if a label still grazes the glow.
const LABEL_DIR: Record<number, string> = {
  0: "left-1/2 -translate-x-1/2 bottom-full -translate-y-[34px] text-center",
  1: "left-1/2 -translate-x-1/2 top-full translate-y-[34px] text-center",
  2: "left-1/2 -translate-x-1/2 bottom-full -translate-y-[34px] text-center",
};
const labelDir = (i: number) => LABEL_DIR[i] ?? LABEL_DIR[1];

export function NeuralNodeMarker({
  anchorId,
  index,
  surface,
  controls,
  label,
  tone = surface,
  open,
  style,
}: NeuralNodeMarkerProps) {
  const canHover = useHoverCapable();
  const setHovered = useNeuralLatticeStore((s) => s.setHovered);
  const stateRef = useRef({ hover: false, focus: false });

  const sync = () => {
    const on = stateRef.current.hover || stateRef.current.focus;
    setHovered(surface, on ? index : null);
  };
  const onEnter = () => {
    if (!canHover) return;
    stateRef.current.hover = true;
    sync();
  };
  const onLeave = () => {
    if (!canHover) return;
    stateRef.current.hover = false;
    sync();
  };
  const onFocus = () => {
    stateRef.current.focus = true;
    sync();
  };
  const onBlur = () => {
    stateRef.current.focus = false;
    sync();
  };
  // Touch / no-hover: tap toggles this node (and its card).
  const onClick = () => {
    if (canHover) return;
    setHovered(surface, open ? null : index);
  };

  // Clear hover on unmount so a stale hub doesn't stay flared.
  useEffect(() => {
    return () => setHovered(surface, null);
  }, [setHovered, surface]);

  const broken = tone === "broken";

  return (
    <button
      type="button"
      aria-controls={controls}
      aria-expanded={open}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      style={style}
      data-open={open ? "true" : "false"}
      className={cn(
        // Zero-footprint anchor placed at the MARKER_LAYOUT % point (style=left/top).
        // The DOT (absolute, CSS-centered) sits ON that point and IS the measured
        // node; the LABEL is offset radially OUT. An enlarged transparent ::before
        // (globals.css) keeps the focus/tap target comfortable despite the 0×0 box.
        "neural-node-marker group absolute z-10 block h-0 w-0 outline-none",
      )}
    >
      {/* The glowing core dot — IS the measured node (carries data-lattice-node);
          its box center == the dot center == the WebGL hub orb center. Centered on
          the button origin via CSS transform (.neural-node-marker__dot) so a hover
          scale can compose with the centering translate. */}
      <span
        data-lattice-node={`${anchorId}:${index}`}
        aria-hidden="true"
        className={cn(
          "neural-node-marker__dot absolute left-0 top-0 inline-block h-3 w-3 rounded-full",
          broken ? "bg-[hsl(var(--ink-mute)/0.9)]" : "bg-[hsl(var(--accent))]",
        )}
      />
      {/* Number + short label — offset radially OUTWARD from the dot so it never
          overlaps the hub orb. Carries the small glass chrome (.__label). */}
      <span
        className={cn(
          "neural-node-marker__label absolute whitespace-nowrap rounded-full px-2 py-1",
          "font-mono text-[10px] tracking-[0.16em] uppercase leading-none text-ink",
          labelDir(index),
        )}
      >
        <span className="tabular-nums text-[hsl(var(--accent)/0.95)]">
          {`0${index + 1}`}
        </span>
        <span aria-hidden="true" className="px-1 text-ink-dim">
          ·
        </span>
        <span className="text-ink-mute">{label}</span>
      </span>
    </button>
  );
}
