import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  images: {
    // AVIF first for better compression on the photographic orb render, with
    // WebP fallback for older clients.
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for a year — the hero assets are static.
    minimumCacheTTL: 31536000,
    // Next 16 restricts the image-optimizer quality allow-list to [75] by
    // default. The hero render (orb-core.png) is served at quality 90, so it
    // must be added explicitly or the optimizer returns 400 for that quality.
    qualities: [75, 90],
  },
};

export default nextConfig;
