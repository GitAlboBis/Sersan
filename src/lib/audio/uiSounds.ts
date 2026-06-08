/**
 * Procedural UI sound engine (Web Audio, zero asset files).
 *
 * A small, tasteful palette of synthesized interaction sounds for a premium
 * AI-consultancy feel — refined, low, "engineered", never annoying. Every
 * sound is generated in code (oscillators + gain envelopes + filtered noise);
 * nothing is downloaded.
 *
 * Browser autoplay policy: an AudioContext created before a user gesture
 * starts `suspended`. We create it lazily and resume it on the FIRST
 * pointerdown/keydown/touchstart. Until that gesture (or while the user has
 * disabled audio) every play call is a silent no-op — so the first hover never
 * triggers an autoplay-policy console warning.
 *
 * SSR-safety: this module references `window`/`AudioContext` ONLY inside
 * functions invoked from the client (event handlers / effects), never at
 * module evaluation. Importing it on the server is inert.
 *
 * The preference lives in `audioStore` (persisted). This engine reads it via
 * getState() so mute/unmute is instant and re-render-free.
 */
import { useAudioStore } from "@/webgl/store/audioStore";

// ---- module-level singletons (client-only, created lazily) ----------------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** Once true, the context has been resumed by a user gesture. */
let unlocked = false;
/** Guards the one-time gesture listener install. */
let gestureArmed = false;

/** Master output level — deliberately low so sounds are quiet/tasteful. */
const MASTER_GAIN = 0.12;

/** Throttle window for the hover tick so rapid hovers don't machine-gun. */
const HOVER_THROTTLE_MS = 70;
let lastHoverAt = 0;

type AudioCtor = typeof AudioContext;

function getAudioCtor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioCtor })
      .webkitAudioContext ||
    null
  );
}

/**
 * Lazily create the AudioContext + master gain. Returns null if Web Audio is
 * unavailable or we're on the server. Does NOT resume the context (that needs
 * a gesture — see `armGesture`).
 */
function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = getAudioCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  return ctx;
}

/**
 * Install a one-time set of gesture listeners that resume the AudioContext.
 * Required by the browser autoplay policy. Safe to call repeatedly; it only
 * arms once. Call this from the client on mount.
 */
export function armAudioGesture(): void {
  if (gestureArmed || typeof window === "undefined") return;
  gestureArmed = true;

  const unlock = () => {
    const c = ensureContext();
    if (c && c.state === "suspended") {
      // Resume returns a promise; ignore rejection (some browsers reject if no
      // gesture is actually in progress — harmless here).
      c.resume().catch(() => {});
    }
    if (c) unlocked = true;
    // One-and-done: a single successful gesture is enough to unlock.
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
}

/** True when a sound may actually be produced right now. */
function canPlay(): boolean {
  if (!useAudioStore.getState().enabled) return false;
  if (!unlocked) return false;
  const c = ensureContext();
  // If the context drifted back to suspended (tab refocus etc.), try to resume
  // opportunistically — we're inside a play call which usually follows a click.
  if (c && c.state === "suspended") c.resume().catch(() => {});
  return !!c && c.state === "running";
}

// ---- shared synth helpers --------------------------------------------------

/** A short burst of white noise as an AudioBuffer (for transients/whooshes). */
function makeNoiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// ---- the palette -----------------------------------------------------------

/**
 * hover — a very soft, short high tick. Sine ~1040Hz, ~45ms, fast decay, very
 * low gain. Throttled so a fast sweep across links doesn't machine-gun.
 */
export function playHover(): void {
  const now = performance.now();
  if (now - lastHoverAt < HOVER_THROTTLE_MS) return;
  if (!canPlay()) return;
  lastHoverAt = now;

  const c = ctx!;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1040, t);
  // A whisper of upward drift gives it a gentle "tick" rather than a flat beep.
  osc.frequency.linearRampToValueAtTime(1180, t + 0.04);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.5, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

  osc.connect(gain).connect(master!);
  osc.start(t);
  osc.stop(t + 0.06);
}

/**
 * click — a soft pluck/blip. Short sine with a quick pitch drop + a tiny
 * lowpassed noise transient for body. ~100ms.
 */
export function playClick(): void {
  if (!canPlay()) return;

  const c = ctx!;
  const t = c.currentTime;

  // Tonal pluck: pitch drops from ~660 to ~330 over the decay.
  const osc = c.createOscillator();
  const oscGain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(660, t);
  osc.frequency.exponentialRampToValueAtTime(330, t + 0.09);
  oscGain.gain.setValueAtTime(0.0001, t);
  oscGain.gain.exponentialRampToValueAtTime(0.7, t + 0.005);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  osc.connect(oscGain).connect(master!);
  osc.start(t);
  osc.stop(t + 0.12);

  // Lowpassed noise transient — gives the blip a soft attack "body".
  const noise = c.createBufferSource();
  noise.buffer = makeNoiseBuffer(c, 0.04);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1400, t);
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.25, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  noise.connect(lp).connect(noiseGain).connect(master!);
  noise.start(t);
  noise.stop(t + 0.05);
}

/**
 * transition — a subtle airy whoosh for route changes. Bandpass-filtered
 * noise swept upward then released, ~320ms, gentle. Played once per nav.
 */
export function playTransition(): void {
  if (!canPlay()) return;

  const c = ctx!;
  const t = c.currentTime;
  const dur = 0.32;

  const noise = c.createBufferSource();
  noise.buffer = makeNoiseBuffer(c, dur);

  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.9;
  // Sweep the passband up — reads as an airy "lift" rather than a hiss.
  bp.frequency.setValueAtTime(320, t);
  bp.frequency.exponentialRampToValueAtTime(1600, t + dur * 0.7);
  bp.frequency.exponentialRampToValueAtTime(700, t + dur);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.4, t + dur * 0.35);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  noise.connect(bp).connect(gain).connect(master!);
  noise.start(t);
  noise.stop(t + dur + 0.02);
}
