# Multi-stage Docker build
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Stage 2: Dependencies
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Install all dependencies with legacy peer deps to handle conflicts
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Stage 3: Development
FROM dependencies AS development

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Start with npm run dev
CMD ["dumb-init", "npm", "run", "dev"]

# Stage 4: Production
FROM base AS production

# Copy package files
COPY package*.json ./

# Install only production dependencies with legacy peer deps
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy application code
COPY --chown=nodeuser:nodejs . .

# Create directories
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodeuser:nodejs /app/uploads /app/logs

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Start application
CMD ["dumb-init", "node", "src/app.js"]