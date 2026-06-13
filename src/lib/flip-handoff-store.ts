/**
 * flip-handoff-store — a globalThis-pinned singleton holding the most recent
 * "armed" card→detail Flip handoff. The pin (matching the repo convention for
 * surviving Turbopack chunk-split + App Router soft nav) means the snapshot
 * recorded on a card click is still readable after the detail route mounts in
 * a freshly-imported module instance.
 *
 * Lifecycle: a card click PASSIVELY arms a snapshot (rect + image src). The
 * detail page PEEKS (isFlipArmedFor, non-consuming) to decide whether to defer
 * its entrance; the persistent overlay CONSUMES (consumeFlip) to fly the clone.
 * A short freshness window discards stale snapshots (e.g. a click that never
 * navigated, or a much-later back/forward to the same slug).
 */
export interface FlipSnapshot {
  slug: string;
  rect: { left: number; top: number; width: number; height: number };
  src: string;
  armedAt: number;
}

const KEY = "__sersan_flip_handoff__";

interface Holder {
  current: FlipSnapshot | null;
}

const g = globalThis as unknown as Record<string, Holder | undefined>;
const holder: Holder = g[KEY] ?? (g[KEY] = { current: null });

const FRESH_MS = 1200;

export function armFlip(s: FlipSnapshot) {
  holder.current = s;
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
  return fresh(holder.current, slug) !== null;
}

export function consumeFlip(slug: string): FlipSnapshot | null {
  const s = fresh(holder.current, slug);
  if (s) holder.current = null;
  return s;
}

export function clearFlip() {
  holder.current = null;
}
