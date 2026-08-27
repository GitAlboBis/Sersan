/**
 * NEURAL-PLEXUS particle build — the WebGL half of the 2026-08-22 ROUND-8-D
 * re-author (owner, with a reference image: "i cerchi delle reti neurali ci
 * sono ancora, le reti neurali sono fatte così" + "non hanno dei cerchi vuoti
 * dentro"). The round-6 layered DIAGRAM and the orbiting node HALOS (a ring
 * of dots with a hollow middle — the last surviving "cerchi vuoti") are gone;
 * the SAME machinery (sim, stores, uniforms, band anchoring) now renders a
 * real 3D BRAIN PLEXUS. File name kept so NeuralLattice's lazy import stays
 * put.
 *
 * THE CLOUD: ~103 nodes (lite ~56) seeded deterministically inside an organic
 * ellipsoid filling the band (x −0.42..+0.49, y ±0.42, z ±0.20), linked by
 * ~227 near-neighbour filaments (lite ~110) built by a k-nearest pass with a
 * distance cutoff — a dense irregular triangulation, never columns. Node
 * positions, the weak left→right coordinate `nodeT` and the link endpoint
 * indices are generated once by `getPlexus(mode, density)` in
 * neuralLatticeConfig and ride in uniformArrays (`.element()` is legal in any
 * stage, zero buffer-slot cost): uNodePos, uNodeT and — since ROUND 12 ·
 * STAGE 0B — uEdgePack, which carries the link endpoint PAIR four links to a
 * vec4 element (`a + 1024·b`) where uEdgeA/uEdgeB used to take a whole padded
 * float array, AND a whole UBO block, EACH. That is the ROUND 12 capacity
 * prerequisite, not a micro-optimisation — see the EDGE_PACKED note at module
 * scope. Node/edge COUNTS are build-time (they size the arrays and the baked
 * meta buffer).
 *
 * Flow-t is the CLOUD's left→right coordinate: t = mix(nodeT_A, nodeT_B, s)
 * with s the per-link flow parameter, and links are ORIENTED by nodeT so the
 * flow always runs left→right. The surge/flash/row/width-envelope machinery
 * transfers verbatim; the pulse now reads as a WAVEFRONT sweeping the volume.
 *
 * ROLES (baked into the same meta/off/seed buffers — layout below):
 *   0 LINK — TRAFFIC since ROUND-8-G, not thread. home = mix(A,B,s) ON the
 *     chord (STRAND_RADIUS is 0 now: the LINE layer draws that exact chord, so
 *     a braid would park the bead beside its own line) + a sub-pixel thickness
 *     jitter in a real perpendicular frame (cross(dir, ref) with a ref that is
 *     never parallel to dir — the cloud has links pointing in every direction,
 *     including along ẑ) + curl shred (compute tier, ≈0.5px). At rest these
 *     are faint DUST riding the line (uDustAlpha, DUST_SIZE); where a packet
 *     bead or the surge head passes they swell and brighten to uBeadAlpha and
 *     BLOOM. Per-link s fade-in/out dissolves the tips into the STAR CORES
 *     (and hides the flow-wrap).
 *   1 STAR CORE — the fix for "cerchi vuoti". Particles no longer orbit: a
 *     baked per-particle OFFSET (aOff carries the literal vector) puts most
 *     of them in a tight centre-weighted blob and the rest on a 4-ray flare
 *     cross, so a node reads as a FILLED luminous point with radiating
 *     spikes. Stars inside an ignition REGION read uRingFlash/uRingGlow
 *     through a gaussian zone blend (never a quantized layer index) →
 *     ignition flash + radial shockwave + hover flare; the pulse and the
 *     packet-arrival kiss brighten them further.
 *   2 SPARK — broken-only burst on pulse death (unchanged).
 *
 *   - broken  (uBroken=1): past uFracture (nodeT 0.62 — spatially at the
 *     broken crystal) the plexus is DEGRADED — link particles fray off their
 *     line into ember debris (small DEBRIS_SPREAD: links gone wrong, not a
 *     detached cloud), and frayed link ENDPOINTS + star cores drift with a
 *     per-NODE coherent wander (nodeDrift) so the far cloud reads knocked off
 *     station. The break stays CLEAN (FRACTURE_GAP_T zero-alpha cut on every
 *     crossing filament). The pulse rides in from the left and DIES at the
 *     fracture with the >1.0 flash — which fires the SPARK BURST and flares
 *     the nebula. uRecohere is the hover tease — frayed links re-connect and
 *     drifted nodes pull back on station, then fall apart again.
 *   - healthy (uBroken=0): the whole cloud is intact; the three ignition
 *     REGIONS are eval → trace → guardrail — their stars flash (+ shockwave
 *     ripple) as the pulse crosses, filaments tighten smoothly left→right
 *     (widthEnvelope 1→~0.73), and the pulse SURVIVES to the right edge.
 *     uRingGlow[i] is the damped hover flare of region i.
 *
 * CRYSTAL COEXISTENCE: buildPlexus carves a soft DENSITY WELL around the
 * mode's crystal (crystalConfig CRYSTAL_POS) — node seeding probability ramps
 * 0→1 across CRYSTAL_CLEAR_INNER→OUTER in screen-round distance, and any link
 * whose midpoint falls inside INNER is dropped. The stone therefore sits IN
 * the plexus (the mesh thins toward it, a few nodes survive in front of and
 * behind it) without being swallowed.
 *
 * BACKEND CONTRACT (unchanged, mirrors gpgpuNodeSim.ts):
 *   - True-WebGPU compute path: storage buffers (`instancedArray`) advanced by
 *     a compute kernel through the shared unifiedForceStep. Render reads
 *     buffers via `.toAttribute().xyz` ONLY — the trailing `.xyz` is MANDATORY
 *     on a `"vec3"` buffer (padded to 16B). `.element(i)` on STORAGE buffers is
 *     COMPUTE-STAGE ONLY (three #31221); uniformArray `.element()` is fine in
 *     any stage. Buffer budget: 4 storage buffers in compute, 4
 *     `.toAttribute()` vertex-buffer slots in render (round-2 adds the
 *     velocity read for the streak stretch) — 5 of the 8 slots total with the
 *     quad position, still well inside the walls.
 *   - Non-compute path (WebGPURenderer WebGL2 sub-backend): the ANALYTIC
 *     build — particles sit at their reveal-blended home with a cheap shimmer
 *     and a mild fixed edge-direction elongation. Because the home is a pure
 *     function of uTime, the flow, surges, ring flashes/shockwaves, fracture
 *     and spark burst all still animate; only the physical debris inertia and
 *     the pointer bend are compute-only.
 *
 * All `three/webgpu` + `three/tsl` symbols are passed IN (caller lazy-imports
 * inside the webgpuEnabled()-gated effect — never module scope).
 *
 * Material contract (selective bloom): `MeshBasicNodeMaterial`, additive,
 * `toneMapped:false`, `depthWrite:false`, `depthTest:false`; output color
 * exceeds luminance 1.0 (emissive >1.0) so the threshold≈1.0 bloom catches it.
 *
 * VARYING DISCIPLINE (load-bearing): every varying below is a SELF-CONTAINED
 * expression (a pure function of attributes/storage reads + uniforms) fed
 * straight into `varying(...)`, and the SAME nodes are reused by the vertex
 * body — NEVER an outer `.toVar()` the vertex Fn `.assign()`s into. Three
 * writes every varying at the TOP of vertex main(), so an outer-var varying is
 * frozen at its initial value forever (VaryingNode hazard, gpgpuNodeSim.ts).
 * Round-2 folds ALL color math into the vertex stage (per-instance constants
 * anyway): the fragment receives vColor (premultiplied tone×emissive), vAlpha
 * and the quad UV — fewer scalars than the draft's five varyings.
 *
 * REGISTRATION SPINE (round-8-D): the uC0..uC4 Catmull-Rom control points are
 * the five X-SLICE CENTROIDS of the cloud (gaussian-weighted over nodeT —
 * `getPlexus(...).centroids`). NO particles ride the spline; streamCenter()
 * only registers the dormant membranes (streamCenter(RING_T[i]) = slice
 * centroid i+1 — Catmull-Rom passes through its control points at segment
 * boundaries), the fracture nebula + spark origin (streamCenter(uFracture),
 * which the slice spine still puts AT the broken crystal: local (+0.139,
 * +0.023) vs the stone at (+0.17, −0.05)), and the row attention windows.
 *
 * CARRIED-FORWARD MACHINERY (rounds 2–4, remapped, not rewritten):
 *   1. CURL MICRO-TURBULENCE (compute tier only) — analytic 2-octave curl
 *      displaces the strand offsets so the link filaments shred organically;
 *      the static tier keeps the analytic twist.
 *   2. ROW-REACTIVE ATTENTION — uRowGlow[3] (driven from the DOM rows'
 *      setHovered): broken = gaussian brightness+thickness swell at
 *      ROW_ZONE_T[i] (left cloud / mid cloud / the fracture zone); healthy =
 *      gaussian at RING_T[i] — row i attaches to ignition region i's stars
 *      and the links inside it. The driver also fires the BIGGER re-cohere
 *      tease on broken row ignition (RECOHERE_ROW_BOOST).
 *   3. DEPTH-DOF ILLUSION — size × alpha modulated by local z (the cloud now
 *      carries ±0.20 of REAL depth; far = smaller/dimmer, near = bigger + a
 *      softer disc via the vSoft varying) — cheap bokeh, no post. This is the
 *      main depth read of the volumetric cloud.
 *   B1. LAYER MEMBRANES (healthy) — RETIRED BY DEFAULT since round-8
 *       (owner: "non capisco i cerchi" — the discs read as unexplained
 *       floating circles): config MEMBRANE_ALPHA is 0 and the build seam
 *       below skips constructing the layer entirely when it is 0. The
 *       machinery (uniforms, driver seal/phase integration, this build
 *       function) is kept for revival. When alive: three camera-facing disc
 *       quads at the middle-layer centroids running igloo §5's forcefield
 *       recipe verbatim
 *       (banded noise `sin(noise·13 + phase − y·10)`, aastep(0.2)·(1−n·0.75),
 *       the mask·base + mask⁵·0.5 + rim·0.5 alpha sum) with procedural value
 *       noise for tWind. Positions derive from the SAME streamCenter/RING_T
 *       math as ever → the round-6 re-registration onto the layers was free.
 *       Seal (0→1 on first ignition), ripple (uRingFlash) and bulge
 *       (uRowGlow) are uniform-driven; the band phase is DRIVER-INTEGRATED
 *       per layer so the ripple's ×3 speed never runs the phase backwards.
 *   B2. FRACTURE NEBULA (broken) — three soft quads at streamCenter(uFracture)
 *       running igloo §4's tunnel-smoke recipe verbatim (sheared uv, triple-
 *       multiplied value noise at ×3/×4/×6, pow(v,3)·3 × radial). Ember core,
 *       faint cyan upstream rim; flares on uFlash, thins on uRowGlow[2].
 *   B3. SCROLL-VELOCITY NET (both modes) — uScrollVel (0..1, damped driver-
 *       side): width +25%·vel, streak stretch gain +60%·vel, curl +30%·vel,
 *       fray wander +20%·vel, and flow +40%·vel via the uFlowTime clock
 *       (driver-integrated; flowParam reads it instead of uTime so a velocity
 *       change bends the flow RATE without teleporting phases).
 *
 * ROUND-7 (2026-08-22, owner: "la luce che passa più frequente + continua a
 * renderle più belle") — ALL shader-side, zero driver changes, zero new
 * bindings, both backends:
 *   R1. AMBIENT PACKET TRAFFIC — packetAt(): PACKET_COUNT hash-staggered
 *       clocks per RECEIVING node (packetClock, keyed by the link's target)
 *       send small bright beads (×~2.2 emissive — above the bloom floor, so
 *       packets BLOOM) traveling s 0→1 with the flow; links into the same
 *       node converge and land together. Rides uFlowTime → animates on the
 *       STATIC tier too and quickens gently with scroll. On broken, traffic
 *       never crosses the fracture: gated to zero past it, and a packet
 *       dying into the break sputters (micro-spark flicker); the uRecohere
 *       tease re-opens the crossing for a beat. nodeKissAt(): the SAME
 *       per-node clock, centered on the arrival phase, briefly SWELLS
 *       (anchorNode) + BRIGHTENS (particleScalars) a STAR exactly as its
 *       beads land — which is precisely the reference image's read. Live
 *       knobs: uPacketRate / uPacketWidth / uPacketGain.
 *   R2. BEAUTY PASS — per-link brightness profile (dim at the tips into the
 *       star cores, brightest mid-span); a cool→warm tint across the cloud in
 *       the navy→cyan family (left cooler → blue, right warmer-cyan → white-
 *       cyan, NO violet); star size variance + slow breath; fray embers
 *       warming toward amber at the very tips (uColEmberTip).
 *   The membrane/nebula layers are pure vertex/fragment materials (no
 *   storage buffers, no compute, no textures) built for BOTH backends before
 *   the backend split — the 4-storage-buffer / 5-vertex-slot budget of the
 *   particle material is untouched; each layer's own geometry uses 2 slots
 *   (quad + 1 instanced attribute).
 *
 * ROUND-8 (2026-08-22, owner: "non capisco i cerchi ... e neanche le sfere"):
 *   - MEMBRANES OFF: the healthy discs were the unexplained "cerchi" —
 *     MEMBRANE_ALPHA is 0 and the build seam skips the layer entirely.
 *   - NEBULA reviewed + KEPT (sheared noise wisps, never a disc — config §B.2).
 *
 * ROUND-8-G (2026-08-24) — THE LINKS BECOME REAL LINES. Live-verified with the
 * owner watching: particles strung along an edge never became the reference's
 * thin crisp CONTINUOUS lines; pushed to 7.5 then 10px they became a chain of
 * glowing BLOBS, because a glowing sprite ≥4px and a 1px line are different
 * primitives. Structural, not tunable.
 *   L1. NEW LAYER `buildLinkLineLayer()` — ONE `LineSegments` (one draw call),
 *       vertex tables baked by neuralLinkLines.bakeLinkLineGeometry from the
 *       SAME getPlexus(mode, density) edge list the particles read (single
 *       source of truth; no second generator). The vertex stage re-derives the
 *       LIVE chord exactly as `edgeFrame` does (edgeEnds → uNodePos +
 *       nodeDrift), so a drifted broken endpoint takes its line with it. Built
 *       BEFORE the backend split like the membrane/nebula layers, so the
 *       static/analytic tier gets the identical lines. Per-link effects that
 *       transferred: fracture fray (dim + ember tone + a per-fragment dash),
 *       the clean break gap, uRecohere (through dispFactor/nodeDrift),
 *       uRowGlow zone ignition, the surge wavefront sweeping along the link,
 *       the death-flash, the mid-span brightness profile, the cool→warm nodeT
 *       tint, the shimmer, the tip fade into the star cores, depth-DOF and a
 *       staggered reveal. NOT transferred (and why): the radial core→fringe
 *       ramp and the width envelope (cross-section properties — a 1px line has
 *       none), the velocity streak stretch (a sprite property), the curl shred
 *       and the pointer bend (compute-only particle forces the line's vertex
 *       stage cannot read). The packet BEAD is deliberately left OFF the line:
 *       it stays a particle, so it reads as an object riding the thread.
 *   L2. THE PARTICLES ARE TRAFFIC NOW — the braid is zeroed (STRAND_RADIUS 0)
 *       so a bead sits ON its line rather than ~4px beside it, the resting
 *       alpha drops to a dust floor (STREAM_ALPHA — 0.012 since round-8-I cut
 *       the haze, was 0.06) and rises to BEAD_ALPHA 0.9 where a packet or the
 *       surge head is passing (the bead end is untouched by that cut), and the
 *       sprite shrinks to DUST_SIZE at rest / swells by PACKET_SIZE at a bead.
 *   L3. RE-ALLOCATION — NODE_FRACTION 0.28 → 0.46 and STAR_FLARE_FRACTION
 *       0.42 → 0.70: a full-tier star goes 25 → 40 particles and its four
 *       flare rays 2.6 → 7.0 each (the round-8-D check's own flag). Totals
 *       unchanged; fill ~7% cheaper. Budgets: the line material is a SEPARATE
 *       program — 2 vertex buffers of 8, 0 storage bindings, and its own small
 *       set of uniformArray UBO blocks. ⚠ THE BLOCK COUNTS THIS NOTE USED TO
 *       QUOTE WERE NEVER MEASURED AND WERE WRONG IN BOTH DIRECTIONS. There is
 *       exactly ONE authority for them in this file — the BLOCK-COUNT BUDGET
 *       note in createNeuralFieldBuild, measured live on the WebGL2 fallback.
 *       Read it there; do not restate a number here. This round moves none of
 *       them.
 *
 * ROUND 9-B (2026-08-24) — THE NET SITS UNDER THE COPY. Owner: "la rete
 * neurale ora sta sopra le scritte, deve stare sotto, le scritte non si
 * leggono." Not a stacking bug (the canvas is already behind the DOM) — a
 * CONTRAST one, created by 8-G/8-I making the plexus crisp and bright over the
 * ledger copy. ONE 2D MASK, four touch points, nothing structural:
 *   C1. `copyGateAt` / `copyYAt` / `copyMaskAt` / `copyMaskLineAt` — pure
 *       functions of the LOCAL position, sitting beside the DOF helpers. The x
 *       ramp's boundary is the MEASURED right bound of the real
 *       `[data-row-body]` boxes (driver-written `uCopyLaneC/W`, fallback = the
 *       1280 worst case), not a guessed fraction; the y term is a broad bell
 *       over the band's reading zone. Both layers evaluate the SAME expression
 *       at their OWN live local point — the line at its chord `posL`, the
 *       particles at their simulated/analytic position — so the two cannot
 *       disagree about where the column is. Only the FLOOR differs
 *       (COPY_MASK_FLOOR 1e-4 vs COPY_MASK_FLOOR_LINE 3e-3), because the star
 *       core is 18.8× the line and one shared floor would either blind the copy
 *       or delete the mesh from it.
 *   C2. PARTICLES — `particleScalars` takes the live position now and
 *       multiplies the combined role alpha by the mask. Multiplicative, not a
 *       luminance ceiling: additive blending makes the delivered light scale
 *       EXACTLY with the mask (the WCAG arithmetic is a product, not an
 *       estimate), the star/line/dust ratios survive instead of flattening back
 *       into the round-8-I haze, and the falloff stays smooth. The star's
 *       IGNITION machinery (zGate ⇒ uRingGlow + uRingFlash + shockwave, the
 *       surge flare, the packet kiss) is gated by the same ramp — a fully
 *       ignited core reaches ≈165 post-blend (×15.5 its rest 10.67) and
 *       ignition region 1 sits at local x ≈ −0.21, i.e. inside the column.
 *   C3. LINE — the mask rides the OUTPUT alpha only, downstream of the
 *       LINE_LUM_MAX knee, so the two ceilings compose: delivered ≤ 0.97 ×
 *       floor = 0.00291 in the column, for every gain and every tone.
 *   C4. The fragment DISCARD thresholds ride the mask (`cut` / `vLineCut` /
 *       the nebula's). Left absolute at 0.004 they would kill the masked layers
 *       outright and put a hard edge ~5px into the ramp; scaled, both sides of
 *       the test carry the same factor, so it reduces algebraically to the
 *       round-8 test and the surviving fragment SET — the fill budget — is
 *       byte-identical everywhere, not merely at mask 1.
 *   C5. NEBULA (broken) — same mask, same floor, but evaluated PER FRAGMENT
 *       from a per-instance box varying rather than per vertex. A wisp quad's
 *       local-x half-extent is 0.5·size·uPlaneAspect: 0.09 of the band on a
 *       desktop, 0.39 on a phone. One interpolation across a box that wide is
 *       a chord THROUGH the ramp, not the ramp — measured at 390 px it reads
 *       gate 0.80 where the true gate is 0, i.e. the brightest thing left in
 *       the phone band lands unmasked on the copy (≈0.043 added light ⇒
 *       3.4:1, an AA FAIL). Everything else in the mask is per-instance or
 *       short-chord, so this is the only layer that needed it.
 * Zero new bindings (five plain `uniform()` scalars join an existing shared
 * group), zero per-frame allocation, both backends, same treatment on lite.
 * The DOM derivation, the per-viewport table and the WCAG arithmetic
 * (5.38:1 at the brightest remaining pixel vs the 4.5:1 AA gate, 6.04:1 on the
 * bare page) live in neuralLatticeConfig's COPY-COLUMN MASK section — INCLUDING
 * the narrow-viewport ledger: below ~1100 px the copy fills the band and the
 * mask floors essentially the whole cloud (97–100 % of the nodes at 390 px).
 * That is the declared design's honest consequence, not a bug, but it is an
 * OWNER-VISIBLE trade and it is written down there.
 *
 * ROUND-8-D "NO CIRCLES ANYWHERE" AUDIT (this round):
 *   - node halos (orbiting ring, hollow centre) ....... REPLACED by star cores
 *   - membrane discs ................................. already off (round-8)
 *   - fracture nebula ................................ sheared wisps, not a disc
 *   - reveal seed cloud / DOF soft discs ............. sub-5px sprites, no rim
 *   - the crystal build's plexus + callout markers ... NOT this file's layers
 *   - the DOM twin's three layer rings ............... removed (the fallback is
 *     redrawn as the same dense star plexus in components/fx/
 *     neural-graph-fallback.tsx)
 */
import {
  unifiedForceStep,
  type TslSymbolsGpgpu,
} from "../gpgpu/gpgpuNodeSim";
import { bakeLinkLineGeometry } from "./neuralLinkLines";
import { CAMERA_Z } from "../constants";
import {
  COL_CORE,
  COL_CYAN,
  COL_BLUE,
  COL_EMBER,
  COL_EMBER2,
  getPlexus,
  PLEXUS_MASTER_SEED,
  type PlexusDensity,
  type Plexus,
  NEURAL_PARTICLE_COUNT_COMPACT,
  STAR_CORE_R,
  STAR_CORE_CONC,
  STAR_FLARE_FRACTION,
  STAR_FLARE_LEN,
  STAR_FLARE_POW,
  STAR_SPIKE_JITTER,
  STAR_Z,
  STAR_CORE_SIZE,
  STAR_TIP_SIZE,
  STAR_CORE_EMIS,
  STAR_TIP_EMIS,
  STAR_TIP_ALPHA,
  STAR_ALPHA_POW,
  STAR_CORE_WHITE,
  // ROUND-8-F: the live-measured defaults for four uniforms that used to be
  // bare literals here (uStarPunch / uStarSpread / uDof / uEnvelope).
  STAR_PUNCH,
  STAR_SPREAD,
  DOF_STRENGTH,
  ENVELOPE_BASE,
  NODE_ALPHA,
  NODE_FRACTION,
  NODE_DRIFT,
  NODE_DEGRADE,
  ZONE_K,
  STRAND_COUNT,
  STRAND_RADIUS,
  STRAND_THICKNESS,
  STRAND_PHASES,
  STRAND_THICK_BIAS,
  STRAND_RATE_BASE,
  STRAND_RATE_STEP,
  BRAID_TURNS,
  FLOW_SPEED,
  EDGE_FADE_IN,
  EDGE_FADE_OUT,
  STREAM_Z_BOW,
  CORE_SIZE_BOOST,
  FRINGE_SIZE_DROP,
  DUST_SIZE,
  // ROUND 12 · D — the ribbon-only companions of the eight sizing/alpha
  // constants `#production` shares with the ribbon. Selected by a BUILD-TIME
  // JS ternary on `plexus.shape`, so the non-ribbon node graph bakes the
  // identical `float()` literals it baked before this round existed.
  DUST_SIZE_RIBBON,
  // ROUND 13 — the volumetric conduit + the ribbon's scroll-velocity kill.
  // Same build-time-ternary discipline as the ROUND 12 · D block above.
  STRAND_RADIUS_RIBBON,
  STRAND_THICKNESS_RIBBON,
  BRAID_TURNS_RIBBON,
  STRAND_RATE_BASE_RIBBON,
  STRAND_RATE_STEP_RIBBON,
  STRAND_SWIRL_RIBBON,
  STRAND_CORE_R_RIBBON,
  STRAND_SHEATH_ALPHA_RIBBON,
  STRAND_CORE_SIZE_RIBBON,
  STRAND_SHEATH_SIZE_RIBBON,
  STRAND_RADIUS_TAPER_RIBBON,
  ENVELOPE_BASE_RIBBON,
  DOF_STRENGTH_RIBBON,
  STAR_PUNCH_RIBBON_K,
  VEL_SWELL_RIBBON,
  VEL_STRETCH_RIBBON,
  VEL_FLOW_RIBBON,
  VEL_CURL_RIBBON,
  LINK_BEND_RIBBON,
  LINK_BEND_MAX_RIBBON,
  LINK_BEND_ROLL_RIBBON,
  LINK_TAPER_RIBBON,
  CORE_SIZE_BOOST_RIBBON,
  FRINGE_SIZE_DROP_RIBBON,
  PACKET_SIZE_RIBBON,
  STATIC_ELONG_RIBBON,
  FLOW_SPEED_RIBBON,
  STREAM_ALPHA_RIBBON,
  BEAD_ALPHA_RIBBON,
  RIBBON_WINDOW_PAD,
  RIBBON_KAPPA_K,
  REST_OVERLAP,
  STAR_PER_NODE_RIBBON,
  WINDOW_FADE_IN,
  WINDOW_FADE_OUT,
  SIZE_NORM_MAX,
  STAR_WINDOW_SNAP,
  WINDOW_REHOME_SNAP,
  WINDOW_REHOME_SNAP_DEBRIS,
  WINDOW_REHOME_SNAP_ON,
  RIVER_M,
  RIVER_K,
  RIVER_TAIL,
  RIVER_ADVECT,
  RIVER_SIZE,
  RIVER_GAIN,
  RIVER_WHITE,
  RIVER_TRAFFIC,
  RIVER_STAR,
  FRONT_W,
  DUST_A_MAX,
  BEAD_A_MAX,
  DUST_LUM_KNEE,
  DISC_CHORD_MEAN,
  COPY_MASK_FLOOR_STREAM,
  // ROUND-8-G — the link LINE layer.
  LINE_LAYER,
  LINK_SEGMENTS,
  LINE_ALPHA,
  LINE_EMISSIVE,
  LINE_LUM_MAX,
  LINE_LUM_KNEE,
  LINE_BLUE_MIX,
  LINE_SURGE_GAIN,
  LINE_SURGE_WHITE,
  LINE_ROW_GAIN,
  LINE_FLASH_GAIN,
  LINE_DEAD_ALPHA,
  LINE_DEAD_DIM,
  LINE_DASH_FREQ,
  LINE_DASH_LO,
  LINE_DASH_HI,
  LINE_REVEAL_STAGGER,
  COPY_EDGE_LOCAL,
  COPY_EDGE_PAD,
  COPY_LANE_OPEN_W,
  COPY_RAMP_SOFT,
  COPY_MASK_FLOOR,
  COPY_MASK_FLOOR_LINE,
  COPY_Y_FLOOR,
  COPY_Y_IN,
  COPY_Y_OUT,
  COPY_ROW_SOFT,
  BEAD_ALPHA,
  STRETCH_GAIN,
  STRETCH_MAX,
  STATIC_ELONG,
  SURGE_ADVECT,
  BREATHE_AMP,
  BREATHE_PERIOD,
  SHIMMER_AMP,
  RING_T,
  RING_RADIUS,
  RING_WHITE,
  RING_SHOCKWAVE,
  TIGHTEN_PER_RING,
  RING_SPRING_GAIN,
  RING_PROX_K,
  FRACTURE_T,
  FRACTURE_WINDOW,
  FRACTURE_GAP_T,
  DEBRIS_GAP,
  DEBRIS_ALPHA_MAX,
  DEBRIS_SPREAD,
  DEBRIS_FADE,
  DEBRIS_WANDER_ACC,
  SPARK_COUNT,
  SPARK_REACH,
  SURGE_K,
  SURGE_TAIL,
  SURGE_GAIN,
  FLASH_K,
  FLASH_GAIN,
  PACKET_COUNT,
  PACKET_RATE,
  PACKET_SPAN,
  PACKET_WIDTH,
  PACKET_GAIN,
  PACKET_SIZE,
  PACKET_WHITE,
  PACKET_NODE_SWELL,
  PACKET_NODE_GAIN,
  PACKET_KISS_WIDTH,
  PACKET_FLICKER_HZ,
  EDGE_MID_BRIGHT,
  LAYER_TINT_COOL,
  LAYER_TINT_WARM,
  HALO_SIZE_VAR,
  HALO_BREATH_AMP,
  HALO_BREATH_RATE,
  COL_EMBER_TIP,
  EMBER_TIP_MIX,
  RING_FLASH_GAIN,
  STREAM_EMISSIVE,
  RING_EMISSIVE,
  STREAM_ALPHA,
  NEURAL_POINT_SIZE,
  RING_POINT_SIZE_BOOST,
  NEURAL_DEPTH_ATTEN,
  DEPTH_Z_RANGE,
  ROW_ZONE_T,
  ROW_ZONE_K,
  ROW_LAYER_K,
  ROW_GAIN,
  ROW_SWELL,
  ROW_TIGHTEN_RATIO,
  CURL_GAIN,
  CURL_SCALE,
  CURL_FREQ,
  CURL_FREQ_2,
  CURL_AMP_2,
  CURL_SPEED,
  CURL_SPEED_2,
  DOF_FAR_DIM,
  DOF_SOFT_MIN,
  DOF_SIZE_GAIN,
  MEMBRANE_MARGIN,
  MEMBRANE_NOISE_SCALE,
  MEMBRANE_BAND_THRESH,
  MEMBRANE_BAND_BASE,
  MEMBRANE_ALPHA,
  MEMBRANE_EMISSIVE,
  MEMBRANE_RIPPLE_ALPHA,
  MEMBRANE_BULGE,
  NEBULA_QUADS,
  NEBULA_ALPHA,
  NEBULA_EMISSIVE,
  NEBULA_SHEAR,
  NEBULA_FLARE,
  NEBULA_THIN,
  NEBULA_RIM_GAIN,
  VEL_NORM,
  VEL_SWELL,
  VEL_STRETCH,
  VEL_FLOW,
  VEL_CURL,
  VEL_DEBRIS,
  NEURAL_SPRING,
  NEURAL_DAMPING,
  NEURAL_MAX_SPEED,
  SPARK_SNAP_DIST,
  POINTER_PUSH,
  POINTER_RADIUS,
  SEED_SCATTER_XY,
  SEED_SCATTER_Z,
  SEED_SCATTER_RIBBON,
  SEED_SCATTER_Z_RIBBON,
  COPY_LANE_OPEN_W_RIBBON,
  type LatticeMode,
  type PlexusParams,
} from "./neuralLatticeConfig";

