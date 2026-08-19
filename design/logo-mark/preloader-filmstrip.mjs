/**
 * Renders the preloader choreography frame by frame, from the SAME constants,
 * the SAME easings and the SAME spark physics as src/components/fx/preloader.tsx,
 * so the motion can be judged without a browser.
 *   → node design/logo-mark/preloader-filmstrip.mjs
 *
 * Row A — ASSEMBLY: the halves arrive apart and close, gaining speed into the
 *         strike; the seam ignites in the joint on contact.
 * Row B — THE WHEEL: once joined the mark spins clockwise and winds up with the
 *         counter, throwing sparks tangentially off both rim apexes, with the
 *         travelling shine running its outline. Last frame is the exit burst.
 *
 * The canvas trail (destination-out 0.22 per frame) is emulated by drawing each
 * spark's last TRAIL segments at 0.78^i alpha — the same decay.
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
const JOIN_S = 1.55;
const JOIN_FLASH_S = 0.65;
const SPIN_MIN = 0.24;
const SPIN_MAX = 3.4;
const SPIN_CURVE = 1.6;
const SEAM_RANGE = 22;
const SEAM_PEAK = 0.8;
const SHINE_FRACTION = 0.13;
const SHINE_BASE = 0.28;
const SHINE_PER_TURN = 0.34;
const SPARK_MAX = 300;
const SPARK_PER_TURN = 150;
const SPARK_LIFE = 0.66;
const SPARK_DRAG = 1.9;
const SPARK_SPEED = 0.62;

// The panel is drawn in viewBox units; the canvas layer maps 1:1 onto them.
const RIM = MARK_CY; // the apex distance from the pivot
const CENTER = { x: MARK_CX, y: MARK_CY };
const TRAIL = 10;

// --- spark simulation (same equations, same order of operations) -----------
function makeSim() {
  return { sparks: [], emitAcc: 0, arm: 0, torch: [] };
}
function emit(sim, a, turns, spread) {
  if (sim.sparks.length >= SPARK_MAX) return;
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const rim = turns * Math.PI * 2 * RIM;
  const sp = rim * SPARK_SPEED * (0.75 + Math.random() * 0.5);
  const out = sp * (0.16 + Math.random() * 0.22);
  sim.sparks.push({
    x: CENTER.x + ux * RIM,
    y: CENTER.y + uy * RIM,
    vx: -uy * sp + ux * out + (Math.random() - 0.5) * spread,
    vy: ux * sp + uy * out + (Math.random() - 0.5) * spread,
    age: 0,
    life: SPARK_LIFE * (0.6 + Math.random() * 0.7),
    tone: Math.random(),
    hist: [],
  });
}
function step(sim, dt, turns, a) {
  sim.emitAcc += turns * SPARK_PER_TURN * dt;
  while (sim.emitAcc >= 1) {
    sim.emitAcc -= 1;
    sim.arm ^= 1;
    emit(sim, a + (sim.arm ? Math.PI : 0), turns, RIM * 0.5);
  }
  sim.torch.unshift({ a, turns });
  if (sim.torch.length > TRAIL) sim.torch.pop();
  for (let i = sim.sparks.length - 1; i >= 0; i--) {
    const s = sim.sparks[i];
    s.age += dt;
    if (s.age >= s.life) {
      sim.sparks.splice(i, 1);
      continue;
    }
    const px = s.x;
    const py = s.y;
    const drag = Math.max(0, 1 - SPARK_DRAG * dt);
    s.vx *= drag;
    s.vy *= drag;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.hist.unshift([px, py, s.x, s.y, 1 - s.age / s.life]);
    if (s.hist.length > TRAIL) s.hist.pop();
  }
}
const TONE = (t) => (t > 0.82 ? "#F0FCFF" : t > 0.4 ? "#3BE1FF" : "#2A7FFF");

function sparkSvg(sim) {
  let out = "";
  for (const s of sim.sparks) {
    const col = TONE(s.tone);
    s.hist.forEach(([x0, y0, x1, y1, k], i) => {
      const a = k * k * Math.pow(0.78, i);
      if (a < 0.02) return;
      out += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${col}" stroke-opacity="${a.toFixed(3)}" stroke-width="${(0.6 + 1.8 * k).toFixed(2)}" stroke-linecap="round"/>`;
    });
  }
  sim.torch.forEach(({ a, turns }, i) => {
    if (turns <= 0.02) return;
    const alpha = Math.min(0.5, turns * 0.15) * Math.pow(0.78, i);
    if (alpha < 0.02) return;
    for (const off of [0, Math.PI]) {
      const end = a + off - Math.PI / 2;
      const x0 = CENTER.x + Math.cos(end - 0.42) * RIM;
      const y0 = CENTER.y + Math.sin(end - 0.42) * RIM;
      const x1 = CENTER.x + Math.cos(end) * RIM;
      const y1 = CENTER.y + Math.sin(end) * RIM;
      out += `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${RIM} ${RIM} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="#96ECFF" stroke-opacity="${alpha.toFixed(3)}" stroke-width="${(RIM * 0.035).toFixed(2)}" stroke-linecap="round"/>`;
    }
  });
  return out;
}

const CW = 300;
const CH = Math.round((CW * VB[3]) / VB[2]);
const PERIM = 559.9; // measured in-page via getTotalLength()

const panel = ({ gap, boost, spin, shine, shineAlpha, fill, ghost, sim, label }) => {
  const dx = (AX.x * gap).toFixed(2);
  const dy = (AX.y * gap).toFixed(2);
  const close = Math.max(0, 1 - gap / SEAM_RANGE);
  const seamA = Math.min(1, close * close * SEAM_PEAK + boost).toFixed(3);
  const rot = `rotate(${spin.toFixed(2)} ${MARK_CX} ${MARK_CY})`;
  const dash = `${(PERIM * SHINE_FRACTION).toFixed(1)} ${(PERIM * (1 - SHINE_FRACTION)).toFixed(1)}`;
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
      <filter id="shglow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="4.5" flood-color="#9FEFFF" flood-opacity="0.95"/>
      </filter>
      <clipPath id="rev"><rect x="${VB[0]}" y="${VB[1]}" width="${(VB[2] * fill).toFixed(2)}" height="${VB[3]}"/></clipPath>
    </defs>
    ${sim ? sparkSvg(sim) : ""}
    <g transform="${rot}">
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

// ---- Row A: the assembly --------------------------------------------------
const rowA = [];
for (const t of [0, 0.8, 1.38, 1.62]) {
  const k = Math.min(1, t / JOIN_S);
  const gap = GAP_START * (1 - Math.pow(k, 2.2));
  const since = Math.max(0, t - JOIN_S);
  const boost = k >= 1 ? Math.max(0, 1 - since / JOIN_FLASH_S) : 0;
  rowA.push(
    panel({
      gap: k >= 1 ? 0 : gap,
      boost,
      spin: 0,
      shine: 0,
      shineAlpha: k >= 1 ? Math.min(1, since / 0.5) : 0,
      fill: Math.min(0.42, 0.1 + t * 0.2),
      ghost: 1,
      sim: null,
      label: `ASSEMBLY  t+${t.toFixed(2)}s  gap ${(k >= 1 ? 0 : gap).toFixed(0)}`,
    }),
  );
}

// ---- Row B: the wheel -----------------------------------------------------
const rowB = [];
const DT = 1 / 60;
for (const pct of [0.25, 0.6, 1.0]) {
  const turns = SPIN_MIN + (SPIN_MAX - SPIN_MIN) * Math.pow(pct, SPIN_CURVE);
  const sim = makeSim();
  let spin = 0;
  let shine = 0;
  for (let i = 0; i < Math.round(1.6 / DT); i++) {
    spin = (spin + turns * 360 * DT) % 360;
    shine = (shine + (SHINE_BASE + SHINE_PER_TURN * turns) * DT) % 1;
    step(sim, DT, turns, (spin * Math.PI) / 180);
  }
  rowB.push(
    panel({
      gap: 0, boost: 0, spin, shine, shineAlpha: 1, fill: 1, ghost: 0, sim,
      label: `WHEEL  ${Math.round(pct * 100)}%  ${turns.toFixed(2)} turns/s`,
    }),
  );
}
// the exit: the wheel winds up and the rim throws a full ring
{
  const turns = SPIN_MAX * 1.9;
  const sim = makeSim();
  let spin = 0;
  let shine = 0;
  for (let i = 0; i < Math.round(0.5 / DT); i++) {
    spin = (spin + turns * 360 * DT) % 360;
    shine = (shine + (SHINE_BASE + SHINE_PER_TURN * turns) * DT) % 1;
    step(sim, DT, turns, (spin * Math.PI) / 180);
  }
  for (let i = 0; i < 96; i++) emit(sim, (i / 96) * Math.PI * 2, Math.max(turns, 1.6), RIM * 1.5);
  for (let i = 0; i < 9; i++) {
    spin = (spin + turns * 360 * DT) % 360;
    step(sim, DT, turns, (spin * Math.PI) / 180);
  }
  rowB.push(
    panel({
      gap: 0, boost: 0.85, spin, shine, shineAlpha: 1, fill: 1, ghost: 0, sim,
      label: "EXIT  release burst",
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
