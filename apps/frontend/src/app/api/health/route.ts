/**
 * Health Check Endpoint for Frontend
 * Used by Docker health checks and load balancers
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || process.env.GIT_COMMIT_SHA || 'unknown';
  const buildTimestamp = process.env.BUILD_TIMESTAMP || 'unknown';

  return NextResponse.json({
    status: 'healthy',
    service: 'copilot-frontend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    build: {
      id: buildId,
      timestamp: buildTimestamp,
      nodeVersion: process.version,
    },
    environment: process.env.NODE_ENV,
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
