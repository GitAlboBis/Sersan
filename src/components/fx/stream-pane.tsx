"use client";

/**
 * StreamPane — the ONE shared glass-pane chrome for the two signal-stream
 * sections (Problem = "broken", ProductionGrade = "healthy"; 2026-08-21
 * refactor — replaces the NeuralCard accordion chrome).
 *
 * Grammar (the fit-verdict-wall pane, verbatim): chrome-less frosted glass —
 * `bg-[hsl(216_30%_10%/0.55)] backdrop-blur-xl`, NO border box, a single top
 * hairline (cyan→transparent gradient) that brightens on hover/focus, large
 * radius, soft ambient shadow. Content = REAL, always-open DOM copy (no
 * aria-expanded/aria-controls — nothing collapses any more; panes are the
 * screen-reader-facing content, not triggers).
 *
 * Hover link (replaces marker-opens-card): hover / :focus-visible writes
 * useNeuralLatticeStore.setHovered(surface, index) — the WebGL island reads
 * it in useFrame (healthy: ring i flares; broken: the debris re-cohere
 * tease). Leave/blur clears it. Fine pointers only for hover; keyboard focus
 * always. Touch needs no tap machinery — nothing opens.
 *
 * Pose: on lg+ the panes z-cascade beside the field with slight offsets and
 * ±1–2° tilts; hover lifts (translate) and untilts toward flat. All pose
 * motion rides the CSS `translate`/`rotate` properties (Tailwind v4), which
 * compose independently of the `transform` property GSAP animates during the
 * sections' IO reveal — the two never fight. Reduced-motion: no transitions
 * (the pose still applies; nothing is hidden).
 *
 * Carries `data-stream-pane` for the owning section's staggered blur-up
 * reveal timeline (GSAP primes/animates transform+opacity+filter; this file
 * renders no hidden state of its own — SSR/no-JS/reduced-motion always see
 * the settled pane).
 */
import { useEffect, useRef, useState } from "react";
import { useNeuralLatticeStore } from "@/webgl/store/neuralLatticeStore";
import { cn } from "@/lib/utils";

export type StreamSurface = "broken" | "healthy";

interface StreamPaneProps {
  /** This pane's index (0..2) — the ring / failure it drives in the store. */
  index: number;
  /** Which store surface this pane drives. */
  surface: StreamSurface;
  /** Which side of the field the cascade leans from ("right" = Problem). */
  side: "left" | "right";
  children: React.ReactNode;
  className?: string;
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

/** Per-index cascade pose (lg+ only): tilt sign alternates; the stack leans
 * toward the field. Mirrored for the left side. */
const TILT = [-1.5, 1.75, -1] as const;
const SHIFT = ["lg:-translate-x-2", "lg:translate-x-3", "lg:-translate-x-1"] as const;
const SHIFT_MIRROR = [
  "lg:translate-x-2",
  "lg:-translate-x-3",
  "lg:translate-x-1",
] as const;
const Z = ["lg:z-30", "lg:z-20", "lg:z-10"] as const;

export function StreamPane({
  index,
  surface,
  side,
  children,
  className,
}: StreamPaneProps) {
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

  // Clear hover on unmount so a stale ring doesn't stay flared.
  useEffect(() => {
    return () => setHovered(surface, null);
  }, [setHovered, surface]);

  const tilt = TILT[index] ?? 0;
  const shift = (side === "right" ? SHIFT : SHIFT_MIRROR)[index] ?? "";

  return (
    <article
      data-stream-pane={index}
      tabIndex={0}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ ["--pane-tilt" as string]: `${tilt}deg` }}
      className={cn(
        "group relative rounded-2xl bg-[hsl(216_30%_10%/0.55)] p-5 sm:p-6 max-sm:p-4",
        "backdrop-blur-xl shadow-[0_24px_80px_-32px_hsl(220_60%_2%/0.8)]",
        // Cascade pose (lg+): CSS rotate/translate properties — independent of
        // the GSAP-owned `transform` used by the reveal, so they never fight.
        "lg:rotate-[var(--pane-tilt)] lg:hover:rotate-0 lg:focus-visible:rotate-0",
        shift,
        Z[index] ?? "",
        // Hover lift (translate property, not transform).
        "hover:-translate-y-1.5 focus-visible:-translate-y-1.5",
        "transition-[translate,rotate,box-shadow] duration-500 ease-[var(--ease-lusion)]",
        "motion-reduce:transition-none",
        "outline-none focus-visible:shadow-[0_0_0_1px_hsl(var(--accent)/0.55),0_24px_80px_-32px_hsl(220_60%_2%/0.8)]",
        "select-text",
        className,
      )}
    >
      {/* Top hairline — the pane's only chrome (NO border). Brightens on
          hover/focus. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-full bg-gradient-to-r from-[hsl(var(--accent)/0.7)] via-[hsl(var(--accent)/0.25)] to-transparent opacity-60 transition-opacity duration-500 ease-[var(--ease-lusion)] group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      />
      {children}
    </article>
  );
}
