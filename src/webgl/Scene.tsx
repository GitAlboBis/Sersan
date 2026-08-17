"use client";

/**
 * The persistent R3F scene — lazy-loaded (ssr:false) by CanvasHost.
 *
 * Lives in the root layout so the WebGL context, camera and scene graph
 * survive route changes; per-route variation happens by swapping curve
 * configs, never by remounting the Canvas. Transparent clear color: the
 * navy body background (DOM) stays the backdrop, the canvas only adds
 * light on top.
 */
import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { FrameDriver } from "./FrameDriver";
import {
  webgpuEnabled,
  createWebGPURenderer,
  backendOf,
} from "./renderer/createRenderer";
import { SignatureLine } from "./SignatureLine";
import { HeroLogo } from "./HeroLogo";
import { HeroTextParticles } from "./HeroTextParticles";
// NOTE: CurlTubeField (the faint curl-noise background haze) is intentionally
// UNMOUNTED — the user disliked the thin background arcs. The component file is
// kept in place so it's trivial to restore (re-add the import + the gated mount
// below). This is NOT the signature line / scroll trail (SignatureLine), which
// stays.
// import { CurlTubeField } from "./CurlTubeField";
import { GatewayPortal } from "./GatewayPortal";
import { RouteHero, type RouteHeroKind } from "./RouteHero";
import { DriftParticles } from "./DriftParticles";
import { RailPlanes } from "./RailPlanes";
import { FounderPortraitMorph } from "./FounderPortraitMorph";
import { ResourcePreviewPlane } from "./ResourcePreviewPlane";
import { NeuralLattice } from "./NeuralLattice";
import { AuditSingularity } from "./AuditSingularity";
import { HomeSingularity } from "./HomeSingularity";
import { SequenceSingularity } from "./SequenceSingularity";
import { AdaptiveResolution } from "./AdaptiveResolution";
import { PipelineWarmup } from "./PipelineWarmup";
import { PerfProbe } from "./PerfProbe";
import { PostFX } from "./PostFX";
import { PostFXNodes } from "./PostFXNodes";
import { useSectionAnchors } from "./hooks/useSectionAnchors";
import { CAMERA_FOV, CAMERA_Z } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import { onLiftOnce } from "@/lib/route-transition-store";
import type { SectionAnchors } from "./hooks/useSectionAnchors";
import {
  devOverridesAllowed,
  useTierStore,
  type SceneTier,
} from "./store/tierStore";

// NOTE: the leva tuning panel (debug/LineDebug) and drei's
// PerformanceMonitor are intentionally NOT mounted for now — while
// stabilising the scene we debug-tune through the dev console handles
// below (window.__sersanFx). Re-evaluate both after the M1 freeze
// investigation is closed.

// Dev-only console handles for store-level debugging.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  import("./store/fxStore").then((m) => {
    (window as unknown as Record<string, unknown>).__sersanFx = m.useFxStore;
  });
  import("./store/scrollStore").then((m) => {
    (window as unknown as Record<string, unknown>).__sersanScroll = m.useScrollStore;
  });
  import("./store/heroHoverStore").then((m) => {
    (window as unknown as Record<string, unknown>).__sersanHeroHover = m.useHeroHoverStore;
  });
  import("./store/textMorphStore").then((m) => {
    (window as unknown as Record<string, unknown>).__sersanTextMorph = m.useTextMorphStore;
  });
  import("./store/railStore").then((m) => {
    (window as unknown as Record<string, unknown>).__sersanRail = m.useRailStore;
  });
  import("./store/foundersMorphStore").then((m) => {
    (window as unknown as Record<string, unknown>).__sersanFoundersMorph =
      m.useFoundersMorphStore;
  });
}

// Tier/budget handle — dev AND Vercel preview (same predicate that admits the
// `?fx= ?postfx= ?dpr=` overrides), so preview QA can inspect the fxBudget it
// just set. Never on the real domain.
if (
  typeof window !== "undefined" &&
  (process.env.NODE_ENV !== "production" || devOverridesAllowed())
) {
  (window as unknown as Record<string, unknown>).__sersanTier = useTierStore;
}

