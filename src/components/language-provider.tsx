"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import gsap from "gsap";
import enDict from "@/data/translations/en";
import itDict from "@/data/translations/it";
import type { Language, TranslationDictionary } from "@/data/translations/types";

const STORAGE_KEY = "sersan_language";
const COOKIE_KEY = "sersan_language";

// ---------------------------------------------------------------------------
// The language swap as ONE designed beat.
//
// An EN↔IT swap replaces every string on the page at once. Raw, that reads as
// a full-page text reflow — and the split headings remount via key={language},
// replaying their line rises over the snap. Instead, every swap (the toggle
// click AND the returning-visitor hydration swap) plays as a single quiet
// fade-through-dim on the [data-lang-fade] wrapper(s) (layout.tsx marks the
// z-[1] content column): dip → swap while dimmed → rise. Opacity only — no
// transform, so the wrapper never becomes a containing block for its fixed
// descendants and nothing thrashes layout.
// ---------------------------------------------------------------------------
/** Fade-THROUGH-dim, never to black: the page stays present under the swap
 *  (dropping to 0 would strand the bare WebGL layer for a beat). */
const SWAP_DIM = 0.35;
/** Dip before the toggle swap — power2.in, the repo's exit gesture. */
const SWAP_OUT_S = 0.15;
/** Rise after the toggle swap — expo.out, the entrance token. */
const SWAP_IN_S = 0.2;
/** Rise after the hydration swap (returning Italian visitor). Slightly
 *  tighter: there was no user gesture, so the moment should barely register. */
const HYDRATE_IN_S = 0.18;

// Client components still render on the server, where useLayoutEffect warns —
// and there is no paint to beat there anyway, so useEffect is equivalent.
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const dictionaries: Record<Language, TranslationDictionary> = {
  en: enDict as unknown as TranslationDictionary,
  it: itDict as unknown as TranslationDictionary,
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  // 1 year, lax samesite
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function detectInitial(): Language {
  if (typeof window === "undefined") return "en";
  // The pre-hydration inline script in layout.tsx already resolved
  // storage → <html data-lang> before first paint; trust it first so the
  // script and the provider can never disagree within one load.
  const preset = document.documentElement.dataset.lang;
  if (preset === "it" || preset === "en") return preset;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "it" || stored === "en") return stored;
  const cookie = readCookie(COOKIE_KEY);
  if (cookie === "it" || cookie === "en") return cookie;
  return "en";
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** The wrappers the swap beat dims. Queried fresh each time (never cached):
 *  the layout owns the attribute and this must keep working if more surfaces
 *  ever opt in. */
function fadeTargets(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-lang-fade]"),
  );
}

/** Restore the wrappers from the dim: kill anything in flight, assert the
 *  dim start, rise, then clear the inline opacity so no stale style lingers
 *  on an element other systems also observe. */
