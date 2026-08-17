# PRIOR ART — mobile fidelity of effects + preloader (Sersan repo, read 2026-08-17)

Sources read in full: `ANALISI_LUSION.md`, `docs/STRATEGY.md`, `MOBILE_HOME_SPEC.md`, `MOBILE_AUDIT.md`, `PIANO.md`, `WEBGL_UPGRADE_PLAN.md`, `HANDOFF_FOUNDER_MORPH.md` (mobile/tier notes), memory index + 7 linked memory files. Supplementary grep hits: `IMPROVEMENT_BACKLOG.md:157-199`, `HANDOFF_FIX3_NEURAL.md:38-69`, `.trellis/spec/frontend/quality-guidelines.md:114-125`. No repo file modified.

---

## 1. Already DECIDED / SPEC'd — mobile fidelity of effects and the preloader

### 1a. Tier system and the "no islands / no post on phones" rulings

- **Tier scalar exists and is authoritative for layout.** `PIANO.md:23` — "Tier system: `full` (desktop) / `lite` (mobile) / `off` (`prefers-reduced-motion` → niente WebGL), con degrado fps." `WEBGL_UPGRADE_PLAN.md:117-118` (non-negotiable checklist) — "**Gating**: layer TSL solo su `pathname===… && tier==='full' && webgpuEnabled()`. lite/off/reduced-motion/coarse/≤768px → **solo DOM**, completo e accessibile."
- **Postprocessing (bloom/DOF) is OFF on phones — settled, do not re-litigate.** `MOBILE_AUDIT.md:171` — "**Postprocessing (bloom/DOF)** | Off | **Yes — keep off** | Fill-rate suicide on tile GPUs." Reaffirmed `MOBILE_HOME_SPEC.md:356` — "`PostFXNodes` / `PostFX` (461) | `scenePass` → HDR target + the bloom mip pyramid + vignette + tonemap ≈ 5× fullscreen of fill at a **100% duty cycle on every route**. MOBILE_AUDIT §2 rules it 'fill-rate suicide on tile GPUs'. Settled; do not re-litigate." and `:496`.
- **Pointer flowmap / fluid off on touch** — `MOBILE_AUDIT.md:172` ("No pointer to track"). **Scroll snap engine off on touch — deliberate** — `MOBILE_AUDIT.md:173` (cites `scroll-snap.ts:194`); memory `intro-one-beat-scroll-snap-2026-07-23.md:15` — snap engine "inert on touch/pinch/`max-width:767px`/form focus"; `:23` "mobile/touch snapping deliberately absent (stacked layouts + rails' own CSS snap-x)."
- **`prefers-reduced-motion` → no canvas at all — do not touch.** `MOBILE_AUDIT.md:174`; `MOBILE_HOME_SPEC.md:219` — rung 1: "`tierStore:69` → tier `"off"` → `CanvasHost.tsx:32` mounts **no canvas at all**… **Content complete; motion lost, never content.**"
- **Raymarch black holes never on phones.** `MOBILE_HOME_SPEC.md:355` (`SequenceSingularity`: "~38M fetches/frame even at DPR 1… **there is no bloom on a phone**… an unbloomed 48-step twin at 390px is… a hard-edged emissive ring with no falloff… Shipping a visibly cheaper copy of the signature object is worse for the brand than shipping an honestly different one") and `:493`. `HomeSingularity` is "**Structurally impossible**" on touch — gate chains to `[data-hero-brand]`, desktop-only DOM (`MOBILE_HOME_SPEC.md:21`, `:354`).
- **`FounderPortraitMorph` and `RailPlanes` never on phones** — `MOBILE_HOME_SPEC.md:352-353`, `:495`; also `WEBGL_UPGRADE_PLAN.md:179-181` — "WebGPU-compute mandatorio… Fallback DOM completo e accessibile su non-webgpu / lite / off / reduced-motion / coarse / mobile." Memory `merge-reconciliation-2026-07-23.md:24-26`: morph mode requires `(min-width:1024px) and (min-height:780px)` + tier full + real webgpu backend.
- **Gate outcome Q3 (2026-08-11): "One done properly — the singularity passage."** `MOBILE_AUDIT.md:535` — "Phase 4 replaces the 180vh empty void with a phone-viable black-hole beat at reduced budget. The founders rail gets `M-3 useCentreFocus` instead of the particle morph."

