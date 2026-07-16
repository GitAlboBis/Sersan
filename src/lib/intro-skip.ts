/**
 * Intro-skip session flag — "the visitor explicitly skipped the hero
 * particle intro; don't gate them again this tab session".
 *
 * WRITER: HeroIntroGate (src/components/fx/hero-intro-gate.tsx) — the
 * explicit skip affordance: Esc while the intro gate is engaged, or the
 * bottom-right mono "skip" label. Only deliberate, unambiguous input may
 * write this flag: a gesture-based auto-skip (double wheel-flick) was tried
 * and removed 2026-06-13 — mouse-wheel notches are fixed-magnitude, so a
 * flick can't be distinguished from normal scrolling and it false-fired.
 *
 * READERS: HeroTextParticles jumps every morph clock to its end state on
 * introSkipped; HeroIntroGate's canEngage refuses to (re-)engage and its
 * tick re-pins the journey flags after any rewind (e.g. the provider's
 * nav-into-home replay reset, which deliberately keeps introSkipped).
 *
 * Persistence: sessionStorage (key "sersan_skip_intro"), following the
 * audioStore idiom — never read at module scope or during render (SSR-safe:
 * server always answers false), reads happen lazily from effects/rAF on the
 * client only, writes are try/catch-guarded for privacy mode.
 *
 * The lazy read is cached on globalThis (NOT module scope): this module is
 * imported from both the route bundle (HeroIntroGate, SmoothScrollProvider)
 * and potentially the lazy WebGL island, and Turbopack has inlined separate
 * copies of small modules into each chunk in prod (the textMorphStore
 * dual-instance bug, 2026-06-10). A module-scope cache could go stale in one
 * copy after the other copy wrote the flag; the globalThis slot keeps every
 * copy coherent. Cross-bundle CONSUMERS should still prefer the
 * `textMorphStore.introSkipped` field, which the skip writers set in the
 * same beat.
 */

const STORAGE_KEY = "sersan_skip_intro";

declare global {
  // eslint-disable-next-line no-var
  var __sersanIntroSkip: boolean | undefined;
}

/** Whether the intro was skipped earlier this tab session. False on the
 * server and before the first client read. */
export function isIntroSkipped(): boolean {
  if (typeof window === "undefined") return false;
  if (globalThis.__sersanIntroSkip === undefined) {
    try {
      globalThis.__sersanIntroSkip =
        window.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Privacy mode / storage disabled — treat as not skipped.
      globalThis.__sersanIntroSkip = false;
    }
  }
  return globalThis.__sersanIntroSkip;
}

/** Records the skip for the rest of the tab session. */
export function markIntroSkipped(): void {
  globalThis.__sersanIntroSkip = true;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Best effort — the globalThis cache still covers this page lifetime.
  }
}
