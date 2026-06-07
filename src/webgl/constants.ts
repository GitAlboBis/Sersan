import * as THREE from "three";

/** Must match the Canvas camera config in Scene.tsx. */
export const CAMERA_FOV = 50;
export const CAMERA_Z = 12;

/**
 * World-space viewport height at the content plane (z=0), seen from the
 * camera at z=CAMERA_Z. Constant by construction — NEVER derive this from
 * useThree().viewport: that value is computed from the camera's distance to
 * the origin, and our camera travels down the world strip every frame,
 * which would feed the world scale back into itself.
 */
export const WORLD_VIEW_HEIGHT =
  2 * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2) * CAMERA_Z;
