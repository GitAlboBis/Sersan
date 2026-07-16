/**
 * flip-handoff-store — a globalThis-pinned singleton holding the most recent
 * "armed" card→detail handoff. The pin (matching the repo convention for
 * surviving Turbopack chunk-split + App Router soft nav) means the snapshot
 * recorded on a card click is still readable after the detail route mounts in
 * a freshly-imported module instance.
 *
 * Lifecycle: a card click PASSIVELY arms a snapshot (rect + optional image
 * src + card radius). Arming synchronously notifies the persistent overlay's
 * zoom listener (fx/flip-handoff-overlay), which starts inflating a clone of
 * the card face to fullscreen BEFORE the <Link> navigation lands — the clone
 * is the route curtain for that navigation, so template.tsx consumes
 * `consumeCurtainSuppression()` once and skips its own wipe. The detail page
 * PEEKS (isFlipArmedFor, non-consuming) to decide whether to defer its hero
 * entrance; the overlay CONSUMES (consumeFlip) on arrival to settle the clone
 * onto the hero. A short freshness window discards stale snapshots (e.g. a
 * click that never navigated, or a much-later back/forward to the same slug).
 *
 * The same channel carries the REVERSE flight (direction:"return"): the
 * detail page's explicit back-link arms a snapshot of the HERO rect, the
 * overlay covers the route swap with a hero-clipped shell (again the curtain
 * for that navigation — same suppression handshake) and deflates it onto the
 * matching [data-flip-source] card on the destination page.
 */
export interface FlipSnapshot {
  slug: string;
  rect: { left: number; top: number; width: number; height: number };
  /** Live rect of the card's VISIBLE media layer at arm time. The rail's
   *  [data-rail-media] layer is 112% wide and parallax-shifted by the scrub,
   *  so the crop the eye is on is NOT the card rect — the overlay seeds its
   *  clone <img> box from this so the cover-crop is identical at frame 0.
   *  Absent (grid cards, logo cards, unlaid-out layer) → the card rect IS the
   *  media box and the clone falls back to it. */
  mediaRect?: { left: number; top: number; width: number; height: number };
  /** Visible zoom of the media at arm time: ~1.06 when the hover-distortion
   *  canvas was live (its shader holds a centred 6% zoom at full hover), 1
   *  otherwise (the CSS <img> fallback settles at scale 1). The overlay
   *  starts the clone at this scale and folds the settle into the inflate's
   *  ripple, so the shader zoom never pops off at click time. */
  mediaZoom?: number;
  /** Preview image src — present for the three build cards. Cards without
   *  one zoom as a navy panel and cross-fade out instead of landing on a
   *  detail hero (there is none to land on). */
  src?: string;
  /** Computed border-radius of the clicked card face (clone start pose). */
  radius?: string;
  /** Flight direction. Absent/"forward" = card→detail zoom (inflate → land
   *  on the hero). "return" = the detail back-link deflate: the shell starts
   *  clipped to the DETAIL HERO rect and lands on the matching card. */
  direction?: "forward" | "return";
  /** Return flights only: the pathname the arming back-link navigates to —
   *  the overlay accepts exactly this arrival and treats any other route
   *  change mid-flight as stale. */
  returnPath?: string;
  armedAt: number;
}

type ZoomListener = (s: FlipSnapshot) => void;

const KEY = "__sersan_flip_handoff__";

interface Holder {
  current: FlipSnapshot | null;
  /** Optional: an already-pinned holder from an older module instance (dev
   *  HMR / chunk-split) may predate the zoom fields — normalized below. */
  zoomListener?: ZoomListener | null;
  /** armedAt timestamp of the last zoom-armed click; 0 = none pending. */
  curtainSuppressedAt?: number;
}

const g = globalThis as unknown as Record<string, Holder | undefined>;
const holder: Holder =
  g[KEY] ??
  (g[KEY] = { current: null, zoomListener: null, curtainSuppressedAt: 0 });
holder.zoomListener ??= null;
holder.curtainSuppressedAt ??= 0;

const FRESH_MS = 1200;

export function armFlip(s: FlipSnapshot) {
  holder.current = s;
  // Zoom flight + curtain suppression only when the overlay is listening —
  // without a listener this stays the legacy passive arm (curtain wipes as
  // normal, Flip.fit flight on arrival), so nothing can suppress the curtain
  // and leave the navigation visually uncovered.
  if (holder.zoomListener) {
    holder.curtainSuppressedAt = s.armedAt;
    holder.zoomListener(s);
  }
}

/** Registered once by the persistent FlipHandoffOverlay; null on unmount. */
export function setZoomListener(fn: ZoomListener | null) {
  holder.zoomListener = fn;
}

/**
 * Consumed once per navigation by template.tsx: true → skip the curtain wipe
 * (the inflating card clone IS the curtain). Freshness-gated so a click that
 * never navigated cannot eat a later, unrelated navigation's wipe.
 */
export function consumeCurtainSuppression(): boolean {
  const t = holder.curtainSuppressedAt ?? 0;
  holder.curtainSuppressedAt = 0;
  return t > 0 && Date.now() - t <= FRESH_MS;
}

function fresh(s: FlipSnapshot | null, slug: string): FlipSnapshot | null {
  if (!s || s.slug !== slug) return null;
  if (Date.now() - s.armedAt > FRESH_MS) {
    holder.current = null;
    return null;
  }
  return s;
}

export function isFlipArmedFor(slug: string): boolean {
  const s = fresh(holder.current, slug);
  // The detail hero PEEKS this to defer its entrance for an INCOMING zoom; an
  // outbound return snapshot (back-link deflate) must never hide the hero the
  // user is about to fly away from.
  return s !== null && s.direction !== "return";
}

export function consumeFlip(slug: string): FlipSnapshot | null {
  const s = fresh(holder.current, slug);
  if (s) holder.current = null;
  return s;
}

export function clearFlip() {
  holder.current = null;
}
