/**
 * Sersan brand film — procedural sound design.
 *
 * Generates every SFX and the music bed as 48 kHz / 16-bit stereo WAV files
 * into public/sfx. Pure Node, no dependencies, fully deterministic (seeded
 * RNG) so a re-run reproduces byte-identical files.
 *
 * Palette (mirrors the site's uiSounds.ts register: low, engineered, never
 * annoying): sub impacts, glass impacts, risers, whooshes, particle shimmer,
 * the halo "ring boom", typing keys, UI ticks, signal blips, a reverse swell
 * for cut-ins, an end chord, and a 44 s ambient bed (sub drone + space wind
 * + slow A-minor pad).
 *
 *   node tools/synth-sfx.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx");
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- utilities
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const TAU = Math.PI * 2;

class Buf {
  constructor(seconds) {
    this.n = Math.ceil(seconds * SR);
    this.L = new Float64Array(this.n);
    this.R = new Float64Array(this.n);
  }
  add(i, l, r) {
    if (i < 0 || i >= this.n) return;
    this.L[i] += l;
    this.R[i] += r;
  }
}

/** RBJ biquad; coefficients may be re-set every sample for sweeps. */
class Biquad {
  constructor() {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.b0 = 1;
    this.b1 = this.b2 = this.a1 = this.a2 = 0;
  }
  set(type, f, Q) {
    f = clamp(f, 10, SR * 0.45);
    const w = (TAU * f) / SR;
    const cs = Math.cos(w);
    const sn = Math.sin(w);
    const al = sn / (2 * Q);
    let b0, b1, b2, a0, a1, a2;
    if (type === "lp") {
      b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2;
    } else if (type === "hp") {
      b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2;
    } else {
      b0 = al; b1 = 0; b2 = -al; // band-pass, constant peak gain
    }
    a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/** Pink noise (Paul Kellet's refined method). */
class Pink {
  constructor(rng) { this.rng = rng; this.b = new Float64Array(7); }
  next() {
    const w = this.rng() * 2 - 1;
    const b = this.b;
    b[0] = 0.99886 * b[0] + w * 0.0555179;
    b[1] = 0.99332 * b[1] + w * 0.0750759;
    b[2] = 0.969 * b[2] + w * 0.153852;
    b[3] = 0.8665 * b[3] + w * 0.3104856;
    b[4] = 0.55 * b[4] + w * 0.5329522;
    b[5] = -0.7616 * b[5] - w * 0.016898;
    const out = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362;
    b[6] = w * 0.115926;
    return out * 0.11;
  }
}

/** Freeverb-style Schroeder reverb (4 combs + 2 allpasses per channel). */
class Reverb {
  constructor(size = 1, decay = 0.84, damp = 0.3) {
    const mk = (n) => ({ buf: new Float64Array(Math.max(8, Math.round(n * size))), i: 0, f: 0 });
    this.cL = [1557, 1617, 1491, 1422].map(mk);
    this.cR = [1557 + 23, 1617 + 23, 1491 + 23, 1422 + 23].map(mk);
    this.aL = [225, 556].map((n) => ({ buf: new Float64Array(n), i: 0 }));
    this.aR = [225 + 7, 556 + 11].map((n) => ({ buf: new Float64Array(n), i: 0 }));
    this.decay = decay;
    this.damp = damp;
  }
  proc(combs, aps, x) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.f = y * (1 - this.damp) + c.f * this.damp;
      c.buf[c.i] = x + c.f * this.decay;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    s *= 0.25;
    for (const a of aps) {
      const y = a.buf[a.i];
      const out = -s + y;
      a.buf[a.i] = s + y * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = out;
    }
    return s;
  }
  run(l, r) { return [this.proc(this.cL, this.aL, l), this.proc(this.cR, this.aR, r)]; }
}

/** Apply reverb as a send: out = dry + wet * verb(dry). */
function addReverb(buf, wet, size = 1.2, decay = 0.85, damp = 0.32) {
  const rv = new Reverb(size, decay, damp);
  const L = new Float64Array(buf.n), R = new Float64Array(buf.n);
  for (let i = 0; i < buf.n; i++) {
    const [l, r] = rv.run(buf.L[i], buf.R[i]);
    L[i] = buf.L[i] + wet * l;
    R[i] = buf.R[i] + wet * r;
  }
  buf.L = L; buf.R = R;
}

function dcBlock(buf) {
  for (const ch of [buf.L, buf.R]) {
    let x1 = 0, y1 = 0;
    for (let i = 0; i < ch.length; i++) {
      const y = ch[i] - x1 + 0.9976 * y1;
      x1 = ch[i]; y1 = y; ch[i] = y;
    }
  }
}
function softClip(buf, drive = 1.25) {
  const k = Math.tanh(drive);
  for (const ch of [buf.L, buf.R]) for (let i = 0; i < ch.length; i++) ch[i] = Math.tanh(ch[i] * drive) / k;
}
function normalize(buf, peak = 0.9) {
  let m = 0;
  for (const ch of [buf.L, buf.R]) for (let i = 0; i < ch.length; i++) m = Math.max(m, Math.abs(ch[i]));
  if (m < 1e-9) return;
  const g = peak / m;
  for (const ch of [buf.L, buf.R]) for (let i = 0; i < ch.length; i++) ch[i] *= g;
}
function fadeEdges(buf, inS = 0.004, outS = 0.03) {
  const ni = Math.floor(inS * SR), no = Math.floor(outS * SR);
  for (let i = 0; i < ni; i++) { const g = i / ni; buf.L[i] *= g; buf.R[i] *= g; }
  for (let i = 0; i < no; i++) { const g = i / no; const k = buf.n - 1 - i; buf.L[k] *= g; buf.R[k] *= g; }
}

function writeWav(name, buf) {
  dcBlock(buf);
  fadeEdges(buf);
  const bytes = 44 + buf.n * 4;
  const out = Buffer.alloc(bytes);
  out.write("RIFF", 0); out.writeUInt32LE(bytes - 8, 4); out.write("WAVE", 8);
  out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
  out.write("data", 36); out.writeUInt32LE(buf.n * 4, 40);
  let o = 44;
  for (let i = 0; i < buf.n; i++) {
    out.writeInt16LE(Math.round(clamp(buf.L[i], -1, 1) * 32767), o); o += 2;
    out.writeInt16LE(Math.round(clamp(buf.R[i], -1, 1) * 32767), o); o += 2;
  }
  writeFileSync(join(OUT, name), out);
  console.log(`  ${name.padEnd(22)} ${(buf.n / SR).toFixed(2)}s`);
}

/** Sequential per-sample renderer: fn(t, i) -> [l, r] (stateful closures ok). */
function render(seconds, fn) {
  const b = new Buf(seconds);
  for (let i = 0; i < b.n; i++) { const [l, r] = fn(i / SR, i); b.L[i] = l; b.R[i] = r; }
  return b;
}
/** Equal-power pan, p in [-1, 1]. */
const pan = (x, p) => { const a = ((p + 1) / 2) * (Math.PI / 2); return [x * Math.cos(a), x * Math.sin(a)]; };

// ------------------------------------------------------------------ sounds

/** Doppler whoosh: pink noise, band-pass sweep up then down, panned across. */
function whoosh(seed, dur = 1.0, dir = 1, lowF = 260, hiF = 5200) {
  const rng = mulberry32(seed);
  const pink = new Pink(rng);
  const bp = new Biquad(), air = new Biquad().set("hp", 4200, 0.7);
  return render(dur, (t) => {
    const u = t / dur;
    const bell = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 2.2);
    const f = u < 0.42 ? lerp(lowF, hiF, smoothstep(0, 0.42, u)) : lerp(hiF, lowF * 2.2, smoothstep(0.42, 1, u));
    bp.set("bp", f, 1.15);
    const n = pink.next();
    const body = bp.run(n) * 3.2;
    const top = air.run(rng() * 2 - 1) * 0.25 * Math.pow(bell, 2);
    const x = (body + top) * bell;
    return pan(x, lerp(-0.8, 0.8, u) * dir);
  });
}

