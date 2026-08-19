"use client";

/**
 * WORDMARK LAB — live tuner for the SERSAN particle wordmark.
 *
 * The hero wordmark is a particle render of the `[data-hero-brand]` span, and
 * how it READS is the product of two coupled numbers that can only be judged
 * on screen: the anchor's FONT WEIGHT, which sets the STROKE WIDTH, and the
 * particle DISC SIZE (`uPointSize` — the billboard sprite each particle
 * draws), which sets the BRIGHTNESS. The two are not interchangeable: a mote
 * is sub-pixel at every value on this slider (mean disc ÷ 11.4 CSS px), so the
 * disc cannot widen or overhang a stroke — it only decides how much additive
 * light each of the ~48k particles deposits inside it, roughly as disc².
 * This panel exposes both live so the owner can settle them in one
 * sitting instead of a round trip per guess. Bake the winner by editing the
 * inline `fontWeight` on both `[data-hero-brand]` anchors
 * (components/sections/cinematic-system-scroll.tsx — re-run the width
 * calibration documented there, the Jost masters do NOT share advance widths)
 * and `POINT_SIZE` in webgl/HeroTextParticles.tsx.
 *
 * WHEN IT SHOWS: only on the home route (the only route with a wordmark
 * anchor) AND only when enabled. Enabled in DEVELOPMENT, or on any host by
 * adding `?wordmark` to the URL, or once that flag has been persisted in
 * localStorage. Deliberately NOT auto-shown on preview hosts the way Logo Lab
 * was: an ordinary production page load can never render it. `?wordmark=0`
 * (or `=off`) is the kill switch and clears the saved flag. No SSR output
 * (mounts after hydration) and no heavy imports — the two modules it touches
 * are the plain zustand text-morph store and a bare module ref.
 *
 * CONTROLS: click a weight, or ◀ / ▶ (and ← / → arrow keys) to cycle it;
 * − / + (and ↑ / ↓) for the disc; R resets to the shipped defaults; H
 * hides/shows the panel. Collapsed state persists in localStorage.
 *
 * HOW EACH KNOB REACHES THE PARTICLES:
 *   · WEIGHT — written as `style.fontWeight` on every `[data-hero-brand]`
 *     anchor, then the face is awaited via `document.fonts.load` and
 *     `textMorphStore.brandAnchorEpoch` is bumped. That epoch is already a
 *     build dep of HeroTextParticles' sampling effect (the DOM→island "anchor
 *     changed" signal from mobile-parity Phase 4b), so the bump re-runs the
 *     EXISTING resample path — it re-reads `getComputedStyle(brand)` and
 *     re-rasterises the glyphs. Nothing new was invented for this. The
 *     `fonts.load` await matters — the more so since the ladder now ships
 *     `preload: false` (app/layout.tsx): without it the canvas sampler can
 *     rasterise with the fallback face before the new weight's woff2 lands.
 *   · DISC — written to `wordmarkTuner.pointSize`, which HeroTextParticles'
 *     frame loop copies into the existing `uPointSize` uniform (the same one
 *     the compact override writes). No rebuild, no second uniform.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTextMorphStore } from "@/webgl/store/textMorphStore";
import { wordmarkTuner } from "@/webgl/store/wordmarkTuner";

/** The patched Sersan Display ladder registered in app/layout.tsx. */
const WEIGHTS = [200, 220, 240, 260, 280, 300, 340] as const;

/**
 * Stem width as a fraction of CAP HEIGHT, measured per weight on the patched
 * faces in src/fonts. The owner's flat reference ARTWORK measures ~5.0–6.5%,
 * which is what makes 220/240/260 the "faithful" band — but the shipped
 * wordmark is a PARTICLE render, and additive sub-pixel motes scatter light
 * and read lighter than solid artwork, so the shipped weight (340, 9.71% —
 * the owner's call on this very panel, after 300 still read thin) deliberately
 * sits well above the band. The band is annotated, not prescriptive.
 */
const STEM_OVER_CAP: Record<number, number> = {
  200: 0.0471,
  220: 0.0543,
  240: 0.06,
  260: 0.0671,
  280: 0.0714,
  300: 0.0786,
  340: 0.0971,
};
/** Weights inside the reference artwork's 5.0–6.5%-ish stem/cap band. */
const REFERENCE_BAND = new Set([220, 240, 260]);
/** Jost's OS/2 sCapHeight is 700/1000 upem on every weight in the ladder. */
const CAP_OVER_EM = 0.7;

