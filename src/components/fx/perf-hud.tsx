"use client";

/**
 * PerfHud — the DOM half of the `?perf=1` overlay (mobile-parity plan Phase
 * 6.1). A dev/preview debug tool, NOT site copy: terse English abbreviations,
 * no i18n, aria-hidden, pointer-events:none.
 *
 * Renders null unless `tierStore.perfHud` is true — that flag is only ever
 * written by `resolve()` on the client, through `devOverridesAllowed()`, so
 * server HTML and every production host are byte-identical to before (the
 * component is mounted in layout.tsx next to CanvasHost/Preloader and simply
 * returns null). Data comes from `perfStore` (written by PerfProbe at most
 * 4×/s) + `tierStore`; a React re-render 4×/s is fine for a debug overlay.
 *
 * Layout: fixed bottom-left mono panel, z-[95] — above the canvas (z-0) and
 * the content wrapper (z-1), below the preloader (z-[100]) so it never covers
 * the loading beat it is meant to help measure after.
 */
import { usePerfStore } from "@/webgl/store/perfStore";
import { useTierStore } from "@/webgl/store/tierStore";

/** Renderer string cap on the panel (the store keeps up to 120 chars). */
const RENDERER_CHARS = 40;

function fmt(n: number, digits = 1): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

/** 1234567 → "1.23M", 12345 → "12.3k". */
function fmtCount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

/**
 * Outer gate: with the flag off this holds ONE selector subscription and
 * renders null — the panel (and its perfStore/tierStore subscriptions) only
 * exists while `?perf=1` is active.
 */
export function PerfHud() {
  const enabled = useTierStore((s) => s.perfHud);
  if (!enabled) return null;
  return <PerfHudPanel />;
}

function PerfHudPanel() {
  const tier = useTierStore((s) => s.tier);
  const phoneGL = useTierStore((s) => s.phoneGL);
  const fxBudget = useTierStore((s) => s.fxBudget);
  const tierBackend = useTierStore((s) => s.backend);
  const sample = usePerfStore();

  // Client-only by construction (the flag is never true during SSR).
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as { hardwareConcurrency?: number; deviceMemory?: number })
      : null;
  const cores = nav?.hardwareConcurrency;
  const mem = nav?.deviceMemory;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const devDpr = typeof window !== "undefined" ? window.devicePixelRatio : 0;

  const backend = sample.backend || tierBackend || "—";
  const renderer = sample.renderer
    ? sample.renderer.length > RENDERER_CHARS
      ? `${sample.renderer.slice(0, RENDERER_CHARS - 1)}…`
      : sample.renderer
    : "—";
  const live = sample.sampledAt > 0;

  const rows: Array<[string, string]> = [
    [
      "fps",
      live
        ? `${fmt(sample.fps, 1)} · ${fmt(sample.frameMs, 1)} ms · 5s ${fmt(sample.frameMs5s, 1)} ms`
        : "— (probe warming)",
    ],
    ["dpr", live ? fmt(sample.dpr, 2) : "—"],
    [
      "draw",
      live
        ? `${fmtCount(sample.drawCalls)} calls · ${fmtCount(sample.triangles)} tris`
        : "—",
    ],
    [
      "tex",
      !live
        ? "—"
        : sample.texturesMB === null
          ? "n/a (WebGL)"
          : `${fmt(sample.texturesMB, 1)} MB`,
    ],
    ["be", backend],
    ["gpu", renderer],
    [
      "fx",
      `L${fxBudget.level} · post ${fxBudget.postFx} · ×${fxBudget.particleScale}`,
    ],
    ["tier", `${tier} · phoneGL ${phoneGL ? "yes" : "no"}`],
    ["hw", `${cores ?? "?"} cores · ${mem !== undefined ? `${mem} GB` : "? GB"}`],
    ["vp", `${vw}×${vh} @${fmt(devDpr, 2)}`],
  ];

  return (
    <div
      aria-hidden="true"
      data-perf-hud
      className="pointer-events-none fixed bottom-3 left-3 z-[95] select-none rounded-sm border border-rule bg-bg/70 px-2.5 py-2 font-mono text-[10px] leading-[1.45] tracking-[0.02em] text-ink backdrop-blur-sm"
      style={{ maxWidth: "min(92vw, 380px)" }}
    >
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2 whitespace-nowrap">
          <span className="w-8 shrink-0 text-ink-mute uppercase">{k}</span>
          <span className="min-w-0 truncate tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  );
}
