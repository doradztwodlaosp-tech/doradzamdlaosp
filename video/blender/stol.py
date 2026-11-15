"""Stół w Blenderze: księgi ustaw, złote monety, hełm i pieczątka na drewnianym blacie.

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
    random.seed(7)
    obraz = Image.new("RGB", (2048, 2048), "#B88A5B")
    d = ImageDraw.Draw(obraz)
    n = 8
    h = 2048 // n
    for i in range(n):
        k = 0.82 + random.random() * 0.3
        kolor = tuple(int(c * k) for c in (190, 148, 104))
        d.rectangle((0, i * h, 2048, (i + 1) * h), fill=kolor)
        for _ in range(70):
            y0 = i * h + random.random() * h
            ciemny = random.random() > 0.5
            col = (70, 44, 24) if ciemny else (226, 188, 140)
            pts = [(x, y0 + math.sin(x / 190 + random.random() * 0.2 + i) * 6) for x in range(0, 2049, 64)]
            d.line(pts, fill=col, width=random.choice([1, 2, 2, 3]))
        d.rectangle((0, i * h, 2048, i * h + 4), fill=(80, 54, 32))
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

# pieczątka
bpy.ops.object.empty_add(location=(-1.0, 1.6, 0))
piecz = bpy.context.object
piecz.name = "pieczatka"
czesci_p = [
    kostka("p-podstawa", (0.9, 0.5, 0.14), (-1.0, 1.6, 0.07), M["czarny"], 0.04),
    wal("p-trzonek", 0.1, 0.35, (-1.0, 1.6, 0.31), M["drewno"], fz=0.01),
    kostka("p-gala", (0.22, 0.22, 0.2), (-1.0, 1.6, 0.56), M["drewno"], 0.07),
]
for c in czesci_p:
    c.parent = piecz
    c.matrix_parent_inverse = piecz.matrix_world.inverted()

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

kd = bpy.data.cameras.new("kamera")
kd.lens = 55
kd.sensor_fit = "HORIZONTAL"
kd.sensor_width = 36
kd.dof.use_dof = True
kd.dof.aperture_fstop = 4.0
kam = bpy.data.objects.new("kamera", kd)
sc.collection.objects.link(kam)
sc.camera = kam
fokus = bpy.data.objects.new("fokus", None)
sc.collection.objects.link(fokus)
kd.dof.focus_object = fokus


def gladko(t):
    t = max(0.0, min(1.0, t))
    return t * t * t * (t * (6 * t - 15) + 10)


def klatka(k):
    t = k / 149
    # księga 2 opada spokojnie na księgę 1 (klatki 12–70)
    s = gladko((k - 12) / 58)
    ksiega2.location = (0.05 + (1 - s) * 0.1, (1 - s) * 0.55, 0.26 + (1 - s) * 0.55)
    ksiega2.rotation_euler = (0, 0, math.radians(-6 + (1 - s) * 7))
    # kamera: powolny półokrąg i łagodny najazd
    w = gladko(t)
    kat = math.radians(-18 + 30 * w)
    odl = 5.8 - 1.0 * w
    wys = 4.6 - 0.9 * w
    kam.location = (math.sin(kat) * odl, -math.cos(kat) * odl, wys)
    cel = Vector((0.15 + 0.55 * w, -0.4, 0.2))
    fokus.location = cel
    kam.rotation_euler = (cel - Vector(kam.location)).to_track_quat("-Z", "Y").to_euler()


def render(k, sciezka):
    klatka(k)
    sc.render.filepath = sciezka
    sc.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)


os.makedirs(os.path.dirname(a.wyjscie) or ".", exist_ok=True)
if a.klatka is not None:
    render(a.klatka, a.wyjscie)
else:
    for k in range(a.od, a.do + 1):
        if os.path.exists(a.wyjscie % k):
            continue  # wznowienie po przerwie: gotowe klatki pomijamy
        render(k, a.wyjscie % k)
        print("klatka", k, flush=True)
