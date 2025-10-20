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

## Runtime stage - lightweight Alpine-based runtime
FROM node:18-alpine AS runtime

RUN apk add --no-cache \
    alsa-lib \
    pulseaudio-alsa \
    libx11 \
    xvfb-run \
    dbus \
    ttf-dejavu \
    mesa-dri-gallium \
    xauth \
    && rm -rf /var/cache/apk/* || true

WORKDIR /app

# Copy built application and all node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

## Create app user for security
RUN addgroup -S appuser && adduser -S -G appuser -h /app appuser || true
USER appuser

# Ensure the in-container display is used and start the Electron app via entrypoint
ENV DISPLAY=:0
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]


