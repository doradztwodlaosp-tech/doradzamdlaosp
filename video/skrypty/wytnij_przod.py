"""Wycięcie wozu ze zdjęcia z przodu pod kątem (ręczny obrys we współrzędnych oryginału)."""
import sys
from PIL import Image, ImageDraw, ImageFilter

OBRYS = [
    (228, 684), (400, 657), (560, 643), (655, 620), (745, 625), (790, 612), (835, 668), (845, 690), (940, 698), (1040, 690),
    (1400, 835), (1450, 872), (1447, 1100), (1441, 1215), (1415, 1250), (1382, 1265), (1382, 1330), (1362, 1386),
    (1320, 1396), (1285, 1386), (1265, 1340), (1205, 1346), (1182, 1395), (1120, 1415), (1115, 1472), (1040, 1478),
    (1008, 1420), (1005, 1500), (940, 1610), (880, 1600), (815, 1500), (810, 1500), (700, 1492), (560, 1482),
    (440, 1466), (350, 1460), (250, 1450), (165, 1415), (168, 1232), (170, 1130), (205, 1100), (233, 1000), (236, 800),
]
ELIPSY = [((915, 1447), 100, 168)]


def wytnij(zrodlo, wyjscie, tlo=None):
    im = Image.open(zrodlo).convert("RGB")
    m = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(m)
    d.polygon(OBRYS, fill=255)
    for (cx, cy), rx, ry in ELIPSY:
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1.2))
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