/** Long riser: accelerating filter sweep + sine glide + accelerating tremolo. Ends hard. */
function riser(seed, dur = 3.0) {
  const rng = mulberry32(seed);
  const pink = new Pink(rng);
  const bp = new Biquad();
  let ph = 0, trem = 0;
  return render(dur, (t) => {
    const u = t / dur;
    const f = 120 * Math.pow(2, 5.2 * Math.pow(u, 1.55));
    bp.set("bp", f, 2.2);
    const amp = Math.pow(u, 2.1);
    const sf = lerp(48, 520, Math.pow(u, 1.8));
    ph += (TAU * sf) / SR;
    trem += (TAU * lerp(5, 34, u * u)) / SR;
    const tremolo = 1 - 0.32 * (0.5 + 0.5 * Math.sin(trem)) * smoothstep(0.35, 0.9, u);
    const noise = bp.run(pink.next()) * 3.4;
    const sine = Math.sin(ph) * 0.42;
    const x = (noise + sine) * amp * tremolo;
    const wob = Math.sin(t * 6.2) * 0.35 * u;
    return pan(x, wob);
  });
}

/** Sub impact: pitch-dropping sine + knock + short noise burst, reverb tail. */
function impactSub(seed, dur = 2.8) {
  const rng = mulberry32(seed);
  const lp = new Biquad().set("lp", 2600, 0.8);
  let ph = 0, ph2 = 0;
  const b = render(dur, (t) => {
    const f = 36 + 130 * Math.exp(-t / 0.055);
    ph += (TAU * f) / SR;
    ph2 += (TAU * 172) / SR;
    const sub = Math.sin(ph) * Math.exp(-t / 0.6) * (1 - Math.exp(-t / 0.0025));
    const knock = Math.sin(ph2) * Math.exp(-t / 0.05) * 0.45;
    const burst = lp.run(rng() * 2 - 1) * Math.exp(-t / 0.018) * 0.7;
    const x = sub + knock + burst;
    return [x, x * 0.98];
  });
  addReverb(b, 0.32, 1.45, 0.87, 0.3);
  softClip(b, 1.35);
  return b;
}

