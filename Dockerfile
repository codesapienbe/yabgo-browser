FROM ghcr.io/electron/build:latest

ENV DEBIAN_FRONTEND=noninteractive

# Minimal system deps for Electron
# Temporarily switch to root to run apt-get (some base images use a non-root user)
USER root
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libgbm1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Return to default non-root user (UID 1000) used by the base image
USER 1000

WORKDIR /app

# Ensure /app, npm cache and generic cache locations are writable by the non-root user before installing
USER root
RUN mkdir -p /.npm /.cache /app && chown -R 1000:0 /.npm /.cache /app
USER 1000

# Install node modules (including devDeps so electron binary is available)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . ./
RUN ls -la && echo "=== SRC DIR ===" && ls -la src/ && echo "=== MAIN DIR ===" && ls -la src/main/ && echo "=== MANAGERS DIR ===" && ls -la src/main/managers/ | head -10
RUN npm run build:docker

# Run electron against the built assets. The container expects the host X server
# to be exposed via DISPLAY and /tmp/.X11-unix. Use the Makefile run target to
# run the container with appropriate mounts and env vars.
CMD ["npx", "electron", "--no-sandbox", "."]


