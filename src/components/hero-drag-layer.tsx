"use client";

/**
 * Pointer-capture layer for the hero planet's drag-to-rotate.
 *
 * The WebGL canvas is pointer-events:none (decorative layer behind the DOM),
 * so this transparent layer over the RIGHT side of the hero stage captures
 * drags and feeds velocity into heroDragStore. The left side (headline +
 * CTAs) stays untouched. Wheel events bubble through to Lenis, so scrolling
 * over the planet still works.
 */
import { useRef } from "react";
import { useHeroDragStore } from "@/webgl/store/heroDragStore";
import { useTierStore } from "@/webgl/store/tierStore";

export function HeroDragLayer() {
  const last = useRef<{ x: number; y: number } | null>(null);
  // Only meaningful while the WebGL planet is live.
  const heroReady = useTierStore((s) => s.heroReady);

  if (!heroReady) return null;

  return (
    <div
      aria-hidden
      className="absolute inset-y-0 right-0 w-[46%] z-[5] cursor-grab active:cursor-grabbing select-none"
      style={{ touchAction: "pan-y" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = { x: e.clientX, y: e.clientY };
        useHeroDragStore.getState().setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!last.current) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        // px → rad/s velocity, tuned for a weighty, premium feel.
        useHeroDragStore.getState().addDelta(dx * 0.012, dy * 0.012);
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        last.current = null;
        useHeroDragStore.getState().setDragging(false);
      }}
      onPointerCancel={() => {
        last.current = null;
        useHeroDragStore.getState().setDragging(false);
      }}
    />
  );
}
