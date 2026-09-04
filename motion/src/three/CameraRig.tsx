/**
 * Deterministic camera: position + look-at target are pure functions of the
 * frame, applied on every render (no useFrame, which Remotion forbids).
 * Uses camera.lookAt directly: cameras look down -Z, a plain Object3D would
 * face +Z and turn the camera away from the scene.
 */
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

export const CameraRig: React.FC<{
  position: [number, number, number];
  target?: [number, number, number];
  /** roll in radians */
  roll?: number;
}> = ({ position, target = [0, 0, 0], roll = 0 }) => {
  const camera = useThree((s) => s.camera);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  camera.position.set(position[0], position[1], position[2]);
  tgt.set(target[0], target[1], target[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(tgt);
  if (roll) camera.rotateZ(roll);
  camera.updateMatrixWorld();
  return null;
};
