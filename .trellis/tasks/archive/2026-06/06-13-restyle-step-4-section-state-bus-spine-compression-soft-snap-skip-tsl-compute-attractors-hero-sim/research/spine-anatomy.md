# Spine anatomy — cinematic-system-scroll.tsx (for the 5→2-3 stage compression)

Primary file: `src/components/sections/cinematic-system-scroll.tsx` (1140 lines).
All line refs are against the current working tree on `feat/webgl-refactor` (post step-3).

---

## 1. STAGE_CONTENT — the 6 panels (hero + 5 numbered), scroll ranges, copy

`STAGE_CONTENT: LocalizedStage[]` — cinematic-system-scroll.tsx:124-310. Each entry has
`{ id, start, end, eyebrow{en,it}, title{en,it}, body{en,it}, extras?{en,it} }`
(types at :41-63). `localizeStages(language)` (:312-322) flattens to the active
language; SSR always renders EN.

### Section height and progress mapping

- Outer section: `style={{ height: "520vh" }}` — :844 (comments at :4 "600vh", :6 "6 stages × 100vh", :830 "400vh" are STALE — the live number is 520vh).
- Inner frame: `sticky top-0 h-screen overflow-hidden` (:852-855). CSS-sticky pin, **no ScrollTrigger pin** (comment :772-774: ST pin on top would double-pin).
- ScrollTrigger (:767-778): `trigger: outer, start: "top top", end: "bottom bottom", scrub: 0.6`, `onUpdate` writes `progressRef.current = self.progress`. No snap today.
- Effective scrub distance = 520vh − 100vh (viewport) = **420vh**. Stage `start/end` are fractions of THIS ScrollTrigger's progress, not of document progress. The spine is the first thing on the page (`page.tsx:46-48`, anchor `hero`), so pin progress = `scrollY / (4.2 · innerHeight)`.

### The stages (copy is the canonical, must-survive-verbatim set)

| # | id | start→end | scroll vh (of 420) | eyebrow EN / IT |
|---|----|-----------|--------------------|------------------|
| 0 | `dormant` (hero) | 0.00→0.16 (:131-132) | 67.2vh | "AI engineering studio · production systems" / "Studio di ingegneria AI · sistemi in produzione" (:133-136) |
| 1 | `signals` | 0.16→0.29 (:164-165) | 54.6vh | "01 / Signals" / "01 / Segnali" (:166) |
| 2 | `audit` | 0.29→0.43 (:178-179) | 58.8vh | "02 / Audit" / "02 / Audit" (:180) |
| 3 | `build` | 0.43→0.60 (:208-209) | 71.4vh | "03 / Build" / "03 / Sviluppo" (:210) |
| 4 | `operate` | 0.60→0.76 (:222-223) | 67.2vh | "04 / Operate" / "04 / Operatività" (:224) |
| 5 | `handover` | 0.76→1.00 (:236-237) | 100.8vh | "05 / Handover" / "05 / Consegna" (:238) |

Verbatim copy:

