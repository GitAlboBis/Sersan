/**
 * SERSAN — parametric monoline wordmark generator.
 * ------------------------------------------------------------------
 * Draws the six caps S E R S A N as a STROKED SKELETON (fill:none) on a
 * shared advance grid, so an art director can tune the mark numerically
 * instead of redrawing it.
 *
 *   import { buildWordmark } from './wordmark.mjs'
 *   const { svg, width, height } = buildWordmark({ stroke: 6.5, tracking: 0.34 })
 *
 * Coordinate system used internally: baseline at y = capHeight, cap line at
 * y = 0, x growing left→right. The returned SVG carries a viewBox translated
 * so it sits tightly around the ink (centre-line bbox grown by stroke/2, plus
 * the mitre tip of a pointed A apex).
 *
 * Options (defaults match the reference lockup):
 *   capHeight   100      cap height in user units; everything scales off it
 *   stroke      7        stroke weight in the SAME units (7 = 7% of cap height)
 *   tracking    0.30     extra space between letter boxes, as a fraction of capHeight
 *   widthFactor 1.0      horizontal scale of every letter box (1.06 = a touch wider)
 *   terminal    'flat'   'flat' | 'angled' | 'chamfer'
 *   apex        'point'  'point' | 'flat'   (the A)
 *   bowlRatio   0.5      how far down the R bowl reaches (0.5 = top half)
 *   crossbar    0.32     A crossbar height, as a fraction of capHeight up from baseline,
 *                        or the string 'none' to delete the crossbar entirely (§v2)
 *   ink         '#0B1422'
 *   kern        null     5 optical corrections (× capHeight); null = built-in table, [] = off
 *
 * ---------------------------------------------------------------- v2 options
 * Added for the "light monoline, stylised" logotype direction. Every one of
 * them defaults to the pre-existing behaviour, so `buildWordmark()` with no
 * arguments still returns exactly the mark it always did.
 *
 *   crossbar 'none'      A drawn as two bare diagonals meeting at a sharp apex —
 *                        no crossbar at all. (Numbers keep working as before.)
 *
 *   rStyle   'closed'    how the R is stylised:
 *     'closed'         the normal R: bowl closes back onto the stem, leg springs
 *                      from that junction. (pre-existing behaviour)
 *     'open-bowl'      the bowl sweeps off the stem top, right, and down, then
 *                      STOPS `rGap`×capHeight short of rejoining the stem. The
 *                      leg descends from the bowl's lower terminal, so the only
 *                      gap is the clean horizontal one beside the stem.
 *     'cut-stem'       the bowl closes normally, but the STEM is interrupted:
 *                      it runs cap line → bowl junction, then restarts
 *                      `rStemGap`×capHeight lower and continues to the baseline.
 *     'detached-leg'   the bowl closes normally, but the leg is pushed
 *                      `rGap`×capHeight down its own axis, so it floats free of
 *                      the bowl/stem junction.
 *
 *   rGap      0.10      gap for 'open-bowl' (horizontal) and 'detached-leg'
 *                       (along the leg axis), as a fraction of capHeight.
 *   rStemGap  0.12      gap in the stem for 'cut-stem', × capHeight.
 *
 *   sTop     'round'    S construction:
 *     'round'          the pre-existing continuous double-bowl, terminals cut
 *                      horizontally (tangent vertical at each end).
 *     'flat'           squared geometric S: genuinely FLAT top and bottom bars
 *                      sitting on the cap line / baseline, generous corner
 *                      radii, a gently sloped spine, and terminals cut
 *                      VERTICALLY (tangent horizontal at each end).
 *
 *   cut       0         degrees of shear applied to every free terminal.
 *                       0 = perpendicular butt cuts (default). 25 = the
 *                       terminals lean, in one consistent rotational direction.
 *                       Implemented with the same even-odd clip as
 *                       terminal:'angled' — which still means 30°, so
 *                       `terminal:'angled'` keeps working untouched.
 *
 *   eMidArm   0.9       length of the E's middle arm as a fraction of the top
 *                       and bottom arms (which are always equal to each other).
 *                       0.65 is the stylised logotype value.
 *
 *   glyphs    'SERSAN'  which letters to lay out. Any string of S/E/R/A/N —
 *                       'R' renders the single letter, which is how the R-style
 *                       comparison sheet is drawn. The built-in optical kerning
 *                       table only applies to the full 'SERSAN' lockup.
 *
 *   uid       'sersan'  prefix for generated element ids (the terminal clip
 *                       path). Give each mark its own uid when inlining several
 *                       of them into one composite SVG.
 *
 * Terminal treatments:
 *   'flat'     butt caps, endpoints on the cap line / baseline. Straight
 *              horizontal and vertical strokes end perfectly square; a butt cap
 *              on a diagonal (the A feet, the R leg) is square TO ITS OWN
 *              stroke, so it straddles the baseline by ±(stroke/2)·sin(20°)
 *              ≈ 1% of cap height. This is the only variant with no clip path.
 *   'chamfer'  every free terminal pulled back 0.6 × stroke along its own path
 *              and re-cut square. Vertices (E stem corners, N diagonal joins,
 *              A apex) are joins, not terminals, so they keep full length.
 *   'angled'   every free terminal sheared 30° off square, in a consistent
 *              rotational direction, via an even-odd clip path.
 *
 * CLI:  node design/wordmark/wordmark.mjs --out <dir>     (writes the preset set)
 */

