# ============================================================
# Frontend Production Dockerfile - Multi-stage Build
# Cloud Governance Copilot - Next.js 14 App Router
# ============================================================
# Dependencies stage: 200MB | Builder stage: 350MB | Production stage: ~180MB
# ============================================================

# ============================================================
# Stage 1: Dependencies Installation
# ============================================================
FROM node:20-alpine AS deps

# Install libc6-compat for Next.js compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies using npm ci for reproducible builds
# Only install production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# ============================================================
# Stage 2: Builder - Next.js Build
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Install dev dependencies needed for build
RUN npm install --only=dev

# Copy application source
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
# Next.js will create .next/standalone directory with minimal dependencies
RUN npm run build

# ============================================================
# Stage 3: Production Runtime
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

# Set production environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

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
