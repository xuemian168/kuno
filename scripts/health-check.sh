#!/bin/bash

# kuno Health Check Script
# Usage: ./scripts/health-check.sh [container-name] [--verbose]

set -e

# Configuration
DEFAULT_CONTAINER="kuno"
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
CONTAINER=${1:-$DEFAULT_CONTAINER}
if [[ "$2" == "--verbose" ]] || [[ "$1" == "--verbose" ]]; then
    VERBOSE=true
fi

echo -e "${BLUE}🏥 kuno Health Check${NC}"
echo -e "${BLUE}📦 Container: ${CONTAINER}${NC}"
echo ""

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo -e "${RED}❌ Container '${CONTAINER}' not found${NC}"
    echo -e "${YELLOW}💡 Available containers:${NC}"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo -e "${RED}❌ Container '${CONTAINER}' is not running${NC}"
    echo -e "${YELLOW}📊 Container status:${NC}"
    docker ps -a --filter "name=${CONTAINER}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo -e "${YELLOW}📋 Recent logs:${NC}"
    docker logs --tail 10 ${CONTAINER}
    exit 1
fi

echo -e "${GREEN}✅ Container is running${NC}"

# Check container health
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' ${CONTAINER} 2>/dev/null || echo "no-healthcheck")

case $HEALTH_STATUS in
    "healthy")
        echo -e "${GREEN}✅ Health check: Healthy${NC}"
        ;;
    "unhealthy")
        echo -e "${RED}❌ Health check: Unhealthy${NC}"
        ;;
    "starting")
        echo -e "${YELLOW}🔄 Health check: Starting${NC}"
        ;;
    "no-healthcheck")
        echo -e "${YELLOW}⚠️  No health check configured${NC}"
        ;;
esac

# Get container info
CONTAINER_INFO=$(docker inspect ${CONTAINER})
IMAGE=$(echo $CONTAINER_INFO | jq -r '.[0].Config.Image')
CREATED=$(echo $CONTAINER_INFO | jq -r '.[0].Created' | cut -d'T' -f1)
PORTS=$(docker port ${CONTAINER} 2>/dev/null || echo "No ports exposed")

echo -e "${BLUE}📊 Container Information:${NC}"
echo -e "  🐳 Image: ${IMAGE}"
echo -e "  📅 Created: ${CREATED}"
echo -e "  🌐 Ports: ${PORTS}"

# Check API endpoint
echo ""
echo -e "${YELLOW}🔍 Testing API endpoints...${NC}"

# Get the mapped port
HTTP_PORT=$(docker port ${CONTAINER} 80 2>/dev/null | cut -d':' -f2 || echo "80")
BASE_URL="http://localhost:${HTTP_PORT}"

# Test categories endpoint (health check)
if curl -f -s "${BASE_URL}/api/categories" >/dev/null; then
    echo -e "${GREEN}✅ API Health: /api/categories responding${NC}"
else
    echo -e "${RED}❌ API Health: /api/categories not responding${NC}"
    echo -e "${YELLOW}🔗 Trying: ${BASE_URL}/api/categories${NC}"
fi

# Test frontend
if curl -f -s "${BASE_URL}/" >/dev/null; then
    echo -e "${GREEN}✅ Frontend: Homepage responding${NC}"
else
    echo -e "${RED}❌ Frontend: Homepage not responding${NC}"
    echo -e "${YELLOW}🔗 Trying: ${BASE_URL}/${NC}"
fi

# Test admin panel
if curl -f -s "${BASE_URL}/admin" >/dev/null; then
    echo -e "${GREEN}✅ Admin Panel: Responding${NC}"
else
    echo -e "${RED}❌ Admin Panel: Not responding${NC}"
    echo -e "${YELLOW}🔗 Trying: ${BASE_URL}/admin${NC}"
fi

# Verbose information
if [ "$VERBOSE" = true ]; then
    echo ""
    echo -e "${BLUE}📋 Detailed Information:${NC}"
    
    # Resource usage
    echo -e "${YELLOW}💾 Resource Usage:${NC}"
    docker stats ${CONTAINER} --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    # Environment variables
    echo -e "${YELLOW}🔧 Environment Variables:${NC}"
    docker exec ${CONTAINER} env | grep -E "(NEXT_PUBLIC|DB_PATH|GIN_MODE|NODE_ENV|RECOVERY)" | sort
    
    # Database info
    echo -e "${YELLOW}🗄️  Database Information:${NC}"
    DB_SIZE=$(docker exec ${CONTAINER} du -h /app/data/blog.db 2>/dev/null | cut -f1 || echo "Not found")
    echo -e "  📊 Database size: ${DB_SIZE}"
    
    ARTICLE_COUNT=$(docker exec ${CONTAINER} sqlite3 /app/data/blog.db "SELECT COUNT(*) FROM articles;" 2>/dev/null || echo "N/A")
    echo -e "  📝 Articles: ${ARTICLE_COUNT}"
    
    CATEGORY_COUNT=$(docker exec ${CONTAINER} sqlite3 /app/data/blog.db "SELECT COUNT(*) FROM categories;" 2>/dev/null || echo "N/A")
    echo -e "  🏷️  Categories: ${CATEGORY_COUNT}"
    
    # Recent logs
    echo -e "${YELLOW}📋 Recent Logs (last 5 lines):${NC}"
    docker logs --tail 5 ${CONTAINER}
fi

# Performance test
echo ""
echo -e "${YELLOW}⚡ Performance Test:${NC}"
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' "${BASE_URL}/api/categories" 2>/dev/null || echo "N/A")
if [ "$RESPONSE_TIME" != "N/A" ]; then
    echo -e "  🚀 API Response time: ${RESPONSE_TIME}s"
    if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
        echo -e "${GREEN}  ✅ Good performance (< 1s)${NC}"
    elif (( $(echo "$RESPONSE_TIME < 3.0" | bc -l) )); then
        echo -e "${YELLOW}  ⚠️  Moderate performance (1-3s)${NC}"
    else
        echo -e "${RED}  ❌ Slow performance (> 3s)${NC}"
    fi
else
    echo -e "${RED}  ❌ Could not measure response time${NC}"
fi

# Final summary
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "  🌐 Blog URL: ${BASE_URL}"
echo -e "  🔧 Admin URL: ${BASE_URL}/admin"
echo -e "  📊 Status: $(docker inspect --format='{{.State.Status}}' ${CONTAINER})"

# Management commands
echo ""
echo -e "${BLUE}🛠️  Quick Management Commands:${NC}"
echo -e "  📊 View logs: docker logs -f ${CONTAINER}"
echo -e "  🔄 Restart: docker restart ${CONTAINER}"
echo -e "  🛑 Stop: docker stop ${CONTAINER}"
echo -e "  💾 Backup: docker cp ${CONTAINER}:/app/data ./backup-\$(date +%Y%m%d)"

# Exit with appropriate code
if curl -f -s "${BASE_URL}/api/categories" >/dev/null; then
    echo -e "${GREEN}🎉 Health check passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Health check failed!${NC}"
    exit 1
fi