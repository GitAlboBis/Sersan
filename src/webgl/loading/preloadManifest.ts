/**
 * Preload manifest with BYTE progress (mobile-parity plan Phase 3.3 — Lusion's
 * `quick-loader`).
 *
 * The preloader's counter (src/components/fx/preloader.tsx) is driven by real
 * readiness signals; until this module none of the site's ASSETS were in it —
 * only fonts / window "load" / the tier resolution / the shader warm-up. This
 * is the "manifest" slice: a small, explicit list of URLs fetched up front so
 * (a) their bytes count toward the readout, and (b) the later consumer of each
 * URL hits the HTTP cache instead of the network.
 *
 * WHY `fetch`, NOT three's `LoadingManager` + `FileLoader` (the plan's first
 * sketch, PHASE0_LOADING_APIS.md §1-3): the preloader chunk MUST stay free of
 * any `three` VALUE import — three lives in the lazy Scene chunk (preloader.tsx
 * header, "NO three import"). A private `new LoadingManager()` would have been
 * the right tool inside the Canvas tree, but here it would drag `three.core`
 * into the root-layout bundle. Plain `fetch` + `ReadableStream` gives the same
 * thing the plan actually wants — per-file byte progress from `Content-Length`
 * (Vercel exposes it for `public/`), no `DefaultLoadingManager` clash with
 * drei's `useProgress`, and — because three's `Cache` is not involved at all —
 * zero risk of poisoning `useGLTF`'s URL-keyed cache (`FileLoader.js:86,275`).
 *
 * WHAT MAY GO IN THE MANIFEST — only assets NO OTHER LOADER TOUCHES through
 * three's `Cache`: today the founder headshots the WebGL morph force-loads via
 * `new Image()` (FounderPortraitMorph.tsx `loadImg`/`loadFounder`, path
 * template `/founders/<anchor>-headshot.webp`, `src/data/founders.ts`); in
 * future transcoder/decoder blobs. NEVER the mark GLB: `useGLTF.preload` owns
 * it (HeroLogo.tsx) and a second fetch buys nothing.
 *
 * SEMANTICS
 *   `startPreloadManifest(urls)` starts every fetch immediately and returns
 *   `{ progress(), done, cancel() }`:
 *   - `progress()` — 0..1, MONOTONIC (never lowers between calls, so the
 *     preloader's eased counter can never tick backwards), byte-weighted once
 *     every item's `Content-Length` is known, item-averaged before that (a
 *     response without `Content-Length` contributes 0 while streaming and 1
 *     when it ends). Exactly 1 once every item has SETTLED — a non-2xx status,
 *     a network error and a cancel all settle the item (an error must never
 *     trap the counter: it is the LoadingManager `itemError → itemEnd` rule).
 *     An EMPTY list is 1 immediately.
 *   - `done` — resolves once every item has settled (immediately when empty);
 *     never rejects.
 *   - `cancel()` — aborts the in-flight requests (teardown). Cancelled items
 *     settle, so `progress()` reads 1 and `done` resolves.
 *   `cache: "force-cache"` is used so the response is served from / stored in
 *   the HTTP cache under the browser's normal rules — that is what lets the
 *   later `<img>` / `new Image()` load of the same URL skip the network.
 *
 * NOT here by design: the time bound. The preloader applies its own
 * `MANIFEST_MAX_MS` fallback exactly like it does for fonts / load, so this
 * module stays a pure loader; and the tier gate — the CALLER decides which
 * URLs are in budget (`manifestUrlsForBudget` below is the one list we ship).
 */
import { founders } from "@/data/founders";
import type { FxBudget } from "../store/tierStore";
import { webgpuEnabled } from "../renderer/createRenderer";

export interface PreloadManifestHandle {
  /** 0..1, byte-weighted, monotonic; 1 once every item settled or the list is empty. */
  progress(): number;
  /** Resolves once every item settled (immediately for an empty list). Never rejects. */
  done: Promise<void>;
  /** Abort in-flight requests (teardown). Cancelled items settle. */
  cancel(): void;
}

interface ManifestItem {
  url: string;
  /** Bytes read from the body so far. */
  loaded: number;
  /** `Content-Length` when the server sent one; 0 = unknown / not yet known. */
  total: number;
  /** Response consumed, errored, or cancelled — counts as complete. */
  settled: boolean;
}

