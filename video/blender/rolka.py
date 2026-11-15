"""Rolka „Strażak ochotnik” w Blenderze: stół z wozem, księgami ustaw, hełmem, dokumentami i monetami.
Kamera przelatuje między stacjami zgodnie z czasami scen z pliku odcinka (public/odcinki/<odcinek>/odcinek.json).

Użycie (z folderu video/, pakiet bpy w środowisku Pythona):
  python blender/stol.py --klatka 100 --wyjscie out/blender/stol.png
  python blender/stol.py --od 0 --do 149 --wyjscie out/blender/stol-%04d.png --szer 720 --wys 1280

Okładki i blat rysuje Pillow (czcionka marki w blender/zasoby), reszta to bryły z fazkami,
materiały fizyczne i miękkie światło studyjne. Render: Cycles na procesorze + odszumianie.
"""
import argparse
import math
import os
import random
import sys

import bpy
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFont

KATALOG = os.path.dirname(os.path.abspath(__file__))
TEKSTURY = os.path.join(KATALOG, "zasoby", "wygenerowane")
os.makedirs(TEKSTURY, exist_ok=True)

p = argparse.ArgumentParser()
p.add_argument("--klatka", type=int, default=None)
p.add_argument("--od", type=int, default=0)
p.add_argument("--do", type=int, default=149)
p.add_argument("--wyjscie", default="out/blender/stol.png")
p.add_argument("--szer", type=int, default=1080)
p.add_argument("--wys", type=int, default=1920)
p.add_argument("--probki", type=int, default=48)
p.add_argument("--odcinek", default="kim-jest-strazak")
p.add_argument("--fps", type=int, default=15, help="klatki renderowane na sekundę (resztę dorabia ffmpeg)")
a = p.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:])

ZLOTO = "#DAA73C"
INK = "#23242A"

# ───────────── Tekstury (Pillow) ─────────────
LATIN = os.path.join(KATALOG, "zasoby", "montserrat.ttf")
EXT = os.path.join(KATALOG, "zasoby", "montserrat-ext.ttf")


def czcionka(rozmiar, waga=800, znak="a"):
    sciezka = LATIN if ord(znak) < 0x100 else EXT
    f = ImageFont.truetype(sciezka, rozmiar)
    try:
        f.set_variation_by_axes([waga])
    except Exception:
        pass
    return f


def tekst(d, xy, napis, rozmiar, kolor, waga=800, wysrodkuj=True):
    """Rysuje tekst znak po znaku (litery polskie są w osobnym pliku czcionki)."""
    szer = [d.textlength(z, font=czcionka(rozmiar, waga, z)) for z in napis]
    x, y = xy
    x0 = x - sum(szer) / 2 if wysrodkuj else x
    for z, w in zip(napis, szer):
        d.text((x0, y), z, font=czcionka(rozmiar, waga, z), fill=kolor)
        x0 += w


def okladka(nazwa, gora, tytul, dol):
    obraz = Image.new("RGB", (1000, 1400), "#24262E")
    d = ImageDraw.Draw(obraz)
    d.rectangle((60, 60, 940, 1340), outline=ZLOTO, width=7)
    d.rectangle((84, 84, 916, 1316), outline=ZLOTO, width=2)
    tekst(d, (500, 200), gora, 44, ZLOTO, 700)
    d.rectangle((420, 270, 580, 275), fill=ZLOTO)
    rozmiar = 96
    while max(sum(d.textlength(z, font=czcionka(rozmiar, 800, z)) for z in l) for l in tytul) > 780 and rozmiar > 36:
        rozmiar -= 2
    y = 520
    for l in tytul:
        tekst(d, (500, y), l, rozmiar, "#F3F1EC", 800)
        y += int(rozmiar * 1.35)
    tekst(d, (500, 1190), dol, 40, "#CBCBD3", 600)
    sciezka = os.path.join(TEKSTURY, nazwa + ".png")
    obraz.save(sciezka)
    return sciezka


