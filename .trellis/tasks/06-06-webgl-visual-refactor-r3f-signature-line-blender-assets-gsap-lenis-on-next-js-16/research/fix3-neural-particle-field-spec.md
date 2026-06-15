# FIX 3 rebuild — 3D particle neural network (replaces the flat lattice)

> Spec authored 2026-06-15. The shipped `NeuralLattice` (flat feed-forward graph of tiny billboards + near-horizontal hairline edges) reads as stray underlines — rejected by the user as "bruttissimo". User decision: a **3D neural network made of dense glowing PARTICLES** (NOT straight/coplanar lines), in the Lusion "Digital Design Days" idiom (dense particle forms, flowing dissolve, cyan→violet glow, bloom). **Broken** (Problem) = pathways fracture and particles **disperse into the void**; **Healthy** (ProductionGrade) = particles stay **coherent**, signal flows, the 3 clusters pulse in sequence.

## Hard constraints (preserve the drop-in contract — verified by codebase recon)

1. **Component signature unchanged:** `NeuralLattice({ mode: "broken"|"healthy", anchorId: string })`, mounted in `Scene.tsx:264-269` gated `pathname === "/" && tier === "full" && webgpu`. Do NOT change the mount.
2. **Camera-lock placement unchanged:** keep the `useFrame` group transform math (`NeuralLattice.tsx` ~333-340): `group.position` from the measured `[data-lattice-anchor]` rect, `group.quaternion = camera.quaternion`, `group.scale = (rectW·k, rectH·k, 1)`. Rect measured on `measureVersion` bumps only (NOT per frame). Island NEVER writes the camera (single camera authority = SignatureLine). useFrame stays priority 0.
3. **Store bridge unchanged:** keep reading `useNeuralLatticeStore.getState()` once per frame; surfaces `broken`/`healthy` are 3-element pulse-target arrays (`CLUSTER_COUNT = 3`); decay targets toward 0 and write back via `setPulse` only when `anyPulse` (exact existing pattern). The DOM sections (`problem-section.tsx`, `production-grade-section.tsx`) are the SOLE writers (`bump`/`bumpCluster` on in-view; sequential for healthy). Never bump from the island.
4. **Bloom contract:** material is `MeshBasicNodeMaterial`, `toneMapped:false`, `AdditiveBlending`, `depthWrite:false`, `depthTest:false`, `renderOrder=-1`, `frustumCulled={false}`. Output color must exceed luminance 1.0 to bloom (emissive multiplier > 1.0; selective bloom threshold ≈ 1.0). Keep modest so it never rings the DOM copy above the canvas.
5. **Accessibility / z-order:** WebGL stays `aria-hidden` behind the DOM copy; the real copy (`getFailures`/`getArtifacts`) stays the legible/selectable layer. Do not touch the DOM copy.
6. **Fallback untouched:** `neural-graph-fallback.tsx` (SVG, reduced-motion / WebGL2 / lite / off) is self-contained — **keep `buildLatticeLayout()` and all current config exports intact** (ADD new exports; do not remove/rename existing ones), so the fallback path is unaffected.
7. **Lazy TSL + backend guard:** import `three/webgpu` + `three/tsl` ONLY inside the `webgpuEnabled()`-gated `useEffect` (never at module scope). True-WebGPU compute requires `backend.isWebGLBackend !== true && typeof gl.compute === "function"`; otherwise use the static (no-compute) path.
8. **No new dependencies. `prefers-reduced-motion` / tier off-lite** never mount this island (SVG fallback carries it). Delta-clamp `Math.min(rawDelta, 1/30)`.

## Reuse map (from codebase recon — use these, don't reinvent)