### 1b. What phones DO get (the additive "phoneGL" model)

- **DPR on every coarse pointer: `dprInitial 1.0 / min 1.0 / max 1.5`** — `MOBILE_HOME_SPEC.md:209` and `:240-253` (fix for iOS falling through to `strong`/DPR 2 because Safari hides `WEBGL_debug_renderer_info`; scoped to `(pointer: coarse)` so M-series Macs are unaffected). PIANO already budgeted "DPR≤1.5 mobile" (`PIANO.md:107`); ANALISI_LUSION §3.6 "Mobile: solo Bloom+Vignette+ToneMapping, DPR≤1.5" (`ANALISI_LUSION.md:87`) — see contradiction §5.
- **`phoneGL` capability boolean, additive, deny-list of pre-2020 tile GPUs, never consults `detectGpuClass()`** — `MOBILE_HOME_SPEC.md:255-300`. Invariant: "`tier` selects the DOM LAYOUT; `phoneGL` selects whether decorative islands may mount" (`:263-265`). Only ONE Scene gate moves: `NeuralLattice` ×2 → `pathname === "/" && island && webgpu` (`:317`), with the SVG-fallback complement in the same commit (`:324-333`). Compact particle count 3200 (`:335-346`).
- **SignatureLine already mounts on every phone, ungated (`Scene.tsx:300`) but is inert (no glow) because PostFX is full-tier only** — `MOBILE_HOME_SPEC.md:196`. Decision: add a compact-only additive **sheath** (second TubeGeometry, same curve, radius ×4.5, AdditiveBlending) instead of bloom (`:194-203`), plus a compact `/` curve record (`routeCurvesCompact`, `:141-181`) and the **swallow** (line extinguished into the composited black hole via `seqStore.liteSwallow`, `:183-192`).
- **Composited (CSS + point-tunnel) black hole on phones, not raymarch** — `MOBILE_HOME_SPEC.md:27`, §3 (`:58-232`). Fallback chain `:215-224`.
- **Lenis on touch: keep native scrolling, never `syncTouch`** — `MOBILE_AUDIT.md:380-386`; `MOBILE_HOME_SPEC.md:497`.
- **Route transitions on touch: FLIP bails on coarse (D-19); reuse `displacement-wipe.tsx`** — `MOBILE_AUDIT.md:279`, `:346-348`.
- **Hero on touch: 3 grouped panels crossfading on one sticky stage (compact spine); particle intro stays off** — `MOBILE_AUDIT.md:162` ("Keep the particle intro off"), `MOBILE_HOME_SPEC.md:37`, `:451-454`; `[data-hero-brand]` must NOT appear in the compact branch.

### 1c. Preloader — decisions on record

- **Original decision (2026-06-07): preloader intentionally omitted** — `.trellis/tasks/06-06-…/prd.md:33`: "the scene is 100% procedural — zero assets to load — so a percentage preloader would be fake". Later reversed: a preloader exists (`src/components/fx/preloader.tsx`, memory `laptop-webgpu-unsupported.md:16`) and was **rebuilt 2026-08-07 by owner directive (C14)** as a 50k-point raw-WebGL particle tunnel with warp exit — `IMPROVEMENT_BACKLOG.md:157-164`: "Keep: truthful readiness signals, watchdog, reduced-motion skip, single rAF, Lenis parking." Verified `:182`, `:187` (zoom+fade exit, PUSHED).
- **The preloader tunnel is what phones already run** — `MOBILE_HOME_SPEC.md:213` — "the point tunnel is already shipped to every phone by the preloader"; `:220` "`createPreloaderTunnel` returns null (`:667`) → `tunnelDead = true` → the CSS hole + veil + cover carry the whole 1/d move." So the preloader tunnel is a **WebGL1-class raw canvas** independent of the R3F island/tier gate; on no-WebGL it returns null.
- **`LITE_DPR_CAP = 1` on the passage band, `LITE_MIN_CORES = 4`** (`MOBILE_HOME_SPEC.md:129-130`) reused for phone capability.
- **Lusion-inspired preloader plan (not yet built): mono digit-roll counter + "the load segment becomes the start of the signature line"; reduced-motion → static fade** — `ANALISI_LUSION.md:52-56`, `:129`; `PIANO.md:49`, `:87` (F6). Explicit anti-goal: "preloader da 60s" (`ANALISI_LUSION.md:122`).
- **No mobile-specific preloader spec exists.** Neither MOBILE_AUDIT nor MOBILE_HOME_SPEC contains a preloader section (grep: only the two tunnel-reuse mentions above). Preloader mobile fidelity is an open gap.

