#!/bin/bash

# kuno - Simplified One-Click Deployment from Docker Hub
# No API URL configuration needed - auto-detects endpoints!
# Usage: curl -sSL https://raw.githubusercontent.com/xuemian168/kuno/main/deploy-from-hub.sh | bash

set -e

# Configuration
DEFAULT_IMAGE="ictrun/kuno:latest"
DEFAULT_PORT="80"
DEFAULT_CONTAINER_NAME="kuno"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    KUNO Deployment                           ║"
echo "║                    One-Click Deploy                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo -e "${BLUE}📋 Install Docker: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Prompt for configuration
echo -e "${YELLOW}🔧 Configuration Setup${NC}"
echo ""

read -p "Docker image (default: ${DEFAULT_IMAGE}): " IMAGE
if [ "$IMAGE" = "" ]; then
    IMAGE="$DEFAULT_IMAGE"
fi

read -p "Port (default: ${DEFAULT_PORT}): " PORT
if [ "$PORT" = "" ]; then
    PORT="$DEFAULT_PORT"
fi

read -p "Container name (default: ${DEFAULT_CONTAINER_NAME}): " CONTAINER_NAME
if [ "$CONTAINER_NAME" = "" ]; then
    CONTAINER_NAME="$DEFAULT_CONTAINER_NAME"
fi

# Deployment strategy choice
echo ""
echo -e "${BLUE}🚀 Deployment Strategy:${NC}"
echo "1. Standard Deployment (simple, ~30s downtime)"
echo "2. Blue-Green Deployment (zero-downtime, recommended)"
echo ""
read -p "Choose deployment strategy (1-2, default: 2): " STRATEGY
if [ "$STRATEGY" = "" ] || [ "$STRATEGY" = "2" ]; then
    DEPLOY_MODE="blue-green"
else
    DEPLOY_MODE="standard"
fi

# API URL is now auto-detected, no configuration needed

echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "  🐳 Image: ${IMAGE}"
echo -e "  🌐 Port: ${PORT}"
echo -e "  📦 Container: ${CONTAINER_NAME}"
echo -e "  🚀 Strategy: ${DEPLOY_MODE}"
echo -e "  🤖 API: Auto-detected (no configuration needed)"
echo ""

read -p "Continue with deployment? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Deployment cancelled.${NC}"
    exit 0
fi

# Pull the latest image first
echo -e "${YELLOW}📥 Pulling Docker image...${NC}"
docker pull ${IMAGE}

# Create data directory for persistence
DATA_DIR="./blog-data"
mkdir -p ${DATA_DIR}

if [ "$DEPLOY_MODE" = "standard" ]; then
    echo -e "${BLUE}🔄 Using Standard Deployment...${NC}"
    
    # Stop and remove existing container if it exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
        docker stop ${CONTAINER_NAME} >/dev/null 2>&1 || true
        docker rm ${CONTAINER_NAME} >/dev/null 2>&1 || true
    fi
    
    echo -e "${YELLOW}🚀 Starting new container...${NC}"
    
    # Run the container
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${PORT}:80 \
        -v $(pwd)/${DATA_DIR}:/app/data \
        -e DB_PATH="/app/data/blog.db" \
        -e GIN_MODE="release" \
        -e NODE_ENV="production" \
        ${IMAGE}