- **dormant** (:137-160) — title EN: `We build production software with [accent]AI agents[/accent] inside.` / IT: `Costruiamo software di produzione con [accent]agenti AI[/accent] dentro.` Body EN: "SerSan builds custom software, AI agents, automations, MLOps architecture, and audit-ready systems for teams that need production reliability, not polished demos." / IT: "SerSan costruisce software su misura, agenti AI, automazioni, architetture MLOps e sistemi pronti per l'audit per team che hanno bisogno di affidabilità in produzione, non di demo patinate." NOTE: on desktop the hero body/eyebrow are **never rendered** (`!isHero` gates :500, :524, :529) — the hero is particle-only; the title is the H1 + the particle morph's typography source (`data-hero-headline` :511-513). On mobile the H1 alone renders (:684-687).
- **signals** (:167-174) — title EN: "Every production system starts with messy signals." / IT: "Ogni sistema in produzione parte da segnali confusi." Body EN: "Roadmaps, workflows, tools, data, constraints, and risks. The first thing we do is map what you actually have, not what the deck says." / IT: "Roadmap, workflow, strumenti, dati, vincoli e rischi. La prima cosa che facciamo è mappare ciò che avete davvero, non ciò che dice il deck."
- **audit** (:181-204) — title EN: `We find what [accent]should not[/accent] be built before code becomes debt.` / IT: `Individuiamo cosa [accent]non va[/accent] costruito prima che il codice diventi debito.` Body EN: "Architecture, risk, cost, data quality, compliance, and failure modes. About a third of ideas don't survive this step. That's the point." / IT: "Architettura, rischio, costi, qualità dei dati, compliance e modalità di guasto. Circa un terzo delle idee non supera questo passaggio. Ed è proprio il punto."
- **build** (:211-218) — title EN: "Then we design and build the system." / IT: "Poi progettiamo e costruiamo il sistema." Body EN: "Agents, retrieval, automation, model workflows, APIs, and evaluation loops. Production-grade by the time it ships, not bolted on after launch." / IT: "Agenti, retrieval, automazione, workflow di modelli, API e loop di valutazione. Pronto per la produzione già al rilascio, non aggiunto dopo il lancio."
- **operate** (:225-232) — title EN: "Production is not launch day." / IT: "La produzione non è il giorno del lancio." Body EN: "Monitoring, evals, human review, rollback paths, and handover are wired in from day one. The system that ships and the system in production are the same system." / IT: "Monitoring, eval, revisione umana, percorsi di rollback e handover sono integrati dal primo giorno. Il sistema che rilasciate e il sistema in produzione sono lo stesso sistema."
- **handover** (:239-308) — title EN: `We hand over something you can [accent]run.[/accent]` / IT: `Consegniamo un sistema che potete [accent]gestire.[/accent]` Body EN: "A production system with its evals, traces, and boundaries documented. Your team owns it from day one, and you talk to one of us, not an account manager." / IT: "Un sistema in produzione con eval, trace e limiti documentati. Il vostro team lo gestisce dal primo giorno, e parlate con uno di noi, non con un account manager."
  - **extras** (:265-308, the only stage with extras): services strip "Custom Software · AI Agents · Automation · MLOps · Audits / For SaaS, fintech & regulated teams" (IT: "Software su misura · Agenti AI · Automazione · MLOps · Audit / Per SaaS, fintech e team regolamentati") + the proof-chip `<ul>`: `13 named engagements / 5 tier-1 institutions / 1 PhD, applied maths` (IT: "13 progetti nominali / 5 istituzioni tier-1 / 1 PhD, matematica applicata") via `ProofChip` (:78-90).
  - Final-stage CTAs (rendered by StagePanel when `isFinal`, :530-546): `SPINE_COPY` (:325-338) — `ctaPrimary` "Book a 30-min scoping call"/"Prenota una call di scoping di 30 min" → `START_HREF`; `seeSelectedWork` "See selected work"/"Guarda i nostri lavori" → `#work`. (`seeWhatWeBuild` + `scroll` labels also live in SPINE_COPY; "see what we build" and "scroll" additionally exist as WebGL morph cue strings `CUE_TEXT`/`CUE2_TEXT` in HeroTextParticles.tsx:78-82 — those are particle texts, not DOM copy.)

Also rendered inside the sticky frame, stage-independent: the decorative `data-hero-brand` "Sersan AI" span (:913-929, opacity:0 forever — particle anchor + typography source, `ml-[114px]`), bottom vignette (:861-868), left scrim (:880-888), radial scrim (:896-904), `StageRail` (:932), `HeroDragLayer` (:954), `HeroIntroGate` (:960), `SpineExitGate` (:965).

---

## 2. The rAF panel system

### panelOpacity (:344-358)

`panelOpacity(progress, start, end, isHero, isFinal)`:
- `fade = Math.min(0.03, (end - start) * 0.3)` — fades live STRICTLY inside [start,end]; exactly one headline owns the screen.
- `progress <= start` → 1 if hero else 0; `progress >= end` → 1 if final else 0.
- Linear ramp in over `[start, start+fade]` (skipped for hero) and out over `[end-fade, end]` (skipped for final).
- At today's 420vh scrub, fade 0.03 ≈ 12.6vh of scroll per crossfade. After compression to ~280vh scrub it's ~8.4vh — slightly snappier; fine, but worth a QA glance.

