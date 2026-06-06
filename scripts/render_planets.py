#!/usr/bin/env python3
"""Reproducible Blender render pipeline for the cinematic planet billboards.

Run headless, e.g.:

    blender --background --python scripts/render_planets.py -- --planet pluto --quick
    blender --background --python scripts/render_planets.py -- --planet saturn

Produces an RGBA PNG sequence (one seamless 360 deg spin loop) into the output
directory. Encoding to webm/mp4 is a separate step (scripts/encode_planets.sh).

WHY this script exists: the previous renders shipped with an *opaque, noisy*
background and were then encoded as yuv420p (no alpha). In the scene that reads
as a static grey box because the luminance chroma-key can only cut near-pure
black. The fixes that matter live here:

  * render.film_transparent = True        -> real straight alpha, no background
  * Cycles + OpenImageDenoise             -> no grain in the alpha or the body
  * a true 360 deg spin keyed start==end  -> the loop is seamless
  * RGBA 16-bit PNG output                -> clean edges for the VP9 alpha plane

Textures are reused from public/images/ (equirectangular maps already in the
repo). Nothing here downloads anything.
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

# --- repo paths -----------------------------------------------------------
# This file lives in <repo>/scripts/. Resolve public/images relative to it so
# the script works regardless of Blender's cwd.
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
IMAGES_DIR = os.path.join(REPO_ROOT, "public", "images")

# --- per-planet configuration --------------------------------------------
# `tilt_deg`  opens the equator/ring plane relative to the front camera
#             (0 = edge-on, 90 = face-on). Doubles as the apparent axial tilt.
# `res`       output resolution [w, h]. Saturn is 16:9 to give the rings room.
# `ortho`     orthographic scale (frames the longest axis). Bigger = planet
#             occupies less of the frame; Saturn needs a wide scale for rings.
PLANETS = {
    "saturn": {
        "texture": "saturn.jpg",
        "res": [1280, 720],
        "ortho": 5.2,
        "tilt_deg": 26.7,
        "rings": "saturn_rings.png",
        "ring_inner": 1.24,
        "ring_outer": 2.30,
        "roughness": 0.95,
        "basename": "saturn-1080",
    },
    "neptune": {
        "texture": "neptune.jpg",
        "res": [1024, 1024],
        "ortho": 2.35,
        "tilt_deg": 28.0,
        "rings": None,
        "roughness": 0.9,
        "basename": "neptune-1024",
    },
    "mercury": {
        "texture": "mercury.jpg",
        "bump": "mercurybump.jpg",
        "bump_strength": 0.30,
        "res": [768, 768],
        "ortho": 2.30,
        "tilt_deg": 10.0,
        "rings": None,
        "roughness": 1.0,
        "basename": "mercury-768",
    },
    "pluto": {
        "texture": "pluto.jpg",
        "bump": None,
        "res": [768, 768],
        "ortho": 2.30,
        "tilt_deg": 22.0,
        "rings": None,
        "roughness": 1.0,
        "basename": "pluto-768",
    },
}

BODY_RADIUS = 1.0
# Light travels in this world direction (from upper-left-front, going to
# lower-right-back). Camera sits at -Y looking +Y, so -Y is "toward viewer";
# a -Y component here means the key light comes from the viewer's side.
LIGHT_DIR = Vector((0.55, 0.5, -0.55)).normalized()


def clean_scene():
    """Remove everything so repeated runs in one Blender session are clean."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images,
                  bpy.data.lights, bpy.data.cameras):
        for item in list(block):
            block.remove(item)


