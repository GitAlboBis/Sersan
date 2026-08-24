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
 * neuralLatticeConfig and ride in the SAME four uniformArrays as before
 * (uNodePos/uNodeT/uEdgeA/uEdgeB — `.element()` is legal in any stage, zero
 * buffer-slot cost). ZERO NEW BINDINGS: the arrays merely grew, and three's
 * UniformArrayNode pads each element to a vec4, so the largest of them is
 * EDGE_N·16 B ≈ 3.7 KB — far under the WebGPU maxUniformBufferBindingSize
 * (64 KiB) and the WebGL2 MAX_UNIFORM_BLOCK_SIZE floor (16 KiB). Node/edge
 * COUNTS are build-time (they size the arrays and the baked meta buffer).
 *
 * Flow-t is the CLOUD's left→right coordinate: t = mix(nodeT_A, nodeT_B, s)
 * with s the per-link flow parameter, and links are ORIENTED by nodeT so the
 * flow always runs left→right. The surge/flash/row/width-envelope machinery
 * transfers verbatim; the pulse now reads as a WAVEFRONT sweeping the volume.
 *
 * ROLES (baked into the same meta/off/seed buffers — layout below):
 *   0 LINK  — home = mix(A,B,s) + a single thin filament offset in a real
 *     perpendicular frame (cross(dir, ref) with a ref that is never parallel
 *     to dir — the cloud has links pointing in every direction, including
 *     along ẑ) + thickness jitter + curl shred (compute tier). Per-link
 *     golden-angle phase offsets decorrelate the threads; per-link s
 *     fade-in/out dissolves the tips into the STAR CORES (and hides the
 *     flow-wrap).
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
import {
  COL_CORE,
  COL_CYAN,
  COL_BLUE,
  COL_EMBER,
  COL_EMBER2,
  getPlexus,
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
  WRAP_SNAP_DIST,
  SPARK_SNAP_DIST,
  POINTER_PUSH,
  POINTER_RADIUS,
  SEED_SCATTER_XY,
  SEED_SCATTER_Z,
  type LatticeMode,
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
  /** At-rest alpha of a star particle (links use STREAM_ALPHA). */
  uNodeAlpha: { value: number };
  /** Billboard base size in device px. */
  uPointSize: { value: number };
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
}

const QUAD_CORNERS = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

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
 * of the FOUR flare rays. Role budget: NODE_FRACTION (28%) stars, the rest
 * links (broken gives SPARK_COUNT of it to the burst).
 */
function seedBuffers(count: number, mode: LatticeMode, plexus: Plexus) {
  const meta = new Float32Array(count * 4);
  const offA = new Float32Array(count * 3);
  const seed = new Float32Array(count * 3);

  const nodesTbl = plexus.nodes;
  const edgesTbl = plexus.edges;
  const nodeN = nodesTbl.length;
  const sparkCount = mode === "broken" ? SPARK_COUNT : 0;
  const starCount = Math.floor(count * NODE_FRACTION);
  const edgeTotal = count - starCount - sparkCount;

  // Length-proportional per-link particle counts (remainder → round-robin).
  const lens = edgesTbl.map(([a, b]) => {
    const dx = nodesTbl[b][0] - nodesTbl[a][0];
    const dy = nodesTbl[b][1] - nodesTbl[a][1];
    const dz = nodesTbl[b][2] - nodesTbl[a][2];
    return Math.hypot(dx, dy, dz);
  });
  const lenSum = lens.reduce((s, l) => s + l, 0) || 1;
  const perEdge = lens.map((l) => Math.floor((edgeTotal * l) / lenSum));
  let assigned = perEdge.reduce((s, n) => s + n, 0);
  for (let e = 0; assigned < edgeTotal; e = (e + 1) % perEdge.length) {
    perEdge[e]++;
    assigned++;
  }

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
      // LINK particle — advance the ∝-length assignment.
      while (edgeFill >= perEdge[edgeIdx] && edgeIdx < perEdge.length - 1) {
        edgeIdx++;
        edgeFill = 0;
      }
      edgeFill++;
      const strand = Math.floor(r0 * STRAND_COUNT) % STRAND_COUNT;
      meta[i * 4] = 0;
      meta[i * 4 + 1] = edgeIdx * 2 + strand;
      meta[i * 4 + 2] = 0.7 + r1 * 0.6; // flow-speed variance
      meta[i * 4 + 3] = r3;
      offA[i * 3] = r2; // basePhase
      // Jitter magnitude biased toward the core (sqrt keeps a bright center,
      // a softer fringe) — also the white-cyan→cyan→blue radial tint driver.
      offA[i * 3 + 1] = Math.sqrt(r0);
      offA[i * 3 + 2] = r1 * Math.PI * 2;
    } else {
      // STAR-CORE particle — round-robin across the cloud's nodes, then a
      // per-particle hash decides CORE blob vs FLARE ray. Both bake a literal
      // offset vector, so nothing orbits and nothing is hollow.
      const node = (i - edgeTotal) % nodeN;
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
    seed[i * 3] = (h(i, 127.1, 311.7) - 0.5) * SEED_SCATTER_XY;
    seed[i * 3 + 1] = (h(i, 269.5, 183.3) - 0.5) * SEED_SCATTER_XY;
    seed[i * 3 + 2] = (h(i, 419.2, 371.9) - 0.5) * SEED_SCATTER_Z;
  }

  return { meta, offA, seed };
}

