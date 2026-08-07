/**
 * Black-hole raymarch material — the /audit hero singularity (AuditSingularity).
 *
 * WHAT THIS IS
 * ------------
 * A single-mesh, fully procedural black hole: a 128-step volumetric raymarch
 * inside a unit sphere renders a differentially-rotating accretion disc whose
 * rays are gravitationally bent toward the core (`step·power/r²` steering),
 * producing photon-ring lensing of an equirect starfield — written entirely in
 * TSL nodes for the WebGPU backend. The sphere is a proxy volume: there is no
 * disc geometry, no particle system, no screen-space distortion pass. The
 * technique is RE-IMPLEMENTED from a study reference with no license (see
 * _refs/dossiers/singularity.md) — our own code, our own runtime-generated
 * textures (proceduralTextures.ts), the same locked math.
 *
 * THE DELIBERATE GENERALIZATION (uCamLocal + uCamWorld, the virtual camera)
 * -------------------------------------------------------------------------
 * The reference computes the object-space camera as
 * `cameraPosition.mul(modelWorldMatrix)`, which is only valid with the mesh at
 * the IDENTITY transform (it's not even the inverse — it just happens to be a
 * no-op at identity). We world-anchor the group to the /audit hero instead, so
 * the march camera arrives as TWO uniforms written per frame CPU-side:
 *   uCamWorld — the EFFECTIVE camera world position (the real camera plus the
 *     island's slow orbit drift). It replaces the built-in `cameraPosition`
 *     node in the view-direction math, making the march camera VIRTUAL: the
 *     rasterized silhouette stays put (real camera) while the ray
 *     origins/directions swim — the owner's "breathe in 3D" (2026-08-07).
 *   uCamLocal — the same effective camera expressed in the group's local
 *     frame (backface ray origin), with the SAME `vec3(1,1,-1).xzy` swizzle
 *     applied in the shader.
 * With a zero orbit offset and the mesh at identity both reduce to the
 * reference exactly. IT ONLY STAYS CORRECT BECAUSE THE GROUP IS
 * TRANSLATION-ONLY: group scale and rotation must stay 1/identity forever —
 * apparent size is set by the group's distance from the camera, never by
 * scaling (every constant below — core radius 0.13, steering fade 1.0→0.5,
 * disc half-width 0.03, alpha falloffs — is calibrated to the unit sphere).
 * The view direction (`uCamWorld − positionWorld`) is translation-invariant,
 * so the group anchor/parallax need no further correction.
 *
 * TRUE-TRANSPARENCY TAIL (owner fix, 2026-08-07)
 * ----------------------------------------------
 * The reference lived inside a skybox scene and flooded the residual march
 * transparency with its env map — composited over OUR transparent canvas that
 * painted the whole proxy sphere as a pale ball with a light-blue halo. Here
 * the page's navy DOM *is* the space: the march returns vec4(rgb, alpha) with
 * alpha = clamp(alphaAcc + envLuminance·uEnvStarAlpha, 0, 1), so the ray
 * terminates fully transparent wherever the disc deposited nothing and ONLY
 * the bright lensed stars register faintly (uEnvIntensity dropped 2.0 → 0.6).
 * The disc compositing math is untouched; the black core stays opaque
 * (inside-core local alpha = 1 ⇒ alphaAcc = 1). uFade multiplies in the
 * material's opacityNode.
 *
 * MARCH SEMANTICS (locked — lead-verified against the source)
 * -----------------------------------------------------------
 * Loop(uIterations=128), per iteration:
 *   1. steering from the LOOP-START position: steer = normalize(rayPos) ·
 *      (uStep·uPower/r²) · remapClamp(r, 1.0, 0.5, 0, 1); steeredDir =
 *      normalize(rayDir − steer);
 *   2. FIRST half-step advance (rayDir·uStep), then sample/composite at the
 *      half-step position;
 *   3. SECOND half-step advance, then rayDir ← steeredDir at loop end.
 * Total path ≈ 0.0071·128·2 ≈ 1.82 — keep that product if iterations are ever
 * scaled for perf. The compositing assignments are pinned (explicit vars,
 * assigned BEFORE the second advance) so the sampled values are unambiguously
 * the half-step samples under any TSL emission order.
 *
 * SELECTIVE-BLOOM CONTRACT (PostFXNodes "approach A")
 * ---------------------------------------------------
 * emissiveNode = colorNode (the same node instance — compiled once). The hot
 * inner disc is ramp·uRampEmission(2.0) + uEmissionColor, pushed through the
 * closing srgbToLinear: peak cyan lands at linear luminance ≈ 3.3, far above
 * PostFXNodes' threshold ≈ 1.0, so the disc/photon ring blooms selectively
 * while the outer navy ember (linear luminance ≈ 0.1) stays below. No MRT, no
 * second post chain — this material feeds the existing scene-pass bloom.
 * toneMapped:false per the codebase-wide >1.0 emissive discipline.
 *
 * BINDING BUDGET (why this is safe — see gpgpuNodeSim.ts ~l.1383)
 * ---------------------------------------------------------------
 * This material is fragment-stage textures + uniforms ONLY: no storage
 * buffers, no `.toAttribute()` reads, no compute. It consumes zero
 * vertex-buffer slots beyond the sphere's own geometry attributes and zero
 * vertex-stage storage bindings, so neither of the two WebGPU device budgets
 * documented in gpgpuNodeSim.ts is touched.
 *
 * All `three/webgpu` + `three/tsl` symbols are passed IN (the island
 * lazy-imports the namespaces inside its webgpuEnabled()-gated effect — never
 * module scope), mirroring neuralFieldCompute.ts.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import {
  createDiscNoiseTexture,
  createStarfieldTexture,
} from "./proceduralTextures";

// Loose structural typings — the real node/namespace types are vast & generic
// (same rationale as gpgpuNodeSim.ts / neuralFieldCompute.ts).
type Any = any;

export interface SingularityUniforms {
  /** EFFECTIVE (virtual) march-camera world position: real camera + the
   * island's orbit drift. Drives the per-fragment view direction. */
  uCamWorld: { value: THREE.Vector3 };
  /** The same effective camera in the group's local frame (translation-only;
   * backface ray origin). */
  uCamLocal: { value: THREE.Vector3 };
  /** Scroll/route fade 0..1 → material opacity. */
  uFade: { value: number };
  /** March steps — the one honest quality knob (scale uStep inversely). */
  uIterations: { value: number };
  /** Half-step length (applied twice per iteration). */
  uStep: { value: number };
  /** Start-jitter amplitude (anti-banding). */
  uJitter: { value: number };
  /** Gravity strength in step·power/r². */
  uPower: { value: number };
  /** Event-horizon radius (black core). */
  uCoreRadius: { value: number };
  /** Disc half-thickness (z-band parabola width). */
  uDiscHalfWidth: { value: number };
  uRampCol1: { value: THREE.Color };
  uRampPos1: { value: number };
  uRampCol2: { value: THREE.Color };
  uRampPos2: { value: number };
  uRampCol3: { value: THREE.Color };
  uRampPos3: { value: number };
  /** Emissive multiplier on the ramp (2.0 — locked against bloom/tonemap). */
  uRampEmission: { value: number };
  /** Additive emissive floor. */
  uEmissionColor: { value: THREE.Color };
  /** Starfield sample multiplier. The reference used ≈2 inside a skybox
   * scene; over the transparent canvas it ships at 0.6 so only the stars
   * register (owner fix 2026-08-07 — the halo killer, with uEnvStarAlpha). */
  uEnvIntensity: { value: number };
  /** Env-luminance → alpha gain for the lensed stars (~0.9): the ONLY way
   * the environment reaches the page — empty space stays transparent. */
  uEnvStarAlpha: { value: number };
}

