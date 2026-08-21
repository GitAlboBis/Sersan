All sources verified. Composing the final spec.

# IGLOO SECTION-CUT â†’ SERSAN HOME: VERIFIED MATH + TRANSPLANT SPEC

Sources verified against `igloo-app3d.pretty.js` (line refs) + mining doc `2026-08-21-igloo-tunnel-mining.md` (Â§1/Â§2 confirmed, 2 corrections, 1 major extension).

## A. Verified composite-pass math (f3, L32335â€“32531)

**Corrections to mining doc Â§1** (everything else confirmed verbatim):
- L32450: ice-cut margins are **swapped** in the doc. Actual: `cutDiagonal = falloff(vUv.y + inclination*|slope|, 0., 1., 0.2, incProgress)` then `cut = falloff(scrollTex.r, 0., 1., 2.0, cutDiagonal)` â€” tight 0.2 band on the diagonal, wide 2.0 dissolve through the texture (that wide margin is what makes the edge read "ice" instead of a threshold line).
- L32437: `slope = -0.2 * aspect * step(0.0, uProgress)` (step factor omitted in doc; inert since branch requires uProgress>0). Final mix is clamped: `clamp(mix(scene1,scene2,cut),0,1)` (L32465).

**Confirmed:** three-margin cascade (CA halo 2.0 / tech-disp 0.9â†’1.0 / cut 0.2â†’2.0), `slopeDisp=(scrollTex.b*2âˆ’1)*0.4`, `parallaxY=0.4` with `power2In(uProgress)` down-push on outgoing / `power2In(1âˆ’uProgress)` up-push on incoming, `displacement=0.025*cutDisp`, 5-tap spectral CA (L32308-12: `ca_barrelDistortion(uv,amt)=uv+ccÂ·dot(cc,cc)Â·amt`, spectrum weights gamma 1/2.2), edge modulator `12Â·smoothstep(1,.7,|uv*2âˆ’1|)` both axes, blue-noise (`getNoise(tBlue, gl_FragCoord.xy, uBlueOffset)`, offset re-randomized every frame `(rand*10, rand*12.5)` L32529) multiplying CA bend per scene. `uProgressVel` uploaded but unused; velocity slope commented out (L32421-26). tScroll channels: **r** = ice-cut field, **g** = square/block "tech" field, **b** = low-freq slope wobble.

**Â§A-EXT â€” uProgress derivation (the mapping window, L44641â€“44702):** scenes are stacked scroll-units (`__top/__bottom`, `total = Î£height`); the viewport is exactly **1 unit** tall. Per frame: `n = wrap(scroll.y)` = screen TOP, `a = wrap(n+1)` = screen BOTTOM. Scene containing `n` â†’ `o` â†’ `tScene1` (outgoing); scene containing `a` â†’ `l` â†’ `tScene2` (incoming); **`uProgress = c = a âˆ’ incoming.__top`** (L44667, L44671). So:
- Wipe **starts** the instant a scene boundary enters at the viewport BOTTOM (uProgressâ†’0âº) and **ends** when it exits the TOP (uProgressâ†’1): active over **exactly one viewport-height of scroll**, fully scrubbable both directions.
- Scrub source is the smoothed value: `targetY1=lerpFPSLimited(Â·,Â·,.075,100Â·mult); y=lerpFPS(y,targetY1,.15)`; velocity accumulator `+=|Î”y|, Ã—frictionFPS(.98)`, clamp 0..1 (L44645-47).
- Per-scene progress = `(yBottom âˆ’ top)/(height+1)` â€” the +1 keeps the scene animating while it slides off during the wipe.
- **Never rests mid-cut**: after 1.4 s idle with `c%1â‰ 0`, autoCenter tweens scroll to the nearest boundary alignment, base duration 2 s, ease `inOut3` (L44671â€“44700, `centerScroll` L44704).
- When no boundary is on screen, `c=0` â†’ shader takes the flat `texture2D(tScene1,vUv)` branch: **idle cost â‰ˆ one fetch**.

## B. Burst + block glitch (DF L41924â€“42031; envelope L42292â€“42332) â€” verified, extended