// ---------------------------------------------------------------- constants

/** letter box widths, as a fraction of cap height (before widthFactor) */
const BOX = { S: 0.62, E: 0.56, R: 0.62, A: 0.72, N: 0.68 };

const ORDER = 'SERSAN';

/**
 * Optical corrections on top of the mechanical advance grid, in fractions of
 * capHeight, one per gap (5 gaps for 6 letters). Tuned by equalising the
 * capped white area between neighbours — a round S against the E's flat stem
 * wants air, the R's leg and the A's diagonals want tightening.
 */
const KERN = [0.04, -0.01, -0.025, -0.01, 0.01]; // S|E  E|R  R|S  S|A  A|N

export const DEFAULTS = {
  capHeight: 100,
  stroke: 7,
  tracking: 0.3,
  widthFactor: 1.0,
  terminal: 'flat',
  apex: 'point',
  bowlRatio: 0.5,
  crossbar: 0.32,
  ink: '#0B1422',
  kern: null, // array of 5 optical corrections (× capHeight); null = built-in table, [] = off
  // ---- v2 (all default to the pre-existing drawing) ----
  rStyle: 'closed', // 'closed' | 'open-bowl' | 'cut-stem' | 'detached-leg'
  rGap: 0.1, // open-bowl / detached-leg gap, × capHeight
  rStemGap: 0.12, // cut-stem gap, × capHeight
  sTop: 'round', // 'round' | 'flat'
  cut: 0, // degrees of shear on free terminals (0 = square)
  eMidArm: 0.9, // E middle arm ÷ outer arms
  glyphs: ORDER, // which letters to set
  uid: 'sersan', // id prefix, so several marks can share one document
};

/** how much 'chamfer' pulls a free terminal back, in stroke widths */
const CHAMFER = 0.6;
/** cut angle for terminal:'angled', measured off square */
const ANGLE_DEG = 30;

// ------------------------------------------------------------------ vectors

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const addv = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
/** rotate +90°: in a y-down system this is the "left" normal */
const perp = (a) => [-a[1], a[0]];

// -------------------------------------------------------------- path pieces
// A subpath is an array of commands:
//   { t:'M', p }  { t:'L', p }  { t:'C', a, b, p }

const M = (p) => ({ t: 'M', p });
const L = (p) => ({ t: 'L', p });
const C = (a, b, p) => ({ t: 'C', a, b, p });

const r3 = (n) => {
  const v = Math.round(n * 1000) / 1000;
  return Object.is(v, -0) ? 0 : v;
};

function cmdsToD(cmds) {
  return cmds
    .map((c) => {
      if (c.t === 'M') return `M${r3(c.p[0])} ${r3(c.p[1])}`;
      if (c.t === 'L') return `L${r3(c.p[0])} ${r3(c.p[1])}`;
      return `C${r3(c.a[0])} ${r3(c.a[1])} ${r3(c.b[0])} ${r3(c.b[1])} ${r3(c.p[0])} ${r3(c.p[1])}`;
    })
    .join('');
}

function cubicAt(p0, a, b, p3, t) {
  const u = 1 - t;
  const w0 = u * u * u,
    w1 = 3 * u * u * t,
    w2 = 3 * u * t * t,
    w3 = t * t * t;
  return [
    w0 * p0[0] + w1 * a[0] + w2 * b[0] + w3 * p3[0],
    w0 * p0[1] + w1 * a[1] + w2 * b[1] + w3 * p3[1],
  ];
}

/** de Casteljau split; returns [left, right] each as {a,b,p} plus the split point */
function splitCubic(p0, a, b, p3, t) {
  const lerp = (u, v) => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
  const ab = lerp(p0, a),
    bc = lerp(a, b),
    cd = lerp(b, p3);
  const abc = lerp(ab, bc),
    bcd = lerp(bc, cd);
  const mid = lerp(abc, bcd);
  return {
    left: { a: ab, b: abc, p: mid },
    right: { a: bcd, b: cd, p: p3 },
    mid,
  };
}

