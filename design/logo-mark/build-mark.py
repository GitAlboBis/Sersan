"""
Rebuild public/models/sersan-mark.glb (the SERSAN hexagon mark) in Blender.

Run it through the Blender MCP `execute_blender_code` tool, or from Blender's
scripting workspace. It is fully deterministic: the outline comes from
design/logo-mark/mark-geometry.json, which was FITTED to the brand reference
raster (IoU 0.958 on the silhouette, 99.7% on the navy/blue split — see fit2.mjs).

Geometry contract the site depends on (src/webgl/HeroLogo.tsx, RouteHeroLogo.tsx):
  * ONE mesh in the GLB — HeroLogo takes the FIRST mesh it finds;
  * built in Blender's XZ plane, thickness along Y, so the glTF export
    (+Y up, gltf_z = -blender_y) puts the FRONT face at +Z — the front-bias
    sampler in geometry/sersanMark.ts keys off `normal.z`;
  * centered, ~2 units tall (the site re-normalizes to exactly 2 anyway);
  * every edge vertical or +/-30 deg (the mark sits on a hexagonal grid).
"""
import bpy, bmesh, json, os

REPO = r"C:/Users/alber/Desktop/sersan-v2-main"
GEOM = REPO + "/design/logo-mark/mark-geometry.json"
DEST = REPO + "/public/models/sersan-mark.glb"
DEPTH, BEVEL, SEGS = 0.30, 0.010, 2  # depth ~15% of height; bevel keeps normals clean

g = json.load(open(GEOM))

for n in ("Cube", "SersanMarkNavy", "SersanMarkBlue", "SersanMark"):
    ob = bpy.data.objects.get(n)
    if ob:
        bpy.data.objects.remove(ob, do_unlink=True)


def s2l(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexlin(h):
    return tuple(s2l(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4)) + (1.0,)


def build(name, pts, col):
    bm = bmesh.new()
    vs = [bm.verts.new((float(x), -DEPTH / 2.0, float(y))) for (x, y) in pts]
    f = bm.faces.new(vs)
    bmesh.ops.recalc_face_normals(bm, faces=[f])
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=nv, vec=(0.0, DEPTH, 0.0))
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:], offset=BEVEL, segments=SEGS,
                    profile=0.5, affect='EDGES', clamp_overlap=True, offset_type='OFFSET')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    # Vertex colours stay in the .blend only (kept OUT of the GLB: nothing reads
    # them today and they cost ~17 KB). They are the hook for a future two-tone
    # spore look — MeshSurfaceSampler.sample() can return a colour per sample.
    ca = me.color_attributes.new(name="Color", type='FLOAT_COLOR', domain='CORNER')
    for d in ca.data:
        d.color = col
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


navy = build("SersanMarkNavy", g["navy"], hexlin("132741"))
blue = build("SersanMarkBlue", g["blue"], hexlin("2280DC"))
bpy.ops.object.select_all(action='DESELECT')
navy.select_set(True); blue.select_set(True)
bpy.context.view_layer.objects.active = navy
bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
ob.name = ob.data.name = "SersanMark"

me = ob.data
co = [v.co for v in me.vertices]
c = [(min(p[i] for p in co) + max(p[i] for p in co)) / 2 for i in range(3)]
for v in me.vertices:
    v.co.x -= c[0]; v.co.y -= c[1]; v.co.z -= c[2]
me.update()

bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True); bpy.context.view_layer.objects.active = ob
bpy.ops.object.shade_auto_smooth(angle=0.5236)  # smooth the bevel only, faces stay hard

bpy.ops.export_scene.gltf(
    filepath=DEST, export_format='GLB', use_selection=True, export_apply=True,
    export_yup=True, export_normals=True, export_tangents=False, export_texcoords=False,
    export_materials='NONE', export_vertex_color='NONE', export_cameras=False,
    export_lights=False, export_extras=False, export_animations=False,
)
bpy.ops.wm.save_as_mainfile(filepath=REPO + "/design/logo-mark/sersan-mark.blend", copy=True)
print("verts", len(me.vertices), "tris", sum(len(p.vertices) - 2 for p in me.polygons),
      "| glb", os.path.getsize(DEST), "bytes")