def setup_render(cfg, quick, frames, engine):
    scene = bpy.context.scene

    if engine == "cycles":
        scene.render.engine = "CYCLES"
        # Try the Metal GPU; fall back to CPU silently if unavailable.
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            prefs.compute_device_type = "METAL"
            prefs.get_devices()
            for dev in prefs.devices:
                dev.use = True
            scene.cycles.device = "GPU"
        except Exception as exc:  # noqa: BLE001 - best-effort, CPU is fine
            print(f"[render] GPU unavailable ({exc}); using CPU")
            scene.cycles.device = "CPU"
        scene.cycles.samples = 24 if quick else 160
        scene.cycles.use_denoising = True
        try:
            scene.cycles.denoiser = "OPENIMAGEDENOISE"
        except TypeError:
            pass
        scene.cycles.use_adaptive_sampling = True
    else:
        # EEVEE Next (id 'BLENDER_EEVEE' in 4.3+/5.x). Diffuse textured
        # spheres look near-identical to Cycles here but render ~20-50x
        # faster, which buys us a long, slow, seamless loop.
        scene.render.engine = "BLENDER_EEVEE"
        scene.eevee.taa_render_samples = 16 if quick else 64
        # Shadows give the ring-on-body and body-on-ring occlusion.
        if hasattr(scene.eevee, "use_shadows"):
            scene.eevee.use_shadows = True
        if hasattr(scene.eevee, "use_raytracing"):
            scene.eevee.use_raytracing = True

    # The whole point: transparent film -> real straight alpha.
    scene.render.film_transparent = True

    w, h = cfg["res"]
    if quick:
        w, h = w // 2, h // 2
    # yuv/vp9 want even dimensions.
    scene.render.resolution_x = w - (w % 2)
    scene.render.resolution_y = h - (h % 2)
    scene.render.resolution_percentage = 100

    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "16"
    scene.render.image_settings.compression = 15

    # Keep texture colours true to the source sRGB maps (AgX would shift them).
    try:
        scene.view_settings.view_transform = "Standard"
    except TypeError:
        pass

    scene.frame_start = 1
    scene.frame_end = frames


