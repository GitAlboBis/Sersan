"""Reproduce (or revert) the vertical wash applied to mattia-headshot.webp.

    python wash_mattia.py apply     # ORIGINAL backup -> washed -> public/founders
    python wash_mattia.py revert    # ORIGINAL backup -> public/founders (undo)
    python wash_mattia.py measure   # measure whatever is currently on disk

WHAT THE WASH DOES
------------------
Per-channel, on the full-res 1200x1800 source, for every pixel:

    c'(x, y) = 255 + (c(x, y) - 255) * k(y)

i.e. each ROW is blended toward the pure-white studio backdrop by (1 - k(y)).
It is purely vertical: no horizontal term, no colour/luminance test anywhere
(the sampler's spatial-separation doctrine is preserved -- this only reshapes
the subject's own tonal falloff, it does not classify pixels).

k(y) is a PCHIP (shape-preserving, monotone, C1) interpolation through:

      y     k          what it is
      0     1.0000     top of frame
    940     1.0000     )  two equal controls => k == 1.0 exactly up to y=985
    985     1.0000     )  and k'(985) == 0, so the wash joins the untouched
                          face with MATCHING SLOPE: no step, no band.
                          y=985 is the bottom of the beard (grid row 223).
   1076     0.3331     neck / collar line
   1159     0.1020     top of the lapels
   1242     0.0516     chest
   1345     0.0420     )
   1448     0.0298     )  shallow tail: keeps the jacket faintly present
   1531     0.0151     )  instead of ending in a slab
   1601     0.0000     fully white from here down
   1800     0.0000     bottom of frame

Max |dk/dy| = 0.0101 per px, so the steepest tonal ramp is ~2.2 levels/px on
navy -- far below any banding threshold.

Encoded WebP quality=88, method=6, 1200x1800, RGB (identical to the input).
Every number in the report was re-measured from the WRITTEN .webp, not from the
in-memory array.
"""
import os
import sys
import numpy as np
from PIL import Image

import sampler_port as S
import evaluate as E
import apply_wash as W

HERE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(E.BASE, "mattia-headshot.webp")
ORIG = os.path.join(HERE, "mattia-headshot.ORIGINAL.webp")  # lossless, pre-wash

CHIN_Y = 985
QUALITY = 88
CONTROL = [
    (0, 1.0000), (940, 1.0000), (985, 1.0000),
    (1076, 0.3331), (1159, 0.1020), (1242, 0.0516),
    (1345, 0.0420), (1448, 0.0298), (1531, 0.0151),
    (1601, 0.0000), (1800, 0.0000),
]


def apply():
    src = np.asarray(Image.open(ORIG).convert("RGB"), dtype=np.uint8)
    k = W.k_pchip(CONTROL)
    assert np.all(np.diff(k) <= 1e-12), "k must be monotone non-increasing"
    out = W.apply_wash(src, k)
    assert np.array_equal(out[: CHIN_Y + 1], src[: CHIN_Y + 1]), "face changed"
    Image.fromarray(out, "RGB").save(DEST, "WEBP", quality=QUALITY, method=6)
    print(f"applied -> {DEST} ({os.path.getsize(DEST)} bytes)")


def revert():
    Image.open(ORIG).convert("RGB").save(
        DEST, "WEBP", quality=QUALITY, method=6
    )
    print(f"reverted -> {DEST}")


def measure():
    A, B = E.refs()
    E.report(S.measure(DEST), A, B, os.path.basename(DEST))


if __name__ == "__main__":
    {"apply": apply, "revert": revert, "measure": measure}[
        sys.argv[1] if len(sys.argv) > 1 else "measure"
    ]()
