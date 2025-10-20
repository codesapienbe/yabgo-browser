# Build stage
FROM node:18-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (dev + prod)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build:docker

# Runtime stage - minimal Debian-based
FROM debian:bullseye-slim

# Install Node.js and minimal runtime dependencies for Electron
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y --no-install-recommends \
    nodejs \
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
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built application and all node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create app user for security
RUN groupadd -r appuser && useradd -r -g appuser -s /bin/bash -d /app appuser
RUN chown -R appuser:appuser /app
USER appuser

# Run the app
CMD ["npx", "electron", ".", "--no-sandbox"]