Shader confirmed as quoted in doc Â§2, with extensions: `const float bluramount = 0.3` scales the angular smear; block glitch is `dispSquares = tex(tScroll, newUv1*1.5 + uSquareAttr.rg).g*2âˆ’1; newUv1 += dispSquares * 0.01 * uSquareAttr.b * uRingProximity` (L42001-02); the HSV lift (`sat+0.05Â·prox, val+0.075Â·prox`) is guarded `if(length(scene)<length(vec3(1.)))` â€” highlight only when not already white (L42008-13); additive corner glare `pow(vUv.x*vUv.y,2)Â·(sinenoise+.4)Â·vec3(.8,.9,1)Â·noise.bÂ·2` runs unconditionally.

**Envelope semantics (doc refinement):** the timeline is **scrubbed, not played** â€” `this.timeline.progress(this.progress)` per frame (L42335). Bursts keyed at timeline-times 2 / 2.95 / 3.8: each `uRingProximity` 0â†’1 (0.5 `power1.in`) then 1â†’0 (0.4â€“0.6 `power1.out`); fresh seed per burst via `s(n,r)` (L42292-94): `uSquareAttr.set(randÂ·25.424, randÂ·64.453, intensity)` where intensity = **1.0 default and always on reverse scrub, 0.5** for the later forward bursts (`s([!0])`/`s([!1,.5])`). Pre-warmed via `progress(1); progress(0)`.

**Datamosh/pixel-sort: none exists in the bundle** (no sort/mosh pass anywhere). The project-detail carousel transition is the `uDetailProgress` branch of the SAME composite f3 (L32469â€“32517): frost displacement `tex(tFrost, uvC*5*(1âˆ’p)).r*2âˆ’1` amp **0.1** (both axes), tech block displacement `tex(tScroll, uvC*0.1).g*2âˆ’1` amp **0.005** x-only, CA modulator 8, crossfade `transition=fit(p,0.4,1.0,0,1)`. Choreography (L44741â€“44786): open `uDetailProgress` 1.25 s `power3.in` + `uDetailProgress2` delayed +0.75 s, 1.25 s `sine.out`; close 1.25 s / 0.6 s `power2.out`. The "glitch" everywhere = **the g-channel squares texture used as displacement**, never a sort.

## C. TRANSPLANT SPEC â€” SERSAN home section cuts

Reality: one DOM page, persistent canvas **behind** the DOM, single scene, TSL PostFXNodes (WebGPU + WebGL2 fallback), **no second RT** â€” so Igloo's two-scene `mix(scene1,scene2,cut)` is unreachable. What we can steal: the falloff-band geometry, the three-margin cascade, per-side CA + push, the block displacement, the HSV lift, and the scrub-window mapping.

**Options:** (a) *self-wipe* â€” full Igloo band on the single composite; the parallaxY push samples the same scene both sides â†’ visible self-doubling; DOM text doesn't move with it, so pushes must stay tiny, killing most of the drama. (b) *burst-only* â€” generalize existing `uWarpBurst` (PostFXNodes.tsx L404-494 already ships the angular smear + squares + HSV lift behind a real `If`) fired at boundary crossings: cheap, but a radial event, not a directional cut. (c) **hybrid â€” RECOMMENDED**: a scrubbed diagonal **seam-sweep band** (Igloo's cut geometry, applied as darkening + CA + block displacement instead of a scene mix) + the existing burst as a velocity-scaled spike at the crossing instant.

**GL half (PostFXNodes, new `If(uWipe>0.001)` block before the burst block):**

| uniform | type | write cadence | value |
|---|---|---|---|
| `uWipe` | float | only while a boundary is in window, else set 0 once | scrubbed 0â†’1 |
| `uWipeSlope` | float | on resize | `-0.2 * aspect` |
| `uWipeSeed` | vec2 | once per boundary entry | `hash(i)Â·25.424, hash(i)Â·64.453` |
| `uWipeDir` | float | on direction flip | `sectionStore.direction` (Â±1) |

