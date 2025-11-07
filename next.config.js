/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't set turbopack.root - let Next.js/Vercel handle it automatically
  // This avoids conflicts between outputFileTracingRoot and turbopack.root
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app"],
    },
  },
  images: {
    // `domains` is deprecated; use `remotePatterns` instead
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

module.exports = nextConfig;