else
    echo -e "${BLUE}🔄 Using Blue-Green Deployment...${NC}"
    
    # Blue-Green Deployment Strategy
    OLD_CONTAINER="${CONTAINER_NAME}"
    TEMP_CONTAINER="${CONTAINER_NAME}-new"

    # Check if old container exists
    OLD_EXISTS=false
    if docker ps -a --format '{{.Names}}' | grep -q "^${OLD_CONTAINER}$"; then
        OLD_EXISTS=true
        echo -e "${BLUE}🔄 Found existing container, implementing zero-downtime deployment...${NC}"
    fi

    # Start new container on a temporary port for health check
    TEMP_PORT=$((PORT + 1000))
    echo -e "${YELLOW}🚀 Starting new container on temporary port ${TEMP_PORT}...${NC}"

    # Run the new container on temp port
    docker run -d \
        --name ${TEMP_CONTAINER} \
        -p ${TEMP_PORT}:80 \
        -v $(pwd)/${DATA_DIR}:/app/data \
        -e DB_PATH="/app/data/blog.db" \
        -e GIN_MODE="release" \
        -e NODE_ENV="production" \
        ${IMAGE}

    # Health check - wait for new container to be ready
    echo -e "${YELLOW}🏥 Performing health check...${NC}"
    HEALTH_RETRIES=30
    HEALTH_DELAY=1

    for i in $(seq 1 $HEALTH_RETRIES); do
        if curl -f -s http://localhost:${TEMP_PORT}/api/health >/dev/null 2>&1 || \
           curl -f -s http://localhost:${TEMP_PORT}/ >/dev/null 2>&1; then
            echo -e "${GREEN}✅ New container is healthy!${NC}"
            break
        fi
        
        if [ $i -eq $HEALTH_RETRIES ]; then
            echo -e "${RED}❌ Health check failed after ${HEALTH_RETRIES} attempts${NC}"
            echo -e "${YELLOW}📋 Cleaning up failed deployment...${NC}"
            docker stop ${TEMP_CONTAINER} >/dev/null 2>&1 || true
            docker rm ${TEMP_CONTAINER} >/dev/null 2>&1 || true
            exit 1
        fi
        
        echo -e "${YELLOW}⏳ Waiting for container to be ready... (${i}/${HEALTH_RETRIES})${NC}"
        sleep $HEALTH_DELAY
    done

    # Stop the new container temporarily to reconfigure ports
    docker stop ${TEMP_CONTAINER} >/dev/null 2>&1

    # Now perform the atomic switch (minimal downtime)
    echo -e "${YELLOW}🔄 Performing atomic switch...${NC}"

    if [ "$OLD_EXISTS" = true ]; then
        # Stop old container
        docker stop ${OLD_CONTAINER} >/dev/null 2>&1 || true
    fi

    # Remove temp port mapping and start on production port
    docker rm ${TEMP_CONTAINER} >/dev/null 2>&1

    # Start the new container on production port
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${PORT}:80 \
        -v $(pwd)/${DATA_DIR}:/app/data \
        -e DB_PATH="/app/data/blog.db" \
        -e GIN_MODE="release" \
        -e NODE_ENV="production" \
        ${IMAGE}

    # Clean up old container
    if [ "$OLD_EXISTS" = true ]; then
        echo -e "${YELLOW}🧹 Cleaning up old container...${NC}"
        docker rm ${OLD_CONTAINER} >/dev/null 2>&1 || true
    fi
fi

# Final verification
sleep 2
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   🎉 Deployment Successful!                 ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "${GREEN}✅ Blog is now running at: http://localhost:${PORT}${NC}"
    echo -e "${GREEN}📱 Admin panel: http://localhost:${PORT}/admin${NC}"
    echo -e "${GREEN}🔑 Default login: admin / xuemian168${NC}"
    echo ""
    echo -e "${BLUE}🤖 Smart Features:${NC}"
    echo -e "  ✨ API endpoints auto-detected - works on any domain!"
    echo -e "  🌍 No manual URL configuration needed"
    echo -e "  🔄 Zero-downtime blue-green deployment"
    echo -e "  🏥 Health checks ensure smooth transitions"
    echo ""
    echo -e "${BLUE}📋 Management Commands:${NC}"
    echo -e "  🔍 Check status: docker ps | grep ${CONTAINER_NAME}"
    echo -e "  📊 View logs: docker logs ${CONTAINER_NAME}"
    echo -e "  🛑 Stop blog: docker stop ${CONTAINER_NAME}"
    echo -e "  🔄 Restart blog: docker restart ${CONTAINER_NAME}"
    echo -e "  🗑️  Remove blog: docker rm -f ${CONTAINER_NAME}"
    echo ""
    echo -e "${YELLOW}⚠️  Important: Change the default password after first login!${NC}"
    echo -e "${BLUE}📚 Documentation: https://github.com/xuemian168/kuno${NC}"
else
    echo -e "${RED}❌ Deployment failed. Checking logs...${NC}"
    docker logs ${CONTAINER_NAME}
    exit 1
fi