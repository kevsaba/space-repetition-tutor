import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize pdfjs-dist to prevent Next.js from bundling it
  // This avoids issues with worker file resolution
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdfjs-dist');
    }
    return config;
  },
  // Use webpack explicitly instead of Turbopack for compatibility
  experimental: {},
};

export default nextConfig;
