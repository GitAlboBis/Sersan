"use client";

/**
 * CardImageDistort — Lusion-style hover-reveal product-image distortion for the
 * three case-study cards that ship with a preview image (SphereNode, Quantex,
 * Terra Noa). Sober/premium: the card stays a CLEAN TEXT card at rest; on hover
 * the product shot fades in BEHIND the text (under a navy readability scrim) and
 * DISTORTS — RGB-shift + pointer parallax + a subtle zoom.
 *
 * LAYERS (all absolutely positioned, filling the card media area, BEHIND text):
 *   1. Base <img>  — real, accessible, lazy-loaded. Always present. This is the
 *      SSR/first-paint content, the reduced-motion / coarse-pointer / no-WebGL2
 *      fallback, and what shows while the WebGL canvas spins up. Hidden at rest
 *      (opacity 0); on hover it fades + scales in (CSS-only).
 *   2. WebGL2 canvas — created LAZILY on first hover only, on full-tier fine
 *      pointers without reduced-motion. Its own context (NOT the main R3F /
 *      WebGPU renderer, so it's independent of NEXT_PUBLIC_WEBGPU and never hits
 *      the WebGPU raw-GLSL incompatibility or the global bloom bleed). It fades
 *      in OVER the <img> on hover, fades out on leave, and is DISPOSED
 *      (texture/program deleted + context lost) on leave and on unmount so we
 *      never pile up live WebGL contexts.
 *   3. Scrim — a dark navy gradient overlay so the existing WHITE card text
 *      stays legible over the (busy) product shot.
 *
 * The whole stack is pointer-events:none, so the card's <Link>, the
 * CardTiltController tilt/sheen/glow, the custom cursor (`data-cursor="view"`)
 * and the hover audio all keep working untouched — this is just decoration
 * layered below the text and above the card background.
 */

import { useEffect, useRef, useState } from "react";

interface CardImageDistortProps {
  /** Public path of the preview image, e.g. /case-studies/spherenode-preview.webp */
  src: string;
  /** Accessible description of the preview. */
  alt: string;
}

/* -------------------------------------------------------------------------- */
/* Shaders (raw GLSL ES 3.00 — self-contained, no three.js)                   */
/* -------------------------------------------------------------------------- */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  // aPos is a fullscreen quad in clip space [-1,1]; map to [0,1] uv, flip Y so
  // the (top-left origin) texture lands upright.
  vUv = vec2(aPos.x * 0.5 + 0.5, 1.0 - (aPos.y * 0.5 + 0.5));
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform float uHover;      // 0..1 eased hover
uniform vec2  uPointer;    // pointer in card space, 0..1
uniform vec2  uVelocity;   // smoothed pointer velocity (capped)
uniform vec2  uCover;      // object-fit:cover scale for the texture
uniform float uAspectFix;  // > 1 widens RGB-shift horizontally for wide cards

