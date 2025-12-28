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
    ignoreBuildErrors: true, // Type checking done separately in CI workflow
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

  // Predictable build IDs for version tracking and cache management
  // Prevents ChunkLoadError by using commit SHA or build timestamp
  generateBuildId: async () => {
    // Priority order:
    // 1. NEXT_PUBLIC_BUILD_ID from deployment env
    // 2. GIT_COMMIT_SHA from CI/CD
    // 3. Timestamp for local development
    return process.env.NEXT_PUBLIC_BUILD_ID ||
           process.env.GIT_COMMIT_SHA ||
           `build-${Date.now()}`;
  },

  // Cache-Control headers to prevent ChunkLoadError
  // HTML pages: no cache (always fresh)
  // Static assets: immutable (never changes)
  // API responses: no cache (dynamic data)
  async headers() {
    return [
      {
        // HTML pages - always revalidate to get latest chunks
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Static assets (_next/static) - cache forever (content-hashed filenames)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Next.js data files - no cache (dynamic)
        source: '/_next/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // API routes - no cache (always dynamic)
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