/** Glass impact: sub hit + bright transient + inharmonic ringing partials. */
function impactGlass(seed, dur = 2.6) {
  const rng = mulberry32(seed);
  const hpN = new Biquad().set("bp", 6400, 0.8);
  const lp = new Biquad().set("lp", 2000, 0.8);
  const partials = [2093, 3136, 4699, 6272, 7902, 9956].map((f, k) => ({ f: f * (1 + (rng() - 0.5) * 0.004), tau: 0.62 - k * 0.075, ph: rng() * TAU, amp: 0.13 - k * 0.012 }));
  let ph = 0;
  const b = render(dur, (t) => {
    const f = 40 + 110 * Math.exp(-t / 0.05);
    ph += (TAU * f) / SR;
    const sub = Math.sin(ph) * Math.exp(-t / 0.42) * 0.7;
    const burst = lp.run(rng() * 2 - 1) * Math.exp(-t / 0.014) * 0.5;
    const bright = hpN.run(rng() * 2 - 1) * Math.exp(-t / 0.02) * 1.6;
    let ring = 0, ringR = 0;
    for (const p of partials) {
      p.ph += (TAU * p.f * (1 + 0.002 * Math.sin(t * 5.3))) / SR;
      const e = Math.exp(-t / p.tau) * p.amp;
      ring += Math.sin(p.ph) * e;
      ringR += Math.sin(p.ph + 0.6) * e;
    }
    return [sub + burst + bright + ring, sub + burst * 0.9 + bright * 0.85 + ringR];
  });
  addReverb(b, 0.38, 1.3, 0.86, 0.22);
  softClip(b, 1.3);
  return b;
}