CPU (inside the existing single useFrame consumer, no new loop): boundaries `cutáµ¢ = (spans[i].end + spans[i+1].start)/2` from sectionStore (doc fractions, re-derived on `measureVersion` bump); half-window `h = 0.5Â·innerHeight/scrollHeight` (= Igloo's one-viewport span); `uWipe = clamp((lenisProgress âˆ’ cutáµ¢ + h)/(2h), 0, 1)` for the nearest boundary, **0 when |pâˆ’cutáµ¢| > h** â€” idle cost ~0 (guard skips all texture math; pattern already proven at L399-417).

Fragment math (port of Â§A with mixâ†’modulation): `inclination = mix(1âˆ’uv.x+wob, uv.x+wob, step(slope,0))` with `wob = (vnoise(uvÂ·2)Â·2âˆ’1)Â·0.4` (procedural replaces tScroll.b); `incP = fit(uWipe,0,1,0,1+|slope|)`; `diag = uv.y + inclinationÂ·|slope|`; **fields:** `haloB = falloff(diag,0,1,2.0,incP)`; `dispB = falloff(vnoiseBlocks(uvÂ·vec2(24,14)+uWipeSeed),0,1,1.0, falloff(diag,0,1,0.9,incP))`; `core = falloff(vnoiseIce(uvÂ·3),0,1,2.0, falloff(diag,0,1,0.2,incP))`. **Apply:** uv-shove `uv += vec2(0, uWipeDirÂ·0.012Â·dispB) + vec2(0.006Â·(dispBÂ·2âˆ’1), 0)` (Igloo 0.025 halved â€” self-sampling); CA bend `= haloBÂ·(1âˆ’haloB)Â·4Â·noise` (band-limited, zero at both ends so entry/exit are seamless); darkening `color *= 1 âˆ’ 0.30Â·coreÂ·(1âˆ’core)Â·4`; leading-edge lift: HSV `val += 0.075Â·edge`, `sat += 0.05Â·edge` where `edge = smoothstep(.35,.5,core)Â·smoothstep(.65,.5,core)` (reuses the burst's existing rgb2hsv path). Blue noise â†’ existing per-frame hash noise. NO parallaxY (the one Igloo term that needs two scenes).

**Spike:** on `sectionStore.pulse` firing (arrival, already wired), add `uWarpBurst = min(1, 0.35 + 0.65Â·scrollVelocity)` decaying with the existing envelope, reseed `uBurstSeedX/Y` per crossing (Igloo's `s()` semantics: full intensity on upward scroll, 0.5 forward). This is what makes fast flicks feel "warp".

**CSS half (sells the cut on content the GL can't touch):** scoped, pulse-driven, â‰¤150 ms â€” never scrubbed layout. On crossing (same pulse event): add `.cut-tick` to the two adjacent `<section>`s for 140 ms â†’ headings only: `text-shadow: 1px 0 rgba(59,225,255,.35), -1px 0 rgba(124,92,255,.30); transform: translateY(calc(var(--cut-dir)Â·2px)) skewX(0.2deg)`, removed on timeout (compositor-only props; **no `filter`/`clip-path` on large containers** â€” paint storms). Optional scrubbed counterpart: `--cut` CSS var (0..1, written only while `uWipe` active) driving a 1px `border-image`-free gradient rule element between sections. Reduced motion: tier "off" already drops postFX entirely; wrap `.cut-tick` rules in `@media (prefers-reduced-motion: no-preference)`. Tier "lite": keep `uWipe` darkening+CA, drop block displacement (one noise fetch fewer); spike disabled.

| param | value | source |
|---|---|---|
| window span | 1 viewport of scroll, centered on boundary | L44667 |
| slope | âˆ’0.2Â·aspect | L32437 |
| margins halo/disp/core | 2.0 / 0.9â†’1.0 / 0.2â†’2.0 | L32442-50 |
| shove amp | 0.012 (Igloo 0.025) | L32454 |
| darkening | 0.30 peak, band-limited | new (replaces scene mix) |
| HSV lift | +0.075 val / +0.05 sat | L42010-11 |
| spike env | 0.5 s power1.in / 0.4 s power1.out, scrubbed | L42296-2332 |
| seeds | hashÂ·25.424 / Â·64.453, 1.0 up / 0.5 down-forward | L42292-94 |
| rest snap | optional: Lenis scrollTo nearest boundary after 1.4 s idle mid-band, 2 s inOut3 | L44671/44704 (recommend ship WITHOUT first â€” DOM page, native scroll expectations) |

Files: `C:\Users\alber\Desktop\sersan-v2-main\src\webgl\PostFXNodes.tsx` (uWipe block + spike generalization), `src\webgl\store\sectionStore.ts` (boundary list derivation), the useFrame consumer that already writes `uWarpBurst`, plus a ~20-line CSS module for `.cut-tick`.