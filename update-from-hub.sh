#!/bin/bash

# Blog Application Remote Update Script
# This script updates the blog application from Docker Hub while preserving user data

set -e  # Exit on any error

echo "🔄 Blog Application Remote Update Script"
echo "========================================="

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

# Configuration
GITHUB_REPO="xuemian168/kuno"
DOCKER_IMAGE="ictrun/kuno:latest"

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

print_status "Starting remote update process..."

# Step 1: Create backup directory
print_status "Creating backup directory..."
mkdir -p "$BACKUP_DIR"

# Step 2: Backup current data
print_status "Backing up current data..."

# Check if containers are running
CONTAINER_RUNNING=$(docker-compose ps -q 2>/dev/null | wc -l)

if [ "$CONTAINER_RUNNING" -gt 0 ]; then
    print_status "Stopping running containers..."
    docker-compose down 2>/dev/null || true
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
[ -f docker-compose.yml ] && cp docker-compose.yml "$BACKUP_DIR/docker-compose.yml.backup"
[ -f docker-compose.prod.yml ] && cp docker-compose.prod.yml "$BACKUP_DIR/docker-compose.prod.yml.backup"

# Step 3: Download latest Docker Compose files
print_status "Downloading latest configuration files..."

# Download docker-compose.yml
curl -sSL "https://raw.githubusercontent.com/$GITHUB_REPO/main/docker-compose.yml" -o docker-compose.yml.new || {
    print_error "Failed to download docker-compose.yml"
    exit 1
}

# Download docker-compose.prod.yml
curl -sSL "https://raw.githubusercontent.com/$GITHUB_REPO/main/docker-compose.prod.yml" -o docker-compose.prod.yml.new || {
    print_warning "Failed to download docker-compose.prod.yml"
}

# Download .env.example
curl -sSL "https://raw.githubusercontent.com/$GITHUB_REPO/main/.env.example" -o .env.example.new || {
    print_warning "Failed to download .env.example"
}

# Step 4: Update Docker Compose files to use Docker Hub image
print_status "Updating configuration to use Docker Hub image..."

# Modify docker-compose.yml to use Docker Hub image
sed -i.bak "s|build:|#build:|g; s|context:|#context:|g; s|dockerfile:|#dockerfile:|g; s|args:|#args:|g" docker-compose.yml.new
sed -i.bak "s|#image:|image:|g" docker-compose.yml.new || {
    # If there's no #image: line, add it
    sed -i.bak "/container_name:/i\\
    image: $DOCKER_IMAGE" docker-compose.yml.new
}

# If docker-compose.prod.yml exists, update it too
if [ -f docker-compose.prod.yml.new ]; then
    sed -i.bak "s|build:|#build:|g; s|context:|#context:|g; s|dockerfile:|#dockerfile:|g; s|args:|#args:|g" docker-compose.prod.yml.new
    sed -i.bak "s|#image:|image:|g" docker-compose.prod.yml.new || {
        sed -i.bak "/container_name:/i\\
        image: $DOCKER_IMAGE" docker-compose.prod.yml.new
    }
fi

# Step 5: Replace old files with new ones
mv docker-compose.yml.new docker-compose.yml
[ -f docker-compose.prod.yml.new ] && mv docker-compose.prod.yml.new docker-compose.prod.yml
[ -f .env.example.new ] && mv .env.example.new .env.example

# Clean up backup files
rm -f *.bak

# Step 6: Preserve user configuration
print_status "Preserving user configuration..."

# Create .env if it doesn't exist
if [ ! -f .env ] && [ -f "$BACKUP_DIR/.env.backup" ]; then
    cp "$BACKUP_DIR/.env.backup" .env
    print_success "Restored .env configuration"
elif [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
    print_warning "Created .env from example. Please review and update as needed."
fi

# Step 7: Pull latest Docker image
print_status "Pulling latest Docker image from Docker Hub..."
docker pull "$DOCKER_IMAGE" || {
    print_error "Failed to pull Docker image: $DOCKER_IMAGE"
    exit 1
}

# Step 8: Start the application
print_status "Starting the application..."

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
        docker-compose -f docker-compose.prod.yml up -d
        ;;
    *)
        print_status "Starting in development mode..."
        docker-compose up -d
        ;;
esac

# Step 9: Wait for services to start and verify
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

# Step 10: Test application health
print_status "Testing application health..."
sleep 5

# Test API endpoint
if curl -sf http://localhost:8080/api/categories > /dev/null 2>&1 || curl -sf http://localhost/api/categories > /dev/null 2>&1; then
    print_success "API is responding correctly!"
else
    print_warning "API health check failed. The application might still be starting up."
fi

# Step 11: Cleanup old Docker images
print_status "Cleaning up old Docker images..."
docker image prune -f > /dev/null 2>&1 || true

print_success "Remote update completed successfully!"
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

# Download rollback script if not exists
if [ ! -f rollback.sh ]; then
    print_status "Downloading rollback script..."
    curl -sSL "https://raw.githubusercontent.com/$GITHUB_REPO/main/rollback.sh" -o rollback.sh
    chmod +x rollback.sh
fi

print_success "Remote update process completed! 🎉"

echo ""
echo "ℹ️  Update Information:"
echo "   - Updated from Docker Hub image: $DOCKER_IMAGE"
echo "   - Your data has been preserved"
echo "   - Configuration files have been updated"
echo "   - Previous version backed up to: $BACKUP_DIR"