#!/bin/bash

# Docker Hub Build and Push Script for EchoPaper
# Usage: ./scripts/build-and-push.sh [tag] [registry]

set -e

# Configuration
DEFAULT_REGISTRY="ictrun"
IMAGE_NAME="EchoPaper"
DEFAULT_TAG="latest"

# Parse arguments
TAG=${1:-$DEFAULT_TAG}
REGISTRY=${2:-$DEFAULT_REGISTRY}
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Building and pushing EchoPaper to Docker Hub${NC}"
echo -e "${BLUE}📦 Image: ${FULL_IMAGE}${NC}"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username:"; then
    echo -e "${YELLOW}⚠️  Not logged in to Docker Hub. Please run 'docker login' first.${NC}"
    read -p "Do you want to login now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker login
    else
        echo -e "${RED}❌ Docker login required. Exiting.${NC}"
        exit 1
    fi
fi

# Build the image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build \
    --build-arg NEXT_PUBLIC_API_URL=https://your-api-domain.com/api \
    --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
    --build-arg VERSION=${TAG} \
    --build-arg VCS_REF=$(git rev-parse --short HEAD) \
    --tag ${FULL_IMAGE} \
    --file Dockerfile \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Tag as latest if this is a version tag
if [[ $TAG =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    LATEST_IMAGE="${REGISTRY}/${IMAGE_NAME}:latest"
    echo -e "${YELLOW}🏷️  Tagging as latest...${NC}"
    docker tag ${FULL_IMAGE} ${LATEST_IMAGE}
fi

# Push to Docker Hub
echo -e "${YELLOW}📤 Pushing to Docker Hub...${NC}"
docker push ${FULL_IMAGE}

if [[ $TAG =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${YELLOW}📤 Pushing latest tag...${NC}"
    docker push ${LATEST_IMAGE}
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Push completed successfully${NC}"
    echo ""
    echo -e "${BLUE}🎉 Image available at: https://hub.docker.com/r/${REGISTRY}/${IMAGE_NAME}${NC}"
    echo -e "${BLUE}📦 Pull command: docker pull ${FULL_IMAGE}${NC}"
    echo ""
    echo -e "${GREEN}📋 To deploy using this image:${NC}"
    echo -e "${GREEN}   docker run -d -p 80:80 --name blog ${FULL_IMAGE}${NC}"
    echo ""
else
    echo -e "${RED}❌ Push failed${NC}"
    exit 1
fi

# Show image info
echo -e "${BLUE}📊 Image Information:${NC}"
docker images ${FULL_IMAGE} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"