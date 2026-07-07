"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import enDict from "@/data/translations/en";
import itDict from "@/data/translations/it";
import type { Language, TranslationDictionary } from "@/data/translations/types";

const STORAGE_KEY = "sersan_language";
const COOKIE_KEY = "sersan_language";

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
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "it" || stored === "en") return stored;
  const cookie = readCookie(COOKIE_KEY);
  if (cookie === "it" || cookie === "en") return cookie;
  return "en";
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Always start with 'en' to keep SSR and first client render in sync, then
  // sync from storage in an effect to avoid hydration mismatches.
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const initial = detectInitial();
    if (initial !== "en") setLanguageState(initial);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Every EN↔IT switch swaps the copy of the whole page — different text
  // lengths move every [data-line-anchor] and change the document height
  // with no resize event. Tell SectionBus to re-measure (belt-and-braces
  // with its body ResizeObserver) so the signature line's anchors stay
  // fresh. Effects run post-commit, so the new-language DOM is already in
  // place when this fires. Skipped on mount: the initial measure passes
  // (and the storage sync setting a non-"en" language re-runs this effect
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
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* ignore quota / privacy mode */
      }
    }
    writeCookie(COOKIE_KEY, lang);
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
