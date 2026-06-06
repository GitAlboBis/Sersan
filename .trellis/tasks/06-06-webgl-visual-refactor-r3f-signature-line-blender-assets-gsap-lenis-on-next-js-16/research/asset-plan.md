This is a planning task. I have a thorough recon report already. I'll produce the markdown deliverable directly — no implementation, no files written. Let me draw on the relevant R3F/three.js knowledge plus the constraints from the recon. I don't need to call tools for a planning doc; the recon gives me everything load-bearing (Next 16, persistent Canvas seam, navy palette, Lenis singleton, dead assets).

# SERSAN 3D Asset Strategy — Plan (no implementation)

Guiding principle: a serious AI-consulting brand earns trust through **restraint**. The scroll signature-line (planned separately) is the connective tissue across the whole site; everything else is a small number of *excellent* 3D moments. The target is roughly **2 true 3D scenes** (Home hero, Trust pipeline), everything else is procedural-cheap or DOM. Total WebGL asset payload budget across the whole site: **< 5 MB**, hero alone **< 2 MB**.

---

## 1. Scene inventory

| Page | 3D element | Art direction (one line) | Verdict |
|---|---|---|---|
| **Home `/`** | Hero "intelligence" object | A single slow-breathing abstract form behind the H1; glass/gel with cyan→violet internal light; mouse-parallax | **(b) Procedural R3F** (primary) — see §2. Hyper3D GLB only if the procedural recipe can't sell the form. |
| **Home** | Background particles | Sparse instanced points drifting in negative space, depth-faded | **(b) Procedural** — shared GPU particle field (§7). Replaces the deleted Canvas2D `NeuralNetLayer`. |
| **Home** | Signature scroll-line | (Designed separately — the connective tissue) | Procedural (out of scope here, but it is the spine all pages share) |
| **Consulting `/consulting`** | Stack/practice-area visuals | DOM — the value is the typographic grid + the "stack we ship on" chips. 3D would dilute it. | **(c) Nothing** — signature line passes through; reuse particle field. |
| **Audit `/audit`** | "Six surfaces" + one-week timeline | DOM/SVG. The six surfaces are a numbered grid; the week is a horizontal timeline. Interactive but not 3D. | **(c) Nothing / DOM-SVG** — let the signature line thread the six surfaces. |
| **Case Studies `/case-studies`** | Per-card metric/sector visuals | DOM. Big numbers, sector tags, STACK chips. A model per case study is exactly the bloat to avoid. | **(c) Nothing** — particle field only. |
| **Resources `/resources`** | Article cards | DOM. Editorial layout. | **(c) Nothing** |
| **About `/about`** | Founding-pair / "judgement stays human" | DOM-led. Optional: the hero object could *recur* here at lower intensity as brand echo (reuse same procedural object, no new asset). | **(c) Nothing-new** — optionally re-mount the Home hero object dimmed. |
| **Contact `/contact`** | — | DOM form. | **(c) Nothing** |
| **Trust `/trust`** | Compliance pipeline (Input → PII redaction → Model router → Guardrail → Audit log → Output) | A flowing, staged data-pipeline diagram with a packet of light traversing six gated stages | **(a/b hybrid → recommend DOM/SVG+R3F-lite)** — see §3. Honest recommendation: **SVG + GSAP**, not full 3D. |

**What we will NOT build (explicit):**
- No per-page hero models. No model for each case study, practice area, or founder.
- No 3D logos / floating brand marks / spinning company badge.
- No 3D text (kills legibility + LCP + a11y; all headings stay DOM).
- No 3D globe/map for "UK, Italy, EU" coverage (cliché, heavy).
- No textured "office" or literal "3am" scene (too literal, not premium).
- No physics sim, no fluid sim, no heavy GPGPU beyond the one particle field.
- No imported real-world PolyHaven props (furniture/objects) — only HDRI for lighting.
- Keep total true-3D scenes at **two** (Home hero, optional Trust accent).

---

## 2. Hero object proposal (Home)

The hero must read as "engineered intelligence" — premium, restrained, not a chaotic blob, not a literal brain. Three candidates, ranked.

