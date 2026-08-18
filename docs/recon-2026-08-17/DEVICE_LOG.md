# DEVICE LOG — mobile-parity measurement gate (plan Phase 6.2–6.3)

One row per (device × build × budget). Criterion (plan Phase 6.3): ≥ 50 fps sustained for 20 s of real
scroll with the P+ budget (`fx=2`, `post lite`) at DPR 1; memory stable; if it fails, `stepDownBudget()`
must demote to `L1 · post off` by itself within ~2.5 s after warm-up. Read the numbers from the `?perf=1`
HUD (fps · frame ms · 5s ms / dpr / draw calls · tris / tex MB / backend / gpu / fx / tier / hw / vp).

How to open on a phone: preview URL from the `mobile-parity` branch (Vercel) → `/?perf=1&fx=2` (P+),
`/?perf=1&fx=1` (today), `/?perf=1` (what the device decides on its own). Android: Chrome via USB
`chrome://inspect`; iOS: Safari Web Inspector. Never measure with the tab in the background.

| Date | Device / OS / Browser | Renderer string (HUD gpu) | cores · mem | backend | Build | Budget | fps 20 s scroll (min / avg) | 5s ms | tex MB | Step-down fired? | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-08-18 | **HARNESS, not a device** — Playwright chromium-headless-shell 145, SwiftShader (software GL), emulated Pixel 7 390×844 @3 | ANGLE (Google, Vulkan 1.3.0 (SwiftShader… | 12 · 8 GB (host laptop) | webgl2 (WebGPU adapter unavailable) | dev `next dev` @ working tree of 4e/5 | auto → L2 · post lite · ×0.5 | 11–34 (software rasteriser — meaningless as perf) | 2600–3800 (compile stalls) | 9.8 (L2) · 3.8 (L1) | n/a (pre-warm declines ignored by design; warm never reached → watchdog lift ~14 s) | **functional only**: Canvas boots, PostFXNodes `lite` mounts at L2 and is absent at L1, DPR range [1,1,1.5], HUD live, landscape 844×390 → stacked hero + composite passage (0 tunnel canvas), FLIP arms on coarse when the card is ≥60 % visible and falls back to the curtain at 35 %, 0 console errors | Baseline for what the hidden Browser pane could not show. NOT evidence about phone frame rate. |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