- **Compute force step:** `unifiedForceStep(tsl, opts)` — `src/webgl/gpgpu/gpgpuNodeSim.ts:263` (spring→anchor + cursor attractor + velocity-gated turbulence + damping + max-speed clamp). Reuse verbatim in the new kernel.
- **Storage-buffer + compute pattern:** mirror `createTextMorphComputeBuild` (`gpgpuNodeSim.ts:803`) — it springs billboard particles between sampled targets, exactly our idiom. Allocate `instancedArray(count,"vec3")` for position+velocity (+ read-only home/meta buffers), advance via a compute kernel dispatched with `gl.compute(node)` once per frame, render reads buffers via **`.toAttribute().xyz`** (MANDATORY `.xyz` swizzle — vec3 storage pads to 16B; omitting it = compile error/truncation). `.element(i)` is COMPUTE-STAGE ONLY (breaks on WebGL2 sub-backend, three #31221) — never in render.
- **Config tuning:** `src/webgl/gpgpu/gpgpuConfig.ts:14` (`SPRING/DAMPING/PUSH/RADIUS/MAX_SPEED/TURB_*` etc.). Target damping ratio ζ = DAMPING/(2·√SPRING) ≈ 0.4–0.6 for a lively-but-settling feel.
- **Static fallback build:** `createStaticParticleNodeBuild` (`gpgpuNodeSim.ts:1141`) for the non-compute path (WebGL2 sub-backend under the WebGPU flag).
- **Cursor projection (optional parallax):** `projectCursorToModel` pattern, `HeroLogo.tsx:515`.
- **Material/emissive reference:** `lineNodeMaterial.ts` (uEmissive 2.6, additive, toneMapped:false) and the old `neuralLatticeConfig.ts` emissive constants (NODE 2.4 / PACKET 3.0).

## Topology — the new 3D network (this is the look; implement precisely)

Author in the group LOCAL frame (camera-locked; xy≈[-0.5,0.5] maps to the section rect, z is real depth since scale.z=1). The whole network lives inside an **inner rotation group** (see "3D tumble") so depth reads.

- **3 layers along DEPTH (z), NOT x:** input `z=-0.34`, hidden `z=0`, output `z=+0.34`. (Depth-separated layers + tumble = connections that recede in 3D and never look like horizontal lines.)
- **3 clusters** = the 3 arguments (failures / artifacts). Each cluster occupies an angular sector around the local Z axis; cluster base angles `[ -50°, 0°, +50° ]` (fan), radius from center ≈ `0.26`. Within a (cluster,layer) cell place a small constellation of **5 nodes** jittered in xy (radius ≈ 0.07) — deterministic (index-hashed, no RNG). ⇒ ~3×3×5 = **45 nodes**.
- **Edges (curved 3D arcs):** feed-forward in depth: each layer-L node connects to 1–2 nearest layer-(L+1) nodes in the SAME cluster. Edge geometry = **quadratic Bézier** A=fromNode, B=toNode, control C = midpoint + perpendicular offset (bow out by ≈0.10 along a per-edge deterministic direction) so arcs curve in 3D. Store A,B,C per edge.
- **Break point (broken mode):** the hidden→output edges (layer 1→2) of each cluster are the "dead" segment; the output-layer nodes are "dead" nodes.

## Particles (the substance — dense glow, flowing)

Total count: **full ≈ 7000** (single tier that mounts; expose `NEURAL_PARTICLE_COUNT`). Each particle gets a deterministic role from its index, stored in read-only buffers (homeA, homeB, homeC vec3 + meta vec4 = {role, cluster, basePhase, deadFlag}):

- **~35% NODE particles:** target = a node center + small gaussian jitter (radius ≈0.025) → dense glowing cores. `homeA=homeB=nodeCenter`, role=0.
- **~65% FLOW particles:** assigned to an edge; ride the Bézier at `t = fract(basePhase + uTime*uFlowSpeed*clusterSpeed)`, plus small perpendicular jitter so the stream has thickness → the connections are DRAWN by travelling particles (the "signal"). role=1.

Color: `mix(COL_CYAN #3BE1FF, COL_VIOLET #7C5CFF, depthT)` where depthT = (localZ+0.34)/0.68 (input cyan → output violet). Flow particles brightest (× PACKET-like emissive ≈3.0), node particles × NODE emissive ≈2.4 modulated by their cluster pulse. Soft round sprite (disc via `smoothstep(0.5,0.1,length(uv))`).

Per-frame uniforms (driven from store + frame): `uTime`, `uReveal` (0→1 section fade, from `revealDamped`), `uBroken` (0/1), `uPulse` = vec3/uniformArray of the 3 eased cluster pulses (write to `.array`, not `.value` — see committed crash fix), `uFlowSpeed`, cursor (`uCursor` vec3 + strength) for the attractor, `uDisperse` (0→1 ramp while broken & in view).

### Behaviour

- **Reveal:** particles spring from a loose cloud (seed positions = scattered) onto their homes as `uReveal` rises → an assemble-in (coalesce) read.
- **Healthy:** all edges live; flow particles loop smoothly; `uPulse[c]` (sequenced eval→trace→guardrail via the DOM `bumpCluster`) boosts that cluster's node brightness + flow speed → a wave of activation travels the network. Network is coherent and calm.
- **Broken:** for DEAD flow particles (deadFlag=1, i.e. on a hidden→output edge) once `t > breakT≈0.5`: blend target toward an **outward dispersal** position (`homeB + normalize(homeB)*spread*uDisperse`), weaken the spring, add extra turbulence, and decay the particle's alpha/`alive` → they fly off and fade into the void. Dead NODE particles (output layer) desaturate toward `COL_DEAD #2A3142` and dim. The pathway visibly fractures. A cluster `uPulse` (DOM bump on in-view) kicks `uDisperse` for that cluster.

## 3D tumble + parallax (makes the 3D read)

Add an **inner `<group>`** (child of the camera-locked group) that holds all particles. Animate its rotation each frame (depth must be revealed since we look down -z):
- base orientation: `rotation.y = +0.35 rad`, `rotation.x = -0.12 rad`.
- oscillate: `y += sin(t*0.16)*0.45`, `x += sin(t*0.13)*0.12`.
- pointer parallax: lerp an extra small yaw/pitch toward the normalized cursor offset (±0.12 rad), damped. (Cursor from pointer state / raycast; reuse the HeroLogo pattern or a simple NDC mapping. Keep it subtle.)
Do NOT rotate the camera-locked outer group (that breaks rect registration) — only this inner group.

## Files

1. **`src/webgl/neural/neuralLatticeConfig.ts`** — ADD (keep all existing exports for the SVG fallback): `buildNeuralField()` returning `{ nodes:{pos,layer,cluster,dead}[], edges:{a,b,c,cluster,dead}[] }` in the 3D topology above; constants `NEURAL_PARTICLE_COUNT`, `NODE_FRACTION`, `FLOW_SPEED`, `DISPERSE_SPREAD`, layer Z, cluster angles, etc. Deterministic (index hashing, no RNG).
2. **`src/webgl/neural/neuralFieldCompute.ts`** (NEW) — `createNeuralFieldBuild({ THREE, webgpu, tsl, gl, backendIsWebGPU, field, count })` → `{ geometry, material, uniforms, compute(), dispose() }`. Owns: seed buffers (position/velocity/homeA/homeB/homeC/meta), compute kernel (uses `unifiedForceStep` + role/dead logic + flow param), render material (billboard points, additive, emissive>1, cyan→violet, alive/dispersal envelope, reveal). Provide a static (no-compute) fallback variant for `backendIsWebGPU === false`.
3. **`src/webgl/NeuralLattice.tsx`** — REWRITE internals; keep signature, camera-lock useFrame, rect measurement, store-bridge read/decay/writeback, dev debug handle, `return null` until built, renderOrder -1. Replace node/edge/packet with the single `createNeuralFieldBuild`. Add the inner rotation group + parallax. Drive all uniforms. Call `build.compute()` each frame (after camera authority) when on the WebGPU backend.
4. **`src/webgl/neural/neuralLatticeNodeMaterial.ts`** — the old node/edge/packet materials are superseded; remove its usage from NeuralLattice. You may delete the file (only NeuralLattice imports it) OR leave it unused — prefer delete to avoid dead code, but ensure no other importer (grep first).

## v1 QA findings (live WebGPU, 2026-06-15) → v2 fixes

v1 builds, compiles, runs, no crash, compute works (`hasBuild:true`, `webgpu:true`). But it looks bad and must be fixed:

1. **KILL THE ANISOTROPIC SQUISH (highest priority).** The camera-lock `group.scale.set(rectW·k, rectH·k, 1)` squishes the 3D network — catastrophic on the production anchor (rect ≈ 1280×201, 6.4:1) where the network collapses into a thin scattered horizontal band; depth/tumble is invisible. FIX: scale the inner network **ISOTROPICALLY** (uniform on x=y=z) so it keeps its proportions. Keep using the anchor rect only for the CENTER (cx, cy). Size = a confident centerpiece: target on-screen diameter ≈ **0.6 × viewport height**, centered on the anchor center (it may overflow the thin rect — it's additive glow behind the DOM copy, that's fine). Expose the size factor + a vertical-offset constant for QA tuning. Net: outer group keeps position+quaternion from the rect, but scale becomes a single isotropic `s` (NOT rectW·k × rectH·k).
2. **MUCH BRIGHTER + DENSER (it's nearly invisible).** Raise count full 7000 → **~14000**; increase point size ~2–2.5×; raise base/at-rest alpha and emissive so it reads as DENSE GLOW at the reveal levels the section actually has (the old lattice was faintly visible at the same reveal — a single small point sprite covers far less, so per-particle brightness/size must go way up). Node-core particles must be clearly brighter/denser than the flow so the structure reads.
3. **COLOR: clean cyan→violet, not green.** v1 reads greenish (low-value cyan additively over the teal navy). Verify the color node mixes COL_CYAN `#3BE1FF` → COL_VIOLET `#7C5CFF` by depthT correctly (no green intermediate), and that the brightness boost pushes it to true cyan/violet. 
4. **ASSEMBLY MUST READ.** v1 particles look scattered, not assembled onto nodes+arcs. Ensure the spring pulls particles ONTO the structure when in view (strengthen spring / raise assembled-state floor); the node clusters + curved arcs must be legible as a network. Expose `uReveal` (current value) and particle `count` in the dev debug handle so QA can confirm assembly state.
5. **Confirm the 3D tumble is visible** once the squish is gone (it was masked by the anisotropy).

These are tuning + the scale-isotropy structural fix; keep all contract points (camera-lock POSITION/quaternion from rect, store bridge, bloom, aria-hidden, fallback, `.toAttribute().xyz`, backend guard, `uPulse.array`). Main session will re-QA live and may iterate constants again — so put the look-governing values (count, point size, emissive, alpha floor, isotropic size factor, vertical offset, spring) as named constants in `neuralLatticeConfig.ts`.

## v2 QA findings (live WebGPU, 2026-06-15) → v3 fixes (STRUCTURE legibility)

v2 fixed visibility: now a large, dense, glowing CYAN particle centerpiece (scale/brightness/density/color all good, green gone, no crash). REMAINING problem: it reads as an amorphous **nebula / cloud**, NOT a legible **3D neural network**. The particles are spread into a diffuse spherical cloud instead of concentrated onto distinct NODES + connecting ARCS with visible signal flow. v3 must make the network STRUCTURE read, while keeping the dense glow.

Concentrate the 14000 particles ONTO the structure (tight node cores + thin arc streams) with empty space between — not a uniform cloud:

1. **Fewer, more distinct nodes.** `NODES_PER_CELL` 5 → **2** (⇒ 3 clusters × 3 layers × 2 = 18 nodes). Pull clusters/layers further apart so the graph has gaps: raise `CLUSTER_RADIUS` ~ +30%, widen `LAYER_Z` span ~ +30%. Goal: ~18 clearly separated hubs in 3D.
2. **Crisp bright node CORES.** Cut node jitter hard: `NODE_JITTER` → ~**0.010** (tight). Keep node particles dense and bright (cores read as distinct points of light). Node sprites bigger than flow (keep `NEURAL_NODE_SIZE_BOOST`).
3. **Thin legible ARCS (the connections must read as lines, not haze).** Cut the flow perpendicular spread hard: `FLOW_JITTER` → ~**0.006** so each arc is a thin stream. Connect each node to only its 1 (max 2) nearest next-layer node in the same cluster so arcs are sparse and readable, not a mesh.
4. **Visible travelling SIGNAL.** Add a moving brightness peak along each arc: a gaussian highlight centered at the flow parameter `t` (e.g. `signal = exp(-k*pow(fract(particleT - headT),2))`) so a bright packet visibly runs node→node along the arc (the "wow"). Tie head speed to `FLOW_SPEED`; boost per-cluster speed/brightness with `uPulse[cluster]` (healthy sequence).
5. **Depth colour gradient must read:** input/back layer CYAN `#3BE1FF` → output/front layer VIOLET `#7C5CFF`. Make sure violet is actually visible on the front layer (it wasn't in v2 — mostly cyan).
6. **Reduce diffuse cloudiness overall:** lower any global random spread / seed scatter so at rest the particles sit ON the structure. The reveal assembles them from a loose cloud INTO the crisp network.
7. **Confirm 3D reads:** with tight structure, the inner-group tumble should now clearly show depth (nodes passing in front of/behind each other). If still flat, raise tumble amplitude ~20%.

Keep all contract points. All new/changed values stay NAMED CONSTANTS in `neuralLatticeConfig.ts` for further QA tuning. NOTE for QA: live rAF throttles when the tab is unfocused — `uReveal` only ramps while scrolling; judge the look during/just-after a real scroll gesture.

## v4 — RECONCEPTION: 3 card-anchored nodes + hover-to-open (user decision 2026-06-15)

User decision (chosen option "Nodo ancorato alla sua card"): the network is now **exactly 3 nodes, one per card** (1:1), each node a dense glowing particle hub **anchored to its card's measured screen position**. **Hover/focus a card → its node flares + the card opens** (cards are COMPACT by default, expand the detail on hover/focus). Responsive. Accessible (focus = hover; touch = tap). Applies to BOTH sections (Problem = broken/fractured resting look, ProductionGrade = healthy/flowing resting look). This SUPERSEDES the 18/45-node topology; the rendering infra/contract from the earlier sections still holds.

This is the look the v2/v3 dense-cloud is NOT: not a tumbling blob, but a purposeful 3-hub graph wired to the layout. The 3D lives in (a) depth-bowing arcs between hubs, (b) hub volume, (c) flowing signal, (d) slight pointer parallax — NOT free tumble (hubs stay pinned to their cards).

### DOM changes (problem-section.tsx, production-grade-section.tsx)
- **Per-card anchor:** give each of the 3 cards a stable hook the island can measure: `data-lattice-node="<anchorId>:<i>"` (i=0..2) on the card root, inside the existing `[data-lattice-anchor="problem|production"]` container. The island measures each card's center.
- **Compact → expand:** card DEFAULT shows only the number + title (compact). On hover OR focus-within (keyboard), the card expands to reveal the body/detail with a smooth GSAP/CSS transition. **Copy stays in the DOM at all times** (visually collapsed via max-height/opacity/clip — NOT removed/conditionally-rendered) so SEO/AT read it; respect `prefers-reduced-motion` (no transition, but still toggles). The card root is focusable (`tabIndex={0}`) with `aria-expanded`; expansion triggers on `pointerenter`/`focusin`, collapse on `pointerleave`/`focusout`. Touch: tap toggles.
- **Drive the node:** on hover/focus of card i, call `useNeuralLatticeStore.getState().setHovered(surface, i)`; on leave/blur, `setHovered(surface, null)`. Keep the existing in-view `bump`/`bumpCluster` (the resting healthy sequence / broken state) — hovered is additive on top.
- Keep all copy frozen; this is presentation only.

### Store change (neuralLatticeStore.ts)
- Add non-decaying hover state: `hovered: { broken: number|null, healthy: number|null }` (default null) + `setHovered(surface, index|null)`. Keep `bump`/`bumpCluster`/`setPulse` unchanged. The island reads `hovered[surface]` each frame (does NOT decay it).

### WebGL changes (NeuralLattice.tsx, neuralFieldCompute.ts, neuralLatticeConfig.ts)
- **Anchoring:** keep ONE camera-locked group anchored to the SECTION rect (`[data-lattice-anchor]`). REVERT the isotropic scale back to rect-mapped `group.scale.set(w·k, h·k, zScale)` (with `zScale ≈ h·k`, a named constant `NEURAL_DEPTH_SCALE`), because hubs now map to actual card screen positions. No squish problem now — the content is 3 compact hubs + arcs, not a full-rect cloud.
- **Measure 3 card centers:** on `measureVersion` bumps, in addition to the section rect, measure the 3 `[data-lattice-node]` centers and convert each to the group's LOCAL space: `localX_i = (cardCx_i - sectionCx)/w`, `localY_i = (sectionCy - cardCy_i)/h`, `z=0`. Pass the 3 local positions as **uniforms** `uHub0/1/2` (vec3). On resize just update these uniforms — NO buffer rebuild (responsive & cheap). Fallback to sensible defaults (evenly spread) if a node anchor is missing.
- **Topology (uniform-driven, ~3 hubs):** particle `meta` encodes role (node/flow), hub index (node) or (fromHub,toHub) pair (flow), base phase, jitter seed. Compute kernel builds homes from the `uHub*` uniforms: node home = `uHub[idx] + smallJitter` (compact dense sphere, jitter ≈0.035 in local units → a clear glowing orb); flow home = quadratic Bézier(`uHubFrom`,`uHubTo`, control = midpoint + Z-bow `NEURAL_ARC_BOW` toward camera) at `t = fract(basePhase + uTime*FLOW_SPEED)`. Wire arcs: 0→1, 1→2, and 0→2 (a triangle) so all 3 hubs connect; for a row layout this reads as a connected chain+span.
- **Counts:** `NEURAL_PARTICLE_COUNT` ≈ **9000**; ~55% node (dense bright hubs, ~3000 per... distribute evenly across 3 hubs), ~45% flow (arcs + signal). Hubs must read as 3 distinct bright orbs; arcs as thin streams with the travelling signal (keep the v3 `signalBrightness`).
- **Hover ignition (`uHovered` int uniform, -1..2 from `store.hovered[surface]`):** the hovered hub flares (emissive ×~1.8, radius pulse, its incident arcs' signal speed/brightness ×up and converges toward it); non-hovered hubs dim (~×0.5) and arcs quiet. Smooth the transition (damp a per-hub `glow` toward target). In healthy mode keep the existing sequential `uPulse` wave as the resting animation; in broken mode the resting look is fractured/dim with the dispersal cue on the dead arcs, but hover still flares the hovered hub + opens its card.
- **Parallax/life:** drop the big free tumble (hubs are layout-pinned). Keep subtle: each hub has gentle internal shimmer + the whole group does a small damped pointer parallax (±0.06 rad) and a faint z breathe. Arcs bow in depth so 3D reads.
- Keep render material (additive, emissive>1, cyan→violet by depth/role, alpha floor), bloom, `.toAttribute().xyz`, backend guard, static fallback, debug telemetry (add `uHovered`, hub local positions).

### Responsive
- Hubs follow card centers (re-measured on measureVersion/resize → uniforms). On narrow viewports the cards reflow (stack) and hubs follow automatically. Ensure `measureVersion` bumps on resize (it already does for the rect). Touch devices: tap toggles the card + sets hovered.

### STRONG 3D (user: "devono essere 3d") — non-negotiable, the nodes must read as 3D
The hubs are layout-pinned (no free tumble), so manufacture unmistakable depth:
- **Hub orbs are true 3D volumes:** distribute each hub's node particles in a SPHERE (3D, real z), not a flat disc. Each orb rotates slowly on its own axis so near/far particles parallax → obvious volume.
- **Z-layer the 3 hubs:** give them distinct depths via `uHub*.z` (e.g. hub0 z≈−0.18, hub1 z≈+0.12, hub2 z≈−0.06 in local units, or derive from card order) so the network has front-to-back layering, reinforced by perspective.
- **Arcs bow through depth:** `NEURAL_ARC_BOW` pulls each arc's Bézier control toward the camera (and the hubs' differing z makes arcs clearly 3D curves, not flat lines).
- **Pointer parallax + faint auto-tilt:** the whole group does a damped pointer parallax (±0.10 rad yaw/pitch) plus a small continuous auto-orbit (±0.06 rad) so the depth layering is always legible in motion. (Subtle — hubs stay registered to their cards within the parallax.)
- Depth fog/size-attenuation: nearer particles slightly larger/brighter, farther dimmer → aerial depth cue.

### Cards: ONE unified style matching the 3D neural aesthetic (user: "dello stesso stile le card")
Both sections' cards (Problem failures + ProductionGrade artifacts) must share a SINGLE consistent visual style, coherent with the particle network — NOT the old terminal/file look. Prefer a shared presentational card (e.g. a `NeuralCard` component or shared classes) used by both sections; keep each section's frozen copy.
- **Look:** dark translucent navy glass panel (subtle backdrop-blur), thin **cyan→violet gradient hairline border** + soft outer glow that intensifies on hover/focus; generous negative space; JetBrains Mono eyebrow (`01 · …`), Editorial/Switzer title; the card's number/orb visually ties to its WebGL hub (the hub orb sits behind the card's leading edge so card+node read as one element).
- **State:** compact (eyebrow + title) → expanded (+ body) on hover/focus, smooth (GSAP/CSS, reduced-motion-safe), `aria-expanded`, focusable, copy always in DOM.
- **Consistency:** identical card chrome/spacing/typography/animation across both sections; only the copy and the broken-vs-healthy accent treatment differ (broken: a faint fracture/desaturated cue on the resting node; healthy: calm cyan→violet). Remove the old terminal-flavored chrome (macOS dots, file-name labels, radar/scan) if any remains in these two card blocks.

### Keep the SVG fallback working
- `neural-graph-fallback.tsx` + `buildLatticeLayout` untouched. The fallback already carries the reduced-motion/no-WebGPU visual. (Optional later: make the fallback also reflect 3 nodes — NOT required now.)

## Verification (the implementer runs)

- `npx tsc --noEmit` clean (no new errors touching neural*/NeuralLattice).
- Respect every gotcha above (esp. `.toAttribute().xyz`, backend guard, lazy import, delta clamp, write `uPulse.array`).
- Do NOT git commit (main session drives commit). Report what was built + any deviations. Main session will do live Chrome QA (WebGPU) on the Problem + ProductionGrade sections and iterate on the look.
