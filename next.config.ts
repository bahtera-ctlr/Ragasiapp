import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Optimasi performance */
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Compress files
  compress: true,
  // Streaming untuk faster loading
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js"],
  },
};

export default nextConfig;
