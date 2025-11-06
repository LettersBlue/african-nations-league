/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app"],
    },
  },
  // Silence root inference warning by explicitly setting the Turbopack root
  turbopack: {
    root: "/home/lettersblue/Documents/Amahle/african-nations-league",
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