/**
 * Per-route "ritual object" config (P5b). Each interior route resolves the
 * signature line into a brand-native 3D object at its closing `final-cta`
 * anchor — the universal "the signal resolves into a ring" motif, except for
 * the two routes that ship a bespoke Blender GLB (audit lattice, consulting
 * ring). Home is intentionally NOT in this map: it keeps HeroLogo (the
 * dissolving SERSAN mark) + the loved GatewayPortal (the home's own RouteHero
 * config), gated separately below so HeroLogo never mounts on any interior
 * route.
 *
 * Tone (emissive endpoints) stays inside SerSan's monochrome cyan→blue
 * signal; the small per-route bias mirrors routeFxStore (e.g. trust cooler).
 */
interface RouteHeroConfig {
  kind: RouteHeroKind;
  emissiveA?: string;
  emissiveB?: string;
}

// The per-route ritual object is now the SERSAN MARK on EVERY route (the rings /
// GLBs are retired): the logo glows + slow-spins with the same RouteHero
// choreography and lights up neon-blue on hover. Per-route emissive tints (the
// warmer /consulting tail, cooler /trust) are preserved so each route keeps its
// accent; the base pulse stays cyan↔blue.
const ROUTE_HERO: Record<string, RouteHeroConfig> = {
  "/audit": { kind: { type: "logo" } },
  "/consulting": {
    kind: { type: "logo" },
    // Warmer tail, matching routeFx('/consulting').
    emissiveB: "#2A7FFF", // was violet-ish #8A6BFF; value now blue
  },
  "/case-studies": { kind: { type: "logo" } },
  "/resources": { kind: { type: "logo" } },
  "/about": { kind: { type: "logo" } },
  "/contact": { kind: { type: "logo" } },
  // Trust: a cooler tint at the ritual anchor. (The old CompliancePipeline3D
  // centerpiece is retired — see the note where it used to mount below.)
  "/trust": {
    kind: { type: "logo" },
    emissiveB: "#2A7FFF", // was violet-ish #6E7BFF; value now blue
  },
};

/**
 * Mounts the correct ritual object for the active route. Home → HeroLogo +
 * GatewayPortal (unchanged); interior routes → a single map lookup. Returns
 * null on unknown routes (e.g. [slug] detail pages) — the line still threads
 * through, just without a closing object.
 */
function RouteRitual({
  pathname,
  tier,
  anchors,
}: {
  pathname: string;
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}) {
  // Home: the dedicated dissolving logo + gateway, exactly as before P5b.
  if (pathname === "/") {
    return (
      <>
        {/* The dissolving SERSAN mark — geometry from a Blender GLB
            (sersan-mark.glb), so it suspends on useGLTF until the small mesh
            loads; the poster covers the hero until heroReady fires. */}
        <Suspense fallback={null}>
          <HeroLogo tier={tier} anchors={anchors} />
        </Suspense>
        {/* Lusion-style scroll-hijacked text intro: the BIG solid "Sersan AI"
            dissolves into particles that recompose into the real headline —
            driven ONLY by the consumed scroll of HeroIntroGate, so the camera
            and the whole scene stay perfectly still until the gate releases.
            True-WebGPU only; every fallback leaves the DOM hero untouched. */}
        <HeroTextParticles tier={tier} />
        {/* Blender-built gateway at the end of the home story (66KB GLB). */}
        <Suspense fallback={null}>
          <GatewayPortal tier={tier} anchors={anchors} />
        </Suspense>
      </>
    );
  }

  const config = ROUTE_HERO[pathname];
  if (!config) return null;

  // The interior ritual (logo kind) is NON-SUSPENDING by design (wedge fix,
  // 2026-07-07): RouteHeroLogo loads the mark GLB via a module-cached promise
  // resolved in an effect — no React.lazy, no useGLTF, no thrown promises. A
  // Suspense left pending inside this bridged tree wedged ALL island commits
  // on interior routes (SignatureLine's TSL material state + re-measured
  // anchors props never landed → the line never appeared on /consulting).
  // The Suspense below is kept as an inert safety net for any future
  // suspending kind (e.g. a GLB ritual). The closing object world-anchors to
  // the transparent "ritual" gap (clean negative space the camera reaches —
  // NOT behind the semi-opaque CTA card), where the curve resolves to center
  // (x:0), so the beam threads it before continuing into the CTA.
  return (
    <Suspense fallback={null}>
      <RouteHero
        tier={tier}
        anchors={anchors}
        anchorId="ritual"
        kind={config.kind}
        emissiveA={config.emissiveA}
        emissiveB={config.emissiveB}
      />
    </Suspense>
  );
}

