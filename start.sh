#!/bin/bash

# Blog Application Startup Script

echo "🚀 Starting Blog Application..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
fi

# Choose deployment mode
echo "📋 Choose deployment mode:"
echo "1) Development (with port forwarding)"
echo "2) Production (with Nginx reverse proxy)"
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo "🔧 Starting in development mode..."
        docker-compose up --build -d
        ;;
    2)
        echo "🏭 Starting in production mode..."
        docker-compose -f docker-compose.prod.yml up --build -d
        ;;
    *)
        echo "❌ Invalid choice. Defaulting to development mode..."
        docker-compose up --build -d
        ;;
esac

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Checking service status..."
docker-compose ps

echo ""
echo "✅ Blog application is starting up!"
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
echo "📝 To stop the application, run: docker-compose down"
echo "🔄 To restart: docker-compose restart"
echo "📋 To view logs: docker-compose logs -f"