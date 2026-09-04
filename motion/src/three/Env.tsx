/**
 * Puts the shared procedural studio on the scene so physical materials have
 * something to reflect. See envTexture.ts for the map itself.
 */
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { envTexture } from "./envTexture";

export const Env: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const { scene } = useThree();
  const tex = envTexture();
  useLayoutEffect(() => {
    scene.environment = tex;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
    };
  }, [scene, tex, intensity]);
  return null;
};