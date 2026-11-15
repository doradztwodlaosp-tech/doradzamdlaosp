"""Hełm strażacki (nowoczesny, jak hełmy do akcji ratowniczych) zbudowany w Blenderze.

Elementy: skorupa (profil obrotowy), szeroki rant z wydłużoną osłoną karku z tyłu, łukowaty grzebień,
złota przyłbica, pasy odblaskowe, emblemat z § na froncie, gumowa listwa. Przód w stronę +Y.
"""
import math

import bmesh
import bpy
from mathutils import Vector

DL = 1.25  # wydłużenie hełmu wzdłuż osi przód–tył


def _mat(nazwa, kolor, chrop, metal=0.0, lakier=0.0, emisja=None):
    m = bpy.data.materials.new(nazwa)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    k = tuple(int(kolor[i : i + 2], 16) / 255 for i in (1, 3, 5)) + (1,)
    b.inputs["Base Color"].default_value = k
    b.inputs["Roughness"].default_value = chrop
    b.inputs["Metallic"].default_value = metal
    if lakier:
        b.inputs["Coat Weight"].default_value = lakier
        b.inputs["Coat Roughness"].default_value = 0.08
    if emisja:
        b.inputs["Emission Color"].default_value = k
        b.inputs["Emission Strength"].default_value = emisja
    return m


def materialy():
    return {
        "skorupa": _mat("helm-skorupa", "#7C0B07", 0.32, 0.0, 0.45),
        "guma": _mat("helm-guma", "#101114", 0.75),
        "odblask": _mat("helm-odblask", "#DCDFE4", 0.3, 0.85),
        "przylbica": _mat("helm-przylbica", "#C9962F", 0.1, 1.0),
        "zloto": _mat("helm-zloto", "#DAA73C", 0.2, 1.0),
        "czarny": _mat("helm-czarny", "#17181C", 0.4, 0.3),
    }


def _obiekt_z_siatki(nazwa, bm, material):
    me = bpy.data.meshes.new(nazwa)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nazwa, me)
    bpy.context.scene.collection.objects.link(o)
    me.materials.append(material)
    for p in me.polygons:
        p.use_smooth = True
    return o


def _profil_kopuly(r=0.62, h=0.7, kroki=24):
    """Wysokość kopuły z lekko spłaszczonym wierzchołkiem – kształt skorupy hełmu (profil promień, wysokość)."""
    pkt = []
    for i in range(kroki + 1):
        t = i / kroki
        kat = t * math.pi / 2
        rr = r * math.cos(kat) ** 0.9
        zz = h * math.sin(kat) ** 0.8
        pkt.append((rr, zz))
    return pkt


def promien_na_wysokosci(h, r=0.62, wys=0.7):
    """Promień skorupy na wysokości h (odwrócony profil kopuły)."""
    sin_k = min(1.0, max(0.0, h / wys)) ** (1 / 0.8)
    return r * math.sqrt(max(0.0, 1 - sin_k**2)) ** 0.9


