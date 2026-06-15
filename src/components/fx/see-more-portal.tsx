"use client";

/**
 * SeeMorePortal — the closing slot of the home "Selected work" rail.
 *
 * The rail shows only the six marquee studies (SphereNode → Apple UK); this
 * card is the doorway to the rest. Its centre is a LIVING PARTICLE SERSAN
 * MARK: accent-gradient particles (cyan left S → violet right S) are always
 * assembled into the logo, faint and gently breathing at rest, and they
 * IGNITE — brighter, larger, livelier — on hover / keyboard focus. Click →
 * /case-studies.
 *
 * Self-contained like CardImageDistort: its own 2D canvas (additive 'lighter'
 * blend, no three.js / no main R3F renderer). The loop runs only while the
 * card is on-screen (IntersectionObserver — reliable inside the rail's sticky/
 * transformed frame, same as CardImageDistort's force-load IO) and pauses when
 * the tab is hidden. Under prefers-reduced-motion the canvas is NOT mounted —
 * a single static SERSAN mark is the motion-free fallback. Canvas/mark are
 * aria-hidden; the card is a real <Link> with full visible text and keyboard
 * focus parity (focus = hover).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEFT_S_PATH } from "@/components/sersan-logo";

interface SeeMorePortalProps {
  /** Total engagements in the full archive (used in the DOM copy). */
  total: number;
  /** How many studies are shown in the rail before this card. */
  shown: number;
  /** Rail index for the shared hover store (RailPlanes sync + focus-scroll). */
  index: number;
  isEn: boolean;
  onHover: (index: number, target: number) => void;
  /** Shared rail card chrome (CARD_CLASS) from the parent. */
  className?: string;
}

type RGB = [number, number, number];
const CYAN: RGB = [59, 225, 255]; // --accent  #3BE1FF
const VIOLET: RGB = [124, 92, 255]; // --accent-2 #7C5CFF
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/* --- tuning knobs: one place to dial the look ---------------------------- */
const DENSITY_FINE = 2400; // max particles, fine pointer
const DENSITY_COARSE = 1000; // max particles, coarse pointer
const DENSITY_FLOOR = 400;
const SAMPLE_STRIDE = 2; // glyph rasterise stride (lower = tighter silhouette)
const LOGO_SCALE = 0.42; // mark height as a fraction of the card height
const LOGO_CY = 0.45; // mark vertical centre as a fraction of the card height
const REST_ALPHA = 0.32; // per-particle alpha at rest (faint but alive)
const ENERGY_ALPHA = 0.42; // + alpha at full hover energy
const SIZE_MIN = 0.7; // px core radius
const SIZE_VAR = 1.2;
const ENERGY_SIZE = 0.7; // + size multiplier at full energy
const REST_ORBIT = 1.1; // px drift radius at rest
const ENERGY_ORBIT = 1.9; // + drift radius at full energy
const COARSE_BASE_ENERGY = 0.4; // mobile shows a livelier mark (no hover there)

interface Particle {
  tx: number;
  ty: number; // logo target (css px)
  size: number;
  sprite: number;
  phase: number;
  spin: number;
}