### Per-panel rAF loop (StagePanel useEffect :379-460)

ONE `requestAnimationFrame` loop **per panel** (6 today), each reading `progressRef.current` and early-returning when opacity unchanged (:400). Writes `el.style.opacity` + `translate3d(0, (1-baseO)*16px, 0)` (:403-408).

- Hero-only branch (:409-435): while `useTextMorphStore.getState().active` the `[data-hero-headline]` H1 is suppressed (`opacity 0`) and `[data-hero-stagger]` children cascade in bottom-up from `morph.domReveal` (stagger `(reveal - i*0.14)/0.55`, smoothstep :418-426). NOTE: the current hero markup renders no `[data-hero-stagger]` elements (eyebrow/body/CTAs are `!isHero`-gated) — the cascade machinery is live but its target list is empty on the hero panel.
- **Lit/inert threshold** (:436-454): `visible = o > 0.6 && (!active || reveal > 0.5)`. On threshold crossing: `pointerEvents`, `inert`, `aria-hidden` toggled; **first light of the final panel fires `animateChipCounts(el)`** (:452).
- SSR initial state computed at progress=0 (:466-468): `initialOpacity`, `initiallyHidden = initialOpacity <= 0.6` → hero visible in server HTML, others inert.

### Panel positioning

Each `StagePanel` root is `absolute inset-0 flex pointer-events-none` **inside the sticky h-screen frame** (:471-494) — not `position:fixed`; the sticky ancestor does the pinning. All panels `items-center` (orb eyeline); hero adds `pt-[max(var(--header-h),6rem)]` (:480-483). Content column: `container-px` → `max-w-[42rem]` (:495-496). H1 clamp `2.35rem→4.5rem` (:513), H2 clamp `2.25rem→4rem` (:518).

### Chips count-up from step 3 (must move with the final panel)

- `ProofChip` (:78-90): sr-only static value + `data-chip-count` aria-hidden span (a11y contract mirrors ui/count-up.tsx).
- `animateChipCount` (:92-116): one-shot per DOM node via `dataset.chipCounted`, reduced-motion bails, gsap 0.8s expo.out 0→N, isConnected guards.
- `animateChipCounts(root)` (:118-122): runs over `[data-chip-count]` under the panel root.
- Desktop trigger = the `visible` lit-threshold crossing of the **isFinal** panel (:441-452 — "the panel's only honest 'entered view' signal inside the pin"). Mobile trigger = one-shot IntersectionObserver in MobileFallback (:622-643, rootMargin `0px 0px -10%`, threshold 0.4, re-armed on `stages` change for EN↔IT).

### StageRail (:554-602)

Own rAF loop; one tick `<span>` per stage; active when `p >= stage.start - 0.02 && p <= stage.end + 0.02` (:573) → accent color. Generated from the `stages` array — compression renumbers it automatically (3-4 ticks instead of 6). No copy involved.

### Scrim dimmer rAF (:808-824)

Third loop in the main component: `o = m.active ? 0.15 + 0.85*m.domReveal : 1` written to leftScrim + radialScrim opacities (the scrims paint OVER the canvas and would swallow the particle text).

### Everything stage-indexed that compression must renumber

1. `STAGE_CONTENT` start/end values (:124-310) — keep contiguous, hero starts at 0, final ends at 1.
2. `isHero={i === 0}` / `isFinal={i === stages.length - 1}` (:937-945) — positional, survives any count.
3. `animateChipCounts` rides `isFinal` (:452) — the handover panel MUST stay the final stage (or the trigger moves with whichever panel carries the chips).
4. StageRail tick count (:590-599) — automatic.
5. Outer height `520vh` (:844) → new budget; SpineExitGate is keyed to `rect.bottom` of the outer (pin END), not to a stage index — survives untouched.
6. Stale comments :4, :6, :126-130, :830, :843 (the "~83vh" at :129 computes 0.16×520 against the full section, not the 420vh scrub).
7. `MobileFallback` maps the same `stages` array (:647) — see §5.
8. ScrollTrigger refresh cadence (:783-799) — unchanged, but snap config attaches to this same ST (:767).

