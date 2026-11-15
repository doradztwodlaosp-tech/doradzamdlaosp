"""Wycięcie wozu ze zdjęcia z boku (ręczny obrys + koła jako okręgi). Wynik: PNG z przezroczystością."""
import sys
from PIL import Image, ImageDraw, ImageFilter

OFF = 400  # obrys podany we współrzędnych przycięcia (y_c), dodajemy przesunięcie
OBRYS = [
    (190, 168), (200, 150), (660, 150), (660, 100), (1990, 100), (1990, 128), (1940, 130), (1925, 172),
    (1925, 660), (1922, 700), (1900, 722), (1976, 770), (1972, 795), (1900, 778), (1832, 765), (1830, 712),
    (1615, 770), (1612, 862), (1575, 862), (1575, 736), (1250, 736), (890, 736),
    (885, 766), (832, 766), (828, 724), (535, 724), (290, 700),
    (176, 700), (135, 690), (125, 600), (135, 560), (150, 540), (143, 430), (165, 330), (180, 200),
]
KOLA = [((407, 712), 124), ((1410, 742), 135)]


def wytnij(zrodlo, wyjscie, tlo=None):
    im = Image.open(zrodlo).convert("RGB")
    m = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(m)
    d.polygon([(x, y + OFF) for x, y in OBRYS], fill=255)
    for (cx, cy), r in KOLA:
        d.ellipse((cx - r, cy + OFF - r, cx + r, cy + OFF + r), fill=255)
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