/** Particle shimmer: hundreds of tiny high sine grains with a density arc + air. */
function shimmer(seed, dur = 3.2, grains = 1100, fLo = 2400, fHi = 9200) {
  const rng = mulberry32(seed);
  const b = new Buf(dur);
  for (let g = 0; g < grains; g++) {
    // density envelope: rises to a peak around 55 % then thins out
    let u;
    do { u = rng(); } while (rng() > Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.4));
    const start = Math.floor(u * dur * SR);
    const f = fLo * Math.pow(fHi / fLo, rng());
    const len = Math.floor(lerp(0.025, 0.09, rng()) * SR);
    const amp = lerp(0.03, 0.075, rng()) * (f < 4000 ? 1 : 0.8);
    const p = rng() * 2 - 1;
    const [gl, gr] = pan(1, p);
    let ph = rng() * TAU;
    for (let k = 0; k < len; k++) {
      ph += (TAU * f) / SR;
      const e = Math.exp(-k / (len * 0.3)) * (1 - Math.exp(-k / 60));
      const s = Math.sin(ph) * e * amp;
      b.add(start + k, s * gl, s * gr);
    }
  }
  const pink = new Pink(rng);
  const hp = new Biquad().set("hp", 3800, 0.7);
  for (let i = 0; i < b.n; i++) {
    const u = i / b.n;
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.6) * 0.16;
    const n = hp.run(pink.next()) * env;
    b.L[i] += n; b.R[i] += n * 0.9;
  }
  addReverb(b, 0.42, 1.5, 0.88, 0.2);
  return b;
}

/** UI tick — short, clean. */
function tick(seed, f = 2400, dur = 0.09) {
  const rng = mulberry32(seed);
  const bp = new Biquad().set("bp", 5200, 1.0);
  let ph = 0;
  return render(dur, (t) => {
    ph += (TAU * f) / SR;
    const s = Math.sin(ph) * Math.exp(-t / 0.009);
    const n = bp.run(rng() * 2 - 1) * Math.exp(-t / 0.0035) * 0.7;
    const x = s + n;
    return [x, x];
  });
}

/** Typing key — the site's hover register: soft sine ~1 kHz with a whisper of upward drift. */
function typeKey(seed, f0 = 1040, dur = 0.1) {
  const rng = mulberry32(seed);
  const lp = new Biquad().set("lp", 3200, 0.7);
  let ph = 0;
  return render(dur, (t) => {
    const f = f0 * (1 + 0.06 * (1 - Math.exp(-t / 0.02)));
    ph += (TAU * f) / SR;
    const s = Math.sin(ph) * Math.exp(-t / 0.014) * (1 - Math.exp(-t / 0.001));
    const click = lp.run(rng() * 2 - 1) * Math.exp(-t / 0.0022) * 0.35;
    const x = s + click;
    return [x, x];
  });
}

/** Halo ring boom: slow-attack sub chord (55/110/165) + thin rising glide, wide reverb. */
function ringBoom(seed, dur = 3.6) {
  const rng = mulberry32(seed);
  const ph = [0, 0, 0, 0, 0, 0];
  let gl = 0;
  const fs = [55, 110, 165];
  const b = render(dur, (t) => {
    const att = 1 - Math.exp(-t / 0.13);
    const dec = t > 0.38 ? Math.exp(-(t - 0.38) / 1.35) : 1;
    const env = att * dec;
    let l = 0, r = 0;
    fs.forEach((f, k) => {
      ph[k] += (TAU * f) / SR;
      ph[k + 3] += (TAU * (f + 0.7 * (k + 1))) / SR;
      const a = [1, 0.5, 0.22][k];
      l += Math.sin(ph[k]) * a;
      r += Math.sin(ph[k + 3]) * a;
    });
    const gu = smoothstep(0.0, 1.25, t);
    gl += (TAU * lerp(360, 1500, gu)) / SR;
    const glide = Math.sin(gl) * 0.08 * Math.pow(Math.sin(Math.PI * clamp(t / 1.5, 0, 1)), 1.5);
    const shimmerN = (rng() * 2 - 1) * 0.02 * env;
    return [(l * 0.5 + glide + shimmerN) * env, (r * 0.5 + glide * 0.8 + shimmerN) * env];
  });
  addReverb(b, 0.45, 1.7, 0.9, 0.25);
  softClip(b, 1.2);
  return b;
}

