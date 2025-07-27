#!/bin/bash

# Blog Application Rollback Script
# This script rolls back the blog application to a previous backup

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔄 Blog Application Rollback Script"
echo "===================================="

# Check if backup timestamp is provided
if [ -z "$1" ]; then
    echo ""
    echo "Available backups:"
    if [ -d "./backups" ]; then
        ls -la ./backups/ | grep "^d" | awk '{print $9}' | grep -v "^\.$\|^\.\.$" | sort -r | head -10
    else
        print_warning "No backups directory found."
    fi
    echo ""
    echo "Usage: $0 <backup_timestamp>"
    echo "Example: $0 20240127_143052"
    exit 1
fi

BACKUP_TIMESTAMP="$1"
BACKUP_DIR="./backups/$BACKUP_TIMESTAMP"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    print_error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

print_status "Rolling back to backup: $BACKUP_TIMESTAMP"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Confirm rollback
echo ""
print_warning "This will rollback your application to the backup created at $BACKUP_TIMESTAMP"
print_warning "Any changes made after this backup will be lost!"
echo ""
read -p "Are you sure you want to continue? (y/N): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    print_status "Rollback cancelled."
    exit 0
fi

# Step 1: Stop current services
print_status "Stopping current services..."
docker-compose down

# Step 2: Create a backup of current state before rollback
CURRENT_BACKUP="./backups/pre_rollback_$(date +"%Y%m%d_%H%M%S")"
print_status "Creating backup of current state: $CURRENT_BACKUP"
mkdir -p "$CURRENT_BACKUP"

# Backup current Docker volume data
if docker volume inspect blog_blog_data > /dev/null 2>&1; then
    docker run --rm -v blog_blog_data:/data -v "$(pwd)/$CURRENT_BACKUP":/backup alpine sh -c "cp -r /data/* /backup/ 2>/dev/null || true"
fi

# Backup current configuration
[ -f .env ] && cp .env "$CURRENT_BACKUP/.env.backup"

# Step 3: Restore data from backup
print_status "Restoring data from backup..."

# Remove existing volume
docker volume rm blog_blog_data > /dev/null 2>&1 || true

# Create new volume and restore data
docker volume create blog_blog_data > /dev/null 2>&1

if [ "$(ls -A "$BACKUP_DIR" 2>/dev/null | grep -v "\.env\.backup\|docker-compose")" ]; then
    docker run --rm -v blog_blog_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine sh -c "cp -r /backup/* /data/ 2>/dev/null; chown -R 1000:1000 /data 2>/dev/null || true"
    print_success "Data restored from backup"
else
    print_warning "No data files found in backup, creating empty volume"
fi

# Step 4: Restore configuration files
print_status "Restoring configuration files..."

if [ -f "$BACKUP_DIR/.env.backup" ]; then
    cp "$BACKUP_DIR/.env.backup" .env
    print_success "Restored .env configuration"
fi

if [ -f "$BACKUP_DIR/docker-compose.override.yml" ]; then
    cp "$BACKUP_DIR/docker-compose.override.yml" .
    print_success "Restored docker-compose.override.yml"
fi

# Step 5: Start services
print_status "Starting services..."

# Determine deployment mode from backup or ask user
if [ -f "docker-compose.prod.yml" ]; then
    echo ""
    echo "📋 Choose deployment mode:"
    echo "1) Development (with port forwarding)"
    echo "2) Production (with Nginx reverse proxy)"
    read -p "Enter your choice (1 or 2, default: 1): " choice
    choice=${choice:-1}
else
    choice=1
fi

case $choice in
    2)
        print_status "Starting in production mode..."
        docker-compose -f docker-compose.prod.yml up --build -d
        ;;
    *)
        print_status "Starting in development mode..."
        docker-compose up --build -d
        ;;
esac

# Step 6: Wait for services and verify
print_status "Waiting for services to start..."
sleep 15

print_status "Verifying services..."
if docker-compose ps | grep -q "Up"; then
    print_success "Services are running!"
else
    print_error "Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Test application health
print_status "Testing application health..."
sleep 5

if curl -sf http://localhost:8080/api/categories > /dev/null 2>&1 || curl -sf http://localhost/api/categories > /dev/null 2>&1; then
    print_success "API is responding correctly!"
else
    print_warning "API health check failed. The application might still be starting up."
fi

print_success "Rollback completed successfully!"
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""

if [ "$choice" = "2" ]; then
    echo "🌐 Frontend: http://localhost"
    echo "🔗 API: http://localhost/api"
else
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔗 API: http://localhost:8080/api"
fi

echo "📱 Admin Panel: Go to /admin on the frontend URL"
echo ""
echo "📝 Rollback completed to: $BACKUP_TIMESTAMP"
echo "📝 Pre-rollback backup saved to: $CURRENT_BACKUP"
echo "📋 To view logs: docker-compose logs -f"
echo ""
print_success "Rollback process completed! 🎉"