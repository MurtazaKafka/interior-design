/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazon.com',
      },
      {
        protocol: 'https',
        hostname: '**.wayfair.com',
      },
      {
        protocol: 'https',
        hostname: '**.overstock.com',
      },
      {
        protocol: 'https',
        hostname: '**.potterybarn.com',
      },
      {
        protocol: 'https',
        hostname: '**.ikea.com',
      },
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },
};

module.exports = nextConfig;