def zbuduj_helm(poz=(0, 0, 0), obrot_z=0.0, M=None):
    M = M or materialy()
    bpy.ops.object.empty_add(location=(0, 0, 0))
    korzen = bpy.context.object
    korzen.name = "helm"
    czesci = []

    # ── skorupa: obrót profilu ──
    bm = bmesh.new()
    profil = _profil_kopuly()
    kolumny = 96
    siatka = []
    for ang_i in range(kolumny):
        th = ang_i / kolumny * math.tau
        rzad = []
        for rr, zz in profil:
            rzad.append(bm.verts.new((math.cos(th) * rr, math.sin(th) * rr * DL, zz)))
        siatka.append(rzad)
    for ai in range(kolumny):
        a, b = siatka[ai], siatka[(ai + 1) % kolumny]
        for k in range(len(profil) - 1):
            bm.faces.new((a[k], b[k], b[k + 1], a[k + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    skorupa = _obiekt_z_siatki("helm-skorupa", bm, M["skorupa"])
    czesci.append(skorupa)

    # ── rant z osłoną karku (szerszy z tyłu, lekko opadający) ──
    bm = bmesh.new()
    n = 96
    wewn, zewn = [], []
    for i in range(n):
        th = i / n * math.tau
        tyl = max(0.0, -math.sin(th))  # y ujemne = tył
        skala = 1.09 + 0.55 * tyl**1.6
        opad = -0.02 - 0.09 * tyl**1.5
        wewn.append(bm.verts.new((math.cos(th) * 0.62, math.sin(th) * 0.62 * DL, 0.0)))
        zewn.append(bm.verts.new((math.cos(th) * 0.62 * skala, math.sin(th) * 0.62 * DL * skala * (1.0 if tyl == 0 else 1.0), opad)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((wewn[i], wewn[j], zewn[j], zewn[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    rant = _obiekt_z_siatki("helm-rant", bm, M["guma"])
    w = rant.modifiers.new("grubosc", "SOLIDIFY")
    w.thickness = 0.035
    w.offset = 0
    f = rant.modifiers.new("fazka", "BEVEL")
    f.width = 0.012
    f.segments = 3
    czesci.append(rant)

    # ── gumowa listwa na styku skorupy i rantu ──
    bpy.ops.mesh.primitive_torus_add(major_radius=0.62, minor_radius=0.022, location=(0, 0, 0.012), major_segments=96, minor_segments=12)
    listwa = bpy.context.object
    listwa.scale = (1.0, DL, 1.0)
    listwa.data.materials.append(M["guma"])
    bpy.ops.object.shade_smooth()
    czesci.append(listwa)

    # ── grzebień: łuk od przodu do tyłu, wzdłuż profilu kopuły ──
    bm = bmesh.new()
    luk = []
    dlugosc = 72
    for i in range(dlugosc + 1):
        t = -1.0 + 2.0 * i / dlugosc  # od tyłu (-1) do przodu (+1)
        kat = t * math.pi / 2 * 0.93
        y = math.sin(kat) * 0.62 * DL * 1.02
        z = math.cos(kat) ** 0.8 * 0.7 * 1.045
        luk.append((y, z))
    szer_g = 0.055
    prof = [(-szer_g, 0.0), (-szer_g * 0.55, 0.03), (szer_g * 0.55, 0.03), (szer_g, 0.0)]
    wierzch = []
    for (y, z) in luk:
        wierzch.append([bm.verts.new((px, y, z + pz)) for px, pz in prof])
    for i in range(len(luk) - 1):
        for k in range(len(prof) - 1):
            bm.faces.new((wierzch[i][k], wierzch[i][k + 1], wierzch[i + 1][k + 1], wierzch[i + 1][k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    grzebien = _obiekt_z_siatki("helm-grzebien", bm, M["guma"])
    czesci.append(grzebien)

    # ── pasy odblaskowe wokół skorupy ──
    for i, h in enumerate((0.14, 0.27)):
        xr = promien_na_wysokosci(h)
        bpy.ops.mesh.primitive_torus_add(major_radius=xr + 0.006, minor_radius=0.016, location=(0, 0, h), major_segments=96, minor_segments=8)
        pas = bpy.context.object
        pas.name = f"helm-odblask-{i}"
        pas.scale = (1.0, DL, 1.0)
        pas.data.materials.append(M["odblask"])
        bpy.ops.object.shade_smooth()
        czesci.append(pas)

    # ── przyłbica: złota powłoka z przodu, wysunięta ponad rant ──
    bm = bmesh.new()
    kolumny_p = 24
    rzedy_p = 8
    siatka = []
    for ci in range(kolumny_p + 1):
        th = math.pi / 2 + (-1.0 + 2.0 * ci / kolumny_p) * math.radians(62)
        rzad = []
        for ri in range(rzedy_p + 1):
            h = 0.03 + 0.34 * ri / rzedy_p
            xr = promien_na_wysokosci(h) + 0.012 + 0.05 * (1 - ri / rzedy_p)
            rzad.append(bm.verts.new((math.cos(th) * xr, math.sin(th) * xr * DL, h)))
        siatka.append(rzad)
    for ci in range(kolumny_p):
        for ri in range(rzedy_p):
            bm.faces.new((siatka[ci][ri], siatka[ci + 1][ri], siatka[ci + 1][ri + 1], siatka[ci][ri + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    przylbica = _obiekt_z_siatki("helm-przylbica", bm, M["przylbica"])
    w = przylbica.modifiers.new("grubosc", "SOLIDIFY")
    w.thickness = 0.012
    czesci.append(przylbica)

    # ── emblemat: złota tarcza z § na froncie skorupy ──
    kat_e = math.radians(41)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.115, depth=0.022, location=(0, promien_na_wysokosci(0.5) * DL + 0.012, 0.5), rotation=(-(math.pi / 2 - kat_e), 0, 0), vertices=48)
    emblemat = bpy.context.object
    emblemat.name = "helm-emblemat"
    emblemat.scale = (1.0, 1.0, 1.0)
    emblemat.data.materials.append(M["zloto"])
    bpy.ops.object.shade_smooth()
    czesci.append(emblemat)

    for c in czesci:
        c.parent = korzen
        c.matrix_parent_inverse = korzen.matrix_world.inverted()
    # dopiero po podpięciu części przesuwamy i obracamy cały hełm
    korzen.location = poz
    korzen.rotation_euler = (0, 0, obrot_z)
    return korzen