def blat():
    """Drewniany blat z desek: drobne słoje, spokojny kontrast, delikatne łączenia."""
    from PIL import ImageFilter

    random.seed(11)
    R = 2048
    n = 6
    h = R // n
    obraz = Image.new("RGB", (R, R), (170, 132, 98))
    d = ImageDraw.Draw(obraz, "RGBA")
    for i in range(n):
        k = 0.9 + random.random() * 0.2
        kolor = tuple(int(c * k) for c in (170, 132, 98))
        d.rectangle((0, i * h, R, (i + 1) * h), fill=kolor)
        for _ in range(320):
            y0 = i * h + random.random() * h
            amp = random.random() * 5
            faza = random.random() * 6
            dl = random.randint(300, 1400)
            x0 = random.randint(-200, R)
            ciemny = random.random() > 0.45
            kol = (96, 62, 34, random.randint(10, 26)) if ciemny else (230, 196, 150, random.randint(8, 18))
            pts = [(x, y0 + math.sin(x / 150 + faza) * amp) for x in range(x0, x0 + dl, 48)]
            if len(pts) > 1:
                d.line(pts, fill=kol, width=1)
        d.rectangle((0, i * h, R, i * h + 2), fill=(90, 60, 36, 150))
    obraz = obraz.filter(ImageFilter.GaussianBlur(0.9))
    sciezka = os.path.join(TEKSTURY, "blat.png")
    obraz.save(sciezka)
    return sciezka


T = {
    "stow": okladka("stow", "USTAWA", ["PRAWO", "O STOWARZYSZENIACH"], "z 7 kwietnia 1989 r."),
    "osp": okladka("osp", "USTAWA", ["O OCHOTNICZYCH", "STRAŻACH", "POŻARNYCH"], "z 17 grudnia 2021 r."),
    "blat": blat(),
}

# ───────────── Scena i materiały ─────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = a.probki
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = a.szer, a.wys
sc.render.fps = 30
sc.view_settings.view_transform = "Khronos PBR Neutral"


def C(h):
    return tuple(int(h[i : i + 2], 16) / 255 for i in (1, 3, 5)) + (1,)


def mat(nazwa, kolor, chrop=0.5, metal=0.0, lakier=0.0, tekstura=None, emisja=None):
    m = bpy.data.materials.new(nazwa)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = C(kolor)
    b.inputs["Roughness"].default_value = chrop
    b.inputs["Metallic"].default_value = metal
    if lakier:
        b.inputs["Coat Weight"].default_value = lakier
        b.inputs["Coat Roughness"].default_value = 0.06
    if emisja:
        b.inputs["Emission Color"].default_value = C(emisja[0])
        b.inputs["Emission Strength"].default_value = emisja[1]
    if tekstura:
        t = m.node_tree.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(tekstura)
        t.image.colorspace_settings.name = "sRGB"
        m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    return m


M = {
    "oprawa": mat("oprawa", "#1F2128", 0.55, 0.0, 0.0),
    "kartki": mat("kartki", "#EDE6D6", 0.9),
    "stow": mat("okl-stow", "#FFFFFF", 0.6, 0, 0.0, T["stow"]),
    "osp": mat("okl-osp", "#FFFFFF", 0.6, 0, 0.0, T["osp"]),
    "zloto": mat("zloto", ZLOTO, 0.22, 1.0),
    "blat": mat("blat", "#FFFFFF", 0.5, 0, 0.15, T["blat"]),
    "lakier": mat("hełm", "#5C0705", 0.25, 0.0, 0.6),
    "przylbica": mat("przyłbica", "#D9A63C", 0.12, 1.0),
    "guma": mat("guma", "#15161A", 0.8),
    "odblask": mat("odblask", "#E6E8EC", 0.25, 0.9),
    "drewno": mat("drewno", "#6B4429", 0.45, 0, 0.3),
    "czarny": mat("czarny", "#17181C", 0.35, 0.3),
    "guma_czarna": mat("guma-czarna", "#0F1013", 0.9),
    "tusz": mat("tusz", "#8A1410", 0.45),
}


def faza(o, szer=0.02, seg=4):
    w = o.modifiers.new("fazka", "BEVEL")
    w.width = szer
    w.segments = seg
    w.limit_method = "ANGLE"


def kostka(nazwa, rozm, poz, material, fz=0.02, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=poz, rotation=rot)
    o = bpy.context.object
    o.name = nazwa
    o.scale = rozm
    bpy.ops.object.transform_apply(scale=True)
    if fz:
        faza(o, fz)
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o


def wal(nazwa, r, d, poz, material, rot=(0, 0, 0), fz=0.0, seg=64):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=poz, rotation=rot, vertices=seg)
    o = bpy.context.object
    o.name = nazwa
    if fz:
        faza(o, fz, 3)
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o


