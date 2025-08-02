#!/bin/bash

# kuno Backup Script
# Usage: ./scripts/backup.sh [container-name] [backup-dir]

set -e

# Configuration
DEFAULT_CONTAINER="kuno"
DEFAULT_BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
CONTAINER=${1:-$DEFAULT_CONTAINER}
BACKUP_DIR=${2:-$DEFAULT_BACKUP_DIR}
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

echo -e "${BLUE}💾 kuno Backup Utility${NC}"
echo -e "${BLUE}📦 Container: ${CONTAINER}${NC}"
echo -e "${BLUE}📂 Backup to: ${BACKUP_PATH}${NC}"
echo ""

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo -e "${RED}❌ Container '${CONTAINER}' not found${NC}"
    exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo -e "${YELLOW}⚠️  Container '${CONTAINER}' is not running${NC}"
    echo -e "${YELLOW}💡 Backup will proceed but data might be incomplete${NC}"
fi

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# Backup database
echo -e "${YELLOW}📊 Backing up database...${NC}"
if docker exec ${CONTAINER} test -f /app/data/blog.db; then
    docker cp ${CONTAINER}:/app/data/blog.db "${BACKUP_PATH}/"
    
    # Create SQL dump for portability
    docker exec ${CONTAINER} sqlite3 /app/data/blog.db .dump > "${BACKUP_PATH}/blog_dump.sql"
    
    # Get database stats
    DB_SIZE=$(docker exec ${CONTAINER} stat -f%z /app/data/blog.db 2>/dev/null || docker exec ${CONTAINER} stat -c%s /app/data/blog.db 2>/dev/null || echo "0")
    ARTICLE_COUNT=$(docker exec ${CONTAINER} sqlite3 /app/data/blog.db "SELECT COUNT(*) FROM articles;" 2>/dev/null || echo "0")
    CATEGORY_COUNT=$(docker exec ${CONTAINER} sqlite3 /app/data/blog.db "SELECT COUNT(*) FROM categories;" 2>/dev/null || echo "0")
    
    echo -e "${GREEN}✅ Database backed up (${DB_SIZE} bytes, ${ARTICLE_COUNT} articles, ${CATEGORY_COUNT} categories)${NC}"
else
    echo -e "${YELLOW}⚠️  Database file not found, skipping...${NC}"
fi

# Backup uploads
echo -e "${YELLOW}📁 Backing up uploads...${NC}"
if docker exec ${CONTAINER} test -d /app/backend/uploads; then
    # Check if uploads directory has content
    UPLOAD_COUNT=$(docker exec ${CONTAINER} find /app/backend/uploads -type f | wc -l 2>/dev/null || echo "0")
    if [ "$UPLOAD_COUNT" -gt 0 ]; then
        docker cp ${CONTAINER}:/app/backend/uploads "${BACKUP_PATH}/"
        echo -e "${GREEN}✅ Uploads backed up (${UPLOAD_COUNT} files)${NC}"
    else
        echo -e "${YELLOW}⚠️  No uploads found, skipping...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Uploads directory not found, skipping...${NC}"
fi

# Backup configuration (environment variables)
echo -e "${YELLOW}⚙️  Backing up configuration...${NC}"
docker inspect ${CONTAINER} > "${BACKUP_PATH}/container_config.json"
docker exec ${CONTAINER} env > "${BACKUP_PATH}/environment.txt"

# Create backup manifest
cat > "${BACKUP_PATH}/backup_manifest.txt" << EOF
kuno Backup Manifest
========================

Backup Date: $(date)
Container: ${CONTAINER}
Backup Directory: ${BACKUP_PATH}

Contents:
- blog.db: SQLite database file
- blog_dump.sql: SQL dump for portability
- uploads/: Media files directory (if exists)
- container_config.json: Container configuration
- environment.txt: Environment variables
- backup_manifest.txt: This file

Database Stats:
- Articles: ${ARTICLE_COUNT:-N/A}
- Categories: ${CATEGORY_COUNT:-N/A}
- Size: ${DB_SIZE:-N/A} bytes

Upload Stats:
- Files: ${UPLOAD_COUNT:-N/A}

Container Info:
- Image: $(docker inspect --format='{{.Config.Image}}' ${CONTAINER})
- Created: $(docker inspect --format='{{.Created}}' ${CONTAINER})
- Status: $(docker inspect --format='{{.State.Status}}' ${CONTAINER})
EOF

# Create compressed archive
echo -e "${YELLOW}🗜️  Creating compressed archive...${NC}"
cd "${BACKUP_DIR}"
tar -czf "${TIMESTAMP}.tar.gz" "${TIMESTAMP}"
ARCHIVE_SIZE=$(ls -lh "${TIMESTAMP}.tar.gz" | awk '{print $5}')

# Cleanup uncompressed backup
rm -rf "${TIMESTAMP}"

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    🎉 Backup Complete!                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${GREEN}✅ Backup saved to: ${BACKUP_DIR}/${TIMESTAMP}.tar.gz${NC}"
echo -e "${GREEN}📦 Archive size: ${ARCHIVE_SIZE}${NC}"
echo ""
echo -e "${BLUE}📋 Backup Contents:${NC}"
tar -tzf "${BACKUP_DIR}/${TIMESTAMP}.tar.gz" | head -10
echo ""
echo -e "${BLUE}🔄 To restore this backup:${NC}"
echo -e "  ./scripts/restore.sh ${CONTAINER} ${BACKUP_DIR}/${TIMESTAMP}.tar.gz"
echo ""
echo -e "${YELLOW}💡 Backup Tips:${NC}"
echo -e "  • Store backups in a safe location (external drive, cloud storage)"
echo -e "  • Test restore process periodically"
echo -e "  • Keep multiple backup versions"
echo -e "  • Consider automated backup scheduling"

# Show recent backups
echo ""
echo -e "${BLUE}📂 Recent Backups:${NC}"
ls -lht "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | head -5 || echo "No previous backups found"