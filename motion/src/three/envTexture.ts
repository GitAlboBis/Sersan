/**
 * The procedural studio the glass and the metal see. One equirect canvas:
 * near-black navy sky, a cold white key softbox, a cyan rim band and a blue
 * floor bounce. Shared by `Env` (scene.environment) and the crystal shader,
 * so reflections and refractions agree. Built once, memoised per module.
 */
import * as THREE from "three";

let cached: THREE.CanvasTexture | null = null;

export function envTexture(): THREE.CanvasTexture {
  if (cached) return cached;
  const w = 1024;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0e213a");
  sky.addColorStop(0.45, "#08182c");
  sky.addColorStop(0.6, "#050d1a");
  sky.addColorStop(1, "#02060e");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  const box = (x: number, y: number, rx: number, ry: number, color: string, alpha: number) => {
    g.save();
    g.translate(x, y);
    g.scale(rx, ry);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    grd.addColorStop(0, color);
    grd.addColorStop(0.5, color);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = alpha;
    g.fillStyle = grd;
    g.fillRect(-1, -1, 2, 2);
    g.restore();
  };
  // key softbox — cold white, upper left. Bright: this is what lights the glass edges.
  box(w * 0.24, h * 0.2, 150, 52, "#ffffff", 1);
  box(w * 0.24, h * 0.2, 300, 120, "#cfe6ff", 0.45);
  // a second, smaller hard key upper right for the double edge highlight
  box(w * 0.66, h * 0.16, 70, 30, "#ffffff", 0.9);
  // cyan rim band, right, on the horizon
  box(w * 0.82, h * 0.46, 150, 46, "#3BE1FF", 0.85);
  // blue floor bounce
  box(w * 0.5, h * 0.88, 460, 90, "#2A7FFF", 0.5);
  // faint horizon line
  g.globalAlpha = 0.22;
  const band = g.createLinearGradient(0, h * 0.44, 0, h * 0.56);
  band.addColorStop(0, "rgba(59,225,255,0)");
  band.addColorStop(0.5, "rgba(59,225,255,1)");
  band.addColorStop(1, "rgba(59,225,255,0)");
  g.fillStyle = band;
  g.fillRect(0, h * 0.44, w, h * 0.12);
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}