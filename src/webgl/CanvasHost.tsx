"use client";

/**
 * The single persistent WebGL host (signature-line spec §1).
 *
 * Mounted once in the root layout, fixed full-viewport BEHIND the DOM
 * content (z-0; content wrapper sits at z-1), pointer-events:none and
 * aria-hidden — the 3D layer is decorative, screen readers and input never
 * see it.
 *
 * Tier is resolved in an effect (never during SSR/hydration) and the scene
 * is dynamic(ssr:false): Next 16 App Router forbids ssr:false inside Server
 * Components, so this client wrapper is the seam. "off" tier (reduced
 * motion, no WebGL) renders nothing at all — the DOM site is complete
 * without it.
 */
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useTierStore } from "./store/tierStore";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

export function CanvasHost() {
  const tier = useTierStore((s) => s.tier);
  const resolved = useTierStore((s) => s.resolved);
  const resolve = useTierStore((s) => s.resolve);

  useEffect(() => {
    resolve();
  }, [resolve]);

  if (!resolved || tier === "off") return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <Scene tier={tier} />
    </div>
  );
}