---

## 2. Design intent for mobile in MOBILE_HOME_SPEC — parity or subtraction?

**Verdict: deliberate subtraction with ONE honestly-different signature beat, not parity.** The spec's own words:

- Thesis (`MOBILE_HOME_SPEC.md:27`): "The phone stops being a shortened desktop and becomes **a 14.4-viewport page with two pinned cinematic beats, three lateral rails that share one grammar, and one continuous lit filament threading all of it**… The hole itself is not a raymarch and does not pretend to be."
- The brand argument for subtraction over cheap parity (`:355`): "Shipping a visibly cheaper copy of the signature object is worse for the brand than shipping an honestly different one."
- Hard constraint (`:3`): "every fine-pointer render path is byte-identical after this work." Desktop is never touched to help mobile.

**Effects deliberately dropped on phones and the stated reason** (`MOBILE_HOME_SPEC.md:348-357`, `:489-507`):

| Dropped | Quoted reason |
|---|---|
| `PostFXNodes`/bloom | "~5× fullscreen of fill at 100% duty cycle on every route… 'fill-rate suicide on tile GPUs'. Settled." (`:356`, `:496`) |
| `SequenceSingularity` raymarch | "~38M fetches/frame… no bloom on a phone… hard-edged emissive ring with no falloff, inviting the side-by-side comparison" (`:355`) |
| `HomeSingularity` | "Structurally impossible… visibility gate chains to `[data-hero-brand]`, desktop-only DOM" (`:354`, `:493`) |
| `RailPlanes` | "Self-disables on `railStore.pinned`, which only the pinned desktop DOM writes… renders **nothing** until the rail is pinned" (`:352`) |
| `FounderPortraitMorph` | same `pinned` gate + "all-or-nothing failure path… P0 content-loss risk on the device class with the worst Lighthouse" (`:353`) |
| Hero particle intro | "Keep the particle intro off" (`MOBILE_AUDIT.md:162`); compact spine "deliberately does not introduce" `[data-hero-brand]` (`:354`) |
| Lenis `syncTouch` | "fights iOS momentum, breaks overscroll and pull-to-refresh" (`:497`) |
| Custom drag translator, 4th rail, swipe-deck hero, segmented Fit control, two-plate ring, spinning accretion disc | `:498-502` (each with a stated aesthetic/gesture reason; "a rotating cyan ring on a consultancy site reads as a loading spinner") |
| Any copy change | "Site copy is final" (`:503`) |

**Effects deliberately ADDED / upgraded on phones:** neural lattices as real WebGL on capable phones (`:39`, `:42`, §4); signature-line sheath + compact curve + swallow (§3.5-3.6); pinned composited black hole (§3); DPR fix (§4.1a). Every performance number is "**arithmetic, not measurement**" (`:471`) — real-device gate in Wave 3 (`:469-485`) is "the only gate that can kill a feature."

`docs/STRATEGY.md` mobile intent is minimal and older: `C7` (`:575-580`) — "Cinematic spine collapses to stacked stages (already implemented). All grids collapse to 1 column < 768px… Sticky CTA bar… (optional, Phase 2)"; `C6` (`:572-574`) — reduced-motion "kill cinematic scrub, kill marquee, kill card loops. Keep static end-states."

---

## 3. Known device / QA constraints

