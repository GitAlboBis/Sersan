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
      data-lattice-node={`${anchorId}:${index}`}
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
        "neural-node-marker group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2",
        "rounded-full px-2.5 py-1.5 outline-none",
        "transition-[transform,box-shadow] duration-300 ease-out motion-reduce:transition-none",
        "hover:scale-105 focus-visible:scale-105",
      )}
    >
      {/* The glowing core dot — sits where the WebGL hub orb renders. */}
      <span
        aria-hidden="true"
        className={cn(
          "neural-node-marker__dot relative inline-block h-3 w-3 shrink-0 rounded-full",
          broken
            ? "bg-[hsl(var(--ink-mute)/0.9)]"
            : "bg-[hsl(var(--accent))]",
        )}
      />
      {/* Number + short label. */}
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink leading-none">
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