/** parameter t at a given arc length measured from the start (approximate, plenty accurate here) */
function tAtLength(p0, a, b, p3, target) {
  const N = 128;
  let prev = p0,
    acc = 0;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const cur = cubicAt(p0, a, b, p3, t);
    const d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    if (acc + d >= target) return (i - 1) / N + (d ? (target - acc) / d : 0) / N;
    acc += d;
    prev = cur;
  }
  return 1;
}

// ------------------------------------------------------------ terminal trim
// Terminals are recorded per letter so 'chamfer' can pull them back and
// 'angled' can shear them. `end` says which end of the subpath they sit on.

/** shorten a subpath by `amount` at one end, along the actual path */
function trimSubpath(sub_, end, amount) {
  if (amount <= 0) return;
  if (end === 'end') {
    const last = sub_[sub_.length - 1];
    const prev = sub_[sub_.length - 2];
    if (!prev) return;
    if (last.t === 'L') {
      const d = sub(last.p, prev.p);
      const l = Math.hypot(d[0], d[1]);
      if (l <= amount) return;
      last.p = addv(prev.p, mul(norm(d), l - amount));
    } else {
      const p0 = prev.p;
      const total = polyLen(p0, last.a, last.b, last.p);
      if (total <= amount) return;
      const t = tAtLength(p0, last.a, last.b, last.p, total - amount);
      const { left } = splitCubic(p0, last.a, last.b, last.p, t);
      last.a = left.a;
      last.b = left.b;
      last.p = left.p;
    }
  } else {
    const first = sub_[0];
    const next = sub_[1];
    if (!next) return;
    if (next.t === 'L') {
      const d = sub(first.p, next.p);
      const l = Math.hypot(d[0], d[1]);
      if (l <= amount) return;
      first.p = addv(next.p, mul(norm(d), l - amount));
    } else {
      const p0 = first.p;
      const total = polyLen(p0, next.a, next.b, next.p);
      if (total <= amount) return;
      const t = tAtLength(p0, next.a, next.b, next.p, amount);
      const { right } = splitCubic(p0, next.a, next.b, next.p, t);
      first.p = cubicAt(p0, next.a, next.b, next.p, t);
      next.a = right.a;
      next.b = right.b;
    }
  }
}

function polyLen(p0, a, b, p3) {
  let acc = 0,
    prev = p0;
  for (let i = 1; i <= 64; i++) {
    const cur = cubicAt(p0, a, b, p3, i / 64);
    acc += Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    prev = cur;
  }
  return acc;
}

// ------------------------------------------------------------------ letters
// Each builder returns { w, subs, terms, extra }
//   w      advance width of the letter box (centre-line extents)
//   subs   array of subpaths
//   terms  free terminals: { sub, end, p, dir (outward unit), side, modes, scale }
//   extra  points that are ink but sit outside centre-line ± stroke/2 (mitre tips)

/**
 * sTop:'flat' — the squared geometric S.
 *
 * Built as an upper half plus its own 180° rotation about the centre, exactly
 * like the round S, so the two terminals mirror and the spine passes through
 * (0.5, 0.5) with matched tangents (C1 continuous, no kink).
 *
 * Upper half, in letter-box fractions — four pieces, no long straight diagonal
 * (a straight spine here would read as a Z, not an S):
 *
 *   (1.00, 0.00) ──flat top bar──▶ (0.30, 0.00)
 *                ──shoulder arc──▶ (0.00, 0.22)
 *                ──left side─────▶ (0.00, 0.33)
 *                ──waist arc─────▶ (0.50, 0.50)   tangent horizontal
 *
 * The waist arc arrives horizontally, so its 180° rotation continues from it
 * with matched tangents and the S crosses its own centre flat. The bar is a
 * true straight ON the cap line and the terminal tangent is horizontal — so
 * the butt cap reads as a VERTICAL cut, the tell that separates this from the
 * round S (whose caps read horizontal).
 */
