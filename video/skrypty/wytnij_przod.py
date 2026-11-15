"""Wycięcie wozu ze zdjęcia z przodu pod kątem (ręczny obrys we współrzędnych oryginału)."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OBRYS = [
    (228, 684), (400, 654), (560, 641), (652, 640), (660, 652), (735, 652), (742, 640), (748, 628), (760, 619), (778, 621),
    (788, 640), (800, 642), (832, 655), (847, 675), (852, 692), (940, 702), (1040, 692), (1400, 835), (1443, 872),
    (1443, 1200), (1432, 1235), (1415, 1252), (1384, 1262), (1382, 1330), (1362, 1386), (1320, 1396), (1285, 1386),
    (1265, 1340), (1205, 1346), (1182, 1395), (1120, 1415), (1115, 1472), (1040, 1478), (1008, 1420), (1005, 1500),
    (940, 1610), (880, 1600), (815, 1500), (800, 1505), (700, 1498), (620, 1490), (540, 1478), (470, 1465), (400, 1456),
    (330, 1452), (265, 1450), (215, 1445), (185, 1425), (173, 1400), (176, 1232), (178, 1130), (205, 1100), (233, 1000),
    (236, 820), (210, 806), (222, 785), (240, 762), (235, 720),
]
ELIPSY = [((915, 1447), 100, 168)]


def _kmeans(px, k=8, it=8, seed=1):
    rng = np.random.default_rng(seed)
    c = px[rng.choice(len(px), k, replace=False)].astype(float)
    for _ in range(it):
        d = ((px[:, None, :] - c[None]) ** 2).sum(-1)
        l = d.argmin(1)
        for j in range(k):
            if (l == j).any():
                c[j] = px[l == j].mean(0)
    return c


def doprecyzuj(im, m0, promien=16):
    """Doprecyzowanie krawędzi: w pasie wokół obrysu piksel dostaje etykietę wozu lub tła
    według podobieństwa koloru do wnętrza wozu (k-średnich) i do tła z zewnątrz."""
    a = np.array(im).astype(float)
    k = 2 * promien + 1
    wew = m0.filter(ImageFilter.MinFilter(k))
    zew = m0.filter(ImageFilter.MaxFilter(k))
    fg_core = np.array(wew) > 128
    bg_core = np.array(zew) < 128
    rng = np.random.default_rng(2)
    fy, fx = np.where(fg_core)
    by, bx = np.where(bg_core)
    fi = rng.choice(len(fy), 8000, replace=False)
    bi = rng.choice(len(by), 8000, replace=False)
    cf = _kmeans(a[fy[fi], fx[fi]], 10)
    cb = _kmeans(a[by[bi], bx[bi]], 10)
    pas = (~fg_core) & (~bg_core)
    py, px_ = np.where(pas)
    P = a[py, px_]
    df = ((P[:, None, :] - cf[None]) ** 2).sum(-1).min(1)
    db = ((P[:, None, :] - cb[None]) ** 2).sum(-1).min(1)
    # w pasie preferuj stronę obrysu: piksele wewnątrz obrysu są „tańsze" jako wóz
    wewnatrz = np.array(m0)[py, px_] > 128
    bonus = np.where(wewnatrz, 0.75, 1.35)
    etykieta = df * bonus < db
    wynik = fg_core.copy()
    wynik[py, px_] = etykieta
    mm = Image.fromarray((wynik * 255).astype("uint8"))
    mm = mm.filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    return mm


def wytnij(zrodlo, wyjscie, tlo=None, precyzuj=False):
    im = Image.open(zrodlo).convert("RGB")
    m = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(m)
    d.polygon(OBRYS, fill=255)
    for (cx, cy), rx, ry in ELIPSY:
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    if precyzuj:
        m = doprecyzuj(im, m)
    m = m.filter(ImageFilter.GaussianBlur(1.0))
    rgba = im.copy()
    rgba.putalpha(m)
    box = m.point(lambda v: 255 if v > 8 else 0).getbbox()
    rgba = rgba.crop(box)
    rgba.save(wyjscie)
    if tlo:
        bg = Image.new("RGB", rgba.size, tlo)
        bg.paste(rgba, mask=rgba.split()[3])
        bg.save(wyjscie.replace(".png", "-test.png"))
    return box


if __name__ == "__main__":
    print(wytnij(sys.argv[1], sys.argv[2], (255, 0, 255)))
