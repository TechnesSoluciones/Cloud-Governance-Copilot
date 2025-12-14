# ============================================================
# API Gateway Production Dockerfile - Multi-stage Build
# Cloud Governance Copilot
# ============================================================
# Build stage: 50MB | Production stage: ~130MB
# ============================================================

# ============================================================
# Stage 1: Dependencies Installation
# ============================================================
FROM node:20-alpine AS deps

# Install OpenSSL for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies for production only
# --omit=dev excludes devDependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Generate Prisma Client
RUN npx prisma generate

# ============================================================
# Stage 2: Builder - TypeScript Compilation
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy source code
COPY . .

# Install dev dependencies needed for build
RUN npm install --only=dev

# Compile TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# ============================================================
# Stage 3: Production Runtime
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
