# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --ignore-scripts

COPY frontend/ ./

# API base URL is baked at build time; /api works for same-origin deployment
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Build backend ───────────────────────────────────────────────────
FROM node:22-alpine AS backend-build

WORKDIR /build

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --ignore-scripts

COPY backend/ ./
RUN npm run build

# ── Stage 3: Production runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runtime

LABEL org.opencontainers.image.title="TL-Dashboard"
LABEL org.opencontainers.image.version="0.3.3"
LABEL org.opencontainers.image.description="Family home dashboard"

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts && \
    addgroup -S dashboard && \
    adduser  -S dashboard -G dashboard

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
