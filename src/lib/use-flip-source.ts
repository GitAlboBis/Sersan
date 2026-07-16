"use client";

import { useCallback } from "react";
import { armFlip } from "@/lib/flip-handoff-store";

/**
 * useFlipSource — returns an onClick that PASSIVELY arms the flip-handoff
 * store with the clicked card's rect (+ image src and border-radius when
 * available). It NEVER calls preventDefault: the <Link> navigates exactly as
 * normal (a prior attempt that intercepted the click + router.push caused a
 * navigate-to-home bug; this design avoids that). The persistent overlay
 * reacts to the arm and inflates the zoom-to-fullscreen clone WHILE the
 * native navigation proceeds beneath it.
 *
 * Every work card arms (src is optional): cards with a preview image inflate
 * their shot and land on the detail hero; the rest inflate as a navy panel
 * and cross-fade out over the detail header.
 *
 * The snapshot records the VISIBLE media state, not the abstract card, so the
 * clone matches what the eye is already on at frame 0:
 *   - mediaRect: the live rect of the rail's [data-rail-media] layer (112%
 *     wide, parallax-shifted by the scrub) when the card has one — the clone
 *     <img> box seeds from it so the cover-crop is identical at click time.
 *     Cards without the layer (grid, logo cards) fall back to the card rect,
 *     where the media box IS the card box anyway.
 *   - mediaZoom: 1.06 when the hover-distortion canvas is live (its shader
 *     holds a centred ~6% zoom at full hover — card-image-distort FRAG:
 *     mix(1, 1/1.06, uHover)); 1 otherwise (the CSS <img> fallback's hover
 *     scale settles at 1). The overlay starts the clone at this scale so the
 *     shader zoom never pops off under the click.
 *
 * Arms only on a plain same-tab left click; modified clicks (cmd/ctrl/shift/
 * alt, non-primary buttons) open normally without a flight, and reduced-motion
 * / coarse (touch) pointers opt out entirely → plain navigation with the
 * standard curtain, and the detail figure plays its normal (or RM) entrance.
 */
export function useFlipSource(slug: string, src?: string) {
  return useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (typeof window === "undefined") return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return; // let modified clicks open normally
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (window.matchMedia("(pointer: coarse)").matches) return; // touch → no flip
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      // Live visible-media rect (see header). Zero-size guard: an unlaid-out
      // layer must fall back to the card rect, never seed a degenerate box.
      const mediaEl = el.querySelector<HTMLElement>("[data-rail-media]");
      const mr = mediaEl?.getBoundingClientRect();
      const mediaRect =
        mr && mr.width > 2 && mr.height > 2
          ? { left: mr.left, top: mr.top, width: mr.width, height: mr.height }
          : undefined;
      // data-canvas-active is stamped by CardImageDistort only while its
      // WebGL2 context is live & rendering — exactly the frames where the eye
      // sees the shader's zoomed re-sample instead of the flat <img>.
      const mediaZoom = el.querySelector(
        '.card-image-distort[data-canvas-active="true"]',
      )
        ? 1.06
        : 1;
      armFlip({
        slug,
        src,
        mediaRect,
        mediaZoom,
        radius: window.getComputedStyle(el).borderRadius || undefined,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        armedAt: Date.now(),
      });
      // NB: NO preventDefault — <Link> navigates as normal.
    },
    [slug, src],
  );
}

/**
 * useReturnFlipSource — the REVERSE flight's arming hook, for the detail
 * page's explicit back-link ONLY. Browser back/forward (popstate) never runs
 * a click handler, so history navigations keep the plain transition they
 * always had — the deflate is reserved for the deliberate "back to the work"
 * gesture. On a plain left click it snapshots the detail hero's live rect and
 * arms a direction:"return" flight: the overlay builds a shell clipped to the
 * hero, covers the route swap (the shell IS that navigation's curtain), and
 * deflates onto the matching [data-flip-source] card on the destination page.
 *
 * The generic route cover (navbar's RouteTransitionCover) must skip this
 * navigation — one cover per navigation — so the handler toggles
 * [data-no-curtain] on the link itself: SET exactly when a flight arms,
 * REMOVED otherwise, so coarse-pointer / reduced-motion / modified / no-hero
 * clicks keep today's cover sweep byte-identical. The attribute lands before
 * the cover's document-level listener reads it (React delegates events at the
 * root container, which bubbles before document — the same ordering the
 * forward arm already relies on).
 *
 * Passive like useFlipSource: NEVER preventDefault, the <Link> navigates
 * natively while the overlay animates above.
 */
export function useReturnFlipSource(slug: string, src?: string) {
  return useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (typeof window === "undefined") return;
      const link = e.currentTarget;
      // Exact per-click state: an earlier armed click must not leave the
      // cover suppressed for a later click that does NOT arm (e.g. the OS
      // reduced-motion toggle flipped mid-session).
      link.removeAttribute("data-no-curtain");
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return; // let modified clicks open normally
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (window.matchMedia("(pointer: coarse)").matches) return; // touch → no flip
      // No hero shot → nothing to deflate from; the standard cover plays.
      if (!src) return;
      const hero = document.querySelector<HTMLElement>(
        `[data-flip-hero][data-flip-id="${slug}"]`,
      );
      const r = hero?.getBoundingClientRect();
      if (!hero || !r || r.width < 2 || r.height < 2) return;
      const href = (link as HTMLAnchorElement).href;
      if (!href) return;
      link.setAttribute("data-no-curtain", "");
      armFlip({
        slug,
        src,
        direction: "return",
        // The overlay accepts exactly this arrival; any other route change
        // mid-flight is stale and gets the quick-fade dispose.
        returnPath: new URL(href, window.location.href).pathname,
        radius: window.getComputedStyle(hero).borderRadius || undefined,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        armedAt: Date.now(),
      });
      // NB: NO preventDefault — <Link> navigates as normal.
    },
    [slug, src],
  );
}
