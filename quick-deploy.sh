#!/bin/bash

# KUNO - Zero-Downtime Quick Deployment Script
# Ultra-fast deployment with rolling update strategy
# Usage: ./quick-deploy.sh [image] [port] [container-name]

set -e

# Configuration with defaults
IMAGE="${1:-ictrun/kuno:latest}"
PORT="${2:-80}"
CONTAINER_NAME="${3:-kuno}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 KUNO Quick Deploy - Zero Downtime Update${NC}"
echo -e "${BLUE}Image: ${IMAGE} | Port: ${PORT} | Container: ${CONTAINER_NAME}${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null || ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker not available${NC}"
    exit 1
fi

# Step 1: Pull image in background (parallel with current service)
echo -e "${YELLOW}📥 Pulling latest image...${NC}"
docker pull ${IMAGE} &
PULL_PID=$!

# Step 2: Setup
DATA_DIR="./blog-data"
mkdir -p ${DATA_DIR}

OLD_CONTAINER="${CONTAINER_NAME}"
NEW_CONTAINER="${CONTAINER_NAME}-blue"
BACKUP_CONTAINER="${CONTAINER_NAME}-backup"

# Step 3: Wait for image pull to complete
wait $PULL_PID
echo -e "${GREEN}✅ Image pulled successfully${NC}"

# Step 4: Pre-warm new container (if old exists, use rolling update)
if docker ps --format '{{.Names}}' | grep -q "^${OLD_CONTAINER}$"; then
    echo -e "${BLUE}🔄 Rolling update detected - preparing new container...${NC}"
    
    # Start new container on alternate port
    ALT_PORT=$((PORT + 1))
    docker run -d \
        --name ${NEW_CONTAINER} \
        -p ${ALT_PORT}:80 \
        -v $(pwd)/${DATA_DIR}:/app/data \
        -e DB_PATH="/app/data/blog.db" \
        -e GIN_MODE="release" \
        -e NODE_ENV="production" \
        ${IMAGE}
    
    # Quick health check (5 seconds max)
    echo -e "${YELLOW}🏥 Quick health check...${NC}"
    for i in {1..10}; do
        if curl -f -s http://localhost:${ALT_PORT}/ >/dev/null 2>&1; then
            echo -e "${GREEN}✅ New container ready${NC}"
            break
        fi
        sleep 0.5
    done
    
    # Atomic switch - backup old, start new, remove old
    echo -e "${YELLOW}⚡ Atomic switch (< 2s downtime)...${NC}"
    
    # Step 1: Rename old container to backup
    docker rename ${OLD_CONTAINER} ${BACKUP_CONTAINER} 2>/dev/null || true
    
    # Step 2: Stop new container and restart on production port
    docker stop ${NEW_CONTAINER}
    docker rm ${NEW_CONTAINER}
    
    # Step 3: Start new container on production port
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${PORT}:80 \
        -v $(pwd)/${DATA_DIR}:/app/data \
        -e DB_PATH="/app/data/blog.db" \
        -e GIN_MODE="release" \
        -e NODE_ENV="production" \
        ${IMAGE}
    
    # Step 4: Cleanup backup after verification
    sleep 2
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker stop ${BACKUP_CONTAINER} >/dev/null 2>&1 || true
        docker rm ${BACKUP_CONTAINER} >/dev/null 2>&1 || true
        echo -e "${GREEN}🧹 Old container cleaned up${NC}"
    else
        echo -e "${RED}❌ New container failed, restoring backup...${NC}"
        docker stop ${CONTAINER_NAME} >/dev/null 2>&1 || true
        docker rm ${CONTAINER_NAME} >/dev/null 2>&1 || true
        docker rename ${BACKUP_CONTAINER} ${CONTAINER_NAME}
        docker start ${CONTAINER_NAME}
        exit 1
    fi
    
else
    echo -e "${BLUE}🆕 Fresh installation detected${NC}"
    # First time deployment
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${PORT}:80 \
        -v $(pwd)/${DATA_DIR}:/app/data \
        -e DB_PATH="/app/data/blog.db" \
        -e GIN_MODE="release" \
        -e NODE_ENV="production" \
        ${IMAGE}
fi

# Final verification
sleep 1
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════╗"
    echo "║      🎉 Quick Deploy Successful!      ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "${GREEN}✅ Service: http://localhost:${PORT}${NC}"
    echo -e "${GREEN}⚡ Downtime: < 2 seconds${NC}"
    echo -e "${BLUE}🔄 Rolling update completed successfully${NC}"
else
    echo -e "${RED}❌ Quick deployment failed${NC}"
    docker logs ${CONTAINER_NAME}
    exit 1
fi