function letterSFlat(P) {
  const { H } = P;
  const w = BOX.S * H * P.WF;
  const sc = (p) => [p[0] * w, p[1] * H];
  const rot = (p) => [1 - p[0], 1 - p[1]];

  const K = 0.5523; // circular-arc control handle
  const bar = 0.3; // x where the flat top bar breaks into the shoulder
  const shTop = 0.22; // y the shoulder lands on the left edge
  const shBot = 0.33; // y the straight left side ends

  const p0 = [1.0, 0.0]; // top-right terminal
  const t1 = [bar, 0.0]; // end of the flat bar
  const a1 = [bar - K * bar, 0.0]; // shoulder arc
  const b1 = [0.0, shTop - K * shTop];
  const t2 = [0.0, shTop];
  const t3 = [0.0, shBot]; // straight left side
  const a2 = [0.0, shBot + K * (0.5 - shBot)]; // waist arc
  const b2 = [0.5 - K * 0.5, 0.5];
  const mid = [0.5, 0.5]; // waist, tangent horizontal

  const path = [
    M(sc(p0)),
    L(sc(t1)),
    C(sc(a1), sc(b1), sc(t2)),
    L(sc(t3)),
    C(sc(a2), sc(b2), sc(mid)),
    C(sc(rot(b2)), sc(rot(a2)), sc(rot(t3))),
    L(sc(rot(t2))),
    C(sc(rot(b1)), sc(rot(a1)), sc(rot(t1))),
    L(sc(rot(p0))),
  ];

  return {
    w,
    subs: [path],
    terms: [
      { sub: 0, end: 'start', p: sc(p0), dir: [1, 0], side: 1, modes: { chamfer: 1, angled: 1 } },
      { sub: 0, end: 'end', p: sc(rot(p0)), dir: [-1, 0], side: 1, modes: { chamfer: 1, angled: 1 } },
    ],
    extra: [],
  };
}

function letterS(P) {
  if (P.sTop === 'flat') return letterSFlat(P);
  const { H } = P;
  const w = BOX.S * H * P.WF;
  // Upper half, normalised to the letter box; the lower half is its 180°
  // rotation, which puts the inflection exactly on the centre and makes the
  // two terminals mirror each other.
  // Control lengths are tuned so curvature runs ~continuous through the
  // bowl→spine transition (no lump on the spine).
  const up = [
    [0.955, 0.16], // top terminal — tangent straight up, so the butt cut reads horizontal
    [0.955, 0.032],
    [0.715, -0.008],
    [0.5, -0.008], // top of the arc, slight overshoot past the cap line
    [0.224, -0.008],
    [0.0, 0.117],
    [0.0, 0.272], // left extreme
    [0.0, 0.44],
    [0.262, 0.44],
    [0.5, 0.5], // spine joint; tangent + curvature shared with the lower arc
  ];
  const sc = (p) => [p[0] * w, p[1] * H];
  const rot = (p) => [1 - p[0], 1 - p[1]];
  const low = up.slice(0, 9).reverse().map(rot);

  const path = [
    M(sc(up[0])),
    C(sc(up[1]), sc(up[2]), sc(up[3])),
    C(sc(up[4]), sc(up[5]), sc(up[6])),
    C(sc(up[7]), sc(up[8]), sc(up[9])),
    C(sc(low[0]), sc(low[1]), sc(low[2])),
    C(sc(low[3]), sc(low[4]), sc(low[5])),
    C(sc(low[6]), sc(low[7]), sc(low[8])),
  ];

  return {
    w,
    subs: [path],
    terms: [
      { sub: 0, end: 'start', p: sc(up[0]), dir: [0, 1], side: 1, modes: { chamfer: 1, angled: 1 } },
      { sub: 0, end: 'end', p: sc(rot(up[0])), dir: [0, -1], side: 1, modes: { chamfer: 1, angled: 1 } },
    ],
    extra: [],
  };
}

function letterE(P) {
  const { H } = P;
  const w = BOX.E * H * P.WF;
  const mid = 0.48 * H; // middle arm a hair above optical centre
  const midW = P.eMidArm * w; // top and bottom arms are both full width
  const spine = [M([w, 0]), L([0, 0]), L([0, H]), L([w, H])];
  const arm = [M([0, mid]), L([midW, mid])];
  return {
    w,
    subs: [spine, arm],
    terms: [
      { sub: 0, end: 'start', p: [w, 0], dir: [1, 0], side: 1, modes: { chamfer: 1, angled: 1 } },
      { sub: 0, end: 'end', p: [w, H], dir: [1, 0], side: 1, modes: { chamfer: 1, angled: 1 } },
      { sub: 1, end: 'end', p: [midW, mid], dir: [1, 0], side: 1, modes: { chamfer: 1, angled: 1 } },
    ],
    extra: [],
  };
}

