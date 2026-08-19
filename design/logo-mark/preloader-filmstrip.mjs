/**
 * Renders the preloader choreography frame by frame, from the SAME constants,
 * the SAME easings and the SAME particle equations as
 * src/components/fx/preloader.tsx, so the motion can be judged without a browser.
 *   → node design/logo-mark/preloader-filmstrip.mjs
 *
 * Row A — ASSEMBLY (owns the load): the halves converge as the counter climbs,
 *         lighting L→R on the same schedule, while the field gathers inward.
 *         They seat at JOIN_AT and the seam ignites in the joint.
 * Row B — THE WHEEL (owns the tail): short and steep, the field cast outward
 *         and swirled by the spin. Last frame is the exit release.
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
const MARK_W = 162.38;
const MARK_H = 200;
const PAD_X = 110;
const PAD_Y = 66;
const VB = [-PAD_X, -PAD_Y, MARK_W + PAD_X * 2, MARK_H + PAD_Y * 2];
const MARK_CX = MARK_W / 2;
const MARK_CY = MARK_H / 2;
const GAP_START = 118;
const JOIN_AT = 0.82;
const JOIN_FLASH_S = 0.65;
const SPIN_MIN = 0.3;
const SPIN_MAX = 3.6;
const SPIN_CURVE = 1.5;
const SEAM_RANGE = 22;
const SEAM_PEAK = 0.8;
const SHINE_FRACTION = 0.13;
const SHINE_BASE = 0.28;
const SHINE_PER_TURN = 0.34;
const PARTICLE_MAX = 280;
const GATHER_RATE = 46;
const CAST_PER_TURN = 135;
const GATHER_LIFE = 2.2;
const CAST_LIFE = 1.15;
const CAST_SWIRL = 0.42;

// The panel draws the canvas layer in viewBox units: the field is 2.4× the
// SVG box, and the SVG box IS the viewBox, so the field spans 2.4 × VB height.
const RIM = MARK_CY;
const FIELD = VB[3] * 2.4;
const C = { x: MARK_CX, y: MARK_CY };
const PERIM = 559.9; // measured in-page via getTotalLength()

// --- particle system (same equations, same order) --------------------------
const sim = () => ({ parts: [], gatherAcc: 0, castAcc: 0 });
const push = (S, q) => {
  if (S.parts.length < PARTICLE_MAX) S.parts.push(q);
};
function spawnGather(S) {
  const a = Math.random() * Math.PI * 2;
  const r = (FIELD / 2) * (0.78 + Math.random() * 0.22);
  const sp = (FIELD / 2) * (0.22 + Math.random() * 0.26);
  push(S, {
    x: C.x + Math.cos(a) * r,
    y: C.y + Math.sin(a) * r,
    vx: -Math.cos(a) * sp - Math.sin(a) * sp * 0.3,
    vy: -Math.sin(a) * sp + Math.cos(a) * sp * 0.3,
    age: 0,
    life: GATHER_LIFE * (0.7 + Math.random() * 0.5),
    size: RIM * (0.032 + Math.random() * 0.05),
    tone: Math.floor(Math.random() * 3),
    gather: true,
  });
}
function spawnCast(S, turns, spread) {
  const a = Math.random() * Math.PI * 2;
  const rim = turns * Math.PI * 2 * RIM;
  const out = RIM * (0.5 + Math.random() * 0.8);
  const swirl = rim * CAST_SWIRL * (0.7 + Math.random() * 0.6);
  push(S, {
    x: C.x + Math.cos(a) * RIM * (0.9 + Math.random() * 0.16),
    y: C.y + Math.sin(a) * RIM * (0.9 + Math.random() * 0.16),
    vx: Math.cos(a) * out - Math.sin(a) * swirl + (Math.random() - 0.5) * spread,
    vy: Math.sin(a) * out + Math.cos(a) * swirl + (Math.random() - 0.5) * spread,
    age: 0,
    life: CAST_LIFE * (0.7 + Math.random() * 0.6),
    size: RIM * (0.028 + Math.random() * 0.055),
    tone: Math.floor(Math.random() * 3),
    gather: false,
  });
}
function step(S, dt, turns, gatherK) {
  if (gatherK > 0) {
    S.gatherAcc += GATHER_RATE * gatherK * dt;
    while (S.gatherAcc >= 1) {
      S.gatherAcc -= 1;
      spawnGather(S);
    }
  }
  if (turns > 0) {
    S.castAcc += turns * CAST_PER_TURN * dt;
    while (S.castAcc >= 1) {
      S.castAcc -= 1;
      spawnCast(S, turns, RIM * 0.35);
    }
  }
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const q = S.parts[i];
    q.age += dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    if (!q.gather) {
      const drag = Math.max(0, 1 - 0.9 * dt);
      q.vx *= drag;
      q.vy *= drag;
    }
    const dx = q.x - C.x;
    const dy = q.y - C.y;
    const absorbed = q.gather && dx * dx + dy * dy < RIM * RIM * 0.55;
    if (q.age >= q.life || absorbed) S.parts.splice(i, 1);
  }
}
function fieldSvg(S) {
  let out = "";
  for (const q of S.parts) {
    const k = q.age / q.life;
    const dx = q.x - C.x;
    const dy = q.y - C.y;
    let alpha = Math.min(1, k / 0.12) * (1 - Math.max(0, (k - 0.5) / 0.5));
    if (q.gather) {
      const near = 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy) / (FIELD / 2));
      alpha *= 0.35 + 0.65 * near;
    }
    if (alpha <= 0.01) continue;
    const r = q.size * (q.gather ? 0.8 + 0.5 * (1 - k) : 0.6 + 0.8 * (1 - k));
    out += `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${r.toFixed(2)}" fill="url(#dot${q.tone})" opacity="${alpha.toFixed(3)}"/>`;
  }
  return out;
}

const CW = 300;
const CH = Math.round((CW * VB[3]) / VB[2]);

const panel = ({ gap, boost, spin, shine, shineAlpha, fill, ghost, S, label }) => {
  const dx = (AX.x * gap).toFixed(2);
  const dy = (AX.y * gap).toFixed(2);
  const close = Math.max(0, 1 - gap / SEAM_RANGE);
  const seamA = Math.min(1, close * close * SEAM_PEAK + boost).toFixed(3);
  const dash = `${(PERIM * SHINE_FRACTION).toFixed(1)} ${(PERIM * (1 - SHINE_FRACTION)).toFixed(1)}`;
  const dot = (i, rgb) =>
    `<radialGradient id="dot${i}"><stop offset="0" stop-color="rgb(${rgb})" stop-opacity="1"/><stop offset="0.35" stop-color="rgb(${rgb})" stop-opacity="0.42"/><stop offset="1" stop-color="rgb(${rgb})" stop-opacity="0"/></radialGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH + 26}" viewBox="0 0 ${CW} ${CH + 26}">
  <rect width="${CW}" height="${CH + 26}" fill="#0B1422"/>
  <svg x="0" y="0" width="${CW}" height="${CH}" viewBox="${VB.join(" ")}">
    <defs>
      ${dot(0, "59,225,255")}${dot(1, "42,127,255")}${dot(2, "232,249,255")}
      <linearGradient id="lit" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#3BE1FF"/><stop offset="100%" stop-color="#2A7FFF"/>
      </linearGradient>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#3BE1FF" flood-opacity="0.55"/>
      </filter>
      <filter id="sglow" x="-45%" y="-45%" width="190%" height="190%">
        <feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="#3BE1FF" flood-opacity="0.9"/>
      </filter>
      <filter id="shglow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="4.5" flood-color="#9FEFFF" flood-opacity="0.95"/>
      </filter>
      <clipPath id="rev"><rect x="${VB[0]}" y="${VB[1]}" width="${(VB[2] * fill).toFixed(2)}" height="${VB[3]}"/></clipPath>
    </defs>
    ${S ? fieldSvg(S) : ""}
    <g transform="rotate(${spin.toFixed(2)} ${MARK_CX} ${MARK_CY})">
      <path d="${SEAM}" fill="#3BE1FF" filter="url(#sglow)" opacity="${seamA}"/>
      <g opacity="${ghost}">
        <g transform="translate(${-dx} ${-dy})"><path d="${UPPER}" fill="#F4F6FA" fill-opacity="0.14"/></g>
        <g transform="translate(${dx} ${dy})"><path d="${LOWER}" fill="#F4F6FA" fill-opacity="0.14"/></g>
      </g>
      <g clip-path="url(#rev)" filter="url(#glow)">
        <g transform="translate(${-dx} ${-dy})"><path d="${UPPER}" fill="url(#lit)"/></g>
        <g transform="translate(${dx} ${dy})"><path d="${LOWER}" fill="url(#lit)"/></g>
      </g>
      <g opacity="${shineAlpha}" filter="url(#shglow)">
        <path d="${UPPER}" fill="none" stroke="#EAF9FF" stroke-width="3.2" stroke-linecap="round"
              stroke-dasharray="${dash}" stroke-dashoffset="${(-shine * PERIM).toFixed(1)}" transform="translate(${-dx} ${-dy})"/>
        <path d="${LOWER}" fill="none" stroke="#EAF9FF" stroke-width="3.2" stroke-linecap="round"
              stroke-dasharray="${dash}" stroke-dashoffset="${(-(shine + 0.5) * PERIM).toFixed(1)}" transform="translate(${dx} ${dy})"/>
      </g>
    </g>
  </svg>
  <text x="${CW / 2}" y="${CH + 17}" fill="#5C6A80" font-family="ui-monospace, monospace" font-size="10.5" letter-spacing="1.4" text-anchor="middle">${label}</text>
</svg>`;
};

const DT = 1 / 60;

// ---- Row A: the assembly (progress-driven) --------------------------------
const rowA = [];
{
  const S = sim();
  const shots = [0.18, 0.48, 0.78, 1.0];
  let shot = 0;
  // walk k from 0 to 1 over ~4.2s, sampling at the requested points
  const DUR = 4.2;
  for (let t = 0; t <= DUR + 0.5 && shot < shots.length; t += DT) {
    const k = Math.min(1, t / DUR);
    step(S, DT, 0, 0.35 + 0.65 * k);
    if (k >= shots[shot]) {
      const gap = GAP_START * (1 - Math.pow(k, 2.2));
      rowA.push(
        panel({
          gap: k >= 1 ? 0 : gap,
          boost: k >= 1 ? 1 : 0,
          spin: 0,
          shine: 0,
          shineAlpha: k >= 1 ? 0.4 : 0,
          fill: k,
          ghost: 1,
          S,
          label:
            k >= 1
              ? "JOIN  100% of act 1  the seam ignites"
              : `ASSEMBLY  ${Math.round(k * JOIN_AT * 100)}%  gap ${gap.toFixed(0)}`,
        }),
      );
      shot++;
    }
  }
}

// ---- Row B: the wheel (tail-driven) ---------------------------------------
const rowB = [];
for (const tail of [0.25, 0.65, 1.0]) {
  const turns = SPIN_MIN + (SPIN_MAX - SPIN_MIN) * Math.pow(tail, SPIN_CURVE);
  const S = sim();
  let spin = 0;
  let shine = 0;
  for (let i = 0; i < Math.round(1.4 / DT); i++) {
    spin = (spin + turns * 360 * DT) % 360;
    shine = (shine + (SHINE_BASE + SHINE_PER_TURN * turns) * DT) % 1;
    step(S, DT, turns, 0);
  }
  rowB.push(
    panel({
      gap: 0, boost: 0, spin, shine, shineAlpha: 1, fill: 1, ghost: 0, S,
      label: `WHEEL  ${Math.round((JOIN_AT + (1 - JOIN_AT) * tail) * 100)}%  ${turns.toFixed(2)} turns/s`,
    }),
  );
}
{
  const turns = SPIN_MAX * 1.9;
  const S = sim();
  let spin = 0;
  let shine = 0;
  for (let i = 0; i < Math.round(0.45 / DT); i++) {
    spin = (spin + turns * 360 * DT) % 360;
    shine = (shine + (SHINE_BASE + SHINE_PER_TURN * turns) * DT) % 1;
    step(S, DT, turns, 0);
  }
  for (let i = 0; i < 110; i++) spawnCast(S, Math.max(turns, 1.4), RIM * 1.2);
  for (let i = 0; i < 12; i++) {
    spin = (spin + turns * 360 * DT) % 360;
    step(S, DT, turns, 0);
  }
  rowB.push(
    panel({
      gap: 0, boost: 0.85, spin, shine, shineAlpha: 1, fill: 1, ghost: 0, S,
      label: "EXIT  release",
    }),
  );
}

const bufs = await Promise.all(
  [...rowA, ...rowB].map((x) => sharp(Buffer.from(x)).png().toBuffer()),
);
const W = CW * 4;
const H = (CH + 26) * 2;
await sharp({ create: { width: W, height: H, channels: 3, background: "#0B1422" } })
  .composite(
    bufs.map((b, i) => ({
      input: b,
      left: (i % 4) * CW,
      top: Math.floor(i / 4) * (CH + 26),
    })),
  )
  .png()
  .toFile("design/logo-mark/_preloader_filmstrip.png");
console.log("wrote design/logo-mark/_preloader_filmstrip.png", W + "x" + H);
