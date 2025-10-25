import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '152.42.97.192',
        port: '5000',
        pathname: '/api/get-render/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/api/get-render/**',
      },
    ],
  },
};

export default nextConfig;
