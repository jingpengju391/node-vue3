# Stage 1: Builder
FROM node:20 AS builder

# Set the working directory
WORKDIR /app

# Check if pnpm is installed, if not, install it (using the cache layer to avoid reinstallation)
RUN if ! command -v pnpm > /dev/null; then \
      echo "pnpm not found, installing..."; \
      npm install -g pnpm@9.14.4; \
    else \
      echo "pnpm is already installed, skipping installation."; \
    fi

# First, copy package.json and pnpm-lock.yaml
# This allows Docker to cache the install step and avoid reinstalling dependencies every time
# Only copy the lockfile and package.json first
COPY package.json pnpm-lock.yaml ./ 
COPY patches/ ./patches/

# Install dependencies (this step will be cached and only rerun if package.json or pnpm-lock.yaml changes)
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy the remaining project files
# This step only happens after dependencies are installed
COPY . .

# Assuming you have a script in package.json that calls electron-builder
# Example: "build:linux:test": "electron-builder --linux"
RUN pnpm build:linux:test

# Multi-stage builds to create the final runtime image
# Use arm64v8/ubuntu:20.04 as the runtime environment for ARM 64
FROM arm64v8/ubuntu:20.04 AS runtime

# Set the working directory
WORKDIR /app

# Copy the packaged files from the build stage
COPY --from=builder /app/dist /app/dist