def ksiega(nazwa, poz, okl, grub=0.26, rot_z=0.0):
    """Księga: oprawa, blok kartek, okładka z napisem i złota zakładka. Zwraca obiekt-rodzica."""
    bpy.ops.object.empty_add(location=poz, rotation=(0, 0, rot_z))
    r = bpy.context.object
    r.name = nazwa
    px, py, pz = poz
    czesci = [
        kostka(nazwa + "-oprawa", (1.34, 1.84, grub), (px, py, pz + grub / 2), M["oprawa"], 0.035),
        kostka(nazwa + "-kartki", (1.28, 1.76, grub - 0.07), (px + 0.03, py, pz + grub / 2), M["kartki"], 0.01),
    ]
    bpy.ops.mesh.primitive_plane_add(size=1, location=(px, py, pz + grub + 0.0015))
    gora = bpy.context.object
    gora.name = nazwa + "-okladka"
    gora.scale = (1.3, 1.82, 1)
    gora.rotation_euler = (0, 0, 0)
    gora.data.materials.append(okl)
    czesci.append(gora)
    czesci.append(kostka(nazwa + "-zakladka", (0.07, 0.3, 0.012), (px + 0.42, py - 0.98, pz + grub * 0.55), M["zloto"], 0.004))
    for c in czesci:
        c.parent = r
        c.matrix_parent_inverse = r.matrix_world.inverted()
    return r


# ───────────── Obiekty sceny ─────────────
bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 0, 0))
stol = bpy.context.object
stol.data.materials.append(M["blat"])

# mapowanie UV blatu (skala), by słoje były drobne
uv = stol.data.uv_layers.active.data
for petla in uv:
    petla.uv = (petla.uv[0] * 50, petla.uv[1] * 50)

ksiega1 = ksiega("ksiega1", (0.0, 0.0, 0.0), M["stow"], 0.26, math.radians(8))
ksiega2 = ksiega("ksiega2", (0.05, 0.0, 0.26), M["osp"], 0.24, math.radians(-6))

# stosy monet
monety = []
for si, (sx, sy, wysok) in enumerate([(-1.55, -0.95, 9), (-2.05, -0.4, 5), (-1.15, -0.25, 3)]):
    for i in range(wysok):
        m = wal(f"moneta-{si}-{i}", 0.34, 0.07, (sx + random.uniform(-0.012, 0.012), sy + random.uniform(-0.012, 0.012), 0.04 + i * 0.075), M["zloto"], fz=0.01)
        m.rotation_euler[2] = random.random() * 6
        monety.append(m)

# hełm (osobny moduł helm_model.py)
sys.path.insert(0, KATALOG)
from helm_model import zbuduj_helm  # noqa: E402

helm = zbuduj_helm((1.55, -0.95, 0.0), math.radians(-165))
helm.scale = (1.0, 1.0, 1.0)

# pieczątka: gumowa płyta, drewniany korpus z uchwytem i gałką, obok poduszka z czerwonym tuszem
bpy.ops.object.empty_add(location=(0, 0, 0))
piecz = bpy.context.object
piecz.name = "pieczatka"
PX, PY = -1.05, 1.25
czesci_p = [
    kostka("p-guma", (0.78, 0.44, 0.05), (PX, PY, 0.025), M["guma_czarna"], 0.02),
    kostka("p-korpus", (0.7, 0.38, 0.16), (PX, PY, 0.13), M["drewno"], 0.05),
    wal("p-szyjka", 0.085, 0.3, (PX, PY, 0.36), M["drewno"], fz=0.015),
    kostka("p-galka", (0.2, 0.2, 0.16), (PX, PY, 0.58), M["drewno"], 0.075),
    kostka("p-poduszka", (0.7, 0.5, 0.07), (PX + 1.05, PY + 0.05, 0.035), M["czarny"], 0.03),
    kostka("p-tusz", (0.6, 0.4, 0.015), (PX + 1.05, PY + 0.05, 0.072), M["tusz"], 0.006),
]
for c in czesci_p:
    c.parent = piecz
    c.matrix_parent_inverse = piecz.matrix_world.inverted()


# ───────────── Dane odcinka (czasy scen) ─────────────
import json

