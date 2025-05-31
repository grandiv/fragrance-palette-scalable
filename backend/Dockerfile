FROM node:18-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Generate Prisma Client with correct binary targets
RUN npx prisma generate

# Copy source code
COPY src ./src

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

# Switch to non-root user
USER nextjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start command
CMD ["npm", "start"]