def setup_world():
    """Dim ambient so the night side reads as shadow, not a void."""
    world = bpy.data.worlds.new("PlanetWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.04, 0.05, 0.08, 1.0)
        bg.inputs["Strength"].default_value = 0.9


def setup_camera(cfg):
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = cfg["ortho"]
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    # Front view: sit on -Y, look toward +Y.
    cam.location = (0.0, -12.0, 0.0)
    cam.rotation_euler = (math.radians(90.0), 0.0, 0.0)
    bpy.context.scene.camera = cam
    return cam


def setup_lights():
    key = bpy.data.lights.new("Key", type="SUN")
    key.energy = 4.0
    key.angle = math.radians(1.5)  # soft terminator
    key_obj = bpy.data.objects.new("Key", key)
    bpy.context.collection.objects.link(key_obj)
    key_obj.rotation_euler = LIGHT_DIR.to_track_quat("-Z", "Y").to_euler()

    # Weak cool rim from behind-right so the silhouette lifts off the nebula.
    rim = bpy.data.lights.new("Rim", type="SUN")
    rim.energy = 1.1
    rim.color = (0.6, 0.75, 1.0)
    rim_obj = bpy.data.objects.new("Rim", rim)
    bpy.context.collection.objects.link(rim_obj)
    rim_dir = Vector((-0.5, 0.6, 0.2)).normalized()
    rim_obj.rotation_euler = rim_dir.to_track_quat("-Z", "Y").to_euler()


def load_image(name, non_color=False):
    path = os.path.join(IMAGES_DIR, name)
    if not os.path.exists(path):
        raise SystemExit(f"[render] missing texture: {path}")
    img = bpy.data.images.load(path, check_existing=True)
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    return img


def make_body(cfg):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=128, ring_count=96, radius=BODY_RADIUS
    )
    body = bpy.context.active_object
    body.name = "Body"
    bpy.ops.object.shade_smooth()

    mat = bpy.data.materials.new("BodyMat")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = cfg["roughness"]
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.1
    elif "Specular" in bsdf.inputs:
        bsdf.inputs["Specular"].default_value = 0.1

    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = load_image(cfg["texture"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])

    if cfg.get("bump"):
        bump_img = nt.nodes.new("ShaderNodeTexImage")
        bump_img.image = load_image(cfg["bump"], non_color=True)
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = cfg.get("bump_strength", 0.3)
        nt.links.new(bump_img.outputs["Color"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    body.data.materials.append(mat)
    return body


def make_rings(cfg):
    """Build a flat annulus with radial UVs (u = inner..outer) and map the
    ring strip texture's colour + alpha onto it."""
    inner = cfg["ring_inner"]
    outer = cfg["ring_outer"]
    seg = 256

    verts, faces, uvs = [], [], []
    for i in range(seg + 1):
        ang = (i / seg) * 2.0 * math.pi
        c, s = math.cos(ang), math.sin(ang)
        verts.append((c * inner, s * inner, 0.0))  # inner ring -> u=0
        verts.append((c * outer, s * outer, 0.0))  # outer ring -> u=1
    for i in range(seg):
        a = i * 2
        b = a + 1
        c = a + 3
        d = a + 2
        faces.append((a, b, c, d))
        # UVs per face-loop: inner=u0, outer=u1; v irrelevant (sample mid).
        uvs.extend([(0.0, 0.5), (1.0, 0.5), (1.0, 0.5), (0.0, 0.5)])

    mesh = bpy.data.meshes.new("RingMesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for loop_idx, uv in enumerate(uvs):
        uv_layer.data[loop_idx].uv = uv

    ring_obj = bpy.data.objects.new("Rings", mesh)
    bpy.context.collection.objects.link(ring_obj)

    mat = bpy.data.materials.new("RingMat")
    mat.use_nodes = True
    # Alpha blending: EEVEE Next (4.2+/5.x) uses surface_render_method;
    # legacy EEVEE used blend_method. Cycles ignores both.
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "BLENDED"
    elif hasattr(mat, "blend_method"):
        mat.blend_method = "BLEND"
    mat.use_backface_culling = False
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.8
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = load_image(cfg["rings"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    ring_obj.data.materials.append(mat)
    return ring_obj


def _iter_fcurves(obj):
    """Yield an object's animation fcurves across Blender API versions.

    Blender 4.4+/5.x replaced `Action.fcurves` with slotted/layered actions,
    where fcurves live on a channelbag under a layer's strip."""
    adata = obj.animation_data
    action = adata.action
    # Legacy API (<= 4.3)
    if hasattr(action, "fcurves"):
        yield from action.fcurves
        return
    # Slotted action API (4.4+)
    slot = adata.action_slot
    for layer in action.layers:
        for strip in layer.strips:
            cbag = strip.channelbag(slot)
            if cbag:
                yield from cbag.fcurves


def animate_spin(body, frames):
    """Key a single full turn so frame (frames+1) == frame 1 -> seamless."""
    body.rotation_euler = (0.0, 0.0, 0.0)
    body.keyframe_insert("rotation_euler", index=2, frame=1)
    body.rotation_euler = (0.0, 0.0, 2.0 * math.pi)
    body.keyframe_insert("rotation_euler", index=2, frame=frames + 1)
    # Linear interpolation -> constant angular velocity, no ease at the seam.
    for fcurve in _iter_fcurves(body):
        for kp in fcurve.keyframe_points:
            kp.interpolation = "LINEAR"


def build_planet(cfg, frames):
    # An empty carries the tilt; the body spins on its own local Z under it,
    # so the spin axis stays put while the equator/rings open to the camera.
    tilt = bpy.data.objects.new("Tilt", None)
    bpy.context.collection.objects.link(tilt)
    tilt.rotation_euler = (math.radians(cfg["tilt_deg"]), 0.0, 0.0)

    body = make_body(cfg)
    body.parent = tilt
    animate_spin(body, frames)

    if cfg.get("rings"):
        rings = make_rings(cfg)
        rings.parent = tilt


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--planet", required=True, choices=list(PLANETS.keys()))
    p.add_argument("--engine", choices=["eevee", "cycles"], default="eevee",
                   help="render engine (eevee is the fast default)")
    p.add_argument("--quick", action="store_true",
                   help="low samples, half res, fewer frames for a fast test")
    p.add_argument("--frames", type=int, default=0,
                   help="override loop frame count")
    p.add_argument("--out", default="",
                   help="png output dir (default /tmp/sersan_planets/<name>)")
    return p.parse_args(argv)


def main():
    args = parse_args()
    cfg = PLANETS[args.planet]
    # 120 frames @ 24fps -> a 5s full rotation: a slow, cinematic spin.
    frames = args.frames or (24 if args.quick else 120)
    out_dir = args.out or os.path.join("/tmp", "sersan_planets", args.planet)
    os.makedirs(out_dir, exist_ok=True)

    clean_scene()
    setup_render(cfg, args.quick, frames, args.engine)
    setup_world()
    setup_camera(cfg)
    setup_lights()
    build_planet(cfg, frames)

    scene = bpy.context.scene
    scene.render.filepath = os.path.join(out_dir, "frame_")
    print(f"[render] {args.planet}: {frames} frames @ "
          f"{scene.render.resolution_x}x{scene.render.resolution_y}, "
          f"engine={scene.render.engine}")
    print(f"[render] output -> {out_dir}")
    bpy.ops.render.render(animation=True)
    print(f"[render] done: {args.planet}")


if __name__ == "__main__":
    main()
