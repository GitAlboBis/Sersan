"""Build the "Sersan Display" WEIGHT LADDER as woff2.

Same two amputations, same pipeline, same code as patch.py — only the source
and the naming differ:

Source : design/wordmark/build/instances/jost-var-{w}.ttf
         (variable Jost pinned at wght w by ladder-instance.py; TrueType `glyf`)
Cuts   : A loses its crossbar (unchanged since sign-off), R loses the WHOLE of
         the bowl's return: the slab runs out to where the cut band holds no
         more ink (gapRatio 'saturate'), which is past the abscissa at which the
         leg lets go. The R therefore ships as TWO contours - stem+bowl, and a
         free-standing leg - which is deliberate and authorised: clamped to the
         severing ceiling the cut showed no daylight at all, because the leg is
         diagonal and the two pieces still touched.
         The outlines come from amputated-ladder.json, which
         design/wordmark/logotype.mjs produced by boolean operations on these
         very glyphs' original outlines (see ladder-extract.mjs). Nothing is
         hand-drawn, and nothing is synthetically emboldened: every stroke is
         the typeface's own interpolation at that wght.
Licence: SIL OFL 1.1 — family renamed, copyright/licence name records preserved.

WRITE list: 220, 240, 260, 280, 340. The 200 and 300 faces are rewritten too,
but by patch.py from the static fontsource faces they have always been carved
from — see the note on WRITE below.
"""

import json
import os

from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "instances", "jost-var-{w}.ttf")
DST = "C:/Users/alber/Desktop/sersan-v2-main/src/fonts/sersan-display-{w}.woff2"

# 200 and 300 are not written HERE: they are carved from the two static
# fontsource faces by patch.py, which is the source they have always been built
# from. Routing them through this script instead would shift every untouched
# glyph by the sub-unit difference between the static face and the pinned
# variable instance, and would re-cut the signed-off A — neither of which the
# gap change is allowed to do. Run patch.py for those two; between the pair,
# all seven faces are regenerated.
WRITE = {"220", "240", "260", "280", "340"}

FAMILY = "Sersan Display"
PS_FAMILY = "SersanDisplay"
VENDOR_TOKEN = "SRSN"  # free-text token inside nameID 3, keeps the ID unique
DESCRIPTION = (
    "Sersan Display is a derivative of Jost* by indestructible type*, modified for "
    "SERSAN: the capital A is drawn without its crossbar and the capital R with an "
    "open bowl and a free-standing leg. All other glyphs are unchanged. Licensed "
    "under the SIL Open Font License 1.1."
)

data = json.load(open(os.path.join(HERE, "amputated-ladder.json")))


# ───────────────────────────────────────────────────────────── ring hygiene ──
def signed_area(ring):
    a = 0.0
    n = len(ring)
    for i in range(n):
        x0, y0 = ring[i]
        x1, y1 = ring[(i + 1) % n]
        a += x0 * y1 - x1 * y0
    return a / 2.0


def to_int_ring(ring):
    """Round to font units, drop repeats and points that add nothing."""
    pts = [(int(round(x)), int(round(y))) for x, y in ring]

    # consecutive duplicates (cyclic)
    out = []
    for p in pts:
        if not out or p != out[-1]:
            out.append(p)
    while len(out) > 1 and out[0] == out[-1]:
        out.pop()

    # exactly collinear interior points (cyclic); integer cross product, no epsilon
    changed = True
    while changed and len(out) > 3:
        changed = False
        keep = []
        n = len(out)
        i = 0
        while i < n:
            a = out[(i - 1) % n]
            b = out[i]
            c = out[(i + 1) % n]
            cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
            dot = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])
            if cross == 0 and dot > 0 and len(keep) + (n - i - 1) >= 3:
                changed = True  # b sits on segment a->c: redundant
            else:
                keep.append(b)
            i += 1
        out = keep
    return out


def orient(ring, ccw=True):
    return ring if (signed_area(ring) > 0) == ccw else ring[::-1]