/** Reverse swell: builds to a hard stop (use right before a cut). */
function reverseSwell(seed, dur = 1.4) {
  const rng = mulberry32(seed);
  const pink = new Pink(rng);
  const lp = new Biquad();
  let ph = 0;
  return render(dur, (t) => {
    const u = t / dur;
    const env = Math.exp(-(dur - t) / 0.32);
    lp.set("lp", lerp(280, 6500, smoothstep(0, 1, u)), 0.9);
    ph += (TAU * lerp(70, 95, u)) / SR;
    const n = lp.run(pink.next()) * 3.0 * env;
    const s = Math.sin(ph) * env * env * 0.5;
    const x = n + s;
    return pan(x, Math.sin(u * Math.PI * 2) * 0.3);
  });
}

/** Signal blip: two quick sine steps (1.8 kHz then 2.4 kHz). */
function blip(seed, f1 = 1800, f2 = 2400, dur = 0.16) {
  let ph = 0;
  return render(dur, (t) => {
    const f = t < 0.045 ? f1 : f2;
    ph += (TAU * f) / SR;
    const e = t < 0.045 ? Math.exp(-t / 0.02) : Math.exp(-(t - 0.045) / 0.03);
    const x = Math.sin(ph) * e * (1 - Math.exp(-t / 0.001));
    return [x, x];
  });
}

/** Light travelling along a line: sine glide + narrow noise, panned L->R. */
function pulseTravel(seed, dur = 0.7, dir = 1) {
  const rng = mulberry32(seed);
  const bp = new Biquad();
  let ph = 0;
  return render(dur, (t) => {
    const u = t / dur;
    const f = lerp(620, 1900, Math.pow(u, 0.8));
    ph += (TAU * f) / SR;
    bp.set("bp", f * 2.1, 3.5);
    const bell = Math.pow(Math.sin(Math.PI * u), 1.3);
    const x = (Math.sin(ph) * 0.35 + bp.run(rng() * 2 - 1) * 2.4) * bell;
    return pan(x, lerp(-0.85, 0.85, u) * dir);
  });
}

/** Hard cut: broadband thud + click, very short. */
function hardCut(seed, dur = 0.35) {
  const rng = mulberry32(seed);
  const lp = new Biquad().set("lp", 7500, 0.8);
  let ph = 0;
  const b = render(dur, (t) => {
    ph += (TAU * (60 + 40 * Math.exp(-t / 0.03))) / SR;
    const n = lp.run(rng() * 2 - 1) * Math.exp(-t / 0.011);
    const s = Math.sin(ph) * Math.exp(-t / 0.09) * 0.8;
    const x = n + s;
    return [x, x];
  });
  softClip(b, 1.4);
  return b;
}

/** Card snap: glassy click with a tiny body resonance. */
function cardSnap(seed, f = 3100, dur = 0.28) {
  const rng = mulberry32(seed);
  const bp = new Biquad().set("bp", f, 6);
  const lp = new Biquad().set("lp", 900, 0.9);
  const b = render(dur, (t) => {
    const n = rng() * 2 - 1;
    const ringy = bp.run(n) * Math.exp(-t / 0.05) * 4;
    const body = lp.run(n) * Math.exp(-t / 0.02) * 1.2;
    const x = ringy + body;
    return [x, x * 0.92];
  });
  addReverb(b, 0.18, 1.0, 0.8, 0.4);
  return b;
}

