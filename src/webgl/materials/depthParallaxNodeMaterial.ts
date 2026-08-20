/**
 * Featured Work card material — the Lusion depth-parallax + DOF shader,
 * ported 1:1 from the extracted fragment (ANALISI_LUSION_WORK.md §2.5) into
 * TSL for the WebGPU-flag path (WGSL under WebGPU, GLSL under the WebGL2
 * fallback backend — the same dual-backend contract as railPlaneNodeMaterial,
 * and like it this material ships WITHOUT a raw-GLSL twin: on the flag-OFF
 * path FeaturedWorkPlanes never mounts and the DOM still + CSS hover IS the
 * card).
 *
 * The look, verbatim from the port source:
 *   (1) RAYMARCHED PARALLAX — a virtual camera at uFocusPos (mouse-spring on
 *       hover) marches PARALLAX_SAMPLES steps against the depth map, so the
 *       still gains true 3D parallax with occlusion. Depth relief scales with
 *       uActive (0.15 at rest → explodes during a zoom flight).
 *   (2) GOLDEN-ANGLE DISC DOF — BLUR_SAMPLES taps on a golden-angle spiral;
 *       blurriness ∝ |depth − focus.z| + uDofOffset. Hover pulls uDofOffset
 *       to −0.5 on the CPU: the image "racks into focus".
 *   (3) SDF ROUNDED MASK — the corner radius is drawn in-shader; the entry
 *       animation is the mask growing from 70% → 100% of the rect (uShow).
 *   (4) SCROLL RIPPLE — a screen-space x shear ∝ uRipple (scroll velocity).
 *   (5) GRADE + FOG — saturation/brightness trims, and a fog toward uColorBg
 *       keyed on uActive (the zoom flight drowns the image in the project
 *       color; idle at 0 today — the DOM Flip flight owns the zoom).
 *
 * All motion values (focus spring, zoom spring, shift impulses, dof ratio,
 * show time) are CPU-integrated in FeaturedWorkPlanes — the material only
 * reads uniforms, mirroring the RailPlanes discipline.
 *
 * TSL node names verified against the installed build (Loop/Break/If/
 * screenUV/fwidth/texture all present — checked via require('three/tsl')).
 */
import {
  Color,
  MeshBasicNodeMaterial,
  NormalBlending,
  Vector2,
  Vector3,
  type Texture,
} from "three/webgpu";
import {
  Fn,
  uniform,
  uv,
  texture,
  screenUV,
  float,
  vec2,
  vec3,
  vec4,
  mix,
  clamp,
  min,
  max,
  abs,
  length,
  sin,
  cos,
  sqrt,
  dot,
  fract,
  fwidth,
  smoothstep,
  Loop,
} from "three/tsl";

const PARALLAX_SAMPLES = 12;
const BLUR_SAMPLES = 6;
/** Golden-angle increment of the DOF disc (port source constant). */
const GOLDEN_ANGLE = 10.16640738;

export type DepthParallaxUniforms = {
  /** Entry mask growth 0..1 (damped reveal). */
  uShow: { value: number };
  /** Zoom spring 1 at hover / 0 at rest — in-shader 2.5% push-in. */
  uZoom: { value: number };
  /** Virtual camera target (px-domain x/y, focus depth z). CPU spring. */
  uFocusPos: { value: Vector3 };
  /** Random reframe impulses crossing hover thresholds (decaying). */
  uShift: { value: Vector2 };
  /** DOF range offset 0 → −0.5 at hover (rack focus). */
  uDofOffset: { value: number };
  /** Zoom-flight ratio (0 today — Flip owns the zoom). */
  uActive: { value: number };
  /** Scroll-velocity ripple strength (≤0.15). */
  uRipple: { value: number };
  /** Route-transition fade (damped scrollStore.reveal). */
  uRouteFade: { value: number };
  /** Live DOM rect size in CSS px — the shader's px-domain frame. */
  uDomWH: { value: Vector2 };
};