export interface SingularityBuild {
  geometry: THREE.SphereGeometry;
  material: Any;
  u: SingularityUniforms;
  dispose: () => void;
}

export function createBlackHoleBuild(webgpu: Any, tsl: Any): SingularityBuild {
  const { MeshStandardNodeMaterial } = webgpu;
  const {
    Fn,
    If,
    Loop,
    abs,
    add,
    cos,
    dot,
    equirectUV,
    faceDirection,
    float,
    fract,
    mat3,
    max,
    mix,
    normalize,
    positionGeometry,
    positionWorld,
    pow,
    remapClamp,
    sin,
    step,
    sub,
    texture,
    time,
    uniform,
    vec2,
    vec3,
    vec4,
  } = tsl;

  // === Runtime-generated textures (ours — see proceduralTextures.ts) ========
  const noiseTex = createDiscNoiseTexture(256);
  const starTex = createStarfieldTexture(2048, 1024);

  // === TSL helpers (Blender-parity, in our own structure) ===================

  /** Rodrigues axis-angle rotation matrix (row order matters — vector·mat3). */
  const rotateAxis = Fn(([axisIn, angleIn]: Any[]) => {
    const angle = float(angleIn).toVar();
    const axis = vec3(axisIn).toVar();
    const s = float(sin(angle)).toVar();
    const c = float(cos(angle)).toVar();
    const oc = float(sub(1.0, c)).toVar();
    return mat3(
      oc.mul(axis.x).mul(axis.x).add(c),
      oc.mul(axis.x).mul(axis.y).sub(axis.z.mul(s)),
      oc.mul(axis.z).mul(axis.x).add(axis.y.mul(s)),
      oc.mul(axis.x).mul(axis.y).add(axis.z.mul(s)),
      oc.mul(axis.y).mul(axis.y).add(c),
      oc.mul(axis.y).mul(axis.z).sub(axis.x.mul(s)),
      oc.mul(axis.z).mul(axis.x).sub(axis.y.mul(s)),
      oc.mul(axis.y).mul(axis.z).add(axis.x.mul(s)),
      oc.mul(axis.z).mul(axis.z).add(c),
    );
  }).setLayout({
    name: "sersanRotateAxis",
    type: "mat3",
    inputs: [
      { name: "axis", type: "vec3" },
      { name: "angle", type: "float" },
    ],
  });

  /**
   * Catmull-Rom basis over four control points. NOTE the reference's argument
   * order is (T, D, C, B, A) with B the "current" point — the ColorRamp call
   * sites below depend on this exact positional convention; do not reorder.
   */
  const catmullRom = Fn(([T, D, C, B, A]: Any[]) => {
    return float(0.5).mul(
      B.mul(2.0)
        .add(A.negate().add(C).mul(T))
        .add(
          A.mul(2.0)
            .sub(B.mul(5.0))
            .add(C.mul(4.0))
            .sub(D)
            .mul(T)
            .mul(T),
        )
        .add(
          A.negate()
            .add(B.mul(3.0))
            .sub(C.mul(3.0))
            .add(D)
            .mul(T)
            .mul(T)
            .mul(T),
        ),
    );
  }).setLayout({
    name: "sersanCatmullRom",
    type: "vec3",
    inputs: [
      { name: "T", type: "float" },
      { name: "D", type: "vec3" },
      { name: "C", type: "vec3" },
      { name: "B", type: "vec3" },
      { name: "A", type: "vec3" },
    ],
  });

  /**
   * Blender ColorRamp (B-Spline mode, 3 stops) parity: stops are vec4
   * (rgb, position); saturated per-segment interpolants + an If cascade pick
   * the active Catmull-Rom segment.
   */
  const colorRamp3BSpline = Fn(([T, A, B, C]: Any[]) => {
    const AB = B.w.sub(A.w);
    const BC = C.w.sub(B.w);

    const iAB = T.sub(A.w).div(AB).saturate();
    const iBC = T.sub(B.w).div(BC).saturate();

    const p = vec3(sub(1.0, iAB), iAB.sub(iBC), iBC);

    const cA = catmullRom(p.x, A.xyz, A.xyz, B.xyz, C.xyz);
    const cB = catmullRom(p.y, A.xyz, B.xyz, C.xyz, C.xyz);
    const cC = C.xyz;

    If(T.lessThan(B.w), () => {
      return cA.xyz;
    });
    If(T.lessThan(C.w), () => {
      return cB.xyz;
    });
    return cC.xyz;
  }).setLayout({
    name: "sersanColorRamp3BSpline",
    type: "vec3",
    inputs: [
      { name: "T", type: "float" },
      { name: "A", type: "vec4" },
      { name: "B", type: "vec4" },
      { name: "C", type: "vec4" },
    ],
  });

  /** Smoothstep-eased range remap (Blender Map Range node, smoothstep mode). */
  const smoothRange = Fn(([value, inMin, inMax, outMin, outMax]: Any[]) => {
    const t = value.sub(inMin).div(inMax.sub(inMin)).clamp(0.0, 1.0);
    const smoothT = t.mul(t).mul(float(3.0).sub(t.mul(2.0)));
    return mix(outMin, outMax, smoothT);
  }).setLayout({
    name: "sersanSmoothRange",
    type: "float",
    inputs: [
      { name: "value", type: "float" },
      { name: "inMin", type: "float" },
      { name: "inMax", type: "float" },
      { name: "outMin", type: "float" },
      { name: "outMax", type: "float" },
    ],
  });

  /** Rec.709 luminance. Called with vec3(x) where the reference broadcasts a
   * float — the weights sum to exactly 1.0, so luminance(vec3(a)) ≡ a. */
  const vecToFac = (v: Any): Any =>
    v.r.mul(0.2126).add(v.g.mul(0.7152)).add(v.b.mul(0.0722));

  /** Explicit component-wise vec3 length (Blender node-graph parity). */
  const lengthSqrt = (v: Any): Any =>
    v.x.mul(v.x).add(v.y.mul(v.y)).add(v.z.mul(v.z)).sqrt();

  /** Cheap white noise from a 2D coordinate (start-jitter anti-banding). */
  const whiteNoise2D = (coord: Any): Any =>
    fract(sin(dot(coord, vec2(12.9898, 78.233))).mul(43758.5453));

  /** sRGB → linear (piecewise). The ramp colours are authored in sRGB space;
   * this closing conversion is Blender parity — removing it shifts every
   * colour AND collapses the >1 bloom overshoot. */
  const srgbToLinear = (rgb: Any): Any =>
    mix(
      rgb.div(12.92),
      pow(add(rgb, 0.055).div(1.055), vec3(2.4)),
      step(0.04045, rgb),
    );

  /** linear → sRGB (piecewise) — applied to the env sample before the mix so
   * the whole compositing chain runs in sRGB space, like the reference. */
  const linearToSrgb = (lin: Any): Any => {
    const low = lin.mul(12.92);
    const high = pow(lin, vec3(1.0 / 2.4)).mul(1.055).sub(0.055);
    return mix(low, high, step(0.0031308, lin));
  };

  /**
   * Disc rotation speed (the `time` coefficient in the rotation phase). The
   * dossier LOCKS the reference's 0.1 ("the slow, inevitable feel — do not
   * speed it up"); 0.22 is an OWNER-DIRECTED deviation (2026-08-07 screenshot
   * review: "it doesn't look animated in 3D") — documented here as the one
   * sanctioned departure from the locked disc kinematics. The 4.270 shear and
   * the ×2 UV scale remain locked.
   */
  const DISC_TIME_RATE = 0.22;

  // === Uniforms (locked constants + the SERSAN palette) =====================
  const uCamWorld = uniform(new THREE.Vector3(0, 0, 12));
  const uCamLocal = uniform(new THREE.Vector3(0, 0, 12));
  const uFade = uniform(0);
  const uIterations = uniform(128);
  const uStep = uniform(0.0071);
  const uJitter = uniform(0.01);
  const uPower = uniform(0.3);
  const uCoreRadius = uniform(0.13);
  const uDiscHalfWidth = uniform(0.03);

  // SERSAN ramp: cyan → deep navy-blue ember → black. Positions are LOCKED
  // (0.050 / 0.425 / 1.0); only the colours changed from the reference. NO
  // violet, per the brand rule.
  const uRampCol1 = uniform(new THREE.Color(0.23, 0.88, 1.0));
  const uRampPos1 = uniform(0.05);
  const uRampCol2 = uniform(new THREE.Color(0.03, 0.09, 0.22));
  const uRampPos2 = uniform(0.425);
  const uRampCol3 = uniform(new THREE.Color(0, 0, 0));
  const uRampPos3 = uniform(1.0);

  const uRampEmission = uniform(2.0);
  const uEmissionColor = uniform(new THREE.Color(0.02, 0.06, 0.08));
  // 0.6, NOT the reference's 2.0 — see the true-transparency header note.
  const uEnvIntensity = uniform(0.6);
  const uEnvStarAlpha = uniform(0.9);

  // === The raymarch =========================================================
  const marchNode = Fn(() => {
    // --- Geometry- and view-dependent bases (Blender Z-up parity swizzle) ---
    // Every position is remapped p·(1,1,−1) then .xzy so the disc lies in the
    // shader's XY plane (screen-horizontal).
    const surf = positionGeometry.mul(vec3(1, 1, -1)).xzy;
    const isBackface = step(0.0, faceDirection.negate()); // 1 back, 0 front

    // Object-space camera via uCamLocal (the one generalization — header).
    const camObj = uCamLocal.mul(vec3(1, 1, -1)).xzy;

    // Front faces march from the surface; backfaces (camera inside the proxy
    // volume — unreachable at our anchored distance, kept for exact parity)
    // march from the camera itself.
    const origin = mix(surf, camObj, isBackface);

    // Incoming view direction (world == local under translation-only), from
    // the VIRTUAL march camera — uCamWorld, not the built-in cameraPosition —
    // so the island's orbit drift genuinely re-aims every ray (owner FIX 2).
    const viewDir = normalize(sub(uCamWorld, positionWorld))
      .mul(vec3(1, 1, -1))
      .xzy;
    const rayDir = viewDir.negate().toVar();

    // Jitter the start along the ray (breaks the banding of a fixed grid).
    const jitter = rayDir.mul(whiteNoise2D(surf.xy).mul(uJitter));
    const rayPos = origin.sub(jitter).toVar();

    // Front-to-back accumulators.
    const colorAcc = vec3(0).toVar();
    const alphaAcc = float(0.0).toVar();

    Loop(uIterations, () => {
      // --- Gravitational steering from the loop-start position -------------
      const rLen = lengthSqrt(rayPos).toVar();
      const steerMag = uStep.mul(uPower).div(rLen.mul(rLen)); // step·power/r²
      const steerFade = remapClamp(rLen, 1.0, 0.5, 0.0, 1.0); // only inside r<1
      const steer = normalize(rayPos).mul(steerMag.mul(steerFade));
      const steeredDir = rayDir.sub(steer).normalize().toVar();

      // --- First half-step advance, then sample -----------------------------
      const advance = rayDir.mul(uStep).toVar();
      rayPos.addAssign(advance);

      // Cylindrical radius in the disc plane; radius-dependent rotation phase
      // gives the differential (spiral-sheared) rotation. 4.270 is the locked
      // shear; the time rate is DISC_TIME_RATE (owner-tuned — see its note).
      const xyLen = lengthSqrt(rayPos.mul(vec3(1, 1, 0))).toVar();
      const rotPhase = xyLen.mul(4.27).sub(time.mul(DISC_TIME_RATE));
      const spun = rayPos.mul(rotateAxis(vec3(0, 0, 1), rotPhase));
      const discUv = spun.mul(2).toVar();

      // Disc noise sample (tileable, RepeatWrapping).
      const noiseSample = texture(noiseTex, discUv.xy);

      // Parabolic z-band over half-width w: three parallel band centres at
      // [−w, 0, w] weight the R/G/B noise channels respectively (the vec3
      // formulation of the reference).
      const bandEnds = vec3(uDiscHalfWidth.negate(), 0.0, uDiscHalfWidth);
      const dz = sub(bandEnds, vec3(rayPos.z));
      const zQuad = dz.mul(dz).div(uDiscHalfWidth);
      const zBand = max(uDiscHalfWidth.sub(zQuad).div(uDiscHalfWidth), 0.0).toVar();

      const noiseW = noiseSample.xyz.mul(zBand);
      const noiseLen = lengthSqrt(noiseW).toVar();

      // Emboss normal: a second sample at uv·1.002 acts as a cheap directional
      // derivative; the ×19.750 difference term relights the filaments.
      const embossSample = texture(noiseTex, discUv.mul(1.002).xy).xyz.mul(zBand);
      const embossLen = lengthSqrt(embossSample).toVar();

      // Ramp input (weights 0.780 / 1.5 / 19.750 — locked).
      const rampInput = xyLen
        .add(noiseLen.sub(0.78).mul(1.5))
        .add(noiseLen.sub(embossLen).mul(19.75));

      const stopA = vec4(uRampCol1, uRampPos1);
      const stopB = vec4(uRampCol2, uRampPos2);
      const stopC = vec4(uRampCol3, uRampPos3);
      const baseCol = colorRamp3BSpline(rampInput, stopA, stopB, stopC);
      const emissiveCol = baseCol.mul(uRampEmission).add(uEmissionColor);

      // Event horizon: inside r < 0.13 the colour is forced black (and the
      // local alpha to 1 below) — the silhouette of the hole.
      const rNow = lengthSqrt(rayPos).toVar();
      const insideCore = rNow.lessThan(uCoreRadius);
      const shadedCol = mix(emissiveCol, vec3(0), insideCore);

      // Alpha shaping: |z| + noise bias (0.750 / −0.60 locked), banded over
      // the half-width, radially faded to zero by xyLen → 1.
      const zAbs = abs(rayPos.z);
      const aPre = zAbs.add(noiseLen.sub(0.75).mul(-0.6));
      const aRadial = smoothRange(xyLen, 1.0, 0.0, 0.0, 1.0);
      const aBand = smoothRange(aPre, uDiscHalfWidth, 0.0, 0.0, aRadial);
      const alphaLocal = mix(aBand, 1.0, insideCore);

      // Front-to-back "over", weighted by Rec.709 luminance of the local
      // alpha (the reference's vecToFac; alphaLocal broadcasts — see helper).
      const aFac = vecToFac(vec3(alphaLocal)).toVar();
      const weight = alphaAcc.oneMinus().mul(aFac);
      colorAcc.assign(mix(colorAcc, shadedCol, weight));
      alphaAcc.assign(mix(alphaAcc, 1.0, aFac));

      // --- Second half-step; steering becomes next iteration's direction ---
      rayPos.addAssign(advance);
      rayDir.assign(steeredDir);
    });

    // ==== True-transparency tail (owner fix, 2026-08-07 — header note) ======
    // Environment sampled with the BENT final ray direction — this IS the
    // lensing (no screen-space substitute) — but unlike the reference the env
    // never floods the residual transparency: the page's navy DOM is the
    // space. Only the bright lensed stars register, via the alpha term below.
    const bentDir = rayDir.mul(vec3(1, -1, 1)).xzy;
    const envSrgb = linearToSrgb(
      texture(starTex, equirectUV(bentDir)).xyz.mul(uEnvIntensity),
    );
    const envLum = vecToFac(envSrgb).toVar();

    // Where the disc/core own the pixel → colorAcc; where they don't → the
    // lensed star colour (its visibility is carried by the alpha, so this is
    // a premultiplied-look star contribution, never a flat env wash).
    const finalRGB = mix(envSrgb, colorAcc, alphaAcc);

    // Alpha: disc/core coverage + the faint star term. The black core is
    // already opaque (inside-core local alpha = 1 ⇒ alphaAcc = 1); everywhere
    // the march deposited nothing and no star lands, the ray terminates fully
    // transparent — no sphere silhouette. uFade multiplies in opacityNode.
    const alphaOut = alphaAcc.add(envLum.mul(uEnvStarAlpha)).clamp(0.0, 1.0);

    // The whole chain above runs in sRGB space (Blender parity) — convert to
    // linear exactly once on the way out.
    return vec4(srgbToLinear(finalRGB), alphaOut);
  })();

  // === Material =============================================================
  const material = new MeshStandardNodeMaterial({ side: THREE.DoubleSide });
  // The march returns vec4(rgb, alpha); the SAME node instance feeds all
  // three slots (one compile, three swizzles). The emissive slot is what
  // carries the >1.0 disc signal into the scene pass for the threshold bloom.
  const marchRGB = marchNode.xyz;
  material.colorNode = marchRGB;
  material.emissiveNode = marchRGB;
  // Marched alpha (disc + core + faint lensed stars) × the scroll/route fade.
  material.opacityNode = marchNode.w.mul(uFade);
  // transparent + depthWrite:true: front faces overwrite the useless
  // outside-view backface march exactly as depth did in the (opaque)
  // reference; the low-alpha star regions tolerate the per-triangle order.
  material.transparent = true;
  material.depthWrite = true;
  // HDR out — tone mapping happens once at the PostFXNodes pipeline output.
  material.toneMapped = false;

  const geometry = new THREE.SphereGeometry(1, 16, 16);

  const u: SingularityUniforms = {
    uCamWorld,
    uCamLocal,
    uFade,
    uIterations,
    uStep,
    uJitter,
    uPower,
    uCoreRadius,
    uDiscHalfWidth,
    uRampCol1,
    uRampPos1,
    uRampCol2,
    uRampPos2,
    uRampCol3,
    uRampPos3,
    uRampEmission,
    uEmissionColor,
    uEnvIntensity,
    uEnvStarAlpha,
  };

  return {
    geometry,
    material,
    u,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      noiseTex.dispose();
      starTex.dispose();
    },
  };
}
