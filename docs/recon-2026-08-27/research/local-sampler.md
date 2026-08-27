# local-sampler — `sampleImagePoints.ts` teardown and the root cause of the empty bright-skin patches

Sources read in full (all paths under `C:/Users/alber/Desktop/Sersan`):

- `src/webgl/image/sampleImagePoints.ts` (470 lines, **no imports** — pure DOM canvas + TypedArrays)
- `src/webgl/FounderPortraitMorph.tsx` lines 1–260, 455–520, 600–790, 835–870, 1100–1160 (the only caller; owns every knob value)
- `src/webgl/gpgpu/gpgpuNodeSim.ts` lines 492–497, 1101–1116, 1208–1311, 1540–1660, 1740–1990 (how `ink` becomes disc size / alpha on the GPU)
- `HANDOFF_FOUNDER_MORPH.md` (contracts 1, 2, 11, 12; "Aperto §2")
- `.trellis/tasks/06-06-…/research/portrait-calibration/sampler_port.py` (the team's own offline port; confirms the maths)
- Shipped headshots `public/founders/{alessandro,michele,alberto,mattia}-headshot.webp` — all 1200×1800 RGB; measured offline with my own port (`scratchpad/local-sampler/measure.py`, diagnostic PNGs next to it). NOTE: `alberto-headshot.webp` is still the PLACEHOLDER monogram card (memory + `MAX_COUNT_BY_TIER` comment, `FounderPortraitMorph.tsx:137-138`), so its numbers are quoted but not relied on.

The reference the file cites, `brunoimbrizi/interactive-particles` (`.refs/interactive-particles`), is **not present on disk** (`ls .refs` → "No such file or directory"). It is the well-known Codrops demo "Interactive Particles with Three.js" (https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/, repo https://github.com/brunoimbrizi/interactive-particles) — the `psize *= max(grey, 0.2)` quoted at `sampleImagePoints.ts:21` is that repo's `particle.vert`. I did not re-fetch it (task scope was the local file); the synthesis agent should treat that as the lineage: **this sampler is a port of a 2-D "brightness → point size" halftone**, not of a 3-D point-cloud technique.

---

## 1. Pipeline overview (what the file actually does)

```
image (1200×1800) ──cover-crop to 290:405──▶ canvas 290×405 (drawImage downscale)
   ▶ per-cell r,g,b (sRGB 0..1), lum (Rec.601 of sRGB)                     [L224-233]
   ▶ backdrop colour = per-channel MEDIAN of two 14×14 TOP-corner patches    [L235-257]
   ▶ dist[i] = sqrt(.299·dr² + .587·dg² + .114·db²)  (luma-weighted RGB distance from backdrop) [L259-266]
   ▶ bgMask = border-seeded flood fill over {dist < 0.055}, seeds = top row + side columns above y<0.62·H, may not step below row 0.62·H [L268-311]
   ▶ ink[i] = 0 if bgMask, else pow(clamp((dist·inkGain − inkFloor)/(1−inkFloor)), inkGamma) · fade(y) [L313-340]
   ▶ UNION over all N portraits of {ink > inkCut} → shared cell list (same index j in every image) [L437-451]
   ▶ uniform integer stride if union > maxCount [L453-459]
   ▶ emit(): xy (+ hashed sub-cell jitter), rgb (sRGB→linear), z = (lum−0.5)·depth + bulge, ink, halfExtent [L345-403]
```

There is **no radial weight in the sampler any more**. The only radial term left is the `centerZBias` bulge in `emit()` (`L380-385`), and the caller sets it to `0` (`FounderPortraitMorph.tsx:238`). The header comment at `L27-31` says the "old radial-sector sort" was retired. So "radial weights" in the task prompt refer to a previous generation; today: none.

There is **no randomness** in the sampler (`L18-19`): "no rng anywhere (the sampler is fully deterministic — there is no seed)". The only pseudo-random term is the `hash01` sub-cell jitter (`L152-155`, `L368-370`), amplitude `JITTER = 0.9` cell (`L127`), keyed by cell index so every portrait jitters identically.

---

## 2. The grid and the cell → particle mapping

- Grid is `gridW × gridH = 290 × 405` (`FounderPortraitMorph.tsx:206-207`, "5:7 portrait"), 117,450 cells; on the touch island it is scaled by `TOUCH_GRID_SCALE = 0.58` (`:190`) → 168×235.
- Cover-crop (`L195-209`): the 2:3 source (0.667) is narrower than the 290/405 grid (0.716) so `cropW = srcW = 1200`, `cropH = 1200/0.716 = 1676`, `sy = 62` — 62 px are trimmed top and bottom, nothing horizontally. One `ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, gridW, gridH)` does the ~4.1× downscale; the ink is therefore computed on the browser's bilinear-filtered downsample (the team measured ~7 % cell-count difference vs PIL BOX — `sampler_port.py` docstring, `FounderPortraitMorph.tsx:149-155`).
- **One particle per kept cell**, `L17-19`. Cell `i` (row-major, `i = y·gridW + x`) becomes particle `j` only if it is in the shared union list `cells[j] = hits[j·stride]` (`L459`). Particle position (`L366-372`):
  ```ts
  const gx = i % gridW; const gy = (i / gridW) | 0;
  const jx = (hash01(i * 12.9898) - 0.5) * JITTER;   // ±0.45 cell
  const jy = (hash01(i * 78.233) - 0.5) * JITTER;
  const px = gx + 0.5 + jx - cx;                     // grid px from centre
  const py = -(gy + 0.5 + jy - cy);                  // y-up
  ```
  Output is in **grid px**; the caller maps grid → world with one uniform scale so that the largest `halfExtent` across portraits fits `STAGE_FILL = 0.92` of the `[data-founder-stage]` rect (`FounderPortraitMorph.tsx:629-635`).
- Cells that are in the union but have `ink == 0` in a given portrait are still emitted (`L80-83`, `L412-415`) and collapse to `PORTRAIT_SIZE_MIN = 0.06` of full size on the GPU (`gpgpuNodeSim.ts:1575`).
- Measured union at N=3 real headshots in-browser: **51,751 cells, stride 1**, ceiling `MAX_COUNT_BY_TIER.full = 60000` (`FounderPortraitMorph.tsx:131-136, 183`). Per portrait ~38.4–38.8 k own inked cells (`:170`). My offline port: subject cells above the fade band (mask 0, fade 1) = 20.8 k (Alessandro), 21.5 k (Michele), 23.5 k (Mattia); bgMask cells ≈ 50–53 k.

---

## 3. How `ink` is computed — every term, with the shipped values

`readGrid()` `L313-340`:

```ts
const invFloor = 1 / Math.max(1 - spec.inkFloor, 1e-4);
...
if (bgMask[i] === 1) continue;                                  // wall → ink stays 0
const v = Math.min(1, Math.max(0, (dist[i] * spec.inkGain - spec.inkFloor) * invFloor));
ink[i] = Math.pow(v, spec.inkGamma) * fade;
```

with `dist[i]` from `L261-266`:

```ts
const dr = r[i] - bgR; const dg = g[i] - bgG; const db = b[i] - bgB;
dist[i] = Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
```

So, explicitly: **ink = f(colour distance from the measured wall colour)**, where the wall is a per-channel median of the two 14×14 top-corner patches (`CORNER_PATCH = 14`, `L121`, `L238-257`). Measured wall colours (my port): Alessandro `[236,238,240]`, Michele `[238,239,241]`, Mattia `[255,255,255]` (post-wash), Alberto placeholder `[219,217,220]`.

Knobs (`FounderPortraitMorph.tsx:231-251`, `SAMPLE_SPEC_BASE`):

| knob | default | where applied | effect |
|---|---|---|---|
| `gridW/gridH` | 290 / 405 | `L184`, canvas size | sets instance count (cell area) |
| `depth` | 90 grid-px | `L383-385` | z = (lum−0.5)·90 — then **capped** by the caller to `Z_RELIEF_MAX_FRAC = 0.04` × face height (`FounderPortraitMorph.tsx:210-221, 638-648`) ⇒ effectively flat |
| `centerZBias` | **0** | `L385` | radial bulge disabled (`:235-238`: "visible rounded bulge artifact") |
| `inkGain` | 1.7 | `L336` | multiplies `dist` before the floor |
| `inkFloor` | 0.03 | `L315, L336` | `dist·1.7 < 0.03` (i.e. dist < 0.0176) → ink 0; remapped so the floor is 0 and 1 stays 1 |
| `inkGamma` | 0.62 | `L338` | `pow(v, 0.62)` — lifts mid-tones |
| `fadeStart` | 0.62 | `L320-324` | normalised y where the vertical dissolve begins |
| `fadeSpan` | 0.32 | `L322` | dissolve completes at y = 0.94; smoothstep `f²(3−2f)` |
| `inkCut` | 0.03 | `L448` | union threshold: a cell joins if `max_k ink_k > 0.03` |
| `extentInk` | 0.15 | `L389` | cells with ink > 0.15 define the 99th-percentile half extent used for the world fit |
| `maxCount` | 60000 full / 20000 lite | `L455-457` | integer stride ceiling |
| `BG_FILL_TOL` | 0.055 | `L139, L292` | flood-fill admission: `dist < 0.055` |
| `BG_FILL_ROW_LIMIT` | 0.62 | `L141, L288, L299, L310` | fill may not descend below row 0.62·H (shirt/wall separation) |
| `JITTER` | 0.9 cell | `L127, L369-370` | sub-cell jitter |
| `FACE_CY`, `BULGE_RADIUS` | 0.44, 0.75 | `L123, L125, L381-382` | bulge geometry (inert because `centerZBias = 0`) |

`lumFloor` (from the task prompt) **does not exist** in the current file. The nearest ancestors are the retired `lumCeil`/`neutralSat` and `inkGateLo`/`inkGateHi` gates, which the comments at `L10-12`, `L269-277` and `FounderPortraitMorph.tsx:239-243` explicitly forbid re-introducing.

Closed-form ink vs distance with the shipped curve (`measure.py` output):

| dist from wall | ink | disc diameter (× lattice spacing) | painted area of the cell |
|---|---|---|---|
| 0.020 | 0.033 | 0.18 | ~3 % |
| 0.030 | 0.093 | 0.29 | ~9 % |
| 0.040 | 0.134 | 0.37 | ~14 % |
| **0.055 (= BG_FILL_TOL)** | **0.184** | **0.47** | **~22 %** |
| 0.080 | 0.253 | 0.60 | ~36 % |
| 0.100 | 0.301 | 0.69 | ~47 % |
| 0.150 | 0.404 | 0.88 | ~77 % |
| 0.200 | 0.493 | 1.05 | 100 % (touching) |
| 0.300 | 0.647 | 1.34 | overlapping |
| 0.500 | 0.901 | 1.81 | overlapping |

(disc diameter = `2·spacingDev·(0.06 + 0.94·ink)` — see §5.)

---

## 4. The flood-fill backdrop mask

`L268-311`. Seeds: the whole top row and both side columns for rows `1 … floor(0.62·405)=251`. 4-neighbour fill, explicit `Int32Array` stack, admission `bgMask[i]===0 && dist[i] < 0.055`, and the downward step is refused when `y+1 >= rowLimit` (`L310`). Rationale (`L269-284`): the wall is the region **connected to the image border**; the scalp and the white shirt are enclosed and cannot be reached without crossing an edge wider than 0.055; the shirt touches the bottom border so the fill may not go below the shoulders (the fade band takes over there).

**The mask works.** My rendered `michele_bgmask.png` is a clean head-and-shoulders silhouette; there is no hole in the scalp, the ears, the forehead or the cheeks. The flood fill is doing exactly what its comment promises: it *keeps* the lit scalp as subject. The still-open item in `HANDOFF_FOUNDER_MORPH.md` "Aperto §2" (12.1 % of kept cells are wall/shirt halo in the shoulder band, 4,446 cells on Alessandro) is about *residual wall around the shoulders below the row limit*, not about holes in the face.

---

## 5. What the GPU does with `ink` (why "small ink" = "empty patch")

`FounderPortraitMorph.tsx:766-772` passes `sizeA..D: pts[k].ink`; `gpgpuNodeSim.ts:1270-1279` packs `(r,g,b,ink)` into one `"vec4"` `instancedArray` per target, and:

- Disc size (`gpgpuNodeSim.ts:1774-1782` `sizeNode`, mirrored at `:1624-1632`):
  ```ts
  uPointSize · uPixelRatio · (PORTRAIT_SIZE_MIN + PORTRAIT_SIZE_INK·inkNow) · (0.85 + 0.3·rand) · sizeFD / dist
  //             PORTRAIT_SIZE_MIN = 0.06, PORTRAIT_SIZE_INK = 0.94   (:1575, :1578)
  ```
  `defPointSize` is chosen so a **full-ink** disc is `2.1 × spacingDev` (`FounderPortraitMorph.tsx:707-729`: "at the face's high ink the discs land at ~1.7× spacing and touch (continuous tone), while the faint fringe shrinks below 1× and stays sparse"). The comment at `gpgpuNodeSim.ts:1590-1592` gives the shipped absolute: "full-ink face discs (~8.4 devpx ≈ 2× spacing)" ⇒ `spacingDev ≈ 4.2 devpx`.
- Alpha (`:1919-1963`): `alpha = disc(smoothstep(0.5,0.34,rr)) · POINT_ALPHA · uFade · assemble · smoothstep(0, 0.1, ink) · cov²`, `cov = clamp(diameterPx / max(1.25, 0.35·spacingDev), 0, 1)`; `Discard(alpha < 0.02)`.
- Colour (`:1868-1889`): `mix`-chained `tint.xyz · emissive(1.18)`; **luminance is not used anywhere in the fragment** — the pixel's own colour is painted at full strength regardless of ink. Tone therefore lives *only* in the disc diameter (and in the sub-pixel `cov²` term), exactly as the file's design statement says (`L20-22`, "TONE IS CARRIED BY PARTICLE SIZE").
- Blending normal, depth test/write **off** (`:1972-1980`, `FounderPortraitMorph.tsx:773-778`) — there is no occlusion and no lighting; the cloud is a flat billboard field.

Consequence at `spacingDev ≈ 4.2 devpx`: a cell with ink 0.18 draws a **2.0 devpx disc in a 4.2 devpx cell** (≈22 % of the cell painted, rest is the navy stage); ink 0.09 → 1.2 devpx, already under `PORTRAIT_COV_MIN_PX` (1.47) so `cov² ≈ 0.67` also dims it; ink < 0.018 is discarded outright (`:1947-1960`).

---

## 6. CENTRAL QUESTION — why bright skin (scalp, forehead, cheeks) is sparse / empty

### 6.1 The mechanism in one sentence

The backdrop was removed **spatially** (flood fill), but the **ink curve is still chromatic**: `ink = g(dist-from-wall)`. Against a white, neutral wall, "distance from the wall" is numerically the same thing as **"darkness"**, so the curve is an inverted halftone screen: dark pixels → big discs, bright pixels → tiny discs. The flood fill saves the lit scalp from *deletion* and then the ink curve *starves* it anyway.

### 6.2 Evidence

(a) **Ink is darkness.** Over the subject cells of each real headshot, `corr(ink, 1−lum)` = **+0.948 (Alessandro), +0.952 (Michele), +0.886 (Mattia)**. The diagnostic `michele_ink.png` is the photographic *negative* of the headshot: beard and brows white (ink 1), scalp/forehead/cheeks grey-to-black.

(b) **Per-luminance-band ink (subject cells only, above the fade band), shipped curve:**

| lum band | Alessandro ink mean → disc/spacing | Michele ink mean → disc/spacing | Mattia |
|---|---|---|---|
| < 0.30 (hair, beard, brows) | 1.000 → 2.00 | 1.000 → 2.00 | 1.000 → 2.00 |
| 0.60–0.72 (mid skin) | 0.625 → 1.30 | 0.619 → 1.28 | 0.711 → 1.46 |
| 0.72–0.80 (lit skin) | 0.463 → **0.99** | 0.468 → **1.00** | 0.570 → 1.19 |
| 0.80–0.88 (lit cheek/forehead) | 0.339 → **0.76** (37 % of cells < 0.7 sp) | 0.339 → **0.76** (25 % < 0.7 sp) | 0.445 → 0.96 |
| 0.88–1.0 (scalp highlight, wall-coloured skin) | **0.079 → 0.27** (100 % < 0.5 sp) | **0.016 → 0.15** (99.8 % < 0.5 sp, median ink 0.000) | 0.179 → 0.46 (55 % < 0.5 sp) |

Michele's brightest skin band (592 cells) has **median ink 0.000** — those cells exist in the cloud but draw a 0.06-size disc that the `Discard` at `gpgpuNodeSim.ts:1960` removes. That band *is* the bald-scalp highlight in the owner's screenshot.

(c) **Why the wall colour and the skin collide numerically.** Bright skin cells (lum > 0.8): mean chroma (max−min channel) 0.11–0.14, mean `dist` from the wall **0.092–0.108**, and mean (wall lum − pixel lum) 0.08–0.11. I.e. a lit cheek is only ~0.1 away from the wall in the luma-weighted metric; the same metric puts a beard at ~0.7. The curve `((dist·1.7−0.03)/0.97)^0.62` maps 0.1 → 0.30 and 0.7 → 1.0. Nothing in the curve knows that the 0.1-cell is *inside the silhouette*.

(d) **The flood fill guarantees a starved population.** Any subject cell with `dist < BG_FILL_TOL = 0.055` is, by construction, "saved" by the mask (it is enclosed) — and by the same construction its ink is capped at `ink(0.055) = 0.184` → a 0.47-spacing disc, ≤22 % of the cell painted. Count of such cells: Alessandro 505, Michele 577, Mattia 624 (2.4–2.7 % of subject), and on the placeholder Alberto 1,898 (13.7 %). Widening `BG_FILL_TOL` would not help; it does not touch the curve.

(e) **Where the low-ink subject cells are.** Histogram of subject cells with ink < 0.2 by normalised y: Michele `[0, 1, 2, 1, 7, 201]`, Alessandro `[0, 5, 5, 4, 7, 179]` — almost all in the 0.5–0.62 band, i.e. the **neck/shirt-collar just above the fade band** (white shirt ≈ wall, `HANDOFF` contract 12: "camicie bianche … stanno a ink ≈ 0.03"). So besides the scalp highlight, the second empty region is the throat/collar, which renders as a void between head and shoulders (visible in both simulated renders).

(f) **Simulated renders** (`scratchpad/local-sampler/{michele,alessandro}_simrender.png`, one disc per cell with the exact size/alpha formulas of §5): they reproduce the owner's screenshot — Michele's forehead/scalp is a pale dotted patch, Alessandro's lit right cheek and temple degrade into a sparse dot field, the collar is missing, the whole thing reads as a halftone print on navy.

### 6.3 Why the earlier fixes could not fix it

- `lumCeil`/`neutralSat`, `inkGateLo/Hi` (removed) were *thresholds on the same chromatic axis* — they cut a hole; removing them left the *continuous* version of the same starvation (`L10-12`, `L329-332` admit the mid-band was being dimmed).
- `inkGamma 0.62` and `inkGain 1.7` only reshape `g(dist)`; they cannot invert the sign of the correlation. Raising gain pushes the collar/shirt and residual wall halo (`HANDOFF` Aperto §2) up together with the scalp.
- `PORTRAIT_SIZE_MIN = 0.06` was deliberately made near-zero (`gpgpuNodeSim.ts:1570-1575`) so that union cells belonging to *another* portrait vanish — which is correct for those cells, but it means the *only* thing that can keep a lit-skin cell visible is ink, and ink is what is failing.

---

## 7. What would make coverage UNIFORM inside the subject mask

All of these are changes in `readGrid()`/`emit()` plus the two size/alpha expressions in `gpgpuNodeSim.ts`; nothing else in the pipeline (shared grid, union list, morph pairing, packing) needs to change.

1. **Ink = mask membership, not distance.** Replace `L333-338` with
   ```ts
   if (bgMask[i] === 1) continue;
   ink[i] = fade;                              // 1.0 everywhere inside the silhouette
   ```
   (optionally × a soft edge: `min(1, dist[i] / EDGE_TOL)` with `EDGE_TOL ≈ 0.12` so the silhouette boundary cells feather rather than clip). This alone gives every subject cell a full 2×-spacing disc: continuous coverage, no scalp/cheek/collar voids. The union stays a union; `inkCut` still works (it now separates "in some silhouette" from "in none"). The 48 % ghost-fringe population the `PORTRAIT_SIZE_MIN` comment worries about is unaffected because those cells still have ink 0 in the portraits where they are wall.
   Caveat, from `L279-284` and `HANDOFF` Aperto §2: the fill is blocked below row 0.62, so below that the "mask" is *everything* — the fade band (0.62–0.94) must remain the thing that removes the lower wall, or a second (dilated / wider-tolerance) fill pass seeded from already-wall cells is needed for the shoulder halo. That is already the documented next step and it is mask work, not curve work.

2. **Carry tone in colour/brightness, not in size.** The fragment already paints the pixel's linear rgb (`gpgpuNodeSim.ts:1868-1889`). With uniform ink, tone is *automatically* carried by that colour (bright skin → bright disc, beard → dark disc), which is what a photograph is. If more "point-cloud" contrast is wanted, multiply by a lum-derived term (`lum` is already computed per cell at `L232` and could be exported — see §8) e.g. `col *= mix(0.55, 1.25, lum)` or use `lum` to modulate an additive rim/glow instead of the disc radius. The `sizeNode` would then use a **constant** `(0.06 + 0.94·1.0)` for every subject cell, or a *narrow* size range (say 0.8–1.0) keyed to lum so dark cells are only slightly smaller — never below the ~1.0-spacing touching diameter.

3. **If size modulation by tone is kept at all, invert its sign for a dark stage.** The Codrops reference (`psize *= max(grey, 0.2)`) shrinks *dark* points on a *dark* background — it hides the void by making the void's own colour. This file "inverts it for a light backdrop" (`L21-22`) — but the render stage is `#0B1422`, not the white wall, so the inversion punches holes in exactly the pixels the eye reads as the face's form (highlights). Minimum defensible floor if kept: `SIZE_MIN` for *subject* cells ≥ 0.5 (touching), with the 0.06 collapse reserved for `bgMask` cells only — i.e. two floors, selected by mask membership, which again requires mask-driven ink or a separate per-cell mask bit (fits in `tint.w` as a sign/bit, see §8).

4. **Remove the residual chromatic gates** that compound the effect: the alpha knee `smoothstep(0, 0.1, vInkF)` (`:1938`) and `Discard(alpha < 0.02)` (`:1960`) are harmless once ink is ~1 inside the silhouette, but the `cov²` sub-pixel compensation would then only ever engage on the feathered edge, which is its intended job.

Expected effect, quantified from the tables above: the ~7–10 % of bright subject cells currently under 0.15 ink and the 100 % of lum > 0.88 cells drawn at < 0.5 spacing all go to full coverage; the collar/throat band (~180–450 cells per portrait) reappears. The `michele_uniform_alt.png` diagnostic (every non-mask cell drawn at 1.1×spacing with its own colour) shows the face reading as a solid photographic bust with no patches — and, expectedly, the lower wall still present because that render ignores the fade band.

---

## 8. Per-cell data available, and adding a depth channel

Computed inside `readGrid` for **every** cell (117,450): `r, g, b` (sRGB 0..1, `L229-231`), `lum` (Rec.601 luma of sRGB, `L232`), `dist` (luma-weighted RGB distance from the wall, `L265`), `bgMask` (0/1, `L287`), `fade` (per row, `L320-324`), `ink` (`L338`). Only `r,g,b,lum,ink` leave the function (`GridRead`, `L167-173`); `dist` and `bgMask` are discarded — trivially exportable.

Emitted per particle (`PortraitPoints`, `L84-100`): `xy` (grid px), `rgb` (**linear**, `L375-377`), `z` (grid px), `ink`, plus `halfExtentX/Y`. Not emitted but one line away: `lum`, `bgMask`, `dist`.

GPU packing: per target one `"vec4"` `instancedArray` = `(r, g, b, ink)` (`gpgpuNodeSim.ts:1270-1279`, read via `.element(instanceIndex)` so it costs **one binding, not a vertex-buffer slot** — `:1636-1660` RENDER BINDING BUDGET, `maxVertexBuffers = 8`). Position/home buffers are `"vec3"` (`:1208-1216`). There is **no free channel** in the tint vec4 for a fifth scalar per target; a normal or a mask bit would need either a new `"vec4"` storage buffer per target (binding-budget review) or bit-packing (e.g. mask sign in `ink`, or quantised depth in `rgb` low bits) — the comments say to read that budget block before adding any buffer.

**Depth today:** `z[j] = (lum − 0.5)·depth + max(0, 1 − rad)·centerZBias` (`L383-385`) with `depth = 90`, `centerZBias = 0`, and then `zFactor` caps `max|z|` to `0.04 ×` the face height (`FounderPortraitMorph.tsx:638-648`) because a luminance-derived relief tears every luminance edge into a comb under perspective (`:210-221`, verified live: "0 = clean, 0.3 = visible tearing"). So the shipped cloud is **effectively 2-D**; the group orbit/dolly mid-morph is what gives any parallax.

**Adding a real depth channel is straightforward in this file:**
- `readGrid(image, spec)` takes one `HTMLImageElement`; add an optional `depthImage` drawn through the *identical* cover-crop `drawImage` call (`L195-209`) onto a second canvas, read its R channel as `depth01[i]`.
- In `emit()` set `z[j] = (depth01[i] − 0.5) · spec.depth` instead of `(lum − 0.5)`. The `z` slot already flows into `homeA..D` (`FounderPortraitMorph.tsx:650-657`) — **zero new GPU bindings**.
- The `Z_RELIEF_MAX_FRAC = 0.04` cap must be raised/removed for that path; the tearing argument does not apply to a *geometrically smooth* depth map (a beard/skin luminance edge has no depth discontinuity), while the silhouette edge (real depth discontinuity) should tear — that is what a point-cloud scan looks like.
- Depth source options: a monocular depth estimate of each headshot (Depth-Anything / MiDaS / Marigold) exported as 8/16-bit PNG at 1200×1800 and shipped next to `<slug>-headshot.webp`; or, for true volumetric quality, a mesh/scan of the head rendered to depth + normal maps from the same camera. Normals (for the rim glow the owner wants) can be derived from the depth gradient on the CPU in `emit()` and would need a buffer/channel per the budget note above; alternatively compute the rim term in the vertex stage from `z` and the neighbouring cell's `z` is not possible (no neighbour access) — so a normal buffer or a depth-gradient packed into a spare component is required.
- Once `z` is real, `depthTest` can be turned back on (`:1972-1980` turned it off precisely because the fake luminance relief mottled), and a rim term `pow(1 − |n·v|, k)` gives the lit-edge look; the existing HDR travel tint path (`uTravelTint`, `:1793-1795`) already feeds selective bloom.

---

## 9. One-paragraph summary for the synthesis agent

`sampleImagePoints.ts` is deterministic, one-particle-per-cell on a shared 290×405 grid, with a correct border-seeded flood fill that isolates the wall. Its defect is not sampling density or the mask: it is that the per-particle scalar that the GPU turns into disc diameter — `ink = ((dist_from_wall·1.7 − 0.03)/0.97)^0.62` — is a monotone function of colour distance from a white neutral wall, which on these photos is `+0.95` correlated with darkness. Bright skin (lum > 0.8, `dist` ≈ 0.09–0.11 from the wall) gets ink ≈ 0.02–0.34 → discs of 0.15–0.76 × the 4.2-devpx lattice pitch → 3–45 % of each cell painted, and the brightest scalp band (median ink 0.000 on Michele) is discarded by the fragment's `alpha < 0.02` cull. That is the "flat halftone with holes in the scalp/forehead/cheeks". Uniform coverage requires ink driven by **mask membership** (`ink = fade` for every non-`bgMask` cell, feathered at the edge), with tone carried by the per-particle **linear rgb / lum** that is already sampled and packed, and disc size held at ≥ touching for all subject cells. Per-cell `lum`, `dist`, `bgMask` exist but are not exported; a genuine depth channel slots into the existing `z` → `homeA..D` path with no new GPU bindings, but the caller's 4 % relief cap and depth-test-off settings must be revisited for it, and a normal/rim channel would need a new buffer against the documented 8-vertex-buffer budget.

Diagnostic artefacts: `C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-sersan/1c69a823-396b-49b0-8d9a-70aaa24ca458/scratchpad/local-sampler/` — `measure.py`, `<slug>_{grid,ink,bgmask,simrender,uniform_alt}.png` for the four headshots.
