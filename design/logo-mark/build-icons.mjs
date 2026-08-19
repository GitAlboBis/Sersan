/**
 * Rebuild the raster brand icons from the mark geometry.
 *   → node design/logo-mark/build-icons.mjs
 *
 * Writes:
 *   src/app/favicon.ico   — 16/32/48 px, PNG-in-ICO. A navy tile carrying the
 *                           ink+blue mark, because an .ico cannot adapt to the
 *                           browser chrome the way public/favicon.svg does:
 *                           the tile keeps the mark legible on a dark strip AND
 *                           a light one. Modern browsers take the SVG instead
 *                           (declared first in layout.tsx's metadata.icons).
 *   public/og-image.png   — 1200×630 share card.
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const UPPER =
  "M 81.19 0 L 162.38 46.88 L 127.3 67.13 L 81.19 40.51 L 39.64 64.49 L 39.64 90.03 L 80.11 113.4 L 40.6 136.21 L 0 112.78 L 0 46.88 Z";
const LOWER =
  "M 81.19 200 L 0 153.13 L 35.08 132.87 L 81.19 159.49 L 122.73 135.51 L 122.73 109.97 L 82.27 86.6 L 121.78 63.79 L 162.38 87.22 L 162.38 153.13 Z";
const NAVY = "#0B1422";
const INK = "#F4F6FA";
const BLUE = "#2A7FFF";

/** The mark, scaled to `h` px tall, positioned at (x, y). */
const markGroup = (x, y, h, upper = INK, lower = BLUE) => {
  const s = h / 200;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="${UPPER}" fill="${upper}"/>
    <path d="${LOWER}" fill="${lower}"/>
  </g>`;
};

// ---- favicon.ico ----------------------------------------------------------
const iconSvg = (px) => {
  const markH = px * 0.68;
  const markW = markH * (162.38 / 200);
  const r = Math.round(px * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
  <rect width="${px}" height="${px}" rx="${r}" fill="${NAVY}"/>
  ${markGroup((px - markW) / 2, (px - markH) / 2, markH)}
</svg>`;
};

const SIZES = [16, 32, 48];
const pngs = await Promise.all(
  SIZES.map((px) => sharp(Buffer.from(iconSvg(px))).png().toBuffer()),
);

// ICO container: 6-byte header + 16-byte directory entry per image + payloads.
// Each payload is a whole PNG (supported since Vista and by every browser we
// target), so no BMP/AND-mask encoding is needed.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type 1 = icon
header.writeUInt16LE(SIZES.length, 4);
let offset = 6 + 16 * SIZES.length;
const dir = [];
for (let i = 0; i < SIZES.length; i++) {
  const e = Buffer.alloc(16);
  e.writeUInt8(SIZES[i] >= 256 ? 0 : SIZES[i], 0); // width (0 ⇒ 256)
  e.writeUInt8(SIZES[i] >= 256 ? 0 : SIZES[i], 1); // height
  e.writeUInt8(0, 2); // palette
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  dir.push(e);
}
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...dir, ...pngs]));
console.log("wrote src/app/favicon.ico", SIZES.join("/"), "px");

// ---- og-image.png ---------------------------------------------------------
// The share card: the mark on the brand navy, the tagline, the wordmark. Kept
// deliberately quiet — it is read at thumbnail size in a feed.
const OG_W = 1200;
const OG_H = 630;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B1422"/>
      <stop offset="0.62" stop-color="#101d33"/>
      <stop offset="1" stop-color="#0a1a30"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3BE1FF"/>
      <stop offset="1" stop-color="#2A7FFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="26" flood-color="#2A7FFF" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#bg)"/>
  <rect x="80" y="118" width="420" height="2" fill="url(#rule)"/>

  <g filter="url(#glow)">${markGroup(842, 168, 296)}</g>

  <text x="80" y="104" fill="#3BE1FF" font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="21" letter-spacing="5">AI-POWERED SOFTWARE ENGINEERING · LONDON</text>

  <text x="80" y="286" fill="#F4F6FA" font-family="Georgia, 'Times New Roman', serif" font-size="76" letter-spacing="-1.5">We build AI-powered</text>
  <text x="80" y="368" fill="#F4F6FA" font-family="Georgia, 'Times New Roman', serif" font-size="76" letter-spacing="-1.5">software.</text>
  <text x="80" y="450" fill="#7E8CA3" font-family="Georgia, 'Times New Roman', serif" font-size="76" letter-spacing="-1.5" font-style="italic">It has to run at 3am.</text>

  <text x="80" y="556" fill="#F4F6FA" font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="30" letter-spacing="14">SERSAN</text>
  <text x="80" y="590" fill="#5C6A80" font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="17" letter-spacing="3.4">THE INTELLIGENCE IS ARTIFICIAL. THE JUDGEMENT STAYS HUMAN.</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile("public/og-image.png");
console.log("wrote public/og-image.png", OG_W + "x" + OG_H);
