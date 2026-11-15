"""Wóz strażacki w Blenderze (bpy): modelowanie, materiały, studyjne światło, kamera okrążająca.

Użycie (z folderu video/):
  python blender/woz.py --klatka 0 --wyjscie out/blender/woz.png           # jedna klatka
  python blender/woz.py --od 0 --do 149 --wyjscie out/blender/woz-%04d.png # sekwencja

Wymaga pakietu bpy (pip install bpy). Render: Cycles na procesorze + odszumianie.
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument("--klatka", type=int, default=None)
p.add_argument("--od", type=int, default=0)
p.add_argument("--do", type=int, default=149)
p.add_argument("--wyjscie", default="out/blender/woz.png")
p.add_argument("--szer", type=int, default=1080)
p.add_argument("--wys", type=int, default=1920)
p.add_argument("--probki", type=int, default=64)
a = p.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:])

# ───────────── Scena ─────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = a.probki
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = a.szer, a.wys
sc.render.fps = 30
sc.render.film_transparent = True  # przezroczyste tło: wóz i jego cień kładziemy na tle marki w Remotion
sc.render.image_settings.color_mode = "RGBA"
sc.frame_start, sc.frame_end = 0, 149
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - High Contrast"

C = lambda h: tuple(int(h[i : i + 2], 16) / 255 for i in (1, 3, 5)) + (1,)


def mat(nazwa, kolor, chropowatosc=0.5, metal=0.0, lakier=0.0, emisja=None):
    m = bpy.data.materials.new(nazwa)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = C(kolor)
    b.inputs["Roughness"].default_value = chropowatosc
    b.inputs["Metallic"].default_value = metal
    if lakier:
        b.inputs["Coat Weight"].default_value = lakier
        b.inputs["Coat Roughness"].default_value = 0.05
    if emisja:
        b.inputs["Emission Color"].default_value = C(emisja[0])
        b.inputs["Emission Strength"].default_value = emisja[1]
    return m


M = {
    "lakier": mat("lakier", "#6E0705", 0.22, 0.0, 1.0),
    "ciemny": mat("ciemny", "#15161A", 0.6),
    "grafit": mat("grafit", "#2C2F36", 0.45, 0.4),
    "bialy": mat("bialy", "#F2F2EF", 0.4),
    "alu": mat("alu", "#C9CCD3", 0.28, 1.0),
    "chrom": mat("chrom", "#EDEFF3", 0.1, 1.0),
    "guma": mat("guma", "#101010", 0.85),
    "szyba": mat("szyba", "#1A2430", 0.05, 0.3, 1.0),
    "swiatlo": mat("swiatlo", "#FFFFFF", 0.1, 0, 0, ("#FFF3D6", 25)),
    "niebieski": mat("niebieski", "#2F6BFF", 0.2, 0, 0, ("#2F6BFF", 18)),
    "pomaranczowy": mat("pomaranczowy", "#FF9A1F", 0.3, 0, 0, ("#FF8A00", 6)),
    "podloga": mat("podloga", "#EFE8DA", 0.55),
}


def bryla(nazwa, rozmiar, poz, material, fazka=0.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=poz, rotation=rot)
    o = bpy.context.object
    o.name = nazwa
    o.scale = rozmiar
    bpy.ops.object.transform_apply(scale=True)
    if fazka:
        w = o.modifiers.new("fazka", "BEVEL")
        w.width = fazka
        w.segments = 4
        w.limit_method = "ANGLE"
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o


def walec(nazwa, r, d, poz, material, rot=(0, math.pi / 2, 0), fazka=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=poz, rotation=rot, vertices=48)
    o = bpy.context.object
    o.name = nazwa
    if fazka:
        w = o.modifiers.new("fazka", "BEVEL")
        w.width = fazka
        w.segments = 3
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o


# ───────────── Wóz (przód w stronę +Y, długość ok. 6,5 m) ─────────────
D = 1.0  # wszystkie wymiary w metrach
bryla("rama", (1.9, 6.0, 0.35), (0, -0.2, 0.55), M["ciemny"], 0.04)
bryla("zabudowa", (2.45, 3.7, 2.2), (0, -1.45, 1.95), M["lakier"], 0.09)
bryla("dach", (2.4, 3.65, 0.1), (0, -1.45, 3.1), M["alu"], 0.03)
bryla("kabina", (2.45, 2.25, 1.95), (0, 1.6, 1.85), M["lakier"], 0.14)
bryla("kabina-gora", (2.35, 1.1, 0.35), (0, 1.35, 2.95), M["lakier"], 0.12)
# szyby
bryla("szyba-przod", (2.0, 0.05, 0.85), (0, 2.76, 2.2), M["szyba"], 0.05)
for s in (-1, 1):
    bryla(f"szyba-bok-{s}a", (0.05, 0.85, 0.8), (s * 1.24, 2.15, 2.25), M["szyba"], 0.04)
    bryla(f"szyba-bok-{s}b", (0.05, 0.95, 0.8), (s * 1.24, 1.1, 2.25), M["szyba"], 0.04)
    # rolety skrytek
    for i, y in enumerate((-2.55, -1.55, -0.55)):
        bryla(f"roleta-{s}-{i}", (0.05, 0.92, 1.45), (s * 1.25, y, 1.85), M["alu"], 0.02)
        for k in range(8):
            bryla(f"zebro-{s}-{i}-{k}", (0.02, 0.9, 0.012), (s * 1.28, y, 1.28 + k * 0.17), M["grafit"], 0, )
    # klamki, lusterka, stopnie
    for y in (1.6, 0.6):
        bryla(f"klamka-{s}-{y}", (0.04, 0.2, 0.05), (s * 1.26, y, 1.95), M["chrom"], 0.01)
    bryla(f"lusterko-{s}", (0.08, 0.1, 0.5), (s * 1.55, 2.55, 2.35), M["ciemny"], 0.03)
    bryla(f"ramie-{s}", (0.3, 0.05, 0.05), (s * 1.38, 2.55, 2.35), M["ciemny"], 0.01)
    bryla(f"stopien-{s}", (0.3, 0.55, 0.05), (s * 1.3, 1.6, 0.85), M["alu"], 0.015)
    bryla(f"pas-{s}", (0.03, 3.6, 0.2), (s * 1.24, -1.45, 1.0), M["bialy"], 0.01)
    bryla(f"blotnik-{s}-p", (0.4, 1.2, 0.08), (s * 1.0, 2.0, 1.0), M["ciemny"], 0.03)
    bryla(f"blotnik-{s}-t", (0.4, 1.2, 0.08), (s * 1.0, -2.3, 1.0), M["ciemny"], 0.03)
    # reflektory i kierunkowskazy
    bryla(f"reflektor-{s}", (0.4, 0.06, 0.2), (s * 0.85, 2.78, 1.25), M["swiatlo"], 0.04)
    bryla(f"kierunek-{s}", (0.25, 0.06, 0.08), (s * 0.85, 2.78, 1.0), M["pomaranczowy"], 0.02)
    bryla(f"tyl-{s}", (0.3, 0.06, 0.2), (s * 0.95, -3.32, 1.2), M["pomaranczowy"], 0.03)
# przód: zderzak, krata, napis (biała belka)
bryla("zderzak", (2.5, 0.35, 0.3), (0, 2.85, 0.75), M["grafit"], 0.07)
bryla("krata", (1.2, 0.05, 0.4), (0, 2.78, 1.25), M["ciemny"], 0.03)
for k in range(6):
    bryla(f"krata-{k}", (1.1, 0.02, 0.025), (0, 2.82, 1.1 + k * 0.07), M["alu"], 0)
bryla("pas-przod", (2.3, 0.03, 0.12), (0, 2.78, 1.62), M["bialy"], 0.01)
# belka sygnalizacyjna
bryla("belka", (1.6, 0.35, 0.18), (0, 1.4, 3.22), M["ciemny"], 0.05)
koguty = [
    bryla("kogut-l", (0.55, 0.28, 0.14), (-0.5, 1.4, 3.36), M["niebieski"], 0.05),
    bryla("kogut-p", (0.55, 0.28, 0.14), (0.5, 1.4, 3.36), M["niebieski"], 0.05),
]
# drabina na dachu
for s in (-0.35, 0.35):
    bryla(f"drabina-{s}", (0.06, 3.5, 0.08), (s, -1.45, 3.28), M["alu"], 0.015)
for k in range(15):
    bryla(f"szczebel-{k}", (0.78, 0.04, 0.04), (0, -3.0 + k * 0.23, 3.28), M["alu"], 0.01)
# koła z oponą, felgą i śrubami
kola = []
for y in (1.9, -2.2):
    for s in (-1, 1):
        x = s * 1.1
        o = walec(f"opona-{s}-{y}", 0.55, 0.42, (x, y, 0.55), M["guma"], fazka=0.08)
        w = walec(f"felga-{s}-{y}", 0.34, 0.44, (x + s * 0.01, y, 0.55), M["alu"], fazka=0.02)
        walec(f"piasta-{s}-{y}", 0.14, 0.46, (x + s * 0.02, y, 0.55), M["chrom"])
        for k in range(8):
            ang = k * math.tau / 8
            walec(f"sruba-{s}-{y}-{k}", 0.025, 0.47, (x + s * 0.03, y + math.cos(ang) * 0.22, 0.55 + math.sin(ang) * 0.22), M["grafit"])
        kola += [o, w]

# ───────────── Podłoże, światło, kamera ─────────────
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
podloga = bpy.context.object
podloga.data.materials.append(M["podloga"])
podloga.is_shadow_catcher = True

# tło: ciepłe, jasne – jak „studio” marki
sw = bpy.data.worlds.new("swiat")
sc.world = sw
sw.use_nodes = True
tlo = sw.node_tree.nodes["Background"]
tlo.inputs["Color"].default_value = C("#EEE7DA")
tlo.inputs["Strength"].default_value = 0.45


def swiatlo_pow(nazwa, poz, energia, rozmiar, kolor="#FFFFFF"):
    d = bpy.data.lights.new(nazwa, "AREA")
    d.energy = energia
    d.size = rozmiar
    d.color = C(kolor)[:3]
    o = bpy.data.objects.new(nazwa, d)
    sc.collection.objects.link(o)
    o.location = poz
    kier = (Vector((0, 0, 1)) - Vector(poz)).to_track_quat("-Z", "Y")
    o.rotation_euler = kier.to_euler()
    return o


swiatlo_pow("klucz", (7, 6, 8), 3200, 9, "#FFF1DC")
swiatlo_pow("wypelnienie", (-8, 3, 4), 450, 8, "#E6EEFF")
swiatlo_pow("kontur", (-2, -9, 5), 900, 5, "#FFE3B8")
swiatlo_pow("gora", (0, 0, 9), 250, 8)

kam_dane = bpy.data.cameras.new("kamera")
kam_dane.lens = 38
kam_dane.sensor_fit = "HORIZONTAL"
kam_dane.sensor_width = 36
kam = bpy.data.objects.new("kamera", kam_dane)
sc.collection.objects.link(kam)
sc.camera = kam


def ustaw_kamere(k):
    """Spokojne okrążenie wozu: 0→149 klatek, ok. 120° łuku z lekkim najazdem."""
    t = k / 149
    wyg = t * t * (3 - 2 * t)
    kat = math.radians(-65 + 125 * wyg)
    odl = 11.2 - 2.2 * wyg
    wys = 3.6 - 0.5 * wyg
    kam.location = (math.sin(kat) * odl, -math.cos(kat) * odl, wys)
    cel = Vector((0, 0.2, 1.45))
    kam.rotation_euler = (cel - Vector(kam.location)).to_track_quat("-Z", "Y").to_euler()


def miganie(k):
    jasn = 0.5 + 0.5 * math.sin(k / 30 * math.tau * 0.5)
    koguty[0].data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 6 + 22 * jasn
    obrot = -(k / 30) * 1.2 / 0.55
    for o in kola:
        o.rotation_euler[0] = obrot


def render(k, sciezka):
    ustaw_kamere(k)
    miganie(k)
    sc.render.filepath = sciezka
    sc.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)


os.makedirs(os.path.dirname(a.wyjscie) or ".", exist_ok=True)
if a.klatka is not None:
    render(a.klatka, a.wyjscie)
else:
    for k in range(a.od, a.do + 1):
        render(k, a.wyjscie % k)
        print("klatka", k, flush=True)
