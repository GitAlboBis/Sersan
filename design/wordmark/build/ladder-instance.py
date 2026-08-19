"""Pin the VARIABLE Jost at each ladder weight → static TrueType instances.

Source : node_modules/@fontsource-variable/jost/files/jost-latin-wght-normal.woff2
         (Jost*, SIL OFL 1.1, wght axis 100–900, glyf+gvar, upm 1000, cap 700)
Output : design/wordmark/build/instances/jost-var-{w}.ttf

Why instance to a real static file instead of asking fontkit for a variation
in memory: the extract step (fontkit) and the patch step (fontTools) must see
the SAME outlines to the unit, or the boolean cut is computed against outlines
that are not the ones it ends up carved out of. Pinning once, to disk, makes
both stages read identical bytes.

Sanity, printed for the record: the instances at 200 and 300 are compared
against the two static fontsource faces the shipped sersan-display-{200,300}
were built from. They agree to well under one font unit (pure coordinate
rounding), which is what makes the ladder homogeneous with the shipped faces.
"""

import os

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = "C:/Users/alber/Desktop/sersan-v2-main"
VAR = f"{ROOT}/node_modules/@fontsource-variable/jost/files/jost-latin-wght-normal.woff2"
OUTDIR = os.path.join(HERE, "instances")

# The ladder. 200 and 300 are instanced too, but only as a control: they are
# measured and diffed against the shipped static faces, never written to
# src/fonts (the signed-off files stay byte-identical).
# 220 is not in the brief's list: the measured ladder showed the 5-6.5 %
# stem/cap target maps to wght ~212-252, so 240 (6.00 %) was the ONLY requested
# instance inside the band. 220 (5.43 %) gives the band a second sample.
WEIGHTS = [200, 220, 240, 260, 280, 300, 340]
CONTROL = {200: "jost-latin-200-normal.woff2", 300: "jost-latin-300-normal.woff2"}

os.makedirs(OUTDIR, exist_ok=True)


def coords(font, ch):
    c, _, _ = font["glyf"][ch].getCoordinates(font["glyf"])
    return list(c)


for w in WEIGHTS:
    var = TTFont(VAR)
    inst = instancer.instantiateVariableFont(var, {"wght": w}, inplace=False)

    # Weight identity: usWeightClass is the only place the numeric weight lives
    # once fvar is gone. fontTools already sets it from the pinned location;
    # assert rather than assign so a silent change would be caught.
    assert inst["OS/2"].usWeightClass == w, (w, inst["OS/2"].usWeightClass)
    # nameID 2/17 still say "Regular" (the variable default instance). The patch
    # step names the derivative explicitly, so leave them alone here.

    out = os.path.join(OUTDIR, f"jost-var-{w}.ttf")
    inst.flavor = None
    inst.save(out)

    note = ""
    if w in CONTROL:
        st = TTFont(os.path.join(HERE, CONTROL[w]))
        worst, worst_ch, adv_ok = 0.0, None, True
        for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            a, b = coords(st, ch), coords(inst, ch)
            assert len(a) == len(b), f"{ch}: point count differs"
            d = max(max(abs(p[0] - q[0]), abs(p[1] - q[1])) for p, q in zip(a, b))
            if d > worst:
                worst, worst_ch = d, ch
            adv_ok &= st["hmtx"][ch] == inst["hmtx"][ch]
        note = (
            f"  | vs static face: max dev {worst:.3f}u (worst {worst_ch}), "
            f"A–Z advances identical: {adv_ok}"
        )

    print(
        f"wght {w:>3} -> {os.path.basename(out)}  "
        f"{os.path.getsize(out):>6} B  upm {inst['head'].unitsPerEm}  "
        f"cap {inst['OS/2'].sCapHeight}  glyphs {inst['maxp'].numGlyphs}{note}"
    )
