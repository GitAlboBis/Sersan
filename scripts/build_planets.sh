#!/usr/bin/env bash
# One-command reproducible build of every cinematic planet billboard asset:
# renders each planet's PNG loop in Blender (EEVEE Next), then encodes the
# alpha webm + black-backed mp4 + posters into public/cinematic/.
#
#     ./scripts/build_planets.sh                 # all four
#     ./scripts/build_planets.sh pluto neptune   # a subset
#     ENGINE=cycles ./scripts/build_planets.sh    # higher-fidelity, much slower
#
# Requires: blender (5.x) and ffmpeg (with libvpx-vp9) on PATH.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE="${ENGINE:-eevee}"
BLENDER="${BLENDER:-blender}"

planets=("$@")
if [ ${#planets[@]} -eq 0 ]; then
  planets=(saturn neptune mercury pluto)
fi

for planet in "${planets[@]}"; do
  echo "=== rendering $planet (engine=$ENGINE) ==="
  rm -rf "/tmp/sersan_planets/$planet"
  "$BLENDER" --background --python "$SCRIPT_DIR/render_planets.py" -- \
    --planet "$planet" --engine "$ENGINE"
done

echo "=== encoding ==="
"$SCRIPT_DIR/encode_planets.sh" "${planets[@]}"
echo "=== build complete ==="
