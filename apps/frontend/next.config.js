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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010',
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
  // Removed rewrites - NextAuth handles API calls directly
  // Client-side calls use NEXT_PUBLIC_API_URL
  // Server-side calls use INTERNAL_API_URL (configured in lib/auth.ts)
};

module.exports = nextConfig;
