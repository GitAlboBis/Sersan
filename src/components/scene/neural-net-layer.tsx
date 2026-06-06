"use client";

/**
 * NeuralNetLayer — a lightweight animated Canvas2D constellation that adds
 * premium depth around/behind the hero orb.
 *
 * The orb PNG is opaque (baked dark background), so a layer truly *behind* it
 * would be hidden. Instead this composites OVER the image with `mixBlendMode:
 * "screen"` — it glows through the dark field while the bright orb naturally
 * dominates its own area. It sits below the telemetry overlay + text.
 *
 * Motion: ~80 drifting nodes, distance-based links, and a handful of signal
 * pulses travelling along edges. A scroll-driven field transform parallaxes
 * the whole constellation at a *different* rate than the orb image, creating
 * real depth.
 *
 * Robustness: a static frame is drawn synchronously on mount BEFORE the rAF
 * loop starts (so a frame always exists — screenshot-verifiable). Under
 * `reduceMotion` we draw that single frame and never start the loop.
 */

import { useEffect, useRef } from "react";

const NODE_COUNT = 80;
const PULSE_COUNT = 10;
// Link distance threshold as a fraction of the min(width,height).
const LINK_DIST = 0.19;

// Brand signal palette — electric cyan + violet (matches --accent/--accent-2).
const BLUE = { r: 59, g: 225, b: 255 }; // #3BE1FF
const CYAN = { r: 124, g: 92, b: 255 }; // #7C5CFF

type Node = {
  // Normalized [0..1] position + velocity (per second, in normalized units).
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  // Twinkle phase + speed.
  phase: number;
  twSpeed: number;
  // 0 → blue, 1 → cyan.
  hue: number;
};

type Pulse = {
  a: number; // node index (from)
  b: number; // node index (to)
  t: number; // travel 0..1
  speed: number; // per second
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function NeuralNetLayer({
  progressRef,
  reduceMotion,
}: {
  progressRef: React.MutableRefObject<number>;
  reduceMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // CSS-pixel size of the canvas (updated on resize).
    let cssW = canvas.clientWidth || window.innerWidth;
    let cssH = canvas.clientHeight || window.innerHeight;

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      // Slow drift (normalized units / sec).
      vx: rand(-0.012, 0.012),
      vy: rand(-0.012, 0.012),
      size: rand(1.2, 2.6),
      phase: rand(0, Math.PI * 2),
      twSpeed: rand(0.4, 1.1),
      hue: Math.random(),
    }));

    // Build a pulse on a random connected-ish edge (just two distinct nodes).
    const spawnPulse = (): Pulse => {
      const a = Math.floor(Math.random() * NODE_COUNT);
      let b = Math.floor(Math.random() * NODE_COUNT);
      if (b === a) b = (b + 1) % NODE_COUNT;
      return { a, b, t: Math.random() * 0.3, speed: rand(0.25, 0.55) };
    };
    const pulses: Pulse[] = Array.from({ length: PULSE_COUNT }, spawnPulse);

    const sizeToBacking = () => {
      cssW = canvas.clientWidth || window.innerWidth;
      cssH = canvas.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      // Draw in CSS pixels.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const draw = () => {
      ctx.clearRect(0, 0, cssW, cssH);

      // Scroll parallax: translate the whole field up by p*3% of height and
      // scale around the centre by 1 + p*0.12 — a rate distinct from the orb.
      const p = progressRef.current || 0;
      const scale = 1 + p * 0.12;
      const shiftY = -p * 0.03 * cssH;
      ctx.save();
      ctx.translate(cssW / 2, cssH / 2);
      ctx.scale(scale, scale);
      ctx.translate(-cssW / 2, -cssH / 2 + shiftY);

      const minDim = Math.min(cssW, cssH);
      const linkPx = LINK_DIST * minDim;

      // Pre-compute pixel positions.
      const px = nodes.map((n) => n.x * cssW);
      const py = nodes.map((n) => n.y * cssH);

      // --- Links ---
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const dx = px[i] - px[j];
          const dy = py[i] - py[j];
          const d = Math.hypot(dx, dy);
          if (d > linkPx) continue;
          // Alpha falls off with distance; max ~0.32.
          const a = (1 - d / linkPx) * 0.32;
          ctx.strokeStyle = `rgba(${BLUE.r}, ${BLUE.g}, ${BLUE.b}, ${a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px[i], py[i]);
          ctx.lineTo(px[j], py[j]);
          ctx.stroke();
        }
      }

      // --- Nodes (with twinkle) ---
      for (let i = 0; i < NODE_COUNT; i++) {
        const n = nodes[i];
        const tw = 0.6 + 0.4 * Math.sin(n.phase);
        const a = 0.72 * tw;
        const r = Math.round(lerp(BLUE.r, CYAN.r, n.hue));
        const g = Math.round(lerp(BLUE.g, CYAN.g, n.hue));
        const b = Math.round(lerp(BLUE.b, CYAN.b, n.hue));
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.beginPath();
        ctx.arc(px[i], py[i], n.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Pulses (signals travelling along edges) ---
      ctx.shadowColor = `rgba(${CYAN.r}, ${CYAN.g}, ${CYAN.b}, 0.95)`;
      ctx.shadowBlur = 8;
      for (const pulse of pulses) {
        const ax = px[pulse.a];
        const ay = py[pulse.a];
        const bx = px[pulse.b];
        const by = py[pulse.b];
        const x = lerp(ax, bx, pulse.t);
        const y = lerp(ay, by, pulse.t);
        ctx.fillStyle = `rgba(${CYAN.r}, ${CYAN.g}, ${CYAN.b}, 0.95)`;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      ctx.restore();
    };

    sizeToBacking();
    // Draw a static frame synchronously BEFORE any rAF — guarantees a frame
    // exists (screenshot-verifiable) and covers the reduced-motion case.
    draw();

    const onResize = () => {
      sizeToBacking();
      draw();
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    if (!reduceMotion) {
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        // Advance node drift + twinkle.
        for (const n of nodes) {
          n.x += n.vx * dt;
          n.y += n.vy * dt;
          // Wrap softly within [0,1] so the field stays full.
          if (n.x < 0) n.x += 1;
          else if (n.x > 1) n.x -= 1;
          if (n.y < 0) n.y += 1;
          else if (n.y > 1) n.y -= 1;
          n.phase += n.twSpeed * dt;
        }

        // Advance pulses; respawn on a new edge when they finish.
        for (let i = 0; i < pulses.length; i++) {
          pulses[i].t += pulses[i].speed * dt;
          if (pulses[i].t >= 1) pulses[i] = spawnPulse();
        }

        draw();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [progressRef, reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
