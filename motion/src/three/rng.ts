/** Deterministic RNG (mulberry32) so every particle layout is identical frame to frame and render to render. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box–Muller. */
export const gauss = (r: () => number) => {
  const u = 1 - r();
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Uniform point on the unit sphere. */
export const onSphere = (r: () => number): [number, number, number] => {
  const z = 2 * r() - 1;
  const th = 2 * Math.PI * r();
  const s = Math.sqrt(1 - z * z);
  return [s * Math.cos(th), s * Math.sin(th), z];
};