# ============================================================
# Frontend Production Dockerfile - Two-stage Build
# Cloud Governance Copilot - Next.js 14 App Router
# ============================================================
# Builder stage: ~500MB | Production stage: ~180MB
# ============================================================

# ============================================================
# Stage 1: Builder - Next.js Build & Dependencies
# ============================================================
FROM node:20-alpine AS builder

# Install libc6-compat for Next.js compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy frontend package files
COPY apps/frontend/package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Using npm install without --production to get Next.js build tools
RUN npm install --no-package-lock && \
    npm cache clean --force

# Build arguments for version tracking (MUST be before COPY to invalidate cache)
ARG CACHE_BUST=unknown

# Force cache invalidation by using the CACHE_BUST arg in a RUN command
# This ensures Docker rebuilds subsequent layers when CACHE_BUST changes
RUN echo "Cache invalidation: ${CACHE_BUST}" > /tmp/cache-bust.txt

# Copy application source (context is project root, so copy only frontend app)
# This layer will be invalidated when CACHE_BUST changes
COPY apps/frontend/ .
ARG GIT_COMMIT_SHA=unknown
ARG BUILD_TIMESTAMP
ARG VERSION_TAG

# Set build-time environment variables for Next.js build
# These will be embedded in the build and available at runtime
ENV NEXT_TELEMETRY_DISABLED=1 \
    GIT_COMMIT_SHA=${GIT_COMMIT_SHA} \
    BUILD_TIMESTAMP=${BUILD_TIMESTAMP} \
    NEXT_PUBLIC_BUILD_ID=${GIT_COMMIT_SHA}

# Build Next.js application
# Clean cache before build to avoid stale files
# Next.js will create .next/standalone directory with minimal dependencies
RUN rm -rf .next .next/cache node_modules/.cache && \
    npm run build

# ============================================================
# Stage 2: Production Runtime
# ============================================================
FROM node:20-alpine AS runner

# Install security updates and dumb-init for proper signal handling
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Build arguments to pass to runtime
ARG GIT_COMMIT_SHA=unknown
ARG BUILD_TIMESTAMP
ARG VERSION_TAG

# Set production environment variables
# Include build information for version tracking
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    GIT_COMMIT_SHA=${GIT_COMMIT_SHA} \
    BUILD_TIMESTAMP=${BUILD_TIMESTAMP} \
    NEXT_PUBLIC_BUILD_ID=${GIT_COMMIT_SHA}

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy public assets with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Next.js standalone build
# The standalone build includes only necessary node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files (JS, CSS, images)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# CRITICAL FIX: Copy BUILD_ID and manifest files for proper chunk loading
# This prevents "Failed to find Server Action" errors by ensuring build version consistency
COPY --from=builder --chown=nextjs:nodejs /app/.next/BUILD_ID ./.next/BUILD_ID
COPY --from=builder --chown=nextjs:nodejs /app/.next/build-manifest.json ./.next/build-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/routes-manifest.json ./.next/routes-manifest.json

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly (graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]

# Start Next.js server using standalone output
CMD ["node", "server.js"]