---

## 3. textMorphStore — full field map (writers → readers)

Store: `src/webgl/store/textMorphStore.ts` (:22-113 interface, :115-130 defaults). globalThis-pinned (:132-149) because Turbopack inlined separate copies into the route bundle vs the WebGL island (prod-only dead intro, 2026-06-10).

| Field | Written by | Read by |
|---|---|---|
| `active` | HeroTextParticles build resolve → `{active:true, domReveal:0}` (HeroTextParticles.tsx:345); build cleanup → `{active:false, domReveal:1}` (:370-374) | StagePanel hero rAF (cinematic:395-400), scrim dimmer (cinematic:812), HeroIntroGate `canEngage` (hero-intro-gate.tsx:65-67) |
| `domReveal` | HeroTextParticles per frame: `smoothstep(g, REVEAL_START 0.8, REVEAL_END 0.92) * morphGate(smoothstep(morphT, .85, 1))` (HTP:474-477); cleanup → 1; SmoothScrollProvider home-nav reset → 1 (smooth-scroll-provider.tsx:63) | StagePanel hero cascade (cinematic:397, 418-426), scrim dimmer (cinematic:813) |
| `gateProgress` | HeroIntroGate: accumulated wheel/touch ÷ `GATE_DISTANCE` 8500 (gate:35, 87-94), capped at 0.97 until `morph3Done` (gate:92); reverse re-engage (gate:98-103); safety valve forces 1 (gate:129); provider reset → 0 (:54) | HeroTextParticles `gTarget` → damped `g` (HTP:410-412), HeroIntroGate itself (gate:71, 126) |
| `gateEngaged` | HeroIntroGate engage/release (gate:54, 60); provider reset | **no reader today** (only writes — candidate for the section-state bus to absorb) |
| `gateKick` | HeroIntroGate (gate:83, 103); **SpineExitGate** consume (cinematic:1017-1019) | SignatureLine consumes + zeroes per frame → under-damped camera-Y spring + glow energy (SignatureLine.tsx:316-345) |
| `assembleDone` | HeroTextParticles when entry clock (`ENTRY_DURATION` 3.6s, HTP:47) completes (HTP:403-405); page-lifetime, only reset by provider on a genuine nav INTO home (provider:50-64) | HeroIntroGate (gate:71, 90 — scroll doesn't advance morph until true), HeroTextParticles rebuild seed (HTP:274, 329) |
| `morphDone` | HeroTextParticles: `morphTRef >= 0.95` after the A→B leg triggered at `g >= MORPH_TRIGGER` 0.22, plays on its own `MORPH_DURATION` 2.6s clock (HTP:67, 76, 417-429) | internal only (HTP compare :428; gate comment references it but the actual cap uses morph3Done) |
| `morph2Done` | leg B→C ("see what we build") at `MORPH2_TRIGGER` 0.44, gated on morphT≥0.95 (HTP:70, 435-448) | internal only (HTP:447, gating leg 3 :454) |
| `morph3Done` | leg C→D ("scroll", offset down `CUE2_OFFSET_Y` −0.38 view-heights) at `MORPH3_TRIGGER` 0.66 (HTP:73, 451-466) | HeroIntroGate release cap (gate:71, 92) |
| `camTilt` | **SpineExitGate** clock: ±dt/1.8 toward target while engaged (cinematic:1074-1075); provider reset → 0 | SignatureLine descent beat (SL:406-430), SpineExitGate DOM sweep (cinematic:1101-1109) |
| `tiltAnchorY` | SpineExitGate on engage = `window.scrollY` at pin end (cinematic:1005) | SignatureLine `scrollRamp = 1 − |scrollPx − anchor|/(1.5·ih)` (SL:410-411), SpineExitGate safety valve ±12px (cinematic:1094) |
| `camDescend` | SignatureLine publishes applied offset `WORLD_VIEW_HEIGHT · ease(camTilt) · scrollRamp` (SL:412, 427-429); provider reset | HeroLogo holds pre-descent station (HeroLogo.tsx:874-880), HeroTextParticles anchor (HTP:509) |
| `tiltDone` | SpineExitGate when camTilt hits 1 (→true, cinematic:1077) or 0 (→false, :1088); provider reset | SpineExitGate engage conditions: descend only if `!tiltDone`, ascend re-engage only if `tiltDone` (cinematic:1060-1066) |

**Key timing fact for compression:** the entire morph timeline (assemble → morph1/2/3 → release) runs at `scrollY = 0` *inside the HeroIntroGate hijack* — it consumes wheel input without moving the page, so it is **independent of stage ranges and total vh**. The only morph beat tied to spine geometry is the **SpineExitGate camera-descent** (cinematic:980-1139), which keys off the OUTER section's `rect.bottom` crossing the viewport bottom (pin end, :1050-1059) — it survives any height as long as the sticky pattern stays. Compression re-times when panels light, not when morphs play.

### SpineExitGate details (cinematic:980-1139)

- Engages on plausible-speed crossing (<300px/frame) of pin-end going down with `!tiltDone`, or going up with `tiltDone` (:1046-1066); aligns scroll exactly at pin end via `scrollBy(rect.bottom - ih)` (:1061).
- While engaged: Lenis stopped + re-asserted per frame (:1070), wheel/touch consumed → direction flips `target`, impulse → `gateKick` (:1012-1019).
- `camTilt` advances dt/1.8 (~1.8s full beat); at 1 → `tiltDone:true`, release, then `lenis.scrollTo(scrollY + ih, {duration:1.1})` lands the dive one viewport down (:1076-1086).
- DOM sweep: sticky stage gets `translate3d(0, −ease·ih·0.85)` + dim to 0.55 so the pinned DOM rides the camera move (:1101-1109).
- Safety valve: >12px scroll drift while engaged → release (:1094).

---

## 4. WebGL components tied to home/spine progress

- **HeroTextParticles** (`src/webgl/HeroTextParticles.tsx`) — the morph sim. Mount gates: true WebGPU compute + fonts + `[data-hero-headline]` + `[data-hero-brand]` exist (:174-184). Samples H1 + brand typography from live DOM (:189-217); language switch → MutationObserver → rebuild (:348-352). Post-gate scroll: fades over `scrollY/(0.7·ih)` (:483-485); anchor frozen once `scrollY > 2` (:498).
- **SignatureLine** (`src/webgl/SignatureLine.tsx`) — the SINGLE camera authority: `camera.position.y = −(scrollYWorld + ih/2)·k` from `useScrollStore.progress` (:303-307); gateKick spring (:316-341); lookAt-ahead on full tier (:366-390); camTilt descent (:392-430). Reads `anchors.scrollHeight` — spine height change re-flows automatically via useSectionAnchors.
- **HeroLogo** (`src/webgl/HeroLogo.tsx`) — hero pin progress `hp = scrollPx / (spans["hero"].end·sh − ih)` (:848-850; fallback `ih·4.2` ≈ hard-coded 520vh — update or rely on the span); fade over hp 0.74→0.97 (:854); drift/sink/recede choreography from hp (:875-882); `camDescend` compensation (:874). **The `hero` span = the whole 520vh outer section** (page.tsx:46-48 wraps CinematicSystemScroll), so compression automatically shortens HeroLogo's choreography runway.
- **DriftParticles** — `uProgress = useScrollStore.progress` (DriftParticles.tsx:202), document-level, not stage-keyed.
- **GatewayPortal / RailPlanes / RouteHero** — anchored to `gateway` / rail rects / `ritual`; not spine-keyed (RailPlanes reads `useScrollStore.reveal` :194; RouteHero reads velocity :253).
- DOM consumers of scrollStore (not stage-keyed but bus-relevant): `heading-choreographer.tsx:111` (velocity), `credibility-strip.tsx:68` (velocity), `production-grade-section.tsx:237` (progress).
- **Nothing in WebGL reads the spine's stage index today** — `progressRef` is a local ref, never published to a store. The section-state bus is the first time stage identity leaves this file. (`scrollStore.activeAnchor` exists and is written by useSectionAnchors.ts:171, but has **no reader** besides the anchorPulse side-channel — the bus can subsume it.)

---

## 5. MobileFallback (and ≤768px / prefers-reduced-motion desktop)

`MobileFallback` (cinematic:608-714), used when `isMobile || reduceMotion` after viewport detection (:831-832; SSR always renders desktop for the H1, :726-730).

- Plain stacked `<section>`: one `min-h-[80svh] flex items-center … py-20 border-b` block **per stage** (:651-659). Hero block: radial brand wash (:660-673), H1 only (copy/CTAs stripped to match desktop hero, :675-697). Non-hero: eyebrow + H2 + body + extras (:678-698). Final: single full-width CTA (`ctaPrimary` only, :699-707).
- Chips: one-shot IO per `[data-chip-count]` (:622-643).
- **What compression means here:** nothing is pinned and there are no ranges — mobile cost is purely "how many 80svh blocks". Two choices: (a) leave mobile mapping over all 6 copy blocks (PRD says "mobile fallback unchanged semantics" — zero risk), or (b) if desktop merges become a separate grouping layer (recommended, §8), mobile keeps iterating the UNGROUPED block list and is untouched by construction. Avoid making merged stages a copy-level change precisely so mobile/SSR/IT stay identical.

---

## 6. Signature-line home curve vs spine

`routeCurves.ts:41-61` — home waypoints: `{at:0, x:1.15, z:-1}` then anchors `credibility, problem, case-studies, work-in-progress (zero-height div, page.tsx:64), services, production, founders, process, fit, gateway(x:0), final-cta(x:0)`.

- **Nothing in the curve is keyed to spine stage positions.** The only spine-coupled inputs are: the `hero` anchor span (whole 520vh section → its center is the first measured fraction; the `at:0` waypoint precedes it) and total `scrollHeight`. `useSectionAnchors` re-measures on mount/resize/fonts/late passes (useSectionAnchors.ts:104-115) and bumps `version` → geometry rebuild (SignatureLine.tsx:160-231). Shrinking 520vh→~380vh just re-distributes fractions on the next measure; no manual curve edits needed.
- HeroLogo is the only component reading `spans["hero"]` (HeroLogo.tsx:848); its `ih*4.2` no-span fallback (:849) is the lone hard-coded 520vh echo — change to match the new height.

---

## 7. Stage offsets in page-progress terms + refresh cadence (for snapTo)

- Today, stage boundaries exist ONLY as ST-progress fractions inside `STAGE_CONTENT`. The snap array for the spine's own ScrollTrigger (:767) is simply the unique boundary set: `[0, .16, .29, .43, .6, .76, 1]` today → e.g. `[0, .20, .48, .74, 1]` post-compression. ScrollTrigger `snap.snapTo` takes trigger-local progress, so **no document-fraction conversion is needed** if snap rides the existing ST. For the `lenis.scrollTo` fallback (PRD chunk 2), px = `boundary × (H − 100vh)` where H = new outer height (spine starts at document y=0; verify with `outer.getBoundingClientRect().top + scrollY` to be header-proof).
- Document-progress equivalents (for scrollStore consumers): `docFrac(boundary) = boundary × (H − ih) / (scrollHeight − ih)` — varies with page height/locale, hence: keep snap trigger-local.
- **Home-page-owned refresh cadence** (the provider deliberately does NOT refresh on `/`, smooth-scroll-provider.tsx:42-67): spine's own `ScrollTrigger.refresh()` bursts at 60/250/700/1500ms + debounced resize 150ms (cinematic:783-799); plus the case-studies rail owns the home `fonts.ready → ScrollTrigger.refresh()` (case-studies-rail.tsx:265). Any snap config must tolerate these refreshes (ST re-resolves snap points from the same array — safe — but QA the burst window).
- Interplay warnings for soft snap: `scrub: 0.6` + Lenis lerp + HeroIntroGate (gate active at scrollY≤2 — snap must NOT fight the gate at boundary 0) + SpineExitGate (owns the pin-end boundary; snap target 1.0 would double-trigger with the exit beat — consider snapping only interior boundaries, e.g. `[.20, .48, .74]`, `directional: true`).

---

## 8. Concrete 5→2-3 merge options (copy verbatim, vh 350-400)

Ground rules derived above: hero stays stage 0 (particle-only, H1 source); handover must stay `isFinal` (chips trigger + CTAs + stays-lit-at-bottom); morph beats (assemble/morph1-3, exit dive) are geometry-independent and survive ALL options; merging = **render two copy blocks in one stage panel**, never concatenating copy. Recommended mechanics: keep `STAGE_CONTENT` as the 6 copy blocks (mobile + IT untouched), add a desktop grouping layer `DESKTOP_STAGES: { start, end, blockIds: string[] }[]`; `StagePanel` renders 1-2 blocks (each keeping its own eyebrow/title/body), `panelOpacity`/rail/snap operate on groups.

### Option A — 3 numbered stages (recommended): "Map / Ship / Handover"

Outer **390vh** → 290vh scrub. Groups:

| stage | blocks | range | scroll vh | layout |
|---|---|---|---|---|
| hero | dormant | 0→0.20 | 58 | unchanged (particle hero) |
| map | signals + audit | 0.20→0.48 | 81 | audit title leads (it's the wedge), signals block as the second column / upper-left companion; both keep "01 / Signals", "02 / Audit" eyebrows verbatim |
| ship | build + operate | 0.48→0.74 | 75 | same two-block layout |
| handover | handover (final) | 0.74→1.0 | 75 | unchanged: extras + chips + CTA cluster |

snapTo `[0, 0.20, 0.48, 0.74, 1]` (or interior-only `[.20,.48,.74]` per §7). Narrative pairing is clean: signals/audit are both "before code" (map what exists, decide what not to build); build/operate are both "the system" (ship it, run it). Homeless copy: **none** — all 6 titles+bodies+eyebrows + handover extras + SPINE_COPY labels render.

### Option B — 2 numbered stages (most aggressive): "Before production / In production"

Outer **350vh** → 250vh scrub. hero 0→0.22 (55vh) · `signals+audit+build` 0.22→0.58 (90vh) · `operate+handover` 0.58→1.0 (105vh, final). snapTo `[0, .22, .58, 1]`. Risk: 3 copy blocks on one screen overflows laptop heights (~680px) at the current type scale — needs a compact 3-up grid and the merged final panel carries operate's body + handover's title/body/extras/CTAs. Copy survives but density fights the "one headline owns the screen" principle (:340-343 comment). Viable only with a smaller per-block type ramp.

### Option C — 3 numbered stages, Build kept solo: "Map / Build / Run"

Outer **400vh** → 300vh scrub. hero 0→0.18 (54vh) · `signals+audit` 0.18→0.44 (78vh) · `build` 0.44→0.66 (66vh) · `operate+handover` 0.66→1.0 (102vh, final). snapTo `[0, .18, .44, .66, 1]`. Keeps the standalone "Then we design and build the system." beat (the strongest single line) but the merged FINAL panel is heavy (operate block + handover block + extras + 2 CTAs) and the chips' lit-trigger now fires while operate copy is also on screen. Choose only if the closing screen gets a two-column treatment (operate left, handover+chips+CTA right).

**Recommendation: Option A.** Final stage stays exactly today's handover panel (zero churn on chips/CTA/extras), both merged screens carry exactly two blocks (fits 42rem column as a 2-up at laptop heights), and pin distance per stage (75-81vh) stays above the ~60vh readability floor the 2026-06-10 hero-widening decision established (:126-130).

### Homeless-copy audit (all options)

EN+IT × {6 eyebrows, 6 titles, 6 bodies, 1 extras, 4 SPINE_COPY labels}: every item has a render slot in A and C; in B everything renders but `seeWhatWeBuild`/`scroll` SPINE_COPY entries remain (as today) referenced only by the morph cue/unused labels — they were already DOM-orphaned before this task (cues live in HeroTextParticles CUE_TEXT/CUE2_TEXT). **No copy becomes homeless in any option; nothing is rewritten.**
