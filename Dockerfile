# Build args for multi-arch: build stages run on the host (native) platform
# to avoid QEMU emulation issues with Node.js. Only the runtime stage uses
# the target platform.
ARG BUILDPLATFORM
ARG TARGETPLATFORM

# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend-build

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

COPY frontend/ ./

# API base URL is baked at build time; /api works for same-origin deployment
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Build backend ───────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM node:22-alpine AS backend-build

WORKDIR /build

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts

COPY backend/ ./
RUN npm run build

# Install production-only deps in a separate layer so the runtime stage
# can copy node_modules without running npm on the target platform via QEMU.
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 3: Production runtime ──────────────────────────────────────────────
FROM --platform=$TARGETPLATFORM node:22-alpine AS runtime

LABEL org.opencontainers.image.title="TL-Dashboard"
LABEL org.opencontainers.image.version="0.5.0"
LABEL org.opencontainers.image.description="Family home dashboard"

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S dashboard && \
    adduser  -S dashboard -G dashboard

# Production node_modules built natively in the backend-build stage
COPY --from=backend-build /build/node_modules ./node_modules
COPY --from=backend-build /build/package.json ./package.json

# Backend compiled JS
COPY --from=backend-build /build/dist ./dist

# Frontend built assets — served at / by Express
COPY --from=frontend-build /build/dist ./public

# Mount points
RUN mkdir -p /app/backgrounds /app/data && \
    chown -R dashboard:dashboard /app/backgrounds /app/data

USER dashboard

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "dist/index.js"]
