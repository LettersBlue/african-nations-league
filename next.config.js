/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only set turbopack.root locally to silence workspace root inference warning
  // On Vercel, outputFileTracingRoot is set automatically, so we don't set turbopack.root
  ...(process.env.VERCEL ? {} : {
    turbopack: {
      root: process.cwd(),
    },
  }),
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

