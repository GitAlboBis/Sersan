"""Detailed evaluator: band ink profile, hX drivers, union split."""
import os
import numpy as np
import sampler_port as S

BASE = r"C:\Users\alber\Desktop\sersan-v2-main\public\founders"
BANDS = [(0, 120), (120, 180), (180, 230), (230, 260), (260, 300), (300, 340),
         (340, 381)]


def refs():
    A = S.measure(os.path.join(BASE, "alessandro-headshot.webp"), "A")
    B = S.measure(os.path.join(BASE, "michele-headshot.webp"), "B")
    return A, B


def report(m, A, B, name="candidate"):
    ink = m["ink"].reshape(S.GRID_H, S.GRID_W)
    u = np.maximum(A["ink"], B["ink"]).reshape(S.GRID_H, S.GRID_W) > S.INK_CUT
    print(f"--- {name}: cells={m['cells']} mean={m['mean_ink']:.4f} "
          f"hX={m['hx']:.2f} hY={m['hy']:.2f}")
    for lo, hi in BANDS:
        sub = ink[lo:hi]
        live = sub > S.INK_CUT
        c = int(live.sum())
        mi = float(sub[live].mean()) if c else 0.0
        out = int((live & ~u[lo:hi]).sum())
        # A / B band refs
        def bref(x):
            s = x["ink"].reshape(S.GRID_H, S.GRID_W)[lo:hi]
            l = s > S.INK_CUT
            return int(l.sum()), (float(s[l].mean()) if l.any() else 0.0)
        ac, am = bref(A)
        bc, bm = bref(B)
        print(f"  rows {lo:>3}-{hi:<3} cells={c:>6} ink={mi:.3f}  "
              f"outsideAB={out:>5}   [A {ac:>5}/{am:.3f}  B {bc:>5}/{bm:.3f}]")
    # hX driver: cells with ink>extentInk beyond |x|>137
    jx, _ = S._jitter_tables()
    flat = m["ink"]
    sel = np.nonzero(flat > S.EXTENT_INK)[0]
    gx = sel % S.GRID_W
    px = np.abs(gx + 0.5 + jx[sel] - S.GRID_W / 2.0)
    wide = px > 137
    print(f"  ink>{S.EXTENT_INK} cells={sel.size}  |x|>137: {int(wide.sum())} "
          f"({100*wide.mean():.2f}%)")
    rows = (sel[wide] // S.GRID_W)
    if rows.size:
        h = np.bincount(rows // 20, minlength=21)
        print("  wide-cell rows (per 20-row bucket):",
              {i*20: int(v) for i, v in enumerate(h) if v})
    abc = S.union(A, B, m)
    ab = S.union(A, B)
    nb = abc * S.BROWSER_FACTOR
    print(f"  A+B={ab}  A+B+C={abc}  browser-norm={nb:.0f}  "
          f"stride@48000={S.stride_for(round(nb))}")
    return abc