- **Dev laptop is Snapdragon X Elite (ARM64) + Adreno X1-85.** `laptop-webgpu-unsupported.md:10`; `HANDOFF_FIX3_NEURAL.md:66`. Old failure: with `NEXT_PUBLIC_WEBGPU=1` "TSL pipeline compilation appeared to starve the preloader's rAF" → preloader **froze at ~99%** ("il cap di sicurezza 3.5s non scatta perché il rAF è fermo", `HANDOFF_FIX3_NEURAL.md:66`). **CORRECTED 2026-07-09 / confirmed live 2026-07-16**: WebGPU now loads on this laptop; `WEBGPU=1` usable for local QA (`laptop-webgpu-unsupported.md:12`, `webgl-batch-pending-desktop-qa.md:18`, MEMORY.md index).
- **`.env.local` is per-machine and gitignored; currently `NEXT_PUBLIC_WEBGPU=1`.** `laptop-webgpu-unsupported.md:15`; `webgl-batch-pending-desktop-qa.md:25` ("set to 0 for a fluid DOM/WebGL view on this laptop").
- **"WebGPU Device Lost" (Adreno driver) after many dev reloads → Chrome GPU process stays poisoned across ALL tabs, no console errors; looks like a code bug. Cure: fully restart Chrome.** `wow-wave-camera-lockup-2026-07-23.md:45-46`; `merge-reconciliation-2026-07-23.md:33-37`. FrameDriver hands rAF back to Lenis on device loss (`wow-wave…:46`); GPU-loss resilience item A3 landed (`IMPROVEMENT_BACKLOG.md:185`).
- **This laptop's browser window is 769px tall → founders morph never shows (needs min-height 780); horizontal 3-card rail is the correct fallback, not a bug.** `merge-reconciliation-2026-07-23.md:24-26`.
- **Hidden/background tab throttles rAF → preloader "lingers", R3F loop, Lenis, entry clocks, IntersectionObserver callbacks all freeze; absence of an effect is NOT evidence of a defect.** `intro-one-beat-scroll-snap-2026-07-23.md:22` (batch actions in ONE `browser_batch`; frozen `lenis.time` is the tell); `MOBILE_AUDIT.md:417-425` (`document.visibilityState === "hidden"` → no FPS numbers, no screenshots); `MOBILE_AUDIT.md:617-626` (IO trap); `HANDOFF_FOUNDER_MORPH.md:232-234` ("Mobile mai verificato… tab finisce spesso `hidden` → rAF strozzato, ogni misura di tempo falsa. → **A mano.**"); `.trellis/spec/frontend/quality-guidelines.md:117-123` (wait for preloader leaf `INITIALISING SIGNAL` to reach opacity<0.05 up the ancestor chain; a real gesture unblocks it); `HANDOFF_FIX3_NEURAL.md:42`.
- **Drive scroll with real wheel events, not `window.scrollTo`** — `quality-guidelines.md:124-125`; native instant-scroll desyncs Lenis (B14, `IMPROVEMENT_BACKLOG.md:166-175`).
- **Turbopack serves stale CSS; parallel agents sharing `.next` clobber chunk manifests → assert page is styled before trusting any measurement; `rm -rf .next`.** `MOBILE_AUDIT.md:628-631`, `:651-653`.
- **Everything mobile so far is emulated (Chrome device-mode 390×844); no real-device numbers.** `MOBILE_AUDIT.md:428`; `MOBILE_HOME_SPEC.md:471`, `:485` ("Do not let 'it felt fine on my phone' close gate 2"). Lighthouse mobile baseline 0.61 / LCP 7.6s (`MOBILE_AUDIT.md:390-404`); target: not below 0.61, LCP no regression (`MOBILE_HOME_SPEC.md:482`).
- **WebGPU vertex-buffer budget is 8** — pipeline silently rejected, nothing renders, tsc green (`HANDOFF_FOUNDER_MORPH.md:95-107`, `:257-259`: "typecheck verde + review approfondita **non è evidenza che funzioni**. Apri il browser e guarda la console").
- **`SignatureLine` two-heights contract error ~45px is mobile-only, invisible on desktop** — `HANDOFF_FOUNDER_MORPH.md:234`, `:243`.
- **No cookie banner exists in the codebase** despite AGENTS.md — `MOBILE_AUDIT.md:647-648`.
- **Vercel auto-deploys from `main`; push only on explicit request.** `HANDOFF_FOUNDER_MORPH.md:253`; `merge-reconciliation-2026-07-23.md:30-31`.

