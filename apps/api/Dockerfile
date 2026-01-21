# Build stage
FROM oven/bun:1.3.6-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json bun.lock turbo.json ./

# Copy scripts (needed for preinstall hook)
COPY scripts/ ./scripts/

# Copy all packages (needed for workspace resolution)
COPY packages/ ./packages/

# Copy the API app
COPY apps/api/ ./apps/api/

# Install all dependencies (ignore preinstall script errors in Docker)
RUN bun install --ignore-scripts || bun install

# Production stage
FROM oven/bun:1.3.6-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 api

# Copy workspace configuration
COPY --from=builder /app/package.json /app/bun.lock /app/turbo.json ./

# Copy packages with their node_modules
COPY --from=builder /app/packages/ ./packages/

# Copy API app
COPY --from=builder /app/apps/api/ ./apps/api/

# Copy node_modules from builder
COPY --from=builder /app/node_modules/ ./node_modules/

# Set working directory to API
WORKDIR /app/apps/api

# Change ownership to non-root user
RUN chown -R api:nodejs /app

USER api

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the server
CMD ["bun", "run", "src/main.ts"]
