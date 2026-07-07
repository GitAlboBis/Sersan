"use client";

/**
 * Thin adapter over the section-state bus (sectionStore) for the WebGL
 * scene: exposes each [data-line-anchor]'s vertical center as a document
 * fraction (0..1), the start/end spans, the document scrollHeight and a
 * rebuild version. The signature line rebuilds its curve whenever `version`
 * bumps, so the curve stays glued to real section positions across
 * responsive reflow, font loading and EN/IT copy-length changes.
 *
 * The MEASUREMENT itself lives in the layout-level <SectionBus /> component
 * (single writer, works on every tier — including "off" — and under reduced
 * motion), with the same cadence this hook used to own: mount/route change,
 * debounced resize (150ms), fonts.ready, and two delayed passes mirroring
 * the cinematic section's late ScrollTrigger refresh bursts. Section
 * IDENTITY (active section, arrival pulse, scroll direction) also lives on
 * the bus — read useSectionStore directly for those.
 */
import { useMemo } from "react";
import { useSectionStore, type SectionSpan } from "../store/sectionStore";

export type AnchorSpan = SectionSpan;

export interface SectionAnchors {
  fractions: Record<string, number>;
  spans: Record<string, AnchorSpan>;
  scrollHeight: number;
  /**
   * Pathname the spans were measured FOR ("" pre-measure). Curve consumers
   * compare this against their own pathname to detect the route-change race
   * (geometry keyed on pathname rebuilds before SectionBus re-measures) and
   * hold their last good geometry until the fresh measure lands.
   */
  measuredPath: string;
  version: number;
}

export function useSectionAnchors(): SectionAnchors {
  // Reactive only on measure bumps (rare) — never on scroll-cadence fields.
  const version = useSectionStore((s) => s.measureVersion);

  return useMemo(() => {
    const { spans, scrollHeight, measuredPath } = useSectionStore.getState();
    // Center fraction = (start + end) / 2 — exactly the centerDocY /
    // scrollHeight the old in-hook measure computed.
    // measuredPath only ever changes together with a version bump (a path
    // change is never short-circuited by setMeasured), so keying the memo on
    // `version` alone stays sound.
    const fractions: Record<string, number> = {};
    for (const id of Object.keys(spans)) {
      const span = spans[id];
      fractions[id] = (span.start + span.end) / 2;
    }
    return { fractions, spans, scrollHeight, measuredPath, version };
  }, [version]);
}