function letterR(P) {
  const { H } = P;
  const w = BOX.R * H * P.WF;
  const bw = 0.72 * w; // bowl reach from the stem; the leg carries the rest of the width
  const bot = P.bowlRatio * H; // where the bowl lands back on the stem
  const ry = bot / 2;
  // A plain half-ellipse this wide comes to a point at its major-axis vertex,
  // so the bowl runs flatter off the stem (kx) and turns on a comfortable
  // radius at the right (ky) — a "D" rather than a teardrop.
  const kx = 0.66;
  const ky = 0.55;

  /** the bowl, from the cap line round to `end` (default: back onto the stem) */
  const bowl = (end) => [
    C([kx * bw, 0], [bw, ry - ky * ry], [bw, ry]),
    C([bw, ry + ky * ry], [kx * bw, bot], end),
  ];
  /** free terminal at the foot of the leg */
  const legFoot = (from) => ({
    sub: 1,
    end: 'end',
    p: [w, H],
    dir: norm([w - from[0], H - from[1]]),
    side: 1,
    modes: { chamfer: 1, angled: 1 },
  });

  // ---- 'open-bowl': the bowl stops short of the stem; the leg takes over ----
  if (P.rStyle === 'open-bowl') {
    const gap = P.rGap * H;
    const end = [gap, bot]; // bowl terminates here, tangent horizontal → vertical cut
    return {
      w,
      subs: [[M([0, H]), L([0, 0]), ...bowl(end)], [M(end), L([w, H])]],
      terms: [
        { sub: 0, end: 'start', p: [0, H], dir: [0, 1], side: 1, modes: { chamfer: 1, angled: 1 } },
        // the bowl's lower end is NOT free — the leg springs from it — so it is
        // deliberately left square even under `cut`, keeping the joint clean and
        // the gap exactly `gap` wide.
        legFoot(end),
      ],
      extra: [],
    };
  }

  // ---- 'cut-stem': bowl closes normally, the stem is interrupted below it ----
  if (P.rStyle === 'cut-stem') {
    const gap = P.rStemGap * H;
    // Leg, upper stem and bowl are ONE subpath — run in from the foot of the
    // leg so the leg/stem corner is a proper mitre join instead of two butt
    // caps leaving a wedge out of the silhouette. (Mitre ratio there is 1.06,
    // well inside the limit, so it stays a crisp corner.)
    const upper = [M([w, H]), L([0, bot]), L([0, 0]), ...bowl([0, bot])];
    const lower = [M([0, bot + gap]), L([0, H])];
    return {
      w,
      subs: [upper, lower],
      terms: [
        { ...legFoot([0, bot]), sub: 0, end: 'start' },
        // both free ends of the interrupted stem
        { sub: 1, end: 'start', p: [0, bot + gap], dir: [0, -1], side: 1, modes: { chamfer: 0, angled: 0 } },
        { sub: 1, end: 'end', p: [0, H], dir: [0, 1], side: 1, modes: { chamfer: 1, angled: 1 } },
      ],
      extra: [],
    };
  }

  // ---- 'detached-leg': bowl closes normally, the leg floats free of it ----
  if (P.rStyle === 'detached-leg') {
    const gap = P.rGap * H;
    const d = norm([w, H - bot]);
    const start = [gap * d[0], bot + gap * d[1]];
    return {
      w,
      subs: [[M([0, H]), L([0, 0]), ...bowl([0, bot])], [M(start), L([w, H])]],
      terms: [
        { sub: 0, end: 'start', p: [0, H], dir: [0, 1], side: 1, modes: { chamfer: 1, angled: 1 } },
        { sub: 1, end: 'start', p: start, dir: mul(d, -1), side: 1, modes: { chamfer: 0, angled: 1 } },
        legFoot(start),
      ],
      extra: [],
    };
  }

  // ---- 'closed': the normal R ----
  const stemBowl = [M([0, H]), L([0, 0]), ...bowl([0, bot])];
  const leg = [M([0, bot]), L([w, H])];
  return {
    w,
    subs: [stemBowl, leg],
    terms: [
      { sub: 0, end: 'start', p: [0, H], dir: [0, 1], side: 1, modes: { chamfer: 1, angled: 1 } },
      legFoot([0, bot]),
    ],
    extra: [],
  };
}