function fadeUp(targets: HTMLElement[], duration: number) {
  if (targets.length === 0) return;
  gsap.killTweensOf(targets);
  gsap.set(targets, { opacity: SWAP_DIM });
  gsap.to(targets, {
    opacity: 1,
    duration,
    ease: "expo.out",
    clearProps: "opacity",
  });
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Always start with 'en': the shell is statically prerendered in English,
  // so SSR HTML and the hydration render MUST match — initializing from
  // storage here would hydrate Italian state against English server markup,
  // a full-page hydration mismatch. The persisted language is applied by the
  // pre-paint layout effect below instead.
  const [language, setLanguageState] = useState<Language>("en");

  // Last language COMMITTED to the DOM. Lets setLanguage read the current
  // value without going stale in its useCallback([]) closure, and lets the
  // fade-up effect tell a real swap commit apart from the mount pass.
  const langRef = useRef<Language>("en");
  // Armed by whoever starts a swap while the wrappers sit dimmed; consumed by
  // the [language] layout effect AFTER the swapped text has committed (the
  // rise must never start on still-untranslated pixels). Carries the rise
  // duration, which differs between the hydration and toggle beats.
  const fadeUpRef = useRef<number | null>(null);
  // Language a dip is currently in flight TOWARD (null = no dip). Guards the
  // dip's onComplete against being superseded by a rapid re-click, and lets a
  // same-language click cancel a pending opposite swap cleanly.
  const pendingSwapRef = useRef<Language | null>(null);

  // HYDRATION SWAP — a returning Italian visitor loads the static English
  // shell (the prerender trade-off: cookies() in the root layout would flip
  // every route dynamic, which is off the table). Rather than letting the
  // page hard-reflow to Italian mid-read, the swap becomes a designed moment:
  // dim the content wrapper SYNCHRONOUSLY (layout effect — before the swapped
  // text can possibly paint), commit the language, and let the [language]
  // effect below fade the Italian page up. English visitors take the fast
  // path: no state change, no paint work at all.
  useIsoLayoutEffect(() => {
    const initial = detectInitial();
    if (initial === "en") return;
    if (!prefersReducedMotion()) {
      const targets = fadeTargets();
      if (targets.length > 0) {
        gsap.set(targets, { opacity: SWAP_DIM });
        fadeUpRef.current = HYDRATE_IN_S;
      }
    }
    setLanguageState(initial);
    // Mount-only by design: this is the one-shot storage → state handoff.
  }, []);

  // FADE-UP — runs in the same commit that produced the swapped text (layout
  // effect: the first frame of the new language paints already dimmed, so the
  // swap itself is never seen at full brightness). The mount pass and renders
  // without an armed fade fall through untouched.
  useIsoLayoutEffect(() => {
    const prev = langRef.current;
    langRef.current = language;
    if (language === prev) return;
    if (fadeUpRef.current == null) return;
    const duration = fadeUpRef.current;
    fadeUpRef.current = null;
    fadeUp(fadeTargets(), duration);
  }, [language]);

  // <html lang> follows the text it describes — updated on every committed
  // swap (a11y: screen readers pick the voice from this). data-lang mirrors
  // it as the pre-paint script's styling/diagnostic hook.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dataset.lang = language;
    }
  }, [language]);

  // Every EN↔IT switch swaps the copy of the whole page — different text
  // lengths move every [data-line-anchor] and change the document height
  // with no resize event. Tell SectionBus to re-measure (belt-and-braces
  // with its body ResizeObserver) so the signature line's anchors stay
  // fresh. Effects run post-commit, so the new-language DOM is already in
  // place when this fires. Skipped on mount: the initial measure passes
  // (and the hydration swap setting a non-"en" language re-runs this effect
  // with a REAL change) already cover first paint.
  const langDispatched = useRef(false);
  useEffect(() => {
    if (!langDispatched.current) {
      langDispatched.current = true;
      return;
    }
    window.dispatchEvent(new CustomEvent("sersan:remeasure"));
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    // Persist unconditionally — a same-language click still heals a missing
    // cookie (e.g. cleared cookies with localStorage intact).
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* ignore quota / privacy mode */
      }
    }
    writeCookie(COOKIE_KEY, lang);

    // Reduced motion: instant swap, exactly the pre-beat behavior. If a dip
    // is somehow mid-flight (the OS setting flipped mid-beat), settle the
    // wrappers back to rest so nothing can be left dimmed.
    if (prefersReducedMotion()) {
      if (pendingSwapRef.current !== null) {
        pendingSwapRef.current = null;
        const all = fadeTargets();
        gsap.killTweensOf(all);
        gsap.set(all, { clearProps: "opacity" });
      }
      if (lang !== langRef.current) setLanguageState(lang);
      return;
    }

    if (lang === langRef.current) {
      // Clicking the language already on screen. If a dip toward the OTHER
      // language is still in flight (rapid re-click), cancel it and restore —
      // its onComplete must never land the abandoned swap. An idle
      // same-language click stays a visual no-op.
      if (pendingSwapRef.current !== null) {
        pendingSwapRef.current = null;
        fadeUp(fadeTargets(), SWAP_IN_S);
      }
      return;
    }

    const targets = fadeTargets();
    if (targets.length === 0) {
      // No wrapper mounted (shouldn't happen under the root layout, but the
      // provider must not depend on it) — plain swap.
      setLanguageState(lang);
      return;
    }

    // Hidden tab: GSAP's rAF ticker is frozen, so a dip started now would
    // never reach onComplete — the page would rest dimmed in the OLD language
    // while the cookie already says otherwise. Nobody can see the beat in a
    // hidden tab; commit instantly.
    if (typeof document !== "undefined" && document.hidden) {
      pendingSwapRef.current = null;
      gsap.killTweensOf(targets);
      gsap.set(targets, { clearProps: "opacity" });
      setLanguageState(lang);
      return;
    }

    // THE TOGGLE BEAT — dip, swap while dimmed, rise. The rise is armed here
    // but executed by the [language] layout effect above, so it can only
    // start once React has committed the swapped text. killTweensOf makes
    // rapid re-clicks converge: the newest dip owns the beat, and a killed
    // dip's onComplete never fires.
    pendingSwapRef.current = lang;
    gsap.killTweensOf(targets);
    gsap.to(targets, {
      opacity: SWAP_DIM,
      duration: SWAP_OUT_S,
      ease: "power2.in",
      onComplete: () => {
        if (pendingSwapRef.current !== lang) return; // superseded mid-dip
        pendingSwapRef.current = null;
        fadeUpRef.current = SWAP_IN_S;
        setLanguageState(lang);
      },
    });
    // Failsafe for a tab hidden MID-dip: the frozen ticker parks the tween
    // before onComplete, but setTimeout still runs in background tabs (merely
    // clamped), so the swap commits within ~1s regardless. The pendingSwapRef
    // check makes this a no-op whenever the dip completed or was superseded;
    // the armed rise then plays on the next visible frame.
    window.setTimeout(() => {
      if (pendingSwapRef.current !== lang) return;
      pendingSwapRef.current = null;
      fadeUpRef.current = SWAP_IN_S;
      setLanguageState(lang);
    }, 600);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = dictionaries[language] ?? dictionaries.en;
      return dict[key] ?? dictionaries.en[key] ?? key;
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
