/**
 * UI-audio preference store.
 *
 * Holds the single `enabled` flag for the procedural interaction sounds
 * (hover / click / route-transition). Defaults to TRUE per the product
 * decision, persisted to localStorage so the user's choice sticks across
 * visits.
 *
 * SSR-safety: the store is created at module scope (no DOM access there),
 * but it INTENTIONALLY initialises `enabled` to the default (true) on both
 * server and first client render to avoid a hydration mismatch. The persisted
 * value is hydrated from localStorage in an effect via `hydrateAudioPref()`
 * (called once by AudioTriggers on mount) — exactly the same pattern the
 * LanguageProvider uses. All localStorage access is guarded to the client.
 *
 * This store only carries the *preference*. The AudioContext + synths live in
 * `src/lib/audio/uiSounds.ts`; they read `enabled` via `getState()` so a flip
 * takes effect immediately without re-rendering anything.
 */
import { create } from "zustand";

const STORAGE_KEY = "sersan_audio";

interface AudioState {
  /** Whether UI sounds may play. Default true; persisted to localStorage. */
  enabled: boolean;
  /** True once the persisted preference has been read on the client. Lets the
   *  header toggle avoid flashing the wrong icon before hydration. */
  hydrated: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  /** Reads the persisted preference (client-only) into the store, once. */
  hydrate: () => void;
}

function persist(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    /* ignore quota / privacy mode */
  }
}

export const useAudioStore = create<AudioState>((set, get) => ({
  // Default ON. Kept identical on server + first client paint for hydration.
  enabled: true,
  hydrated: false,
  toggle: () => {
    const next = !get().enabled;
    persist(next);
    set({ enabled: next });
  },
  setEnabled: (enabled) => {
    persist(enabled);
    set({ enabled });
  },
  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    // Only override the default if an explicit choice was stored.
    if (stored === "off") set({ enabled: false, hydrated: true });
    else set({ hydrated: true });
  },
}));