function letterA(P) {
  const { H, s } = P;
  const w = BOX.A * H * P.WF;
  const a = w / 2;

  let subs, terms, extra, apexTop, lx, rx;

  if (P.apex === 'flat') {
    // truncated apex: a short horizontal cut sitting on the cap line.
    // Half-width is deliberately small — the flat should read as a clipped
    // point, not a plateau.
    const fh = 0.3 * s;
    apexTop = 0;
    lx = a - fh;
    rx = a + fh;
    subs = [[M([0, H]), L([lx, 0]), L([rx, 0]), L([w, H])]];
    // the two apex corners mitre a hair above the cap line
    extra = [
      [lx, -0.55 * s],
      [rx, -0.55 * s],
    ];
  } else {
    // pointed apex: drop the centre-line vertex so the MITRE TIP lands just
    // above the cap line (matching the overshoot a drawn point would have)
    const tipY = -s / 2 - 0.012 * H;
    let yv = 0;
    for (let i = 0; i < 24; i++) {
      const h = H - yv;
      yv = tipY + (s / 2) * (Math.hypot(a, h) / a);
    }
    apexTop = yv;
    lx = rx = a;
    subs = [[M([0, H]), L([a, yv]), L([w, H])]];
    extra = [[a, tipY]];
  }

  // crossbar spans between the two diagonals at the requested height.
  // crossbar:'none' leaves the A as a bare peak — two diagonals, nothing else.
  if (P.crossbar !== 'none') {
    const cy = H * (1 - P.crossbar);
    const t = (H - cy) / (H - apexTop);
    const cxL = t * lx;
    const cxR = w - t * (w - rx);
    subs.push([M([cxL, cy]), L([cxR, cy])]);
  }

  const dl = norm([-(lx - 0), H - apexTop]); // outward along the left diagonal (down-left)
  const dr = norm([w - rx, H - apexTop]); // outward along the right diagonal (down-right)
  terms = [
    { sub: 0, end: 'start', p: [0, H], dir: dl, side: 1, modes: { chamfer: 1, angled: 1 } },
    { sub: 0, end: 'end', p: [w, H], dir: dr, side: 1, modes: { chamfer: 1, angled: 1 } },
  ];
  return { w, subs, terms, extra };
}

function letterN(P) {
  const { H, s } = P;
  const w = BOX.N * H * P.WF;
  // pull the diagonal back just enough that its butt cut tops out exactly on
  // the cap line / baseline — keeps the vertices crisp with no spike
  const inset = (s / 2) * (w / H);
  const d = norm([w, H]);
  const p0 = mul(d, inset);
  const p1 = sub([w, H], mul(d, inset));

  return {
    w,
    subs: [
      [M([0, 0]), L([0, H])],
      [M([w, 0]), L([w, H])],
      [M(p0), L(p1)],
    ],
    // Only the two genuinely free stem ends are terminals. The other two ends
    // are vertices where the diagonal lands, so — like the E's stem corners —
    // they keep their full length under every terminal treatment.
    terms: [
      { sub: 0, end: 'end', p: [0, H], dir: [0, 1], side: 1, modes: { chamfer: 1, angled: 1 } },
      { sub: 1, end: 'start', p: [w, 0], dir: [0, -1], side: 1, modes: { chamfer: 1, angled: 1 } },
    ],
    extra: [],
  };
}

const LETTER = { S: letterS, E: letterE, R: letterR, A: letterA, N: letterN };

// ------------------------------------------------------------------- layout

function translateLetter(letter, dx) {
  const t = (p) => [p[0] + dx, p[1]];
  for (const sp of letter.subs) {
    for (const c of sp) {
      c.p = t(c.p);
      if (c.a) c.a = t(c.a);
      if (c.b) c.b = t(c.b);
    }
  }
  letter.terms = letter.terms.map((q) => ({ ...q, p: t(q.p) }));
  letter.extra = letter.extra.map(t);
  return letter;
}

function bounds(subs, extra, half) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  const hit = (p, pad) => {
    x0 = Math.min(x0, p[0] - pad);
    y0 = Math.min(y0, p[1] - pad);
    x1 = Math.max(x1, p[0] + pad);
    y1 = Math.max(y1, p[1] + pad);
  };
  for (const sp of subs) {
    let cur = null;
    for (const c of sp) {
      if (c.t === 'C') {
        for (let i = 1; i <= 24; i++) hit(cubicAt(cur, c.a, c.b, c.p, i / 24), half);
      } else {
        hit(c.p, half);
      }
      cur = c.p;
    }
  }
  for (const p of extra) hit(p, 0);
  return { x0, y0, x1, y1 };
}

// -------------------------------------------------------------- angled cuts

/** the sliver of ink removed to shear one terminal by `deg` off square */
function cutTriangle(term, half, deg = ANGLE_DEG) {
  const d = norm(term.dir);
  const n = mul(perp(d), term.side ?? 1);
  const tan = Math.tan((deg * Math.PI) / 180);
  const e = 0.5 * half;
  const P0 = term.p;
  // The wedge actually removed is P0 → P0-half*n → P0-half*tan*d-half*n.
  // t1/t3 are nudged ALONG that cut line (so the cut angle is unchanged) and
  // t2 outward into empty space, so the clip edge never lands exactly on a
  // stroke edge and leaves an antialiasing seam.
  const t1 = addv(P0, addv(mul(d, 0.5 * e), mul(n, 0.866 * e)));
  const t2 = addv(P0, addv(mul(d, e), mul(n, -(half + e))));
  const t3 = addv(P0, addv(mul(d, -(half + e) * tan - 0.5 * e), mul(n, -(half + e) - 0.866 * e)));
  return [t1, t2, t3];
}

// -------------------------------------------------------------------- build