DANE = json.load(open(os.path.join(KATALOG, "..", "public", "odcinki", a.odcinek, "odcinek.json"), encoding="utf-8"))
WSTEP = DANE.get("wstep", 0.0)
SCENY = DANE["sceny"]
CZAS = [(s["start"] + WSTEP if i else 0.0, s["koniec"] + WSTEP) for i, s in enumerate(SCENY)]

# ───────────── Wóz strażacki (z woz_model.py), pomniejszony ─────────────
sys.path.insert(0, KATALOG)
from woz_model import zbuduj_woz  # noqa: E402

MW = {
    "lakier": mat("w-lakier", "#9A0D09", 0.25, 0.0, 0.6),
    "ciemny": mat("w-ciemny", "#15161A", 0.6),
    "grafit": mat("w-grafit", "#2C2F36", 0.45, 0.4),
    "bialy": mat("w-bialy", "#F2F2EF", 0.4),
    "alu": mat("w-alu", "#C9CCD3", 0.28, 1.0),
    "chrom": mat("w-chrom", "#EDEFF3", 0.1, 1.0),
    "guma": mat("w-guma", "#101010", 0.85),
    "szyba": mat("w-szyba", "#1A2430", 0.05, 0.3, 1.0),
    "swiatlo": mat("w-swiatlo", "#FFFFFF", 0.1, 0, 0, None, ("#FFF3D6", 25)),
    "niebieski": mat("w-niebieski", "#2F6BFF", 0.2, 0, 0, None, ("#2F6BFF", 18)),
    "pomaranczowy": mat("w-pomaranczowy", "#FF9A1F", 0.3, 0, 0, None, ("#FF8A00", 6)),
}


def bryla_w(nazwa, rozm, poz, material, fazka=0.03, rot=(0, 0, 0)):
    return kostka(nazwa, rozm, poz, material, fazka, rot)


def walec_w(nazwa, r, d, poz, material, rot=(0, math.pi / 2, 0), fazka=0.0):
    return wal(nazwa, r, d, poz, material, rot, fazka)


WOZ_POZ = (-4.4, 2.3, 0.0)
woz, woz_koguty, woz_kola = zbuduj_woz(MW, bryla_w, walec_w, WOZ_POZ, -math.pi / 2, 0.3)

# ───────────── Więcej monet (na zdanie o 16 tysiącach jednostek) ─────────────
random.seed(5)
for ix in range(5):
    for iy in range(3):
        sx = -5.2 + ix * 0.62 + random.uniform(-0.08, 0.08)
        sy = -2.3 + iy * 0.62 + random.uniform(-0.08, 0.08)
        for i in range(random.randint(3, 8)):
            m = wal(f"m-{ix}-{iy}-{i}", 0.26, 0.055, (sx, sy, 0.03 + i * 0.058), M["zloto"], fz=0.008, seg=40)
            m.rotation_euler[2] = random.random() * 6

# ───────────── Dokumenty: stos i cztery kartki z napisami ─────────────
def kartka_tekstura(nazwa, linie):
    obraz = Image.new("RGB", (800, 1100), "#F4F0E7")
    d = ImageDraw.Draw(obraz)
    d.rectangle((0, 0, 800, 22), fill=ZLOTO)
    y = 190
    for l in linie:
        rozmiar = 96
        while sum(d.textlength(z, font=czcionka(rozmiar, 800, z)) for z in l) > 660 and rozmiar > 30:
            rozmiar -= 2
        tekst(d, (400, y), l, rozmiar, INK, 800)
        y += int(rozmiar * 1.3)
    for i in range(9):
        d.rectangle((90, 560 + i * 48, 700 if i % 4 != 3 else 440, 572 + i * 48), fill="#B9B4A8")
    d.rectangle((460, 1020, 700, 1024), fill=INK)
    sciezka = os.path.join(TEKSTURY, nazwa + ".png")
    obraz.save(sciezka)
    return sciezka


DX, DY = 3.7, 0.2
random.seed(8)
for i in range(16):
    kostka(f"stos-{i}", (0.95, 1.3, 0.012), (DX + random.uniform(-0.05, 0.05), DY + random.uniform(-0.05, 0.05), 0.01 + i * 0.012), M["kartki"], 0.003, (0, 0, random.uniform(-0.25, 0.25)))
