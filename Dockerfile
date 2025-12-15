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
FROM node:20-alpine AS frontend-builder

# Install frontend dependencies
RUN apk add --no-cache libc6-compat git

WORKDIR /app/frontend

# Copy frontend package files and npmrc
COPY frontend/package*.json ./
COPY frontend/.npmrc ./
RUN npm ci && npm cache clean --force

# Copy frontend source
COPY frontend/ .

# Build arguments for environment variables
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

# Create data directory with uploads subdirectory
RUN mkdir -p /app/data/uploads/images /app/data/uploads/videos /app/data/uploads/branding && \
    chmod -R 755 /app/data/uploads

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

# Set ownership for all app directories
RUN chown -R appuser:appgroup /app /var/log/supervisor

# Build arguments for metadata
ARG BUILD_DATE
ARG VERSION
ARG VCS_REF
ARG NEXT_PUBLIC_APP_VERSION=1.0.0
ARG NEXT_PUBLIC_BUILD_NUMBER=unknown
ARG NEXT_PUBLIC_BUILD_DATE=unknown
ARG NEXT_PUBLIC_GIT_COMMIT=unknown
ARG NEXT_PUBLIC_GIT_BRANCH=unknown

# Set default environment variables (will be overridden by docker-compose)
ENV DB_PATH=/app/data/blog.db
ENV UPLOAD_DIR=/app/data/uploads
ENV GIN_MODE=release
ENV NODE_ENV=production

# Set version information environment variables
ENV NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
ENV NEXT_PUBLIC_BUILD_NUMBER=${NEXT_PUBLIC_BUILD_NUMBER}
ENV NEXT_PUBLIC_BUILD_DATE=${NEXT_PUBLIC_BUILD_DATE}
ENV NEXT_PUBLIC_GIT_COMMIT=${NEXT_PUBLIC_GIT_COMMIT}
ENV NEXT_PUBLIC_GIT_BRANCH=${NEXT_PUBLIC_GIT_BRANCH}
ENV APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
ENV BUILD_NUMBER=${NEXT_PUBLIC_BUILD_NUMBER}
ENV BUILD_DATE=${NEXT_PUBLIC_BUILD_DATE}
ENV GIT_COMMIT=${NEXT_PUBLIC_GIT_COMMIT}
ENV GIT_BRANCH=${NEXT_PUBLIC_GIT_BRANCH}

# Add metadata labels
LABEL maintainer="xuemian168" \
      org.opencontainers.image.title="kuno" \
      org.opencontainers.image.description="A multilingual blog system with Go backend and Next.js frontend" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/xuemian168/kuno" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="xuemian168" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.documentation="https://github.com/xuemian168/kuno#readme"

# Expose port
EXPOSE 80

# Use supervisor to run both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]