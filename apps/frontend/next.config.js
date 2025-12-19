/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Standalone output for Docker deployment, but without static export
  output: 'standalone',
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  env: {
    // Use relative path in production, localhost in development
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'production' ? '/api/v1' : 'http://localhost:3010'),
  },
  images: {
    domains: ['localhost'],
  },
  // Disable static generation for all pages since we use authentication and dynamic data
  // This prevents prerendering errors with React Context during build
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Proxy API calls from browser to backend container
  // This solves the localhost:3010 connection issue in Docker
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://api-gateway:3010'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
