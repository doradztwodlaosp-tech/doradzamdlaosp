"""Model wozu strażackiego (z woz.py) jako funkcja do wspólnych scen Blendera."""
import math

import bpy


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