/** End chord: A major bloom (A2 E3 A3 C#4 E4), slow attack, long tail, sparse shimmer. */
function endChord(seed, dur = 6.0) {
  const rng = mulberry32(seed);
  const notes = [110, 164.81, 220, 277.18, 329.63].map((f) => ({ f, phs: [0, 0, 0, 0], phsR: [0, 0, 0, 0] }));
  const lp = new Biquad().set("lp", 2400, 0.7), lpR = new Biquad().set("lp", 2400, 0.7);
  const b = render(dur, (t) => {
    const att = 1 - Math.exp(-t / 0.55);
    const dec = t > 1.2 ? Math.exp(-(t - 1.2) / 2.6) : 1;
    const env = att * dec;
    let l = 0, r = 0;
    notes.forEach((n, ni) => {
      const vib = 1 + 0.0022 * Math.sin(t * TAU * (5.1 + ni * 0.13));
      for (let h = 0; h < 4; h++) {
        const ha = 1 / Math.pow(h + 1, 1.8);
        n.phs[h] += (TAU * n.f * (h + 1) * vib) / SR;
        n.phsR[h] += (TAU * n.f * (h + 1) * vib * (1 + 0.0012)) / SR;
        l += Math.sin(n.phs[h]) * ha * 0.09;
        r += Math.sin(n.phsR[h]) * ha * 0.09;
      }
    });
    return [lp.run(l) * env, lpR.run(r) * env];
  });
  // sparse glitter
  for (let g = 0; g < 160; g++) {
    const start = Math.floor(lerp(0.2, 3.2, rng()) * SR);
    const f = 3000 * Math.pow(3, rng());
    const len = Math.floor(0.08 * SR);
    const [gl, gr] = pan(1, rng() * 2 - 1);
    let ph = 0;
    for (let k = 0; k < len; k++) {
      ph += (TAU * f) / SR;
      const s = Math.sin(ph) * Math.exp(-k / (len * 0.35)) * 0.02;
      b.add(start + k, s * gl, s * gr);
    }
  }
  addReverb(b, 0.55, 1.9, 0.91, 0.25);
  return b;
}

/**
 * Ambient bed (44 s): A1 sub drone with a slow breath, E2 fifth entering at
 * 8 s, a 110 Hz detuned pair from 16 s, band-passed pink "space wind" with a
 * slow sweep, and a 4-voice additive A-minor pad whose voices enter one by one.
 * Fades in over 1.5 s and out over the last 3 s.
 */