KARTKI = []
for nazwa, linie, (px, py), rz, slowo in [
    ("k-szkolenia", ["SZKOLENIA"], (2.55, -0.85), -0.12, 0),
    ("k-badania", ["BADANIA", "LEKARSKIE"], (4.95, -0.7), 0.1, 1),
    ("k-gotowosc", ["GOTOWOŚĆ"], (2.6, 1.3), 0.08, 2),
    ("k-dokumenty", ["DOKUMENTY"], (4.9, 1.2), -0.1, 3),
]:
    mk = mat(nazwa, "#FFFFFF", 0.85, 0, 0, kartka_tekstura(nazwa, linie))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(px, py, 0.012))
    k = bpy.context.object
    k.name = nazwa
    k.scale = (0.8, 1.1, 1)
    k.rotation_euler = (0, 0, rz)
    k.data.materials.append(mk)
    KARTKI.append((k, (px, py), slowo))

# ───────────── Światło i kamera ─────────────
sw = bpy.data.worlds.new("swiat")
sc.world = sw
sw.use_nodes = True
sw.node_tree.nodes["Background"].inputs["Color"].default_value = C("#EDE5D6")
sw.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.3


def swiatlo(nazwa, poz, energia, rozmiar, kolor="#FFFFFF", cel=(0, 0, 0.3)):
    d = bpy.data.lights.new(nazwa, "AREA")
    d.energy, d.size = energia, rozmiar
    d.color = C(kolor)[:3]
    o = bpy.data.objects.new(nazwa, d)
    sc.collection.objects.link(o)
    o.location = poz
    o.rotation_euler = (Vector(cel) - Vector(poz)).to_track_quat("-Z", "Y").to_euler()


swiatlo("klucz", (4, -5, 7), 1700, 3, "#FFF0D8")
swiatlo("wypelnienie", (-6, -2, 4), 400, 6, "#FFE9CC")
swiatlo("kontur", (0, 7, 5), 500, 4, "#FFE3B8")


swiatlo("klucz", (4, -5, 7), 1100, 3, "#FFF0D8")
swiatlo("wypelnienie", (-6, -2, 4), 300, 6, "#FFE9CC")
swiatlo("kontur", (0, 7, 5), 350, 4, "#FFE3B8")
swiatlo("lewe", (-7, -3, 6), 550, 4, "#FFF0D8", (-4, 0.5, 0.3))
swiatlo("prawe", (7, -3, 6), 450, 4, "#FFF0D8", (3.7, 0.3, 0.2))

kd = bpy.data.cameras.new("kamera")
kd.lens = 55
kd.sensor_fit = "HORIZONTAL"
kd.sensor_width = 36
kd.dof.use_dof = True
kd.dof.aperture_fstop = 4.5
kam = bpy.data.objects.new("kamera", kd)
sc.collection.objects.link(kam)
sc.camera = kam
fokus = bpy.data.objects.new("fokus", None)
sc.collection.objects.link(fokus)
kd.dof.focus_object = fokus


def gladko(t):
    t = max(0.0, min(1.0, t))
    return t * t * t * (t * (6 * t - 15) + 10)


# ───────────── Stacje kamery (po jednej na scenę odcinka) ─────────────
# (cel, kąt w stopniach, odległość, wysokość)
WZ = Vector(WOZ_POZ)
STACJE = [
    ((-0.6, 0.2, 0.3), -8, 9.8, 6.6),   # 0 widok ogólny (hasło-hak, scena „Nie tylko remiza i wóz” zaczyna od wozu)
    ((WZ.x, WZ.y, 0.55), 18, 4.6, 2.6),  # 1 wóz
    ((0.0, 0.0, 0.15), -14, 5.2, 4.2),   # 2 księga o stowarzyszeniach
    ((0.1, 0.0, 0.3), 12, 4.5, 3.7),     # 3 druga księga opada
    ((1.55, -0.95, 0.4), 22, 4.7, 2.9),  # 4 hełm
    ((3.7, 0.2, 0.1), 0, 5.2, 4.8),      # 5 dokumenty
    ((-3.3, -0.9, 0.3), -22, 6.0, 3.8),  # 6 monety
    ((WZ.x, WZ.y, 0.6), 48, 4.0, 2.0),   # 7 wóz z drugiej strony
    ((-0.5, 0.9, 0.3), -6, 4.8, 3.8),    # 8 pieczątka i księgi
    ((-0.4, 0.2, 0.3), 5, 9.0, 6.2),     # 9 widok ogólny na koniec
]
# stacja dla każdej sceny odcinka (indeks sceny → indeks stacji); scena 0 zaczyna od widoku ogólnego, a wóz w jej drugiej połowie
SCENA_STACJA = [1, 2, 3, 4, 5, 6, 7, 8, 9]
KLUCZE = [(0.0, STACJE[0])] + [(CZAS[i][0] - 0.2, STACJE[SCENA_STACJA[i]]) for i in range(len(SCENA_STACJA))]
KLUCZE[1] = (0.9, KLUCZE[1][1])  # po hasle-haku od razu najazd na wóz


