"use client";

/**
 * NeuralCard — the ONE shared card presentation for the FIX 3 v4 neural-network
 * sections (Problem = "broken", ProductionGrade = "healthy"). BOTH sections use
 * this single component so the cards are visually identical in chrome / spacing
 * / typography / animation; only the copy and the broken-vs-healthy accent
 * treatment differ.
 *
 * Look (matches the 3D particle network behind it): dark translucent navy glass
 * (subtle backdrop-blur), thin cyan→violet gradient HAIRLINE border + soft outer
 * glow that intensifies on hover/focus, JetBrains-Mono eyebrow (`0N · …`),
 * editorial/Switzer title. No terminal chrome (no macOS dots / file-name labels
 * / radar / scan).
 *
 * Behaviour (the v4 contract):
 *   - COMPACT by default (eyebrow + title only); EXPAND the body on hover OR
 *     focus-within. Touch (no hover) = tap toggles. Copy stays in the DOM at all
 *     times (collapsed via grid-rows / opacity, never unmounted) so SEO/AT read
 *     it. `prefers-reduced-motion` → no transition, still toggles.
 *   - Each card root carries `data-lattice-node="<anchorId>:<index>"` inside the
 *     section's `[data-lattice-anchor]` so the WebGL island can measure its
 *     center and pin its hub there. Focusable (tabIndex=0), `aria-expanded`.
 *   - On hover/focus → useNeuralLatticeStore.setHovered(surface, index); on
 *     leave/blur → setHovered(surface, null). This flares the card's hub.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { cn } from "@/lib/utils";

export type NeuralSurface = "broken" | "healthy";

interface NeuralCardProps {
  /** The section anchor id ("problem" | "production") for the node hook. */
  anchorId: string;
  /** This card's hub index (0..2). */
  index: number;
  /** Which store surface this card drives. */
  surface: NeuralSurface;
  /** JetBrains-mono eyebrow text (the `· label` after the `0N`). */
  eyebrow: string;
  /** The card title (compact-visible). */
  title: React.ReactNode;
  /** The expand-on-hover/focus body. Always in the DOM. */
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
  anchorId,
  index,
  surface,
  eyebrow,
  title,
  body,
  tone = surface,
}: NeuralCardProps) {
  const [expanded, setExpanded] = useState(false);
  const canHover = useHoverCapable();
  const bodyId = useId();
  // Track focus + hover separately so blur after a hover doesn't collapse while
  // the pointer is still over, and vice-versa.
  const stateRef = useRef({ hover: false, focus: false });

  const setHovered = useNeuralLatticeStore((s) => s.setHovered);

  const sync = () => {
    const open = stateRef.current.hover || stateRef.current.focus;
    setExpanded(open);
    setHovered(surface, open ? index : null);
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
    const next = !expanded;
    setExpanded(next);
    setHovered(surface, next ? index : null);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const next = !expanded;
      setExpanded(next);
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
      data-lattice-node={`${anchorId}:${index}`}
      tabIndex={0}
      role="button"
      aria-expanded={expanded}
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
        expanded && "neural-card--open",
      )}
      data-open={expanded ? "true" : "false"}
    >
      {/* Cyan→violet gradient hairline border + outer glow (intensifies on
          hover/focus). Pure decoration. */}
      <span
        aria-hidden="true"
        className="neural-card__border pointer-events-none absolute inset-0 rounded-xl"
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
          expanded
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
