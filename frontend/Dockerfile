# Dependencies stage
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install Git for build info
RUN apk add --no-cache git

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variable for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build arguments for version info
ARG APP_VERSION=1.0.0
ARG BUILD_NUMBER
ARG BUILD_DATE
ARG GIT_COMMIT
ARG GIT_BRANCH

# Set build-time environment variables
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
ENV NEXT_PUBLIC_BUILD_NUMBER=$BUILD_NUMBER
ENV NEXT_PUBLIC_BUILD_DATE=$BUILD_DATE
ENV NEXT_PUBLIC_GIT_COMMIT=$GIT_COMMIT
ENV NEXT_PUBLIC_GIT_BRANCH=$GIT_BRANCH

# Build the application
RUN npm run build

# Runtime stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to app user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]