export function SeeMorePortal({
  total,
  shown,
  index,
  isEn,
  onHover,
  className,
}: SeeMorePortalProps) {
  const remaining = Math.max(0, total - shown);
  const rootRef = useRef<HTMLAnchorElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!animate) return;
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    const baseEnergy = coarse ? COARSE_BASE_ENERGY : 0;

    // Three quantised glow sprites (cyan → blend → violet): tight bright core
    // for crisp dots, soft falloff for the additive glow.
    const makeSprite = (rgb: RGB): HTMLCanvasElement | null => {
      const s = 32;
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const g = c.getContext("2d");
      if (!g) return null;
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
      grad.addColorStop(0.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.45)`);
      grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      return c;
    };
    const sprites = [
      makeSprite(CYAN),
      makeSprite(mix(CYAN, VIOLET, 0.5)),
      makeSprite(VIOLET),
    ].filter((c): c is HTMLCanvasElement => c != null);
    if (sprites.length < 3) return;

    let particles: Particle[] = [];
    let W = 0;
    let H = 0;

    // Rasterise the SERSAN mark (sersan-logo.tsx LEFT_S_PATH: two stencil S's +
    // centre divider, 264×200 viewBox) and sample its ink → particle targets.
    const sampleLogo = (w: number, h: number): Array<[number, number]> => {
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(w));
      off.height = Math.max(1, Math.round(h));
      const o = off.getContext("2d", { willReadFrequently: true });
      if (!o) return [];
      const s = Math.min((h * LOGO_SCALE) / 200, (w * 0.82) / 264);
      o.fillStyle = "#fff";
      o.save();
      o.translate(off.width / 2, off.height * LOGO_CY);
      o.scale(s, s);
      o.translate(-132, -100); // centre of the 264×200 viewBox
      const sPath = new Path2D(LEFT_S_PATH);
      o.fill(sPath, "evenodd"); // left S
      o.fillRect(129, 0, 6, 200); // centre divider (widened so it survives sampling)
      o.save();
      o.translate(264, 0);
      o.scale(-1, 1);
      o.fill(sPath, "evenodd"); // mirrored right S
      o.restore();
      o.restore();
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const pts: Array<[number, number]> = [];
      for (let y = 0; y < off.height; y += SAMPLE_STRIDE) {
        for (let x = 0; x < off.width; x += SAMPLE_STRIDE) {
          if (data[(y * off.width + x) * 4 + 3] > 130) pts.push([x, y]);
        }
      }
      return pts;
    };

    const build = () => {
      const r = root.getBoundingClientRect();
      W = r.width;
      H = r.height;
      if (W < 2 || H < 2) return;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const ink = sampleLogo(W, H);
      const cap = coarse ? DENSITY_COARSE : DENSITY_FINE;
      const N = Math.min(cap, Math.max(DENSITY_FLOOR, ink.length));
      const next: Particle[] = new Array(N);
      for (let i = 0; i < N; i++) {
        const g: [number, number] = ink.length
          ? ink[(Math.random() * ink.length) | 0]
          : [W / 2, H * LOGO_CY];
        const tx = g[0] + (Math.random() - 0.5) * SAMPLE_STRIDE;
        const ty = g[1] + (Math.random() - 0.5) * SAMPLE_STRIDE;
        // Tint by horizontal position: left S cyan, right S violet, divider blend.
        const sprite = tx < W * 0.46 ? 0 : tx > W * 0.54 ? 2 : 1;
        next[i] = {
          tx,
          ty,
          size: SIZE_MIN + Math.random() * SIZE_VAR,
          sprite,
          phase: Math.random() * Math.PI * 2,
          spin: 0.5 + Math.random() * 0.9,
        };
      }
      particles = next;
    };
    build();

    let energy = baseEnergy;
    let hovering = false;
    let onScreen = true; // started immediately; IO corrects below
    let raf = 0;
    let last = 0;
    const smooth = (e: number) => e * e * (3 - 2 * e);

    const frame = (now: number) => {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      const target = hovering ? 1 : baseEnergy;
      energy += (target - energy) * (1 - Math.exp(-7 * dt));
      const e = smooth(Math.max(0, Math.min(1, energy)));
      const orbit = REST_ORBIT + ENERGY_ORBIT * e;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Gentle orbital "breathing" around the locked logo target.
        const x = p.tx + Math.cos(t * p.spin + p.phase) * orbit;
        const y = p.ty + Math.sin(t * p.spin * 1.2 + p.phase * 1.3) * orbit;
        const tw = 0.6 + 0.4 * Math.sin(t * 1.6 + p.phase);
        const a = (REST_ALPHA + ENERGY_ALPHA * e) * tw;
        const sz = p.size * (1 + ENERGY_SIZE * e);
        ctx.globalAlpha = Math.max(0, Math.min(1, a));
        ctx.drawImage(sprites[p.sprite], x - sz, y - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // The mark is always animated, so the ONLY reason to stop is going
      // off-screen (IO) or a hidden tab (visibilitychange) — never "idle".
      if (!onScreen) {
        raf = 0;
        last = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf && onScreen) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const onEnter = () => {
      hovering = true;
      start();
    };
    const onLeave = () => {
      hovering = false;
    };
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("focusin", onEnter);
    root.addEventListener("focusout", onLeave);

    const ro = new ResizeObserver(() => {
      build();
      start();
    });
    ro.observe(root);

    // Run only while the card is on-screen (reliable inside the rail's sticky/
    // transformed frame — same IO pattern CardImageDistort relies on).
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((en) => en.isIntersecting);
        if (onScreen) start();
      },
      { rootMargin: "120px" },
    );
    io.observe(root);

    const onVis = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("focusin", onEnter);
      root.removeEventListener("focusout", onLeave);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [animate]);

  return (
    <Link
      ref={rootRef}
      href="/case-studies"
      data-cursor="link"
      className={cn(className, "overflow-hidden", "see-more-portal")}
      onPointerEnter={() => onHover(index, 1)}
      onPointerLeave={() => onHover(index, 0)}
      onFocus={() => onHover(index, 1)}
      onBlur={() => onHover(index, 0)}
    >
      {animate ? (
        // The living particle mark renders here, behind the z-10 text.
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full rounded-[inherit]"
        />
      ) : (
        // Reduced-motion: a single static SERSAN mark, no animation, no duplicate.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <svg
            viewBox="0 0 264 200"
            fill="currentColor"
            className="h-[30%] w-auto text-[hsl(var(--accent))]"
            style={{ opacity: 0.55 }}
          >
            <path d={LEFT_S_PATH} fillRule="evenodd" />
            <rect x="130" y="0" width="4" height="200" />
            <g transform="translate(264 0) scale(-1 1)">
              <path d={LEFT_S_PATH} fillRule="evenodd" />
            </g>
          </svg>
        </div>
      )}
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-[hsl(var(--rule)/0.7)]">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-dim">
            {isEn ? "More work" : "Altri lavori"}
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[hsl(var(--accent))] tabular-nums">
            +{remaining}
          </span>
        </div>

        {/* Centre band — left empty so the particle mark (canvas, behind) reads
            through; the card stays a clean text card otherwise. */}
        <div className="flex-1" aria-hidden="true" />

        <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-[hsl(var(--rule)/0.7)]">
          <h3 className="flex items-start justify-between gap-2 font-display text-[1.3rem] text-ink leading-tight">
            {isEn ? "See all case studies" : "Vedi tutti i case study"}
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[hsl(var(--accent))] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </h3>
          <p className="font-mono text-[11.5px] text-ink-mute leading-relaxed">
            {isEn
              ? `${total} engagements · live builds + tier-1 delivery`
              : `${total} ingaggi · build live + delivery tier-1`}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default SeeMorePortal;