export function createNeuralFieldBuild(
  args: NeuralFieldBuildArgs,
): NeuralFieldBuild {
  const { webgpu, tsl, gl, backendIsWebGPU, count, mode } = args;
  const {
    InstancedBufferGeometry,
    BufferAttribute,
    InstancedBufferAttribute,
    MeshBasicNodeMaterial,
    Color,
    Vector2,
    Vector3,
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
  const plexus = getPlexus(mode, density);
  const { meta, offA, seed } = seedBuffers(count, mode, plexus);
  const ctrlInit = plexus.centroids;

  // --- Shared uniforms ------------------------------------------------------
  const uTime = uniform(0);
  const uReveal = uniform(0);
  const uBroken = uniform(mode === "broken" ? 1 : 0);
  const uFlowSpeed = uniform(FLOW_SPEED);
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
  //   uEdgeA    ~227 float → 227·16 =  3,632 B
  //   uEdgeB    ~227 float → 227·16 =  3,632 B      (Σ ≈ 10.6 KB, 4 bindings)
  // vs. WebGPU maxUniformBufferBindingSize 64 KiB and the WebGL2
  // MAX_UNIFORM_BLOCK_SIZE floor 16 KiB — the largest single array is at
  // ~22% of the tighter wall. SIZE is therefore not the wall; BLOCK COUNT is,
  // and round-8-D did not move it (these four arrays already existed; the
  // three new star knobs are plain `uniform()` scalars, which join an existing
  // shared group and add no block).
  //
  // ⚠ BLOCK-COUNT BUDGET — READ BEFORE ADDING A TENTH ARRAY. GLSLNodeBuilder
  // emits ONE UBO per uniformArray (`uniform.type === 'buffer'` → its own
  // `uniform Name { T name[N]; };`), and the particle material's VERTEX stage
  // references nine of them: uNodePos, uNodeT, uEdgeA, uEdgeB (edgeFrame /
  // anchorNode), uRingGlow, uRingFlash (zoneGlow / zoneFlash inside
  // particleScalars, which runs vertex-side because its outputs feed
  // varyings), uRowGlow (rowResponse + widthEnvelope) and uStrandPhase /
  // uStrandThick (anchorNode). On top of those sit three's own shared groups
  // (object / render / frame). That is 9 + up to 3 = 12 against the WebGL2
  // MAX_VERTEX_UNIFORM_BLOCKS guaranteed minimum of 12 — the fallback backend
  // is AT the floor with ZERO headroom, not "9 of 12" as an earlier draft of
  // this note read. A tenth uniformArray (e.g. the per-node in-degree table
  // nodeKissAt's comment contemplates) can fail to link on a minimum-spec
  // WebGL2 device. Fold new per-node scalars into a spare component of an
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
  const uEdgeA = uniformArray(edgeTbl.map((e: [number, number]) => e[0]));
  const uEdgeB = uniformArray(edgeTbl.map((e: [number, number]) => e[1]));
  /** Node / link counts of THIS build (clamp ceilings for the aux decode). */
  const NODE_N = nodeTbl.length;
  const EDGE_N = edgeTbl.length;
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
  const uEnvelope = uniform(1);
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
  const uStarSpread = uniform(1);
  const uStarPunch = uniform(1);
  const uNodeAlpha = uniform(NODE_ALPHA);
  const uStrandPhase = uniformArray([...STRAND_PHASES]);
  const uStrandThick = uniformArray([...STRAND_THICK_BIAS]);
  // Round-3 (§B): row-reactive current + curl turbulence + depth-DOF. All
  // uniforms/uniformArrays — the storage-buffer and vertex-slot budgets are
  // untouched.
  const uRowGlow = uniformArray([0, 0, 0]);
  const uCurl = uniform(CURL_GAIN);
  const uDof = uniform(1);
  const uRowGain = uniform(ROW_GAIN);
  const uRowSwell = uniform(ROW_SWELL);
  // Round-4 (§B): scroll-velocity net + membrane/nebula layers. All plain
  // uniforms/uniformArrays again — the storage-buffer and particle-material
  // vertex-slot budgets stay untouched. The layers only referenced by the
  // OTHER mode's build are dead nodes (never compiled into any material).
  const uScrollVel = uniform(0);
  const uFlowTime = uniform(0);
  const uVelSwell = uniform(VEL_SWELL);
  const uVelStretch = uniform(VEL_STRETCH);
  const uVelFlow = uniform(VEL_FLOW); // driver-read only (flow-clock gain)
  const uVelCurl = uniform(VEL_CURL);
  const uVelDebris = uniform(VEL_DEBRIS);
  const uVelNorm = uniform(VEL_NORM); // driver-read only (normalization)
  const uMembraneSeal = uniformArray([0, 0, 0]);
  const uMembranePhase = uniformArray([0, 0, 0]);
  const uMembraneAlpha = uniform(MEMBRANE_ALPHA);
  const uMembraneBulge = uniform(MEMBRANE_BULGE);
  const uPlaneAspect = uniform(0.5);
  const uNebulaDrift = uniform(0);
  const uNebulaAlpha = uniform(NEBULA_ALPHA);

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
    return splineCR(tc).add(
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
  /** Node center by index node (uniformArray element — legal in any stage). */
  function nodeAt(idx: Any): Any {
    return uNodePos.element(
      int(clamp(idx, float(0), float(NODE_N - 1))),
    ) as Any;
  }
  /** Node left→right cloud coordinate (0..1) by index node. */
  function nodeTAt(idx: Any): Any {
    return uNodeT.element(int(clamp(idx, float(0), float(NODE_N - 1)))) as Any;
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
  function edgeFrame(metaN: Any, offN: Any) {
    const aux = metaN.y;
    const edgeIdx = clamp(
      floor(aux.mul(0.5)),
      float(0),
      float(EDGE_N - 1),
    ).toVar();
    const strand = aux.sub(edgeIdx.mul(2.0)).toVar();
    const s = flowParam(offN.x, metaN.z).toVar();
    const ia = uEdgeA.element(int(edgeIdx)) as Any;
    const ib = uEdgeB.element(int(edgeIdx)) as Any;
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
    const dir = dRaw.div(max(length(dRaw), float(1e-5))).toVar();
    // `ib` (target-node index) is exposed for the round-7 packet clocks:
    // traffic is keyed by the RECEIVING node so nodeKissAt can run the very
    // same clock and kiss exactly when a bead lands (see packetAt).
    return { edgeIdx, strand, s, t, A, B, dir, ib };
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
    const aux = metaN.y;
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
    // Single-strand filament in the (n1, n2) plane: strand twist phase + rate
    // (uniformArrays, live-tunable — entries 1..3 unused since round-8-D)
    // plus a per-link golden-angle offset so the ~227 threads decorrelate.
    const strandAng = strandPhaseAt(ef.strand)
      .add(ef.edgeIdx.mul(2.39996))
      .add(
        ef.s
          .mul(float(Math.PI * 2))
          .mul(
            float(BRAID_TURNS).mul(
              float(STRAND_RATE_BASE).add(
                ef.strand.mul(float(STRAND_RATE_STEP)),
              ),
            ),
          ),
      );
    const strandOff = n1
      .mul(sin(strandAng))
      .add(n2.mul(cos(strandAng)))
      .mul(float(STRAND_RADIUS));
    // Thickness jitter within the strand — per-strand thickness BIAS keeps
    // the two filaments individually legible (thick lead, thin satellite).
    const jit = n1
      .mul(sin(offN.z))
      .add(n2.mul(cos(offN.z)))
      .mul(offN.y)
      .mul(float(STRAND_THICKNESS))
      .mul(strandThickAt(ef.strand));
    // Curl micro-turbulence (compute tier only): displace the strand offset
    // with the analytic curl field sampled AT the braid position, so the
    // field varies along the edge AND across the cross-section; +uVelCurl·
    // vel gain while scrolling (amplitude-only, no phase discontinuity).
    const preStream = mix(ef.A, ef.B, ef.s)
      .add(strandOff.add(jit).mul(w))
      .toVar();
    const onEdge = (
      opts.curl
        ? preStream.add(
            curlAt(preStream)
              .mul(uCurl)
              .mul(float(1).add(uScrollVel.mul(uVelCurl)))
              .mul(float(CURL_SCALE)),
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
    const streamGate = float(1).sub(clamp(role, float(0), float(1)));
    if (physVel) {
      return physVel.add(
        ef.dir.mul(surge).mul(float(SURGE_ADVECT)).mul(streamGate),
      );
    }
    const streamMotion = ef.dir.mul(
      float(STATIC_ELONG).add(surge.mul(float(SURGE_ADVECT))),
    );
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
   * so the whole ramp lives in the vertex stage (round-2). */
  function particleScalars(metaN: Any, offN: Any) {
    const role = metaN.x;
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
      surge.mul(0.85).add(packet.mul(float(PACKET_WHITE))),
      float(0),
      float(1),
    ).mul(float(1).sub(deadMix));
    const toneStream = mix(mix(gradCol, emberCol, deadMix), uColCore, headMix);
    // Idle dignity: slow per-particle brightness shimmer (±uShimmer).
    const shimmer = float(1).add(
      sin(uTime.mul(0.5).add(metaN.w.mul(37.0)).add(t.mul(9.0))).mul(uShimmer),
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
    const emisStream = float(1)
      .add(surge.mul(uSurgeGain))
      .add(packet.mul(uPacketGain))
      .add(flash.mul(float(FLASH_GAIN)))
      .mul(float(STREAM_EMISSIVE))
      .mul(midProfile)
      .mul(shimmer)
      .mul(rowBright)
      .mul(float(1).sub(deadMix.mul(0.75)));
    // Fringe alpha drop (edges dissolve into the navy) + the debris ceiling.
    const fringeA = mix(
      float(1),
      float(0.35),
      smoothstep(float(0.55), float(1), fringe),
    );
    const debrisA = float(DEBRIS_ALPHA_MAX).mul(
      float(1).sub(u.mul(float(DEBRIS_FADE))),
    );
    const alphaStream = mix(fringeA, debrisA, disp)
      .mul(edge)
      .mul(gap)
      .mul(float(STREAM_ALPHA));
    // Size falloff: bright fat core, fine fringe; the surge fattens the
    // head; a passing packet fattens its bead (round-7).
    const sizeStream = mix(
      float(CORE_SIZE_BOOST),
      float(FRINGE_SIZE_DROP),
      fringe,
    ).mul(float(1).add(surge.mul(0.45)).add(packet.mul(float(PACKET_SIZE))));

    // --- STAR CORE: a FILLED white-blue point with radiating spikes. The
    //     star's radial parameter is re-derived from the baked offset —
    //     dStar = |aOff.xy| / STAR_FLARE_LEN, 0 at the exact centre, 1 at a
    //     flare tip — and drives size, alpha, whiteness and emissive together,
    //     so the density piles up bright and solid at r = 0 and tapers to
    //     nothing along the four rays. Stars inside an ignition REGION read
    //     the gaussian-blended uRingFlash/uRingGlow; the pulse and the packet
    //     kiss brighten them; degraded stars (broken, past the fracture) dim
    //     toward ember — pulled back by the uRecohere hover tease. ---
    const nT = nodeTAt(metaN.y);
    const zGate = cloudZoneGate(nT);
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
    const kiss = nodeKissAt(metaN.y, nT).toVar();
    const emisRing = float(RING_EMISSIVE)
      .mul(uStarPunch)
      .mul(mix(float(STAR_CORE_EMIS), float(STAR_TIP_EMIS), dStar))
      .mul(glow)
      .mul(float(1).add(ringFlash.mul(float(RING_FLASH_GAIN))))
      .mul(float(1).add(surgeAt(nT).mul(0.6)))
      .mul(float(1).add(kiss.mul(float(PACKET_NODE_GAIN))))
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
    const alpha = select(
      isStream,
      alphaStream,
      select(isRing, alphaRing, alphaSpark),
    );
    const sizeK = select(
      isStream,
      sizeStream,
      select(isRing, sizeRing, sizeSpark),
    );

    return { colorE: tone.toVec3().mul(emis), alpha, sizeK };
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
  }): Any {
    return Fn(() => {
      const inner = mix(float(0.12), float(DOF_SOFT_MIN), v.vSoft);
      const disc = smoothstep(float(0.5), inner, length(v.vQuadUv))
        .mul(float(1).sub(v.vSoft.mul(0.2)))
        .toVar();
      const alpha = disc.mul(v.vAlpha).mul(uReveal).toVar();
      Discard(alpha.lessThan(0.004));
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

    mat.vertexNode = Fn(() => {
      const center = streamCenter(uFracture)
        .add(vec3(aQuad.x, aQuad.y, float(0)))
        .toVar();
      const local = center.add(
        vec3(
          positionLocal.x.mul(aQuad.z).mul(uPlaneAspect),
          positionLocal.y.mul(aQuad.z),
          float(0),
        ),
      );
      return cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(local, 1.0)));
    })();

    const vUv = varying(positionLocal.xy.mul(2.0));
    const vSeed = varying(aQuad.w);
    // Flare × thin modulator — pure uniforms, vertex-computed (discipline).
    const vMod = varying(
      float(1)
        .add(uFlash.mul(float(NEBULA_FLARE)))
        .mul(float(1).sub(rowGlowAt(2).mul(float(NEBULA_THIN)))),
    );

    const shade = Fn(() => {
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
        .mul(uReveal)
        .toVar();
      Discard(alpha.lessThan(0.003));
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
    const centerBase = mix(aSeed, anchorS, rvS);
    const centerS = centerBase.add(
      vec3(
        sin(centerBase.y.mul(7.0).add(uTime.mul(0.9))),
        sin(centerBase.z.mul(7.0).add(uTime.mul(1.1))),
        sin(centerBase.x.mul(7.0).add(uTime.mul(0.7))),
      ).mul(0.003),
    );
    const sc = particleScalars(aMeta, aOff);
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

    configureMaterial(
      material,
      buildShade({ vQuadUv, vColor, vAlpha, vSoft }),
    );

    return {
      geometry,
      material,
      uniforms: buildUniforms(),
      membrane,
      nebula,
      compute: () => {},
      dispose() {
        geometry.dispose();
        material.dispose();
        membrane?.geometry.dispose();
        membrane?.material.dispose();
        nebula?.geometry.dispose();
        nebula?.material.dispose();
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
    const seedPos = vec3(
      s0.sub(0.5).mul(SEED_SCATTER_XY),
      s1.sub(0.5).mul(SEED_SCATTER_XY),
      s2.sub(0.5).mul(SEED_SCATTER_Z),
    );
    const rv = smoothstep(float(0), float(1), uReveal);
    const anchor = mix(seedPos, liveAnchor, rv).toVar();

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
    const armed = select(uReveal.greaterThan(float(0.9)), one, float(0))
      .mul(select(uRecohere.lessThan(float(0.02)), one, float(0)))
      .mul(select(dispersing.lessThan(float(0.02)), one, float(0)))
      .toVar();
    const linkSnap = mix(float(1e9), float(WRAP_SNAP_DIST), armed);
    const snapDist = select(
      role.lessThan(float(0.5)),
      linkSnap,
      select(role.lessThan(float(1.5)), float(1e9), float(SPARK_SNAP_DIST)),
    );
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
        push: float(POINTER_PUSH) as Any,
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

  const scR = particleScalars(metaR, offR);
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

  configureMaterial(material, buildShade({ vQuadUv, vColor, vAlpha, vSoft }));

  return {
    geometry,
    material,
    uniforms: buildUniforms(),
    membrane,
    nebula,
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
      uNebulaDrift,
      uNebulaAlpha,
    };
  }
}
