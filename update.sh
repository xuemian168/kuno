#!/bin/bash

# Blog Application Update Script
# This script updates the blog application while preserving user data

set -e  # Exit on any error

echo "🔄 Blog Application Update Script"
echo "=================================="

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

# Check if script is run from the correct directory
if [ ! -f "docker-compose.yml" ] || [ ! -f "start.sh" ]; then
    print_error "This script must be run from the blog application root directory."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Get current timestamp for backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/$TIMESTAMP"

print_status "Starting update process..."

# Step 1: Create backup directory
print_status "Creating backup directory..."
mkdir -p "$BACKUP_DIR"

# Step 2: Backup current data
print_status "Backing up current data..."

# Check if containers are running
CONTAINER_RUNNING=$(docker-compose ps -q blog 2>/dev/null | wc -l)

if [ "$CONTAINER_RUNNING" -gt 0 ]; then
    print_status "Stopping running containers..."
    docker-compose down
fi

# Backup Docker volume data
print_status "Backing up database and uploaded files..."
if docker volume inspect blog_blog_data > /dev/null 2>&1; then
    docker run --rm -v blog_blog_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine sh -c "cp -r /data/* /backup/ 2>/dev/null || true"
    print_success "Data backup completed: $BACKUP_DIR"
else
    print_warning "No existing data volume found. This might be a fresh installation."
fi

# Backup configuration files
print_status "Backing up configuration files..."
[ -f .env ] && cp .env "$BACKUP_DIR/.env.backup"
[ -f docker-compose.override.yml ] && cp docker-compose.override.yml "$BACKUP_DIR/"

# Step 3: Pull latest changes from Git (if in a Git repository)
if [ -d .git ]; then
    print_status "Pulling latest changes from Git repository..."
    
    # Stash any local changes
    git stash push -m "Auto-stash before update at $TIMESTAMP"
    
    # Get current branch
    CURRENT_BRANCH=$(git branch --show-current)
    
    # Pull latest changes
    git pull origin "$CURRENT_BRANCH" || {
        print_error "Failed to pull latest changes. Please check your Git configuration."
        exit 1
    }
    
    print_success "Successfully pulled latest changes"
else
    print_warning "Not a Git repository. Skipping Git update."
    print_warning "Please manually update your source code before running this script."
fi

# Step 4: Preserve user configuration
print_status "Preserving user configuration..."

# Restore .env file if it was backed up
if [ -f "$BACKUP_DIR/.env.backup" ]; then
    cp "$BACKUP_DIR/.env.backup" .env
    print_success "Restored .env configuration"
fi

# Step 5: Pull latest Docker images (if using external images)
print_status "Pulling latest Docker images..."
docker-compose pull || print_warning "Some images might not be available for pull (using local builds)"

# Step 6: Rebuild and start the application
print_status "Rebuilding and starting the application..."

# Choose deployment mode
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

# Step 7: Wait for services to start and verify
print_status "Waiting for services to start..."
sleep 15

# Check if services are healthy
print_status "Verifying services..."
if docker-compose ps | grep -q "Up"; then
    print_success "Services are running!"
else
    print_error "Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Step 8: Test application health
print_status "Testing application health..."
sleep 5

# Test API endpoint
if curl -sf http://localhost:8080/api/categories > /dev/null 2>&1 || curl -sf http://localhost/api/categories > /dev/null 2>&1; then
    print_success "API is responding correctly!"
else
    print_warning "API health check failed. The application might still be starting up."
fi

# Step 9: Cleanup old Docker images
print_status "Cleaning up old Docker images..."
docker image prune -f > /dev/null 2>&1 || true

print_success "Update completed successfully!"
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
echo "📝 Backup Location: $BACKUP_DIR"
echo "🔄 To rollback: ./rollback.sh $TIMESTAMP"
echo "📋 To view logs: docker-compose logs -f"
echo ""
print_success "Update process completed! 🎉"