"""Wóz ratowniczo-gaśniczy typu Scania P 4x4 z zabudową (wzorowany na zdjęciach prawdziwego wozu OSP).

Przód w stronę +Y, długość ok. 7,7 m, szerokość 2,5 m, wysokość ok. 3 m. Bez herbu gminy.
Zwraca (korzeń, koguty, koła), tak jak zbuduj_woz z woz_model.py.
"""
import math
import os

import bpy
from PIL import Image, ImageDraw

from woz_model import _plansza_tekstu

_KAT = os.path.dirname(os.path.abspath(__file__))


def _kol(h):
    return tuple(int(h[i : i + 2], 16) / 255 for i in (1, 3, 5)) + (1,)


def _m(nazwa, hexk, chrop=0.5, metal=0.0, emisja=None, lakier=0.0):
    m = bpy.data.materials.new(nazwa)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = _kol(hexk)
    b.inputs["Roughness"].default_value = chrop
    b.inputs["Metallic"].default_value = metal
    if lakier:
        b.inputs["Coat Weight"].default_value = lakier
        b.inputs["Coat Roughness"].default_value = 0.06
    if emisja:
        b.inputs["Emission Color"].default_value = _kol(emisja[0])
        b.inputs["Emission Strength"].default_value = emisja[1]
    return m


def _roleta_tekstura(nazwa, szer_m, wys_m):
    """Ciemne rolety skrytek z grafiką odblaskową (limonkowe i srebrne pasy)."""
    px = 300
    w, h = int(szer_m * px), int(wys_m * px)
    im = Image.new("RGBA", (w, h), (36, 40, 47, 255))
    d = ImageDraw.Draw(im)
    for y in range(0, h, 7):
        d.line((0, y, w, y), fill=(27, 30, 35, 255), width=2)
    for k in (1, 2):
        x = int(w * k / 3)
        d.rectangle((x - 4, 0, x + 4, h), fill=(14, 15, 18, 255))
    LIM, SRE = (206, 232, 24, 255), (186, 190, 198, 255)

    def pol(pts, kol):
        d.polygon([(int(x * w), int(y * h)) for x, y in pts], fill=kol)

    pol([(0.05, 0.16), (0.46, 0.16), (0.43, 0.25), (0.02, 0.25)], LIM)
    pol([(0.46, 0.14), (0.88, 0.10), (0.84, 0.36), (0.50, 0.36)], LIM)
    pol([(0.05, 0.32), (0.40, 0.32), (0.40, 0.37), (0.05, 0.37)], SRE)
    pol([(0.50, 0.42), (0.92, 0.42), (0.88, 0.48), (0.47, 0.48)], SRE)
    pol([(0.10, 0.55), (0.60, 0.55), (0.60, 0.60), (0.10, 0.60)], SRE)
    kat = os.path.join(_KAT, "zasoby", "wygenerowane")
    os.makedirs(kat, exist_ok=True)
    sc = os.path.join(kat, f"roleta-{nazwa}.png")
    im.save(sc)
    return sc


def _plansza_z_obrazu(nazwa, sciezka, szer_m, wys_m, poz, rot):
    obr = bpy.data.images.load(sciezka)
    m = bpy.data.materials.new(nazwa)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    t = m.node_tree.nodes.new("ShaderNodeTexImage")
    t.image = obr
    m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.4
    b.inputs["Metallic"].default_value = 0.2
    bpy.ops.mesh.primitive_plane_add(size=1, location=poz, rotation=rot)
    o = bpy.context.object
    o.name = nazwa
    o.scale = (szer_m, wys_m, 1)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    return o


