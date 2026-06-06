#!/usr/bin/env bash
# Encode the RGBA PNG sequences produced by render_planets.py into the assets
# the scene consumes: an alpha VP9 webm, a black-backed h264 mp4 fallback, and
# poster stills. Run after rendering, e.g.
#
#     ./scripts/encode_planets.sh                # all four planets
#     ./scripts/encode_planets.sh pluto          # just one
#     SRC_ROOT=/tmp/sersan_planets ./scripts/encode_planets.sh
#
# THE bug this fixes: the previous webm was yuv420p (no alpha plane), so the
# noisy/opaque render background stayed fully opaque and the scene's luminance
# chroma-key could not cut it -> a static grey box. Here the webm is encoded
# -pix_fmt yuva420p, carrying the straight alpha from Blender's transparent
# film. Chrome/Firefox use it directly; Safari falls back to the mp4, whose
# pure-black background the shader keys out by luminance.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
OUT_DIR="$REPO_ROOT/public/cinematic"
SRC_ROOT="${SRC_ROOT:-/tmp/sersan_planets}"
FPS="${FPS:-24}"

mkdir -p "$OUT_DIR"

# planet -> output basename. A case statement (not an associative array) so
# this runs on macOS's stock bash 3.2, which has no `declare -A`.
basename_for() {
  case "$1" in
    saturn)  echo "saturn-1080" ;;
    neptune) echo "neptune-1024" ;;
    mercury) echo "mercury-768" ;;
    pluto)   echo "pluto-768" ;;
    *)       echo "" ;;
  esac
}

planets=("$@")
if [ ${#planets[@]} -eq 0 ]; then
  planets=(saturn neptune mercury pluto)
fi

for planet in "${planets[@]}"; do
  base="$(basename_for "$planet")"
  if [ -z "$base" ]; then
    echo "!! unknown planet: $planet" >&2
    exit 1
  fi
  src="$SRC_ROOT/$planet"
  first_frame="$src/frame_0001.png"
  if [ ! -f "$first_frame" ]; then
    echo "!! no frames at $src (run render_planets.py first)" >&2
    exit 1
  fi

  W="$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$first_frame")"
  H="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$first_frame")"
  echo ">> $planet  ${W}x${H}  @ ${FPS}fps  -> $base"

  # --- VP9 webm WITH alpha (Chrome / Firefox) -----------------------------
  ffmpeg -y -loglevel error -framerate "$FPS" -i "$src/frame_%04d.png" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 \
    -auto-alt-ref 0 -an "$OUT_DIR/$base.webm"

  # --- h264 mp4 over BLACK (Safari/iOS; shader re-keys black to alpha) -----
  ffmpeg -y -loglevel error -framerate "$FPS" -i "$src/frame_%04d.png" \
    -filter_complex \
      "color=c=black:s=${W}x${H}:r=${FPS}[bg];[bg][0:v]overlay=shortest=1,format=yuv420p[v]" \
    -map "[v]" -c:v libx264 -crf 19 -preset slow -movflags +faststart \
    -an "$OUT_DIR/$base.mp4"

  # --- posters ------------------------------------------------------------
  # RGBA poster (transparent bg) shown until the first video frame decodes.
  ffmpeg -y -loglevel error -i "$first_frame" -pix_fmt rgba \
    "$OUT_DIR/$planet-poster-alpha.png"
  # Flattened jpg poster for any non-alpha consumer / preload.
  ffmpeg -y -loglevel error -i "$first_frame" \
    -filter_complex \
      "color=c=black:s=${W}x${H}[bg];[bg][0:v]overlay,format=yuv420p[v]" \
    -map "[v]" -frames:v 1 -q:v 4 "$OUT_DIR/$planet-poster.jpg"

  echo "   webm $(du -h "$OUT_DIR/$base.webm" | cut -f1)  mp4 $(du -h "$OUT_DIR/$base.mp4" | cut -f1)"
done

echo "done."