// Loose structural typings — the real node/namespace types are vast & generic
// (same rationale as gpgpuNodeSim.ts).
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export interface NeuralFieldUniforms {
  uTime: { value: number };
  /** 0→1 section fade (assemble-in from a loose cloud onto homes). */
  uReveal: { value: number };
  /** 0 healthy · 1 broken. */
  uBroken: { value: number };
  /** Base flow speed along an edge (cycles/sec of the per-edge s). */
  uFlowSpeed: { value: number };
  /** Fracture flow-t position (broken). */
  uFracture: { value: number };
  /** 0→1 hover tease — debris re-coheres toward the spline (broken). */
  uRecohere: { value: number };
  /** Surge head flow-t (park < 0 when idle) + its 0..1 amplitude. */
  uSurgeT: { value: number };
  uSurgeAmp: { value: number };
  /** 0→1 fracture death-flash envelope (broken) — also the spark-burst
   * clock: sparks fly/fade as it decays. */
  uFlash: { value: number };
  /** Per-ring damped hover glow, 1 = neutral (write to `.array`). */
  uRingGlow: { array: number[] };
  /** Per-region ignition flash 0..1 (write to `.array`) — also drives the
   * star's radial shockwave expansion. */
  uRingFlash: { array: number[] };
  /** The 5 registration-spine control points (LOCAL space vec3) — the cloud's
   * X-SLICE CENTROIDS since round-8-D. Only membranes/nebula/sparks/row
   * windows read the spline; no particles ride it. */
  uC0: { value: { set: (x: number, y: number, z: number) => unknown } };
  uC1: { value: { set: (x: number, y: number, z: number) => unknown } };
  uC2: { value: { set: (x: number, y: number, z: number) => unknown } };
  uC3: { value: { set: (x: number, y: number, z: number) => unknown } };
  uC4: { value: { set: (x: number, y: number, z: number) => unknown } };
  /** Round-8-D plexus tables (live-tunable POSITIONS — write entries of
   * `.array`; the array LENGTHS are build-time): node centres (LOCAL-space
   * Vector3s), per-node left→right coordinate nodeT, per-link endpoint node
   * indices (oriented so nodeT[A] ≤ nodeT[B]). */
  uNodePos: { array: { set: (x: number, y: number, z: number) => unknown }[] };
  uNodeT: { array: number[] };
  uEdgeA: { array: number[] };
  uEdgeB: { array: number[] };
  /** ROUND 12 - STAGE 0B: the PACKED link endpoint table - one Vector4 per
   * FOUR links, each component `a + 1024*b` (see EDGE_PACKED). While
   * EDGE_PACKED is true THIS is the table both shaders read; uEdgeA/uEdgeB
   * are still built and still exported (they are the rollback path) but
   * nothing references them in a node graph, so they emit no UBO block, are
   * never uploaded, and a live write to them changes nothing. */
  uEdgePack: {
    array: { set: (x: number, y: number, z: number, w: number) => unknown }[];
  };
  /** Cursor attractor in LOCAL space (park at 1e9 = off; compute tier only). */
  uPointer: { value: { set: (x: number, y: number, z: number) => unknown } };
  uPixelRatio: { value: number };
  uViewport: { value: { set: (x: number, y: number) => unknown } };
  /** Per-row attention glow 0..1 (write to `.array`) — round-3 row-reactive
   * current, driven from the DOM rows' setHovered by the useFrame driver.
   * broken: gaussian swell at ROW_ZONE_T[i]; healthy: segment ring i-1→i
   * tightens + brightens. */
  uRowGlow: { array: number[] };
  // --- Round-2 live tunables (surfaced on the dev handle) -------------------
  /** Master braid-thickness scale (1 = config rest ≈ 44px visual, round-3). */
  uEnvelope: { value: number };
  /** Idle envelope breathing amplitude (±, BREATHE_PERIOD seconds). */
  uBreathe: { value: number };
  /** Idle per-particle brightness shimmer amplitude (±). */
  uShimmer: { value: number };
  /** z-bow of the spline toward camera at t=0.5 (local units). */
  uZBow: { value: number };
  /** Clean-break zero-alpha gap width past the fracture (flow-t units). */
  uGap: { value: number };
  /** Velocity-stretch: total elongation = 1 + min(|v|·gain, max). */
  uStretchGain: { value: number };
  uStretchMax: { value: number };
  /** Surge-head emissive gain (rides on the >1.0 floor). */
  uSurgeGain: { value: number };
  // --- Round-7 ambient packet traffic (live tunables) -----------------------
  /** Packet clock rate (cycles/sec; a bead crosses its edge in
   * 1/(rate·PACKET_SPAN) ≈ 0.9s at the default). Density scales with it. */
  uPacketRate: { value: number };
  /** Gaussian half-width of a packet bead along per-edge s. */
  uPacketWidth: { value: number };
  /** Peak packet emissive gain — ×(1+gain) at the bead center (default 1.2
   * → ×2.2, above the >1.0 bloom floor so packets bloom). */
  uPacketGain: { value: number };
  // --- Round-8-D star-core knobs (live tunables) ---------------------------
  /** Uniform scale on a star's BAKED offset — stretches core blob and flare
   * rays together (1 = config). The star GEOMETRY (core/flare split, ray
   * count) and the NODE COUNT are build-time; only the scale is live. */
  uStarSpread: { value: number };
  /** Multiplier on the star's >1.0 core emissive (bloom punch). */
  uStarPunch: { value: number };
  /** At-rest alpha of a star particle (link dust uses uDustAlpha). */
  uNodeAlpha: { value: number };
  /** Billboard base size in device px. */
  uPointSize: { value: number };
  // --- Round-8-G link TRAFFIC + the LINE layer (live tunables) --------------
  /** RESTING alpha of a link particle — the dust floor (STREAM_ALPHA). */
  uDustAlpha: { value: number };
  /** PEAK alpha of a link particle where a bead / the surge head passes. */
  uBeadAlpha: { value: number };
  /** Line body master alpha. */
  uLineAlpha: { value: number };
  /** Line body resting emissive. */
  uLineEmissive: { value: number };
  /** Hard ceiling on the line's POST-BLEND LUMINANCE — the shader divides
   * it by the live lum(tone) x alpha, so the line never blooms whatever the
   * gains or the tone. */
  uLineLumMax: { value: number };
  /** Line body mix toward COL_BLUE from brand cyan (paleness). */
  uLineBlue: { value: number };
  /** Line emissive gain per unit surge. */
  uLineSurgeGain: { value: number };
  /** Line emissive gain at full row/zone attention. */
  uLineRowGain: { value: number };
  // --- ROUND 9-B copy-column mask (live tunables) ---------------------------
  /**
   * ROUND 11 — the mask lane's CENTRE in LOCAL x. Under the diagonal traverse
   * the copy moves relative to the net, so the shipped half-plane became a
   * two-sided lane (see COPY_LANE_OPEN_W). DRIVER-WRITTEN: per MEASURE on an
   * un-traversed band (the half-plane-equivalent pair), per FRAME on a
   * traversed one, from the tracked block's FINAL APPLIED `x`.
   */
  uCopyLaneC: { value: number };
  /** Half-width of the mask lane in LOCAL x. COPY_LANE_OPEN_W = half-plane. */
  uCopyLaneW: { value: number };
  /** Width of the floor→full ramp in LOCAL x (band-width fractions). */
  uCopySoft: { value: number };
  /** Mask floor over the copy column for the PARTICLE layer (1 = inert). */
  uCopyFloor: { value: number };
  /** Mask floor over the copy column for the LINE layer (1 = inert). */
  uCopyLineFloor: { value: number };
  /** Vertical term's floor over the text band (1 = inert). */
  uCopyYFloor: { value: number };
  /** ROUND 12 · STAGE 2 FIX — the reading-band frame. `uCopyYc` re-centres the
   * mapped local y on `ih/2` (0 = the shipped band, bit-exact); `uCopyRowC/H/
   * Soft` bound the deep floor to the tracked reading unit; `uCopyRowLocal`
   * (0/1) is the bit-exactness gate. Driver-written. */
  uCopyYc: { value: number };
  uCopyRowC: { value: number };
  uCopyRowH: { value: number };
  uCopyRowSoft: { value: number };
  uCopyRowLocal: { value: number };
  /** Per-strand twist phases (rad) — write entries of `.array`. */
  uStrandPhase: { array: number[] };
  /** Per-strand tube-thickness biases — write entries of `.array`. */
  uStrandThick: { array: number[] };
  // --- Round-3 live tunables ------------------------------------------------
  /** Curl micro-turbulence gain (× CURL_SCALE displacement; compute tier
   * only — the static graph never reads it). */
  uCurl: { value: number };
  /** Depth-DOF strength 0..1 (0 = the round-2 flat look). */
  uDof: { value: number };
  /** Row-glow emissive boost at full attention. */
  uRowGain: { value: number };
  /** Row-glow width response (broken swell + / healthy tighten −·ratio). */
  uRowSwell: { value: number };
  // --- Round-4 §B.3 — scroll-velocity net -----------------------------------
  /** Damped, normalized |scroll velocity| 0..1 (driver-written). */
  uScrollVel: { value: number };
  /** Driver-integrated flow clock: += dt·(1 + uVelFlow·uScrollVel). flowParam
   * reads THIS (not uTime), so velocity bends the flow rate C1-continuously. */
  uFlowTime: { value: number };
  /** Width envelope gain per unit vel (+25% default). */
  uVelSwell: { value: number };
  /** Streak stretch-gain boost per unit vel (+60% default). */
  uVelStretch: { value: number };
  /** DRIVER-READ ONLY (never in a shader): flow-clock gain per unit vel. Lives
   * in the bag so the dev handle tunes it like every other knob. */
  uVelFlow: { value: number };
  /** Curl-turbulence gain boost per unit vel (compute tier). */
  uVelCurl: { value: number };
  /** Debris wander boost per unit vel (broken). */
  uVelDebris: { value: number };
  /** DRIVER-READ ONLY: |velocity| that maps to uScrollVel = 1. */
  uVelNorm: { value: number };
  // --- Round-4 §B.1 — ring membranes (healthy builds; dead nodes on broken).
  // ROUND-8: the membrane MESH is retired by default (config MEMBRANE_ALPHA
  // 0 skips its build) — these uniforms stay live (the driver still writes
  // them) so a config revival needs no wiring work, but they drive nothing
  // until the mesh is built again. ---
  /** Per-ring 0→1 seal envelope (driver-latched on first ignition). */
  uMembraneSeal: { array: number[] };
  /** Per-ring driver-integrated band phase (rad — ripple = faster integration
   * while uRingFlash burns, never a backwards jump). */
  uMembranePhase: { array: number[] };
  /** Peak membrane alpha (seeded from config MEMBRANE_ALPHA — 0 since
   * round-8; inert while the mesh is un-built). */
  uMembraneAlpha: { value: number };
  /** Radial bulge per unit row hover (+8% default). */
  uMembraneBulge: { value: number };
  /** rect height/width — corrects the camera-facing quads to screen-circular
   * inside the anisotropically scaled (w·k, h·k) group. Driver-written. */
  uPlaneAspect: { value: number };
  /** ROUND 12 · STAGE 2 — the field mapping (`fieldMap`). Driver-written on
   * every measure; `(1, 0, 0)` is the shipped band, bit-exact. */
  uFieldLen: { value: number };
  uFieldOrigin: { value: number };
  uFieldSlope: { value: number };
  /** `1 / uFieldLen` — divides the LOCAL-units forces (pointer bend, curl). */
  uFieldK: { value: number };
  /** The authored exit fade, 1 → 0 over the act's last `FIELD_EXIT_VH`. */
  uFieldFade: { value: number };
  // --- ROUND 12 · D — the rolling κ-window + the travelling signal ----------
  /** Index of the first table entry inside the κ-window (edges / nodes). Both
   * tables were κ-sorted at build; a particle homes onto
   * `first + mod(baked − first, WIN)`. Driver-written from the frame's own
   * screen-y bounds, so the window and the picture can never disagree. */
  uWinFirstEdge: { value: number };
  uWinFirstNode: { value: number };
  /** Screen-y of the frame's centre in mapped-local units — the window fade's
   * origin. Its own uniform (not `uCopyYc`) so a disabled copy lane can never
   * leave the fade masking the whole field off. */
  uWinYc: { value: number };
  /** `ih / (2·rect.h)` — the frame's half-height in the shader's y unit. The
   * window fade's thresholds are multiples of this, never absolute. */
  uWinHalf: { value: number };
  /** 1 on a live ribbon, 0 everywhere else — gates the window fade only. */
  uWinOn: { value: number };
  /** The band anchor's height in CSS px: turns a local length into a
   * delivered SCREEN length for the overlap normaliser. 0 = inert. */
  uBandPx: { value: number };
  /** BIRTH front, in nodeT — a pure function of `p`, damped, never latched. */
  uFront: { value: number };
  /** LIGHT phase = `uFront + riverClock`. ⚠ Its own clock is what keeps the
   * crests travelling when the reader stops; without it a stopped reader sees
   * frozen bright patches. */
  uRiver: { value: number };
  /** Birth knee width in nodeT (C¹, never a clamp). */
  uFrontW: { value: number };
  /** The phase axis: `phase = y·uFrontKy + uFrontC`. The x terms cancel
   * exactly on a 45° sheared band (`bandAspect·(W/H) = 1/L`). */
  uFrontKy: { value: number };
  uFrontC: { value: number };
  /** The LINK/continuity role's copy-lane floor (`COPY_MASK_FLOOR_STREAM`,
   * ramped on the same lane window as `uCopyFloor`). Applied to RESTING dust
   * only — a bead on this floor would eat 1.6× the whole AA budget. */
  uCopyStreamFloor: { value: number };
  // --- Round-4 §B.2 — fracture nebula (broken builds; dead nodes on healthy) -
  /** Driver-integrated wisp drift (igloo t·0.05, kicked by uFlash). */
  uNebulaDrift: { value: number };
  /** Resting nebula alpha ceiling (≤0.3). */
  uNebulaAlpha: { value: number };
}

/** A subordinate fullscreen-quad layer (membranes / nebula) sharing the
 * particle build's uniforms — pure vertex/fragment, both backends. */
export interface NeuralFieldLayer {
  geometry: Any;
  material: Any;
}

/** ROUND-8-G: the link LINE layer — ONE `LineSegments` object (mounted with
 * `<primitive>`, the crystalPlexus idiom), plus its geometry/material for
 * disposal and a couple of build-time diagnostics for the dev handle. */
export interface NeuralFieldLines extends NeuralFieldLayer {
  object: Any;
  edgeCount: number;
  vertexCount: number;
}

export interface NeuralFieldBuild {
  geometry: Any;
  material: Any;
  uniforms: NeuralFieldUniforms;
  /** Round-4 §B.1: ring forcefield membranes — healthy builds only, and
   * ALWAYS null since round-8 (config MEMBRANE_ALPHA 0 gates the build;
   * set it > 0 to revive). */
  membrane: NeuralFieldLayer | null;
  /** Round-4 §B.2: fracture nebula — broken builds only. */
  nebula: NeuralFieldLayer | null;
  /** Round-8-G: the plexus link lines — ALWAYS built (both modes, both
   * backends); the mesh the star cores hang in. */
  /** ROUND 12 · D — `null` when `LINE_LAYER` is off (the chord retired).
   * `LINE_LAYER` is annotated `: boolean` on purpose so this stays a union
   * and the whole line branch keeps being type-checked. */
  links: NeuralFieldLines | null;
  /**
   * ROUND 11 STAGE 1.5 — the structural fingerprint of THIS build's cloud, so
   * the island sequence can PROVE its five constellations differ rather than
   * assert it (QA gate 4). Read-only, computed once at build.
   */
  stats: {
    seed: number;
    well: boolean;
    nodes: number;
    edges: number;
    meanDegree: number;
    minEdgeLocal: number;
    components: number;
    largestComponent: number;
    meanEdgeLocal: number;
    checksum: number;
  };
  /**
   * ROUND 12 · STAGE 2 — the FIELD this build carries. Build-time facts the
   * driver must not re-derive: which generator arm ran, the lane width that
   * arm sized its uniforms with, the per-build recycle-snap threshold and its
   * audit, and the fracture position in `nodeT` (which on the ribbon is the
   * stone's own `u`, inverted out of the delivered cloud).
   */
  field: {
    ribbon: boolean;
    laneOpenW: number;
    wrapSnapDist: number;
    wrapSnapOk: boolean;
    excursionFloor: number;
    fractureT: number;
    // --- ROUND 12 · D — the rolling κ-window, published for the driver -----
    /** Fixed window WIDTHS (table entries) the node graph baked. Fixed on
     * purpose: it is what makes each element's residue class — and therefore
     * its particle population and its comb spacing — a build constant. */
    winEdges: number;
    winNodes: number;
    /** ASCENDING κ keys, in nodeT units — the same axis `uFront`/`uRiver`
     * ride. `null` off the ribbon (the window is compiled out there). */
    edgeKey: Float32Array | null;
    nodeKey: Float32Array | null;
    /** Flat endpoint pairs — QA only, `null` off the ribbon. */
    edgeAB: Uint16Array | null;
    /** The phase axis resolved at build: `phase = y·frontKy + frontC`. */
    frontKy: number;
    frontC: number;
    /** Sprites per link at any instant, and the delivered star/link split —
     * the numbers the S/s continuity gate is computed from. */
    perLink: number;
    starCount: number;
    edgeTotal: number;
  };
  /** Dispatch the compute step with a clamped frame delta (no-op on static). */
  compute: (delta: number) => void;
  dispose: () => void;
}

export interface NeuralFieldBuildArgs {
  THREE: typeof import("three");
  webgpu: Any;
  tsl: Any;
  /** The renderer (its `.compute()` dispatches the kernel). */
  gl: Any;
  /** True only on the genuine WebGPU compute sub-backend. */
  backendIsWebGPU: boolean;
  count: number;
  /** Which stream this build paints — decides the ring-particle allocation. */
  mode: LatticeMode;
  /**
   * ROUND 11 STAGE 1.5 — the plexus MASTER SEED for this build. Omitted (the
   * shipped call shape) ⇒ `PLEXUS_MASTER_SEED[mode]`, i.e. byte-identical to
   * every build before the island sequence existed. Supplied ⇒ a different
   * constellation from the SAME code and the SAME uniform-block budget: the
   * seed only ever reaches the GPU as the CONTENTS of the plexus
   * uniformArrays that already exist, so there is no shader edit, no new
   * binding, and the vertex-stage block count (10/12 since ROUND 12 · STAGE
   * 0B, 11/12 before it — both measured, not derived) does not move.
   */
  plexusSeed?: number;
  /** Carve the crystal density well? Only the band the stone rides needs it
   * (default true = shipped). */
  plexusWell?: boolean;
  /**
   * ROUND 12 · STAGE 2 — the generator's per-build arguments, forwarded
   * verbatim to `getPlexus`. Omitted (every shipped call before this stage)
   * ⇒ the ellipsoid arm with the module constants, i.e. today to the bit.
   *
   * Supplied with `shape: "ribbon"` it selects the D17 continuous field, and
   * THAT is also what arms the field mapping below: `uFieldLen`/`uFieldSlope`
   * are meaningless on a band-shaped cloud, so the ribbon flag is read once
   * here and nothing downstream has to be told twice.
   */
  plexusParams?: PlexusParams;
}

const QUAD_CORNERS = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

/**
 * ROUND 12 - STAGE 0B - INDEX PACKING. `uEdgeA` + `uEdgeB` -> one `uEdgePack`.
 *
 * THE ROLLBACK LEVER, and it is part of the deliverable. `true` = the packed
 * path (one `uniformArray(Vector4[])`, four links per element, value
 * `a + 1024*b`). `false` = the two-array path EXACTLY as it shipped: both
 * arrays are still built either way, and `edgeEnds()` falls back to
 * `uEdgeA.element(int(e))` / `uEdgeB.element(int(e))` verbatim, so flipping
 * this one constant restores the old node graph byte-for-byte. Do NOT delete
 * the unpacked arm.
 *
 * WHY IT IS A PREREQUISITE, NOT AN OPTIMISATION. GLSLNodeBuilder emits ONE
 * UBO block per `uniformArray`, and three r184's UniformArrayNode pads EVERY
 * element to a vec4 = 16 B regardless of the declared element type
 * (`getPaddedType()` in three/src/nodes/accessors/UniformArrayNode.js). A
 * `float[]` of E links therefore costs E*16 B AND a whole block, while a
 * `vec4[]` carrying the same E links costs ceil(E/4)*16 B and ONE block -
 * 4x the size AND one block freed — measured on the WebGL2 fallback, the
 * particle vertex stage goes 11 → 10 blocks of 12 and the line vertex stage
 * 7 → 6 (see the BLOCK-COUNT BUDGET note in createNeuralFieldBuild; the
 * long-standing "12/12, zero headroom" claim was never measured and is
 * wrong). At the ROUND 12 continuous band (~1258
 * links over a 7278 x 935 px field) the unpacked arrays are ~19.7 KiB EACH,
 * over the 16 KiB MAX_UNIFORM_BLOCK_SIZE min-spec floor and past the hard
 * 1024-element ceiling (16384/16); packed they are 4.92 KiB, 30 % of the
 * floor. On the lite (phone) tier the same construction is ~1406 links and
 * cannot ship at all unpacked.
 *
 * EXACTNESS - this is a LOSSLESS transform, not an approximation. Endpoints
 * are node indices in [0, NODE_N) and neuralLatticeConfig's own dedup key is
 * already `a*1024 + b`, so NODE_N <= 1024 is a pre-existing invariant of the
 * generator. The largest packed value is then 1023 + 1024*1023 = 1,048,575 <
 * 2^24 = 16,777,216: every packed value is an integer exactly representable
 * in fp32, with 16x margin. The decode is exact for the same reason - v*2^-10
 * only decrements the exponent (no rounding, no subnormal for v >= 1),
 * `floor()` of it is b exactly, and v - 1024*b is an exact integer
 * subtraction. Multiply by the exactly-representable 2^-10 rather than divide
 * by 1024: GLSL ES only promises ~2.5 ULP on `/`, but a power-of-two `*` is
 * exact on every conforming implementation.
 *
 * COST: ~3 ALU for the split, ~6 ALU for the dynamic vec4 component pick (3
 * nested `select()` - neither GLSL ES nor WGSL has a runtime swizzle). Both
 * `select` and dynamic uniform-array indexing are already exercised
 * throughout this file and compile on WebGPU and the WebGL2 fallback.
 */
const EDGE_PACKED = true;

/** Links per packed element. Fixed by the padding: an element IS a vec4. */
const EDGE_PACK_STRIDE = 4;

/** Radix of the endpoint pack (`v = a + EDGE_PACK_RADIX*b`). Must be >= NODE_N
 * and a power of two so the decode's `*(1/RADIX)` is exact. 1024 is the same
 * ceiling neuralLatticeConfig's `a*1024 + b` dedup key already imposes, so
 * the two share one invariant rather than inventing a second. */
const EDGE_PACK_RADIX = 1024;

/** Deterministic [0,1) hash — the EXACT formula the compute kernel re-derives
 * for the reveal seed (fract(sin(i·127.1 + 311.7)·43758.545) family), so the
 * baked seed buffer and the kernel's analytic seed agree. */
function h(i: number, mulA: number, addB: number): number {
  const s = Math.sin(i * mulA + addB) * 43758.545;
  return s - Math.floor(s);
}

/**
 * Seed the read-only per-particle role buffers. LINK homes are NOT baked —
 * they derive from the uNodePos/uEdge* uniforms in-shader. STAR offsets ARE
 * baked (the literal offset vector), which is what turns the old orbiting
 * halo into a filled core + flare cross at zero extra cost. Layout:
 *
 *   meta : vec4
 *     role     (0 link | 1 star core | 2 spark — spark is broken-only)
 *     aux      (link: edgeIdx·2 + strand ; star: node index ; spark: 0 —
 *               small ints, exact in fp32; edgeIdx·2 ≤ ~500)
 *     speedVar (link: 0.7..1.3 flow-speed variance; star: 0.85..1.15 size
 *               variance; spark: 0.6..1.4 kick variance)
 *     rnd      (0..1 — tint variance / fray hashes)
 *   offA : vec3
 *     link:  [basePhase 0..1, jitter magnitude 0..1, jitter angle 0..2π]
 *     star:  the LITERAL offset from the node centre — [x, y, z] in HEIGHT
 *            fraction units (the shader multiplies x by uPlaneAspect so the
 *            star stays screen-round inside the anisotropically scaled group,
 *            and scales the whole vector by the flash/breath/kiss envelope).
 *            |xy| ranges 0 → STAR_FLARE_LEN and IS the star's radial
 *            parameter — particleScalars re-derives it, no extra channel.
 *     spark: [burst azimuth 0..2π, spare, elevation −1..1]
 *   seed : vec3 scattered start (reveal coalesce)
 *
 * Order: [link particles | star particles | sparks]. Link particles
 * distribute across the ~227 links ∝ link LENGTH (uniform visual density);
 * star particles round-robin the ~103 nodes, and each one is independently
 * hashed into the CORE blob (centre-weighted, r = R·U^STAR_CORE_CONC) or one
 * of the FOUR flare rays. Role budget: NODE_FRACTION stars, the rest link
 * TRAFFIC (broken gives SPARK_COUNT of it to the burst).
 *
 * ROUND-8-G re-split (the line layer draws the thread now, so the particles
 * that used to BE it are free): NODE_FRACTION 0.28 → 0.46 and
 * STAR_FLARE_FRACTION 0.42 → 0.70, i.e. per full-tier star 40.2 particles
 * (was 25) of which 7.0 per flare ray (was 2.6 — the round-8-D check's flag);
 * per link 21.3 traffic particles (was 28.4), enough that a PACKET_WIDTH bead
 * always spans ~3 sprites at ±1σ. Totals unchanged.
 */
/**
 * ROUND 12 · D — THE ROLLING κ-WINDOW's SIZE, in table entries.
 *
 * `bandAspect` IS the on-frame fraction of a 45° band (`rect.h / (L·rect.w)`
 * = 935/7278 = 12.85 %); `RIBBON_WINDOW_PAD` is hysteresis on top of it. Both
 * tables (nodes and edges) were sorted by κ in `buildPlexus`, so a window is
 * a contiguous index range and a particle's home is
 * `first + mod(baked − first, WINDOW)` — the identity inside the window, and
 * a re-home from the departing element to the arriving one (both off frame)
 * for exactly the 1/WINDOW of particles on the boundary.
 */
export function ribbonWindowSize(len: number, bandAspect: number): number {
  return Math.max(
    1,
    Math.min(len, Math.ceil(len * bandAspect * RIBBON_WINDOW_PAD)),
  );
}