export function createDepthParallaxMaterial(opts: {
  still: Texture;
  depth: Texture;
  /** Intrinsic texture size in px (aspect source for cover-fit). */
  textureSize: Vector2;
  /** Fog target for the (currently idle) zoom flight. */
  colorBg?: Color;
}): { material: MeshBasicNodeMaterial; uniforms: DepthParallaxUniforms } {
  const uShow = uniform(0);
  const uZoom = uniform(0);
  const uFocusPos = uniform(new Vector3(0, 0, -1));
  const uShift = uniform(new Vector2());
  const uDofOffset = uniform(0);
  const uActive = uniform(0);
  const uRipple = uniform(0);
  const uRouteFade = uniform(0);
  const uDomWH = uniform(new Vector2(1, 1));
  // Deliberately NOT cloned: the caller mutates this Vector2 when the still's
  // intrinsic size resolves async (TextureLoader onLoad) — the uniform must
  // see that write, or cover-fit keeps the placeholder aspect forever.
  const uTextureSize = uniform(opts.textureSize);
  const uColorBg = uniform(opts.colorBg ?? new Color("#0B1422"));
  /** Card corner radius in CSS px — matches .fw-media's 15px. */
  const uRadius = uniform(15);

  const material = new MeshBasicNodeMaterial();

  material.colorNode = Fn(() => {
    // Params typed loose on purpose — TSL's generic node types reject their
    // own float() at call sites (same friction gpgpuNodeSim's AnyNode works
    // around); the runtime graph is exact.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linearStep = (e0: any, e1: any, x: any) =>
      clamp(x.sub(e0).div(e1.sub(e0)), 0.0, 1.0);

    // (4) Scroll ripple — screen-space x shear, max at the viewport's
    // vertical middle (port source line 1).
    const baseUv = vec2(
      uv().x.sub(
        screenUV.x
          .sub(0.5)
          .mul(sin(screenUV.y.mul(Math.PI)).oneMinus())
          .mul(uRipple),
      ),
      uv().y,
    ).toVar();

    // Cheap hash in place of the source's blue noise (dither for the ray
    // start + DOF disc rotation) — same recipe as railPlaneNodeMaterial.
    const noiseX = fract(
      sin(dot(screenUV.mul(vec2(127.1, 311.7)), vec2(12.9898, 78.233))).mul(
        43758.5453,
      ),
    );
    const noiseY = fract(
      sin(dot(screenUV.mul(vec2(269.5, 183.3)), vec2(12.9898, 78.233))).mul(
        43758.5453,
      ),
    );

    // (3) SDF rounded-corner mask — the show animation grows the box
    // 70% → 100% of the rect (px domain).
    const maskSize = uDomWH.mul(mix(0.7, 1.0, uShow));
    const halfSize = maskSize.mul(0.5);
    const p = baseUv.sub(0.5).mul(uDomWH);
    const q = abs(p).sub(halfSize).add(uRadius);
    const sdf = min(max(q.x, q.y), 0.0)
      .add(length(max(q, vec2(0.0))))
      .sub(uRadius);
    // Port source used smoothstep(0, −fwidth, d) — reversed edges are
    // undefined in WGSL, so this is the forward-edge equivalent (inside the
    // box sdf < 0 → alpha 1, AA'd over one derivative width).
    const imageAlpha = smoothstep(0.0, fwidth(sdf), sdf.negate());

    // Cover-fit px→uv mapping (port source `toUvSpace`).
    const coverScale = max(
      uDomWH.x.div(uTextureSize.x),
      uDomWH.y.div(uTextureSize.y),
    );
    const toUvSpace = vec2(1.0).div(uTextureSize.mul(coverScale));

    // (1) Raymarched depth parallax.
    const uvPx = baseUv
      .sub(0.5)
      .mul(uDomWH)
      .mul(mix(0.75, 1.0, uShow))
      .mul(mix(0.975, 1.0, uZoom))
      .toVar();
    const zMultiplier = uDomWH.y.mul(uActive.mul(15.0).add(0.15));
    const pos = vec3(uvPx, zMultiplier.negate());
    const cameraDepth = uDomWH.y.mul(mix(10.0, 5.0, uZoom));
    const rayOri = vec3(uFocusPos.xy, cameraDepth);
    const distV = length(pos.sub(rayOri)).toVar();
    const rayDir = pos.sub(rayOri).div(distV);
    const skipDist = cameraDepth.div(rayDir.z.negate());
    distV.subAssign(skipDist);
    const stepDist = distV.div(PARALLAX_SAMPLES);
    const rayStep = rayDir.mul(stepDist);
    const rayPos = rayOri
      .add(rayDir.mul(skipDist.add(stepDist.mul(noiseX))))
      .toVar();
    // The port source breaks out of the march on hit; a data-dependent Break
    // makes control flow non-uniform, which WGSL's uniformity analysis
    // rejects for the textureSample calls that follow. Equivalent
    // uniform-flow form: a latched hit flag freezes the ray in place
    // (advance × (1−hit)) — same final rayPos, constant trip count, and the
    // loop body stays legal for implicit-derivative sampling.
    const hit = float(0.0).toVar();
    Loop({ start: 0, end: PARALLAX_SAMPLES, type: "int" }, () => {
      const currZ = texture(opts.depth, rayPos.xy.mul(toUvSpace).add(0.5))
        .r.mul(zMultiplier)
        .negate();
      hit.assign(max(hit, currZ.step(rayPos.z).oneMinus()));
      rayPos.addAssign(rayStep.mul(hit.oneMinus()));
    });
    const sampleUv = rayPos.xy.mul(toUvSpace).add(uShift.mul(0.015)).toVar();
    const depthHere = texture(opts.depth, sampleUv.add(0.5)).r;

    // (2) Golden-angle disc DOF.
    const blurriness = mix(0.0, 0.01, uZoom).mul(
      linearStep(
        float(0.0),
        float(0.5),
        abs(depthHere.sub(uFocusPos.z)).add(uDofOffset),
      ),
    );
    const angle = noiseY.mul(Math.PI * 2).toVar();
    const aspectInv = uTextureSize.y.div(uTextureSize.x);
    const colorAcc = vec3(0.0).toVar();
    Loop({ start: 0, end: BLUR_SAMPLES, type: "int" }, ({ i }) => {
      const fI = float(i);
      const r = sqrt(fI.add(0.5).div(BLUR_SAMPLES)).mul(blurriness);
      angle.addAssign(GOLDEN_ANGLE);
      const uvOffset = vec2(cos(angle).mul(aspectInv), sin(angle)).mul(r);
      colorAcc.addAssign(
        texture(opts.still, sampleUv.add(uvOffset).add(0.5)).rgb,
      );
    });
    colorAcc.divAssign(BLUR_SAMPLES);

    // (5) Grade (saturation/brightness idle at neutral) + zoom-flight fog.
    const fog = linearStep(
      float(0.0),
      float(0.75),
      uActive.mul(2.5).sub(0.75).sub(depthHere.oneMinus()),
    );
    // Color uniform ↔ vec3 node: identical at runtime, cast for the types.
    const graded = mix(colorAcc, uColorBg as unknown as typeof colorAcc, fog);

    return vec4(graded, imageAlpha.mul(uRouteFade));
  })();

  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false; // layering is renderOrder-driven
  material.blending = NormalBlending;
  // Photographic content: scene tone mapping would wash the product shots —
  // the still is already display-referred (same reasoning as the DOM <img>).
  material.toneMapped = false;

  return {
    material,
    uniforms: {
      uShow: uShow as unknown as { value: number },
      uZoom: uZoom as unknown as { value: number },
      uFocusPos: uFocusPos as unknown as { value: Vector3 },
      uShift: uShift as unknown as { value: Vector2 },
      uDofOffset: uDofOffset as unknown as { value: number },
      uActive: uActive as unknown as { value: number },
      uRipple: uRipple as unknown as { value: number },
      uRouteFade: uRouteFade as unknown as { value: number },
      uDomWH: uDomWH as unknown as { value: Vector2 },
    },
  };
}