def stan(i, t):
    t0, (cel, kat, odl, wys) = KLUCZE[i]
    h = gladko((t - t0 - 1.5) / 7.0)
    docel = (Vector(cel), kat + 5 * h, odl * (1 - 0.07 * h), wys * (1 - 0.04 * h))
    if i == 0:
        return docel
    p = gladko((t - t0) / 2.2)
    if p >= 1:
        return docel
    a = stan(i - 1, t0)
    return (a[0].lerp(docel[0], p), a[1] + (docel[1] - a[1]) * p, a[2] + (docel[2] - a[2]) * p, a[3] + (docel[3] - a[3]) * p)


def klatka(t):
    # kamera
    idx = 0
    for j, (tj, _) in enumerate(KLUCZE):
        if t >= tj:
            idx = j
    cel, kat, odl, wys = stan(idx, t)
    kr = math.radians(kat)
    kam.location = (cel.x + math.sin(kr) * odl, cel.y - math.cos(kr) * odl, wys)
    fokus.location = cel
    kam.rotation_euler = (cel - Vector(kam.location)).to_track_quat("-Z", "Y").to_euler()
    # druga księga opada na pierwszą w scenie „własna ustawa”
    t_dr = CZAS[2][0] + 0.5
    s = gladko((t - t_dr) / 1.7)
    ksiega2.location = (0.05 + (1 - s) * 0.1, (1 - s) * 0.55, 0.26 + (1 - s) * 0.6)
    ksiega2.rotation_euler = (0, 0, math.radians(-6 + (1 - s) * 7))
    ksiega2.hide_render = s <= 0.0
    # hełm obraca się w scenie o uprawnieniach
    a0, a1 = CZAS[3]
    helm.rotation_euler = (0, 0, math.radians(-165 + 190 * gladko((t - a0) / (a1 - a0))))
    # kartki z obowiązkami wsuwają się na słowa (równomiernie w scenie o obowiązkach)
    b0, b1 = CZAS[4]
    for k, (obj, (px, py), nr) in enumerate(KARTKI):
        t_k = b0 + 0.9 + nr * (b1 - b0 - 1.4) / 4
        q = gladko((t - t_k) / 1.3)
        obj.hide_render = q <= 0.0
        obj.location = (px, py - (1 - q) * 0.5, 0.012 + (1 - q) * 0.3)
    # pieczątka opuszcza się raz w scenie „My pilnujemy prawa”
    c0 = CZAS[7][0] + 1.0
    nacisk = gladko((t - c0) / 0.5) - gladko((t - c0 - 0.6) / 0.6)
    piecz.location = (0, 0, 0.35 * nacisk)
    # koła i koguty
    woz_kola_obrot = -(t * 0.6)
    for o in woz_kola:
        o.rotation_euler[0] = woz_kola_obrot
    jasn = 0.5 + 0.5 * math.sin(t * math.tau * 0.5)
    for kg in woz_koguty:
        kg.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 6 + 22 * jasn


def render(i, sciezka):
    klatka(i / a.fps)
    sc.render.filepath = sciezka
    sc.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)


KONIEC = CZAS[8][1] + 0.4
LICZBA = int(KONIEC * a.fps) + 1

os.makedirs(os.path.dirname(a.wyjscie) or ".", exist_ok=True)
if a.klatka is not None:
    render(a.klatka, a.wyjscie)
else:
    do = min(a.do, LICZBA - 1)
    print("klatek razem:", LICZBA, flush=True)
    for i in range(a.od, do + 1):
        if os.path.exists(a.wyjscie % i):
            continue  # wznowienie po przerwie
        render(i, a.wyjscie % i)
        print("klatka", i, flush=True)
