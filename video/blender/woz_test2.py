"""Podgląd wozu v2: python blender/woz_test2.py --kat 35 --wyjscie out.png"""
import argparse, math, os, sys
import bpy
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import woz_model, woz_scania
p = argparse.ArgumentParser()
p.add_argument("--wyjscie", default="out/blender/woz2.png"); p.add_argument("--kat", type=float, default=35)
p.add_argument("--wys_k", type=float, default=2.2); p.add_argument("--odl", type=float, default=13)
p.add_argument("--probki", type=int, default=24)
a = p.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = a.probki; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 900, 900
sc.view_settings.view_transform = "Khronos PBR Neutral"
C = lambda h: tuple(int(h[i:i+2], 16) / 255 for i in (1, 3, 5)) + (1,)
def mat(n, k, r=0.5, m=0.0, l=0.0, e=None):
    x = bpy.data.materials.new(n); x.use_nodes = True; b = x.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = C(k); b.inputs["Roughness"].default_value = r; b.inputs["Metallic"].default_value = m
    if l: b.inputs["Coat Weight"].default_value = l; b.inputs["Coat Roughness"].default_value = 0.05
    if e: b.inputs["Emission Color"].default_value = C(e[0]); b.inputs["Emission Strength"].default_value = e[1]
    return x
M = {"lakier": mat("l", "#B3120D", 0.25, 0.0, 0.6), "ciemny": mat("c", "#15161A", 0.6), "grafit": mat("g", "#2C2F36", 0.45, 0.4),
     "bialy": mat("b", "#F2F2EF", 0.4), "alu": mat("a", "#C9CCD3", 0.28, 1.0), "chrom": mat("ch", "#EDEFF3", 0.1, 1.0),
     "guma": mat("gu", "#101010", 0.85), "szyba": mat("s", "#1A2430", 0.05, 0.3, 1.0),
     "swiatlo": mat("sw", "#FFFFFF", 0.1, 0, 0, ("#FFF3D6", 6)), "niebieski": mat("n", "#2F6BFF", 0.2, 0, 0, ("#2F6BFF", 6)),
     "pomaranczowy": mat("po", "#FF9A1F", 0.3, 0, 0, ("#FF8A00", 3))}
def bryla(n, r, poz, m, fz=0.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=poz, rotation=rot); o = bpy.context.object; o.name = n; o.scale = r
    bpy.ops.object.transform_apply(scale=True)
    if fz:
        w = o.modifiers.new("f", "BEVEL"); w.width = fz; w.segments = 4; w.limit_method = "ANGLE"
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def walec(n, r, d, poz, m, rot=(0, math.pi / 2, 0), fazka=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=poz, rotation=rot, vertices=48); o = bpy.context.object; o.name = n
    if fazka:
        w = o.modifiers.new("f", "BEVEL"); w.width = fazka; w.segments = 3
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
woz_scania.zbuduj_woz(M, bryla, walec, (0, 0, 0), 0.0, 1.0)
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); pod = bpy.context.object
pod.data.materials.append(mat("pod", "#D8D2C6", 0.6))
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.93, 0.9, 0.84, 1); w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.5
def sw(n, poz, e, s):
    d = bpy.data.lights.new(n, "AREA"); d.energy, d.size = e, s; o = bpy.data.objects.new(n, d); sc.collection.objects.link(o); o.location = poz
    o.rotation_euler = (Vector((0, 0, 1.5)) - Vector(poz)).to_track_quat("-Z", "Y").to_euler()
sw("k", (8, 8, 10), 2500, 6); sw("f", (-8, 4, 5), 900, 8); sw("c", (0, -9, 6), 900, 6)
kd = bpy.data.cameras.new("k"); kd.lens = 50; kam = bpy.data.objects.new("k", kd); sc.collection.objects.link(kam); sc.camera = kam
k = math.radians(a.kat); kam.location = (math.sin(k) * a.odl, math.cos(k) * a.odl, a.wys_k)
kam.rotation_euler = (Vector((0, 0, 1.6)) - Vector(kam.location)).to_track_quat("-Z", "Y").to_euler()
os.makedirs(os.path.dirname(a.wyjscie) or ".", exist_ok=True); sc.render.filepath = a.wyjscie; bpy.ops.render.render(write_still=True)
