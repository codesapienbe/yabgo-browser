FROM node:18-bullseye

ENV DEBIAN_FRONTEND=noninteractive

# Minimal system deps for Electron
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libgbm1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install node modules (including devDeps so electron binary is available)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . ./
RUN npm run build || true

# Run electron against the built assets. The container expects the host X server
# to be exposed via DISPLAY and /tmp/.X11-unix. Use the Makefile run target to
# run the container with appropriate mounts and env vars.
CMD ["npx", "electron", "--no-sandbox", "."]


