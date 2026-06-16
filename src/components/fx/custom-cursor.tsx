"use client";

/**
 * CustomCursor — "Signal" particle cursor.
 *
 * A single 2D canvas paints a bright core that trails cyan→violet "signal"
 * sparks as the pointer moves (velocity-reactive: faster = hotter/violet),
 * breathes with slow motes at rest, swells into an orbiting halo + label over
 * interactive elements (data-cursor="view"|"drag"|"link", with a legacy-selector
 * fallback), and bursts on click. The OS cursor is hidden on fine pointers while
 * mounted (text fields keep a caret, via globals.css `html.cursor-none`). Never
 * mounts under prefers-reduced-motion or coarse pointers, so touch / RM keep the
 * native cursor.
 *
 * Driven off gsap.ticker (the page's single shared ticker — no extra rAF) and
 * the shared pointerStore raw pointer (the same pointer the WebGL layer breathes
 * off). Particles draw pre-rendered radial-glow sprites with additive blending
 * for GPU-cheap bloom; the pool is capped.
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  installPointerTracking,
  usePointerStore,
} from "@/webgl/store/pointerStore";

const INTERACTIVE = "a, button, [role='button'], .card-steel, .cursor-grab";
const CYAN: [number, number, number] = [59, 225, 255]; // #3BE1FF
const VIOLET: [number, number, number] = [124, 92, 255]; // #7C5CFF
const SPRITE_STOPS = 6;
const SPRITE_SIZE = 64;
const MAX_PARTICLES = 220;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  t: number;
  spin: number;
}

function presetFor(state: string | null, legacyHit: boolean) {
  switch (state) {
    case "view":
      return { scale: 2.6, label: "VIEW" };
    case "drag":
      return { scale: 2.3, label: "DRAG" };
    case "link":
      return { scale: 1.9, label: "" };
    default:
      return { scale: legacyHit ? 1.8 : 1, label: "" };
  }
}

function buildSprites(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < SPRITE_STOPS; i++) {
    const t = i / (SPRITE_STOPS - 1);
    const r = Math.round(CYAN[0] + (VIOLET[0] - CYAN[0]) * t);
    const g = Math.round(CYAN[1] + (VIOLET[1] - CYAN[1]) * t);
    const b = Math.round(CYAN[2] + (VIOLET[2] - CYAN[2]) * t);
    const cv = document.createElement("canvas");
    cv.width = SPRITE_SIZE;
    cv.height = SPRITE_SIZE;
    const c = cv.getContext("2d");
    if (c) {
      const m = SPRITE_SIZE / 2;
      const grd = c.createRadialGradient(m, m, 0, m, m, m);
      grd.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grd.addColorStop(0.35, `rgba(${r},${g},${b},0.5)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = grd;
      c.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    }
    out.push(cv);
  }
  return out;
}

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const label = labelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const releaseTracking = installPointerTracking();
    document.documentElement.classList.add("cursor-none");
    const sprites = buildSprites();

    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const particles: Particle[] = [];
    let px = w / 2;
    let py = h / 2;
    let prevX = px;
    let prevY = py;
    let coreX = px;
    let coreY = py;
    let hoverTarget = 1;
    let hoverScale = 1;
    let hovering = false;
    let labelText = "";
    let visible = false;
    let primed = false;
    let ambient = 0;

    const spawn = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      life: number,
      size: number,
      t: number,
      spin = 0,
    ) => {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      particles.push({ x, y, vx, vy, life, max: life, size, t, spin });
    };

    const onTick = (_time: number, deltaTime: number) => {
      // gsap deltaTime is ms; stay robust if a build ever reports seconds.
      const dms = deltaTime > 1 ? deltaTime : deltaTime * 1000;
      const dt = Math.min(dms, 50) / 16.6667;

      const { raw } = usePointerStore.getState();
      px = raw.x * w;
      py = raw.y * h;
      if (!primed) {
        primed = true;
        coreX = px;
        coreY = py;
        prevX = px;
        prevY = py;
        visible = true;
      }
      const mvx = px - prevX;
      const mvy = py - prevY;
      const speed = Math.hypot(mvx, mvy);
      prevX = px;
      prevY = py;

      coreX += (px - coreX) * Math.min(1, 0.35 * dt);
      coreY += (py - coreY) * Math.min(1, 0.35 * dt);
      hoverScale += (hoverTarget - hoverScale) * Math.min(1, 0.18 * dt);

      if (!visible) {
        ctx.clearRect(0, 0, w, h);
        return;
      }

      // Trail sparks scale with pointer speed; colour heats cyan→violet w/ speed.
      const n = Math.min(6, Math.floor(speed * 0.35));
      for (let i = 0; i < n; i++) {
        const f = n > 1 ? i / n : 0;
        spawn(
          px - mvx * f + (Math.random() - 0.5) * 4,
          py - mvy * f + (Math.random() - 0.5) * 4,
          -mvx * 0.06 + (Math.random() - 0.5) * 0.6,
          -mvy * 0.06 + (Math.random() - 0.5) * 0.6,
          28 + Math.random() * 22,
          6 + Math.random() * 6,
          Math.min(1, speed / 60) * (0.5 + Math.random() * 0.5),
        );
      }
      // Ambient breathing motes when nearly still.
      ambient += dt;
      if (speed < 1.2 && ambient > 6) {
        ambient = 0;
        const a = Math.random() * Math.PI * 2;
        const rad = 10 + Math.random() * 14;
        spawn(
          px + Math.cos(a) * rad,
          py + Math.sin(a) * rad,
          Math.cos(a) * 0.2,
          Math.sin(a) * 0.2,
          40 + Math.random() * 30,
          4 + Math.random() * 4,
          Math.random(),
          (Math.random() - 0.5) * 0.06,
        );
      }
      // Hover: a swirl of orbiting motes around the cursor.
      if (hovering && Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2;
        const rad = 16 * hoverScale;
        spawn(
          px + Math.cos(a) * rad,
          py + Math.sin(a) * rad,
          -Math.sin(a) * 1.2,
          Math.cos(a) * 1.2,
          26 + Math.random() * 16,
          5 + Math.random() * 5,
          0.2 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.1,
        );
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        if (p.spin) {
          const c = Math.cos(p.spin * dt);
          const s = Math.sin(p.spin * dt);
          const nvx = p.vx * c - p.vy * s;
          p.vy = p.vx * s + p.vy * c;
          p.vx = nvx;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        const lf = p.life / p.max;
        const idx = Math.min(
          SPRITE_STOPS - 1,
          Math.max(0, Math.round(p.t * (SPRITE_STOPS - 1))),
        );
        const sz = p.size * (0.55 + 0.45 * lf);
        ctx.globalAlpha = lf * lf * 0.85;
        ctx.drawImage(sprites[idx], p.x - sz / 2, p.y - sz / 2, sz, sz);
      }

      // Core glow + crisp center.
      const cg = 22 + hoverScale * 6;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(sprites[1], coreX - cg / 2, coreY - cg / 2, cg, cg);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(coreX, coreY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(232,250,255,1)";
      ctx.fill();

      if (label) {
        label.style.transform = `translate(${coreX}px, ${coreY + 24}px) translate(-50%, -50%)`;
      }
    };
    gsap.ticker.add(onTick);

    const onOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const stateEl = target?.closest<HTMLElement>("[data-cursor]");
      const state = stateEl?.dataset.cursor ?? null;
      const legacyHit = !state && !!target?.closest(INTERACTIVE);
      const { scale, label: text } = presetFor(state, legacyHit);
      hoverTarget = scale;
      hovering = scale > 1.05;
      visible = true;
      if (label && text !== labelText) {
        labelText = text;
        label.textContent = text;
        gsap.to(label, { opacity: text ? 1 : 0, duration: 0.22 });
      }
    };
    const onDown = () => {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 3.5;
        spawn(
          px,
          py,
          Math.cos(a) * sp,
          Math.sin(a) * sp,
          24 + Math.random() * 14,
          5 + Math.random() * 5,
          Math.random(),
        );
      }
    };
    const onLeaveDoc = () => {
      visible = false;
      particles.length = 0;
      if (label) gsap.to(label, { opacity: 0, duration: 0.2 });
    };

    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveDoc);

    return () => {
      gsap.ticker.remove(onTick);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeaveDoc);
      document.documentElement.classList.remove("cursor-none");
      releaseTracking();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[90]"
      />
      <span
        ref={labelRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[91] select-none font-mono text-[8px] tracking-[0.25em] text-[hsl(189_100%_82%)] opacity-0"
        style={{ willChange: "transform, opacity" }}
      />
    </>
  );
}
