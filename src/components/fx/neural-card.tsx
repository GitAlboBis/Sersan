"use client";

/**
 * NeuralCard — the ONE shared card presentation for the FIX 3 neural-network
 * sections (Problem = "broken", ProductionGrade = "healthy"). BOTH sections use
 * this single component so the cards are visually identical in chrome / spacing
 * / typography / animation; only the copy and the broken-vs-healthy accent
 * treatment differ.
 *
 * Look (matches the 3D particle network beside it): dark translucent navy glass
 * (subtle backdrop-blur), thin cyan→violet gradient HAIRLINE border + soft outer
 * glow that intensifies on hover/focus/open, JetBrains-Mono eyebrow (`0N · …`),
 * editorial/Switzer title. No terminal chrome (no macOS dots / file-name labels
 * / radar / scan).
 *
 * RECOMPOSE (v5): the cards moved OFF the network into a SIDE column; the NODE
 * MARKER (neural-node-marker.tsx, in the centerpiece) is now the PRIMARY trigger.
 *   - This card OPENS when its node marker is hovered/focused — it reads the
 *     store's hovered index (useNeuralLatticeStore.hovered[surface] === index)
 *     for that surface, so node-hover expands the matching side card with a
 *     slide+fade + cyan→violet border shimmer.
 *   - The card ALSO opens on its OWN hover/focus (accessible redundancy) and
 *     writes setHovered itself, so the node still flares + bursts. The node
 *     marker is the primary trigger; the card is the secondary one.
 *   - COMPACT by default (eyebrow + title); EXPAND the body when open. Copy stays
 *     in the DOM at all times (collapsed via grid-rows / opacity, never
 *     unmounted) so SEO/AT read it. `prefers-reduced-motion` → no transition.
 *   - The card NO LONGER carries `data-lattice-node` (that hook moved to the node
 *     marker). It exposes a stable body id via `bodyId` (aria-controls target of
 *     the marker) — passed down from the section.
 */
import { useEffect, useRef, useState } from "react";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { cn } from "@/lib/utils";

export type NeuralSurface = "broken" | "healthy";

interface NeuralCardProps {
  /** This card's hub index (0..2) — used to read the store hover state. */
  index: number;
  /** Which store surface this card drives. */
  surface: NeuralSurface;
  /** Stable id for the body (the node marker's aria-controls target). */
  bodyId: string;
  /** JetBrains-mono eyebrow text (the `· label` after the `0N`). */
  eyebrow: string;
  /** The card title (compact-visible). */
  title: React.ReactNode;
  /** The expand-when-open body. Always in the DOM. */
  body: React.ReactNode;
  /** broken cards get a faint desaturated fracture cue at rest. */
  tone?: NeuralSurface;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
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

export function NeuralCard({
  index,
  surface,
  bodyId,
  eyebrow,
  title,
  body,
  tone = surface,
}: NeuralCardProps) {
  const canHover = useHoverCapable();
  // Local hover/focus on the card itself (accessible redundancy: the card can
  // also be the trigger). Tracked separately so blur-after-hover doesn't collapse
  // while the pointer is still over, and vice-versa.
  const [selfActive, setSelfActive] = useState(false);
  const stateRef = useRef({ hover: false, focus: false });

  const setHovered = useNeuralLatticeStore((s) => s.setHovered);
  // PRIMARY open source: the node marker writes hovered[surface]. The card opens
  // when this index is the hovered one. Subscribe so a node-marker hover (which
  // doesn't touch this card's DOM) still expands it.
  const hoveredIdx = useNeuralLatticeStore((s) => s.hovered[surface]);
  const open = selfActive || hoveredIdx === index;

  const sync = () => {
    const active = stateRef.current.hover || stateRef.current.focus;
    setSelfActive(active);
    // The card is the secondary trigger: drive the hub too so it flares + bursts.
    setHovered(surface, active ? index : null);
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
  // Touch / no-hover devices: tap toggles.
  const onClick = () => {
    if (canHover) return;
    const next = !open;
    setSelfActive(next);
    setHovered(surface, next ? index : null);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const next = !open;
      setSelfActive(next);
      setHovered(surface, next ? index : null);
    }
  };

  // Clear hover on unmount so a stale hub doesn't stay flared.
  useEffect(() => {
    return () => setHovered(surface, null);
  }, [setHovered, surface]);

  const reduce = prefersReducedMotion();
  const broken = tone === "broken";

  return (
    <article
      tabIndex={0}
      role="button"
      aria-expanded={open}
      aria-controls={bodyId}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "neural-card group relative flex flex-col overflow-hidden rounded-xl px-5 py-5",
        "bg-[hsl(var(--bg)/0.5)] backdrop-blur-[6px]",
        "outline-none cursor-default select-text",
        "transition-[box-shadow,transform] duration-300 ease-out",
        "motion-reduce:transition-none",
        open && "neural-card--open",
      )}
      data-open={open ? "true" : "false"}
    >
      {/* Cyan→violet gradient hairline border + outer glow (intensifies on
          hover/focus/open). Pure decoration. */}
      <span
        aria-hidden="true"
        className="neural-card__border pointer-events-none absolute inset-0 rounded-xl"
      />

      {/* v6: a cyan→violet shimmer that sweeps once along the border when the
          card opens — the DOM half of the node→card "scia". Decorative; the
          animation only runs while the card has [data-open="true"]. */}
      <span
        aria-hidden="true"
        className="neural-card__sweep pointer-events-none absolute inset-0 rounded-xl"
      />

      {/* Eyebrow — JetBrains mono `0N · label`. The broken surface tints the
          dot a touch toward the fracture cue. */}
      <span className="relative font-mono text-[10px] tracking-[0.16em] uppercase text-[hsl(var(--accent)/0.85)]">
        <span className="tabular-nums">{`0${index + 1}`}</span>
        <span aria-hidden="true" className="px-1.5 text-ink-dim">
          ·
        </span>
        <span className={broken ? "text-ink-mute" : "text-[hsl(var(--accent)/0.8)]"}>
          {eyebrow}
        </span>
      </span>

      {/* Title — always visible (compact). */}
      <h3 className="relative mt-2.5 text-base sm:text-lg font-medium text-ink leading-snug">
        {title}
      </h3>

      {/* Body — collapsed by default via a grid-rows trick (0fr → 1fr) so the
          copy stays in the DOM (SEO/AT) but reflows to zero height when closed.
          reduced-motion: no transition, but still toggles. */}
      <div
        id={bodyId}
        className={cn(
          "neural-card__body relative grid",
          !reduce && "transition-[grid-template-rows,opacity] duration-300 ease-out",
          open
            ? "grid-rows-[1fr] opacity-100 mt-3"
            : "grid-rows-[0fr] opacity-0 mt-0",
        )}
        style={{ transitionTimingFunction: "var(--ease-entrance)" }}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="text-[13px] text-ink-mute leading-relaxed">{body}</p>
        </div>
      </div>
    </article>
  );
}
