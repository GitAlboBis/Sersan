"""
Faithful offline Python port of src/webgl/image/sampleImagePoints.ts
(readGrid + emit + union/stride), using the shipped SAMPLE_SPEC_BASE values from
src/webgl/FounderPortraitMorph.tsx.

This is the CALIBRATION TOOL for any founder portrait added to the morph rail.
Run:  python sampler_port.py [img...]

Known bias: the PIL BOX-filter downscale reads ~7% HIGH on cell counts versus the
browser's canvas drawImage. Published browser calibration: A+B = 42,087 shared
cells; this port gives ~45,187 for the same pair -> normalisation factor 0.931.
"""

import math
import sys
import numpy as np
from PIL import Image

# --- Shipped spec (FounderPortraitMorph.tsx SAMPLE_SPEC_BASE / GRID_*) --------
GRID_W = 290
GRID_H = 405
INK_GAIN = 1.7
INK_FLOOR = 0.03
INK_GAMMA = 0.62
FADE_START = 0.62
FADE_SPAN = 0.32
INK_CUT = 0.03
EXTENT_INK = 0.15
MAX_COUNT_FULL = 48000

# --- sampleImagePoints.ts constants -----------------------------------------
CORNER_PATCH = 14
JITTER = 0.9
BG_FILL_TOL = 0.055
BG_FILL_ROW_LIMIT = 0.62

# Port-vs-browser cell-count normalisation (see module docstring).
BROWSER_FACTOR = 0.931


def cover_crop_grid(path_or_img):
    """Cover-crop to the grid aspect (centred) and rasterize to GRID_W x GRID_H."""
    img = (
        path_or_img
        if isinstance(path_or_img, Image.Image)
        else Image.open(path_or_img)
    )
    img = img.convert("RGB")
    srcW, srcH = img.size
    target = GRID_W / GRID_H
    srcA = srcW / srcH
    if srcA > target:
        cropH = srcH
        cropW = srcH * target
    else:
        cropW = srcW
        cropH = srcW / target
    sx = (srcW - cropW) / 2.0
    sy = (srcH - cropH) / 2.0
    out = img.resize(
        (GRID_W, GRID_H), Image.BOX, box=(sx, sy, sx + cropW, sy + cropH)
    )
    return np.asarray(out, dtype=np.float64) / 255.0  # (H, W, 3)


def read_grid(rgb):
    """readGrid(): backdrop median -> distance -> flood fill -> ink curve+fade."""
    H, W, _ = rgb.shape
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    # Backdrop: per-channel MEDIAN of the two TOP corner patches.
    patch = min(CORNER_PATCH, W >> 1, H)
    left = rgb[0:patch, 0:patch, :].reshape(-1, 3)
    right = rgb[0:patch, W - patch:W, :].reshape(-1, 3)
    # JS pushes r[left], r[right] per (x,y) -> the multiset is both patches.
    both = np.concatenate([left, right], axis=0)
    # JS median() takes a[len>>1] of the sorted array (upper median for even n).
    n = both.shape[0]
    s = np.sort(both, axis=0)
    bg = s[n >> 1]

    d = rgb - bg
    dist = np.sqrt(
        0.299 * d[..., 0] ** 2 + 0.587 * d[..., 1] ** 2 + 0.114 * d[..., 2] ** 2
    )

    # Border-seeded flood fill (spatial backdrop removal), row-limited.
    row_limit = max(1, int(math.floor(H * BG_FILL_ROW_LIMIT)))
    ok = dist < BG_FILL_TOL
    bg_mask = np.zeros((H, W), dtype=bool)
    stack = []
    for x in range(W):
        if ok[0, x] and not bg_mask[0, x]:
            bg_mask[0, x] = True
            stack.append((0, x))
    for y in range(1, row_limit):
        for x in (0, W - 1):
            if ok[y, x] and not bg_mask[y, x]:
                bg_mask[y, x] = True
                stack.append((y, x))
    while stack:
        y, x = stack.pop()
        if x > 0 and ok[y, x - 1] and not bg_mask[y, x - 1]:
            bg_mask[y, x - 1] = True
            stack.append((y, x - 1))
        if x < W - 1 and ok[y, x + 1] and not bg_mask[y, x + 1]:
            bg_mask[y, x + 1] = True
            stack.append((y, x + 1))
        if y > 0 and ok[y - 1, x] and not bg_mask[y - 1, x]:
            bg_mask[y - 1, x] = True
            stack.append((y - 1, x))
        if y + 1 < row_limit and ok[y + 1, x] and not bg_mask[y + 1, x]:
            bg_mask[y + 1, x] = True
            stack.append((y + 1, x))

    # Ink curve + vertical dissolve.
    ny = (np.arange(H) / H)[:, None]
    f = np.clip(1.0 - (ny - FADE_START) / max(FADE_SPAN, 1e-4), 0.0, 1.0)
    fade = f * f * (3 - 2 * f)
    inv_floor = 1.0 / max(1 - INK_FLOOR, 1e-4)
    v = np.clip((dist * INK_GAIN - INK_FLOOR) * inv_floor, 0.0, 1.0)
    ink = np.power(v, INK_GAMMA) * fade
    ink[bg_mask] = 0.0
    ink[np.broadcast_to(fade <= 0, ink.shape)] = 0.0
    return {"rgb": rgb, "lum": lum, "ink": ink, "bg": bg}