export function buildWordmark(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const H = o.capHeight;
  const s = o.stroke;
  const half = s / 2;
  const P = {
    H,
    s,
    WF: o.widthFactor,
    bowlRatio: o.bowlRatio,
    crossbar: o.crossbar,
    apex: o.apex,
    rStyle: o.rStyle,
    rGap: o.rGap,
    rStemGap: o.rStemGap,
    sTop: o.sTop,
    eMidArm: o.eMidArm,
  };
  const gap = o.tracking * H;

  // lay the letters out on the advance grid, plus optical corrections.
  // The optical table was measured on the full lockup, so it only applies there.
  const order = [...String(o.glyphs)];
  const kern = o.kern ?? (String(o.glyphs) === ORDER ? KERN : []);
  const letters = [];
  let pen = 0;
  order.forEach((name, i) => {
    const l = translateLetter(LETTER[name](P), pen);
    letters.push(l);
    pen += l.w + gap + (kern[i] ?? 0) * H;
  });

  const subs = letters.flatMap((l) => l.subs);
  const extra = letters.flatMap((l) => l.extra);
  const terms = letters.flatMap((l) => l.terms);

  // terminal treatment.
  // `cut` is the general knob (degrees off square); terminal:'angled' is kept
  // as its historical alias for 30°.
  const cutDeg = o.cut > 0 ? o.cut : o.terminal === 'angled' ? ANGLE_DEG : 0;
  let clip = null;
  if (o.terminal === 'chamfer') {
    // subpath indices are letter-local, so trim letter by letter
    for (const l of letters) {
      for (const q of l.terms) {
        if (!q.modes.chamfer) continue;
        trimSubpath(l.subs[q.sub], q.end, CHAMFER * s * (q.scale ?? 1));
      }
    }
  } else if (cutDeg > 0) {
    clip = terms.filter((q) => q.modes.angled).map((q) => cutTriangle(q, half, cutDeg));
  }

  const b = bounds(subs, extra, half);
  const width = b.x1 - b.x0;
  const height = b.y1 - b.y0;

  const paths = subs.map((sp) => `    <path d="${cmdsToD(sp)}"/>`).join('\n');

  let defs = '';
  let clipAttr = '';
  if (clip && clip.length) {
    const pad = s * 3;
    const id = `${o.uid}-cut`;
    const rect =
      `M${r3(b.x0 - pad)} ${r3(b.y0 - pad)}H${r3(b.x1 + pad)}V${r3(b.y1 + pad)}H${r3(b.x0 - pad)}Z`;
    const tris = clip
      .map((t) => `M${r3(t[0][0])} ${r3(t[0][1])}L${r3(t[1][0])} ${r3(t[1][1])}L${r3(t[2][0])} ${r3(t[2][1])}Z`)
      .join('');
    defs =
      `  <defs>\n    <clipPath id="${id}" clipPathUnits="userSpaceOnUse">\n` +
      `      <path clip-rule="evenodd" d="${rect}${tris}"/>\n    </clipPath>\n  </defs>\n`;
    clipAttr = ` clip-path="url(#${id})"`;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r3(width)}" height="${r3(height)}" ` +
    `viewBox="${r3(b.x0)} ${r3(b.y0)} ${r3(width)} ${r3(height)}" role="img" aria-label="${o.glyphs}">\n` +
    defs +
    `  <g fill="none" stroke="${o.ink}" stroke-width="${r3(s)}" stroke-linecap="butt" ` +
    `stroke-linejoin="miter" stroke-miterlimit="4"${clipAttr}>\n${paths}\n  </g>\n</svg>\n`;

  return { svg, width, height };
}

// ------------------------------------------------------------------ presets

export const PRESETS = [
  { file: 'wm-01-w7-t30-flat-point', opts: {} },
  { file: 'wm-02-w5-t30-flat-point', opts: { stroke: 5 } },
  { file: 'wm-03-w6-t30-flat-point', opts: { stroke: 6 } },
  { file: 'wm-04-w85-t30-flat-point', opts: { stroke: 8.5 } },
  { file: 'wm-05-w7-t18-flat-point', opts: { tracking: 0.18 } },
  { file: 'wm-06-w7-t42-flat-point', opts: { tracking: 0.42 } },
  { file: 'wm-07-w7-t30-angled-point', opts: { terminal: 'angled' } },
  { file: 'wm-08-w7-t30-chamfer-point', opts: { terminal: 'chamfer' } },
  { file: 'wm-09-w7-t30-flat-flatapex', opts: { apex: 'flat' } },
  { file: 'wm-10-w6-t42-flat-flatapex', opts: { stroke: 6, tracking: 0.42, apex: 'flat' } },
  { file: 'wm-11-w6-t34-wide', opts: { stroke: 6, tracking: 0.34, widthFactor: 1.08 } },
  { file: 'wm-12-w7-t30-lowbar-highbowl', opts: { crossbar: 0.28, bowlRatio: 0.46 } },
];