/** Shipped defaults — what the page loads with, and what R restores. */
const DEFAULT_WEIGHT = 340;
const DEFAULT_DISC = 9;
const DEFAULT_DISC_COMPACT = 6;
// Range brackets the shipped 9 in both directions — the point of the knob is
// that the owner can go BRIGHTER as well as dimmer (coverage ≈ disc²).
const DISC_MIN = 2;
const DISC_MAX = 16;

/**
 * On-screen MOTE size, for the honest readout. `uPointSize` is NOT CSS px and
 * is not comparable to the stroke width: the render stage computes
 * `POINT_SIZE × dpr × (0.7 + 0.7·hash) / dist` in DEVICE px (gpgpuNodeSim
 * `sizeNode`, quad corners ±0.5 so the extent IS the diameter), and `dist` is
 * the view-space distance to the wordmark plane — CAMERA_Z, i.e. 12
 * (webgl/constants.ts; inlined here so this route-bundle panel never imports
 * three). Dividing the dpr back out, the CSS-px diameter is
 * `POINT_SIZE × (0.7…1.4) / 12`, mean `POINT_SIZE × 1.05 / 12 ≈ POINT_SIZE /
 * 11.4` — deeply sub-pixel at every value on this slider, i.e. many motes per
 * stroke width, never one disc overhanging it.
 */
const CAMERA_Z = 12;
const DISC_RAND_MEAN = 1.05;

const ACCENT = "#3BE1FF";
const WARN = "#FFB26B";
const SURFACE = "rgba(7, 14, 26, 0.92)";
const INK = "#F4F6FA";
const MUTED = "#8A94A6";
const BORDER = "rgba(59, 225, 255, 0.22)";

interface Readout {
  /** Computed font-size of the live anchor, px. */
  fontSizePx: number;
  /** Computed font-weight of the live anchor. */
  weight: number;
  /** Derived cap height, px. */
  capPx: number;
  /** Derived stem width, px (NaN if the weight is off the ladder). */
  stemPx: number;
  /** Measured anchor width, px, and as a share of the viewport. */
  widthPx: number;
  widthPct: number;
  /** Whether the live anchor is the compact (phone) one. */
  compact: boolean;
  /** Is the face for the current weight actually loaded? */
  faceLoaded: boolean;
}

function measureAnchor(): Readout | null {
  const el = document.querySelector<HTMLElement>("[data-hero-brand]");
  if (!el) return null;
  const cs = getComputedStyle(el);
  const fontSizePx = parseFloat(cs.fontSize) || 0;
  const weight = Number(cs.fontWeight) || 0;
  const capPx = fontSizePx * CAP_OVER_EM;
  const pct = STEM_OVER_CAP[weight];
  const rect = el.getBoundingClientRect();
  let faceLoaded = false;
  try {
    faceLoaded = document.fonts.check(
      `${weight} ${Math.max(fontSizePx, 1)}px ${cs.fontFamily}`,
      "SERSAN",
    );
  } catch {
    faceLoaded = false;
  }
  return {
    fontSizePx,
    weight,
    capPx,
    stemPx: pct === undefined ? Number.NaN : capPx * pct,
    widthPx: rect.width,
    widthPct: window.innerWidth ? (rect.width / window.innerWidth) * 100 : 0,
    compact: el.hasAttribute("data-hero-brand-compact"),
    faceLoaded,
  };
}