function seedBuffers(count: number, mode: LatticeMode, plexus: Plexus) {
  const meta = new Float32Array(count * 4);
  const offA = new Float32Array(count * 3);
  const seed = new Float32Array(count * 3);

  const nodesTbl = plexus.nodes;
  const edgesTbl = plexus.edges;
  const nodeN = nodesTbl.length;
  const ribbon = plexus.shape === "ribbon";
  const sparkCount = mode === "broken" ? SPARK_COUNT : 0;
  // ROUND 12 · D — WINDOWED BUDGETS. `NODE_FRACTION` is RETIRED on the ribbon
  // arm: the star and link budgets are computed independently now (its 0.28 →
  // 0.46 raise was justified *because the line layer had taken over the thread
  // job*, and that justification left with the chord). Stars pay for the ~73
  // windowed nodes at the approved 40/star instead of all 389 — which is where
  // the 13 000 particles the strand needs come from.
  const winE = ribbon
    ? ribbonWindowSize(edgesTbl.length, plexus.bandAspect)
    : edgesTbl.length;
  const winN = ribbon ? ribbonWindowSize(nodeN, plexus.bandAspect) : nodeN;
  const starCount = ribbon
    ? Math.min(
        Math.max(count - sparkCount - 1, 0),
        winN * STAR_PER_NODE_RIBBON,
      )
    : Math.floor(count * NODE_FRACTION);
  const edgeTotal = count - starCount - sparkCount;

  // Length-proportional per-link particle counts (remainder → round-robin).
  //
  // ⚠ ROUND 12 · STAGE 2 FIX — "LENGTH" IS A SCREEN LENGTH, AND ON THE RIBBON
  // THE RAW ONE IS WRONG BY EXACTLY THE FIELD STRETCH.
  //
  // The generator chooses the topology in the SCREEN metric — `sd()` in
  // neuralLatticeConfig divides x by `bandAspect` before measuring, and drops
  // nothing — while this allocation measured `hypot(dx, dy, dz)` on the RAW
  // node table. On the shipped band those differ by 1/0.45 = 2.2×. On the
  // ribbon `bandAspect` is 0.12846 precisely BECAUSE `fieldMap` then stretches
  // x by `uFieldLen` = 3.791 (0.12846 = rect.h / (L · rect.w) = 935/7278), so
  // the two metrics differ by **7.784× — the stretch itself** — and an
  // x-dominant link is allocated 7.8× fewer particles per delivered screen
  // pixel than a y-dominant one. The delivered along-link spacing spreads
  // instead of being uniform, which on a field made of near-horizontal links
  // is most of the field.
  //
  // `dz` goes because z is DEPTH: it moves a particle toward or away from the
  // camera, not along the link on screen, and counting it inflates the budget
  // of the deepest links for a distance the reader never traverses.
  //
  // ⚠ RIBBON-ONLY, DELIBERATELY. `#production` and the `ribbon: false`
  // rollback keep the raw metric to the bit — the shipped allocation is what
  // the shipped look was approved at, and re-metricating it would re-cut every
  // link's particle budget on a band that never had the 7.8× error.
  const aspectK =
    plexus.shape === "ribbon" ? 1 / Math.max(plexus.bandAspect, 1e-6) : 0;
  const lens = edgesTbl.map(([a, b]) => {
    const dx = nodesTbl[b][0] - nodesTbl[a][0];
    const dy = nodesTbl[b][1] - nodesTbl[a][1];
    const dz = nodesTbl[b][2] - nodesTbl[a][2];
    return aspectK > 0
      ? Math.hypot(dx * aspectK, dy)
      : Math.hypot(dx, dy, dz);
  });
  const lenSum = lens.reduce((s, l) => s + l, 0) || 1;
  const perEdge = lens.map((l) => Math.floor((edgeTotal * l) / lenSum));
  let assigned = perEdge.reduce((s, n) => s + n, 0);
  for (let e = 0; assigned < edgeTotal; e = (e + 1) % perEdge.length) {
    perEdge[e]++;
    assigned++;
  }
  // ROUND 12 · D — ON THE RIBBON THE ALLOCATION IS PER RESIDUE CLASS, AND IT
  // IS UNIFORM. A particle's home edge is `first + mod(r − first, winE)`, so
  // its residue `r` is fixed for the whole act while the EDGE under it
  // changes; a length-proportional split would therefore be meaningless (the
  // class sees links of every length as the window rolls). Uniform is the
  // only self-consistent choice, and the delivered spacing is then
  // `L_screen / perClass` — which is why the strand's alpha is normalised by
  // its own delivered overlap in `particleScalars` rather than assumed flat.
  const perClass = new Array<number>(winE).fill(0);
  if (ribbon) {
    const base = Math.floor(edgeTotal / winE);
    for (let c = 0; c < winE; c++) perClass[c] = base;
    let rem = edgeTotal - base * winE;
    for (let c = 0; rem > 0; c = (c + 1) % winE) {
      perClass[c]++;
      rem--;
    }
  }
  const alloc = ribbon ? perClass : perEdge;

  let edgeIdx = 0;
  let edgeFill = 0;

  for (let i = 0; i < count; i++) {
    const r0 = h(i, 12.9898, 78.233);
    const r1 = h(i, 39.3467, 11.135);
    const r2 = h(i, 73.156, 52.235);
    const r3 = h(i, 91.318, 27.719);

    if (i >= edgeTotal + starCount) {
      // SPARK particle (broken only) — analytic burst from the fracture pt.
      meta[i * 4] = 2;
      meta[i * 4 + 1] = 0;
      meta[i * 4 + 2] = 0.6 + r1 * 0.8; // kick variance
      meta[i * 4 + 3] = r3;
      offA[i * 3] = r0 * Math.PI * 2; // burst azimuth
      offA[i * 3 + 1] = r2; // spare
      offA[i * 3 + 2] = (r1 - 0.5) * 2; // elevation −1..1
    } else if (i < edgeTotal) {
      // LINK particle — advance the assignment (∝ length off-ribbon, uniform
      // per residue class on the ribbon).
      while (edgeFill >= alloc[edgeIdx] && edgeIdx < alloc.length - 1) {
        edgeIdx++;
        edgeFill = 0;
      }
      edgeFill++;
      const strand = Math.floor(r0 * STRAND_COUNT) % STRAND_COUNT;
      meta[i * 4] = 0;
      meta[i * 4 + 1] = edgeIdx * 2 + strand;
      // ── F3 — `speedVar` IS PER-LINK ON THE RIBBON, NOT PER-PARTICLE ──────
      // or F2's comb shears back into a Poisson train within seconds, and
      // with it the 3.6× in particle count the comb buys. Off-ribbon it stays
      // the shipped per-particle hash, to the bit.
      meta[i * 4 + 2] = ribbon
        ? 0.7 + h(edgeIdx, 39.3467, 11.135) * 0.6
        : 0.7 + r1 * 0.6; // flow-speed variance
      meta[i * 4 + 3] = r3;
      // ── F2 — STRATIFY THE FLOW PHASE. Worth 3.6× on its own. ────────────
      // Positions are `fract(basePhase + t·speed·speedVar)`; off a RANDOM
      // basePhase that is a POISSON train, whose shot ripple (σ/μ = 0.84/√Ω)
      // needs S/s ≥ 6.0 before it reads as a smooth line. A COMB needs
      // **1.65** (ripple 2·exp(−2π²(S/4s)²) = 6.9 %, verified against the
      // shipped `smoothstep(0.5, 0.12, r)` disc profile at ±3 % peak-to-
      // trough). `edgeFill` is 1-based here, so `−0.5` centres the comb.
      offA[i * 3] = ribbon
        ? (edgeFill - 0.5) / Math.max(alloc[edgeIdx], 1)
        : r2; // basePhase
      // Jitter magnitude biased toward the core (sqrt keeps a bright center,
      // a softer fringe) — also the white-cyan→cyan→blue radial tint driver.
      offA[i * 3 + 1] = Math.sqrt(r0);
      offA[i * 3 + 2] = r1 * Math.PI * 2;
    } else {
      // STAR-CORE particle — round-robin across the cloud's nodes, then a
      // per-particle hash decides CORE blob vs FLARE ray. Both bake a literal
      // offset vector, so nothing orbits and nothing is hollow.
      const node = (i - edgeTotal) % (ribbon ? winN : nodeN);
      meta[i * 4] = 1;
      meta[i * 4 + 1] = node;
      meta[i * 4 + 2] = 0.85 + r1 * 0.3; // per-particle size variance
      meta[i * 4 + 3] = r3;
      const zj = (h(i, 23.71, 61.33) - 0.5) * 2 * STAR_Z;
      if (r0 < STAR_FLARE_FRACTION) {
        // FLARE: one of 4 rays on two perpendicular axes (the reference's
        // star spikes), with a small perpendicular jitter so a ray reads as
        // a taper rather than a hairline.
        const ang = (Math.floor(r2 * 4) % 4) * (Math.PI / 2);
        const d =
          STAR_FLARE_LEN * Math.pow(0.12 + r1 * 0.88, STAR_FLARE_POW);
        const j = (h(i, 55.31, 9.17) - 0.5) * 2 * STAR_SPIKE_JITTER;
        offA[i * 3] = Math.cos(ang) * d - Math.sin(ang) * j;
        offA[i * 3 + 1] = Math.sin(ang) * d + Math.cos(ang) * j;
        offA[i * 3 + 2] = zj * 0.4;
      } else {
        // CORE: centre-weighted blob — U^CONC piles the density at r = 0.
        const th = r2 * Math.PI * 2;
        const rho = STAR_CORE_R * Math.pow(r1, STAR_CORE_CONC);
        offA[i * 3] = Math.cos(th) * rho;
        offA[i * 3 + 1] = Math.sin(th) * rho;
        offA[i * 3 + 2] = zj;
      }
    }

    // Scattered seed (loose cloud) — matches the kernel's analytic re-derive.
    // ROUND 13c — on the ribbon the seed is an OFFSET FROM THE ANCHOR (the
    // materialise-in-place coalesce), so it bakes at the small local scatter;
    // non-ribbon keeps the round-2 absolute origin-scatter values bit-exact.
    seed[i * 3] =
      (h(i, 127.1, 311.7) - 0.5) *
      (ribbon ? SEED_SCATTER_RIBBON : SEED_SCATTER_XY);
    seed[i * 3 + 1] =
      (h(i, 269.5, 183.3) - 0.5) *
      (ribbon ? SEED_SCATTER_RIBBON : SEED_SCATTER_XY);
    seed[i * 3 + 2] =
      (h(i, 419.2, 371.9) - 0.5) *
      (ribbon ? SEED_SCATTER_Z_RIBBON : SEED_SCATTER_Z);
  }

  // `perLink` is the number of sprites a link carries at any instant — a
  // build-time constant on the ribbon (every edge keeps a fixed residue
  // class), and the denominator of the delivered along-link spacing.
  return {
    meta,
    offA,
    seed,
    edgeTotal,
    starCount,
    perLink: edgeTotal / Math.max(ribbon ? winE : edgesTbl.length, 1),
  };
}

