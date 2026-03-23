# Build stage
FROM oven/bun:1.3.6-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json bun.lock turbo.json ./

# Copy scripts (needed for preinstall hook)
COPY scripts/ ./scripts/

# Copy all packages (needed for workspace resolution)
COPY packages/ ./packages/

# Copy the charges-worker app and api (worker imports @api/* services)
COPY apps/charges-worker/ ./apps/charges-worker/
COPY apps/api/ ./apps/api/

# Install all dependencies (ignore preinstall script errors in Docker)
RUN bun install --ignore-scripts || bun install

# Production stage
FROM oven/bun:1.3.6-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

# Copy workspace configuration
COPY --from=builder /app/package.json /app/bun.lock /app/turbo.json ./

# Copy packages with their node_modules
COPY --from=builder /app/packages/ ./packages/

# Copy charges-worker app and api (worker imports @api/* services)
COPY --from=builder /app/apps/charges-worker/ ./apps/charges-worker/
COPY --from=builder /app/apps/api/ ./apps/api/

# Copy node_modules from builder
COPY --from=builder /app/node_modules/ ./node_modules/

# Set working directory to charges-worker
WORKDIR /app/apps/charges-worker

# Change ownership to non-root user
RUN chown -R worker:nodejs /app

USER worker

# Start the worker
CMD ["bun", "run", "src/main.ts"]
