"use client";

/**
 * AudioTriggers — the single mount point that wires the procedural UI sounds.
 *
 * Mounted once in the root layout (sibling of CustomCursor). It:
 *   1. Hydrates the persisted audio preference from localStorage.
 *   2. Arms the one-time gesture listeners that unlock the AudioContext
 *      (autoplay-policy compliance lives in uiSounds.ts).
 *   3. Installs delegated, DRY listeners on the document so any
 *      `[data-cursor]`, `<a>`, or `<button>` opts in automatically:
 *        - pointerenter on such an element → soft hover tick (throttled in the
 *          engine).
 *        - click on such an element → soft pluck.
 *
 * Delegation keeps it DRY — no per-component wiring. Disabled / aria-hidden
 * elements are ignored. The header mute toggle itself is skipped so toggling
 * audio off doesn't fire a click on the way out.
 *
 * Renders nothing. All audio is gated inside the engine by the store's
 * `enabled` flag and the gesture-unlock, so when audio is off (or before the
 * first gesture) every handler is a cheap no-op.
 */
import { useEffect } from "react";
import { useAudioStore } from "@/webgl/store/audioStore";
import {
  armAudioGesture,
  playClick,
  playHover,
} from "@/lib/audio/uiSounds";

/** Selector for elements that opt into UI sounds. */
const INTERACTIVE = "a, button, [data-cursor]";

/** True if the element (or an ancestor) is disabled / hidden from a11y. */
function isInert(el: HTMLElement): boolean {
  if (el.getAttribute("aria-hidden") === "true") return true;
  const closestInert = el.closest<HTMLElement>(
    "[disabled], [aria-disabled='true'], [data-audio-skip]",
  );
  return !!closestInert;
}

export function AudioTriggers() {
  useEffect(() => {
    // Sync the persisted preference and arm the autoplay-policy unlock.
    useAudioStore.getState().hydrate();
    armAudioGesture();

    // pointerenter does not bubble, so we listen in the CAPTURE phase on the
    // document and test the target's closest interactive ancestor. This stays
    // a single listener (DRY) yet fires once as the pointer enters a control.
    const onPointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const hit = target.closest<HTMLElement>(INTERACTIVE);
      if (!hit || isInert(hit)) return;
      // relatedTarget inside the same control → not a fresh enter; skip so we
      // don't re-fire while moving across a button's inner spans.
      const related = e.relatedTarget as HTMLElement | null;
      if (related && hit.contains(related)) return;
      playHover();
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const hit = target.closest<HTMLElement>(INTERACTIVE);
      if (!hit || isInert(hit)) return;
      // The mute control plays its own transition-free toggle; let it stay
      // silent on the click that disables audio.
      if (hit.closest("[data-audio-toggle]")) return;
      playClick();
    };

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("click", onClick, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}

export default AudioTriggers;