export function createNeuralFieldBuild(
  args: NeuralFieldBuildArgs,
): NeuralFieldBuild {
  const { webgpu, tsl, gl, backendIsWebGPU, count, mode } = args;
  const plexusSeed = args.plexusSeed;
  const plexusWell = args.plexusWell !== false;
  const plexusParams = args.plexusParams;
  /** ROUND 12 · STAGE 2 — is this build the D17 continuous field? Read ONCE,
   * from the generator arm that was actually asked for, so the shader graph
   * and the delivered constellation can never disagree about it. */
  const ribbon = plexusParams?.shape === "ribbon";
  const {
    InstancedBufferGeometry,
    BufferGeometry,
    BufferAttribute,
    InstancedBufferAttribute,
    MeshBasicNodeMaterial,
    LineBasicNodeMaterial,
    LineSegments,
    Color,
    Vector2,
    Vector3,
    Vector4,
    AdditiveBlending,
    DoubleSide,
  } = webgpu as Any;
  const {
    uniform,
    uniformArray,
    attribute,
    instancedArray,
    instanceIndex,
    positionLocal,
    modelViewMatrix,
    cameraProjectionMatrix,
    Fn,
    If,
    vec2,
    vec3,
    vec4,
    float,
    int,
    length,
    max,
    min,
    clamp,
    sin,
    cos,
    floor,
    fract,
    mix,
    pow,
    smoothstep,
    Discard,
    varying,
    select,
    exp,
    fwidth,
    cross,
  } = tsl as Any;

  // Density preset: the compact particle budget is the phone tier, so the
  // same signal selects the thinner cloud. Read from the ARG (never a store
  // subscription inside the Canvas island — the R3F commit wedge).
  const density: PlexusDensity =
    count <= NEURAL_PARTICLE_COUNT_COMPACT ? "lite" : "full";
  const plexus = getPlexus(mode, density, plexusSeed, plexusWell, plexusParams);
  const { meta, offA, seed, edgeTotal, starCount, perLink } = seedBuffers(
    count,
    mode,
    plexus,
  );
  const ctrlInit = plexus.centroids;

  // --- Shared uniforms ------------------------------------------------------
  const uTime = uniform(0);
  const uReveal = uniform(0);
  const uBroken = uniform(mode === "broken" ? 1 : 0);
  // ── ROUND 12 · D — THE RIBBON ARM'S OWN SIZING/ALPHA LEDGER ─────────────
  // Eight constants `#production` shares with the ribbon, selected here by a
  // BUILD-TIME JS ternary. On every non-ribbon build these evaluate to the
  // shipped module constants, so the node graph bakes identical `float()`
  // literals and the band is unmoved to the bit ({101, 229}, checksum
  // −420.464007). See the ROUND 12 · D block in neuralLatticeConfig for the
  // unit law (S_css = NEURAL_POINT_SIZE·sizeK/12) and the two-regime law.
  const RIB = plexus.shape === "ribbon";
  const K_DUST_SIZE = RIB ? DUST_SIZE_RIBBON : DUST_SIZE;
  // ROUND 12 — the links curve. 0 on every non-ribbon build, so the node
  // graph bakes the identical straight-chord expression `#production` has
  // always baked (`bend` folds to a zero vector at build time is NOT relied
  // on — the ternary skips the whole term, see edgeFrame).
  const K_LINK_BEND = RIB ? LINK_BEND_RIBBON : 0;
  const K_BEND_MAX = LINK_BEND_MAX_RIBBON;
  const K_BEND_ROLL = LINK_BEND_ROLL_RIBBON;
  const K_LINK_TAPER = RIB ? LINK_TAPER_RIBBON : 1;
  const K_CORE_BOOST = RIB ? CORE_SIZE_BOOST_RIBBON : CORE_SIZE_BOOST;
  const K_FRINGE_DROP = RIB ? FRINGE_SIZE_DROP_RIBBON : FRINGE_SIZE_DROP;
  const K_PACKET_SIZE = RIB ? PACKET_SIZE_RIBBON : PACKET_SIZE;
  const K_STATIC_ELONG = RIB ? STATIC_ELONG_RIBBON : STATIC_ELONG;
  const K_FLOW_SPEED = RIB ? FLOW_SPEED_RIBBON : FLOW_SPEED;
  const K_STREAM_ALPHA = RIB ? STREAM_ALPHA_RIBBON : STREAM_ALPHA;
  const K_BEAD_ALPHA = RIB ? BEAD_ALPHA_RIBBON : BEAD_ALPHA;
  // ROUND 13 — the conduit. On every non-ribbon build these bake the exact
  // literals the round-8 graph baked (radius 0 ⇒ the strand terms stay the
  // sub-pixel jitter `#production` has always drawn).
  const K_STRAND_RADIUS = RIB ? STRAND_RADIUS_RIBBON : STRAND_RADIUS;
  const K_STRAND_THICK = RIB ? STRAND_THICKNESS_RIBBON : STRAND_THICKNESS;
  const K_BRAID_TURNS = RIB ? BRAID_TURNS_RIBBON : BRAID_TURNS;
  const K_RATE_BASE = RIB ? STRAND_RATE_BASE_RIBBON : STRAND_RATE_BASE;
  const K_RATE_STEP = RIB ? STRAND_RATE_STEP_RIBBON : STRAND_RATE_STEP;
  const K_SWIRL = RIB ? STRAND_SWIRL_RIBBON : 0;
  const uFlowSpeed = uniform(K_FLOW_SPEED);
  const uFracture = uniform(FRACTURE_T);
  const uRecohere = uniform(0);
  const uSurgeT = uniform(-1);
  const uSurgeAmp = uniform(0);
  const uFlash = uniform(0);
  const uRingGlow = uniformArray([1, 1, 1]);
  const uRingFlash = uniformArray([0, 0, 0]);
  const uC0 = uniform(new Vector3(...ctrlInit[0]));
  const uC1 = uniform(new Vector3(...ctrlInit[1]));
  const uC2 = uniform(new Vector3(...ctrlInit[2]));
  const uC3 = uniform(new Vector3(...ctrlInit[3]));
  const uC4 = uniform(new Vector3(...ctrlInit[4]));
  // Round-8-D plexus tables — the SAME four uniformArrays as round-6, just
  // longer. `.element()` is legal in any stage and costs no storage-buffer /
  // vertex-slot budget, so the whole cloud stays a live-tunable uniform write
  // (positions/endpoints; the COUNTS are build-time).
  //
  // UNIFORM-ARRAY WALL ARITHMETIC (three r184 UniformArrayNode pads EVERY
  // element to a vec4 = 16 B — see getPaddedType/setup):
  //   uNodePos  ~103 vec3  → 103·16 =  1,648 B
  //   uNodeT    ~103 float → 103·16 =  1,648 B
  //   uEdgePack   57 vec4  →  57·16 =    912 B  (227 links, 4 per element)
  //                                             (Σ ≈ 4.2 KB, 3 bindings)
  // vs. WebGPU maxUniformBufferBindingSize 64 KiB and the WebGL2
  // MAX_UNIFORM_BLOCK_SIZE floor 16 KiB. ROUND 12 · STAGE 0B replaced the
  // two float endpoint arrays (uEdgeA/uEdgeB — 3,632 B AND a whole UBO block
  // EACH) with one packed vec4 array; see the EDGE_PACKED note at module
  // scope for the arithmetic, the exactness proof and the rollback lever.
  //
  // ⚠ BLOCK-COUNT BUDGET — READ BEFORE ADDING AN ARRAY. GLSLNodeBuilder
  // emits ONE UBO per uniformArray (`uniform.type === 'buffer'` → its own
  // `uniform Name { T name[N]; };`), and the particle material's VERTEX stage
  // references EIGHT of them: uNodePos, uNodeT, uEdgePack (edgeFrame /
  // anchorNode), uRingGlow, uRingFlash (zoneGlow / zoneFlash inside
  // particleScalars, which runs vertex-side because its outputs feed
  // varyings), uRowGlow (rowResponse + widthEnvelope) and uStrandPhase /
  // uStrandThick (anchorNode). On top of those sit three's own shared groups
  // (how many, exactly, is the measured question THE TRUE COUNT below answers
  // — it is two, not the three every earlier draft assumed).
  //
  // ⚠ THE TRUE COUNT — MEASURED ON THE FALLBACK BACKEND, NOT DERIVED, AND IT
  // IS NOT WHAT THIS NOTE USED TO SAY. Every earlier draft read "9 arrays +
  // up to 3 shared groups = 12 of 12, ZERO headroom"; the shared-group term
  // was never verified. ROUND 12 · STAGE 0B measured it: the WebGL2 GLSL was
  // captured live (patch `WebGL2RenderingContext.prototype.shaderSource`,
  // load `?backend=webgl2`, count `uniform <Name> { … };` in each stage) at
  // HEAD and after packing. Three emits exactly **2** shared groups here,
  // `object` and `render` — there is no `frame` group in these stages:
  //
  //   particle VERTEX    11 → 10 blocks   (9→8 arrays + object + render)
  //   particle FRAGMENT   9 →  8 blocks   (8→7 arrays + object)
  //   line     VERTEX     7 →  6 blocks   (5→4 arrays + object + render)
  //
  // So the shipped particle vertex stage was at **11 of 12**, not 12 of 12 —
  // it had ONE spare block, not zero — and packing takes it to 10 of 12, two
  // spare, against the WebGL2 MAX_VERTEX_UNIFORM_BLOCKS guaranteed minimum of
  // 12 (and the same WebGPU maxUniformBuffersPerShaderStage default of 12).
  // Note the FRAGMENT stage also carries the plexus arrays (it was 9 of 12
  // against MAX_FRAGMENT_UNIFORM_BLOCKS, now 8): a new array costs a block in
  // BOTH stages that read it. Two spare is not licence — the ROUND 12 band
  // needs one of them. Fold new per-node scalars into a spare component of an
  // EXISTING array instead. uMembraneSeal / uMembranePhase do not count: they
  // are only read by buildMembraneLayer, which MEMBRANE_ALPHA = 0 skips.
  //
  // Nothing was baked into the per-particle buffers, so the 4-storage-buffer /
  // 5-vertex-slot render budget documented in gpgpuNodeSim.ts is untouched.
  const nodeTbl = plexus.nodes;
  const edgeTbl = plexus.edges;
  const uNodePos = uniformArray(
    nodeTbl.map((p: [number, number, number]) => new Vector3(...p)),
  );
  const uNodeT = uniformArray([...plexus.nodeT]);
  // ROUND 12 · STAGE 0B — the UNPACKED endpoint pair. Kept, built and
  // exported so `EDGE_PACKED = false` is a byte-for-byte rollback; while
  // packing is on NOTHING references these in a node graph, and a
  // uniformArray no material reads emits no UBO block and is never uploaded
  // (UniformArrayNode allocates its padded value buffer in setup(), and
  // NodeUpdateType.RENDER only ticks nodes that ARE in a built graph).
  const uEdgeA = uniformArray(edgeTbl.map((e: [number, number]) => e[0]));
  const uEdgeB = uniformArray(edgeTbl.map((e: [number, number]) => e[1]));
  /** Node / link counts of THIS build (clamp ceilings for the aux decode). */
  const NODE_N = nodeTbl.length;
  const EDGE_N = edgeTbl.length;
  /**
   * ROUND 12 · D — THE ROLLING κ-WINDOW. Both tables were sorted by
   * `κ = u + dir·R·bandAspect·v` in `buildPlexus` (ribbon only), so the
   * on-frame set is a contiguous index range in each and a particle's live
   * home is `first + mod(baked − first, WIN)` — the identity everywhere
   * inside the window. The two `first` scalars are plain `uniform()`s, so
   * they cost ZERO UBO blocks in either stage (see the block budget above);
   * the two sizes are build-time and bake as `float()` literals.
   *
   * OFF-RIBBON `WIN_E === EDGE_N` and `WIN_N === NODE_N` and the whole
   * mechanism is compiled out by the `RIB` ternaries at its two call sites.
   */
  const WIN_E = RIB ? ribbonWindowSize(EDGE_N, plexus.bandAspect) : EDGE_N;
  const WIN_N = RIB ? ribbonWindowSize(NODE_N, plexus.bandAspect) : NODE_N;
  const uWinFirstEdge = uniform(0);
  const uWinFirstNode = uniform(0);
  /** Screen-y of the frame's centre in mapped-local units — the SAME number
   * `uCopyYc` carries, on its own uniform so the window fade can never be
   * left un-driven by a disabled copy lane. */
  const uWinYc = uniform(0);
  /** The frame's half-height in the shader's own y unit (`ih / (2·rect.h)`).
   * The fade thresholds are MULTIPLES of it, never absolute band-heights —
   * the band pin is `svh` and `rect.h` ≠ `size.height` on a phone. */
  const uWinHalf = uniform(0.5);
  /** 1 on a live ribbon, 0 everywhere else: gates the window FADE only (the
   * re-home itself is compiled out off-ribbon). */
  const uWinOn = uniform(0);
  // ── ROUND 12 · D — MOTION IS LIGHT ──────────────────────────────────────
  // Four plain `uniform()` scalars on one shared phase axis. `uFront` is the
  // BIRTH front and a pure function of `p`; `uRiver` is the LIGHT phase and
  // carries its own clock (`RIVER_RATE`) so the crests keep travelling when
  // the reader stops — without that a stopped reader sees frozen bright
  // patches, the direct contradiction of the brief.
  const uFront = uniform(RIB ? 0 : 1e6);
  const uRiver = uniform(0);
  const uFrontW = uniform(FRONT_W);
  const uFrontKy = uniform(0);
  const uFrontC = uniform(0);
  /** The copy lane's floor for the LINK/continuity role — the chord's vacated
   * 15 % of the AA budget, given to the strand. Driver-written on the same
   * lane window as `uCopyFloor` / `uCopyLineFloor`. */
  const uCopyStreamFloor = uniform(COPY_MASK_FLOOR_STREAM);
  /**
   * ROUND 12 · STAGE 0B — the PACKED endpoint table. Element j carries links
   * 4j … 4j+3 in x/y/z/w as `a + EDGE_PACK_RADIX·b`; the tail of the last
   * element is zero-padded and is NEVER read (both callers clamp their edge
   * index to EDGE_N-1 first, so no lane past the last link is reachable).
   * Built once, zero per-frame allocation.
   */
  const uEdgePack = uniformArray(
    (() => {
      const n = Math.max(1, Math.ceil(EDGE_N / EDGE_PACK_STRIDE));
      const packed: Any[] = new Array(n);
      for (let j = 0; j < n; j++) {
        const c = [0, 0, 0, 0];
        for (let k = 0; k < EDGE_PACK_STRIDE; k++) {
          const e = j * EDGE_PACK_STRIDE + k;
          if (e < EDGE_N) {
            c[k] = edgeTbl[e][0] + EDGE_PACK_RADIX * edgeTbl[e][1];
          }
        }
        packed[j] = new Vector4(c[0], c[1], c[2], c[3]);
      }
      return packed;
    })(),
  );
  const uPointer = uniform(new Vector3(1e9, 1e9, 1e9));
  const uPixelRatio = uniform(1);
  const uViewport = uniform(new Vector2(1, 1));
  const uColCore = uniform(new Color(COL_CORE));
  const uColCyan = uniform(new Color(COL_CYAN));
  const uColBlue = uniform(new Color(COL_BLUE));
  const uColEmber = uniform(new Color(COL_EMBER));
  const uColEmber2 = uniform(new Color(COL_EMBER2));
  // Round-7: the frayed tips warm toward amber (internal, like the ramp
  // colors above — not in the tunables bag).
  const uColEmberTip = uniform(new Color(COL_EMBER_TIP));
  const uPointSize = uniform(NEURAL_POINT_SIZE);
  // Round-2 live tunables (dev-handle surfaced; defaults from config).
  // ROUND-8-F: this default was a bare literal 1 — it is ENVELOPE_BASE (1.8)
  // now, so the shipped filament width is authored in neuralLatticeConfig with
  // the rest of the look. Live overrides via the dev handle are unchanged.
  // ROUND 13b — ribbon-only envelope/DOF/punch defaults (live-tuned).
  const uEnvelope = uniform(RIB ? ENVELOPE_BASE_RIBBON : ENVELOPE_BASE);
  const uBreathe = uniform(BREATHE_AMP);
  const uShimmer = uniform(SHIMMER_AMP);
  const uZBow = uniform(STREAM_Z_BOW);
  const uGap = uniform(FRACTURE_GAP_T);
  const uStretchGain = uniform(STRETCH_GAIN);
  const uStretchMax = uniform(STRETCH_MAX);
  const uSurgeGain = uniform(SURGE_GAIN);
  // Round-7: ambient packet traffic knobs (dev-handle uniforms bag).
  const uPacketRate = uniform(PACKET_RATE);
  const uPacketWidth = uniform(PACKET_WIDTH);
  const uPacketGain = uniform(PACKET_GAIN);
  // Round-8-D star knobs (dev-handle `uniforms` bag). The star GEOMETRY is
  // baked per particle, so these scale it: uStarSpread stretches/shrinks the
  // whole baked offset (core blob AND flare rays together), uStarPunch scales
  // the >1.0 core emissive, uNodeAlpha the star opacity. Node COUNT and the
  // core/flare split are BUILD-TIME (PLEXUS_SEEDS / STAR_FLARE_FRACTION) —
  // changing those needs a rebuild, not a uniform write.
  // ROUND-8-F: the first two defaults were bare literal 1s; they are the
  // live-measured STAR_SPREAD / STAR_PUNCH config constants now (same dev
  // handle, same override path — only the shipped starting point moved).
  const uStarSpread = uniform(STAR_SPREAD);
  const uStarPunch = uniform(RIB ? STAR_PUNCH * STAR_PUNCH_RIBBON_K : STAR_PUNCH);
  const uNodeAlpha = uniform(NODE_ALPHA);
  // ROUND-8-G: link particles are TRAFFIC (dust floor ↔ bead peak) and the
  // thread they ride is the LINE layer. All plain `uniform()` scalars — they
  // join an existing shared group, so they add ZERO uniform BLOCKS to either
  // program (the block-count budget note above is unmoved).
  // ROUND 12 · D — the ribbon's own ledger (`K_*`, selected at build). At
  // 0.012 the strand was 0.0042 after the overlap normaliser: invisible, and
  // the picture was beads on darkness — the exact failure this round removes.
  const uDustAlpha = uniform(K_STREAM_ALPHA);
  const uBeadAlpha = uniform(K_BEAD_ALPHA);
  const uLineAlpha = uniform(LINE_ALPHA);
  const uLineEmissive = uniform(LINE_EMISSIVE);
  const uLineLumMax = uniform(LINE_LUM_MAX);
  const uLineBlue = uniform(LINE_BLUE_MIX);
  const uLineSurgeGain = uniform(LINE_SURGE_GAIN);
  const uLineRowGain = uniform(LINE_ROW_GAIN);
  const uStrandPhase = uniformArray([...STRAND_PHASES]);
  const uStrandThick = uniformArray([...STRAND_THICK_BIAS]);
  // ROUND 9-B: the COPY-COLUMN MASK (see the config section of the same name).
  // SIX plain `uniform()` scalars — like the round-8-G traffic knobs they join
  // an existing shared group, so they add ZERO uniform BLOCKS to either program
  // and the particle-material block budget noted above is unmoved (round 11
  // added `uCopyLaneW`; it is a plain scalar, not a `uniformArray`, so the
  // vertex stage is untouched — see the BLOCK-COUNT BUDGET note above for the
  // measured figures). The lane pair is DRIVER-WRITTEN
  // from the measured `[data-row-body]` boxes (NeuralLattice); the default is
  // the 1280 worst case + COPY_EDGE_PAD so an un-driven build (a driver that
  // never runs, a measure that finds no body box) is the SAFE state, never a
  // full-strength net over the copy.
  // ROUND 11: the half-plane is now a LANE, and its default pair is the
  // half-plane-equivalent one (COPY_LANE_OPEN_W's note carries the identity).
  // ROUND 12 · STAGE 2 — the half-plane-equivalent width is sized on the
  // FIELD this build carries: 2.0 puts the lane's unused left wall at local
  // x ≈ −1.5, which is outside a ±0.5 band and INSIDE a ±1.895 ribbon (see
  // COPY_LANE_OPEN_W_RIBBON). Same identity, same two uniforms, no new state.
  const laneOpenW = ribbon ? COPY_LANE_OPEN_W_RIBBON : COPY_LANE_OPEN_W;
  const uCopyLaneC = uniform(COPY_EDGE_LOCAL + COPY_EDGE_PAD - laneOpenW);
  const uCopyLaneW = uniform(laneOpenW);
  const uCopySoft = uniform(COPY_RAMP_SOFT);
  const uCopyFloor = uniform(COPY_MASK_FLOOR);
  const uCopyLineFloor = uniform(COPY_MASK_FLOOR_LINE);
  const uCopyYFloor = uniform(COPY_Y_FLOOR);
  // ─── ROUND 12 · STAGE 2 FIX — THE DEEP FLOOR'S VERTICAL EXTENT ───────────
  // Four plain `uniform()` scalars, i.e. ZERO new UBO blocks in either stage
  // (they join one of three's shared groups, the same precedent as every knob
  // above them — measured budget: particle vertex 10/12, fragment 8/12, line
  // vertex 6/12, unmoved). Driver-written per frame from the traverse's own
  // frozen snapshot; ALL FOUR DEFAULT TO THE SHIPPED BEHAVIOUR, and
  // `uCopyRowLocal = 0` makes that byte-exact rather than merely close.
  /** Reading-band centre in mapped local y — `(cy − yRegPx − ih/2)/rect.h`.
   * 0 = the shipped band (`y.sub(0.0)` is bit-exact). */
  const uCopyYc = uniform(0);
  /** The carve-out's centre in the SAME re-centred coordinate: the tracked
   * reading unit's screen centre, as a band-height fraction below `ih/2`. */
  const uCopyRowC = uniform(0);
  /** Its half-height + `COPY_ROW_PAD`, band-height fractions. */
  const uCopyRowH = uniform(1);
  /** The ramp out of it. */
  const uCopyRowSoft = uniform(COPY_ROW_SOFT);
  /** 0 = the shipped 1-D wall (bit-exact); 1 = the wall gets a ceiling and a
   * sill. Written 1 ONLY on a band that is both a live ribbon and lane-driven,
   * which is the only configuration whose field is wider than the frame. */
  const uCopyRowLocal = uniform(0);
  // Round-3 (§B): row-reactive current + curl turbulence + depth-DOF. All
  // uniforms/uniformArrays — the storage-buffer and vertex-slot budgets are
  // untouched.
  const uRowGlow = uniformArray([0, 0, 0]);
  const uCurl = uniform(CURL_GAIN);
  // ROUND-8-F: was a bare literal 1 — the live-measured DOF_STRENGTH (0.45)
  // now, since full-strength DOF was smearing the far stars into dust.
  const uDof = uniform(RIB ? DOF_STRENGTH_RIBBON : DOF_STRENGTH);
  const uRowGain = uniform(ROW_GAIN);
  const uRowSwell = uniform(ROW_SWELL);
  // Round-4 (§B): scroll-velocity net + membrane/nebula layers. All plain
  // uniforms/uniformArrays again — the storage-buffer and particle-material
  // vertex-slot budgets stay untouched. The layers only referenced by the
  // OTHER mode's build are dead nodes (never compiled into any material).
  const uScrollVel = uniform(0);
  const uFlowTime = uniform(0);
  // ROUND 13 — on the ribbon the velocity boosts init to their _RIBBON kills
  // (the owner's "the construction particles must not be seen flying" note —
  // see the config block). Same uniforms, same driver, ribbon-only defaults.
  const uVelSwell = uniform(RIB ? VEL_SWELL_RIBBON : VEL_SWELL);
  const uVelStretch = uniform(RIB ? VEL_STRETCH_RIBBON : VEL_STRETCH);
  // driver-read only (flow-clock gain)
  const uVelFlow = uniform(RIB ? VEL_FLOW_RIBBON : VEL_FLOW);
  const uVelCurl = uniform(RIB ? VEL_CURL_RIBBON : VEL_CURL);
  const uVelDebris = uniform(VEL_DEBRIS);
  const uVelNorm = uniform(VEL_NORM); // driver-read only (normalization)
  const uMembraneSeal = uniformArray([0, 0, 0]);
  const uMembranePhase = uniformArray([0, 0, 0]);
  const uMembraneAlpha = uniform(MEMBRANE_ALPHA);
  const uMembraneBulge = uniform(MEMBRANE_BULGE);
  const uPlaneAspect = uniform(0.5);
  /** The band anchor's height in CSS px — the one scalar that turns a LOCAL
   * length into a delivered SCREEN length, which is what the continuity law
   * is written in. Driver-written; 0 leaves the normalisation inert. */
  const uBandPx = uniform(0);
  const uNebulaDrift = uniform(0);
  const uNebulaAlpha = uniform(NEBULA_ALPHA);
  // ─── ROUND 12 · STAGE 2 — THE FIELD MAPPING ──────────────────────────────
  // FIVE plain `uniform()` scalars, and "plain" is the whole reason they are
  // affordable: `uniform()` joins one of three's SHARED groups, so these cost
  // **zero UBO blocks** in either stage (the precedent is every knob above
  // them; a `uniformArray` would have cost a block in BOTH stages that read
  // it, against a measured 10/12 and 8/12).
  //
  // The mapping itself lives in `fieldMap()` and is called from exactly TWO
  // accessors — `nodeAt()` and `streamCenter()` — which is every path by which
  // authored plexus coordinates reach a position. Identity is `(1, 0, 0)` with
  // the node's raw x carried straight through, so `#production` compiles to
  // `x·1 + 0` and `y + 0·x`: bit-exact, which is what the byte-for-byte
  // contract needs (`(u − 0.5)·L` would NOT be).
  /** Field length in BAND-WIDTH units. 1 = the shipped band. */
  const uFieldLen = uniform(1);
  /** Field centre offset in band-width units. 0 = centred, always, today. */
  const uFieldOrigin = uniform(0);
  /** The ribbon shear `μ` — see `bandFieldSlope` in traverseConfig for the
   * derivation and for why it is the sharpest available check on the driver. */
  const uFieldSlope = uniform(0);
  /** `1 / uFieldLen`. The LOCAL-units forces (the pointer bend, the curl) are
   * divided by it so the steady-state excursion stays under the recycle-snap
   * threshold, which falls with the shortest delivered link on a long field.
   * 1 on the band ⇒ every force multiplied by exactly 1.0 ⇒ bit-exact. */
  const uFieldK = uniform(1);
  /** THE EXIT FADE (FIELD_EXIT_VH). 1 everywhere except the last ~1 vh of the
   * act, where it rides a smoothstep to 0 — because the ribbon's screen y is
   * constant in `p`, so the section ends with the net dead centre and there is
   * no natural exit to fall back on. Multiplied into the copy masks, which is
   * what makes it reach the ALPHA and the DISCARD THRESHOLD together on both
   * layers: a fade one of them misses is a pop, not a fade. */
  const uFieldFade = uniform(1);

  // --- Geometry: shared billboard quad + per-instance role attributes -------
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(QUAD_CORNERS), 3),
  );
  geometry.setIndex(new BufferAttribute(new Uint16Array(QUAD_INDEX), 1));
  geometry.setAttribute("aMeta", new InstancedBufferAttribute(meta, 4));
  geometry.setAttribute("aOff", new InstancedBufferAttribute(offA, 3));
  geometry.setAttribute("aSeed", new InstancedBufferAttribute(seed, 3));
  geometry.instanceCount = count;

  // ------------------------------------------------------------------------
  // In-shader spline: Catmull-Rom through the 5 control-point uniforms.
  // ------------------------------------------------------------------------
  function ctrl(idx: Any): Any {
    const i0 = idx.lessThan(float(0.5));
    const i1 = idx.lessThan(float(1.5));
    const i2 = idx.lessThan(float(2.5));
    const i3 = idx.lessThan(float(3.5));
    return select(
      i0,
      uC0,
      select(i1, uC1, select(i2, uC2, select(i3, uC3, uC4))),
    );
  }
  /** Catmull-Rom over 4 equal segments, t ∈ [0,1]. */
  function splineCR(t: Any): Any {
    const x = clamp(t, float(0), float(0.99999)).mul(4.0).toVar();
    const seg = floor(x).toVar();
    const u = x.sub(seg).toVar();
    const p0 = ctrl(max(seg.sub(1.0), float(0))).toVar();
    const p1 = ctrl(seg).toVar();
    const p2 = ctrl(min(seg.add(1.0), float(4))).toVar();
    const p3 = ctrl(min(seg.add(2.0), float(4))).toVar();
    const u2 = u.mul(u);
    const u3 = u2.mul(u);
    return p1
      .mul(2.0)
      .add(p2.sub(p0).mul(u))
      .add(
        p0
          .mul(2.0)
          .sub(p1.mul(5.0))
          .add(p2.mul(4.0))
          .sub(p3)
          .mul(u2),
      )
      .add(p3.sub(p0).add(p1.sub(p2).mul(3.0)).mul(u3))
      .mul(0.5);
  }
  /** The bowed REGISTRATION SPINE: the centroid spline + a slight z-bow
   * toward the camera at t=0.5. Round-6: no particles ride it — only the
   * membranes (layer centroids), the fracture point (nebula + spark origin)
   * and the row windows read it, so their registration stays exact. */
  function streamCenter(t: Any): Any {
    const tc = clamp(t, float(0), float(1));
    // ROUND 12 · STAGE 2 — mapped through the SAME `fieldMap` the nodes go
    // through (the control points are the cloud's own x-slice centroids, in
    // the cloud's own authored frame). The z-bow is added AFTER the map, on
    // purpose: it is a camera-facing bow in FINAL local space, not a property
    // of the authored field, and mapping it would shear it with everything
    // else. Identity mapping ⇒ this whole line is a no-op, to the bit.
    return fieldMap(splineCR(tc)).add(
      vec3(float(0), float(0), sin(tc.mul(Math.PI)).mul(uZBow)),
    );
  }

  function ringGlowAt(idx: Any): Any {
    return uRingGlow.element(int(clamp(idx, float(0), float(2)))) as Any;
  }
  function ringFlashAt(idx: Any): Any {
    return uRingFlash.element(int(clamp(idx, float(0), float(2)))) as Any;
  }
  function strandPhaseAt(idx: Any): Any {
    return uStrandPhase.element(int(clamp(idx, float(0), float(3)))) as Any;
  }
  function strandThickAt(idx: Any): Any {
    return uStrandThick.element(int(clamp(idx, float(0), float(3)))) as Any;
  }
  /**
   * ROUND 12 · STAGE 2 — THE FIELD MAPPING. Authored plexus coordinates
   * `(u, v, w)` → the LOCAL space everything downstream already works in.
   *
   *     x = u·uFieldLen + uFieldOrigin
   *     y = v + uFieldSlope·x
   *     z = w
   *
   * ⚠ `y` SHEARS ON THE MAPPED x, NOT ON `u`. The shear has to be a function
   * of where the point IS on screen, and `uFieldOrigin` is part of that.
   *
   * IDENTITY IS BIT-EXACT AND THAT IS A REQUIREMENT, NOT A NICETY. At
   * `(1, 0, 0)` this is `u·1 + 0` and `v + 0·(u·1 + 0)`: IEEE-754 multiply by
   * 1.0 and add of a true zero are both exact, so `#production` delivers the
   * same floats it delivered before this stage existed. Writing the map as
   * `(u − 0.5)·L` instead would have been a subtract-then-multiply and would
   * NOT have been bit-exact — the byte-for-byte contract would have died on
   * an algebraic identity that is false in floating point.
   *
   * TWO CALLERS, AND THEY ARE EVERY PATH: `nodeAt()` (stars, link particles
   * via `edgeFrame`, and the line layer's live chord) and `streamCenter()`
   * (the centroid spine — the nebula, the row windows, the dormant membranes).
   * The centroids are computed by the generator in the SAME authored frame as
   * the nodes, so a map applied to one and not the other would put the smoke
   * 5000 px from the fracture it is smoke from.
   */
  function fieldMap(p: Any): Any {
    const x = p.x.mul(uFieldLen).add(uFieldOrigin);
    return vec3(x, p.y.add(uFieldSlope.mul(x)), p.z);
  }
  /** Node center by index node (uniformArray element — legal in any stage). */
  function nodeAt(idx: Any): Any {
    return fieldMap(
      uNodePos.element(int(clamp(idx, float(0), float(NODE_N - 1)))),
    ) as Any;
  }
  /** Node left→right cloud coordinate (0..1) by index node. */
  function nodeTAt(idx: Any): Any {
    return uNodeT.element(int(clamp(idx, float(0), float(NODE_N - 1)))) as Any;
  }
  /**
   * ROUND 12 · STAGE 0B — a link's two endpoint node indices, by (float)
   * edge index. THE single decode both stages share: `edgeFrame` (particles)
   * and `buildLinkLineLayer`'s live chord (lines) call this and nothing else,
   * so the two layers can never disagree about topology.
   *
   * Returns plain float nodes carrying exactly the values the shipped
   * `uEdgeA/uEdgeB.element(int(e))` pair carried — see EDGE_PACKED for the
   * exactness proof (max packed value 1,048,575 < 2^24, 16x fp32 margin) and
   * for the rollback contract. `.element()` on a uniformArray is legal in any
   * stage on both backends; the three nested `select()`s are the only
   * cross-backend way to pick a vec4 component by a RUNTIME index (neither
   * GLSL ES nor WGSL has a dynamic swizzle). `e` is already clamped to
   * [0, EDGE_N-1] by both callers, so `j` cannot run off the array.
   */
  function edgeEnds(e: Any): { ia: Any; ib: Any } {
    if (!EDGE_PACKED) {
      return {
        ia: uEdgeA.element(int(e)) as Any,
        ib: uEdgeB.element(int(e)) as Any,
      };
    }
    const j = floor(e.mul(float(1 / EDGE_PACK_STRIDE))).toVar();
    const k = e.sub(j.mul(float(EDGE_PACK_STRIDE))).toVar();
    const p = uEdgePack.element(int(j)) as Any;
    const v = select(
      k.lessThan(float(0.5)),
      p.x,
      select(
        k.lessThan(float(1.5)),
        p.y,
        select(k.lessThan(float(2.5)), p.z, p.w),
      ),
    ).toVar();
    // b = floor(v * 2^-10), then a = v - 1024*b. The reciprocal is a literal
    // power of two on purpose: exact, unlike a `/`.
    const ib = floor(v.mul(float(1 / EDGE_PACK_RADIX))).toVar();
    const ia = v.sub(ib.mul(float(EDGE_PACK_RADIX))).toVar();
    return { ia, ib };
  }
  /** Gate 0/1 for a node's participation in the three ignition REGIONS — the
   * far left / far right fringes of the cloud stay neutral (they are the
   * unfed input and the already-delivered output of the story).
   *
   * The fringe bounds MUST sit outside the outer regions' own half-weight
   * radius, or the gate eats the ignition it is supposed to frame. With
   * ZONE_K = 44 that radius is √(ln2/44) = 0.1255, so region 1 (RING_T 0.25)
   * reaches down to nodeT 0.125 and region 3 (0.75) reaches up to 0.875 —
   * the round-8-D draft's 0.05→0.15 / 0.85→0.95 ramps clipped BOTH. That is
   * invisible on regions 1–2 (they are the cloud's dense middle) but not on
   * region 3: the crystal well carves the healthy cloud at exactly nodeT
   * ≈0.75 (stone x +0.22 ≙ nodeT 0.744), leaving the guardrail region with
   * the thinnest star population of the three — and the old upper ramp then
   * took another 27% of what little was left (measured gaussian mass 8.4 →
   * 6.1 on healthy/full). The ramps below clear both half-widths, so only the
   * TRUE extremes stay neutral (the leftmost star is still fully gated; the
   * rightmost keeps ~10%). See the report note on the crystal/region-3
   * collision — the remaining 42.0-vs-8.3 imbalance is structural, not this
   * gate's doing. */
  function cloudZoneGate(nT: Any): Any {
    return smoothstep(float(0.03), float(0.1), nT).mul(
      float(1).sub(smoothstep(float(0.96), float(1.02), nT)),
    );
  }
  /** Gaussian weight of ignition zone i at a node's nodeT. ROUND-8-D: this
   * REPLACES the round-6 `layerSlot` quantization (index = nodeT·4−1). A
   * continuous cloud quantized into three slots would grow visible seams at
   * the slot boundaries — i.e. columns, the exact thing the owner rejected.
   * ZONE_K puts the half-weight point exactly halfway to the next zone, so
   * the three windows are a soft partition of the cloud. */
  function zoneW(nT: Any, i: number): Any {
    const d = nT.sub(float(RING_T[i]));
    return exp(float(ZONE_K).mul(d.mul(d)).negate());
  }
  /** Region-blended hover glow — a weight-NORMALIZED average of the three
   * uRingGlow slots, so a star between two hovered/dimmed regions reads the
   * blend rather than the sum. The 1e-3 seeded on BOTH sums is a DIVIDE-BY-
   * ZERO guard, not a neutrality mechanism: with RING_T spanning 0.25..0.75
   * and ZONE_K = 44, some zone weight always exceeds 1e-3 for every nodeT in
   * [0,1] (the smallest, at the ends, is exp(−44·0.0625) = 0.064), so the
   * ratio never actually falls back to 1. Neutrality at the fringes comes
   * from cloudZoneGate's `mix(1, zoneGlow, gate)` — the ONLY place it comes
   * from. Do not delete that mix on the assumption that this function
   * self-neutralizes. */
  function zoneGlow(nT: Any): Any {
    let num: Any = float(1e-3);
    let den: Any = float(1e-3);
    for (let i = 0; i < RING_T.length; i++) {
      const w = zoneW(nT, i).toVar();
      num = num.add(w.mul(ringGlowAt(float(i))));
      den = den.add(w);
    }
    return num.div(den);
  }
  /** Region-blended ignition flash (neutral = 0 — a plain weighted sum, so a
   * star between two zones catches a share of both ignitions). */
  function zoneFlash(nT: Any): Any {
    let s: Any = float(0);
    for (let i = 0; i < RING_T.length; i++) {
      s = s.add(zoneW(nT, i).mul(ringFlashAt(float(i))));
    }
    return s;
  }
  /** Per-NODE coherent degradation drift (broken, node past the fracture in
   * nodeT): a static hashed displacement + slow wander, gated by uBroken and
   * pulled back by the uRecohere hover tease. Whole stars read knocked off
   * station — and frayed links follow, because edgeFrame's endpoints read
   * THIS too. Pure function of uTime (unified-force contract). */
  function nodeDrift(idx: Any, nT: Any): Any {
    const hn = fract(sin(idx.mul(91.7).add(13.1)).mul(43758.545)).toVar();
    const hn2 = fract(sin(idx.mul(41.3).add(57.9)).mul(43758.545)).toVar();
    const staticDir = vec3(
      hn.sub(0.35),
      hn2.sub(0.5).mul(1.4),
      hn.mul(hn2).sub(0.3),
    ).normalize();
    const wander = vec3(
      sin(uTime.mul(0.31).add(hn.mul(19.0))),
      sin(uTime.mul(0.26).add(hn2.mul(23.0))),
      sin(uTime.mul(0.22).add(hn.mul(31.0))),
    );
    const gate = smoothstep(uFracture, uFracture.add(float(0.02)), nT)
      .mul(uBroken)
      .mul(float(1).sub(uRecohere.mul(0.9)));
    return staticDir
      .mul(0.7)
      .add(wander.mul(0.35))
      .mul(float(NODE_DRIFT))
      .mul(gate);
  }
  /** Decode a LINK particle's baked aux + flow state into the shared frame:
   * link index, strand, per-link flow s, cloud depth t = mix(tA, tB, s),
   * drift-corrected endpoints and the normalized link direction. Links are
   * ORIENTED by nodeT at build time, so tA ≤ tB and the flow always runs
   * left→right. Pure function of attributes + uniforms — every stage, both
   * backends. (For star/spark roles the values are finite garbage; every
   * consumer gates by role.) */
  /**
   * ROUND 12 · D — THE WINDOW RE-HOME, one expression, both tables.
   *
   *     idx = first + mod(baked − first, WIN)
   *
   * For `baked ∈ [first, first+WIN)` this is the IDENTITY, so nothing inside
   * the window ever moves; as `first` advances by one, exactly the particles
   * whose residue matches the DEPARTING element jump to the ARRIVING one —
   * and because the tables are κ-sorted and the window is padded past the
   * frame by `RIBBON_WINDOW_PAD`, both of those are off screen. Note
   * `idx ≡ baked (mod WIN)` identically, so an element's particle population
   * is a build-time constant and the comb never re-strides.
   *
   * ⚠ The jump is ~1.0 LOCAL, i.e. ~94× the ribbon's derived `wrapSnapDist`
   * (0.01060), so on the compute tier the RECYCLE SNAP fires and the particle
   * hard-resets onto its new anchor instead of spring-flying. That is why
   * `STAR_WINDOW_SNAP` had to be added — the star bound was 1e9 because star
   * anchors never used to jump.
   */
  function windowIdx(baked: Any, first: Any, win: number): Any {
    const d = baked.sub(first);
    return first.add(d.sub(float(win).mul(floor(d.mul(float(1 / win))))));
  }
  /** The live NODE index of a star particle (windowed on the ribbon). */
  function starNodeIdx(aux: Any): Any {
    if (!RIB) return aux;
    return windowIdx(aux, uWinFirstNode, WIN_N);
  }
  function edgeFrame(metaN: Any, offN: Any) {
    const aux = metaN.y;
    const edgeRaw = floor(aux.mul(0.5));
    const edgeIdx = clamp(
      RIB ? windowIdx(edgeRaw, uWinFirstEdge, WIN_E) : edgeRaw,
      float(0),
      float(EDGE_N - 1),
    ).toVar();
    const strand = aux.sub(edgeRaw.mul(2.0)).toVar();
    const s = flowParam(offN.x, metaN.z).toVar();
    const { ia, ib } = edgeEnds(edgeIdx);
    const tA = nodeTAt(ia).toVar();
    const tB = nodeTAt(ib).toVar();
    const A = nodeAt(ia).add(nodeDrift(ia, tA)).toVar();
    const B = nodeAt(ib).add(nodeDrift(ib, tB)).toVar();
    const t = mix(tA, tB, s).toVar();
    // Guarded normalize. The endpoints are the DRIFTED node centres, and
    // round-8-D shrank the safety margin by ~4×: round-6 links were ≥0.22
    // long against a max relative drift of 2·NODE_DRIFT·1.31 = 0.18; the
    // plexus links are ≥EDGE_MIN_LOCAL (0.055 delivered) against 0.118. A
    // frayed link whose two ends drift toward each other therefore gets
    // genuinely short — the worst measured case over 400 s of the wander
    // clock is |B−A| = 0.026 on a 0.107 base (broken/full, nodes 57↔29), and
    // 0.014 at the svg density. It never reaches 0 with today's hashes, but
    // `normalize()` on a zero vector is 0/0 = NaN and on the COMPUTE tier a
    // single NaN frame is PERMANENT (it lands in positionBuffer and the
    // spring integrates it forever — the particle is gone for the session).
    // max(len, 1e-5) is a no-op at every real length here (0.026 ≫ 1e-5) and
    // degrades to a finite near-zero dir instead of NaN in the degenerate
    // case. Keep this guard if EDGE_MIN_LOCAL or NODE_DRIFT ever move again.
    const dRaw = B.sub(A).toVar();
    const chordDir = dRaw.div(max(length(dRaw), float(1e-5))).toVar();
    // ── ROUND 12 · THE LINK IS AN ARC, NOT A CHORD ───────────────────────
    // Straight segments meeting at a node read as a glass truss. Bend the
    // path on a per-link hashed arc that vanishes at both endpoints, so the
    // TOPOLOGY is untouched — the link still lands exactly on its two nodes —
    // and only the route between them curves. See LINK_BEND_RIBBON.
    //
    // `home` replaces mix(A,B,s) for every consumer, and `dir` is now the
    // analytic TANGENT of that arc rather than the chord: the braid
    // cross-section, the fray basis and the velocity streak all follow the
    // curve instead of cutting its corner. On a straight build (bend 0) the
    // tangent reduces to the chord exactly, so `#production` is unmoved.
    let home = mix(A, B, s).toVar();
    let dir = chordDir;
    if (K_LINK_BEND > 0) {
      // Two independent per-link hashes: one signs and scales the bow, the
      // other rolls its plane about the chord. A field where every link bows
      // the same way is a fabric, not a net.
      const hAmp = fract(
        sin(edgeIdx.mul(83.17).add(29.3)).mul(43758.545),
      ).toVar();
      const hRoll = fract(
        sin(edgeIdx.mul(151.7).add(7.9)).mul(43758.545),
      ).toVar();
      // A perpendicular frame on the chord. cross(dir, Z) is degenerate only
      // for a link running along z; the field is essentially planar in xy
      // (|z| ≤ PLEXUS_RZ), so guard it the same way the dir normalize above
      // is guarded rather than branching.
      const pRaw = cross(chordDir, vec3(0, 0, 1)).toVar();
      const p0 = pRaw.div(max(length(pRaw), float(1e-5))).toVar();
      const p1 = cross(chordDir, p0).toVar();
      // Roll is CONSTRAINED, not free: dendritic tissue is broadly laminar,
      // so the arc leans out of the ribbon plane rather than pointing
      // anywhere in 3-space. A free 2π roll reads as a ball of wire.
      const roll = hRoll.sub(0.5).mul(float(2 * K_BEND_ROLL)).toVar();
      const perp = p0.mul(cos(roll)).add(p1.mul(sin(roll))).toVar();
      // Signed magnitude, uniform in [−1,+1], on a bow that is proportional
      // to chord length but SATURATES: un-capped, the longest links (≈4× the
      // shortest) loop over their neighbours. `min` is legal here — this is a
      // per-link constant evaluated once, not a moving wavefront, so the C¹
      // rule that forbids clamping a travelling front does not apply.
      const amp = min(length(dRaw).mul(float(K_LINK_BEND)), float(K_BEND_MAX))
        .mul(hAmp.mul(2.0).sub(1.0))
        .toVar();
      // 4s(1−s): 0 at both ends, 1 at mid-span. Derivative 4(1−2s).
      const bow = s.mul(float(1).sub(s)).mul(4.0).toVar();
      home = home.add(perp.mul(amp).mul(bow)).toVar();
      const tRaw = dRaw
        .add(perp.mul(amp).mul(float(4).mul(float(1).sub(s.mul(2.0)))))
        .toVar();
      dir = tRaw.div(max(length(tRaw), float(1e-5))).toVar();
    }
    // `ib` (target-node index) is exposed for the round-7 packet clocks:
    // traffic is keyed by the RECEIVING node so nodeKissAt can run the very
    // same clock and kiss exactly when a bead lands (see packetAt).
    return { edgeIdx, strand, s, t, A, B, dir, ib, home };
  }
  /** Round-3 row glow by JS-literal row index (uniformArray element — legal
   * in any stage, costs no buffer slot). */
  function rowGlowAt(i: number): Any {
    return uRowGlow.element(int(i)) as Any;
  }
  /** Round-4: row glow by NODE index (membrane bulge — vertex stage, mirrors
   * ringGlowAt's clamp-int discipline). */
  function rowGlowAtNode(idx: Any): Any {
    return uRowGlow.element(int(clamp(idx, float(0), float(2)))) as Any;
  }
  function membraneSealAt(idx: Any): Any {
    return uMembraneSeal.element(int(clamp(idx, float(0), float(2)))) as Any;
  }
  function membranePhaseAt(idx: Any): Any {
    return uMembranePhase.element(int(clamp(idx, float(0), float(2)))) as Any;
  }
  /** Row i's attention window over flow-t — mode-blended by uBroken:
   * broken = gaussian at ROW_ZONE_T[i] (left cloud / mid cloud / the
   * fracture zone — row 2 sits ON the fracture), healthy = gaussian at
   * RING_T[i] (ignition region i's stars + the links inside it). */
  function rowWin(t: Any, i: number): Any {
    const dzB = t.sub(float(ROW_ZONE_T[i]));
    const gaussB = exp(float(ROW_ZONE_K).mul(dzB.mul(dzB)).negate());
    const dzH = t.sub(float(RING_T[i]));
    const gaussH = exp(float(ROW_LAYER_K).mul(dzH.mul(dzH)).negate());
    return mix(gaussH, gaussB, uBroken);
  }
  /** Σ rowGlow[i] · window_i(t) — 0..~1 "attention at t" (rows are mutually
   * exclusive hover targets, so the sum never stacks in practice). */
  function rowResponse(t: Any): Any {
    let s: Any = float(0);
    for (let i = 0; i < ROW_ZONE_T.length; i++) {
      s = s.add(rowGlowAt(i).mul(rowWin(t, i)));
    }
    return s;
  }

  /** Round-3 curl-noise micro-turbulence (§B.2): analytic curl of a sin/cos
   * vector potential — divergence-free by construction, two octaves, six trig
   * evals per octave. A PURE spatial+time field (no per-particle hash), so
   * neighbours along a filament read coherent offsets and the strands BEND /
   * SHRED organically instead of fuzzing per-particle. Components ∈ ~[-1,1]. */
  function curlAt(p: Any): Any {
    const octave = (freq: number, speed: number): Any => {
      const K = float(freq);
      const t1 = uTime.mul(speed);
      // Potential ψ = (sin a1, sin a2, sin a3) with skewed frequency pairs;
      // curl(ψ) = (1.7K·c3 − K·c2, 1.7K·c1 − K·c3, 1.7K·c2 − K·c1) / (2.7K).
      const a1 = p.y.mul(K).add(p.z.mul(K).mul(1.7)).add(t1);
      const a2 = p.z.mul(K).add(p.x.mul(K).mul(1.7)).add(t1.mul(1.31));
      const a3 = p.x.mul(K).add(p.y.mul(K).mul(1.7)).add(t1.mul(0.87));
      const c1 = cos(a1).toVar();
      const c2 = cos(a2).toVar();
      const c3 = cos(a3).toVar();
      return vec3(
        c3.mul(1.7).sub(c2),
        c1.mul(1.7).sub(c3),
        c2.mul(1.7).sub(c1),
      ).div(2.7);
    };
    return octave(CURL_FREQ, CURL_SPEED)
      .add(octave(CURL_FREQ_2, CURL_SPEED_2).mul(float(CURL_AMP_2)))
      .div(1 + CURL_AMP_2);
  }

  /** Normalized local-z 0 (far) → 1 (near) over the depth range. */
  function zNorm(z: Any): Any {
    return clamp(
      z.div(float(DEPTH_Z_RANGE)).mul(0.5).add(0.5),
      float(0),
      float(1),
    );
  }
  /** Depth-DOF alpha: the FAR half of the z range dims toward DOF_FAR_DIM
   * (far = smaller/dimmer); the near half stays at 1 (§B.4). */
  function dofAlphaAt(z: Any): Any {
    const far01 = clamp(float(1).sub(zNorm(z).mul(2.0)), float(0), float(1));
    return float(1).sub(far01.mul(float(1 - DOF_FAR_DIM)).mul(uDof));
  }
  /** Depth-DOF disc softness 0..1: only the NEAR half softens (bokeh read);
   * mid/far keep the crisp round-2 disc. Feeds the vSoft varying. */
  function dofSoftAt(z: Any): Any {
    const near01 = clamp(zNorm(z).mul(2.0).sub(1.0), float(0), float(1));
    return near01.mul(uDof);
  }

  // --- ROUND 9-B — THE COPY-COLUMN MASK -------------------------------------
  // "la rete neurale ora sta sopra le scritte, deve stare sotto" — a CONTRAST
  // fix (the canvas is already behind the DOM). The three functions below are
  // PURE functions of the LOCAL position, and BOTH layers evaluate them at
  // their own live local point — the LineSegments layer at its chord point
  // `posL`, the particles at their simulated (compute) / analytic (static)
  // position. Same space, same expression, so the layers cannot disagree about
  // where the column is; what differs is only the FLOOR each one bottoms out
  // at (COPY_MASK_FLOOR vs COPY_MASK_FLOOR_LINE — the star core is 18.8× the
  // line, so one shared floor would either blind the copy or delete the mesh).
  //
  // The x boundary is DERIVED, not guessed: the lane is centred on the real
  // `[data-row-body]` box (+ COPY_EDGE_PAD for the inner group's ±0.018
  // rotation drift), written by NeuralLattice — and under the traverse it
  // TRACKS that box's applied `x` per frame, from the same window, in the
  // same frame (a one-frame-stale lane breaches the bloom-onset margin at
  // 814 px/s on a phone). The full
  // per-viewport derivation and the WCAG arithmetic are in the config's
  // COPY-COLUMN MASK section.
  //
  // Cost: ~10 ALU in the vertex stage of each layer, zero bindings, zero
  // per-frame allocation, identical on both backends (smoothstep/mix/max only).

  /** 0 over the copy column → 1 right of the ramp. The gate is used BOTH as
   * the mask's x term and as the switch that keeps a copy-column star's
   * IGNITION machinery off (see particleScalars) — a fully ignited star core
   * is ×15.5 its rest value (glow 1.9 × flash 3.4 × surge 1.6 × kiss 1.5), and
   * gating that is far cheaper than paying for it in the floor, which would
   * cost the resting star field its last 15× of visibility.
   * `max(uCopySoft, 1e-3)` only keeps a zeroed soft width out of
   * smoothstep's degenerate corner. */
  function copyGateAt(x: Any): Any {
    // ROUND 11 — a two-sided LANE, not a half-plane (mechanism §2B.4). With
    // the default pair (laneC = edge − W, laneW = W ≫ band) this is EXACTLY
    // `smoothstep(edge, edge + soft, x)`, which is what keeps the un-traversed
    // band byte-identical. Two extra ALU (a subtract and an abs); zero new
    // uniform BLOCKS — `uCopyLaneW` is a plain scalar joining the existing
    // shared group, so the particle vertex stage is unmoved (block counts:
    // see the BLOCK-COUNT BUDGET note in createNeuralFieldBuild).
    const d = x.sub(uCopyLaneC);
    return smoothstep(
      uCopyLaneW,
      uCopyLaneW.add(max(uCopySoft, float(0.001))),
      max(d, d.negate()),
    );
  }
  /** The gentler VERTICAL term: a broad bell over the band's middle, where the
   * ledger rows are densest, relaxing to 1 at the band's top/bottom edges. It
   * scales every element by the same factor at a given y, so the star/line/dust
   * ratios the owner approved survive intact — this lowers the CEILING over the
   * text, it does not re-flatten the grammar. */
  function copyYAt(y: Any): Any {
    const ay = max(y, y.negate());
    const bell = float(1).sub(
      smoothstep(float(COPY_Y_IN), float(COPY_Y_OUT), ay),
    );
    return mix(float(1), uCopyYFloor, bell);
  }
  /**
   * ROUND 12 · STAGE 2 FIX — THE READING-BAND COORDINATE.
   *
   * `p.y` is the MAPPED local y, and it is a pure affine function of screen y
   * — `screen_y = C − y·rect.h`, `C = cy − yRegPx` — for every local point,
   * shear or no shear. Subtracting the driver's `uCopyYc = (C − ih/2)/rect.h`
   * therefore yields the SIGNED SCREEN DISTANCE from the frame's centre line,
   * in band-height units: exactly ±0.5 across the frame.
   *
   * ⚠ THIS REPLACES STAGE 2's `acrossV`, AND THE REPLACEMENT IS THE FIX.
   * Stage 2 put the vertical bell on the across-ribbon `v = y − μ·x`, arguing
   * that the mapped `y` spans ±4.34 band-heights under the shear. It does —
   * but `v` is CONSTANT ALONG the 45° ribbon, so a bell on `v` is a 45°
   * diagonal stripe, while the reading zone is a horizontal screen band. They
   * coincide at the frame's centre column and are 637 px apart at the tracked
   * block's own edge. Re-centring `y` answers the ±4.34 objection without
   * rotating the bell 45° off the thing it is supposed to be a bell about.
   *
   * Off the ribbon the driver writes `uCopyYc = 0` and this is `y.sub(0.0)` —
   * bit-exact, so `#production` and the `ribbon: false` rollback are unmoved.
   */
  function screenYAt(p: Any): Any {
    return p.y.sub(uCopyYc);
  }
  /**
   * ROUND 12 · STAGE 2 FIX — THE DEEP FLOOR'S OWN CEILING AND SILL.
   *
   * 0 across the tracked reading unit (where `COPY_MASK_FLOOR` must apply, and
   * where the legibility chain that sized 1e-4 was measured) → 1 beyond
   * `uCopyRowH + uCopyRowSoft` of it, where there is no glyph to protect and
   * the shipped mask was floorng the net for nothing. Same shape and the same
   * two ALU as `copyGateAt`, one axis over.
   *
   * ⚠ `uCopyRowLocal` IS THE BIT-EXACTNESS GATE, and it is a MULTIPLY, not a
   * second `mix`. At 0 the caller evaluates `mix(floor, 1, 0)` =
   * `floor + (1 − floor)·0` = `floor` exactly, for every float `floor`. Every
   * band that is not a live ribbon — `#production`, `ribbon: false`, a band
   * whose traverse never armed — gets 0 and is therefore unmoved to the bit.
   */
  function copyRowGateAt(y: Any): Any {
    const d = y.sub(uCopyRowC);
    return smoothstep(
      uCopyRowH,
      uCopyRowH.add(max(uCopyRowSoft, float(0.001))),
      max(d, d.negate()),
    ).mul(uCopyRowLocal);
  }
  /** Full 2D mask for the PARTICLE layer at a LOCAL position.
   * ⚠ `uFieldFade` rides HERE, not on the alpha, because the caller uses this
   * one value for BOTH the output alpha and the discard threshold — see the
   * scale-invariance note on `cut`. A fade applied to only one of them stops
   * being a fade and becomes a pop. */
  function copyMaskAt(p: Any, gate: Any, floorN?: Any): Any {
    const sy = screenYAt(p);
    return mix(
      mix(floorN ?? uCopyFloor, float(1), copyRowGateAt(sy)),
      float(1),
      gate,
    )
      .mul(copyYAt(sy))
      .mul(uFieldFade);
  }
  /** Full 2D mask for the LINE layer — the SAME ramp, its own floor. */
  function copyMaskLineAt(p: Any): Any {
    const sy = screenYAt(p);
    return mix(
      mix(uCopyLineFloor, float(1), copyRowGateAt(sy)),
      float(1),
      copyGateAt(p.x),
    )
      .mul(copyYAt(sy))
      .mul(uFieldFade);
  }
  /** Ring flow-t by index (config constants — fixed topology). */
  function ringT(idx: Any): Any {
    const i0 = idx.lessThan(float(0.5));
    const i1 = idx.lessThan(float(1.5));
    return select(
      i0,
      float(RING_T[0]),
      select(i1, float(RING_T[1]), float(RING_T[2])),
    );
  }

  /** Per-EDGE flow parameter s of an edge particle — deterministic in
   * uFlowTime, the driver-integrated flow clock (advances at 1×/s at rest,
   * up to 1+uVelFlow× while scrolling). Integrating driver-side is what lets
   * velocity bend the flow RATE without the phase jump that scaling uTime
   * in-shader would cause. */
  function flowParam(basePhase: Any, speedVar: Any): Any {
    return fract(basePhase.add(uFlowTime.mul(uFlowSpeed).mul(speedVar)));
  }

  /** Laminar width envelope over cloud depth: 1 at the left, tightening as
   * each ignition REGION is passed (healthy; 1 → ~0.73 after eval/trace/
   * guardrail), times the idle BREATHING (±uBreathe over BREATHE_PERIOD s)
   * and the master uEnvelope. uBroken gates the tightening off; breathing
   * applies to both modes. Times the ROW-REACTIVE width response — the
   * ignited row's region SWELLS on broken (+uRowSwell) and TIGHTENS on
   * healthy (−uRowSwell·ROW_TIGHTEN_RATIO, the laminar squeeze).
   * ROUND-8-D: the three steps are WIDENED (±0.06 of nodeT instead of the
   * layer-tight −0.02/+0.012) so they blend into one smooth maturity ramp
   * across a continuous cloud rather than reading as three vertical seams. */
  function widthEnvelope(t: Any): Any {
    let w: Any = float(1);
    for (let i = 0; i < RING_T.length; i++) {
      w = w.sub(
        smoothstep(float(RING_T[i] - 0.06), float(RING_T[i] + 0.06), t).mul(
          float(TIGHTEN_PER_RING),
        ),
      );
    }
    const breathe = float(1).add(
      sin(uTime.mul((Math.PI * 2) / BREATHE_PERIOD)).mul(uBreathe),
    );
    const rowW = float(1).add(
      rowResponse(t).mul(
        mix(uRowSwell.mul(-ROW_TIGHTEN_RATIO), uRowSwell, uBroken),
      ),
    );
    // Round-4 §B.3: the net SWELLS +uVelSwell·vel while you scroll and
    // relaxes back to the calm braid at rest (uScrollVel is damped driver-
    // side, so the envelope stays C1).
    const velW = float(1).add(uScrollVel.mul(uVelSwell));
    return mix(w, float(1), uBroken)
      .mul(breathe)
      .mul(rowW)
      .mul(velW)
      .mul(uEnvelope);
  }

  /** Fracture detachment factor 0..1 for an edge particle at depth t
   * (broken only, softened by the hover re-cohere tease). */
  function dispFactor(t: Any): Any {
    const past = smoothstep(
      uFracture,
      uFracture.add(float(FRACTURE_WINDOW)),
      t,
    );
    return clamp(
      past.mul(uBroken).mul(float(1).sub(uRecohere.mul(0.9))),
      float(0),
      float(1),
    );
  }

  /** Spark burst direction (role 2) — mostly radial with a +x forward bias
   * out of the fracture. Pure function of the seeded offsets. */
  function sparkDir(offN: Any): Any {
    return vec3(
      cos(offN.x).mul(0.6).add(0.3),
      sin(offN.x),
      offN.z.mul(0.8),
    ).normalize();
  }

  /**
   * The analytic anchor: where particle i WANTS to be, from the plexus
   * uniforms + its read-only role/offset attributes. Pure function of uTime →
   * deterministic for any scrub state (the unified-force contract; the curl
   * field is a pure function of position+uTime, so the contract holds).
   * `curl` is a BUILD-TIME flag: the compute kernel passes true (filaments
   * shred through the spring), the static tier keeps the analytic twist.
   */
  function anchorNode(opts: { metaN: Any; offN: Any; curl?: boolean }): Any {
    const { metaN, offN } = opts;
    const role = metaN.x;
    // ROUND 12 · D — `aux` is STAR-ONLY inside this function (the link branch
    // goes through `edgeFrame`, which windows its own index), so the node
    // re-home lands here once and covers nodeTAt / nodeAt / nodeDrift / the
    // per-node hash / nodeKissAt together.
    const aux = starNodeIdx(metaN.y).toVar();
    const speedVar = metaN.z;
    const rnd = metaN.w;

    // -------- LINK branch --------
    const ef = edgeFrame(metaN, offN);
    const t = ef.t;
    const w = widthEnvelope(t).toVar();
    // Perpendicular frame around the link line. ROUND-8-D: the plexus links
    // point in EVERY direction, including along ẑ, so the fixed ẑ reference
    // of the layered graph would produce cross(dir, ẑ) ≈ 0 → normalize() NaN
    // on the near-axial links. Swap the reference to ŷ whenever dir is within
    // ~26° of ẑ (dir.z² > 0.81) — the cross is then always well-conditioned.
    const perpRef = select(
      ef.dir.z.mul(ef.dir.z).greaterThan(float(0.81)),
      vec3(0.0, 1.0, 0.0),
      vec3(0.0, 0.0, 1.0),
    ).toVar();
    const n1 = cross(ef.dir, perpRef).normalize().toVar();
    const n2 = cross(ef.dir, n1).toVar();
    // ROUND 13 — THE CONDUIT. Strand twist phase + rate (uniformArrays,
    // live-tunable) plus a per-link golden-angle offset so the threads
    // decorrelate. On the ribbon the two strands become a COUNTER-ROTATING
    // double helix (K_RATE_STEP −2.0 ⇒ rates +1.0 / −1.0) and the whole
    // cross-section slowly REVOLVES on uTime — strand 1 counter-revolving at
    // −0.6× so the tube reads as two currents sliding past each other. The
    // swirl term is a build-time ternary: `#production` (K_SWIRL 0) bakes the
    // identical graph it always baked.
    const strandAngBase = strandPhaseAt(ef.strand)
      .add(ef.edgeIdx.mul(2.39996))
      .add(
        ef.s
          .mul(float(Math.PI * 2))
          .mul(
            float(K_BRAID_TURNS).mul(
              float(K_RATE_BASE).add(
                ef.strand.mul(float(K_RATE_STEP)),
              ),
            ),
          ),
      );
    const strandAng =
      K_SWIRL > 0
        ? strandAngBase.add(
            uTime
              .mul(float(K_SWIRL))
              .mul(float(1).add(ef.strand.mul(float(-1.6)))),
          )
        : strandAngBase;
    // Per-strand radius: strand 0 is the TIGHT BRIGHT CORE (K_CORE_R×),
    // strand 1 the full-radius sheath — and the radius PINCHES at mid-span on
    // the same 4s(1−s) profile the arc and the sprite taper ride (an axon is
    // widest where it leaves its somata, and a constant-radius tube is the
    // strongest "extruded by a computer" cue). Ribbon-only by construction.
    const radiusK = RIB
      ? mix(float(STRAND_CORE_R_RIBBON), float(1), ef.strand)
          .mul(
            mix(
              float(1),
              float(STRAND_RADIUS_TAPER_RIBBON),
              ef.s.mul(float(1).sub(ef.s)).mul(4.0),
            ),
          )
          .toVar()
      : float(1);
    const strandOff = n1
      .mul(sin(strandAng))
      .add(n2.mul(cos(strandAng)))
      .mul(float(K_STRAND_RADIUS))
      .mul(radiusK);
    // Thickness jitter within the strand — per-strand thickness BIAS keeps
    // the two filaments individually legible (thick lead, thin satellite).
    // On the ribbon this jitter IS the tube's volumetric fill between the
    // core helix and the sheath helix.
    const jit = n1
      .mul(sin(offN.z))
      .add(n2.mul(cos(offN.z)))
      .mul(offN.y)
      .mul(float(K_STRAND_THICK))
      .mul(strandThickAt(ef.strand));
    // Curl micro-turbulence (compute tier only): displace the strand offset
    // with the analytic curl field sampled AT the braid position, so the
    // field varies along the edge AND across the cross-section; +uVelCurl·
    // vel gain while scrolling (amplitude-only, no phase discontinuity).
    // `ef.home` is the point ON the (now curved) link path — mix(A,B,s) plus
    // the round-12 arc. Every consumer of the link's own position goes
    // through it so the braid, the fray and the streak share one path.
    const preStream = ef.home.add(strandOff.add(jit).mul(w)).toVar();
    const onEdge = (
      opts.curl
        ? preStream.add(
            curlAt(preStream)
              .mul(uCurl)
              .mul(float(1).add(uScrollVel.mul(uVelCurl)))
              .mul(float(CURL_SCALE))
              // ×1/L, for the same WRAP_SNAP reason as the pointer push
              // above. It is the smaller of the two terms (0.00078 of the
              // 0.01078 floor) but it is in the same budget.
              .mul(uFieldK),
          )
        : preStream
    ).toVar();

    // Broken: past the fracture the particle FRAYS off its edge line — a
    // small hashed scatter + wander AROUND the (already endpoint-drifted)
    // edge, so degraded edges read as edges gone wrong, not a detached
    // cloud. The clean-break alpha gap (particleScalars) hides the detach
    // window; uRecohere re-connects everything via dispFactor.
    const disp = dispFactor(t).toVar();
    const u = clamp(
      t.sub(uFracture).div(float(1).sub(uFracture)),
      float(0),
      float(1),
    ).toVar(); // fray life progress
    const h1 = fract(sin(rnd.mul(137.9).add(offN.x.mul(311.7))).mul(43758.545));
    const h2 = fract(sin(rnd.mul(269.5).add(offN.z.mul(183.3))).mul(43758.545));
    const dir = vec3(
      float(0.8).add(h1.mul(0.4)),
      h1.sub(0.5).mul(1.5),
      h2.sub(0.5).mul(1.1),
    )
      .normalize()
      .toVar();
    // Fray wander drifts +uVelDebris·vel faster while scrolling (amplitude
    // boost only — the flow clock already carries the +40% baseline).
    const wander = vec3(
      sin(uTime.mul(0.5).add(h1.mul(21.0))),
      sin(uTime.mul(0.42).add(h2.mul(17.0))),
      sin(uTime.mul(0.36).add(h1.mul(13.0))),
    )
      .mul(u.mul(0.06))
      .mul(float(1).add(uScrollVel.mul(uVelDebris)));
    const frayed = onEdge
      .add(dir.mul(u.mul(float(DEBRIS_SPREAD)).add(float(DEBRIS_GAP))))
      .add(wander);
    const streamAnchor = mix(onEdge, frayed, disp).toVar();

    // -------- STAR-CORE branch (round-8-D: NOTHING ORBITS) --------
    // The particle's offset from the node centre is BAKED in aOff (a filled
    // centre-weighted blob or one of four flare rays — seedBuffers). Here we
    // only SCALE it, so there is no angle, no orbit and therefore no hollow
    // ring: at scale 1 the densest part of the star is r = 0 itself.
    const nT = nodeTAt(aux).toVar();
    const nC = nodeAt(aux).add(nodeDrift(aux, nT)).toVar();
    // Ignition SHOCKWAVE: the whole star (core + spikes) expands
    // 1 → 1+RING_SHOCKWAVE while its region's flash envelope decays.
    const starFlash = zoneFlash(nT).mul(cloudZoneGate(nT));
    // Per-node size variance (±HALO_SIZE_VAR/2) + a slow breath, plus the
    // packet-arrival kiss swell (nodeKissAt — particleScalars reads the SAME
    // clock for the brightness, so swell and glow arrive together). The
    // compute tier's spring tracks these slow changes exactly like the
    // RING_SHOCKWAVE ripple. `speedVar` carries the per-PARTICLE size jitter.
    const hNode = fract(sin(aux.mul(77.7).add(3.3)).mul(43758.545)).toVar();
    const starVar = float(1 - HALO_SIZE_VAR / 2).add(
      hNode.mul(float(HALO_SIZE_VAR)),
    );
    const starBreath = float(1).add(
      sin(uTime.mul(float(HALO_BREATH_RATE)).add(hNode.mul(Math.PI * 2))).mul(
        float(HALO_BREATH_AMP),
      ),
    );
    const starScale = uStarSpread
      .mul(float(1).add(starFlash.mul(float(RING_SHOCKWAVE))))
      .mul(starVar)
      .mul(starBreath)
      .mul(speedVar)
      .mul(float(1).add(nodeKissAt(aux, nT).mul(float(PACKET_NODE_SWELL))))
      .toVar();
    // CAMERA-FACING: the group is anisotropically scaled (w·k, h·k), so only
    // the x component is aspect-corrected by uPlaneAspect — that keeps the
    // core round and the flare cross square on screen. z is real depth.
    const starAnchor = nC
      .add(
        vec3(
          offN.x.mul(starScale).mul(uPlaneAspect),
          offN.y.mul(starScale),
          offN.z.mul(starScale),
        ),
      )
      .toVar();

    // -------- SPARK branch (broken, role 2) --------
    // Analytic burst from the fracture point (the registration spine puts it
    // AT the broken crystal): the uFlash 1→0 decay maps to outward flight
    // 0→1 — a pure function of the flash uniform, identical on both
    // backends. Idle (uFlash 0) parks the spark at full reach, zero alpha.
    const fracPt = streamCenter(uFracture).toVar();
    const prog = pow(clamp(float(1).sub(uFlash), float(0), float(1)), 0.6);
    const sparkAnchor = fracPt
      .add(sparkDir(offN).mul(prog.mul(float(SPARK_REACH)).mul(speedVar)))
      .add(vec3(float(0), prog.mul(prog).mul(-0.06), float(0)))
      .toVar();

    return select(
      role.lessThan(float(0.5)),
      streamAnchor,
      select(role.lessThan(float(1.5)), starAnchor, sparkAnchor),
    );
  }

  // === Shared fragment-bound scalar builders ================================
  // (Self-contained expressions — see the VARYING DISCIPLINE header note.)

  /** Surge brightness at flow-t: sharp gaussian LEADING edge + a trailing
   * comet gradient (SURGE_TAIL long) behind the head. Dies past the fracture
   * when broken. */
  function surgeAt(t: Any): Any {
    const d = t.sub(uSurgeT);
    const headP = exp(float(SURGE_K).mul(d.mul(d)).negate());
    const tailP = select(
      d.lessThan(float(0)),
      exp(d.div(float(SURGE_TAIL))),
      float(0),
    );
    const s = uSurgeAmp.mul(max(headP, tailP.mul(0.65)));
    const past = smoothstep(
      uFracture,
      uFracture.add(float(FRACTURE_WINDOW)),
      t,
    );
    return s.mul(float(1).sub(past.mul(uBroken)));
  }
  /**
   * ═══ ROUND 12 · D — MOTION IS LIGHT ════════════════════════════════════
   *
   * ONE shared phase axis for STRUCTURE (birth) and LIGHT (the crests), and
   * it is the SAME κ axis the window rides: `nodeT` un-sheared by the band's
   * own 45° slope, so a crest is a line of constant SCREEN x-plus-y — it
   * sweeps ALONG the road, exactly as a signal would, rather than crossing it.
   *
   * AND IT COLLAPSES TO A SINGLE MULTIPLY-ADD ON THE MAPPED y. Writing the
   * mapping as `x = u·L`, `y = v + μ·x`, the key is
   *   `κ_u = u + dir·R·bandAspect·v`,  and  `bandAspect·(W/H) = 1/L`,
   * so the x terms cancel EXACTLY and `phase = y·uFrontKy + uFrontC` with
   * `uFrontKy = dir·R·bandAspect/xSpan`, `uFrontC = −xMin/xSpan`. (Sanity: at
   * `v = 0`, `y = μx` and the expression returns `x/(L·xSpan) − xMin/xSpan` =
   * `nodeT`, so the phase IS nodeT along the centreline and the front's
   * constants stay in nodeT units.) Role-agnostic — stars and link particles
   * read the same two scalars — and backend-agnostic.
   *
   * ⚠ `|physVel|` IS FORBIDDEN as the driver of any of this. It spikes at
   * every `fract()` wrap on the COMPUTE tier only (the spring flight the
   * recycle snap exists to kill) and does not exist at all on the ANALYTIC
   * tier (`motionNode(…, null)`), so a `|physVel|`-driven emissive would show
   * two different pictures on the two backends. Everything here is analytic.
   */
  function phaseAt(p: Any): Any {
    return p.y.mul(uFrontKy).add(uFrontC);
  }
  /**
   * STRUCTURE: 0 → 1 as the birth front passes. A C¹ knee, never a `min()` or
   * a clamp — a hard edge on a moving wavefront is the flat-top scar. Folded
   * into `cMask` at its single construction site so it scales `alpha` AND the
   * discard `cut` by the identical factor: the surviving fragment SET is then
   * byte-identical at every point of the ramp (`disc·vAlpha·born < 0.004·
   * cMask·born` ⟺ the un-born test for every `born > 0`), which is what makes
   * the birth free instead of a fill regression.
   *
   * ⚠ BIRTH IS VALUE-ONLY, NEVER ANCHOR-DRIVEN. An anchor-driven birth moves
   * `|seedPos − liveAnchor| ≈ 0.7 local` against a ribbon snap threshold of
   * 0.0748 local/s — a >9.4 s birth window — and `armed` is 1 on the healthy
   * band, so the kernel would simply teleport every particle onto its anchor
   * every frame the front is on the node.
   */
  function bornAt(ph: Any): Any {
    if (!RIB) return float(1);
    return smoothstep(ph, ph.add(uFrontW), uFront);
  }
  /**
   * LIGHT: `RIVER_M` staggered crests running the phase axis, each a gaussian
   * head with a trailing comet smear — the same asymmetry `surgeAt` has
   * (sharp leading edge, trailing tail), and `max(head, tail)` never `min()`.
   *
   * σ = 1/√(2·RIVER_K) = 0.0577 nodeT ≈ **420 px**, deliberately wider than
   * the 152 px mean link so a crest lights a link END TO END instead of
   * riding it as a bead. The crest wraps on `d − floor(d + 0.5)`, so it is
   * periodic and every link on the frame sees one within `1/M` of nodeT.
   */
  function riverAt(ph: Any): Any {
    if (!RIB) return float(0);
    let acc: Any = float(0);
    for (let m = 0; m < RIVER_M; m++) {
      const d = ph.sub(uRiver).add(float(m / RIVER_M));
      const dw = d.sub(floor(d.add(float(0.5)))).toVar();
      const head = exp(float(RIVER_K).mul(dw.mul(dw)).negate());
      const tail = select(
        dw.lessThan(float(0)),
        exp(dw.div(float(RIVER_TAIL))),
        float(0),
      );
      acc = max(acc, max(head, tail.mul(float(0.65))));
    }
    return acc;
  }
  /**
   * THE WINDOW FADE — keyed to the particle's OWN live screen y, never to its
   * index. `screenYAt` returns the signed screen distance from the frame's
   * centre in band-height units (±0.5 across the frame), so this is 1 across
   * the whole frame and 0 by 0.16 band-heights (≈150 px) outside it — well
   * inside the ≈210 px the index window is padded by. Keying it to geometry
   * rather than to `uWinFirstEdge` means a mis-driven window loses links at
   * the frame edge instead of popping them in the middle of it.
   *
   * ⚠ It reads `uWinYc`, NOT `uCopyYc`: the copy lane's centre is only
   * written inside `laneEnabled`, and a disabled lane would leave this
   * masking the whole field off.
   */
  function windowFadeAt(p: Any): Any {
    if (!RIB) return float(1);
    const sy = p.y.sub(uWinYc);
    const asy = max(sy, sy.negate());
    return mix(
      float(1),
      float(1).sub(
        smoothstep(
          uWinHalf.mul(float(WINDOW_FADE_IN)),
          uWinHalf.mul(float(WINDOW_FADE_OUT)),
          asy,
        ),
      ),
      uWinOn,
    );
  }
  /** Fracture death-flash brightness at flow-t (broken only). */
  function flashAt(t: Any): Any {
    const d = t.sub(uFracture);
    return uFlash
      .mul(exp(float(FLASH_K).mul(d.mul(d)).negate()))
      .mul(uBroken);
  }

  /** ROUND-7 — ambient packet traffic at (targetIdx, edgeIdx, s, t):
   * PACKET_COUNT hash-staggered clocks per RECEIVING node each send a small
   * bright bead traveling s 0→1 WITH the flow (source star → target star).
   * A bead occupies 1/PACKET_SPAN of its cycle — the gaussian handles the
   * "off" majority for free (no branch) — so expected visible traffic ≈
   * COUNT/SPAN ≈ 0.17 packets/link (round-8-D: COUNT 2→1, SPAN 5→6, sized
   * for ~250 links instead of 21) ≈ 40 beads on screen: calm but alive.
   * CLOCK KEY = the link's TARGET node (packetClock below): every link
   * terminating at a node rides the SAME clock, so incoming beads CONVERGE
   * and land together — and nodeKissAt runs that identical clock, so the STAR
   * kiss peaks exactly at contact (causal, not merely statistically similar).
   * Distinct target nodes stay fully decorrelated (per-node hash + ±25% rate
   * variance — constant across a link, so a bead never smears across it).
   * Pure function of uFlowTime + uniforms → identical on the compute AND
   * static tiers, deterministic for any scrub state, and it quickens gently
   * with scroll (the flow clock's +40%·vel).
   * NARRATIVE GATES (broken): traffic never crosses the fracture — past-side
   * zeroed with the surge's own fracture window — and a bead dying INTO the
   * break sputters at PACKET_FLICKER_HZ (the flicker rides the particle's
   * own t, so it only shows where a packet is actually at the break). The
   * uRecohere hover tease re-opens the crossing for a beat (the dispFactor /
   * nodeDrift gate grammar). */
  /** The shared per-(receiving-node, k) traffic clock 0..1 — THE round-7
   * correlation contract: packetAt (bead position) and nodeKissAt (star
   * kiss) must read this same function or beads land without kisses. Phase
   * offset AND ±25% rate variance from one per-(node, k) hash. */
  function packetClock(nodeIdx: Any, k: number): Any {
    const hn = fract(
      sin(nodeIdx.mul(113.1).add(k * 71.3 + 29.7)).mul(43758.545),
    ).toVar();
    return fract(
      hn.add(uFlowTime.mul(uPacketRate).mul(float(0.75).add(hn.mul(0.5)))),
    );
  }
  function packetAt(targetIdx: Any, edgeIdx: Any, s: Any, t: Any): Any {
    let p: Any = float(0);
    for (let k = 0; k < PACKET_COUNT; k++) {
      // Bead center sweeps s = cyc·SPAN: on-edge for cyc ∈ [0, 1/SPAN],
      // ARRIVING (s=1) at cyc = 1/SPAN — where nodeKissAt(targetIdx) peaks.
      const cyc = packetClock(targetIdx, k);
      const d = s.sub(cyc.mul(float(PACKET_SPAN))).div(uPacketWidth);
      p = p.add(exp(d.mul(d).negate()));
    }
    const openGate = float(1).sub(uRecohere.mul(0.9));
    const past = smoothstep(
      uFracture,
      uFracture.add(float(FRACTURE_WINDOW)),
      t,
    )
      .mul(uBroken)
      .mul(openGate);
    const dNear = t.sub(uFracture.sub(float(0.02)));
    const nearBreak = exp(float(3000).mul(dNear.mul(dNear)).negate())
      .mul(uBroken)
      .mul(openGate);
    const flick = mix(
      float(1),
      float(0.35).add(
        sin(uFlowTime.mul(float(PACKET_FLICKER_HZ)).add(edgeIdx.mul(11.7)))
          .mul(0.5)
          .add(0.5)
          .mul(0.85),
      ),
      nearBreak,
    );
    return p.mul(float(1).sub(past)).mul(flick);
  }
  /** ROUND-7 — star "kiss": per-node packet-ARRIVAL pulses on the SAME
   * packetClock the incoming links ride (keyed by this node), gaussian-
   * centered at the arrival phase cyc = 1/PACKET_SPAN — the swell ramps
   * through the bead's final approach, peaks exactly as it lands (~±0.2s at
   * PACKET_KISS_WIDTH), then decays as the bead is absorbed. Read by BOTH
   * anchorNode (star swell) and particleScalars (emissive/whitening) — a pure
   * function of uFlowTime, so swell and glow arrive together across stages
   * and backends (continuous in time → no pop on the static tier). ROUND-8-D:
   * the kiss now lights a STAR, which is exactly the reference image's read.
   * Degraded nodes (broken, past the fracture) receive no traffic —
   * consistent with packetAt's fracture gate, since any link terminating past
   * the fracture has its beads killed at the break; the uRecohere tease
   * briefly restores BOTH ends of that contract at once. */
  function nodeKissAt(nodeIdx: Any, nT: Any): Any {
    let kSum: Any = float(0);
    for (let k = 0; k < PACKET_COUNT; k++) {
      const cyc = packetClock(nodeIdx, k);
      const d = cyc
        .sub(float(1 / PACKET_SPAN))
        .div(float(PACKET_KISS_WIDTH));
      kSum = kSum.add(exp(d.mul(d).negate()));
    }
    // In-degree proxy: links are oriented by nodeT, so the cloud's leftmost
    // fringe has in-degree 0 — nothing arrives there, so nothing kisses. A
    // true per-node in-degree would need a fifth uniformArray (a new binding),
    // which the zero-new-bindings constraint forbids; the nodeT proxy costs
    // nothing and is right for the fringe that actually matters.
    const fed = smoothstep(float(0.02), float(0.2), nT);
    const gate = float(1).sub(
      smoothstep(uFracture, uFracture.add(float(0.02)), nT)
        .mul(uBroken)
        .mul(float(1).sub(uRecohere.mul(0.9))),
    );
    return kSum.mul(fed).mul(gate);
  }

  /** Screen-motion vector (local units/s) feeding the velocity stretch.
   * Compute tier passes the LIVE velocity (plus the analytic pulse advection
   * on link particles); the static tier derives a mild fixed elongation
   * along the LINK DIRECTION + pulse/spark boosts — parity of look, not of
   * physics. Star cores carry no analytic motion (they must stay round points
   * — a stretched star would read as a smear, not a point of light). */
  function motionNode(metaN: Any, offN: Any, physVel: Any | null): Any {
    const role = metaN.x;
    const ef = edgeFrame(metaN, offN);
    const surge = surgeAt(ef.t);
    // ROUND 12 · D — THE CREST ADVECTS THE PARTICLE ALONG ITS OWN CHORD, and
    // that anisotropy is the entire escape from `f6cac67`. `buildVertex`
    // scales only `corner.x` by the stretch while `vQuadUv` stays the
    // UNROTATED quad, so a sprite pulled 2.95× along its chord is a STREAK
    // whose peak per-pixel alpha never moves — where the same sprite grown
    // isotropically is a bead. At a crest `spd = RIVER_ADVECT 1.30` ⇒
    // `stretch = 1 + min(1.95, STRETCH_MAX 2.0) = 2.95`: the same saturation
    // the surge already produces, no new cap behaviour. BOTH branches.
    const adv = RIB
      ? surge
          .mul(float(SURGE_ADVECT))
          .add(
            riverAt(phaseAt(ef.home)).mul(float(RIVER_ADVECT)),
          )
          .toVar()
      : surge.mul(float(SURGE_ADVECT));
    const streamGate = float(1).sub(clamp(role, float(0), float(1)));
    if (physVel) {
      return physVel.add(ef.dir.mul(adv).mul(streamGate));
    }
    const streamMotion = ef.dir.mul(float(K_STATIC_ELONG).add(adv));
    const sparkMotion = sparkDir(offN).mul(uFlash.mul(1.2));
    return select(
      role.lessThan(float(0.5)),
      streamMotion,
      select(role.lessThan(float(1.5)), vec3(0.0, 0.0, 0.0), sparkMotion),
    );
  }

  /** Build the per-particle COLOR (tone × emissive), ALPHA and SIZE from a
   * meta/off pair (attributes on the static path, storage `.toAttribute()`
   * reads on the compute path — identical math). All per-instance constants,
   * so the whole ramp lives in the vertex stage (round-2).
   *
   * ROUND 9-B: `posN` is the particle's LIVE LOCAL position (the simulated
   * position on the compute tier, the reveal-blended analytic centre on the
   * static one) — the copy-column mask has to be evaluated where the sprite
   * actually DRAWS, not where its anchor is, which matters most during the
   * reveal coalesce when a particle is still out at its scattered seed. */
  function particleScalars(metaN: Any, offN: Any, posN: Any) {
    const role = metaN.x;
    // ROUND 9-B — the copy-column gate/mask at this particle's live position.
    // Hoisted here because the STAR branch needs the GATE (to switch its
    // ignition machinery off over the copy) as well as the mask.
    const cGate = copyGateAt(posN.x).toVar();
    const ef = edgeFrame(metaN, offN);
    const t = ef.t;
    const disp = dispFactor(t);
    const u = clamp(
      t.sub(uFracture).div(float(1).sub(uFracture)),
      float(0),
      float(1),
    );
    // Debris dims + fades with its drift progress.
    const deadMix = clamp(
      disp.mul(float(0.4).add(u.mul(0.6))),
      float(0),
      float(1),
    );
    // Per-link s fades — the filament TIPS dissolve into the STAR CORES AND
    // the recycle-pop killer (a particle wraps s at near-zero alpha; the
    // wrap-snap in the kernel handles the anchor teleport).
    const edge = smoothstep(float(0), float(EDGE_FADE_IN), ef.s).mul(
      float(1).sub(smoothstep(float(1 - EDGE_FADE_OUT), float(1), ef.s)),
    );
    // CLEAN BREAK (broken): zero alpha right past the fracture depth on
    // every crossing filament — a visible cut, not mush.
    const gap = float(1).sub(
      smoothstep(uFracture.sub(float(0.008)), uFracture, t)
        .mul(
          float(1).sub(
            smoothstep(
              uFracture.add(uGap),
              uFracture.add(uGap).add(float(0.02)),
              t,
            ),
          ),
        )
        .mul(uBroken),
    );
    // Radial fringe 0..1 → the three-stop ramp driver.
    const fringe = clamp(
      offN.y.mul(0.85).add(metaN.w.mul(0.3)),
      float(0),
      float(1),
    );
    const surge = surgeAt(t);
    const flash = flashAt(t);
    // Round-7: the ambient packet bead at this particle (0..~1) — constant
    // small-scale traffic between the big pulses.
    const packet = packetAt(ef.ib, ef.edgeIdx, ef.s, t).toVar();
    // ── ROUND 12 · D — THE SIGNAL, AND THE STRUCTURE IT TRAVELS ON ────────
    // One phase read, three consumers: `river` is the travelling light,
    // `born` is the birth front, `winFade` is the κ-window's geometric
    // envelope. All three are pure functions of the particle's LIVE local
    // position, so they are identical on both backends and cost no varying.
    const ph = phaseAt(posN).toVar();
    const river = riverAt(ph).toVar();
    const born = bornAt(ph).toVar();
    const winFade = windowFadeAt(posN).toVar();
    /** 1 for the LINK role, 0 for stars and sparks — the same expression
     * `motionNode` uses, and cheaper than waiting for `isStream` below. */
    const streamSel = float(1).sub(clamp(role, float(0), float(1))).toVar();

    // --- LINK: white-cyan core → cyan body → blue fringe; ember fray;
    //     white-cyan pulse head with its trailing gradient. ---
    const coreMix = float(1).sub(smoothstep(float(0), float(0.3), fringe));
    const bodyCol = mix(
      uColCyan,
      uColBlue,
      smoothstep(float(0.2), float(1), fringe),
    );
    // Round-7 cool→warm tint across the CLOUD (navy→cyan family only, NO
    // violet): the left of the plexus runs COOLER (toward blue), the right
    // warmer-cyan (toward white-cyan) — the signal visibly matures left→
    // right. Max mixes at nodeT 0 / 1; the middle stays pure brand cyan.
    const coolK = clamp(
      float(0.5).sub(t).mul(2 * LAYER_TINT_COOL),
      float(0),
      float(1),
    );
    const warmK = clamp(
      t.sub(float(0.5)).mul(2 * LAYER_TINT_WARM),
      float(0),
      float(1),
    );
    const bodyDepth = mix(mix(bodyCol, uColBlue, coolK), uColCore, warmK);
    const gradCol = mix(bodyDepth, uColCore, coreMix);
    // Round-7: the frayed side's VERY tips warm toward amber — the failure
    // tone one step warmer (still desaturated ember, sub-bloom, never
    // signal-cyan).
    const emberCol = mix(
      mix(
        uColEmber,
        uColEmber2,
        clamp(metaN.w.mul(0.6).add(u.mul(0.4)), float(0), float(1)),
      ),
      uColEmberTip,
      smoothstep(float(0.6), float(1), u).mul(float(EMBER_TIP_MIX)),
    );
    // White-hot head: the surge OR a passing packet (packets are smaller
    // PACKET_WHITE-weighted beads of the same core tone).
    const headMix = clamp(
      surge
        .mul(0.85)
        .add(packet.mul(float(PACKET_WHITE)))
        // ROUND 12 · D — the crest whitens toward COL_CORE. Cyan→white only;
        // the ONE sanctioned warm in this field is uColEmberTip on the broken
        // fray (hue 36). NEVER violet.
        .add(river.mul(float(RIVER_WHITE)).mul(cGate)),
      float(0),
      float(1),
    ).mul(float(1).sub(deadMix));
    const toneStream = mix(mix(gradCol, emberCol, deadMix), uColCore, headMix);
    // Idle dignity: slow brightness shimmer (±uShimmer).
    //
    // ⚠ ROUND 12 · D — THE HASH MOVED FROM THE PARTICLE TO THE LINK on the
    // ribbon. A per-PARTICLE shimmer was right when the particle was a bead
    // riding a drawn chord; now that the particles ARE the line, a per-
    // particle hash reads as BOILING GRAIN along it. The line layer had it
    // right all along (`hLink`) and this is that expression, re-homed.
    const shimmerH = RIB
      ? fract(sin(ef.edgeIdx.mul(57.31).add(11.7)).mul(43758.545))
      : metaN.w;
    const shimmer = float(1).add(
      sin(uTime.mul(0.5).add(shimmerH.mul(37.0)).add(t.mul(9.0))).mul(uShimmer),
    );
    // Round-3 row-reactive brightness: the ignited row's zone glows. On
    // broken the window reaches into the debris (row 2 = the fracture) where
    // deadMix keeps the boost a warm ember lift, not a debris flare.
    const rowBright = float(1).add(rowResponse(t).mul(uRowGain));
    // Round-7 per-link brightness profile: 4·s·(1−s) parabola — emissive
    // ×(1−EDGE_MID_BRIGHT/2) at the tips (dimming into the STAR CORES)
    // rising to ×(1+EDGE_MID_BRIGHT/2) mid-span. Tip floor 1.6·0.85 = 1.36
    // keeps the >1.0 bloom contract.
    const midProfile = float(1 - EDGE_MID_BRIGHT / 2).add(
      ef.s.mul(float(1).sub(ef.s)).mul(4 * EDGE_MID_BRIGHT),
    );
    const emisStreamRaw = float(1)
      .add(surge.mul(uSurgeGain))
      .add(packet.mul(uPacketGain))
      .add(flash.mul(float(FLASH_GAIN)))
      // ROUND 12 · D — the crest's emissive lift, inside the existing
      // additive chain so the knee below still bounds it.
      .add(river.mul(float(RIVER_GAIN)).mul(cGate))
      .mul(float(STREAM_EMISSIVE))
      .mul(midProfile)
      .mul(shimmer)
      .mul(rowBright)
      .mul(float(1).sub(deadMix.mul(0.75)))
      .toVar();
    // Fringe alpha drop (edges dissolve into the navy) + the debris ceiling.
    const fringeA = mix(
      float(1),
      float(0.35),
      smoothstep(float(0.55), float(1), fringe),
    );
    // ROUND-8-G — THE LINK PARTICLE IS TRAFFIC, NOT THREAD. The thread is the
    // LineSegments layer (buildLinkLineLayer); these particles are the beads
    // that travel it, so their alpha rides a ramp instead of a constant:
    // faint DUST at rest (uDustAlpha — round-8-I 0.012, post-blend 0.018: a
    // grain ON the 0.568 line, where 0.06/0.090 was a fog OVER the band)
    // rising to uBeadAlpha 0.9 where a packet or the surge head is passing
    // (post-blend 3.6 / 5.0 — over the ≈1.0 bloom floor, so the traffic BLOOMS
    // and the mesh under it does not; the bead end did NOT move).
    const traffic = clamp(
      packet
        .add(surge.mul(0.8))
        .add(river.mul(float(RIVER_TRAFFIC)).mul(cGate)),
      float(0),
      float(1),
    ).toVar();
    const liveA = mix(uDustAlpha, uBeadAlpha, traffic).mul(fringeA);
    // The debris branch is ABSOLUTE now: a frayed link carries no traffic
    // (packetAt is gated past the fracture), so scaling it by either end of
    // the ramp would be wrong. DEBRIS_ALPHA_MAX was re-based 0.35 → 0.22 to
    // reproduce the 0.35 × the old STREAM_ALPHA 0.62 that shipped.
    const debrisA = float(DEBRIS_ALPHA_MAX).mul(
      float(1).sub(u.mul(float(DEBRIS_FADE))),
    );
    /**
     * ── ROUND 12 · D — THE OVERLAP NORMALISER ─────────────────────────────
     *
     * On the ribbon a link carries a FIXED number of sprites (`perLink`,
     * a build constant — every edge keeps its residue class), so the
     * delivered along-link spacing is `L_screen / perLink` and varies with
     * the link's own length: 0.75 px on the mean 152 px link, 1.67 px on the
     * longest 341 px one. Left alone, the accumulated luminance
     * `A = 0.624·P·S/s` would then be 2.2× brighter on a short link than on a
     * long one — link-to-link brightness banding on a net whose whole brief
     * is to read as ONE thing, and a bloom that fires on the short links
     * only.
     *
     * So the strand is authored at a CONSTANT delivered `A`: hold the sprite
     * WIDTH uniform (a uniform line weight is what "one continuous net"
     * means) and scale the per-sprite alpha down wherever the geometry is
     * over-dense. Normalising the SIZE instead would take the shortest links
     * to a 0.2 px sprite, under the `Discard` crop.
     *
     * ⚠ Only ever scales DOWN (`min(1, …)`). Where the overlap is already
     * below 1.65 the answer is not more alpha — that is the bead failure —
     * it is more particles or a wider sprite, both of which are budget
     * decisions and both of which are made at build time.
     *
     * `uBandPx = 0` (never driven / not a ribbon) leaves this exactly 1.
     */
    const restSizeK = mix(float(K_CORE_BOOST), float(K_FRINGE_DROP), fringe)
      .mul(float(K_DUST_SIZE))
      // ROUND 13b — per-strand size hierarchy: the core strand carries the
      // line with larger overlapping sprites, the sheath is finer grain.
      // Build-time gated; non-ribbon bakes the identical chain.
      .mul(
        RIB
          ? mix(
              float(STRAND_CORE_SIZE_RIBBON),
              float(STRAND_SHEATH_SIZE_RIBBON),
              ef.strand,
            )
          : float(1),
      )
      // ROUND 12 — DENDRITIC TAPER. A constant-width tube is the strongest
      // "drawn by a computer" cue left once the path curves: a real process is
      // widest where it leaves a soma and narrowest at mid-span. Same 4s(1−s)
      // profile the arc rides, so the thinnest point and the deepest bow are
      // the same point. Exactly 1 on every non-ribbon build.
      .mul(
        K_LINK_TAPER >= 1
          ? float(1)
          : mix(
              float(1),
              float(K_LINK_TAPER),
              ef.s.mul(float(1).sub(ef.s)).mul(4.0),
            ),
      )
      .toVar();
    /** The RAW geometric overlap this link would deliver at the authored
     * sprite size — `S_css / s_css`, both in delivered CSS px. */
    const ov0 = !RIB
      ? float(1)
      : (() => {
          const dAB = ef.B.sub(ef.A);
          const spacingPx = length(
            vec2(dAB.x.div(max(uPlaneAspect, float(1e-4))), dAB.y),
          )
            .mul(uBandPx)
            .mul(float(1 / Math.max(perLink, 1e-6)));
          return restSizeK
            .mul(float(NEURAL_POINT_SIZE / CAMERA_Z))
            .div(max(spacingPx, float(1e-4)))
            .toVar();
        })();
    const normRatio = RIB
      ? float(REST_OVERLAP).div(max(ov0, float(1e-4))).toVar()
      : float(1);
    /** > 1 where the link is SPARSER than the continuity law wants: grow the
     * sprite along the whole link (capped at `SIZE_NORM_MAX`) rather than let
     * it go dotted. */
    const sizeNorm = RIB
      ? clamp(normRatio, float(1), float(SIZE_NORM_MAX))
      : float(1);
    /** ≤ 1 where it is DENSER: drop the per-sprite alpha in exact
     * compensation, so the accumulated `A = 0.624·P·S/s` is flat across the
     * net and the bloom cannot fire on the short links only. */
    const overlapNorm = RIB ? min(float(1), normRatio) : float(1);
    // ROUND 13 — the sheath strand is ATMOSPHERE, not a second line: strand 1
    // carries STRAND_SHEATH_ALPHA× the light so the tube reads as a bright
    // core inside a soft volumetric halo. Build-time gated; `#production`'s
    // alpha chain is untouched.
    const alphaStreamBase = mix(liveA, debrisA, disp)
      .mul(edge)
      .mul(gap)
      .mul(overlapNorm);
    const alphaStream = (
      RIB
        ? alphaStreamBase.mul(
            mix(float(1), float(STRAND_SHEATH_ALPHA_RIBBON), ef.strand),
          )
        : alphaStreamBase
    ).toVar();
    // Size: the resting dust shrinks to DUST_SIZE (a 9.4px sprite sitting on
    // a 1px line is the chain-of-blobs read this round removes) and a passing
    // packet swells it back into a ~10.3px BEAD (PACKET_SIZE 2.0).
    // ROUND 12 · D — on the ribbon the same expression delivers a 2.80 CSS px
    // resting strand, a 3.78 px crest (`RIVER_SIZE`) and a 3.78 px bead
    // (`PACKET_SIZE_RIBBON` 0.35, a GLINT, not the 8.4 px lamp 2.0 would give).
    const sizeStream = restSizeK.mul(sizeNorm).mul(
      float(1)
        .add(surge.mul(0.45))
        .add(packet.mul(float(K_PACKET_SIZE)))
        .add(river.mul(float(RIVER_SIZE))),
    );
    /**
     * ── ROUND 12 · D — THE CONTRACT `LINE_LUM_MAX` USED TO CARRY ──────────
     *
     * The chord was the only layer in this file held UNDER the bloom
     * threshold, and it leaves with the chord. Its replacement is a TWO-STATE
     * ceiling on the same C¹ soft knee: the RESTING strand caps at
     * `DUST_LUM_MAX` (0.95, sub-threshold — nothing on it ever blooms, which
     * is what keeps the static picture "stars on darkness") and a bead or a
     * crest is allowed up to `BEAD_LUM_MAX`. Anything that lifts a resting
     * particle over 1.0 is a bug.
     *
     * ⚠ SOFT KNEE, NEVER `min(x, CONST)`. A hard cap on a moving wavefront
     * flat-tops whole links — measured at surge 0.436 in the round that
     * authored this expression — and turns "the wavefront sweeps the line"
     * into "links switch to the ceiling and back". Exact below 0.7·cap, then
     * `knee + over·span/(over + span)`: C¹ (unit slope at the knee),
     * monotonic, approaches the cap without reaching it.
     */
    const lumStream = toneStream.x
      .mul(0.2126)
      .add(toneStream.y.mul(0.7152))
      .add(toneStream.z.mul(0.0722));
    const emisStream = !RIB
      ? emisStreamRaw
      : (() => {
          // THE DELIVERED AXIAL OVERLAP, in the same terms the size and the
          // stretch are actually applied in — this is the quantity the eye
          // and the bloom highpass integrate, and capping the per-SPRITE peak
          // instead is what let a surge reach A = 7.8 (see `DUST_A_MAX`).
          // The stretch is estimated from the ANALYTIC advection on both
          // tiers: `physVel` is forbidden here (it exists on one backend
          // only), and a brightness ceiling that differed per backend would
          // be worse than one that is 7 % optimistic on the compute tier.
          const sizeRel = float(1)
            .add(surge.mul(0.45))
            .add(packet.mul(float(K_PACKET_SIZE)))
            .add(river.mul(float(RIVER_SIZE)));
          const advA = float(K_STATIC_ELONG)
            .add(surge.mul(float(SURGE_ADVECT)))
            .add(river.mul(float(RIVER_ADVECT)));
          const stretchA = float(1).add(
            min(advA.mul(uStretchGain), uStretchMax),
          );
          const ovLit = ov0
            .mul(sizeNorm)
            .mul(sizeRel)
            .mul(stretchA)
            .toVar();
          const lift = clamp(max(traffic, river), float(0), float(1)).toVar();
          const cap = mix(float(DUST_A_MAX), float(BEAD_A_MAX), lift).div(
            max(
              lumStream
                .mul(alphaStream)
                .mul(ovLit)
                .mul(float(DISC_CHORD_MEAN)),
              float(1e-4),
            ),
          );
          const knee = cap.mul(float(DUST_LUM_KNEE)).toVar();
          const under = min(emisStreamRaw, knee).toVar();
          const over = emisStreamRaw.sub(under).toVar();
          const span = cap.sub(knee).toVar();
          return under.add(
            over.mul(span).div(max(over.add(span), float(1e-4))),
          );
        })();

    // --- STAR CORE: a FILLED white-blue point with radiating spikes. The
    //     star's radial parameter is re-derived from the baked offset —
    //     dStar = |aOff.xy| / STAR_FLARE_LEN, 0 at the exact centre, 1 at a
    //     flare tip — and drives size, alpha, whiteness and emissive together,
    //     so the density piles up bright and solid at r = 0 and tapers to
    //     nothing along the four rays. Stars inside an ignition REGION read
    //     the gaussian-blended uRingFlash/uRingGlow; the pulse and the packet
    //     kiss brighten them; degraded stars (broken, past the fracture) dim
    //     toward ember — pulled back by the uRecohere hover tease. ---
    const nT = nodeTAt(starNodeIdx(metaN.y));
    // ROUND 9-B: the ignition machinery is GATED by the copy-column ramp. A
    // fully ignited star core reaches ≈165 post-blend (glow 1.9 × flash 3.4 ×
    // surge 1.6 × kiss 1.5 on the 10.67 resting value), and the ignition
    // REGIONS are nodeT .25/.5/.75 — region 1 lands at local x ≈ −0.21,
    // i.e. INSIDE the copy column. Sizing COPY_MASK_FLOOR for that excursion
    // would have cost the resting star field its last 15× of visibility; gating
    // it costs 3 multiplies and nothing visual, because at the floor the flash
    // is invisible anyway. Folding the gate into zGate covers uRingGlow AND
    // uRingFlash (and therefore the shockwave in sizeRing and the whitening in
    // toneRing) in one place — a copy-column star simply stays at rest.
    const zGate = cloudZoneGate(nT).mul(cGate).toVar();
    const glow = mix(float(1), zoneGlow(nT), zGate);
    const ringFlash = zoneFlash(nT).mul(zGate).toVar();
    const dStar = clamp(
      length(offN.xy).div(float(STAR_FLARE_LEN)),
      float(0),
      float(1),
    ).toVar();
    const nodePast = smoothstep(uFracture, uFracture.add(float(0.02)), nT)
      .mul(uBroken)
      .mul(float(1).sub(uRecohere.mul(0.9)));
    // Round-7: the packet-arrival kiss — the same clock that swells the star
    // in anchorNode brightens + slightly whitens it here (subtler than an
    // ignition flash: PACKET_NODE_GAIN 0.5 vs 2.4).
    const kiss = nodeKissAt(starNodeIdx(metaN.y), nT).toVar();
    const emisRing = float(RING_EMISSIVE)
      .mul(uStarPunch)
      .mul(mix(float(STAR_CORE_EMIS), float(STAR_TIP_EMIS), dStar))
      .mul(glow)
      .mul(float(1).add(ringFlash.mul(float(RING_FLASH_GAIN))))
      // ROUND 9-B: surge flare + packet kiss ride the copy gate for the same
      // reason zGate does — over the copy column the star holds its rest value
      // (10.67), which is exactly what COPY_MASK_FLOOR is sized on.
      .mul(float(1).add(surgeAt(nT).mul(0.6).mul(cGate)))
      .mul(float(1).add(kiss.mul(float(PACKET_NODE_GAIN)).mul(cGate)))
      // ROUND 12 · D — a star inside a crest lifts too, or the signal would
      // visibly travel the links and step OVER the neurons. `.mul(cGate)` is
      // mandatory: a fully ignited core is already ×15.5 its rest and the
      // copy column's floor is sized on the RESTING value.
      .mul(float(1).add(river.mul(float(RIVER_STAR)).mul(cGate)))
      .mul(float(1).sub(nodePast.mul(0.5)));
    // The CORE reads whitest and the spikes cool toward the link tone; stars
    // on the left of the cloud pick up a half-strength version of the links'
    // cool tint (the cool→warm maturity ramp).
    const haloBase = mix(
      uColCyan,
      uColBlue,
      clamp(
        float(0.5).sub(nT).mul(2 * LAYER_TINT_COOL),
        float(0),
        float(1),
      ).mul(0.5),
    );
    const toneRing = mix(
      mix(
        haloBase,
        uColCore,
        clamp(
          float(RING_WHITE)
            .add(ringFlash.mul(0.5))
            .add(float(1).sub(dStar).mul(float(STAR_CORE_WHITE)))
            .add(kiss.mul(0.2)),
          float(0),
          float(1),
        ),
      ),
      uColEmber2,
      nodePast.mul(0.7),
    );
    const alphaRing = uNodeAlpha
      .mul(mix(float(1), float(STAR_TIP_ALPHA), pow(dStar, STAR_ALPHA_POW)))
      .mul(float(1).sub(nodePast.mul(float(NODE_DEGRADE))));
    const sizeRing = float(RING_POINT_SIZE_BOOST)
      .mul(mix(float(STAR_CORE_SIZE), float(STAR_TIP_SIZE), dStar))
      .add(ringFlash.mul(0.35));

    // --- SPARK: white-hot burst, alive only while uFlash burns. ---
    const sparkLife = clamp(float(1).sub(uFlash), float(0), float(1));
    const alphaSpark = smoothstep(float(0), float(0.25), uFlash)
      .mul(float(0.9))
      .mul(uBroken);
    const toneSpark = mix(uColCore, uColCyan, sparkLife);
    const emisSpark = float(STREAM_EMISSIVE).mul(
      float(1).add(uFlash.mul(float(FLASH_GAIN))),
    );
    const sizeSpark = float(0.9).add(metaN.w.mul(0.5));

    // --- Combine by role (0 link · 1 star core · 2 spark). ---
    const isStream = role.lessThan(float(0.5));
    const isRing = role.lessThan(float(1.5));
    const tone = select(
      isStream,
      toneStream,
      select(isRing, toneRing, toneSpark),
    );
    const emis = select(
      isStream,
      emisStream,
      select(isRing, emisRing, emisSpark),
    );
    // ROUND 9-B: ONE multiplicative mask on the combined alpha — every role
    // obeys it (stars, link dust/beads, fracture debris, sparks). Multiplicative
    // on purpose rather than a luminance ceiling: additive blending makes the
    // delivered light scale EXACTLY with the mask, so the WCAG arithmetic is a
    // product rather than an estimate, the internal ratios (star 593× dust) are
    // preserved instead of being flattened back into the round-8-I haze, and
    // the spatial ramp reads as a smooth falloff rather than the near-step a
    // ramped cap would give.
    /**
     * ── ROUND 12 · D — THE MASK, ASSEMBLED LAST BECAUSE IT NOW READS THE
     *    REST-NESS OF THE PARTICLE IT IS MASKING ──────────────────────────
     *
     * Three factors join `copyMaskAt` here, and all three had to land on
     * `cMask` rather than on the alpha, because `cMask` feeds BOTH the output
     * alpha AND the discard threshold. The file's own invariant: an identical
     * factor on both makes the surviving fragment SET byte-identical at every
     * point of the ramp (`disc·vAlpha·f < 0.004·cMask·f` ⟺ the un-factored
     * test for every `f > 0`). Scale the alpha alone and particles DELETE
     * instead of fading; scale it without the cut and you get a fill
     * regression plus a hard edge at the role boundary.
     *
     *  1. `born` — the birth front (structure). Free, by the identity above.
     *  2. `winFade` — the κ-window's geometric envelope, keyed to the
     *     particle's own screen y so a re-home is always off frame.
     *  3. the LINK role's own copy-column floor, and it must ride REST-NESS,
     *     not role: a bead at post-blend 1.80 on a 0.017 floor would deliver
     *     0.031 — 1.6× the ENTIRE AA budget. `(1−traffic)·(1−river)` hands
     *     the high floor to the resting dust only; every lift term is
     *     `.mul(cGate)` and vanishes inside the column anyway.
     *
     * ⚠ It also has to go through `copyMaskAt`, not around it: `cMask`
     * carries `uFieldFade` (the EXIT beat) and `copyYAt`, and a role mask
     * assembled without them would make `FIELD_EXIT_VH` miss the link role.
     */
    const restness = float(1)
      .sub(traffic)
      .mul(float(1).sub(river))
      .mul(streamSel);
    const cMask = copyMaskAt(
      posN,
      cGate,
      RIB ? mix(uCopyFloor, uCopyStreamFloor, restness) : undefined,
    )
      .mul(born)
      .mul(winFade)
      .toVar();
    const alpha = select(
      isStream,
      alphaStream,
      select(isRing, alphaRing, alphaSpark),
    ).mul(cMask);
    const sizeK = select(
      isStream,
      sizeStream,
      select(isRing, sizeRing, sizeSpark),
    );

    // ROUND 9-B — the fragment DISCARD threshold has to ride the mask too.
    // `Discard(alpha < 0.004)` is a fill optimisation sized on the layer's own
    // scale; leave it absolute and the copy column's masked particles (star
    // alpha 1e-4) are killed OUTRIGHT — which would not just delete the faint
    // star field, it would put a HARD EDGE in the ramp, because a star pops
    // from discarded to post-blend 0.043 the instant mask crosses 0.004
    // (≈4.6 px into the ramp at 1280). Scaling the threshold by the same mask
    // makes the cut SCALE-INVARIANT — and note the fill budget is unmoved
    // EVERYWHERE, not just at mask 1: `alpha` and `cut` carry the identical
    // `cMask` factor, so the fragment shader's test reduces algebraically to
    // the round-8 test (disc·baseAlpha·dofAlpha·uReveal < 0.004) at every point
    // of the ramp AND under the vertical term (which is 0.6, never 1, across
    // the whole reading zone). The surviving fragment SET is byte-identical;
    // what changes is only how much light each survivor delivers.
    return {
      colorE: tone.toVec3().mul(emis),
      alpha,
      sizeK,
      cut: float(0.004).mul(cMask),
    };
  }

  /** Shared fragment shade — identical on both backends. The disc UV is the
   * UNROTATED quad corner, so the screen-space stretch below renders it as an
   * ellipse along the motion axis (the streak). Round-3 depth-DOF: vSoft
   * (0 crisp → 1 near-bokeh) widens the disc falloff and sheds a little peak
   * brightness — near particles read as soft out-of-focus discs. */
  function buildShade(v: {
    vQuadUv: Any;
    vColor: Any;
    vAlpha: Any;
    vSoft: Any;
    /** ROUND 9-B: the mask-scaled discard threshold (particleScalars.cut) —
     * 0.004 at full strength, proportional inside the copy-column ramp. */
    vCut: Any;
  }): Any {
    return Fn(() => {
      const inner = mix(float(0.12), float(DOF_SOFT_MIN), v.vSoft);
      const disc = smoothstep(float(0.5), inner, length(v.vQuadUv))
        .mul(float(1).sub(v.vSoft.mul(0.2)))
        .toVar();
      const alpha = disc.mul(v.vAlpha).mul(uReveal).toVar();
      // ⚠ ROUND 12 · STAGE 2 FIX — `lessThanEqual`, NOT `lessThan`.
      // Under the D17 ribbon the copy mask can drive `vCut` to a TRUE ZERO
      // (`uFieldFade` reaches 0 at p = 1, and the exit fade is the only thing
      // that ends the act). With a strict `<`, `alpha = 0` fails `0 < 0` and
      // the fragment RASTERISES at zero contribution forever instead of
      // discarding — a fully faded field that still pays full fill rate, on a
      // band that no longer has a lateral cull to save it (the vertical cull
      // is section-keyed now). `<=` costs nothing and closes it.
      Discard(alpha.lessThanEqual(v.vCut));
      return vec4(v.vColor.toVec3(), alpha);
    })();
  }

  /** Shared vertex clip-position builder — billboard quad in device px with
   * VELOCITY STRETCH (round-2, the AT streak look): the quad elongates along
   * the screen projection of `motion` by 1 + min(|motion|·uStretchGain,
   * uStretchMax) — 3× at surge speed. Magnitude comes from LOCAL speed
   * (rect-scale independent); direction from view space (what the eye sees).
   * Zero/slow motion degrades to the plain round disc. */
  function buildVertex(center: Any, depthK: Any, sizeK: Any, motion: Any): Any {
    return Fn(() => {
      const mv = modelViewMatrix.mul(vec4(center, 1.0)).toVar();
      const dist = mv.z.negate();
      const clip = cameraProjectionMatrix.mul(mv).toVar();
      const sizeNode = uPointSize
        .mul(uPixelRatio)
        .mul(sizeK)
        .mul(depthK)
        .div(max(dist, 0.001));
      const spd = length(motion);
      // Round-4 §B.3: streak stretch gain +uVelStretch·vel — faster scroll =
      // longer light streaks (the AT read). The uStretchMax cap still rules.
      const stretch = float(1).add(
        min(
          spd
            .mul(uStretchGain)
            .mul(float(1).add(uScrollVel.mul(uVelStretch))),
          uStretchMax,
        ),
      );
      // The 1e-4 x-bias makes zero motion degrade to the unrotated quad
      // (stretch ≈ 1 there, so the orientation is invisible anyway).
      const mView = modelViewMatrix.mul(vec4(motion, 0.0)).toVar();
      const dl = length(mView.xy);
      const dir = mView.xy.add(vec2(1e-4, 0.0)).div(max(dl, 1e-4)).toVar();
      const corner = positionLocal.xy;
      const cs = corner.x.mul(stretch);
      const off = vec2(
        dir.x.mul(cs).sub(dir.y.mul(corner.y)),
        dir.y.mul(cs).add(dir.x.mul(corner.y)),
      );
      clip.xy.addAssign(off.mul(sizeNode).div(uViewport).mul(2.0).mul(clip.w));
      return clip;
    })();
  }

  /** Depth attenuation (nearer = bigger) from local z: the round-2 aerial
   * cue × the round-3 DOF size gain (uDof-scaled — far smaller, near bigger). */
  function depthAtten(z: Any): Any {
    const zn = zNorm(z);
    const base = float(1).add(zn.sub(0.5).mul(float(NEURAL_DEPTH_ATTEN)));
    const dof = float(1).add(
      zn.sub(0.5).mul(float(DOF_SIZE_GAIN)).mul(uDof),
    );
    return base.mul(dof);
  }

  function configureMaterial(material: Any, shade: Any) {
    material.colorNode = (shade as Any).xyz;
    material.opacityNode = (shade as Any).w;
    material.transparent = true;
    material.depthWrite = false;
    material.depthTest = false;
    material.blending = AdditiveBlending;
    material.toneMapped = false;
    material.side = DoubleSide;
  }

  // === Round-4 §B.1/§B.2 — mined-effect layers ==============================
  // Pure fragment math on tiny instanced quads — no textures (procedural
  // value noise stands in for igloo's tWind), no storage buffers, identical
  // node graphs on both backends. Each layer's geometry uses 2 vertex slots
  // (quad position + one instanced attribute) on its OWN material.

  /** Deterministic [0,1) 2D hash — same sin-dot family as the debris hashes. */
  function hash2(p: Any): Any {
    return fract(sin(p.x.mul(127.1).add(p.y.mul(311.7))).mul(43758.5453));
  }
  /** Bilinear 2D value noise with smoothstep fade — the procedural stand-in
   * for igloo's 128px tileable noise texture (no-textures contract). */
  function vnoise2(p: Any): Any {
    const ip = floor(p).toVar();
    const fp = fract(p).toVar();
    const wf = fp.mul(fp).mul(float(3.0).sub(fp.mul(2.0))).toVar();
    const n00 = hash2(ip);
    const n10 = hash2(ip.add(vec2(1.0, 0.0)));
    const n01 = hash2(ip.add(vec2(0.0, 1.0)));
    const n11 = hash2(ip.add(vec2(1.0, 1.0)));
    return mix(mix(n00, n10, wf.x), mix(n01, n11, wf.x), wf.y);
  }
  /** Shared quad-layer geometry: the billboard quad + one instanced attr. */
  function layerGeometry(name: string, data: Float32Array, itemSize: number) {
    const geo = new InstancedBufferGeometry();
    geo.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(QUAD_CORNERS), 3),
    );
    geo.setIndex(new BufferAttribute(new Uint16Array(QUAD_INDEX), 1));
    geo.setAttribute(name, new InstancedBufferAttribute(data, itemSize));
    geo.instanceCount = data.length / itemSize;
    return geo;
  }

  /**
   * B1 — LAYER MEMBRANES (healthy). Three camera-facing discs, one at each
   * MIDDLE-LAYER centroid (eval → trace → guardrail — the processing planes
   * the filaments visibly pierce), running igloo §5's forcefield recipe
   * verbatim (dossier L41583):  n = sin(noise·13 + time − y·10)·.5+.5;
   * mask = aastep(0.2, n)·(1 − n·.75);  alpha = mask·base + mask⁵·.5 + rim·.5.
   * Deviations from igloo, both per the round-4 brief: camera-facing quads
   * (igloo's view-dependent tilt dropped) and value noise for the triangles/
   * noise textures. The disc center reads streamCenter(RING_T[i]) — with the
   * round-8-D slice spine that IS slice centroid i+1, so the plexus
   * re-registration was free. The band phase arrives pre-integrated per
   * layer (uMembranePhase) — the pulse ripple is a ×3 phase-SPEED,
   * driver-side, never a jump.
   */
  function buildMembraneLayer(): { geometry: Any; material: Any } {
    const geo = layerGeometry("aRing", new Float32Array([0, 1, 2]), 1);
    const mat = new MeshBasicNodeMaterial();
    const aRing = attribute("aRing");

    // Quad spans the ring diameter × margin (covers shockwave + bulge); the
    // x half-extent is aspect-corrected so the disc is screen-circular inside
    // the anisotropically scaled group.
    const quadSize = float(RING_RADIUS * 2 * MEMBRANE_MARGIN);
    mat.vertexNode = Fn(() => {
      const center = streamCenter(ringT(aRing)).toVar();
      const local = center.add(
        vec3(
          positionLocal.x.mul(quadSize).mul(uPlaneAspect),
          positionLocal.y.mul(quadSize),
          float(0),
        ),
      );
      return cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(local, 1.0)));
    })();

    // Varying discipline: self-contained expressions only. vUv is scaled so
    // r = 1 at the ring radius (quad edge lands at r = MEMBRANE_MARGIN).
    const vUv = varying(positionLocal.xy.mul(2 * MEMBRANE_MARGIN));
    // Per-ring scalars resolved in the vertex stage (uniformArray element by
    // attribute-derived int — the exact ringGlowAt/particleScalars pattern).
    const vAux = varying(
      vec4(
        membraneSealAt(aRing),
        ringFlashAt(aRing),
        rowGlowAtNode(aRing),
        membranePhaseAt(aRing),
      ),
    );
    const vSeed = varying(aRing);

    const shade = Fn(() => {
      const seal = vAux.x;
      const flash = vAux.y;
      const bulge = vAux.z;
      const phase = vAux.w;
      const r = length(vUv).toVar();
      // --- Igloo banded noise, verbatim: sin(noise·13 + time − y·10) -------
      const noi = vnoise2(
        vUv
          .mul(float(MEMBRANE_NOISE_SCALE))
          .add(vec2(vSeed.mul(7.31), vSeed.mul(3.17))),
      );
      const band = sin(noi.mul(13.0).add(phase).sub(vUv.y.mul(10.0)))
        .mul(0.5)
        .add(0.5)
        .toVar();
      // aastep(0.2, band): fwidth-feathered step (igloo's aastep helper).
      const aaw = max(fwidth(band).mul(0.8), float(1e-3));
      const mask = smoothstep(
        float(MEMBRANE_BAND_THRESH).sub(aaw),
        float(MEMBRANE_BAND_THRESH).add(aaw),
        band,
      )
        .mul(float(1).sub(band.mul(0.75)))
        .toVar();
      // --- Seal radial mask: grows 0→1 on ignition, bulges on row hover ----
      const sealR = max(seal, float(1e-3))
        .mul(float(1).add(uMembraneBulge.mul(bulge)))
        .toVar();
      const contain = float(1)
        .sub(smoothstep(sealR.mul(0.82), sealR, r))
        .toVar();
      // Igloo's radialMask·.5 term, read as the rim glow where the membrane
      // meets the ring.
      const rim = smoothstep(sealR.mul(0.55), sealR.mul(0.95), r).mul(contain);
      const aBand = mask
        .mul(float(MEMBRANE_BAND_BASE))
        .add(pow(mask, 5.0).mul(0.5))
        .add(rim.mul(0.5));
      const alpha = aBand
        .mul(contain)
        .mul(uMembraneAlpha)
        .mul(float(1).add(flash.mul(float(MEMBRANE_RIPPLE_ALPHA))))
        .mul(smoothstep(float(0), float(0.05), seal))
        .mul(uReveal)
        .toVar();
      Discard(alpha.lessThan(0.003));
      // White-cyan at the ring tone; the flash pushes whiter + brighter.
      const tone = mix(
        uColCyan,
        uColCore,
        clamp(float(RING_WHITE).add(flash.mul(0.4)), float(0), float(1)),
      );
      const emis = float(MEMBRANE_EMISSIVE).add(flash.mul(0.8));
      return vec4(tone.toVec3().mul(emis), alpha);
    })();

    configureMaterial(mat, shade);
    return { geometry: geo, material: mat };
  }

  /**
   * B2 — fracture NEBULA (broken). Three soft quads clustered at the fracture
   * point running igloo §4's tunnel-smoke recipe verbatim (dossier L41275):
   * sheared uv (uv.x += uv.y), v = noise(uv·3+d)·noise(uv·4+d)·noise(uv·6+d)
   * with the SAME drift vector d = (−t, 0.7t) on all three taps, alpha =
   * pow(v,3)·3 × radial falloff. Ember core (COL_EMBER2) → transparent, a
   * faint cyan rim on the upstream (−x) side. The drift clock arrives
   * pre-integrated (uNebulaDrift — uFlash kicks its speed driver-side); the
   * flare (×1+NEBULA_FLARE·uFlash) and the row-2 re-cohere thinning
   * (×1−NEBULA_THIN·uRowGlow[2]) fold into one vertex-computed varying.
   */
  function buildNebulaLayer(): { geometry: Any; material: Any } {
    const quadData = new Float32Array(NEBULA_QUADS.length * 4);
    NEBULA_QUADS.forEach((q, i) => quadData.set(q, i * 4));
    const geo = layerGeometry("aQuad", quadData, 4);
    const mat = new MeshBasicNodeMaterial();
    const aQuad = attribute("aQuad");

    // The quad's LOCAL point (centre + the aspect-corrected corner offset).
    // `nebCentre` is shared with the mask box below so the spline is emitted
    // once, not twice, in this stage.
    const nebCentre = streamCenter(uFracture);
    const nebLocal = nebCentre
      .add(vec3(aQuad.x, aQuad.y, float(0)))
      .add(
        vec3(
          positionLocal.x.mul(aQuad.z).mul(uPlaneAspect),
          positionLocal.y.mul(aQuad.z),
          float(0),
        ),
      );

    mat.vertexNode = Fn(() =>
      cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(nebLocal, 1.0))),
    )();

    const vUv = varying(positionLocal.xy.mul(2.0));
    const vSeed = varying(aQuad.w);
    // ROUND 9-B: the smoke obeys the copy-column mask too. It is anchored at
    // the fracture (local x ≈ +0.14) and at DESKTOP aspects all three quads sit
    // entirely right of the copy bound (measured: x ≥ +0.048 at 1280, where the
    // copy ends at +0.029) — but an unmasked wisp peaks at ~0.054 post-blend,
    // 2.8× the AA budget, so it is masked on the LINE floor (this is background
    // smoke, not a subject). At the fracture centre (x = +0.139) the cost is
    // the gate's 0.85 at 1280 and 1.0 from 1366 up — the break still reads.
    //
    // THE MASK IS EVALUATED PER FRAGMENT, not per vertex, and that is
    // load-bearing rather than fussy. `uPlaneAspect` is rect.h/rect.w, so a
    // quad's LOCAL x half-extent is 0.5·size·(h/w): 0.09 of the band on a
    // desktop, but **0.39 on a phone**, where the band is taller than it is
    // wide. A single interpolation across a box that wide is not the mask — it
    // is a straight line through it, and at 390 px the interpolated gate reads
    // 0.80 at the copy's right bound where the true gate is 0. That put the
    // brightest thing left in the phone band (≈0.043 added light, 2.2× the AA
    // budget ⇒ 3.4:1) straight over the copy — precisely the failure this
    // round exists to remove. Carrying the quad's BOX instead (centre + half
    // extent, both per-INSTANCE, so the interpolation is exact) and evaluating
    // `copyMaskLineAt` in the fragment stage costs two smoothsteps on three
    // quads and is correct at every aspect.
    const vNebBox = varying(
      vec4(
        nebCentre.xy.add(vec2(aQuad.x, aQuad.y)),
        vec2(aQuad.z.mul(uPlaneAspect).mul(0.5), aQuad.z.mul(0.5)),
      ),
    );
    // Flare × thin modulator — pure uniforms, vertex-computed (discipline).
    const vMod = varying(
      float(1)
        .add(uFlash.mul(float(NEBULA_FLARE)))
        .mul(float(1).sub(rowGlowAt(2).mul(float(NEBULA_THIN)))),
    );

    const shade = Fn(() => {
      // ROUND 9-B: the fragment's own LOCAL xy, reconstructed exactly from the
      // per-instance box (vUv ∈ [−1,1] spans the quad, so centre + uv·half is
      // the same point the vertex stage projected). The mask is then the same
      // pure function of local x/y the particles and the line evaluate.
      const nebMask = copyMaskLineAt(
        vNebBox.xy.add(vUv.mul(vNebBox.zw)),
      ).toVar();
      const r = length(vUv).toVar();
      // Igloo shear: uv.x += uv.y → the streaking-smoke read.
      const suv = vec2(vUv.x.add(vUv.y.mul(float(NEBULA_SHEAR))), vUv.y).toVar();
      const dv = vec2(uNebulaDrift.negate(), uNebulaDrift.mul(0.7)).toVar();
      const so = vec2(vSeed.mul(17.13), vSeed.mul(9.7));
      // Igloo triple-multiplied noise at ×3 / ×4 / ×6, same drift on all taps.
      const v1 = vnoise2(suv.mul(3.0).add(dv).add(so));
      const v2 = vnoise2(suv.mul(4.0).add(dv).add(so));
      const v3 = vnoise2(suv.mul(6.0).add(dv).add(so));
      // Igloo: alpha = pow(v,3)·3 — sparse organic wisps.
      const wisp = pow(v1.mul(v2).mul(v3), 3.0).mul(3.0).toVar();
      const radial = float(1).sub(smoothstep(float(0.35), float(1.0), r));
      const alpha = wisp
        .mul(radial)
        .mul(uNebulaAlpha)
        .mul(vMod)
        .mul(nebMask)
        .mul(uReveal)
        .toVar();
      // Threshold scaled by the same mask, for the reason the particle and line
      // layers scale theirs: an absolute cut would delete the masked smoke and
      // put a hard edge in the ramp instead of a falloff. Scale-invariant by
      // construction — both sides carry the same `nebMask` factor, so the
      // surviving fragment SET (and therefore the fill cost) is unchanged.
      Discard(alpha.lessThan(nebMask.mul(0.003)));
      // Ember core → transparent; faint cyan rim upstream (−x, the last
      // healthy light). smoothstep edges kept ascending (edge0 < edge1).
      const rimUp = float(1)
        .sub(smoothstep(float(-0.7), float(0.1), vUv.x))
        .mul(smoothstep(float(0.2), float(0.75), r));
      const tone = mix(
        uColEmber2.toVec3().mul(float(NEBULA_EMISSIVE).add(uFlash.mul(0.6))),
        uColCyan.toVec3().mul(1.3),
        rimUp.mul(float(NEBULA_RIM_GAIN)),
      );
      return vec4(tone, alpha);
    })();

    configureMaterial(mat, shade);
    return { geometry: geo, material: mat };
  }

  /**
   * ROUND-8-G — THE LINK LINE LAYER. ONE `LineSegments`, ONE draw call: the
   * plexus links are real line geometry now, following crystalPlexus.ts's
   * proven idiom (position-only-ish attributes, alpha-masked, additive,
   * depthWrite off, renderOrder −2, cross-backend, disposed with the build).
   *
   * SINGLE SOURCE OF TRUTH: the vertex tables are baked by
   * `bakeLinkLineGeometry(plexus, LINK_SEGMENTS)` from the SAME `plexus` the
   * particles read — there is no second generator and no second topology. The
   * vertex stage then re-derives the LIVE chord exactly the way `edgeFrame`
   * does (edgeEnds → uNodePos + nodeDrift), so a drifted broken endpoint
   * takes its line with it and a live `uniforms.uNodePos` edit moves the line
   * and the particles together.
   *
   * BUDGET (this is a SEPARATE program from the particle material, with its
   * own limits — verified, not assumed):
   *   - vertex buffers: `position` + `aLink` = **2 of 8**. No index buffer.
   *   - storage bindings: **0 of 8** (nothing here reads a storage buffer, so
   *     the layer is identical on the compute and analytic tiers).
   *   - uniform BLOCKS in the vertex stage: GLSLNodeBuilder emits one UBO per
   *     uniformArray, and since ROUND 12 · STAGE 0B this stage references
   *     FOUR — uNodePos, uNodeT, uEdgePack (the chord: uEdgeA+uEdgeB packed
   *     into one vec4 array, see EDGE_PACKED) and uRowGlow (rowResponse).
   *     Plus three's own shared groups, which a live WebGL2 GLSL dump shows
   *     are exactly TWO here (`object` and `render` — no `frame` group), that
   *     is **6 of the WebGL2 MAX_VERTEX_UNIFORM_BLOCKS floor of 12** (was 7),
   *     6 spare, where the particle material sits at 10/12 (was 11/12 — the
   *     "12/12" this note used to claim was never measured). Deliberately NOT
   *     referenced: uRingGlow /
   *     uRingFlash (ignition belongs to the STARS — the link particles never
   *     read them either, and adding them would spend headroom to make the
   *     mesh out-shout its own subject) and uStrandPhase / uStrandThick (a
   *     1px line has no braid).
   *   - fragment stage: zero uniformArrays; scalars only.
   *   - zero per-frame allocation: everything below is built once.
   *   - ROUND 9-B adds the copy-column mask to the VERTEX stage: five plain
   *     `uniform()` scalars (a shared group, NOT a new UBO block — the 8-of-12
   *     count above is unmoved), ~10 ALU, and one extra float varying
   *     (`vLineCut`). three emits one `out` per varying NODE rather than
   *     packing floats, so this material goes 3 → **4 of the WebGL2
   *     MAX_VARYING_VECTORS floor of 15** (vLineCol, vLineAux, vLineRest,
   *     vLineCut) — 11 spare either way.
   *
   * WHAT VARIES WHERE: the smooth, along-link brightness terms (surge, flash,
   * row attention, tint, shimmer, mid-span profile, DOF, reveal) resolve in
   * the VERTEX stage across LINK_SEGMENTS sub-segments; the SHARP masks (tip
   * fade, clean-break gap, fray dash) run per FRAGMENT, because at 1px an
   * interpolated edge is a staircase.
   */
  function buildLinkLineLayer(): NeuralFieldLines {
    const baked = bakeLinkLineGeometry(plexus, LINK_SEGMENTS);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(baked.position, 3));
    geo.setAttribute("aLink", new BufferAttribute(baked.aLink, 2));
    const mat = new LineBasicNodeMaterial();
    const aLink = attribute("aLink", "vec2");

    // --- 1. The LIVE chord — `edgeFrame` minus the flow parameter ----------
    const eIdx = clamp(aLink.x, float(0), float(EDGE_N - 1)).toVar();
    const sL = aLink.y.toVar();
    const { ia: iaL, ib: ibL } = edgeEnds(eIdx);
    const tAL = nodeTAt(iaL).toVar();
    const tBL = nodeTAt(ibL).toVar();
    const AL = nodeAt(iaL).add(nodeDrift(iaL, tAL)).toVar();
    const BL = nodeAt(ibL).add(nodeDrift(ibL, tBL)).toVar();
    // ROUND 12 — the SAME arc the particles ride. `bakeLinkLineGeometry`
    // already lays LINK_SEGMENTS (6) vertices per edge, so the polyline can
    // follow a curve at zero extra cost; it was simply being told to draw a
    // straight chord through all six. Identical hashes and identical
    // expression to `edgeFrame`, so the thread and the dust cannot drift
    // apart. Straight — and byte-identical — on every non-ribbon build.
    const posL = (() => {
      const straight = mix(AL, BL, sL);
      if (K_LINK_BEND <= 0) return straight.toVar();
      const dL = BL.sub(AL).toVar();
      const dirL = dL.div(max(length(dL), float(1e-5))).toVar();
      const hAmpL = fract(sin(eIdx.mul(83.17).add(29.3)).mul(43758.545)).toVar();
      const hRollL = fract(sin(eIdx.mul(151.7).add(7.9)).mul(43758.545)).toVar();
      const pRawL = cross(dirL, vec3(0, 0, 1)).toVar();
      const p0L = pRawL.div(max(length(pRawL), float(1e-5))).toVar();
      const p1L = cross(dirL, p0L).toVar();
      const rollL = hRollL.sub(0.5).mul(float(2 * K_BEND_ROLL)).toVar();
      const perpL = p0L.mul(cos(rollL)).add(p1L.mul(sin(rollL))).toVar();
      const ampL = min(length(dL).mul(float(K_LINK_BEND)), float(K_BEND_MAX))
        .mul(hAmpL.mul(2.0).sub(1.0))
        .toVar();
      const bowL = sL.mul(float(1).sub(sL)).mul(4.0).toVar();
      return straight.add(perpL.mul(ampL).mul(bowL)).toVar();
    })();
    const tL = mix(tAL, tBL, sL).toVar();

    mat.vertexNode = Fn(() => {
      return cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(posL, 1.0)));
    })();

    // --- 2. Per-link narrative state (all vertex stage) --------------------
    const dispL = dispFactor(tL).toVar(); // fray 0..1 (carries uRecohere)
    const uL = clamp(
      tL.sub(uFracture).div(float(1).sub(uFracture)),
      float(0),
      float(1),
    ).toVar(); // fray life progress
    const deadMixL = clamp(
      dispL.mul(float(0.4).add(uL.mul(0.6))),
      float(0),
      float(1),
    ).toVar();
    const surgeL = surgeAt(tL).toVar();
    const flashL = flashAt(tL).toVar();
    const rowL = rowResponse(tL).toVar();
    /** Per-LINK hash — decorrelates the shimmer and the reveal stagger. */
    const hLink = fract(sin(eIdx.mul(57.31).add(11.7)).mul(43758.545)).toVar();

    // --- 3. Tone: pale navy-cyan body, cool→warm across the cloud ----------
    const coolK = clamp(
      float(0.5).sub(tL).mul(2 * LAYER_TINT_COOL),
      float(0),
      float(1),
    );
    const warmK = clamp(
      tL.sub(float(0.5)).mul(2 * LAYER_TINT_WARM),
      float(0),
      float(1),
    );
    const bodyL = mix(uColCyan, uColBlue, uLineBlue);
    const bodyDepthL = mix(mix(bodyL, uColBlue, coolK), uColCore, warmK);
    // Fray embers, warming toward amber at the very tips (particle parity).
    const emberL = mix(
      mix(
        uColEmber,
        uColEmber2,
        clamp(hLink.mul(0.6).add(uL.mul(0.4)), float(0), float(1)),
      ),
      uColEmberTip,
      smoothstep(float(0.6), float(1), uL).mul(float(EMBER_TIP_MIX)),
    );
    const headL = clamp(
      surgeL.mul(float(LINE_SURGE_WHITE)),
      float(0),
      float(1),
    ).mul(float(1).sub(deadMixL));
    const toneL = mix(mix(bodyDepthL, emberL, deadMixL), uColCore, headL)
      .toVec3()
      .toVar();

    // --- 4. Alpha (vertex part; the sharp masks are per-fragment) ----------
    // Staggered reveal: link i knits in over uReveal ∈ [h·STAGGER, +0.45], so
    // the net assembles with the particle coalesce instead of switching on.
    const revealL = smoothstep(
      hLink.mul(float(LINE_REVEAL_STAGGER)),
      hLink.mul(float(LINE_REVEAL_STAGGER)).add(float(0.45)),
      uReveal,
    );
    const deadAL = float(LINE_DEAD_ALPHA).mul(
      float(1).sub(uL.mul(float(DEBRIS_FADE))),
    );
    const alphaL = uLineAlpha
      .mul(mix(float(1), deadAL, dispL))
      .mul(dofAlphaAt(posL.z))
      .mul(revealL)
      .toVar();

    // --- 5. Emissive, under a soft post-blend LUMINANCE ceiling ------------
    // At rest, mid-span, shimmer peak: lum(mix(CYAN, BLUE, LINE_BLUE_MIX 0.3))
    // 0.5029 × LINE_EMISSIVE 1.35 × midProfile 1.15 × shimmer 1.04 ×
    // LINE_ALPHA 0.70 = **0.568** — 43% under the ≈1.0 bloom threshold, and
    // 1/12.9 of the 7.33 star core.
    //
    // The ceiling is enforced on the REAL post-blend luminance, not on the
    // emissive multiplier, because the tone is not constant: the surge head
    // whitens toward COL_CORE (lum 0.9371) and the warm end of the nodeT tint
    // adds more, so the worst-case tone luminance is 0.768 — a flat emissive
    // cap sized on the 0.5029 body would have let a surge crossing a hovered
    // region reach 1.48 post-blend and bloom. Dividing LINE_LUM_MAX by the
    // ACTUAL lum × alpha makes the contract tone-independent and permanent:
    // whatever the colour, whatever the gains, the line lands under 0.97. The
    // >1.0 budget belongs to the star cores (7.33) and the beads (3.65).
    // Rec709 weights, spelled out (linear space — three converts hex Colors
    // into the linear working space, which is what PostFXNodes thresholds).
    //
    // ⚠ IT IS A SOFT KNEE, NOT A HARD min() — that was the round-8-G check's
    // one behavioural fix. Measured, a hard clamp engaged at surge 0.436, i.e.
    // across |ΔnodeT| ≤ 0.0744, WIDER than the surge gaussian's own 0.068
    // half-width: the entire visible head sat pinned at a flat 0.970 and, with
    // a full-tier link spanning only 0.035 of nodeT, links flat-topped WHOLE.
    // The declared "the wavefront visibly sweeps each line" became "links
    // switch to the ceiling and back", and a hovered row during a scroll was
    // already over the cap at surge 0 (raw 3.43 vs cap 2.76) — dead to the
    // surge entirely. LINE_LUM_KNEE keeps the chain EXACT up to 0.7·cap and
    // then compresses asymptotically, so the response stays monotonic to the
    // very top while the ceiling is approached and never reached.
    const shimmerL = float(1).add(
      sin(uTime.mul(0.5).add(hLink.mul(37.0)).add(tL.mul(9.0))).mul(uShimmer),
    );
    const midL = float(1 - EDGE_MID_BRIGHT / 2).add(
      sL.mul(float(1).sub(sL)).mul(4 * EDGE_MID_BRIGHT),
    );
    const lumL = toneL.x
      .mul(0.2126)
      .add(toneL.y.mul(0.7152))
      .add(toneL.z.mul(0.0722));
    const emisCapL = uLineLumMax.div(max(lumL.mul(alphaL), float(1e-3)));
    // Round-4 §B.3's scroll-velocity SWELL re-homed: widthEnvelope's job was
    // to thicken the filament while you scroll, and a 1px line has no width —
    // so the same uScrollVel × uVelSwell rides the BRIGHTNESS instead (the net
    // energises rather than fattens). It goes INSIDE the knee, so the ceiling
    // still holds; putting it on alpha would have dodged the cap entirely.
    const emisRawL = uLineEmissive
      .mul(midL)
      .mul(shimmerL)
      .mul(float(1).add(rowL.mul(uLineRowGain)))
      .mul(float(1).add(surgeL.mul(uLineSurgeGain)))
      .mul(float(1).add(flashL.mul(float(LINE_FLASH_GAIN))))
      .mul(float(1).add(uScrollVel.mul(uVelSwell)))
      .mul(float(1).sub(deadMixL.mul(float(LINE_DEAD_DIM))))
      .toVar();
    // Soft knee: exact below knee, then knee + over·span/(over + span) —
    // C1 (unit slope at the knee), monotonic, → emisCapL without reaching it.
    // `span` is cap·(1 − KNEE) ≥ 0.31 for every reachable cap, and the max()
    // is the belt-and-braces divide guard (a negative alpha from a degenerate
    // dead ramp would otherwise feed a 970 cap through the divide).
    const kneeL = emisCapL.mul(float(LINE_LUM_KNEE)).toVar();
    const underL = min(emisRawL, kneeL).toVar();
    const overL = emisRawL.sub(underL).toVar();
    const spanL = emisCapL.sub(kneeL).toVar();
    const emisL = underL.add(
      overL.mul(spanL).div(max(overL.add(spanL), float(1e-4))),
    );

    // --- 6. ROUND 9-B — the copy-column mask, on the OUTPUT alpha only ------
    // Deliberately NOT folded into `alphaL` above: `emisCapL` divides by
    // `lum × alphaL`, so a masked alphaL would push that product under the
    // 1e-3 divide guard and make the LINE_LUM_MAX ceiling inert exactly where
    // it is needed — a hovered row under a surge would then deliver 0.011 into
    // the copy column instead of the capped 0.0029. Applied HERE the two
    // contracts compose: the knee bounds the line at ≤ LINE_LUM_MAX 0.97 for
    // every gain and every tone, and the mask scales that bound, so the copy
    // column's absolute line ceiling is 0.97 × COPY_MASK_FLOOR_LINE = 0.00291
    // by construction. Same ramp as the particles, its own floor.
    const maskL = copyMaskLineAt(posL).toVar();
    const alphaOutL = alphaL.mul(maskL).toVar();

    // --- 7. Varyings (self-contained expressions — varying discipline) -----
    const vLineCol = varying(toneL.mul(emisL));
    const vLineAux = varying(vec4(alphaOutL, dispL, tL, sL));
    /** The BAKED rest position — the dash-phase anchor (see §8). */
    const vLineRest = varying(positionLocal);
    /** ROUND 9-B: the mask-scaled discard threshold — the particle layer's
     * `cut` twin, and for the same reason (an absolute 0.004 would delete the
     * masked line outright and put a hard edge in the ramp). Byte-identical at
     * full strength, proportional all the way down. */
    const vLineCut = varying(float(0.004).mul(maskL));

    // --- 8. Fragment: the sharp masks --------------------------------------
    const shade = Fn(() => {
      const a0 = vLineAux.x;
      const dsp = vLineAux.y;
      const tF = vLineAux.z;
      const sF = vLineAux.w;
      // Tips dissolve INTO the star cores they connect (the same EDGE_FADE
      // window the particle filament used, ≈8px on a 71px link).
      const fade = smoothstep(float(0), float(EDGE_FADE_IN), sF).mul(
        float(1).sub(smoothstep(float(1 - EDGE_FADE_OUT), float(1), sF)),
      );
      // CLEAN BREAK (broken): zero alpha right past the fracture on every
      // crossing line — a visible cut, not mush.
      const gapF = float(1).sub(
        smoothstep(uFracture.sub(float(0.008)), uFracture, tF)
          .mul(
            float(1).sub(
              smoothstep(
                uFracture.add(uGap),
                uFracture.add(uGap).add(float(0.02)),
                tF,
              ),
            ),
          )
          .mul(uBroken),
      );
      // FRAY DASH — crystalPlexus's broken-dash mask verbatim (a product of
      // three sines, thresholded). Sampled on the BAKED REST position, so the
      // dashes are welded to the geometry and never crawl as the endpoints
      // drift; blended in by `dsp`, so a healthy line is solid and a dying one
      // breaks up exactly like the SVG twin's ember `strokeDasharray`.
      const K = float(LINE_DASH_FREQ);
      const dn = sin(vLineRest.x.mul(K))
        .mul(sin(vLineRest.y.mul(K).add(1.3)))
        .mul(sin(vLineRest.z.mul(K).add(2.6)))
        .mul(0.5)
        .add(0.5);
      const dash = mix(
        float(1),
        smoothstep(float(LINE_DASH_LO), float(LINE_DASH_HI), dn),
        dsp,
      );
      const alpha = a0.mul(fade).mul(gapF).mul(dash).toVar();
      // ⚠ ROUND 12 · STAGE 2 FIX — `lessThanEqual`, NOT `lessThan`.
      // Under the D17 ribbon the copy mask can drive `vCut` to a TRUE ZERO
      // (`uFieldFade` reaches 0 at p = 1, and the exit fade is the only thing
      // that ends the act). With a strict `<`, `alpha = 0` fails `0 < 0` and
      // the fragment RASTERISES at zero contribution forever instead of
      // discarding — a fully faded field that still pays full fill rate, on a
      // band that no longer has a lateral cull to save it (the vertical cull
      // is section-keyed now). `<=` costs nothing and closes it.
      Discard(alpha.lessThanEqual(vLineCut));
      return vec4(vLineCol.toVec3(), alpha);
    })();

    configureMaterial(mat, shade);

    const object = new LineSegments(geo, mat);
    object.frustumCulled = false;
    // Behind the particles (−1) with the other mined layers; everything in
    // this band is additive, so the ordering is cosmetic, never occluding.
    object.renderOrder = -2;
    return {
      object,
      geometry: geo,
      material: mat,
      edgeCount: baked.edgeCount,
      vertexCount: baked.vertexCount,
    };
  }

  // Mode-gated layer builds (shared by BOTH backend branches below — pure
  // vertex/fragment materials, no compute dependency). ROUND-8 (owner: "non
  // capisco i cerchi"): the healthy MEMBRANE discs are retired by default —
  // MEMBRANE_ALPHA 0 skips the build entirely (no geometry/material, and
  // NeuralLattice's `build.membrane &&` mount gate then never mounts a mesh),
  // so the invisible layer costs nothing on either backend. Set the config
  // alpha > 0 to revive (rebuild required). The broken NEBULA stays: it
  // renders as sparse sheared smoke wisps at the fracture, never a disc
  // (see the config §B.2 round-8 review note).
  const membrane =
    mode === "healthy" && MEMBRANE_ALPHA > 0 ? buildMembraneLayer() : null;
  const nebula = mode === "broken" ? buildNebulaLayer() : null;
  // ROUND-8-G: the link lines are the mesh itself — built on every mode and
  // every backend (no storage buffers, no compute), so the analytic tier gets
  // the identical plexus.
  // ROUND 12 · D — THE CHORD IS OFF. `LINE_LAYER = false` skips the BUILD
  // (no geometry, no material, no draw call, no 6 UBO blocks) — the shipped
  // `MEMBRANE_ALPHA` idiom, mount gate included. Setting `LINE_ALPHA = 0`
  // would NOT have been a rollback: the fill goes to zero but the ~20 500
  // unculled vertices and the VBO all remain.
  const links = LINE_LAYER ? buildLinkLineLayer() : null;

  /** Gate-4 fingerprint — shared by both backend branches (same tables). */
  const stats = {
    seed: Number.isFinite(plexusSeed as number)
      ? (plexusSeed as number)
      : PLEXUS_MASTER_SEED[mode],
    well: plexusWell,
    nodes: NODE_N,
    edges: EDGE_N,
    meanDegree: NODE_N ? (2 * EDGE_N) / NODE_N : 0,
    minEdgeLocal: plexus.minEdgeLocal,
    components: plexus.components,
    largestComponent: plexus.largestComponent,
    meanEdgeLocal: plexus.meanEdgeLocal,
    checksum: plexus.checksum,
  };

  /**
   * ROUND 12 · STAGE 2 — everything the DRIVER has to know about the field it
   * just got, so it never has to re-derive a build-time decision from a config
   * constant that could drift out from under it.
   *
   * `fractureT` is the one that matters. `FRACTURE_T = 0.62` is an authored
   * position in `nodeT`, and on the ribbon `nodeT ≡ u` — so the fracture is no
   * longer a number, it is "wherever the stone is". Inverting the generator's
   * own normalisation (`nodeT = (x − xMin)/xSpan`) on the stone's ribbon x is
   * the only way to name it that cannot disagree with the delivered cloud.
   * On the ellipsoid arm it is `FRACTURE_T` untouched.
   */
  // ROUND 12 · D — THE κ KEYS, PUBLISHED FOR THE DRIVER. Both tables were
  // sorted by κ in `buildPlexus`, so these come out ASCENDING and a plain
  // binary search finds the frame's centre entry in ~10 steps, no allocation
  // in the frame path. The key is expressed in nodeT units — the same units
  // `uFront` / `uRiver` / `phaseAt` are in — so the window and the light
  // literally read one axis.
  const kappaKey = (n: [number, number, number]) =>
    (n[0] + RIBBON_KAPPA_K * plexus.bandAspect * n[1] - plexus.xMin) /
    Math.max(plexus.xSpan, 1e-6);
  const nodeKey = RIB ? Float32Array.from(nodeTbl.map(kappaKey)) : null;
  const edgeKey = RIB
    ? Float32Array.from(
        edgeTbl.map(
          ([a, b]: [number, number]) =>
            (kappaKey(nodeTbl[a]) + kappaKey(nodeTbl[b])) * 0.5,
        ),
      )
    : null;
  const field = {
    ribbon,
    laneOpenW,
    wrapSnapDist: plexus.wrapSnapDist,
    wrapSnapOk: plexus.wrapSnapOk,
    excursionFloor: plexus.excursionFloor,
    fractureT: ribbon
      ? (((plexusParams?.wellCentre?.[0] ?? 0) - plexus.xMin) / plexus.xSpan)
      : FRACTURE_T,
    /** ROUND 12 · D — the κ-window. `winEdges`/`winNodes` are the fixed
     * window SIZES the node graph baked; `edgeKey`/`nodeKey` are the ascending
     * κ tables the driver binary-searches to centre it on the frame. */
    winEdges: WIN_E,
    winNodes: WIN_N,
    edgeKey,
    nodeKey,
    /** The delivered endpoint pair, flat — QA only (the shaders read
     * `uEdgePack`). 1.6 KiB on the largest arm, and it is what lets the S/s
     * continuity gate be MEASURED on screen instead of asserted. */
    edgeAB: RIB
      ? Uint16Array.from(edgeTbl.flat() as number[])
      : null,
    /** The phase axis, resolved: `phase = y·frontKy + frontC`. Build-time by
     * construction (`bandAspect`, `xMin` and `xSpan` are all properties of the
     * delivered cloud), so the driver copies two numbers instead of
     * re-deriving a shear it could get subtly wrong. */
    frontKy: RIB
      ? (RIBBON_KAPPA_K * plexus.bandAspect) / Math.max(plexus.xSpan, 1e-6)
      : 0,
    frontC: RIB ? -plexus.xMin / Math.max(plexus.xSpan, 1e-6) : 0,
    /** Sprites per link at any instant (a build constant on the ribbon) and
     * the star/link split actually delivered — the numbers the S/s gate is
     * computed from. */
    perLink,
    starCount,
    edgeTotal,
  };

  // === Static (no-compute) build ===========================================
  if (!backendIsWebGPU) {
    const material = new MeshBasicNodeMaterial();
    const aMeta = attribute("aMeta");
    const aOff = attribute("aOff");
    const aSeed = attribute("aSeed");

    // Reveal-blended, shimmered instance center (the shimmer reads the
    // PRE-shimmer center — cheap life on the no-sim tier).
    const anchorS = anchorNode({ metaN: aMeta, offN: aOff });
    const rvS = smoothstep(float(0), float(1), uReveal);
    // ROUND 13c — on the ribbon `aSeed` is a small OFFSET from the anchor
    // (materialise in place: `anchor + off·(1−rv)`), never an absolute
    // origin-scattered position — a 3.79-frame field made origin scatter a
    // visible cross-page flight on entry AND (in reverse) on scroll-up exit.
    // Non-ribbon keeps the round-2 absolute mix bit-exact.
    const centerBase = RIB
      ? anchorS.add(aSeed.mul(float(1).sub(rvS)))
      : mix(aSeed, anchorS, rvS);
    const centerS = centerBase.add(
      vec3(
        sin(centerBase.y.mul(7.0).add(uTime.mul(0.9))),
        sin(centerBase.z.mul(7.0).add(uTime.mul(1.1))),
        sin(centerBase.x.mul(7.0).add(uTime.mul(0.7))),
      ).mul(0.003),
    );
    // ROUND 9-B: `centerS` is the position this sprite actually draws at, so it
    // is also where the copy-column mask is sampled (the compute branch passes
    // its own live `posR` — same local space, same pure function).
    const sc = particleScalars(aMeta, aOff, centerS);
    // Static-tier streaks: mild fixed elongation along the link direction,
    // boosted by the surge head / the spark burst.
    const motionS = motionNode(aMeta, aOff, null);

    material.vertexNode = buildVertex(
      centerS,
      depthAtten(centerS.z),
      sc.sizeK,
      motionS,
    );

    const vQuadUv = varying(positionLocal.xy);
    const vColor = varying(sc.colorE);
    // Round-3 depth-DOF: far half of the z-bow dims; near half softens (each
    // varying stays a SELF-CONTAINED expression — varying discipline).
    const vAlpha = varying(sc.alpha.mul(dofAlphaAt(centerS.z)));
    const vSoft = varying(dofSoftAt(centerS.z));
    const vCut = varying(sc.cut);

    configureMaterial(
      material,
      buildShade({ vQuadUv, vColor, vAlpha, vSoft, vCut }),
    );

    return {
      geometry,
      material,
      uniforms: buildUniforms(),
      membrane,
      nebula,
      links,
      stats,
      field,
      compute: () => {},
      dispose() {
        geometry.dispose();
        material.dispose();
        membrane?.geometry.dispose();
        membrane?.material.dispose();
        nebula?.geometry.dispose();
        nebula?.material.dispose();
        links?.geometry.dispose();
        links?.material.dispose();
      },
    } satisfies NeuralFieldBuild;
  }

  // === True-WebGPU compute build ===========================================
  const positionBuffer = instancedArray(seed.slice(), "vec3");
  const velocityBuffer = instancedArray(count, "vec3");
  const offBuffer = instancedArray(offA.slice(), "vec3");
  const metaBuffer = instancedArray(meta.slice(), "vec4");

  const uDelta = uniform(1 / 60);
  const SPRING = float(NEURAL_SPRING);
  const DAMPING = float(NEURAL_DAMPING);
  const MAX_SPEED = float(NEURAL_MAX_SPEED);

  const simulate = Fn(() => {
    const pos = positionBuffer.element(instanceIndex);
    const velH = velocityBuffer.element(instanceIndex);
    const offN = offBuffer.element(instanceIndex);
    const metaN = metaBuffer.element(instanceIndex);

    const role = metaN.x;
    // 0 on link, 1 on star AND spark — the "not a link particle" gate
    // (role 2 must never read as −1 through a `1 − role` term).
    const nonStream = clamp(role, float(0), float(1)).toVar();

    // Round-3: the compute anchor carries the curl micro-turbulence (build-
    // time flag — the static tier keeps the analytic twist).
    const liveAnchor = anchorNode({ metaN, offN, curl: true }).toVar();
    // Reconstruct the scattered seed deterministically (matches seedBuffers).
    const idxF = float(instanceIndex);
    const s0 = fract(sin(idxF.mul(127.1).add(311.7)).mul(43758.545));
    const s1 = fract(sin(idxF.mul(269.5).add(183.3)).mul(43758.545));
    const s2 = fract(sin(idxF.mul(419.2).add(371.9)).mul(43758.545));
    // ROUND 13c — same materialise-in-place split as the analytic tier: the
    // ribbon treats the hashed seed as an OFFSET from the live anchor, so the
    // spring target never crosses the page during the reveal (in either
    // direction — the dissolve on scroll-up is the same flight reversed).
    const seedPos = vec3(
      s0.sub(0.5).mul(RIB ? SEED_SCATTER_RIBBON : SEED_SCATTER_XY),
      s1.sub(0.5).mul(RIB ? SEED_SCATTER_RIBBON : SEED_SCATTER_XY),
      s2.sub(0.5).mul(RIB ? SEED_SCATTER_Z_RIBBON : SEED_SCATTER_Z),
    );
    const rv = smoothstep(float(0), float(1), uReveal);
    const anchor = (
      RIB
        ? liveAnchor.add(seedPos.mul(float(1).sub(rv)))
        : mix(seedPos, liveAnchor, rv)
    ).toVar();

    // Fracture: fraying link particles lose most of their spring and gain
    // wander. tSim is the cloud's left→right coordinate (edge-frame derived).
    // NOTE (round-8-D): this block moved ABOVE the recycle snap — the snap
    // now needs `dispersing` to decide whether it may arm at all.
    const tSim = edgeFrame(metaN, offN).t;
    const dispersing = dispFactor(tSim)
      .mul(float(1).sub(nonStream)) // stars/sparks never disperse
      .toVar();

    // RECYCLE / RE-PARK SNAP (streak fix): a flow-s wrap teleports a link
    // particle's anchor ONE LINK LENGTH back (shortest delivered link =
    // EDGE_MIN_LOCAL 0.055; and a fresh flash re-parks a spark). The wrap
    // happens inside the EDGE_FADE tips (near-zero alpha), so instead of a
    // bright spring-flight streak the particle hard-resets onto its anchor —
    // an offset reset, always legal per the unified-force contract. Star
    // cores never jump (their anchor is continuous → huge bound).
    //
    // ROUND-8-D STEADY-STATE ARMING: plexus links are ~4× shorter than the
    // round-6 layer spans, so WRAP_SNAP_DIST had to drop to 0.038 — below two
    // excursions that are perfectly legitimate but transient (the reveal
    // fly-in lag, and the fray / uRecohere anchor swings). Rather than pad the
    // threshold back up (which would re-admit the streak), the snap is ARMED
    // only in the steady state: reveal complete, no re-cohere tease burning,
    // and this particle not fraying. `select`-built 0/1 factors keep the mix
    // exactly at one endpoint or the other (no intermediate 1e9 blend).
    //
    // The 0.9 reveal threshold is deliberate on both sides: the driver damps
    // uReveal exponentially toward `scrollStore.reveal × visibility`, so it
    // asymptotes and must never be required to reach exactly 1 (the snap
    // would then never arm and the recycle streak would come back). At 0.9
    // the reveal's own anchor speed is ≈0.12 local/s → a spring lag of
    // ≈0.017, comfortably inside the 0.038 threshold; at 0.5 it would be
    // ≈0.24 and would false-trigger, which is why the gate exists at all.
    const one = float(1);
    // ROUND 13d — THE REVEAL TERM IS DROPPED FROM THE ARMING ON THE RIBBON.
    // The 0.9 gate existed to protect the round-2 coalesce, whose origin-
    // scattered fly-in was a LEGITIMATE large |anchor − pos| that must not
    // snap. The ribbon materialises in place (seed ≤ ~0.04 local from its own
    // anchor), so no legitimate large excursion exists any more — while the
    // un-armed window it left behind was actively harmful: the 13c re-entry
    // reveal-restart plus a fast scroll rolled the κ-window during the ~0.4 s
    // λ=9 ramp, and every re-homed particle spring-flew across the field with
    // the snap disarmed — the condensing cloud the owner photographed, back
    // by a second route. Non-ribbon builds bake the identical gated chain.
    // ROUND 14 — the SAME failure was still reachable through the two
    // remaining gate terms (uRecohere on every scroll-driven row ignition,
    // ~2.7 s per edge; `dispersing` on every post-fracture link). The
    // unconditional WINDOW_REHOME_SNAP below (before the gated recycle snap)
    // closes both routes: a κ-window re-home always hard-resets, whatever
    // `armed` says. The gate itself is unchanged.
    const armed = (
      RIB ? one : select(uReveal.greaterThan(float(0.9)), one, float(0))
    )
      .mul(select(uRecohere.lessThan(float(0.02)), one, float(0)))
      .mul(select(dispersing.lessThan(float(0.02)), one, float(0)))
      .toVar();
    // ROUND 12 · STAGE 2 — the threshold is DERIVED PER BUILD from the
    // shortest delivered link (`min(WRAP_SNAP_DIST, minEdge × 0.69)`), not
    // read off the module constant. On the default build that is
    // `min(0.038, 0.0551 × 0.69)` = 0.038 exactly — the shipped number, to
    // the bit — and on the ribbon it follows the field down to 0.01060
    // instead of sitting 3.6× above the shortest link, where it would never
    // fire. `WRAP_SNAP_DIST` stays imported as the CEILING it now is.
    const linkSnap = mix(float(1e9), float(plexus.wrapSnapDist), armed);
    // ROUND 12 · D — STAR CORES JUMP NOW. Their bound was 1e9 because a star
    // anchor was continuous; under the κ-window a star's NODE changes when
    // the window rolls (~1.0 local, ~94× the ribbon's derived link snap), and
    // without a bound the spring would fly it across the frame. Same
    // steady-state `armed` gate, and RIBBON BUILDS ONLY — every other build
    // bakes the identical `float(1e9)` literal it baked before.
    const starSnap = RIB
      ? mix(float(1e9), float(STAR_WINDOW_SNAP), armed)
      : float(1e9);
    const snapDist = select(
      role.lessThan(float(0.5)),
      linkSnap,
      select(role.lessThan(float(1.5)), starSnap, float(SPARK_SNAP_DIST)),
    );
    // ROUND 13c — WARM START (ribbon only). The island's frame loop early-
    // returns while the band is off-screen, so the sim's first computed
    // frames coincide EXACTLY with the band entering the viewport — with the
    // buffer initialised at the seed cluster, the whole settle flight used to
    // play on camera (the owner's "la rete si sposta per andare a costruirsi",
    // both directions). While the band is invisible (uReveal < 0.02 ⇒
    // delivered alpha ≈2% of rest on navy) every particle PINS to its anchor,
    // so the spring always takes over from a settled state. A positional
    // assign while invisible is the recycle snap's own contract; non-ribbon
    // builds bake no such branch.
    if (RIB) {
      If(uReveal.lessThan(float(0.02)), () => {
        pos.assign(anchor);
        velH.assign(vec3(0.0, 0.0, 0.0));
      });
    }
    // ROUND 14 — THE κ-WINDOW RE-HOME IS NEVER A FLIGHT. A re-home moves an
    // anchor ~1.0 local (94× wrapSnapDist, 4× STAR_WINDOW_SNAP); no
    // legitimate excursion on the ribbon exceeds ~0.2 (reveal ≤ 0.035,
    // pointer+curl 0.0028, NODE_DRIFT·1.05 ≈ 0.047, DEBRIS_SPREAD+GAP+wander
    // under a tease ≈ 0.2). It must snap regardless of `armed` — uRecohere
    // (any row ignition on the broken act) and `dispersing` (every
    // post-fracture link) disarm the recycle snap for seconds at a time, and
    // a disarmed re-home spring-flies across the frame: bottom→top under
    // reverse scroll. Both ends of a re-home sit ≥ WINDOW_FADE_OUT·half off
    // frame (pad inequality), so the teleport is invisible in both directions.
    // REVIEW FIX — the 0.4 bound is sized from ANCHOR-side terms only; a
    // post-fracture ember (spring ×0.15, DEBRIS_WANDER_ACC 5.0 in `extraAcc`
    // below) legitimately sits 0.5–0.7 local off its anchor, so the threshold
    // widens to WINDOW_REHOME_SNAP_DEBRIS with `dispersing` (0.8 at full
    // disperse, still under the ≈1.0 re-home). Kill-switch: set
    // WINDOW_REHOME_SNAP_DEBRIS = WINDOW_REHOME_SNAP.
    // Ribbon builds only; kill-switch WINDOW_REHOME_SNAP_ON.
    if (RIB && WINDOW_REHOME_SNAP_ON) {
      const rehomeSnap = mix(
        float(WINDOW_REHOME_SNAP),
        float(WINDOW_REHOME_SNAP_DEBRIS),
        dispersing,
      );
      If(length(anchor.sub(pos)).greaterThan(rehomeSnap), () => {
        pos.assign(anchor);
        velH.assign(vec3(0.0, 0.0, 0.0));
      });
    }
    If(length(anchor.sub(pos)).greaterThan(snapDist), () => {
      pos.assign(anchor);
      velH.assign(vec3(0.0, 0.0, 0.0));
    });

    // Laminar lock (healthy): a BROAD spring gain across each ignition region
    // (round-8-D: RING_PROX_K = ZONE_K and RING_SPRING_GAIN 2.2 → 0.8, so the
    // cloud firms up gently through a region instead of snapping at a plane).
    let ringProx: Any = float(0);
    for (let i = 0; i < RING_T.length; i++) {
      const d = tSim.sub(float(RING_T[i]));
      ringProx = ringProx.add(exp(float(RING_PROX_K).mul(d.mul(d)).negate()));
    }
    const lockGain = float(1)
      .add(
        ringProx
          .mul(float(RING_SPRING_GAIN))
          .mul(float(1).sub(uBroken))
          .mul(float(1).sub(nonStream)),
      )
      .toVar();
    const spring = SPRING.mul(lockGain).mul(
      float(1).sub(dispersing.mul(0.85)),
    );

    const vel = velH.toVar();
    unifiedForceStep(tsl as TslSymbolsGpgpu, {
      pos: pos as Any,
      vel: vel as Any,
      anchor: anchor as Any,
      dt: uDelta as Any,
      spring: spring as Any,
      damping: DAMPING as Any,
      maxSpeed: MAX_SPEED as Any,
      // Cursor bend: the pointer locally repels nearby filaments (at 1e9
      // when idle/coarse → exactly zero at rest).
      attractor: {
        position: uPointer as Any,
        // ROUND 12 · STAGE 2 — ×`uFieldK` (= 1/L). MEASURED, and the reason
        // is the recycle snap, not the feel: the snap threshold is derived
        // from the SHORTEST DELIVERED LINK, which on the ribbon falls to
        // 0.01536 raw (0.01060 after `wrapSnapFrac`) against a steady-state
        // pointer+curl excursion of `POINTER_PUSH/NEURAL_SPRING + CURL_GAIN ×
        // CURL_SCALE` = 0.01078. Unscaled the invariant is not merely
        // violated, it is UNSATISFIABLE — the snap never arms, and the bright
        // spring-flight streak the snap exists to kill comes back on the
        // WebGPU tier. At 1/3.791 the floor is 0.00284, a 3.7× margin.
        // `uFieldK` is 1 on the band ⇒ `POINTER_PUSH × 1.0` ⇒ bit-exact.
        push: float(POINTER_PUSH).mul(uFieldK) as Any,
        radius: float(POINTER_RADIUS) as Any,
        orbit: float(0) as Any,
        orbitFalloff: float(1) as Any,
        axis: vec3(0.0, 0.0, 1.0) as Any,
      },
      extraAcc: (acc: Any) => {
        // Debris wander — slow turbulent drift on detached particles.
        const turb = vec3(
          sin(pos.y.mul(6.0).add(uTime.mul(1.4))),
          sin(pos.z.mul(6.0).add(uTime.mul(1.1))),
          sin(pos.x.mul(6.0).add(uTime.mul(0.9))),
        );
        // Round-4 §B.3: the wander force also answers scroll velocity.
        acc.addAssign(
          turb.mul(
            dispersing
              .mul(float(DEBRIS_WANDER_ACC))
              .mul(float(1).add(uScrollVel.mul(uVelDebris))),
          ),
        );
      },
    });

    velH.assign(vel);
    pos.addAssign(vel.mul(uDelta));
  })().compute(count);

  // --- Render: instanced billboard reading the storage buffers --------------
  const material = new MeshBasicNodeMaterial();

  // `.xyz` MANDATORY on a "vec3" storage buffer read (padded to 16B → 4-comp).
  const posR = positionBuffer.toAttribute().xyz;
  const metaR = metaBuffer.toAttribute();
  const offR = offBuffer.toAttribute().xyz;
  // Round-2: the LIVE velocity feeds the streak stretch. +1 vertex-buffer
  // slot → 5 of 8 total (quad position + 4 storage reads). `.xyz` mandatory.
  const velR = velocityBuffer.toAttribute().xyz;

  // ROUND 9-B: the LIVE simulated position is the copy-column mask's sample
  // point (posR is already a bound vertex-buffer read — no new slot).
  const scR = particleScalars(metaR, offR, posR);
  const motionR = motionNode(metaR, offR, velR);

  material.vertexNode = buildVertex(
    posR,
    depthAtten(posR.z),
    scR.sizeK,
    motionR,
  );

  const vQuadUv = varying(positionLocal.xy);
  const vColor = varying(scR.colorE);
  // Round-3 depth-DOF on the LIVE position z (pointer-bent particles pushed
  // toward camera go soft too). Self-contained expressions per the varying
  // discipline; posR is already a bound vertex-buffer read — no new slot.
  const vAlpha = varying(scR.alpha.mul(dofAlphaAt(posR.z)));
  const vSoft = varying(dofSoftAt(posR.z));
  const vCut = varying(scR.cut);

  configureMaterial(
    material,
    buildShade({ vQuadUv, vColor, vAlpha, vSoft, vCut }),
  );

  return {
    geometry,
    material,
    uniforms: buildUniforms(),
    membrane,
    nebula,
    links,
    stats,
    field,
    compute(delta: number) {
      uDelta.value = delta;
      gl.compute(simulate);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      membrane?.geometry.dispose();
      membrane?.material.dispose();
      nebula?.geometry.dispose();
      nebula?.material.dispose();
      links?.geometry.dispose();
      links?.material.dispose();
    },
  } satisfies NeuralFieldBuild;

  // Package the externally-driven uniforms (shared by both backends).
  function buildUniforms(): NeuralFieldUniforms {
    return {
      uTime,
      uReveal,
      uBroken,
      uFlowSpeed,
      uFracture,
      uRecohere,
      uSurgeT,
      uSurgeAmp,
      uFlash,
      uRingGlow: uRingGlow as unknown as { array: number[] },
      uRingFlash: uRingFlash as unknown as { array: number[] },
      uC0: uC0 as Any,
      uC1: uC1 as Any,
      uC2: uC2 as Any,
      uC3: uC3 as Any,
      uC4: uC4 as Any,
      uNodePos: uNodePos as unknown as NeuralFieldUniforms["uNodePos"],
      uNodeT: uNodeT as unknown as { array: number[] },
      uEdgeA: uEdgeA as unknown as { array: number[] },
      uEdgeB: uEdgeB as unknown as { array: number[] },
      uEdgePack: uEdgePack as unknown as NeuralFieldUniforms["uEdgePack"],
      uPointer: uPointer as Any,
      uPixelRatio,
      uViewport: uViewport as Any,
      uEnvelope,
      uBreathe,
      uShimmer,
      uZBow,
      uGap,
      uStretchGain,
      uStretchMax,
      uSurgeGain,
      uPacketRate,
      uPacketWidth,
      uPacketGain,
      uStarSpread,
      uStarPunch,
      uNodeAlpha,
      uPointSize,
      uDustAlpha,
      uBeadAlpha,
      uLineAlpha,
      uLineEmissive,
      uLineLumMax,
      uLineBlue,
      uLineSurgeGain,
      uLineRowGain,
      uCopyLaneC,
      uCopyLaneW,
      uCopySoft,
      uCopyFloor,
      uCopyLineFloor,
      uCopyStreamFloor,
      uWinFirstEdge,
      uWinFirstNode,
      uWinYc,
      uWinHalf,
      uWinOn,
      uBandPx,
      uFront,
      uRiver,
      uFrontW,
      uFrontKy,
      uFrontC,
      uCopyYFloor,
      uCopyYc,
      uCopyRowC,
      uCopyRowH,
      uCopyRowSoft,
      uCopyRowLocal,
      uStrandPhase: uStrandPhase as unknown as { array: number[] },
      uStrandThick: uStrandThick as unknown as { array: number[] },
      uRowGlow: uRowGlow as unknown as { array: number[] },
      uCurl,
      uDof,
      uRowGain,
      uRowSwell,
      uScrollVel,
      uFlowTime,
      uVelSwell,
      uVelStretch,
      uVelFlow,
      uVelCurl,
      uVelDebris,
      uVelNorm,
      uMembraneSeal: uMembraneSeal as unknown as { array: number[] },
      uMembranePhase: uMembranePhase as unknown as { array: number[] },
      uMembraneAlpha,
      uMembraneBulge,
      uPlaneAspect,
      uFieldLen,
      uFieldOrigin,
      uFieldSlope,
      uFieldK,
      uFieldFade,
      uNebulaDrift,
      uNebulaAlpha,
    };
  }
}
