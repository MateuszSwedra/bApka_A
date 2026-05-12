"""Usuwa jasne tło / siatkę z grafik welcome-*.png (PNG z alpha).

Heurystyka: piksele bardzo jasne i mało nasycone (papier, siatka)
oraz bliskie kremowemu #F9F3EF -> alpha 0. Lekkie rozmycie maski (3x3)
żeby krawędzie nie były poszarpane.
"""
from __future__ import annotations

import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "frontend", "assets", "images")
FILES = ["welcome-senior.png", "welcome-phone.png", "welcome-chart.png"]

LUM_MIN = 175.0
CHROMA_MAX = 52.0
CREAM = np.array([249.0, 243.0, 239.0])
CREAM_DIST = 42.0
# Jednolite ciemne tło (np. czarne z generatora) — nie zjada kolorów marki (#1B3C53 ma lum ~56).
LUM_DARK_MAX = 34.0
CHROMA_DARK_MAX = 40.0


def process_file(path: str) -> None:
    img = Image.open(path).convert("RGBA")
    arr = np.asarray(img, dtype=np.float32)
    r, g, b, a_in = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn
    lum = (r + g + b) / 3.0
    dr = r - CREAM[0]
    dg = g - CREAM[1]
    db = b - CREAM[2]
    dist_cream = np.sqrt(dr * dr + dg * dg + db * db)

    is_bg = (lum >= LUM_MIN) & (chroma <= CHROMA_MAX)
    is_bg |= dist_cream <= CREAM_DIST
    is_bg |= (lum <= LUM_DARK_MAX) & (chroma <= CHROMA_DARK_MAX)

    h, w = is_bg.shape
    soft = is_bg.astype(np.float32)
    padded = np.pad(soft, 1, mode="edge")
    blurred = (
        padded[0:h, 0:w]
        + padded[0:h, 1 : w + 1]
        + padded[0:h, 2 : w + 2]
        + padded[1 : h + 1, 0:w]
        + padded[1 : h + 1, 1 : w + 1]
        + padded[1 : h + 1, 2 : w + 2]
        + padded[2 : h + 2, 0:w]
        + padded[2 : h + 2, 1 : w + 1]
        + padded[2 : h + 2, 2 : w + 2]
    ) / 9.0
    feather = np.clip(blurred, 0, 1)

    alpha_out = (1.0 - feather) * 255.0
    alpha_out = np.clip(alpha_out, 0, 255).astype(np.uint8)
    alpha_out = np.minimum(alpha_out, a_in.astype(np.uint8))

    out = np.stack(
        [
            np.clip(r, 0, 255).astype(np.uint8),
            np.clip(g, 0, 255).astype(np.uint8),
            np.clip(b, 0, 255).astype(np.uint8),
            alpha_out,
        ],
        axis=2,
    )
    tmp = path + ".tmp.png"
    Image.fromarray(out, "RGBA").save(tmp, format="PNG", compress_level=6)
    os.replace(tmp, path)
    print("OK", path, os.path.getsize(path), "bytes")


def main() -> None:
    for name in FILES:
        path = os.path.join(ASSETS, name)
        if not os.path.isfile(path):
            print("skip (missing)", path)
            continue
        process_file(path)


if __name__ == "__main__":
    main()
