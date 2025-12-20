/**
 * Version API Endpoint
 *
 * Returns the current build information for deployment verification.
 * This endpoint is used by:
 * - Deployment scripts to verify the correct version is running
 * - Monitoring tools to track deployment history
 * - Frontend to display version info in footer/about page
 *
 * IMPORTANT: This endpoint must NEVER be cached
 * - dynamic = 'force-dynamic' ensures no static generation
 * - revalidate = 0 ensures no ISR caching
 * - Cache-Control headers (from next.config.js) ensure no browser cache
 */

import { NextResponse } from 'next/server';

// Force dynamic rendering - never cache this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const buildInfo = {
    // Build ID from next.config.js generateBuildId
    buildId: process.env.NEXT_PUBLIC_BUILD_ID || process.env.GIT_COMMIT_SHA || 'development',

    // Build timestamp (if available from CI/CD)
    buildTimestamp: process.env.BUILD_TIMESTAMP || new Date().toISOString(),

    // Application version from package.json
    version: process.env.npm_package_version || process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

    // Environment
    nodeEnv: process.env.NODE_ENV || 'development',

    // Deployment environment (local-production, staging, production)
    deploymentEnv: process.env.DEPLOYMENT_ENV || process.env.APP_ENV || 'unknown',
  };

  return NextResponse.json(buildInfo, {
    status: 200,
    headers: {
      // Ensure no caching at any level
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