function bed(seed, dur = 44) {
  const rng = mulberry32(seed);
  const pink = new Pink(rng);
  const windBp = new Biquad();
  const padLp = new Biquad().set("lp", 1700, 0.7), padLpR = new Biquad().set("lp", 1700, 0.7);
  const sub = { ph: 0 }, fifth = { ph: 0 }, pairL = { ph: 0 }, pairR = { ph: 0 };
  const voices = [
    { f: 220.0, at: 4 },   // A3
    { f: 329.63, at: 12 }, // E4
    { f: 523.25, at: 20 }, // C5
    { f: 440.0, at: 28 },  // A4
  ].map((v) => ({ ...v, phs: [0, 0, 0], phsR: [0, 0, 0] }));

  // pad + wind rendered separately so only they get reverb
  const wet = new Buf(dur);
  const dry = new Buf(dur);
  for (let i = 0; i < dry.n; i++) {
    const t = i / SR;
    const gIn = smoothstep(0, 1.5, t);
    const gOut = 1 - smoothstep(dur - 3.2, dur - 0.1, t);
    const g = gIn * gOut;

    // sub layer
    sub.ph += (TAU * 55) / SR;
    fifth.ph += (TAU * 82.41) / SR;
    pairL.ph += (TAU * 110) / SR;
    pairR.ph += (TAU * 110.45) / SR;
    const breath = 0.86 + 0.14 * Math.sin(t * TAU * 0.07);
    const subS = Math.sin(sub.ph) * 0.24 * breath;
    const fifthS = Math.sin(fifth.ph) * 0.11 * smoothstep(8, 14, t);
    const pairG = 0.06 * smoothstep(16, 22, t);
    dry.L[i] = (subS + fifthS + Math.sin(pairL.ph) * pairG) * g;
    dry.R[i] = (subS + fifthS + Math.sin(pairR.ph) * pairG) * g;

    // wind
    const wf = 420 + 300 * Math.sin(t * TAU * 0.05 + 1.2);
    windBp.set("bp", wf, 0.75);
    const swell = 0.6 + 0.4 * Math.sin(t * TAU * 0.11 + 0.4);
    const wind = windBp.run(pink.next()) * 0.32 * swell;

    // pad
    let pl = 0, pr = 0;
    for (const v of voices) {
      const ve = smoothstep(v.at, v.at + 6, t);
      if (ve <= 0) continue;
      const vib = 1 + 0.0025 * Math.sin(t * TAU * 5.4);
      for (let h = 0; h < 3; h++) {
        const ha = 1 / Math.pow(h + 1, 1.7);
        v.phs[h] += (TAU * v.f * (h + 1) * vib) / SR;
        v.phsR[h] += (TAU * v.f * (h + 1) * vib * 1.0015) / SR;
        pl += Math.sin(v.phs[h]) * ha * 0.028 * ve;
        pr += Math.sin(v.phsR[h]) * ha * 0.028 * ve;
      }
    }
    wet.L[i] = (padLp.run(pl) + wind) * g;
    wet.R[i] = (padLpR.run(pr) + wind * 0.92) * g;
  }
  addReverb(wet, 0.5, 1.9, 0.9, 0.3);
  const b = new Buf(dur);
  for (let i = 0; i < b.n; i++) { b.L[i] = dry.L[i] + wet.L[i]; b.R[i] = dry.R[i] + wet.R[i]; }
  return b;
}

// ------------------------------------------------------------------ build
console.log(`Writing SFX to ${OUT}`);
const emit = (name, b, peak = 0.9) => { normalize(b, peak); writeWav(name, b); };

emit("bed.wav", bed(1), 0.6);
emit("riser-long.wav", riser(11, 3.0));
emit("riser-short.wav", riser(12, 1.3));
emit("riser-tail.wav", riser(13, 2.0));
emit("impact-sub.wav", impactSub(21));
emit("impact-sub-2.wav", impactSub(22, 2.4));
emit("impact-glass.wav", impactGlass(31));
emit("impact-glass-2.wav", impactGlass(32, 2.2));
emit("whoosh-1.wav", whoosh(41, 1.0, 1));
emit("whoosh-2.wav", whoosh(42, 0.85, -1, 320, 6200));
emit("whoosh-3.wav", whoosh(43, 1.3, 1, 180, 4200));
emit("shimmer.wav", shimmer(51, 3.2));
emit("shimmer-long.wav", shimmer(52, 4.6, 1500));
emit("shimmer-short.wav", shimmer(53, 1.6, 500, 3200, 10500));
emit("ring-boom.wav", ringBoom(61));
emit("reverse-swell.wav", reverseSwell(71));
emit("reverse-swell-2.wav", reverseSwell(72, 1.0));
emit("tick.wav", tick(81), 0.7);
emit("tick-low.wav", tick(82, 1500), 0.7);
emit("key-1.wav", typeKey(91, 980), 0.6);
emit("key-2.wav", typeKey(92, 1040), 0.6);
emit("key-3.wav", typeKey(93, 1120), 0.6);
emit("blip.wav", blip(101), 0.6);
emit("blip-2.wav", blip(102, 2100, 2800), 0.6);
emit("pulse-travel.wav", pulseTravel(111, 0.7, 1), 0.75);
emit("pulse-travel-2.wav", pulseTravel(112, 0.55, -1), 0.75);
emit("hard-cut.wav", hardCut(121));
emit("card-snap.wav", cardSnap(131), 0.7);
emit("card-snap-2.wav", cardSnap(132, 2600), 0.7);
emit("end-chord.wav", endChord(141));
console.log("done.");