---

## 4. ANALISI_LUSION.md — preloader / mobile claims to RE-VERIFY

The analysis was done live on **desktop 1920px only** (`ANALISI_LUSION.md:3`); nothing about Lusion's mobile behaviour was observed. Claims worth re-checking against lusion.co today:

- Lusion is **Astro + WebGL2, "WebGPU non usato"** (`:14-15`), 3 canvases (`:16`), custom `.buf` geometry with `_ld/_hd` LOD (`:17-18`), MatCap materials (`:19`) — the LOD split is the only hint of a device-quality tier; **how it degrades on phones was never observed**.
- **Preloader beat** (`:33-34`): "barra di progresso minimal centrata + **contatore percentuale gigante**… con **cifre che 'rollano'**… Caricamento lungo e deliberato"; at 100% "la barra si piega/frammenta fino a formare la 'L' monogramma → stato **'click-to-enter'** (gesture per sbloccare l'audio)". Re-verify: does the mobile preloader keep the counter/monogram morph? Does click-to-enter survive on touch (tap-to-enter)? Is the loading actually long on mobile or is there a lighter asset set (`_ld`)?
- **Continuous cross-page scroll** (`:42`) and virtualized/"jacked" scroll (`:31`) — re-verify on touch; our decision is native touch scrolling, no `syncTouch`.
- Sound design requires a gesture gate (`:20`); our stance: audio off by default (`:116`).
- Replica plan for us (`:55`): counter with digit-roll + "reveal in cui il segmento di caricamento diventa l'inizio della signature line… Reduced-motion → fade statico." **No mobile variant specified.**
- Postprocessing recommendation (`:87`): "Mobile: solo Bloom+Vignette+ToneMapping, DPR≤1.5" — superseded (see §5).

---

## 5. Open contradictions between documents