def zbuduj_woz(M, bryla, walec, poz=(0, 0, 0), obrot_z=0.0, skala=1.0):
    przed = set(bpy.data.objects.keys())
    CZ = _m("s-czerwien", "#C9101A", 0.22, 0.0, None, 0.9)
    BI = _m("s-biel", "#F4F4F1", 0.3, 0.0, None, 0.5)
    GR = _m("s-grafit", "#1E2026", 0.5, 0.2)
    CZA = _m("s-czarny", "#0D0E11", 0.35, 0.2)
    ALU = _m("s-alu", "#C4C8CF", 0.3, 1.0)
    CHR = _m("s-chrom", "#E8EAEE", 0.12, 1.0)
    OP = _m("s-opona", "#0E0E10", 0.85)
    LIM = _m("s-limonka", "#D4EE12", 0.35, 0.0, ("#D4EE12", 0.35))
    SRE = _m("s-srebrny", "#B8BDC6", 0.3, 0.6)
    SZY = _m("s-szyba", "#12181F", 0.04, 0.3, None, 1.0)
    BL = _m("s-niebieski", "#2F6BFF", 0.2, 0, ("#2F6BFF", 14))
    SW = _m("s-swiatlo", "#FFFFFF", 0.1, 0, ("#FFF3D6", 9))
    PO = _m("s-pomaranczowy", "#FF9A1F", 0.3, 0, ("#FF8A00", 4))
    CZR = _m("s-czerw-tyl", "#E01212", 0.3, 0, ("#E01212", 3))

    # ─── rama i zabudowa ───
    bryla("rama", (1.2, 7.0, 0.3), (0, -0.1, 0.65), GR, 0.04)
    bryla("zabudowa", (2.5, 4.55, 2.15), (0, -1.575, 1.7), CZ, 0.07)
    bryla("zabudowa-dach", (2.56, 4.6, 0.14), (0, -1.575, 2.86), BI, 0.05)
    bryla("zabudowa-dol", (2.52, 4.5, 0.12), (0, -1.575, 0.66), GR, 0.03)
    # ─── kabina (czerwona góra, biały dół) ───
    bryla("kabina", (2.5, 2.7, 1.8), (0, 2.2, 2.02), CZ, 0.14)
    bryla("kabina-dol", (2.46, 2.72, 0.55), (0, 2.2, 0.88), BI, 0.1)
    bryla("kabina-dach", (2.52, 2.9, 0.16), (0, 2.28, 2.99), CZ, 0.1)
    # przód: grafitowa atrapa, 4 okrągłe lampy na rurze, szyba, reflektory, zderzak z wyciągarką
    bryla("atrapa", (1.6, 0.08, 0.8), (0, 3.59, 1.4), GR, 0.04)
    for i in range(4):
        x = -0.48 + i * 0.32
        walec(f"lampa-{i}", 0.115, 0.07, (x, 3.68, 1.88), SW, rot=(math.pi / 2, 0, 0))
        walec(f"lampa-obr-{i}", 0.135, 0.05, (x, 3.655, 1.88), CHR, rot=(math.pi / 2, 0, 0))
    bryla("rura-lamp", (1.5, 0.06, 0.05), (0, 3.64, 1.74), CHR, 0.02)
    bryla("szyba-przod", (2.2, 0.05, 0.82), (0, 3.56, 2.42), SZY, 0.05)
    bryla("pas-pod-szyba", (2.3, 0.07, 0.17), (0, 3.58, 2.0), CZA, 0.03)
    bryla("zderzak", (2.55, 0.55, 0.46), (0, 3.78, 0.78), CZ, 0.1)
    bryla("wyciagarka", (0.6, 0.22, 0.32), (0, 4.02, 0.75), GR, 0.04)
    bryla("tablica", (0.52, 0.03, 0.12), (0, 3.58, 1.04), BI, 0.01)
    walec("szekla", 0.05, 0.1, (0.45, 4.05, 0.78), SRE, rot=(0, math.pi / 2, 0))
    bryla("biala-dolna-listwa", (2.4, 0.3, 0.3), (0, 3.5, 0.62), BI, 0.06)
    for s in (-1, 1):
        bryla(f"reflektor-{s}", (0.55, 0.07, 0.2), (s * 0.85, 3.6, 1.18), SW, 0.04)
        bryla(f"klatka-{s}", (0.62, 0.05, 0.27), (s * 0.85, 3.64, 1.18), CZA, 0.02)
        bryla(f"kierunek-{s}", (0.2, 0.05, 0.07), (s * 1.05, 3.62, 0.95), PO, 0.01)
        bryla(f"niebieski-zderzak-{s}", (0.3, 0.05, 0.06), (s * 0.55, 4.04, 1.0), BL, 0.02)
        # lusterka: duże czerwone
        bryla(f"lusterko-{s}", (0.12, 0.1, 0.62), (s * 1.5, 3.3, 2.35), CZ, 0.04)
        bryla(f"lusterko-dol-{s}", (0.1, 0.1, 0.35), (s * 1.48, 3.28, 1.7), CZ, 0.03)
        bryla(f"ramie-{s}", (0.3, 0.06, 0.06), (s * 1.38, 3.3, 2.5), CZA, 0.01)
        # szyby boczne, filar B (czarny z logo KSRG), klamki
        bryla(f"okno-tyl-{s}", (0.05, 0.87, 0.71), (s * 1.26, 1.56, 2.4), SZY, 0.05)
        bryla(f"filar-b-{s}", (0.05, 0.55, 1.35), (s * 1.26, 2.33, 2.08), CZA, 0.03)
        bryla(f"okno-prz-{s}", (0.05, 0.85, 0.75), (s * 1.26, 3.05, 2.36), SZY, 0.05)
        for y in (1.2, 2.35):
            bryla(f"klamka-{s}-{y}", (0.05, 0.22, 0.06), (s * 1.27, y, 1.62), GR, 0.02)
        # stopnie i skrzynka
        for y in (1.7, 2.7):
            bryla(f"stopien-{s}-{y}", (0.35, 0.6, 0.05), (s * 1.38, y, 0.82), ALU, 0.015)
        bryla(f"biala-skrzynka-{s}", (0.42, 0.95, 0.62), (s * 1.32, 0.55, 0.95), BI, 0.04)
        # białe łuki kół i koła
        for y in (-1.65, 2.65):
            walec(f"studnia-{s}-{y}", 0.7, 0.04, (s * 1.245, y, 0.56), CZA, fazka=0.0)
            bpy.ops.mesh.primitive_torus_add(major_radius=0.74, minor_radius=0.05, location=(s * 1.26, y, 0.56), rotation=(0, math.pi / 2, 0), major_segments=64, minor_segments=10)
            tor = bpy.context.object
            tor.name = f"luk-bialy-{s}-{y}"
            tor.data.materials.append(BI)
            bpy.ops.object.shade_smooth()
        # odblaski: pas na drzwiach, kreski u dołu, pionowe listwy
        bryla(f"pas-drzwi-{s}", (0.03, 1.9, 0.26), (s * 1.26, 1.9, 1.52), LIM, 0.01)
        bryla(f"pas-drzwi-sr-{s}", (0.03, 1.9, 0.06), (s * 1.26, 1.9, 1.3), SRE, 0.005)
        for i in range(4):
            bryla(f"przod-pas-{s}-{i}", (0.03, 0.2, 0.17), (s * 1.26, 2.95 + i * 0.22, 1.42), LIM if i % 2 == 0 else SRE, 0.005)
        for i in range(5):
            bryla(f"dol-kab-{s}-{i}", (0.03, 0.34, 0.07), (s * 1.26, 1.15 + i * 0.4, 1.12), LIM if i % 2 == 0 else SRE, 0.005)
        bryla(f"pion-kab-{s}", (0.03, 0.12, 1.45), (s * 1.26, 0.97, 2.0), LIM, 0.01)
        for i in range(10):
            bryla(f"dol-zab-{s}-{i}", (0.03, 0.36, 0.07), (s * 1.26, -3.6 + i * 0.41, 0.76), LIM if i % 2 == 0 else CZA, 0.005)
        bryla(f"pion-zab-{s}-a", (0.03, 0.08, 1.5), (s * 1.26, 0.58, 1.65), LIM, 0.01)
        bryla(f"pion-zab-{s}-b", (0.03, 0.08, 1.5), (s * 1.26, -3.72, 1.65), LIM, 0.01)
        # rolety skrytek z grafiką
        sc = _roleta_tekstura(f"{'p' if s > 0 else 'l'}", 4.05, 1.58)
        _plansza_z_obrazu(f"rolety-{s}", sc, 4.05, 1.58, (s * 1.256, -1.62, 1.64), (math.pi / 2, 0, math.pi / 2 * s))
        bryla(f"rolety-gora-{s}", (0.04, 4.1, 0.05), (s * 1.27, -1.62, 2.46), ALU, 0.01)
        bryla(f"rolety-dol-{s}", (0.04, 4.1, 0.05), (s * 1.27, -1.62, 0.84), ALU, 0.01)
        # napisy
        _plansza_tekstu(f"napis-{s}", "OCHOTNICZA STRAŻ POŻARNA", 3.3, 0.2, (255, 255, 255, 255),
                        poz=(s * 1.258, -1.4, 2.66), rot=(math.pi / 2, 0, math.pi / 2 * s))
        _plansza_tekstu(f"nr-{s}", "429 R 01", 1.0, 0.3, (255, 255, 255, 255),
                        poz=(s * 1.262, 1.9, 1.74), rot=(math.pi / 2, 0, math.pi / 2 * s))
        _plansza_tekstu(f"ksrg-{s}", "KSRG", 0.4, 0.12, (225, 225, 225, 255),
                        poz=(s * 1.265, 2.33, 2.42), rot=(math.pi / 2, 0, math.pi / 2 * s))
    # zbiornik paliwa i rura wydechowa po lewej
    walec("zbiornik", 0.3, 0.95, (-1.2, 0.55, 0.82), CHR, rot=(math.pi / 2, 0, 0))
    # ─── dach: belka świetlna z niebieskimi, drabiny, ssawy ───
    bryla("belka-podstawa", (2.1, 0.32, 0.06), (0, 3.15, 3.12), ALU, 0.02)
    koguty = [
        bryla("kogut-l", (0.9, 0.2, 0.1), (-0.5, 3.15, 3.2), BL, 0.04),
        bryla("kogut-p", (0.9, 0.2, 0.1), (0.5, 3.15, 3.2), BL, 0.04),
    ]
    walec("tuba-sygnal", 0.09, 0.4, (-0.9, 2.85, 3.18), CHR, rot=(math.pi / 2, 0, 0))
    for s in (-0.38, 0.38):
        bryla(f"drabina-{s}", (0.06, 5.3, 0.08), (s, -1.7, 3.0), ALU, 0.015)
    for k in range(20):
        bryla(f"szczebel-{k}", (0.82, 0.04, 0.04), (0, -4.1 + 0.27 * k + 0.5, 3.0), ALU, 0.01)
    walec("ssawa", 0.1, 3.0, (0.85, -1.9, 3.02), GR, rot=(math.pi / 2, 0, 0), fazka=0.01)
    # ─── tył ───
    for i in range(10):
        bryla(f"tyl-pas-{i}", (0.25, 0.04, 0.28), (-1.12 + i * 0.25, -3.87, 0.98), LIM if i % 2 == 0 else CZR, 0.005)
    bryla("zderzak-tyl", (2.5, 0.25, 0.22), (0, -3.9, 0.7), GR, 0.04)
    for s in (-1, 1):
        bryla(f"swiatla-tyl-{s}", (0.14, 0.05, 0.9), (s * 1.12, -3.87, 1.9), CZR, 0.02)
        bryla(f"kierunek-tyl-{s}", (0.14, 0.05, 0.14), (s * 1.12, -3.87, 1.38), PO, 0.01)
    # ─── koła ───
    kola = []
    for y in (2.65, -1.65):
        for s in (-1, 1):
            x = s * 1.1
            o = walec(f"opona-{s}-{y}", 0.56, 0.42, (x, y, 0.56), OP, fazka=0.08)
            w = walec(f"felga-{s}-{y}", 0.33, 0.42, (x + s * 0.01, y, 0.56), SRE, fazka=0.02)
            walec(f"piasta-{s}-{y}", 0.15, 0.44, (x + s * 0.02, y, 0.56), CZA)
            for k in range(8):
                ang = k * math.tau / 8
                walec(f"sruba-{s}-{y}-{k}", 0.026, 0.46, (x + s * 0.03, y + math.cos(ang) * 0.22, 0.56 + math.sin(ang) * 0.22), GR)
            kola += [o, w]

    nowe = [bpy.data.objects[n] for n in bpy.data.objects.keys() if n not in przed]
    bpy.ops.object.empty_add(location=(0, 0, 0))
    korzen = bpy.context.object
    korzen.name = "woz"
    for o in nowe:
        o.parent = korzen
        o.matrix_parent_inverse = korzen.matrix_world.inverted()
    korzen.location = poz
    korzen.rotation_euler = (0, 0, obrot_z)
    korzen.scale = (skala, skala, skala)
    return korzen, koguty, kola
