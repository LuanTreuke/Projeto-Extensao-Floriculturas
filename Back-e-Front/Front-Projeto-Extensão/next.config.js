/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow next/image to optimize and load external images from trusted hosts.
  // Add any hosts you use for remote images here. Restart the dev server after changing.
  images: {
    domains: ['www.ikebanaflores.com.br', 'localhost'],
    // remotePatterns give finer control (protocol/hostname/path) and are available in newer Next.js
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.ikebanaflores.com.br',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ngrok-free.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ngrok.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ngrok.app',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
    ],
    // If you want to allow any external origin without listing domains one-by-one,
    // you can disable Next.js image optimization. This will make <Image /> render
    // unoptimized <img> tags and accept any src. Use with caution — you lose
    // automatic optimization (resizing, caching, proxying) and may impact performance.
    // Set to `true` to allow any origin.
    unoptimized: true,
  },
  // Headers personalizados para requisições
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: 'true',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