### Candidate A — **"Signal Core" (RECOMMENDED, procedural)**
A faceted/rounded icosahedron core wrapped in a thin refractive shell, with cyan→violet light refracting through it. Reads as a contained, governed intelligence (on-brand with "kill switch", "guardrails").
- **Recipe (procedural, no GLB):** `<Icosahedron args={[1, 4]}>` (or roundedness via subdivided geometry) with `MeshTransmissionMaterial` (drei): `transmission: 1`, `thickness: 1.2–2`, `roughness: 0.12`, `ior: 1.4`, `chromaticAberration: 0.04`, `distortion: 0.2`, `distortionScale: 0.3`, `temporalDistortion: 0.1`. Inner emissive core mesh (small sphere, `emissive` lerped cyan↔violet) so the glass *carries* the accent gradient. Subtle `MeshDistortMaterial` is the fallback if Transmission is too costly on mobile.
- **Poly budget:** icosahedron detail 4 ≈ 5,120 tris; inner core ≈ 960 tris. Negligible. Transmission's cost is the **render-target buffer**, not polys — that's the thing to budget (use `MeshTransmissionMaterial` `samples: 6` desktop / `2` mobile, `resolution: 512` desktop / `128` mobile, or disable on low tier).
- **Material treatment:** glass shell + emissive gradient core + selective Bloom (postprocessing) on the core only via a high `intensity`/`luminanceThreshold` so only the glow blooms.
- **Motion:** slow idle rotation (~0.05 rad/s on Y, tiny X wobble) + **scroll-coupled**: `uProgress` drives a subtle scale-down and Z-push as the user scrolls past the hero (object recedes, content takes over) + **mouse parallax** (lerp rotation toward pointer, ±0.15 rad). All motion gated off under `prefers-reduced-motion` (static frame, still rendered once).

### Candidate B — **"Lattice / agentic mesh" (procedural)**
A wireframe-ish geodesic shell with glowing nodes at vertices — evokes an agent graph / network without the literal Canvas2D neural-net. Instanced glowing spheres at icosphere vertices + thin lines.
- **Recipe:** icosphere geometry → extract vertex positions → `InstancedMesh` of small emissive spheres at each vertex (~80–160 nodes) + `LineSegments` for the edges, additive blending. Pulse uniform travels node-to-node with scroll.
- **Poly budget:** ~160 instanced low-poly spheres (8-seg ≈ 100 tris each ⇒ ~16k tris instanced cheaply) + lines. Fine.
- **Motion:** slow rotation + a "pulse" that lights nodes sequentially driven by `uProgress`; mouse parallax.
- *Trade-off:* risks looking like the generic "AI network" cliché. Use only if A feels too inert. Strong as the **About-page echo** at low intensity.

### Candidate C — **"Sculpted form" (Hyper3D GLB, only if A/B insufficient)**
A bespoke abstract sculpture (folded/eroded monolith) that a procedural primitive can't express.
- **Hyper3D Rodin text prompt:** `"abstract monolithic sculpture, smooth folded obsidian form with sharp interior facets, single continuous surface, minimal, premium, matte dark stone with subtle inner cavity, studio product render, no text, no base, centered"` (generate, then in Blender: decimate, apply smooth/subdiv sparingly, export GLB).
- **Poly budget after gltf-transform:** target **< 30k tris**, GLB **< 1.5 MB** Draco-compressed.
- **Material:** in-R3F PBR — dark matte navy body + a thin emissive rim (Fresnel) in the accent gradient; HDRI reflections (§4). Do **not** bake the Hyper3D texture if it's noisy; reskin in R3F.
- **Motion:** slow turntable + scroll-coupled recede + parallax.
- *Recommendation:* **Start with A.** Only spend Hyper3D credits on C if A/B don't land visually in Playwright review. Keeping the hero procedural means zero asset payload and trivial mobile fallback.

---

## 3. Trust page compliance pipeline

Six stages: Input → PII redaction → Model router → Guardrail check → Audit log → Output, each tagged with its regulation (GDPR / EU AI Act Art. 10 & 14 / DORA / ISO 27001).

