/**
 * Proof sheet for the preloader choreography: the two halves of the mark
 * shearing apart along the hexagonal grid axis, and the seam (the S-shaped
 * channel between them) lighting up as they close.
 * → node design/logo-mark/preloader-states.mjs
 */
import sharp from "sharp";

const U =
  "M 81.19 0 L 162.38 46.88 L 127.3 67.13 L 81.19 40.51 L 39.64 64.49 L 39.64 90.03 L 80.11 113.4 L 40.6 136.21 L 0 112.78 L 0 46.88 Z";
const L =
  "M 81.19 200 L 0 153.13 L 35.08 132.87 L 81.19 159.49 L 122.73 135.51 L 122.73 109.97 L 82.27 86.6 L 121.78 63.79 L 162.38 87.22 L 162.38 153.13 Z";
const S =
  "M 162.38 46.88 L 127.3 67.13 L 81.19 40.51 L 39.64 64.49 L 39.64 90.03 L 80.11 113.4 L 40.6 136.21 L 0 112.78 L 0 153.13 L 35.08 132.87 L 81.19 159.49 L 122.73 135.51 L 122.73 109.97 L 82.27 86.6 L 121.78 63.79 L 162.38 87.22 Z";

const cell = (gap, seamA) => {
  const dx = (0.8660254 * gap).toFixed(2);
  const dy = (0.5 * gap).toFixed(2);
  return `
  <g filter="url(#gl)"><path d="${S}" fill="#3BE1FF" opacity="${seamA}"/></g>
  <g transform="translate(${-dx} ${-dy})"><path d="${U}" fill="#F4F6FA"/></g>
  <g transform="translate(${dx} ${dy})"><path d="${L}" fill="#2A7FFF"/></g>`;
};

const one = (gap, a) => `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="310" viewBox="-84 -50 330.38 300">
 <defs><filter id="gl" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="#3BE1FF" flood-opacity="0.85"/></filter></defs>
 <rect x="-84" y="-50" width="330.38" height="300" fill="#0B1422"/>${cell(gap, a)}</svg>`;

const states = [
  [62, 0],
  [16, 0.75],
  [0, 1],
];
const imgs = await Promise.all(
  states.map(([g, a]) => sharp(Buffer.from(one(g, a))).png().toBuffer()),
);
await sharp({ create: { width: 1020, height: 310, channels: 3, background: "#0B1422" } })
  .composite(imgs.map((b, i) => ({ input: b, left: i * 340, top: 0 })))
  .png()
  .toFile("design/logo-mark/_preloader_states.png");
console.log("wrote design/logo-mark/_preloader_states.png");
