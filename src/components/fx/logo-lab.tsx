"use client";

/**
 * LOGO LAB — live variant picker for the hero spore logo.
 *
 * The boss wants to choose the hero-logo look from several options. This is a
 * small DOM overlay (NOT inside the Canvas) that lists every variant in
 * `webgl/gpgpu/sporePresets.ts` and writes the chosen id into
 * `fxStore.heroPreset`; HeroLogo rebuilds the spore rig on change, so the
 * switch is live. Pick the winner, then bake it by setting
 * DEFAULT_SPORE_PRESET_ID in sporePresets.ts.
 *
 * WHEN IT SHOWS: only on the home route (where HeroLogo mounts) AND only when
 * enabled. Enabled automatically on INTERNAL hosts the team reviews on —
 * localhost and the *.vercel.app preview/staging domain (e.g.
 * sersan.vercel.app) — and on any host by adding `?logolab` to the URL. It is
 * NEVER auto-shown on the public custom domain (www.sersan.io), so real
 * visitors never see it. `?logolab` persists the choice per-browser;
 * `?logolab=0` (or `=off`) is the kill switch that disables it and clears the
 * saved flag. Purely a tuning tool: no SSR output (mounts after hydration), and
 * tree-shake-friendly (no heavy 3D imports — sporePresets is pure data).
 *
 * CONTROLS: click a variant, or ◀ / ▶ (and ← / → arrow keys) to cycle, or H to
 * hide/show the panel. Collapsed state persists in localStorage.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useFxStore } from "@/webgl/store/fxStore";
import { SPORE_PRESETS } from "@/webgl/gpgpu/sporePresets";

const GROUP_LABEL: Record<string, string> = {
  colour: "Colour",
  behaviour: "Hover / behaviour",
  single: "Single layer (no outer crust)",
};
const GROUP_ORDER = ["colour", "behaviour", "single"] as const;

const ACCENT = "#3BE1FF";
const SURFACE = "rgba(7, 14, 26, 0.92)";
const INK = "#F4F6FA";
const MUTED = "#8A94A6";
const BORDER = "rgba(59, 225, 255, 0.22)";

export function LogoLab() {
  const pathname = usePathname();
  const heroPreset = useFxStore((s) => s.heroPreset);
  const set = useFxStore((s) => s.set);

  // Enable gate resolved client-side (URL + env). null until mounted so SSR and
  // first paint render nothing (no hydration mismatch).
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const q = params.get("logolab");
    const off = q === "0" || q === "off"; // ?logolab=0 / =off is the kill switch
    // Two-way persistence: ?logolab enables + remembers; ?logolab=0 clears it.
    if (off) window.localStorage.removeItem("sersan:logolab");
    else if (params.has("logolab"))
      window.localStorage.setItem("sersan:logolab", "1");
    // Auto-show on the INTERNAL hosts the team uses to review (the *.vercel.app
    // preview/staging domain + localhost) so the boss doesn't have to remember
    // ?logolab — but NEVER on the public custom domain (www.sersan.io), where
    // the gate stays ?logolab-only so real visitors never see the tuning panel.
    const host = window.location.hostname;
    const isInternalHost =
      host.endsWith(".vercel.app") ||
      host === "localhost" ||
      host === "127.0.0.1";
    const on =
      !off &&
      (process.env.NODE_ENV !== "production" ||
        isInternalHost ||
        params.has("logolab") ||
        window.localStorage.getItem("sersan:logolab") === "1");
    setEnabled(on);
    setCollapsed(window.localStorage.getItem("sersan:logolab:collapsed") === "1");
  }, []);

  const active = SPORE_PRESETS.findIndex((p) => p.id === heroPreset);
  const activeIdx = active < 0 ? 0 : active;

  function select(id: string) {
    set({ heroPreset: id });
  }
  function cycle(dir: number) {
    const next = (activeIdx + dir + SPORE_PRESETS.length) % SPORE_PRESETS.length;
    select(SPORE_PRESETS[next].id);
  }
  function toggleCollapsed() {
    setCollapsed((c) => {
      const n = !c;
      window.localStorage.setItem("sersan:logolab:collapsed", n ? "1" : "0");
      return n;
    });
  }

  // Keyboard: ← / → cycle, H hide/show. Ignored while typing in a field.
  useEffect(() => {
    if (!enabled || pathname !== "/") return;
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement)?.isContentEditable)
        return;
      if (e.key === "ArrowRight") cycle(1);
      else if (e.key === "ArrowLeft") cycle(-1);
      else if (e.key === "h" || e.key === "H") toggleCollapsed();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pathname, activeIdx]);

  if (!mounted || !enabled || pathname !== "/") return null;

  const current = SPORE_PRESETS[activeIdx];

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: 80,
        width: collapsed ? "auto" : 270,
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
          LOGO LAB
        </span>
        <span style={{ color: MUTED, fontSize: 10 }}>
          {activeIdx + 1}/{SPORE_PRESETS.length}
        </span>
        <button
          onClick={toggleCollapsed}
          title="Hide / show (H)"
          style={{
            marginLeft: "auto",
            cursor: "pointer",
            background: "transparent",
            border: `1px solid ${BORDER}`,
            color: INK,
            borderRadius: 6,
            padding: "2px 8px",
            font: "inherit",
          }}
        >
          {collapsed ? "▴" : "▾"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Current + cycle controls */}
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => cycle(-1)}
                title="Previous (←)"
                style={cycleBtn}
              >
                ◀
              </button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ color: ACCENT, fontWeight: 600, fontSize: 13 }}>
                  {current.name}
                </div>
              </div>
              <button onClick={() => cycle(1)} title="Next (→)" style={cycleBtn}>
                ▶
              </button>
            </div>
            <div style={{ color: MUTED, marginTop: 6, fontSize: 11, minHeight: 28 }}>
              {current.blurb}
            </div>
          </div>

          {/* Full list, grouped */}
          <div style={{ overflowY: "auto", padding: "6px 8px 10px" }}>
            {GROUP_ORDER.map((g) => {
              const items = SPORE_PRESETS.filter((p) => p.group === g);
              if (!items.length) return null;
              return (
                <div key={g} style={{ marginTop: 6 }}>
                  <div
                    style={{
                      color: MUTED,
                      fontSize: 9.5,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      padding: "4px 6px",
                    }}
                  >
                    {GROUP_LABEL[g]}
                  </div>
                  {items.map((p) => {
                    const isActive = p.id === current.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => select(p.id)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          cursor: "pointer",
                          padding: "6px 8px",
                          marginBottom: 2,
                          borderRadius: 6,
                          border: `1px solid ${isActive ? ACCENT : "transparent"}`,
                          background: isActive
                            ? "rgba(59,225,255,0.12)"
                            : "transparent",
                          color: isActive ? ACCENT : INK,
                          font: "inherit",
                          transition: "background 120ms, border-color 120ms",
                        }}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              );
            })}
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
