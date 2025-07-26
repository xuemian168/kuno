# Multi-stage build for unified container
FROM golang:1.23-alpine AS backend-builder

# Install build dependencies for backend
RUN apk add --no-cache gcc musl-dev sqlite-dev

# Set working directory for backend
WORKDIR /app/backend

# Copy backend files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source
COPY backend/ .

# Build backend
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o main cmd/server/main.go

# Frontend build stage
FROM node:18-alpine AS frontend-builder

# Install frontend dependencies
RUN apk add --no-cache libc6-compat git

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci && npm cache clean --force

# Copy frontend source
COPY frontend/ .

# Build arguments for environment variables (leave empty for runtime configuration)
ARG NEXT_PUBLIC_API_URL=""

# Don't set NEXT_PUBLIC_API_URL at build time to allow runtime configuration
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1

# Clean any existing build artifacts
RUN rm -rf .next

# Build frontend with increased memory
RUN npm run build

# Final runtime stage
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates sqlite nginx supervisor nodejs npm

# Create app user with shell
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -u 1001 -G appgroup -s /bin/sh appuser

# Create directories
RUN mkdir -p /app/backend /app/frontend /var/log/supervisor /run/nginx

# Copy backend binary
COPY --from=backend-builder /app/backend/main /app/backend/

# Create uploads directory
RUN mkdir -p /app/backend/uploads

# Copy frontend build
COPY --from=frontend-builder /app/frontend/.next/standalone /app/frontend/
COPY --from=frontend-builder /app/frontend/.next/static /app/frontend/.next/static
COPY --from=frontend-builder /app/frontend/public /app/frontend/public

# Copy nginx configuration
COPY nginx-unified.conf /etc/nginx/nginx.conf

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy environment variable injection script
COPY inject-env.sh /app/
RUN chmod +x /app/inject-env.sh

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R appuser:appgroup /app /var/log/supervisor

# Build arguments for metadata
ARG BUILD_DATE
ARG VERSION
ARG VCS_REF

# Set default environment variables (will be overridden by docker-compose)
ENV DB_PATH=/app/data/blog.db
ENV GIN_MODE=release
ENV NODE_ENV=production

# Add metadata labels
LABEL maintainer="xuemian168" \
      org.opencontainers.image.title="I18N Blog" \
      org.opencontainers.image.description="A multilingual blog system with Go backend and Next.js frontend" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/xuemian168/i18n_blog" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="xuemian168" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.documentation="https://github.com/xuemian168/i18n_blog#readme"

# Expose port
EXPOSE 80

# Use supervisor to run both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]