// ------------------------------------------------------ v2 logotype presets
//
// The stylised light-monoline direction, measured off the client reference at
// cap height 100:
//   stroke 4.7 (4.7% of cap height — much lighter than a normal Light)
//   tracking 0.52  → 52-unit gaps
//   widthFactor 1.13 → mean letter advance 72 units, lockup ≈ 692 units wide
//   crossbar 'none'  → the A is a bare peak
//   eMidArm 0.65     → the E's middle arm is clearly short
//
/** the constant part of the v2 spec — every variant starts from this */
export const V2_BASE = {
  capHeight: 100,
  stroke: 4.7,
  tracking: 0.52,
  widthFactor: 1.13,
  crossbar: 'none',
  eMidArm: 0.65,
  rStyle: 'open-bowl',
  sTop: 'flat',
  cut: 0,
};

export const PRESETS_V2 = [
  { file: 'lg-01-openbowl-flat', note: 'open-bowl · flat S · square cuts', opts: {} },
  { file: 'lg-02-cutstem-flat', note: 'cut-stem · flat S · square cuts', opts: { rStyle: 'cut-stem' } },
  { file: 'lg-03-detachedleg-flat', note: 'detached-leg · flat S · square cuts', opts: { rStyle: 'detached-leg' } },
  { file: 'lg-04-closed-flat', note: 'control — normal R, stylisation only on the A', opts: { rStyle: 'closed' } },
  { file: 'lg-05-openbowl-round', note: 'open-bowl · round S', opts: { sTop: 'round' } },
  { file: 'lg-06-openbowl-flat-cut25', note: 'open-bowl · flat S · 25° sheared terminals', opts: { cut: 25 } },
  { file: 'lg-07-openbowl-flat-w40', note: 'as 01, stroke 4.0 (lighter)', opts: { stroke: 4.0 } },
  { file: 'lg-08-openbowl-flat-w55', note: 'as 01, stroke 5.5 (heavier)', opts: { stroke: 5.5 } },
  { file: 'lg-09-openbowl-flat-t42', note: 'as 01, tracking 0.42 (tighter)', opts: { tracking: 0.42 } },
  { file: 'lg-10-openbowl-flat-t62', note: 'as 01, tracking 0.62 (airier)', opts: { tracking: 0.62 } },
  { file: 'lg-11-cutstem-flat-cut25', note: 'cut-stem · flat S · 25° sheared terminals', opts: { rStyle: 'cut-stem', cut: 25 } },
  { file: 'lg-12-detachedleg-flat-cut25', note: 'detached-leg · flat S · 25° sheared terminals', opts: { rStyle: 'detached-leg', cut: 25 } },
].map((p, i) => ({ ...p, opts: { ...V2_BASE, ...p.opts, uid: `lg${String(i + 1).padStart(2, '0')}` } }));

/** scale the two absolute options (everything else is a ratio of capHeight) */
export function scaleOpts(opts, k) {
  return { ...opts, capHeight: (opts.capHeight ?? DEFAULTS.capHeight) * k, stroke: (opts.stroke ?? DEFAULTS.stroke) * k };
}

// ---------------------------------------------------------------------- CLI

const selfPath = decodeURIComponent(new URL(import.meta.url).pathname)
  .replace(/^\/([A-Za-z]:)/, '$1')
  .toLowerCase();
const argPath = (globalThis.process?.argv?.[1] ?? '').replace(/\\/g, '/').toLowerCase();
const isMain = argPath !== '' && selfPath === argPath;

if (isMain) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { join, dirname, resolve } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));

  const argv = process.argv.slice(2);
  const si = argv.indexOf('--set');
  const set = si >= 0 && argv[si + 1] === 'v2' ? 'v2' : 'v1';
  const presets = set === 'v2' ? PRESETS_V2 : PRESETS;
  const dir = set === 'v2' ? 'marks-v2' : 'marks';

  const oi = argv.indexOf('--out');
  const out =
    oi >= 0 && argv[oi + 1]
      ? resolve(process.cwd(), argv[oi + 1])
      : resolve(here, '..', '..', 'public', '_typelab', dir);

  mkdirSync(out, { recursive: true });
  for (const p of presets) {
    const { svg, width, height } = buildWordmark(p.opts);
    writeFileSync(join(out, p.file + '.svg'), svg, 'utf8');
    console.log(`ok  ${p.file}.svg  ${Math.round(width)}×${Math.round(height)}`);
  }
  console.log(`\n${presets.length} presets → ${out}`);
}
