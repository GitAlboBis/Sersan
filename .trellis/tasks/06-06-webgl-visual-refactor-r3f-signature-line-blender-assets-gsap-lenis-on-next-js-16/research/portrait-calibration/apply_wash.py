"""Vertical wash for mattia-headshot.webp.

k(y) is a monotone retention profile: c'(x,y) = 255 + (c(x,y) - 255) * k(y),
i.e. every pixel is blended toward the pure-white studio backdrop by (1-k),
uniformly across the row. k == 1 above the chin (src y <= CHIN_Y) so the face is
bit-for-bit untouched.

k is defined by CONTROL points (linear interp) then Gaussian-smoothed along y
(SIGMA src px) so the profile is C-infinity: no band, no hard edge.
"""
import io
import numpy as np
from PIL import Image

SRC_H = 1800
CHIN_Y = 985  # bottom of the beard, grid row ~223
SIGMA = 26.0  # px, Gaussian smoothing of the 1-D k profile

# (source y, retention k). Above CHIN_Y k is pinned to 1.
CONTROL = [
    (0, 1.0), (940, 1.0), (985, 1.0),
    (1076, 0.49), (1159, 0.24), (1242, 0.15),
    (1345, 0.13), (1448, 0.10), (1531, 0.045), (1601, 0.0), (1800, 0.0),
]


def k_profile(control=CONTROL, sigma=SIGMA, chin=CHIN_Y, h=SRC_H):
    y = np.arange(h, dtype=np.float64)
    xs = np.array([c[0] for c in control], dtype=np.float64)
    ks = np.array([c[1] for c in control], dtype=np.float64)
    k = np.interp(y, xs, ks)
    # Gaussian smooth (reflect-pad) -> C-infinity, no kink at any control point.
    rad = int(math_ceil(3 * sigma))
    g = np.exp(-0.5 * (np.arange(-rad, rad + 1) / sigma) ** 2)
    g /= g.sum()
    k = np.convolve(np.pad(k, rad, mode="edge"), g, mode="same")[rad:-rad]
    k = np.clip(k, 0.0, 1.0)
    k[: chin + 1] = 1.0  # face is untouched, exactly
    return np.minimum.accumulate(k)  # enforce monotone non-increasing


def math_ceil(v):
    return int(v) + (1 if v > int(v) else 0)


def k_pchip(control, h=SRC_H):
    """Monotone C1 retention profile (PCHIP) through `control`.

    PCHIP is shape-preserving: it passes exactly through every control point,
    never overshoots, and forces zero slope where the neighbouring secants have
    opposite sign. With two consecutive k=1 controls (940, 985) that makes
    k == 1.0 exactly for y <= 985 AND k'(985) == 0, so the wash joins the
    untouched face with matching slope -- no step, no band. (The earlier
    Gaussian-blur + hard-clamp construction left a 0.081/px jump at the chin,
    i.e. a ~17-level horizontal line across the shoulders.)
    """
    from scipy.interpolate import PchipInterpolator

    xs = np.array([c[0] for c in control], dtype=np.float64)
    ks = np.array([c[1] for c in control], dtype=np.float64)
    k = PchipInterpolator(xs, ks)(np.arange(h, dtype=np.float64))
    return np.clip(k, 0.0, 1.0)


def washed_pchip(path, control, quality=88):
    src = np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)
    k = k_pchip(control)
    return encode(apply_wash(src, k), quality), k


def apply_wash(src_rgb_u8, k=None):
    k = k_profile() if k is None else k
    a = src_rgb_u8.astype(np.float64)
    out = 255.0 + (a - 255.0) * k[:, None, None]
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


def encode(arr_u8, quality=88):
    buf = io.BytesIO()
    Image.fromarray(arr_u8, "RGB").save(buf, "WEBP", quality=quality, method=6)
    buf.seek(0)
    return buf


def washed_image(path, control=CONTROL, sigma=SIGMA, quality=88):
    src = np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)
    k = k_profile(control, sigma)
    return encode(apply_wash(src, k), quality), k