# ─────────────────────────────────────────────────────────────── name table ──
def rename(font, style):
    name = font["name"]
    full = f"{FAMILY} {style}"
    ps = f"{PS_FAMILY}-{style}"
    version = (name.getDebugName(5) or "Version 3.710").split()[-1]

    # usWeightClass is untouched (ladder-instance.py already asserted it equals
    # the pinned wght), so the weight identity is carried by the file itself.
    for nid, value in (
        (1, full),           # family (legacy)
        (2, "Regular"),      # subfamily — one static face per file, RIBBI slot
        (3, f"{version};{VENDOR_TOKEN};{ps}"),  # unique ID
        (4, full),           # full name
        (6, ps),             # PostScript name
        (10, DESCRIPTION),   # provenance of the derivative
        (16, FAMILY),        # typographic family
        (17, style),         # typographic subfamily — the numeric weight
    ):
        for rec in name.names:
            if rec.nameID == nid:
                rec.string = value
                break
        else:
            src = next(r for r in name.names if r.nameID == 1)
            name.setName(value, nid, src.platformID, src.platEncID, src.langID)
    # nameID 0 (copyright) and 14 (licence URL) are deliberately left untouched.


# ───────────────────────────────────────────────────────────────────── main ──
report = {}
for w, payload in sorted(data.items(), key=lambda kv: int(kv[0])):
    if w not in WRITE:
        print(f"skip {w}: shipped face left untouched")
        continue

    font = TTFont(SRC.format(w=w))
    glyf = font["glyf"]
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm
    assert payload["glyphs"]["A"]["upm"] == upm, "upm mismatch between extract and font"

    # Winding convention, measured rather than assumed: take an untouched glyph
    # with an explicit hole ("O") and check that its outer ring is CCW. Jost is a
    # TrueType font that follows the PostScript direction (outer CCW, holes CW),
    # so the patched contours — all of them outer rings — must be CCW too.
    o = glyf["O"]
    coords, ends, _ = o.getCoordinates(glyf)
    coords = list(coords)
    o_rings = []
    start = 0
    for e in ends:
        o_rings.append(coords[start : e + 1])
        start = e + 1
    outer = max(o_rings, key=lambda r: abs(signed_area(r)))
    assert signed_area(outer) > 0, "source font uses CW outer contours - flip needed"

    rows = []
    for ch, g in payload["glyphs"].items():
        rings = [orient(to_int_ring(r), ccw=True) for r in g["rings"]]
        assert all(len(r) >= 3 for r in rings), f"{ch}: degenerate contour"
        assert all(abs(signed_area(r)) > 0 for r in rings), f"{ch}: zero-area contour"

        old = glyf[ch]
        old_adv, old_lsb = hmtx[ch]
        old_box = (old.xMin, old.yMin, old.xMax, old.yMax)

        pen = TTGlyphPen(None)
        for ring in rings:
            pen.moveTo(ring[0])
            for p in ring[1:]:
                pen.lineTo(p)
            pen.closePath()
        glyf[ch] = pen.glyph()
        glyf[ch].recalcBounds(glyf)
        hmtx[ch] = (old_adv, glyf[ch].xMin)  # advance kept, LSB follows the new ink

        rows.append(
            dict(
                ch=ch,
                pts=sum(len(r) for r in rings),
                contours=len(rings),
                bbox_old=old_box,
                bbox_new=(glyf[ch].xMin, glyf[ch].yMin, glyf[ch].xMax, glyf[ch].yMax),
                adv=(old_adv, hmtx[ch][0]),
                lsb=(old_lsb, hmtx[ch][1]),
            )
        )

    weight_class = font["OS/2"].usWeightClass
    rename(font, str(w))

    out = DST.format(w=w)
    font.flavor = "woff2"
    font.save(out)
    report[w] = dict(
        usWeightClass=weight_class,
        out=out,
        size=os.path.getsize(out),
        glyphs=rows,
        n1=font["name"].getDebugName(1),
        n4=font["name"].getDebugName(4),
        n6=font["name"].getDebugName(6),
        n16=font["name"].getDebugName(16),
        n17=font["name"].getDebugName(17),
        n0=font["name"].getDebugName(0),
        n14=font["name"].getDebugName(14),
    )

print(json.dumps(report, indent=1))
