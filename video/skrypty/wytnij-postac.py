"""Wycina pozy postaci z arkusza na białym tle i zapisuje je jako PNG z przezroczystym tłem.

Użycie:
  python3 skrypty/wytnij-postac.py <arkusz.jpg> <folder_wyjsciowy> nazwa:x,y,szer,wys [nazwa:x,y,szer,wys ...]
Tło usuwane jest „wiadrem z farbą” od krawędzi kadru – białe elementy w środku postaci (np. oczy) zostają.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ZNACZNIK = (255, 0, 255)


def zamkniete_dziury(rgb: np.ndarray, tlo: np.ndarray) -> np.ndarray:
    """Białe plamy otoczone postacią (dziury w paragrafie, przerwy przy rękach) – też są tłem.
    Białka oczu zostają: leżą w górnej części kadru (powyżej ok. 36% wysokości), niżej każda biała plama to tło."""
    h = rgb.shape[0]
    biale = (rgb.min(axis=-1) > 228) & ~tlo
    obraz = Image.fromarray((biale * 255).astype(np.uint8), "L")
    wynik = np.zeros_like(biale)
    odwiedzone = np.zeros_like(biale)
    for y, x in zip(*np.nonzero(biale)):
        if odwiedzone[y, x]:
            continue
        kopia = obraz.copy()
        ImageDraw.floodfill(kopia, (int(x), int(y)), 128)
        plama = np.asarray(kopia) == 128
        odwiedzone |= plama
        ys = np.nonzero(plama)[0]
        if ys.min() > 0.36 * h and len(ys) >= 40:
            wynik |= plama
    return wynik


def wytnij(obraz: Image.Image, ramka: tuple[int, int, int, int]) -> Image.Image:
    x, y, w, h = ramka
    kadr = obraz.crop((x, y, x + w, y + h)).convert("RGB")
    zalane = kadr.copy()
    # Zalewamy tło od każdego jasnego piksela na krawędzi kadru
    for px in range(w):
        for py in (0, h - 1):
            if min(zalane.getpixel((px, py))) > 200:
                ImageDraw.floodfill(zalane, (px, py), ZNACZNIK, thresh=42)
    for py in range(h):
        for px in (0, w - 1):
            if min(zalane.getpixel((px, py))) > 200:
                ImageDraw.floodfill(zalane, (px, py), ZNACZNIK, thresh=42)
    tlo = np.all(np.asarray(zalane) == ZNACZNIK, axis=-1)
    tlo |= zamkniete_dziury(np.asarray(kadr).astype(int), tlo)
    # Jasnoszary cień na podłodze pod butami (dolne 12% kadru) też jest tłem
    rgb = np.asarray(kadr).astype(int)
    szary = (rgb.max(axis=-1) - rgb.min(axis=-1) < 28) & (rgb.min(axis=-1) > 110)
    szary[: int(h * 0.88)] = False
    tlo |= szary
    maska = Image.fromarray(np.where(tlo, 0, 255).astype(np.uint8), "L")
    # Zjadamy 1 px białej obwódki z kompresji JPG i lekko wygładzamy krawędź
    maska = maska.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
    kadr.putalpha(maska)
    # Przycinamy do zawartości
    return kadr.crop(maska.getbbox())


def main() -> None:
    arkusz, folder, *pozy = sys.argv[1:]
    obraz = Image.open(arkusz)
    Path(folder).mkdir(parents=True, exist_ok=True)
    for opis in pozy:
        nazwa, liczby = opis.split(":")
        ramka = tuple(int(v) for v in liczby.split(","))
        wynik = wytnij(obraz, ramka)
        wynik.save(Path(folder) / f"{nazwa}.png")
        print(f"{nazwa}.png  {wynik.width}×{wynik.height}")


if __name__ == "__main__":
    main()