export function WordmarkLab() {
  const pathname = usePathname();

  // Enable gate resolved client-side (URL + env). Nothing renders until
  // mounted, so SSR and first paint are untouched (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [weight, setWeight] = useState<number>(DEFAULT_WEIGHT);
  const [disc, setDisc] = useState<number>(DEFAULT_DISC);
  const [readout, setReadout] = useState<Readout | null>(null);
  const [resampling, setResampling] = useState(false);
  // Monotonic token so a slow `fonts.load` from a superseded click can never
  // bump the epoch after a newer one already did.
  const applyTokenRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const q = params.get("wordmark");
    const off = q === "0" || q === "off"; // ?wordmark=0 / =off is the kill switch
    // Two-way persistence: ?wordmark enables + remembers; ?wordmark=0 clears it.
    if (off) window.localStorage.removeItem("sersan:wordmark");
    else if (params.has("wordmark"))
      window.localStorage.setItem("sersan:wordmark", "1");
    // NO internal-host auto-show (unlike Logo Lab): dev, the explicit flag, or
    // the persisted flag — so a normal production page load never mounts it.
    const on =
      !off &&
      (process.env.NODE_ENV !== "production" ||
        params.has("wordmark") ||
        window.localStorage.getItem("sersan:wordmark") === "1");
    setEnabled(on);
    setCollapsed(
      window.localStorage.getItem("sersan:wordmark:collapsed") === "1",
    );
  }, []);

  // Live readout at 4×/s — the anchor's computed font-size is viewport-relative
  // (a clamp in vw) and the face-loaded flag flips asynchronously; a debug
  // panel re-rendering four times a second is free.
  //
  // The FIRST successful measurement also SEEDS the controls, so the panel
  // opens showing what is actually on screen rather than the constants. It is
  // deliberately not a one-shot mount read: on a phone the compact anchor only
  // mounts once tierStore.backend resolves, well after this component, and its
  // shipped disc default differs from desktop's.
  useEffect(() => {
    if (!enabled || pathname !== "/") return;
    let seeded = false;
    const tick = () => {
      const m = measureAnchor();
      setReadout(m);
      if (m && !seeded) {
        seeded = true;
        if (m.weight) setWeight(m.weight);
        setDisc(
          wordmarkTuner.pointSize ??
            (m.compact ? DEFAULT_DISC_COMPACT : DEFAULT_DISC),
        );
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [enabled, pathname]);

  /**
   * Weight → the anchors, then the EXISTING resample path. See the header:
   * `brandAnchorEpoch` is already HeroTextParticles' "the anchor changed"
   * build dep, so bumping it re-runs its sampling effect (which re-reads
   * `getComputedStyle(brand)`); the `fonts.load` await keeps the canvas
   * rasteriser from sampling the fallback face.
   */
  const applyWeight = useCallback(async (w: number) => {
    setWeight(w);
    const anchors = Array.from(
      document.querySelectorAll<HTMLElement>("[data-hero-brand]"),
    );
    if (!anchors.length) return;
    for (const el of anchors) el.style.fontWeight = String(w);
    const token = ++applyTokenRef.current;
    setResampling(true);
    const cs = getComputedStyle(anchors[0]);
    try {
      await document.fonts.load(
        `${w} ${Math.max(parseFloat(cs.fontSize) || 100, 1)}px ${cs.fontFamily}`,
        "SERSAN",
      );
    } catch {
      // A malformed family stack must not block the resample.
    }
    if (token !== applyTokenRef.current) return;
    useTextMorphStore.setState((s) => ({
      brandAnchorEpoch: s.brandAnchorEpoch + 1,
    }));
    setResampling(false);
    setReadout(measureAnchor());
  }, []);

  /** Disc → the shared ref; HeroTextParticles copies it into `uPointSize`. */
  const applyDisc = useCallback((d: number) => {
    const clamped = Math.round(Math.min(DISC_MAX, Math.max(DISC_MIN, d)));
    wordmarkTuner.pointSize = clamped;
    setDisc(clamped);
  }, []);

  const cycleWeight = useCallback(
    (dir: number) => {
      const i = WEIGHTS.indexOf(weight as (typeof WEIGHTS)[number]);
      const from = i < 0 ? WEIGHTS.indexOf(DEFAULT_WEIGHT) : i;
      const next = (from + dir + WEIGHTS.length) % WEIGHTS.length;
      void applyWeight(WEIGHTS[next]);
    },
    [weight, applyWeight],
  );

  const reset = useCallback(() => {
    const compact = readout?.compact ?? false;
    applyDisc(compact ? DEFAULT_DISC_COMPACT : DEFAULT_DISC);
    void applyWeight(DEFAULT_WEIGHT);
  }, [readout, applyDisc, applyWeight]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const n = !c;
      window.localStorage.setItem("sersan:wordmark:collapsed", n ? "1" : "0");
      return n;
    });
  }, []);

  // Keyboard: ← / → weight, ↑ / ↓ disc, R reset, H hide/show. Ignored while
  // typing in a field. Arrow keys are consumed so they don't also scroll.
  useEffect(() => {
    if (!enabled || pathname !== "/") return;
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const tag = el?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (el as HTMLElement | null)?.isContentEditable
      )
        return;
      if (e.key === "ArrowRight") cycleWeight(1);
      else if (e.key === "ArrowLeft") cycleWeight(-1);
      else if (e.key === "ArrowUp") applyDisc(disc + 1);
      else if (e.key === "ArrowDown") applyDisc(disc - 1);
      else if (e.key === "r" || e.key === "R") reset();
      else if (e.key === "h" || e.key === "H") toggleCollapsed();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, pathname, disc, cycleWeight, applyDisc, reset, toggleCollapsed]);

  if (!mounted || !enabled || pathname !== "/") return null;

  // Everything derived below reads the MEASURED weight, not the panel's
  // optimistic state: mid-resample (or if a click never reached the anchor)
  // the two disagree and the readout must show what is actually on screen.
  const measuredWeight = readout?.weight ?? weight;
  const stemPct = STEM_OVER_CAP[measuredWeight];
  const stemPx = readout?.stemPx ?? Number.NaN;
  // The disc in real screen units — `uPointSize` is not CSS px (see the
  // CAMERA_Z note above), so the panel shows what a mote actually measures
  // rather than implying the uniform is a pixel count.
  const discCssPx = (disc * DISC_RAND_MEAN) / CAMERA_Z;
  // How many motes span the stroke. Always ≫ 1 across the whole slider — the
  // honest replacement for the retired "dot wider than stroke" warning, which
  // compared a uniform against a pixel width and was simply wrong.
  const motesPerStem = Number.isFinite(stemPx)
    ? stemPx / discCssPx
    : Number.NaN;
  // Additive ink deposited per mote goes with its AREA, so the knob's real
  // effect is brightness, quadratic in the value. Shown relative to whichever
  // default the LIVE anchor ships with (desktop 9 / compact 6).
  const shippedDisc = readout?.compact ? DEFAULT_DISC_COMPACT : DEFAULT_DISC;
  const coverageRel = (disc / shippedDisc) ** 2;
  const coverageColor =
    disc === shippedDisc ? ACCENT : disc < shippedDisc ? WARN : INK;

  const rows: Array<[string, string, string?]> = [
    [
      "size",
      readout
        ? `${readout.fontSizePx.toFixed(1)}px · cap ${readout.capPx.toFixed(1)}px`
        : "—",
    ],
    [
      "width",
      readout
        ? `${readout.widthPx.toFixed(1)}px · ${readout.widthPct.toFixed(2)}vw`
        : "—",
    ],
    [
      "stem",
      Number.isFinite(stemPx) && stemPct !== undefined
        ? `${stemPx.toFixed(2)}px · ${(stemPct * 100).toFixed(2)}% of cap`
        : "— (weight off ladder)",
    ],
    ["disc", `${disc} · mote ≈${discCssPx.toFixed(2)} CSS px (${disc} ÷ 11.4)`],
    [
      "ink",
      `${coverageRel.toFixed(2)}× shipped ${shippedDisc}${
        Number.isFinite(motesPerStem)
          ? ` · ${motesPerStem.toFixed(1)} motes across the stem`
          : ""
      }`,
      coverageColor,
    ],
    [
      "face",
      readout
        ? `${measuredWeight} ${readout.faceLoaded ? "loaded" : "pending"}${
            resampling ? " · resampling" : ""
          }${readout.compact ? " · compact anchor" : ""}`
        : "—",
      readout && !readout.faceLoaded ? WARN : undefined,
    ],
  ];

  return (
    <div
      style={{
        position: "fixed",
        // Bottom-RIGHT, unlike Logo Lab: the bottom-left corner belongs to the
        // `?perf=1` HUD and the two are routinely open together.
        right: 16,
        bottom: 16,
        zIndex: 80,
        width: collapsed ? "auto" : 288,
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "calc(100vh - 32px)",
        display: "flex",
        flexDirection: "column",
        background: SURFACE,
        color: INK,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        font: "12px/1.4 var(--font-jbm, ui-monospace, monospace)",
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderBottom: collapsed ? "none" : `1px solid ${BORDER}`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: ACCENT,
            boxShadow: `0 0 8px ${ACCENT}`,
            flex: "0 0 auto",
          }}
        />
        <span style={{ letterSpacing: 1.5, fontWeight: 600, fontSize: 11 }}>
          WORDMARK LAB
        </span>
        <span style={{ color: MUTED, fontSize: 10 }}>
          {weight}/{disc}
        </span>
        <button
          onClick={toggleCollapsed}
          title="Hide / show (H)"
          style={{ ...cycleBtn, marginLeft: "auto", width: "auto", padding: "2px 8px" }}
        >
          {collapsed ? "▴" : "▾"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* WEIGHT — current + cycle */}
          <div
            style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}` }}
          >
            <div style={rowLabel}>Weight</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => cycleWeight(-1)}
                title="Lighter (←)"
                style={cycleBtn}
              >
                ◀
              </button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ color: ACCENT, fontWeight: 600, fontSize: 15 }}>
                  {weight}
                </div>
              </div>
              <button
                onClick={() => cycleWeight(1)}
                title="Heavier (→)"
                style={cycleBtn}
              >
                ▶
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 3,
                marginTop: 8,
              }}
            >
              {WEIGHTS.map((w) => {
                const isActive = w === weight;
                const inBand = REFERENCE_BAND.has(w);
                return (
                  <button
                    key={w}
                    onClick={() => void applyWeight(w)}
                    title={`${w} · stem ${(STEM_OVER_CAP[w] * 100).toFixed(2)}% of cap${
                      inBand ? " · reference band" : ""
                    }${w === DEFAULT_WEIGHT ? " · shipped default" : ""}`}
                    style={{
                      cursor: "pointer",
                      padding: "5px 0",
                      borderRadius: 6,
                      border: `1px solid ${
                        isActive ? ACCENT : inBand ? BORDER : "transparent"
                      }`,
                      background: isActive
                        ? "rgba(59,225,255,0.12)"
                        : "transparent",
                      color: isActive ? ACCENT : inBand ? INK : MUTED,
                      font: "inherit",
                      transition: "background 120ms, border-color 120ms",
                    }}
                  >
                    {w}
                    {w === DEFAULT_WEIGHT ? "•" : ""}
                  </button>
                );
              })}
            </div>
            <div style={{ ...hintText, marginTop: 6 }}>
              Bordered = reference band (stem 5.0–6.5% of cap, what the flat
              artwork measures): 220 · 240 · 260. • = shipped default{" "}
              {DEFAULT_WEIGHT}, deliberately well ABOVE the band — the particle
              medium scatters light and reads lighter than solid artwork, so
              matching the artwork&apos;s stem reads too thin (300 still did;
              340 is where the owner settled).
            </div>
          </div>

          {/* DISC */}
          <div
            style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}` }}
          >
            <div style={rowLabel}>Particle disc</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => applyDisc(disc - 1)}
                title="Smaller (↓)"
                style={cycleBtn}
              >
                −
              </button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ color: ACCENT, fontWeight: 600, fontSize: 15 }}>
                  {disc}
                </div>
              </div>
              <button
                onClick={() => applyDisc(disc + 1)}
                title="Bigger (↑)"
                style={cycleBtn}
              >
                +
              </button>
            </div>
            <input
              type="range"
              min={DISC_MIN}
              max={DISC_MAX}
              step={1}
              value={disc}
              onChange={(e) => applyDisc(Number(e.target.value))}
              style={{ width: "100%", marginTop: 8, accentColor: ACCENT }}
            />
            <div style={{ ...hintText, marginTop: 2 }}>
              {DISC_MIN}–{DISC_MAX}. Shipped default {DEFAULT_DISC} (
              {DEFAULT_DISC_COMPACT} on the compact phone anchor). Bigger =
              brighter: coverage goes with the mote area (≈ disc²), so raising
              it deposits more light and lowering it thins the ink.
            </div>
          </div>

          {/* MEASURED READOUT */}
          <div style={{ padding: "8px 12px 10px" }}>
            {rows.map(([k, v, color]) => (
              <div key={k} style={{ display: "flex", gap: 8 }}>
                <span
                  style={{
                    width: 62,
                    flex: "0 0 auto",
                    color: MUTED,
                    textTransform: "uppercase",
                    fontSize: 10,
                    letterSpacing: 0.5,
                    paddingTop: 1,
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    minWidth: 0,
                    color: color ?? INK,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
            <div style={{ ...hintText, marginTop: 8 }}>
              stem = cap × the weight&apos;s stem/cap %. Disc is a uniform, not
              CSS px: on screen a mote is disc × (0.7–1.4) ÷ camera distance 12,
              mean disc ÷ 11.4 — sub-pixel at every value here, so the stroke is
              always many motes wide and the disc can never overhang it. Use the
              WEIGHT to change stroke width, the DISC to change brightness.
            </div>
            <button onClick={reset} title="Reset (R)" style={{ ...cycleBtn, width: "100%", marginTop: 8, height: 26 }}>
              reset to {DEFAULT_WEIGHT} / {shippedDisc}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const cycleBtn: React.CSSProperties = {
  cursor: "pointer",
  background: "transparent",
  border: `1px solid ${BORDER}`,
  color: INK,
  borderRadius: 6,
  width: 30,
  height: 28,
  font: "inherit",
  flex: "0 0 auto",
};

const rowLabel: React.CSSProperties = {
  color: MUTED,
  fontSize: 9.5,
  letterSpacing: 1,
  textTransform: "uppercase",
  marginBottom: 6,
};

const hintText: React.CSSProperties = {
  color: MUTED,
  fontSize: 10,
  lineHeight: 1.35,
};