void main() {
  // object-fit: cover — center the texture and crop the overflowing axis.
  vec2 uv = (vUv - 0.5) / uCover + 0.5;

  // Subtle zoom on hover (1.0 -> ~1.06), centered.
  float zoom = mix(1.0, 1.0 / 1.06, uHover);
  uv = (uv - 0.5) * zoom + 0.5;

  // Pointer parallax — push the image gently toward the cursor.
  vec2 parallax = (uPointer - 0.5) * 0.05 * uHover;
  uv += parallax;

  // RGB-shift — offset scales with pointer velocity, capped small. The red
  // channel leads, blue trails, green stays put: a clean chromatic split.
  vec2 shift = uVelocity * 0.7 + parallax * 0.35;
  shift *= uHover;
  shift.x *= uAspectFix;

  float r = texture(uTex, uv + shift).r;
  float g = texture(uTex, uv).g;
  float b = texture(uTex, uv - shift).b;
  vec3 col = vec3(r, g, b);

  // Edge feather so the cropped texture never shows a hard seam.
  vec2 edge = smoothstep(0.0, 0.012, uv) * (1.0 - smoothstep(0.988, 1.0, uv));
  float mask = edge.x * edge.y;

  fragColor = vec4(col, mask);
}`;

/* -------------------------------------------------------------------------- */
/* GL helpers                                                                 */
/* -------------------------------------------------------------------------- */

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

interface GLContext {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  texture: WebGLTexture;
  u: {
    uHover: WebGLUniformLocation | null;
    uPointer: WebGLUniformLocation | null;
    uVelocity: WebGLUniformLocation | null;
    uCover: WebGLUniformLocation | null;
    uAspectFix: WebGLUniformLocation | null;
  };
}

function createGL(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
): GLContext | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  // Shaders are no longer needed once linked.
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  // Fullscreen quad (two triangles).
  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  if (!buffer || !vao) return null;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // Texture from the (already-decoded) <img>.
  const texture = gl.createTexture();
  if (!texture) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    image,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, "uTex"), 0);

  return {
    gl,
    program,
    vao,
    buffer,
    texture,
    u: {
      uHover: gl.getUniformLocation(program, "uHover"),
      uPointer: gl.getUniformLocation(program, "uPointer"),
      uVelocity: gl.getUniformLocation(program, "uVelocity"),
      uCover: gl.getUniformLocation(program, "uCover"),
      uAspectFix: gl.getUniformLocation(program, "uAspectFix"),
    },
  };
}

function disposeGL(ctx: GLContext) {
  const { gl } = ctx;
  gl.deleteTexture(ctx.texture);
  gl.deleteBuffer(ctx.buffer);
  gl.deleteVertexArray(ctx.vao);
  gl.deleteProgram(ctx.program);
  // NOTE: we deliberately do NOT call WEBGL_lose_context.loseContext() here.
  // React keeps the same <canvas> element mounted across hovers, and
  // loseContext() permanently lost-flags that element's context for its
  // lifetime — so a 2nd getContext('webgl2') returns a dead context and the
  // distortion never reappears. We free the real GPU objects above and keep
  // the context reusable. A real context release only happens when the canvas
  // element itself unmounts (the React effect cleanup).
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function CardImageDistort({ src, alt }: CardImageDistortProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Capability gate, resolved once on mount (never during SSR). When false the
  // canvas is never created and only the CSS <img> fade runs.
  const [canDistort, setCanDistort] = useState(false);

  // True once the WebGL context is created AND its render loop is live. Drives
  // `data-canvas-active` on the root → CSS hides the base <img> so only the
  // shader image shows (no more double-image / mismatched crop). When the canvas
  // is never used (RM / coarse pointer / no WebGL2) this stays false and the
  // <img> remains the hover fallback. Set true on first real enter, false only
  // on teardown/unmount — never per-frame, so no re-render loop and no <img>
  // flash mid fade-out.
  const [canvasActive, setCanvasActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setCanDistort(!reduced && !coarse);
  }, []);

  // Force-load the base <img> via IntersectionObserver. Native lazy-load does
  // NOT fire inside the home rail's `position: sticky` + `overflow: hidden` +
  // `transform: translateX(...)` frame (the browser's lazy IO never triggers in
  // that transformed/clipped scroll container), so the preview never fetches
  // and both the CSS reveal and the WebGL distortion (which gates on
  // img.complete && naturalWidth > 0) stay dead. This self-contained IO forces
  // the fetch the moment the card nears the viewport. NOT gated on canDistort:
  // the static <img> must load on mobile/reduced-motion too, where the canvas
  // never mounts. On the grid / mobile, native lazy fires first and this is a
  // harmless no-op (early-returns on already-loaded).
  useEffect(() => {
    const root = rootRef.current;
    const img = imgRef.current;
    if (!root || !img || typeof IntersectionObserver === "undefined") return;
    // Already loaded (grid / native lazy already fired) — nothing to do.
    if (img.complete && img.naturalWidth > 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        // Native lazy-load never fires inside the rail's sticky/overflow-hidden
        // transformed frame. Force the fetch the moment the card nears view.
        img.loading = "eager";
        if (!img.complete || img.naturalWidth === 0) {
          const s = img.currentSrc || img.getAttribute("src");
          if (s) {
            img.removeAttribute("src");
            img.setAttribute("src", s);
          }
        }
        io.disconnect();
      },
      { rootMargin: "300px" },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !canDistort) return;

    // The hoverable card is the nearest .card-steel ancestor (the <Link>).
    const card = root.closest<HTMLElement>(".card-steel") ?? root;

    let ctx: GLContext | null = null;
    let raf = 0;
    let hovering = false;
    let disposed = false;

    // Eased / smoothed state, advanced per-frame.
    let hover = 0; // target 0/1
    let hoverEased = 0;
    const pointer = { x: 0.5, y: 0.5 };
    const pointerEased = { x: 0.5, y: 0.5 };
    let lastX = 0.5;
    let lastY = 0.5;
    const velocity = { x: 0, y: 0 };
    let aspectFix = 1;

    const resize = () => {
      const cv = canvasRef.current;
      if (!cv || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(root.clientWidth * dpr));
      const h = Math.max(1, Math.round(root.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
        ctx.gl.viewport(0, 0, w, h);
      }
      aspectFix = root.clientWidth > 0 ? root.clientHeight / root.clientWidth : 1;
    };

    // object-fit: cover — work out how much the texture must scale on each axis
    // so the image fills the card without stretching.
    const coverScale = (): [number, number] => {
      const img = imgRef.current;
      const cw = root.clientWidth || 1;
      const ch = root.clientHeight || 1;
      const iw = img?.naturalWidth || cw;
      const ih = img?.naturalHeight || ch;
      const cardAspect = cw / ch;
      const imgAspect = iw / ih;
      // uv is divided by uCover, so a value < 1 crops that axis.
      return imgAspect > cardAspect
        ? [cardAspect / imgAspect, 1]
        : [1, imgAspect / cardAspect];
    };

    const render = () => {
      if (!ctx || disposed) return;
      const { gl, u } = ctx;

      // Ease hover and pointer; decay velocity each frame.
      hoverEased += (hover - hoverEased) * 0.12;
      pointerEased.x += (pointer.x - pointerEased.x) * 0.12;
      pointerEased.y += (pointer.y - pointerEased.y) * 0.12;
      velocity.x *= 0.86;
      velocity.y *= 0.86;

      const [cx, cy] = coverScale();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(ctx.program);
      gl.bindVertexArray(ctx.vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, ctx.texture);
      gl.uniform1f(u.uHover, hoverEased);
      gl.uniform2f(u.uPointer, pointerEased.x, pointerEased.y);
      gl.uniform2f(u.uVelocity, velocity.x, velocity.y);
      gl.uniform2f(u.uCover, cx, cy);
      gl.uniform1f(u.uAspectFix, aspectFix);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Keep rendering while hovering or while easing out / velocity settles.
      const settling =
        hoverEased > 0.002 ||
        Math.abs(velocity.x) > 0.0002 ||
        Math.abs(velocity.y) > 0.0002;
      if (hovering || settling) {
        raf = requestAnimationFrame(render);
      } else {
        // Fully idle and not hovering — park the loop and hide the canvas, but
        // KEEP the live context so the next hover can reuse it. Tearing the
        // context down here (and force-losing it) is what poisoned the canvas
        // on the 2nd hover; the context is only really released on unmount.
        raf = 0;
        const cv = canvasRef.current;
        if (cv) cv.style.opacity = "0";
      }
    };

    const ensureContext = (): boolean => {
      // Context is created ONCE per mounted canvas and reused on every hover.
      if (ctx) return true;
      const cv = canvasRef.current;
      const img = imgRef.current;
      if (!cv || !img || !img.complete || img.naturalWidth === 0) return false;
      ctx = createGL(cv, img);
      if (!ctx) return false;
      resize();
      return true;
    };

    const teardown = () => {
      // Canvas is no longer rendering — let the base <img> become the fallback
      // again (and avoid leaving a blank card if it ever unmounts mid-hover).
      setCanvasActive(false);
      if (!ctx) return;
      disposeGL(ctx);
      ctx = null;
      const cv = canvasRef.current;
      if (cv) {
        cv.style.opacity = "0";
        // Drop the backing store so a torn-down canvas keeps no GPU memory.
        cv.width = 1;
        cv.height = 1;
      }
    };

    const onEnter = () => {
      hovering = true;
      hover = 1;
      // Creates the context on the first hover, reuses it on every later hover.
      if (!ensureContext()) return;
      resize();
      const cv = canvasRef.current;
      if (cv) cv.style.opacity = "1";
      // The shader image is now live & rendering — hide the base <img> so only
      // ONE image layer shows (kills the double-image / mismatched-crop bug).
      setCanvasActive(true);
      if (!raf) raf = requestAnimationFrame(render);
    };

    const onLeave = (e: PointerEvent) => {
      // pointerout fires on inner boundaries too; ignore if still inside.
      if (card.contains(e.relatedTarget as Node | null)) return;
      hovering = false;
      hover = 0;
      // render() keeps the loop alive through the ease-out, then parks the rAF
      // and hides the canvas while keeping the context alive for the next hover.
      if (ctx && !raf) raf = requestAnimationFrame(render);
    };

    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      // Velocity, capped so the RGB-shift never blows out.
      velocity.x = Math.max(-0.06, Math.min(0.06, velocity.x + (nx - lastX) * 0.5));
      velocity.y = Math.max(-0.06, Math.min(0.06, velocity.y + (ny - lastY) * 0.5));
      lastX = nx;
      lastY = ny;
      pointer.x = nx;
      pointer.y = ny;
    };

    const onResize = () => resize();

    card.addEventListener("pointerenter", onEnter, { passive: true });
    card.addEventListener("pointerout", onLeave, { passive: true });
    card.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointerout", onLeave);
      card.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      teardown();
    };
  }, [canDistort]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-canvas-active={canvasActive ? "true" : undefined}
      className="card-image-distort pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      {/* Base image — accessible, lazy, the SSR/RM/no-WebGL fallback. Hidden at
          rest; fades + scales in on card hover via CSS (the .group is the
          .card-steel link, which carries Tailwind's group + :hover). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="card-image-distort__img absolute inset-0 h-full w-full object-cover"
      />
      {/* WebGL canvas — enhancement, fades over the <img> when its context is
          live (opacity toggled imperatively). Only ever created on hover. */}
      {canDistort && (
        <canvas
          ref={canvasRef}
          className="card-image-distort__canvas absolute inset-0 h-full w-full"
          style={{ opacity: 0 }}
        />
      )}
      {/* Readability scrim — keeps the white card text legible over the shot. */}
      <div className="card-image-distort__scrim absolute inset-0" />
    </div>
  );
}

export default CardImageDistort;