/**
 * The headshot assets `FounderPortraitMorph` force-loads (path template
 * `/founders/<anchor>-headshot.webp`, mirrors `loadFounder`'s first — and, for
 * every shipped founder, only — extension). Included ONLY when the morph can
 * actually mount: `fxBudget.level === 3` (desktop tier "full" — the morph is
 * gated `tier === "full"` in Scene.tsx, and level 3 ⇔ tier full by
 * construction) AND the WebGPU build flag (the morph is TSL/compute-only and
 * Scene.tsx ANDs `webgpu` into its gate; on the WebGL build the fetch would
 * warm a cache nothing ever reads) AND the HOME route (`/` is the only route
 * FounderPortraitMorph mounts on — on /audit, /trust, … the fetch would again
 * warm a cache nothing reads; the preloader arms once per hard load, so the
 * landing pathname is the right gate). Everywhere else — every phone, level ≤
 * 2, reduced motion, WebGL build, any non-home route — the manifest is EMPTY,
 * so the slice resolves to 1 the instant the tier is known and the counter is
 * byte-identical to before.
 *
 * ACCEPTED RESIDUAL WASTE: a desktop that passes all three gates but whose
 * WebGPU adapter request FAILS at runtime (the WebGL2 runtime fallback —
 * `backend === "webgl"` is written by Scene.tsx onCreated, LATER than the tier
 * resolves) still fetches the three headshots the morph will never mount. The
 * backend is unknown at tier-resolve time, and the manifest must start on
 * that edge to be worth anything, so this rare desktop case is accepted:
 * three cached webp files, no correctness impact (the slice settles the same
 * way).
 */
export function manifestUrlsForBudget(budget: FxBudget): string[] {
  if (budget.level !== 3) return [];
  if (!webgpuEnabled()) return [];
  if (typeof window === "undefined" || window.location.pathname !== "/") {
    return [];
  }
  return founders.map((f) => `/founders/${f.anchor}-headshot.webp`);
}

/**
 * Start fetching `urls` now; see the module header for the handle semantics.
 * Safe to call with an empty list (progress 1, `done` already resolved). Never
 * throws — a missing `fetch`/`ReadableStream` (ancient browser, SSR) settles
 * every item at once.
 */
export function startPreloadManifest(urls: string[]): PreloadManifestHandle {
  const items: ManifestItem[] = urls.map((url) => ({
    url,
    loaded: 0,
    total: 0,
    settled: false,
  }));
  const controllers: AbortController[] = [];
  // Monotonic floor for progress(): a switch from item-averaged to
  // byte-weighted accounting (once the last Content-Length arrives) could
  // otherwise read LOWER than the previous call — the preloader eases its
  // counter toward this value, so it must never step back.
  let best = 0;

  let settledCount = 0;
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const settle = (item: ManifestItem) => {
    if (item.settled) return;
    item.settled = true;
    // A settled item counts as its full length (a server that under-reports
    // Content-Length must not leave the item at 0.97 forever).
    if (item.total > 0) item.loaded = item.total;
    settledCount++;
    if (settledCount >= items.length) resolveDone();
  };

  const progress = (): number => {
    const n = items.length;
    if (n === 0) return 1;
    if (settledCount >= n) return 1;
    let known = 0;
    let sumTotal = 0;
    let sumLoaded = 0;
    let sumFrac = 0;
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const frac = it.settled
        ? 1
        : it.total > 0
          ? Math.min(it.loaded / it.total, 1)
          : 0;
      sumFrac += frac;
      if (it.total > 0) {
        known++;
        sumTotal += it.total;
        sumLoaded += it.settled ? it.total : Math.min(it.loaded, it.total);
      }
    }
    // Byte-weighted only once EVERY item's length is known (or settled with a
    // length); until then the item average is the honest reading.
    const raw =
      known === n && sumTotal > 0 ? sumLoaded / sumTotal : sumFrac / n;
    // Cap below 1 while anything is still in flight: 1 means "all settled".
    const capped = Math.min(raw, 0.999);
    if (capped > best) best = capped;
    return best;
  };

  if (items.length === 0) {
    resolveDone();
    return { progress, done, cancel: () => {} };
  }

  const canStream =
    typeof fetch === "function" &&
    typeof AbortController === "function" &&
    typeof ReadableStream === "function";
  if (!canStream) {
    items.forEach(settle);
    return { progress, done, cancel: () => {} };
  }

  for (const item of items) {
    const ctrl = new AbortController();
    controllers.push(ctrl);
    fetch(item.url, { cache: "force-cache", signal: ctrl.signal })
      .then(async (res) => {
        const len = Number(res.headers.get("content-length"));
        if (Number.isFinite(len) && len > 0) item.total = len;
        if (!res.ok || !res.body) {
          settle(item);
          return;
        }
        const reader = res.body.getReader();
        // Stream the body so `loaded` advances per chunk (this is the byte
        // progress); the browser stores the full response in the HTTP cache
        // per the response's own caching headers.
        for (;;) {
          const { done: end, value } = await reader.read();
          if (end) break;
          if (value) item.loaded += value.byteLength;
        }
        settle(item);
      })
      .catch(() => {
        // Network error / abort / non-streamable body: the item is DONE from
        // the counter's point of view (never a trap).
        settle(item);
      });
  }

  const cancel = () => {
    for (const c of controllers) {
      try {
        c.abort();
      } catch {
        // Nothing to do — the catch above settles the item.
      }
    }
    // Belt-and-suspenders: settle synchronously so a caller reading
    // progress() right after cancel() sees 1 (the abort rejection lands on a
    // later microtask).
    items.forEach(settle);
  };

  return { progress, done, cancel };
}
