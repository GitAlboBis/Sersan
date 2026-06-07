import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  images: {
    // AVIF first for better compression on photographic assets, with WebP
    // fallback for older clients.
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for a year — site imagery is static.
    minimumCacheTTL: 31536000,
    // Next 16 restricts the image-optimizer quality allow-list to [75] by
    // default. We allow 90 as well so any high-quality asset can opt in
    // without the optimizer returning 400 for that quality.
    qualities: [75, 90],
  },
};

export default nextConfig;
