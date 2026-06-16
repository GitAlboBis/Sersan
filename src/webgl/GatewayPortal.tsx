"use client";

/**
 * GatewayPortal — the home's closing-moment ritual object, at the `final-cta`
 * section's `gateway` anchor (the signature line's last waypoint resolves to
 * center there, so the beam threads it as you arrive).
 *
 * It now renders the SERSAN LOGO (the `kind:"logo"` config of the generalized
 * `RouteHero`), replacing the former machined double-ring GLB — the logo glows
 * cyan↔violet, slow-spins, and lights up neon-blue on hover. All the
 * choreography (world-anchor math, presence scale-in, culling, emissive pulse,
 * rim lights) lives in RouteHero; this file is just the home slot's config.
 *
 * NOTE: this is the SECOND logo on the home page — the dissolving-particle mark
 * (HeroLogo) is the hero at the top; this is a solid glowing logo at the closing
 * CTA, at a different scroll position.
 */
import { RouteHero } from "./RouteHero";
import type { SectionAnchors } from "./hooks/useSectionAnchors";
import type { SceneTier } from "./store/tierStore";

interface GatewayPortalProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}

export function GatewayPortal({ tier, anchors }: GatewayPortalProps) {
  return (
    <RouteHero
      tier={tier}
      anchors={anchors}
      anchorId="gateway"
      debugKey="__sersanGate"
      kind={{ type: "logo" }}
      scale={2.1}
      z={0.6}
      emissiveA="#3BE1FF"
      emissiveB="#7C5CFF"
      emissiveIntensity={2.2}
      outerSpin={0.16}
      rim={{
        keyPosition: [2.6, 1.6, 2.4],
        keyIntensity: 2.6,
        keyColor: "#3BE1FF",
        fillPosition: [-2.4, -1.8, 1.8],
        fillIntensity: 1.6,
        fillColor: "#7C5CFF",
      }}
    />
  );
}