export default function Scene({ tier }: { tier: Exclude<SceneTier, "off"> }) {
  const pathname = usePathname();
  // Geometry adapter over the section-state bus — the measurement itself is
  // owned by the layout-level SectionBus (single writer, all tiers).
  const anchors = useSectionAnchors();

  // GPU-aware render DPR (resolved in tierStore before this mounts). The Canvas
  // STARTS at dprInitial (low on weak/ARM GPUs, device-dpr on strong desktops);
  // AdaptiveResolution then adapts within [dprMin, dprMax]. Effects are identical
  // at any DPR — only the render resolution changes — so the full WebGPU scene
  // runs on weak machines too (see AdaptiveResolution + tierStore).
  const dprInitial = useTierStore((s) => s.dprInitial);
  const dprMin = useTierStore((s) => s.dprMin);
  const dprMax = useTierStore((s) => s.dprMax);

  // Capability axis (MOBILE_HOME_SPEC §4.1b/§4.2) — MAY a coarse-pointer device
  // mount decorative islands. `tier` still selects the DOM layout and is NOT
  // redefined; this is strictly additive. On a fine pointer `phoneGL` is false
  // forever (detectPhoneGL returns before touching anything), so `island` is
  // PROVABLY identical to `tier === "full"` on desktop — no desktop gate moves.
  // Subscribed here in the Canvas HOST (outside the island tree, exactly like
  // the dpr reads above), never inside <Canvas> where commits can wedge.
  //
  // EXACTLY ONE gate consumes it today: the NeuralLattice pair. Every other
  // island stays `tier === "full"` on purpose — see MOBILE_HOME_SPEC §4.5 for
  // why each of the other seven is structurally (not merely budgetarily) off.
  //
  // Mobile-parity plan Phase 4a: the gate now reads the budget axis —
  // `fxBudget.level >= 2` — which is BY CONSTRUCTION identical to the old
  // `tier === "full" || phoneGL` (tierStore.resolveFxBudget: tier full ⇒ 3,
  // lite+coarse+phoneGL ⇒ 2, everything else ≤ 1; phoneGL is false on a fine
  // pointer, so no desktop gate moves). It additionally follows
  // stepDownBudget() (2 → 1 unmounts the lattices on a device that cannot
  // hold frame). use-neural-lattice-fallback.ts is the exact complement.
  const budgetLevel = useTierStore((s) => s.fxBudget.level);
  const island = budgetLevel >= 2;

  // Post-FX budget axis (mobile-parity plan Phase 2). `fxBudget.postFx` is
  // written in the SAME set() as `tier` (tierStore.resolve), so it is atomic
  // with the layout tier: `tier === "full"` ⇒ level 3 ⇒ `"full"` (desktop
  // byte-identical), level 1 (weak phone / narrow desktop) ⇒ `"off"` (exactly
  // today), level 2 (capable phone) ⇒ `"lite"`. Subscribed HERE in the Canvas
  // host, alongside the dpr/phoneGL reads — never inside <Canvas>. It is the
  // single kill-switch for the whole post chain: `stepDownBudget()` (level
  // 2 → 1) or `?postfx=off` flips it to "off" and both rigs unmount.
  const postFx = useTierStore((s) => s.fxBudget.postFx);

  // `?perf=1` HUD probe (plan Phase 6.1). Dev/preview only — `perfHud` is
  // written by tierStore.resolve() through devOverridesAllowed(), so it is
  // false on the real domain and the probe is NOT in the tree there (no
  // useFrame, no after-effect, no store write). Read here in the Canvas host
  // like postFx/dpr, never inside <Canvas>.
  const perfHud = useTierStore((s) => s.perfHud);

  // F0.5 renderer seam: the flag is read once at module/build time. When OFF
  // (default) `gl` stays EXACTLY today's object literal — R3F builds its
  // implicit default WebGLRenderer and nothing here touches `three/webgpu`.
  // When ON, `gl` becomes the async WebGPURenderer factory (with WebGL2
  // fallback). The legacy @react-three/postprocessing EffectComposer cannot be
  // driven by `three/webgpu` at all (see the PostFX guard below), so it is
  // gated purely on this build-time flag.
  const webgpu = webgpuEnabled();

  // Route-transition beat for the signature line: fade out, let the curve
  // rebuild against the new page's anchors, fade back in. On first mount
  // this doubles as the intro draw (0 → 1).
  //
  // The re-ignition is timed to the LIFT, not to a fixed delay: the old
  // fixed 420ms fired while the viewport was still fully covered, so the
  // line finished redrawing under the sheet and the viewer only ever saw a
  // static navy panel rising. `onLiftOnce` (route-transition-store) fires
  // the moment a curtain actually starts opening — the cover twin's lift on
  // click-covered navigations, template.tsx's own wipe otherwise — so the
  // damped uReveal (~400ms visible tail, lambda 8 in SignatureLine) draws
  // the line back in THROUGH the uncovering viewport: the crossing plays in
  // view. The 650ms timeout is the fallback for paths that never announce a
  // lift (first mount, where the preloader hand-off in SignatureLine owns
  // the draw-in anyway; flip-zoom navigations, where the inflating clone
  // covers well past it) — reveal can never be left stuck at 0.
  useEffect(() => {
    const { setReveal } = useScrollStore.getState();
    setReveal(0);
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      setReveal(1);
    };
    const offLift = onLiftOnce(fire);
    const t = window.setTimeout(fire, 650);
    return () => {
      offLift();
      window.clearTimeout(t);
    };
  }, [pathname]);

  return (
    <Canvas
      gl={
        webgpu
          ? createWebGPURenderer
          : {
              alpha: true,
              antialias: false,
              powerPreference: "high-performance",
            }
      }
      dpr={dprInitial}
      // R3F's default is `{ scroll: 50, resize: 0 }` — `size` therefore updates
      // on EVERY raw resize event, and islands that list `size.width` in a build
      // effect's deps (FounderPortraitMorph) tear down + rebuild per event
      // during a window-edge drag: dispose, O(count) CPU re-fit, fresh GPU
      // storage buffers, and a blank frame each time. Debouncing the measurement
      // means only the SETTLED size drives a rebuild; the cost is that the
      // drawing buffer lags the element by 150ms mid-drag (a stretched frame
      // while dragging), which is the standard trade and far cheaper than the
      // realloc storm. Scroll debounce left at R3F's default.
      resize={{ scroll: true, debounce: { scroll: 50, resize: 150 } }}
      camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_Z], near: 0.1, far: 200 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        // Publish the RESOLVED runtime backend exactly once (one-shot callback,
        // never per-frame, never inside useFrame). `webgpuEnabled()` is only a
        // build-time flag: with it on, a browser without WebGPU still lands on
        // the WebGL2 fallback backend here. DOM features whose island needs a
        // true compute backend (the founders morph) gate on this instead of the
        // flag, so they fall back to a fully-populated DOM layout rather than
        // rendering content their island can never drive.
        useTierStore.getState().setBackend(backendOf(gl));
      }}
      frameloop="always"
      style={{ position: "absolute", inset: 0 }}
    >
      <FrameDriver />
      {/* Adaptive render resolution: keeps every effect identical and only
          lowers/raises the device-pixel-ratio (within the GPU-aware [min,max]
          range) to hold framerate — the #1 lever for running the full WebGPU
          scene on weak/ARM GPUs without changing the look. */}
      <AdaptiveResolution initial={dprInitial} min={dprMin} max={dprMax} />
      {/* Truthful-loading signal: flips introStore.warmReady once the scene is
          rendering smoothly (WebGPU pipelines compiled), so the preloader's
          counter only reaches 100% when the shaders are genuinely warm. */}
      <PipelineWarmup />
      {/* The faint curl-noise tube-field haze (CurlTubeField) was removed here
          — the user disliked the thin background curl arcs (confirmed live with
          curlTubeIntensity: 0). The component file remains; to restore, re-add
          the import above and `{tier === "full" && <CurlTubeField anchors={anchors} />}`.
          The SignatureLine below (the signature scroll line) is unaffected. */}
      <SignatureLine tier={tier} pathname={pathname} anchors={anchors} />
      <DriftParticles tier={tier} anchors={anchors} pathname={pathname} />
      {/* The per-route ritual object: HeroLogo + GatewayPortal on home, a
          per-route RouteHero on every interior route (single map lookup).
          HeroLogo is mounted ONLY inside the pathname === "/" branch, so it
          never appears on an interior route. */}
      <RouteRitual pathname={pathname} tier={tier} anchors={anchors} />
      {/* Home case-studies rail card planes (restyle step 2 part B). Gates:
          home route + full tier (lite = DOM-only rail) + the WebGPU flag —
          the planes are TSL-only (no GLSL twin; see railPlaneNodeMaterial
          header), so the classic flag-OFF WebGLRenderer path never mounts
          them. Inside the component an additional railStore.pinned gate keeps
          the planes off while the DOM rail runs its native (unpinned)
          fallback. MUST stay mounted AFTER SignatureLine: the per-frame plane
          placement is camera-relative and relies on the single camera
          authority having written camera.position.y earlier in the same
          priority-0 frame pass. */}
      {pathname === "/" && tier === "full" && webgpu && <RailPlanes />}
      {/* Home founders particle-portrait morph (P1R, WEBGL_UPGRADE_PLAN §4R).
          Same gates as RailPlanes (home route + full tier + the WebGPU flag —
          TSL/compute-only, no GLSL twin; on the classic flag-OFF path or
          lite/off/reduced-motion/coarse the accessible DOM founders section in
          founders-rail.tsx is the whole visual). Inside the component a
          foundersMorphStore.pinned gate keeps it off while the DOM section runs
          its horizontal-rail / native fallback, and it self-disables unless a
          TRUE-WebGPU compute backend is present. MUST stay mounted AFTER
          SignatureLine (same reason as RailPlanes): the per-frame group
          placement is camera-relative and relies on the single camera authority
          having written camera.position/quaternion earlier in the same
          priority-0 frame pass. */}
      {pathname === "/" && tier === "full" && webgpu && <FounderPortraitMorph />}
      {/* FIX 3 neural-lattice islands (home only). Two camera-locked lattices:
          the Problem section ("broken" — pathways go dark / packets die) and the
          ProductionGrade section ("healthy" — clusters pulse in sequence). MUST
          stay mounted AFTER SignatureLine: the camera-locked placement relies on
          the single camera authority having written camera.position/quaternion
          earlier in the same priority-0 frame pass. Each lattice reads
          useNeuralLatticeStore (globalThis-pinned) for its per-cluster ignition,
          bumped by the DOM sections on their in-view edge.

          GATE (MOBILE_HOME_SPEC §4.2 — the ONLY island gate that moved): route +
          `island` + the WebGPU flag. `island` is `fxBudget.level >= 2` (Phase 4a
          of the mobile-parity plan; identical to the former
          `tier === "full" || phoneGL` and it follows stepDownBudget), so
          a CAPABLE PHONE now gets the real lattice instead of the DOM SVG — the
          owner's "non ci sono gli effetti del desktop" complaint, answered on the
          one island that is cheap enough to say yes to. Still TSL-only (no GLSL
          twin), so the classic flag-OFF path never mounts it; on a non-WebGPU
          BACKEND the island skips build.compute() and renders a still-but-igniting
          field (NeuralLattice:427-428), which is why a WebGL2-fallback phone is
          still worth mounting. Particle count drops to
          NEURAL_PARTICLE_COUNT_COMPACT on lite (§4.4).

          use-neural-lattice-fallback.ts is DEFINED as the exact complement of
          this line. The two must never diverge or a capable phone paints the SVG
          graph AND the WebGL lattice stacked on each other. */}
      {pathname === "/" && island && webgpu && (
        <>
          <NeuralLattice mode="broken" anchorId="problem" />
          <NeuralLattice mode="healthy" anchorId="production" />
        </>
      )}
      {/* /resources article-hover signal plane (BEAT 3). Same gates as
          RailPlanes — route + full tier + the WebGPU flag (TSL-only, no GLSL
          twin; on the classic flag-OFF path the DOM gradient card in
          resource-preview.tsx is the whole preview). MUST stay mounted AFTER
          SignatureLine: the camera-locked placement relies on the single camera
          authority having written camera.position/quaternion earlier in the
          same priority-0 frame pass. */}
      {pathname === "/resources" && tier === "full" && webgpu && (
        <ResourcePreviewPlane />
      )}
      {/* /audit hero singularity (ITERATION 17): a TSL raymarched black hole —
          a gravitationally-lensed accretion disc, world-anchored behind the
          audit H1. The gravity metaphor for the page: six surfaces of the
          business pulled into one scored map with an unblinking center. Same
          decorative-island gates as RailPlanes — route + full tier + the WebGPU
          flag (TSL-only, no GLSL twin; on the classic flag-OFF path or
          lite/off/reduced-motion the DOM hero in audit-client.tsx is the whole
          visual, untouched). MUST stay mounted AFTER SignatureLine: the
          per-frame world anchor, scroll fade and uCamLocal write are
          camera-relative and rely on the single camera authority having
          written camera.position earlier in the same priority-0 frame pass.
          Its emissive raymarch output rides the SAME >1.0 threshold bloom in
          PostFXNodes — no second post chain. */}
      {pathname === "/audit" && tier === "full" && webgpu && (
        <AuditSingularity anchors={anchors} />
      )}
      {/* HOME eclipse singularity (owner experiment 2/3): the same raymarched
          black hole re-framed HUGE and low-center behind the "Sersan AI"
          brand intro — only the lensed ring's upper arc crowns the lower
          frame, and the hole fades out fully as the brand melts into the DOM
          hero (uFade ← ignite × eased(1 − domReveal); it never competes with
          the spore mark's rest pose). Same decorative-island gates as the
          siblings — route + full tier + the WebGPU flag (TSL-only, no GLSL
          twin); inside the island a textMorphStore.active + introSkipped
          check keeps a skipped/absent intro showing nothing, and the build
          requires the true compute backend (no intro there → no eclipse).
          BUILD IS DEFERRED until textMorphStore.assembleDone (regression fix,
          2026-08-07): its compile/build co-resident with HeroTextParticles'
          compute build at the entry moment silently starved the text
          pipeline and the wordmark never assembled — the entry beat owns the
          GPU compile window; the island then warms via compileAsync and
          rises in over ~1.2s behind the formed brand. MUST stay mounted
          AFTER SignatureLine: the camera-locked placement and the
          uCamWorld/uCamLocal writes rely on the single camera authority
          having written camera.position earlier in the same priority-0 frame
          pass. GPU: the march is heavy and home already carries the spore
          hero + the text sim — AdaptiveResolution owns the framerate, and
          group.visible flips off outside the intro beat so the march costs
          nothing once the hero has cascaded in. Its emissive output rides the
          SAME >1.0 threshold bloom in PostFXNodes — no second post chain. */}
      {pathname === "/" && tier === "full" && webgpu && <HomeSingularity />}
      {/* HOME mid-page plunge singularity (THE LONG TAKE): the third framing
          of the raymarch factory — a world-anchored-X / camera-locked-Y hole
          revealed by the passage's TRACK-RIGHT camera pan after spine beat
          05, approached on the pure 1/distance law, and crossfaded into the
          preloader's point tunnel before it can fill the frame. Same
          decorative-island gates as the siblings (route + full tier + the
          WebGPU flag; TSL-only, no GLSL twin — the DOM passage runs its CSS
          hole imposter on the classic flag-OFF path). Scrub inputs arrive
          via seqStore (written by singularity-passage.tsx); build DEFERRED
          to the approach band + compileAsync-warmed, disposed on far leave —
          init-on-approach per the heavy-layer mandate. MUST stay mounted
          AFTER SignatureLine: placement + the uCamWorld/uCamLocal writes are
          camera-relative and rely on the single camera authority (which also
          applies the passage's seqPan term earlier in the same priority-0
          pass). Its emissive march rides the SAME >1.0 threshold bloom in
          PostFXNodes — no second post chain.

          PHONES DELIBERATELY DO NOT GET THIS ISLAND (Phase 4, 2026-08-11).
          The coarse-pointer branch of singularity-passage.tsx now runs a real
          scrub-linked beat of its own — the CSS hole on the same 1/d law plus
          the raw-WebGL1 point tunnel the preloader already ships to every
          phone — instead of the ~180svh of empty scroll it used to be. It was
          NOT wired to this island because the march is ~96 iterations/pixel
          over a silhouette that grows to fill the frame (a tile GPU has no
          budget for it, and no FPS measurement was available to prove
          otherwise), because the island drags the whole three/webgpu + TSL
          chunk onto the route with the worst mobile Lighthouse, and because
          `tier === "full"` has 13 consumers that must not be half-migrated.
          The full reasoning lives in that file's FALLBACK MATRIX. */}
      {pathname === "/" && tier === "full" && webgpu && (
        <SequenceSingularity />
      )}
      {/* The old /trust CompliancePipeline3D centerpiece is RETIRED (the 3D
          "models" were replaced by the SERSAN logo). It lived BEHIND the SVG
          compliance diagram, so a logo at the "pipeline" anchor would be occluded
          dead pixels — instead /trust shows the logo at its VISIBLE "ritual"
          anchor (via RouteRitual above). The SVG diagram in compliance-pipeline.tsx
          stays the accessible pipeline layer. CompliancePipeline3D.tsx and its
          TSL sim were deleted in the dead-code cleanup; only the signal store
          survives (the DOM diagram still writes it — compliancePipelineStore). */}
      {/* Postprocessing — gated on the BUDGET axis `fxBudget.postFx` (Phase 2
          of the mobile-parity plan), no longer on `tier === "full"`:

          • "full"  → desktop tier "full" (level 3). Exactly today's chain on
                      both rigs — no prop, uniform or pass changes.
          • "lite"  → capable phone (level 2). The SAME chain, cheaper: WebGL
                      rig `<Bloom levels={4}>` + no `<Noise>`; WebGPU rig same
                      graph at DPR 1 with grain + fluid off (BloomNode has NO
                      cost knob — DPR is the lever, see PostFXNodes header).
          • "off"   → level 1 (today's lite: weak phone / narrow desktop) and
                      level 0. Nothing mounts — byte-identical to before.

          Which rig mounts is a BUILD-TIME split on `webgpuEnabled()`, not a
          runtime backend check:

          • Flag OFF → PostFX (@react-three/postprocessing EffectComposer). This
            lib is WebGL-only — it calls renderer.getContext().getContextAttributes(),
            absent on WebGPURenderer (and its WebGL2 *fallback* backend exposes a
            different context object too) — so it would crash whenever the flag is
            ON, regardless of the chosen backend. A runtime `backend` state would
            mount it on the first render (before onCreated can update it) and crash.
            `webgpuEnabled()` is inlined at build time, so the split is static and
            race-free. With the flag OFF this branch is byte-identical to before.

          • Flag ON → PostFXNodes (three's native TSL PostProcessing + selective
            bloom + hand-rolled vignette + optional hand-rolled grain, tonemap at
            output; the addon CA/film nodes were removed as a null-input crash
            source — see PostFXNodes header). It restores the cinematic grade the
            WebGPU path otherwise lacks (EffectComposer is suppressed above), keeps
            the >1.0 selective-bloom contract, and drives `post.render()` from a
            single priority-1 useFrame (no second RAF; R3F's default render is
            suppressed). It imports three/webgpu + three/tsl LAZILY, so the OFF
            bundle never pulls the heavy node-material build. */}
      {postFx !== "off" &&
        (webgpuEnabled() ? (
          <PostFXNodes pathname={pathname} level={postFx} />
        ) : (
          <PostFX pathname={pathname} level={postFx} />
        ))}
      {/* `?perf=1` probe (Phase 6.1): the in-Canvas measurer for the DOM
          PerfHud (layout.tsx). Priority-0 useFrame (a positive priority would
          suppress R3F's default render on the postFx-off WebGL path) + one
          R3F after-effect that samples renderer.info once per frame and writes
          perfStore 4×/s. Mounted LAST and only behind the flag — with it off
          the desktop render path is untouched (see PerfProbe header). */}
      {perfHud && <PerfProbe />}
    </Canvas>
  );
}
