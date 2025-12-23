# ============================================================
# API Gateway Production Dockerfile - Two-stage Build
# Cloud Governance Copilot
# ============================================================
# Builder stage: ~400MB | Production stage: ~150MB
# ============================================================

# ============================================================
# Stage 1: Builder - TypeScript Compilation & Dependencies
# ============================================================
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files first
COPY apps/api-gateway/package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Using npm install without --production to get TypeScript and build tools
RUN npm install --no-package-lock && \
    npm cache clean --force

# Copy Prisma files and generate client
COPY apps/api-gateway/prisma ./prisma/
RUN npx prisma generate

# Copy TypeScript configuration files
# Use tsconfig.docker.json which is standalone (doesn't extend root config)
COPY apps/api-gateway/tsconfig.docker.json ./tsconfig.json
COPY apps/api-gateway/src ./src/

# Compile TypeScript to JavaScript
# Now tsc will use the standalone tsconfig.json (which is tsconfig.docker.json)
RUN npx tsc

# Remove dev dependencies after build
RUN npm prune --production

# ============================================================
# Stage 2: Production Runtime
# ============================================================
FROM node:20-alpine AS runner

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    openssl \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=4000

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy compiled application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy Prisma files for migrations
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 4000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD curl -f http://localhost:4000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