**Honest recommendation: DOM/SVG + GSAP, NOT full 3D.**

Reasoning:
- The content is **labeled, sequential, and must be readable** (regulation citations per stage) — that is fundamentally a *diagram*, and SVG gives crisp text, perfect a11y (each stage is real DOM, screen-reader friendly), and trivial responsive reflow (horizontal on desktop → vertical stack on mobile).
- A 3D pipeline would fight legibility, add a second heavy scene to a page that is otherwise pure content, and the "premium" payoff is marginal versus a well-animated SVG.
- It also sidesteps the persistent-Canvas plumbing on a deep route.

**Concept (SVG + GSAP):** six gate "stations" connected by a conduit path. A **packet of light** (small gradient blob) traverses the path on scroll/`ScrollTrigger`, and as it enters each station the station "activates" (border lights in accent gradient, the regulation badge fades in, a subtle check/redaction micro-animation plays — e.g., PII stage shows text glyphs blurring out). Conduit drawn with `stroke-dasharray`/`stroke-dashoffset` reveal, accent gradient via `<linearGradient>`. GSAP timeline scrubbed to scroll; framer-motion is *not* used here (consolidate on GSAP per the recon's RAF-contention warning).

**If a 3D accent is still wanted:** keep it as a *single shared element* — let the site-wide signature scroll-line literally *become* the pipeline conduit on this page (the connective line threading through SVG stations), rather than a bespoke 3D scene. That reuses the spine we already pay for. No new asset.

---

## 4. HDRI / lighting plan

The scene is dark navy (#0B1422), so HDRI is for **reflections/refraction on the hero glass**, not for filling the scene with daylight.

- **PolyHaven category:** **Studio** (small, controllable, neutral) — e.g. a soft studio softbox HDRI. *Not* outdoor/night (night HDRIs are mostly black → no useful reflections; outdoor day is too bright/warm for a dark premium look). A studio HDRI gives clean specular streaks on the glass that read as "product render."
- **Use drei `<Environment>`?** **Yes — sufficient.** Use `<Environment>` with the studio HDRI as the **environment map only** (`background={false}` — never show the HDRI as backdrop; the navy DOM/body is the background). This drives reflections on `MeshTransmissionMaterial` without lighting the whole scene.
- **Intensity strategy on dark navy:** keep the HDRI subtle — wrap with low `environmentIntensity` (≈ 0.3–0.5) so reflections are present but not blowing out the dark mood. Add **one key rim light** (a `directionalLight`/`spotLight`) tinted toward the accent (cyan from one side, faint violet from the other) at low intensity to sculpt the silhouette against the navy. Ambient kept near zero — the emissive core + Bloom provide the "light," the HDRI provides the *surface*.
- **Asset cost:** download a **1k or 2k HDR** from PolyHaven, convert to compressed **`.hdr` (1k)** or better an **`.exr`→KTX2-style** small env; budget **< 500 KB** for the env map. One HDRI total for the whole site (reused on About echo). Prefer drei's ability to take a prefiltered/equirect at 1k — do not ship 4k/8k HDRIs.
- **Mobile/low-tier:** drop the HDRI entirely; fall back to a cheap `<Environment preset>` or a flat env color + the rim lights, or disable Transmission (use `MeshDistortMaterial` with a baked-ish look).

---

## 5. Optimization pipeline (exact sequence)

This applies **only if** we generate any GLB (Candidate C, or any future model). Candidates A/B are procedural → **zero asset pipeline**, which is the preferred state.

**Draco vs Meshopt — pick Meshopt.**
- **Choice: Meshopt (EXT_meshopt_compression).** Reasons: decode is far faster (WASM, no separate Draco decoder fetch and slower decode), it compresses geometry *and* animation, and it composes cleanly with KTX2 textures. Draco gives marginally smaller geometry but heavier/slower decode and an extra decoder dependency — not worth it for one small hero mesh where decode latency matters more than a few KB. (If we ever ship many heavy static meshes, revisit Draco for max compression.)

**Command sequence (per asset, from `model.glb`):**
```bash
# 0. (Blender already exported model.glb from Hyper3D/manual cleanup)

# 1. Inspect what we're dealing with
gltf-transform inspect model.glb

# 2. Prune unused, dedupe, weld, then meshopt-compress geometry
gltf-transform optimize model.glb model.opt.glb \
  --compress meshopt \
  --texture-compress ktx2

# (or explicit steps if optimize is too aggressive:)
# gltf-transform prune model.glb t1.glb
# gltf-transform dedup t1.glb t2.glb
# gltf-transform weld t2.glb t3.glb
# gltf-transform meshopt t3.glb t4.glb

# 3. KTX2 / Basis textures — UASTC for normal/detail, ETC1S for color, tuned dark site
#    Color/emissive maps: ETC1S (smaller). If banding shows on the dark gradients, switch that map to UASTC.
gltf-transform etc1s model.opt.glb model.ktx.glb --quality 200
#    For any normal/high-detail map use UASTC instead:
# gltf-transform uastc model.opt.glb out.glb --level 4 --rdo 4 --zstd 18
```
- **KTX2 settings for a dark site:** dark navy gradients are **banding-prone** under ETC1S. Default to **ETC1S `--quality 200`** for base-color/emissive; if Playwright screenshots show banding on the accent gradient, promote that single texture to **UASTC level 4** with zstd supercompression. Keep textures small — the hero needs almost no texture (it's emissive + env-reflective), so ideally **no baked textures at all** (procedural material) → KTX2 step becomes a no-op.

**gltfjsx invocation (typed component):**
```bash
npx gltfjsx model.ktx.glb -t -T -o src/components/scene/HeroObject.tsx
#   -t  → TypeScript
#   -T  → run through gltf-transform (transform) on the way in
#   produces a typed <HeroObject/> reading useGLTF('/models/hero.glb')
```

**Size budgets per asset:**
- Hero GLB (if used): **< 1.5 MB** (target ~800 KB).
- HDRI env: **< 500 KB** (1k).
- Any single texture: **< 256 KB**.
- **Total WebGL asset payload site-wide: < 5 MB hard cap.** Procedural-first keeps us at near-0 + the HDRI.

**Where files live:** `public/models/` for `.glb`, `public/hdri/` for the env map, `public/images/hero/orb-core.webp` **kept** as the SSR/LCP poster + mobile/RM fallback (already exists, 270 KB).

**Preload + preloader UI:**
- Hashed filenames for cache-busting; **add `.glb`/`.hdr`/`.ktx2` to `vercel.json` immutable-cache header rule** (recon risk #11 — currently not covered).
- `useGLTF.preload('/models/hero-[hash].glb')` and `<Environment>` files preloaded at module scope so they're in-flight before the Canvas mounts.
- **Preloader UI** reads drei's **`useProgress()`** (`{ progress, active }`) → render a minimal percentage counter / accent-gradient progress bar in DOM overlay; when `progress === 100 && !active`, GSAP-reveal the hero (curtain lift + the existing SSR H1 stays painted underneath for LCP). Wrap the Canvas contents in `<Suspense>` so `useProgress` tracks them.
- Hero R3F must be `next/dynamic(() => ..., { ssr: false })` with the SSR H1 + `orb-core.webp` poster preserved (recon risk #10 — LCP/SEO).

---

## 6. Hyper3D free-trial economics

- **Expect (free trial via fal.ai/hyper3d.ai):** a small, capped number of generations (typically a handful to a few dozen on the shared trial key — exact count is opaque/changes; treat it as **~10–20 usable generations, low-res, watermark-free GLB, no commercial guarantee**). Each generation may need 1–3 rerolls to get a usable form, so **budget realistically ~4–6 *concepts*, not 20.**
- **What to generate first (in priority order, only if going the GLB route):**
  1. **Home hero Candidate C** ("Signal Core" / sculpted monolith) — the single highest-value model. Spend the first 2–3 rerolls here.
  2. Nothing else, initially. Validate hero in Playwright before spending more.
  3. (Only if budget remains and a clear need emerges) an About-page variant — but prefer **reusing** the hero, not a new generation.
- **Fallback if the trial runs out (and the default plan anyway):** **everything is procedural.** Candidate A (MeshTransmission Signal Core) and Candidate B (instanced lattice) need **zero Hyper3D**. The Trust pipeline is SVG. Particles are procedural. So Hyper3D is strictly **optional polish for the hero only** — if the trial is gone or weak, ship Candidate A and the site is complete. This is the safe default: **plan to build procedural first, treat Hyper3D as an upgrade experiment, never a dependency.**

---

## 7. Decorative micro-3D — instanced particle field

One shared GPU particle field living in the persistent Canvas (replaces the deleted Canvas2D `NeuralNetLayer`). Sparse, depth-faded points in negative space — "breathing dust," never busy.

- **Implementation:** single `THREE.Points` (or `InstancedMesh` if we want shaped sprites) with a `BufferGeometry` of static positions + a custom `ShaderMaterial` (additive blending, `depthWrite: false`). All motion in the **vertex shader** — no per-frame CPU/JS work (the recon flagged the old layer's O(n²) per-frame allocs as the thing to kill).
- **Counts per performance tier:**
  - **Desktop high:** ~3,000–4,000 points.
  - **Tablet / mid:** ~1,200.
  - **Mobile / low:** ~400, or **off** entirely.
  - **`prefers-reduced-motion`:** static (positions rendered once, no animation uniform advance) or off.
- **Attributes:** `position` (vec3), `aSeed`/`aPhase` (float, per-point random for desync), `aScale` (float, size variance). Uniforms: `uTime`, `uProgress` (scroll), `uColorA`=#3BE1FF, `uColorB`=#7C5CFF, `uPixelRatio`.
- **Vertex-shader animation:** drift each point with `position.xy += vec2(sin(uTime*0.1 + aPhase), cos(uTime*0.08 + aPhase)) * aScale` for slow parallax wander; set `gl_PointSize = aScale * uPixelRatio * (1.0 / -mvPosition.z)` for perspective size; pass a depth-based fade and a color mix (`mix(uColorA, uColorB, fract(aSeed + uProgress*0.2))`) to the fragment shader so the field subtly shifts hue with scroll, tying it to the signature line.
- **Fragment shader:** soft round point (`smoothstep` on `length(gl_PointCoord-0.5)`), low alpha (~0.05–0.2), additive. Lets Bloom catch the brightest few for the "signal" sparkle.
- **Tier selection:** pick count from a device/perf store (GPU tier detection or simple width + `devicePixelRatio` heuristic + `prefers-reduced-motion`), set once on mount.

---

### Summary of the disciplined inventory
- **True 3D scenes: 2** — Home hero (procedural Signal Core; Hyper3D optional) + the shared particle field. Trust pipeline is SVG/GSAP. Everything else is DOM + the shared signature line.
- **Asset payload:** procedural-first ⇒ near-0; with optional hero GLB + 1 HDRI, **well under the 5 MB cap** (hero < 1.5 MB, HDRI < 0.5 MB).
- **Hyper3D is optional**, spent only on the hero, with a complete procedural fallback for the entire site.
- **Hard "won't build" list** prevents a model-per-page sprawl that would cheapen an enterprise consulting brand.

Relevant existing files (absolute): `C:\Users\alber\Desktop\sersan-v2-main\src\app\layout.tsx` (Canvas seam), `C:\Users\alber\Desktop\sersan-v2-main\src\lib\lenis-singleton.ts` (single-loop refactor), `C:\Users\alber\Desktop\sersan-v2-main\src\components\scene\neural-net-layer.tsx` (delete), `C:\Users\alber\Desktop\sersan-v2-main\src\app\globals.css` (palette + body-bg/veil layering), `C:\Users\alber\Desktop\sersan-v2-main\public\images\hero\orb-core.webp` (keep as LCP/RM poster), `C:\Users\alber\Desktop\sersan-v2-main\vercel.json` (add .glb/.hdr/.ktx2 cache headers).