# ================================
# Build Stage
# ================================
FROM ghcr.io/electron/build:latest AS builder

# Add metadata labels
LABEL org.opencontainers.image.title="YABGO Browser" \
    org.opencontainers.image.description="Yet Another Browser to Go and Visit - A minimal, gesture-driven Chromium browser with AI assistant and MCP integration" \
    org.opencontainers.image.vendor="Codesapien Network" \
    org.opencontainers.image.authors="Codesapien Network <yilmaz@codesapien.net>" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/codesapienbe/yabgo-browser"

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production

# Install build dependencies
USER root
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Setup non-root user with proper permissions
RUN groupadd -r appuser && useradd -r -g appuser -s /bin/bash appuser
RUN mkdir -p /home/appuser/.npm /home/appuser/.cache /app && \
    chown -R appuser:appuser /home/appuser /app

USER appuser
WORKDIR /app

# Copy package files first for better caching
COPY --chown=appuser:appuser package*.json ./

# Install dependencies (including devDeps for build)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY --chown=appuser:appuser . .

# Build application
RUN npm run build:docker

# ================================
# Runtime Stage
# ================================
FROM node:18-slim

# Add runtime metadata
LABEL org.opencontainers.image.title="YABGO Browser Runtime" \
    org.opencontainers.image.description="Runtime container for YABGO Browser" \
    org.opencontainers.image.version="1.1.2"

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    ELECTRON_DISABLE_SECURITY_WARNINGS=true

# Install minimal runtime dependencies for Electron
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libgbm1 \
    libxrandr2 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libgdk-pixbuf2.0-0 \
    libcairo-gobject2 \
    libpango-1.0-0 \
    libatk1.0-0 \
    libcairo2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for runtime
RUN groupadd -r appuser && useradd -r -g appuser -s /bin/bash -d /app appuser

# Copy built application from builder stage
COPY --from=builder --chown=appuser:appuser /app/dist /app/dist
COPY --from=builder --chown=appuser:appuser /app/node_modules /app/node_modules
COPY --from=builder --chown=appuser:appuser /app/package.json /app/package.json

# Install only production dependencies in runtime (including Electron)
USER appuser
RUN npm ci --only=production --no-audit --no-fund

# Set proper permissions
USER root
RUN chown -R appuser:appuser /app

USER appuser
WORKDIR /app

# Health check for Electron app (checks if process is running)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f electron || exit 1

# Default command with security flags
CMD ["npx", "electron", \
    "--no-sandbox", \
    "--disable-dev-shm-usage", \
    "--disable-accelerated-2d-canvas", \
    "--no-first-run", \
    "--disable-background-timer-throttling", \
    "--disable-renderer-backgrounding", \
    "--disable-backgrounding-occluded-windows", \
    "."]


