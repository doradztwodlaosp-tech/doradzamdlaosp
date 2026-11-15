"""Model wozu strażackiego (z woz.py) jako funkcja do wspólnych scen Blendera."""
import math
import os

import bpy
from PIL import Image, ImageDraw, ImageFont

_KAT = os.path.dirname(os.path.abspath(__file__))


def _plansza_tekstu(nazwa, napis, szer_m, wys_m, kolor_tekstu, tlo=None, rot=(0, 0, 0), poz=(0, 0, 0), rozmiar_px=None):
    """Płaska plansza z napisem (PNG z przezroczystym tłem, jeśli tlo=None), do naklejenia na karoserię."""
    px_m = 600
    w, h = int(szer_m * px_m), int(wys_m * px_m)
    im = Image.new("RGBA", (w, h), tlo or (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def czc(rozm, znak):
        sc_ = os.path.join(_KAT, "zasoby", "montserrat.ttf" if ord(znak) < 0x100 else "montserrat-ext.ttf")
        f = ImageFont.truetype(sc_, rozm)
        try:
            f.set_variation_by_axes([800])
        except Exception:
            pass
        return f

    rozm = rozmiar_px or int(h * 0.82)
    while True:
        szer = [d.textlength(z, font=czc(rozm, z)) for z in napis]
        if sum(szer) <= w * 0.94 or rozm <= 8:
            break
        rozm -= 4
    x0 = w / 2 - sum(szer) / 2
    for z, sz in zip(napis, szer):
        d.text((x0, h / 2), z, font=czc(rozm, z), fill=kolor_tekstu, anchor="lm")
        x0 += sz
    kat = os.path.join(_KAT, "zasoby", "wygenerowane")
    os.makedirs(kat, exist_ok=True)
    sc = os.path.join(kat, f"woz-{nazwa}.png")
    im.save(sc)
    obr = bpy.data.images.load(sc)
    m = bpy.data.materials.new(nazwa)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    t = m.node_tree.nodes.new("ShaderNodeTexImage")
    t.image = obr
    m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    m.node_tree.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.35
    bpy.ops.mesh.primitive_plane_add(size=1, location=poz, rotation=rot)
    o = bpy.context.object
    o.name = nazwa
    o.scale = (szer_m, wys_m, 1)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    return o


def zbuduj_woz(M, bryla, walec, poz=(0, 0, 0), obrot_z=0.0, skala=1.0):
    """Buduje wóz w początku układu, podpina pod pustym obiektem i dopiero potem go przesuwa. Zwraca (korzeń, koguty, koła)."""
    przed = set(bpy.data.objects.keys())
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

    # ───────────── v2: polskie szczegóły i realizm ─────────────
    # łuki kół (ciemne tarcze na burcie)
    for y in (1.9, -2.2):
        for s in (-1, 1):
            walec(f"luk-{s}-{y}", 0.68, 0.05, (s * 1.245, y, 0.55), M["ciemny"], fazka=0.0)
    # pas biało-czerwony (lekki, odblaskowy) wzdłuż całego wozu + kabina
    for s in (-1, 1):
        bryla(f"pas-kabina-{s}", (0.03, 2.2, 0.2), (s * 1.24, 1.6, 1.0), M["bialy"], 0.01)
        bryla(f"pas-cienki-{s}", (0.03, 5.9, 0.04), (s * 1.24, -0.2, 1.17), M["bialy"], 0.005)
    # daszek nad szybą i spojler
    bryla("daszek", (2.4, 0.3, 0.08), (0, 2.72, 2.72), M["lakier"], 0.03)
    # rolety rozszerzone: pas ciemnych uszczelek pod nimi
    bryla("dolna-listwa", (2.46, 3.7, 0.12), (0, -1.45, 0.9), M["grafit"], 0.03)
    # lampy przednie: większe, z paskiem do jazdy dziennej
    for s in (-1, 1):
        bryla(f"drl-{s}", (0.45, 0.04, 0.035), (s * 0.85, 2.81, 1.4), M["swiatlo"], 0.01)
        bryla(f"niebieskie-przod-{s}", (0.3, 0.05, 0.06), (s * 0.45, 2.88, 0.95), M["niebieski"], 0.02)
        bryla(f"niebieskie-bok-{s}", (0.05, 0.3, 0.07), (s * 1.26, 2.5, 2.95), M["niebieski"], 0.02)
    # logo-znaczek na kracie i czerwona belka pod kratą
    bryla("znaczek", (0.18, 0.02, 0.18), (0, 2.82, 1.28), M["chrom"], 0.01)
    # sprzęt na dachu: ssawy, hydrant
    for k, x in enumerate((-0.85, 0.85)):
        walec(f"ssawa-{k}", 0.11, 3.3, (x, -1.45, 3.22), M["grafit"], rot=(math.pi / 2, 0, 0), fazka=0.01)
    # tył: szachownica biało-czerwona i światła stopu
    for k in range(14):
        for r in range(2):
            kol = M["bialy"] if (k + r) % 2 == 0 else M["lakier"]
            bryla(f"szach-{k}-{r}", (0.17, 0.03, 0.17), (-1.1 + k * 0.17, -3.36, 1.55 + r * 0.17), kol, 0.005)
    bryla("zderzak-tyl", (2.4, 0.2, 0.2), (0, -3.28, 0.8), M["grafit"], 0.04)
    for s in (-1, 1):
        bryla(f"stop-{s}", (0.18, 0.05, 0.25), (s * 1.1, -3.34, 1.35), M["pomaranczowy"], 0.02)
    # napisy
    _plansza_tekstu("straz", "STRAŻ", 0.95, 0.075, (255, 255, 255, 255), poz=(0, 2.875, 2.72), rot=(math.pi / 2, 0, math.pi))
    for s in (-1, 1):
        _plansza_tekstu(f"osp-{s}", "OSP", 0.95, 0.38, (255, 255, 255, 255),
                        poz=(s * 1.255, 1.6, 1.55), rot=(math.pi / 2, 0, math.pi / 2 * s))
        _plansza_tekstu(f"straz-bok-{s}", "STRAŻ POŻARNA", 2.6, 0.24, (255, 255, 255, 255),
                        poz=(s * 1.255, -1.45, 2.85), rot=(math.pi / 2, 0, math.pi / 2 * s))
    _plansza_tekstu("tyl-tel", "998 · 112", 1.0, 0.2, (255, 255, 255, 255), poz=(0, -3.37, 2.2), rot=(math.pi / 2, 0, 0))

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
