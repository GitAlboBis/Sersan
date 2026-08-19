/**
 * Renders the preloader choreography frame by frame, from the SAME constants
 * and the SAME easing shapes as src/components/fx/preloader.tsx, so the motion
 * can be judged without a browser.
 *   → node design/logo-mark/preloader-filmstrip.mjs
 *
 * Row A — THE BREATH: one part→join→part cycle at 30% progress. The seam lights
 *         only as the faces meet.
 * Row B — THE LOCK at 100%: draw back, slam flush, seam flares white-hot and
 *         settles lit.
 */
import sharp from "sharp";

const UPPER =
  "M 81.19 0 L 162.38 46.88 L 127.3 67.13 L 81.19 40.51 L 39.64 64.49 L 39.64 90.03 L 80.11 113.4 L 40.6 136.21 L 0 112.78 L 0 46.88 Z";
const LOWER =
  "M 81.19 200 L 0 153.13 L 35.08 132.87 L 81.19 159.49 L 122.73 135.51 L 122.73 109.97 L 82.27 86.6 L 121.78 63.79 L 162.38 87.22 L 162.38 153.13 Z";
const SEAM =
  "M 162.38 46.88 L 127.3 67.13 L 81.19 40.51 L 39.64 64.49 L 39.64 90.03 L 80.11 113.4 L 40.6 136.21 L 0 112.78 L 0 153.13 L 35.08 132.87 L 81.19 159.49 L 122.73 135.51 L 122.73 109.97 L 82.27 86.6 L 121.78 63.79 L 162.38 87.22 Z";

// --- mirrored from preloader.tsx ------------------------------------------
const AX = { x: Math.sqrt(3) / 2, y: 0.5 };
const SPLIT_MAX = 78;
const SPLIT_CYCLE = 2.6;
const SPLIT_FLOOR = 0.34;
const SEAM_RANGE = 22;
const SEAM_PEAK = 0.8;
const LOCK_PULL = 34;
const PAD_X = 110;
const PAD_Y = 66;
const VB = [-PAD_X, -PAD_Y, 162.38 + PAD_X * 2, 200 + PAD_Y * 2];

const seamAlpha = (gap, boost) => {
  const close = Math.max(0, 1 - gap / SEAM_RANGE);
  return Math.min(1, close * close * SEAM_PEAK + boost);
};

const CW = 300;
const CH = Math.round((CW * VB[3]) / VB[2]);

const frame = ({ gap, boost = 0, fill = 1, ghost = 1, seamFill = "#3BE1FF", label }) => {
  const dx = (AX.x * gap).toFixed(2);
  const dy = (AX.y * gap).toFixed(2);
  const a = seamAlpha(gap, boost).toFixed(3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH + 26}" viewBox="0 0 ${CW} ${CH + 26}">
  <rect width="${CW}" height="${CH + 26}" fill="#0B1422"/>
  <svg x="0" y="0" width="${CW}" height="${CH}" viewBox="${VB.join(" ")}">
    <defs>
      <linearGradient id="lit" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#3BE1FF"/><stop offset="100%" stop-color="#2A7FFF"/>
      </linearGradient>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#3BE1FF" flood-opacity="0.55"/>
      </filter>
      <filter id="sglow" x="-45%" y="-45%" width="190%" height="190%">
        <feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="#3BE1FF" flood-opacity="0.9"/>
      </filter>
      <clipPath id="rev"><rect x="${VB[0]}" y="${VB[1]}" width="${(VB[2] * fill).toFixed(2)}" height="${VB[3]}"/></clipPath>
    </defs>
    <path d="${SEAM}" fill="${seamFill}" filter="url(#sglow)" opacity="${a}"/>
    <g opacity="${ghost}">
      <g transform="translate(${-dx} ${-dy})"><path d="${UPPER}" fill="#F4F6FA" fill-opacity="0.14"/></g>
      <g transform="translate(${dx} ${dy})"><path d="${LOWER}" fill="#F4F6FA" fill-opacity="0.14"/></g>
    </g>
    <g clip-path="url(#rev)" filter="url(#glow)">
      <g transform="translate(${-dx} ${-dy})"><path d="${UPPER}" fill="url(#lit)"/></g>
      <g transform="translate(${dx} ${dy})"><path d="${LOWER}" fill="url(#lit)"/></g>
    </g>
  </svg>
  <text x="${CW / 2}" y="${CH + 17}" fill="#5C6A80" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.6" text-anchor="middle">${label}</text>
</svg>`;
};

// --- Row A: the breath at 30% ---------------------------------------------
const rowA = [];
for (let i = 0; i < 6; i++) {
  const t = (i / 6) * SPLIT_CYCLE;
  const breath = 0.5 + 0.5 * Math.cos((t / SPLIT_CYCLE) * Math.PI * 2);
  const gap = SPLIT_MAX * (SPLIT_FLOOR + (1 - SPLIT_FLOOR) * (1 - 0.3)) * breath;
  rowA.push(frame({ gap, fill: 0.3, label: `BREATH  t+${t.toFixed(2)}s  gap ${gap.toFixed(0)}` }));
}

// --- Row B: the lock ------------------------------------------------------
const p2out = (t) => 1 - Math.pow(1 - t, 2);
const p4out = (t) => 1 - Math.pow(1 - t, 4);
const p2in = (t) => t * t;
const at = (t, start, dur, ease) =>
  t <= start ? 0 : t >= start + dur ? 1 : ease((t - start) / dur);

const G0 = 40; // wherever the breath left the halves when 100% landed
const rowB = [];
for (const t of [0, 0.18, 0.42, 0.62, 0.74, 1.05]) {
  const pull = G0 + (LOCK_PULL - G0) * at(t, 0, 0.18, p2out);
  const gap = pull + (0 - pull) * at(t, 0.18, 0.46, p4out);
  const boost = at(t, 0.5, 0.16, p2in) * (1 - at(t, 0.66, 0.55, p2out));
  const hot = at(t, 0.5, 0.16, p2in) * (1 - at(t, 0.66, 0.5, p2out));
  const mix = (a, b, k) =>
    "#" +
    [0, 1, 2]
      .map((i) => {
        const av = parseInt(a.slice(1 + i * 2, 3 + i * 2), 16);
        const bv = parseInt(b.slice(1 + i * 2, 3 + i * 2), 16);
        return Math.round(av + (bv - av) * k).toString(16).padStart(2, "0");
      })
      .join("");
  rowB.push(
    frame({
      gap,
      boost,
      fill: 1,
      ghost: 1 - at(t, 0.3, 0.32, p2out),
      seamFill: mix("#3BE1FF", "#EAF9FF", hot),
      label: `LOCK  t+${t.toFixed(2)}s  gap ${gap.toFixed(0)}`,
    }),
  );
}

const bufs = await Promise.all(
  [...rowA, ...rowB].map((s) => sharp(Buffer.from(s)).png().toBuffer()),
);
const W = CW * 6;
const H = (CH + 26) * 2;
await sharp({ create: { width: W, height: H, channels: 3, background: "#0B1422" } })
  .composite(
    bufs.map((b, i) => ({
      input: b,
      left: (i % 6) * CW,
      top: Math.floor(i / 6) * (CH + 26),
    })),
  )
  .png()
  .toFile("design/logo-mark/_preloader_filmstrip.png");
console.log("wrote design/logo-mark/_preloader_filmstrip.png", W + "x" + H);
