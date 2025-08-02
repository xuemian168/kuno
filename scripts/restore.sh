#!/bin/bash

# kuno Restore Script
# Usage: ./scripts/restore.sh [container-name] [backup-file] [--force]

set -e

# Configuration
DEFAULT_CONTAINER="kuno"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
CONTAINER=${1:-$DEFAULT_CONTAINER}
BACKUP_FILE=$2
FORCE=false

if [[ "$3" == "--force" ]] || [[ "$2" == "--force" ]]; then
    FORCE=true
fi

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file is required${NC}"
    echo "Usage: $0 [container-name] <backup-file> [--force]"
    echo "Example: $0 i18n-blog ./backups/20240101_120000.tar.gz"
    exit 1
fi

echo -e "${BLUE}🔄 kuno Restore Utility${NC}"
echo -e "${BLUE}📦 Container: ${CONTAINER}${NC}"
echo -e "${BLUE}📁 Backup file: ${BACKUP_FILE}${NC}"
echo ""

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo -e "${RED}❌ Container '${CONTAINER}' not found${NC}"
    echo -e "${YELLOW}💡 Available containers:${NC}"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    exit 1
fi

# Warning about data loss
if [ "$FORCE" = false ]; then
    echo -e "${RED}⚠️  WARNING: This will replace all current data in the container!${NC}"
    echo -e "${YELLOW}📊 Current container data will be PERMANENTLY DELETED${NC}"
    echo ""
    echo -e "${BLUE}📋 What will be restored:${NC}"
    
    # Show backup contents
    TEMP_DIR=$(mktemp -d)
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
    BACKUP_MANIFEST=$(find "$TEMP_DIR" -name "backup_manifest.txt" | head -1)
    
    if [ -f "$BACKUP_MANIFEST" ]; then
        echo -e "${YELLOW}📄 Backup Manifest:${NC}"
        cat "$BACKUP_MANIFEST"
    else
        echo -e "${YELLOW}📁 Backup Contents:${NC}"
        tar -tzf "$BACKUP_FILE" | head -10
    fi
    
    rm -rf "$TEMP_DIR"
    echo ""
    
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^yes$ ]]; then
        echo -e "${YELLOW}❌ Restore cancelled${NC}"
        exit 0
    fi
fi

# Stop container if running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo -e "${YELLOW}🛑 Stopping container...${NC}"
    docker stop ${CONTAINER}
fi

# Extract backup
echo -e "${YELLOW}📦 Extracting backup...${NC}"
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Invalid backup file format${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Restore database
echo -e "${YELLOW}📊 Restoring database...${NC}"
if [ -f "$BACKUP_DIR/blog.db" ]; then
    # Start container temporarily for restoration
    docker start ${CONTAINER} || true
    sleep 2
    
    # Backup current database (just in case)
    docker exec ${CONTAINER} cp /app/data/blog.db /app/data/blog.db.backup 2>/dev/null || true
    
    # Copy new database
    docker cp "$BACKUP_DIR/blog.db" ${CONTAINER}:/app/data/
    
    echo -e "${GREEN}✅ Database restored${NC}"
else
    echo -e "${YELLOW}⚠️  No database file in backup, skipping...${NC}"
fi

# Restore uploads
echo -e "${YELLOW}📁 Restoring uploads...${NC}"
if [ -d "$BACKUP_DIR/uploads" ]; then
    # Remove existing uploads
    docker exec ${CONTAINER} rm -rf /app/backend/uploads/* 2>/dev/null || true
    
    # Copy uploads
    docker cp "$BACKUP_DIR/uploads/." ${CONTAINER}:/app/backend/uploads/
    
    UPLOAD_COUNT=$(find "$BACKUP_DIR/uploads" -type f | wc -l)
    echo -e "${GREEN}✅ Uploads restored (${UPLOAD_COUNT} files)${NC}"
else
    echo -e "${YELLOW}⚠️  No uploads in backup, skipping...${NC}"
fi

# Cleanup temp directory
rm -rf "$TEMP_DIR"

# Restart container
echo -e "${YELLOW}🔄 Restarting container...${NC}"
docker restart ${CONTAINER}

# Wait for container to be ready
echo -e "${YELLOW}⏳ Waiting for container to be ready...${NC}"
sleep 5

# Test if restoration was successful
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker exec ${CONTAINER} test -f /app/data/blog.db; then
        break
    fi
    sleep 1
    ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ Container failed to start properly${NC}"
    exit 1
fi

# Verify restoration
echo -e "${YELLOW}🔍 Verifying restoration...${NC}"

# Check database
ARTICLE_COUNT=$(docker exec ${CONTAINER} sqlite3 /app/data/blog.db "SELECT COUNT(*) FROM articles;" 2>/dev/null || echo "0")
CATEGORY_COUNT=$(docker exec ${CONTAINER} sqlite3 /app/data/blog.db "SELECT COUNT(*) FROM categories;" 2>/dev/null || echo "0")

# Check API
sleep 2
HTTP_PORT=$(docker port ${CONTAINER} 80 2>/dev/null | cut -d':' -f2 || echo "80")
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${HTTP_PORT}/api/categories" || echo "000")

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   🎉 Restore Complete!                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}✅ Restoration Summary:${NC}"
echo -e "  📊 Articles restored: ${ARTICLE_COUNT}"
echo -e "  🏷️  Categories restored: ${CATEGORY_COUNT}"
echo -e "  🌐 API Status: ${API_RESPONSE}"

if [ "$API_RESPONSE" = "200" ]; then
    echo -e "${GREEN}  ✅ API is responding correctly${NC}"
else
    echo -e "${YELLOW}  ⚠️  API may need more time to start (Status: ${API_RESPONSE})${NC}"
fi

echo ""
echo -e "${BLUE}🌐 Access Information:${NC}"
echo -e "  📱 Blog: http://localhost:${HTTP_PORT}"
echo -e "  🔧 Admin: http://localhost:${HTTP_PORT}/admin"

echo ""
echo -e "${BLUE}🛠️  Post-Restore Steps:${NC}"
echo -e "  1. Test admin login functionality"
echo -e "  2. Verify all articles are accessible"
echo -e "  3. Check uploaded media files"
echo -e "  4. Update any configuration if needed"

echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "  • The original database backup is saved as blog.db.backup"
echo -e "  • Monitor container logs: docker logs -f ${CONTAINER}"
echo -e "  • If issues occur, check: docker exec -it ${CONTAINER} ls -la /app/data/"

# Show container status
echo ""
echo -e "${BLUE}📊 Container Status:${NC}"
docker ps --filter "name=${CONTAINER}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"