1. **Bloom on mobile.** `ANALISI_LUSION.md:87` and `PIANO.md:37` ("variante mobile ridotta") plan a *reduced* mobile post stack (Bloom+Vignette+ToneMapping). `MOBILE_AUDIT.md:171` and `MOBILE_HOME_SPEC.md:356`, `:496` rule post **off entirely** on phones ("settled; do not re-litigate"). Later docs win, but the earlier plan was never struck.
2. **Palette accent.** `AGENTS.md`/`ANALISI_LUSION.md:130` say cyan→**violet** (`#3BE1FF → #7C5CFF`); `WEBGL_UPGRADE_PLAN.md:62-63` and memory `webgl-batch-pending-desktop-qa.md:12` say **"mai violetto"** — cyan `#3BE1FF` → blue `#2A7FFF`, site-wide de-violet landed 2026-07-09. `docs/STRATEGY.md:511` names a third accent, "Electric blue (`hsl(205 95% 62%)`)".
3. **WebGPU.** `PIANO.md:109` verdict "RESTARE WebGL2 per il lancio" (blocker: `@react-three/postprocessing` WebGL-only) vs `WEBGL_UPGRADE_PLAN.md:27-31` "**WebGPU-first**… TSL… `PostFXNodes`" — the codebase went WebGPU-first with a build-time flag; PIANO's verdict is stale.
4. **Preloader existence.** `.trellis/tasks/06-06-…/prd.md:33` "Preloader intentionally omitted (decision 2026-06-07)… a percentage preloader would be fake" vs `IMPROVEMENT_BACKLOG.md:157-164` owner-directed particle-tunnel preloader (2026-08-07) with "truthful readiness signals". Also `ANALISI_LUSION.md:55` says "abbiamo già preloader+tier system" (written before June 7?). Which "truthful" signals exist on a phone (where most islands never mount) is unspecified.
5. **Hero on touch.** `docs/STRATEGY.md:577` "Cinematic spine collapses to stacked stages (already implemented)" and `MOBILE_AUDIT.md:75` (stacked `min-h-[80svh]`) vs `MOBILE_HOME_SPEC.md:37` compact pinned 3-panel spine over 180svh with `MobileFallback` renamed `StackedFallback` and routed **only** to reduced-motion. Also `MOBILE_HOME_SPEC.md:20`: today `usesFallback = isMobile || reduceMotion` — reduced-motion on desktop shares the mobile path; must be split.
6. **Passage height / hole facts.** `MOBILE_AUDIT.md:76`, `:159` (180vh void, "cut to ~120svh") vs `MOBILE_HOME_SPEC.md:14` (already 130svh runway, 56svh hole after Phase 4.1) → spec target 180svh (`:118`). MOBILE_AUDIT's numbers pre-date Phase 4.1.
7. **Founders on mobile.** `MOBILE_AUDIT.md:160` proposes "a scrubbed 2-stage morph" as second wow payload; gate outcome `:535` and `MOBILE_HOME_SPEC.md:353`, `:495` reject the morph on phones. `WEBGL_UPGRADE_PLAN.md:179` still lists `COUNT_BY_TIER {full:26000, lite:12000}` implying a lite morph budget that is never mounted (and count is now 60k, `founder-headshots-landed.md:21`).
8. **Tier vs capability model.** `MOBILE_AUDIT.md:355-378` proposes replacing `SceneTier` with a 5-axis capability model, atomic across 13 call sites; `MOBILE_HOME_SPEC.md:494` explicitly does NOT do it and adds `phoneGL` instead ("Semantic debt acknowledged: after this, `tier === "lite"` no longer implies 'no islands'"). `MOBILE_HOME_SPEC.md:263` invariant vs `WEBGL_UPGRADE_PLAN.md:117` "lite/off/…/coarse → solo DOM" — the upgrade-plan checklist is now stale for `NeuralLattice`.
9. **`detectGpuClass()` role.** `MOBILE_AUDIT.md:364` — "already exists and is unused for gating" (implies use it); `MOBILE_HOME_SPEC.md:270-275` — deliberately NOT used for capability ("GPU class is a BUDGET input, not a capability test").
10. **Root font-size.** MOBILE_AUDIT gate Q1 authorised the one desktop change (13px→16px root, `MOBILE_AUDIT.md:533`) vs MOBILE_HOME_SPEC's "every fine-pointer render path is byte-identical" (`:3`) — reconcilable (Q1 predates the spec) but the two constraints are stated as absolutes in different docs.
11. **Root/section budgets by locale.** Spec contract ≤14.50 vh EN / ≤15.20 IT (`MOBILE_HOME_SPEC.md:52`) vs MOBILE_AUDIT's measured 27.6 vh baseline (`:87`) — not a contradiction, but note the spec's target hero/passage numbers assume Wave 1 chunks that memory files do not record as landed (no memory entry after 2026-07-23; MOBILE_AUDIT §10-11 record Phases 2-3 only, and `:635` "Phase 4 (WebGL)… not built" as of that writing).
12. **QA hardware.** `HANDOFF_FIX3_NEURAL.md:65-69` "WebGPU NON gira su questo portatile… QA visiva… va fatta sul desktop" vs memory correction (`laptop-webgpu-unsupported.md:12`) — laptop QA is now valid; the handoff note is stale.

---

## Bottom line for the next step

- Nothing on record specifies how the **preloader** should behave on a phone (fidelity, DPR, tunnel budget, readiness signals when islands never mount, reduced-motion skip is the only rule). That is the primary gap.
- Mobile **effects** policy is settled and documented as *subtraction + one honest signature beat*: no bloom, no raymarch, no morph, no RailPlanes; yes to DPR 1-1.5, lattices on `phoneGL`, line sheath+swallow, composited black hole. Any proposal to add bloom or a raymarch twin on phones must argue against `MOBILE_HOME_SPEC.md:355-356` explicitly.
- All perf claims are arithmetic; a real-device pass (60fps @4× throttle, mid Android + oldest iPhone) is still the gate (`MOBILE_HOME_SPEC.md:478`).
