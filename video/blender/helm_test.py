"""Szybki podgląd samego hełmu: python blender/helm_test.py --wyjscie out/blender/helm.png [--kat 30]"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helm_model import zbuduj_helm  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument("--wyjscie", default="out/blender/helm.png")
p.add_argument("--kat", type=float, default=35)
p.add_argument("--szer", type=int, default=720)
p.add_argument("--wys", type=int, default=960)
p.add_argument("--probki", type=int, default=48)
a = p.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:])

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = a.probki
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = a.szer, a.wys
sc.view_settings.view_transform = "Khronos PBR Neutral"
sc.render.film_transparent = False

zbuduj_helm((0, 0, 0.0), 0.0)

bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.05))
pod = bpy.context.object
m = bpy.data.materials.new("pod")
m.use_nodes = True
m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.92, 0.88, 0.8, 1)
m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
pod.data.materials.append(m)

sw = bpy.data.worlds.new("s")
sc.world = sw
sw.use_nodes = True
sw.node_tree.nodes["Background"].inputs["Color"].default_value = (0.93, 0.9, 0.84, 1)
sw.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.4


def swiatlo(nazwa, poz, energia, rozmiar, kolor=(1, 1, 1)):
    d = bpy.data.lights.new(nazwa, "AREA")
    d.energy, d.size, d.color = energia, rozmiar, kolor
    o = bpy.data.objects.new(nazwa, d)
    sc.collection.objects.link(o)
    o.location = poz
    o.rotation_euler = (Vector((0, 0, 0.3)) - Vector(poz)).to_track_quat("-Z", "Y").to_euler()


swiatlo("klucz", (3, 4, 5), 380, 3, (1, 0.95, 0.85))
swiatlo("wypelnienie", (-4, 2, 2.5), 140, 4, (1, 0.93, 0.85))
swiatlo("kontur", (0, -4, 3), 200, 3, (1, 0.9, 0.8))

kd = bpy.data.cameras.new("k")
kd.lens = 70
kd.sensor_fit = "HORIZONTAL"
kd.sensor_width = 36
kam = bpy.data.objects.new("k", kd)
sc.collection.objects.link(kam)
sc.camera = kam
kat = math.radians(a.kat)
odl = 6.2
kam.location = (math.sin(kat) * odl, math.cos(kat) * odl, 2.0)  # kat 0 = widok z przodu
kam.rotation_euler = (Vector((0, 0, 0.32)) - Vector(kam.location)).to_track_quat("-Z", "Y").to_euler()

os.makedirs(os.path.dirname(a.wyjscie) or ".", exist_ok=True)
sc.render.filepath = a.wyjscie
bpy.ops.render.render(write_still=True)