def _hash01(n):
    s = math.sin(n) * 43758.5453123
    return s - math.floor(s)


_JX = None
_JY = None


def _jitter_tables():
    global _JX, _JY
    if _JX is None:
        idx = np.arange(GRID_W * GRID_H, dtype=np.float64)
        sx = np.sin(idx * 12.9898) * 43758.5453123
        sy = np.sin(idx * 78.233) * 43758.5453123
        _JX = ((sx - np.floor(sx)) - 0.5) * JITTER
        _JY = ((sy - np.floor(sy)) - 0.5) * JITTER
    return _JX, _JY


def percentile_js(values, p=0.99):
    """JS percentile(): sort asc, index floor(len*p), min 1e-3."""
    if len(values) == 0:
        return 1.0
    a = np.sort(np.asarray(values, dtype=np.float64))
    idx = min(len(a) - 1, max(0, int(math.floor(len(a) * p))))
    return max(a[idx], 1e-3)


def extents(ink_flat):
    """emit()'s halfExtentX/Y over cells with ink > EXTENT_INK (incl. jitter)."""
    jx, jy = _jitter_tables()
    sel = np.nonzero(ink_flat > EXTENT_INK)[0]
    if sel.size == 0:
        return 1.0, 1.0
    gx = sel % GRID_W
    gy = sel // GRID_W
    px = np.abs(gx + 0.5 + jx[sel] - GRID_W / 2.0)
    py = np.abs(-(gy + 0.5 + jy[sel] - GRID_H / 2.0))
    return percentile_js(px), percentile_js(py)


def measure(path_or_img, label=""):
    rgb = cover_crop_grid(path_or_img)
    gr = read_grid(rgb)
    ink = gr["ink"].ravel()
    live = ink > INK_CUT
    hx, hy = extents(ink)
    return {
        "label": label,
        "ink": ink,
        "cells": int(live.sum()),
        "mean_ink": float(ink[live].mean()) if live.any() else 0.0,
        "hx": hx,
        "hy": hy,
        "bg": gr["bg"],
        "grid": gr,
    }


def union(*ms):
    u = ms[0]["ink"]
    for m in ms[1:]:
        u = np.maximum(u, m["ink"])
    return int((u > INK_CUT).sum())


def stride_for(shared, max_count=MAX_COUNT_FULL):
    return math.ceil(shared / max_count) if shared > max_count else 1


def row_profile(m):
    """Per-row mean ink (over the whole row) — for above-chin regression tests."""
    return m["ink"].reshape(GRID_H, GRID_W).mean(axis=1)


if __name__ == "__main__":
    import os

    base = r"C:\Users\alber\Desktop\sersan-v2-main\public\founders"
    args = sys.argv[1:] or [
        os.path.join(base, "alessandro-headshot.webp"),
        os.path.join(base, "michele-headshot.webp"),
        os.path.join(base, "mattia-headshot.webp"),
    ]
    ms = [measure(p, os.path.basename(p)) for p in args]
    print(f"{'portrait':<28}{'cells':>8}{'meanInk':>10}{'hX':>9}{'hY':>9}")
    for m in ms:
        print(
            f"{m['label']:<28}{m['cells']:>8}{m['mean_ink']:>10.4f}"
            f"{m['hx']:>9.2f}{m['hy']:>9.2f}   bg={np.round(m['bg'],4)}"
        )
    if len(ms) >= 2:
        ab = union(ms[0], ms[1])
        print(f"\nA+B union   = {ab:>7}  (browser-norm {ab*BROWSER_FACTOR:.0f})"
              f"  stride={stride_for(round(ab*BROWSER_FACTOR))}")
    if len(ms) >= 3:
        abc = union(*ms[:3])
        print(f"A+B+C union = {abc:>7}  (browser-norm {abc*BROWSER_FACTOR:.0f})"
              f"  stride={stride_for(round(abc*BROWSER_FACTOR))}")
