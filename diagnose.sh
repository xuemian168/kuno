#!/bin/bash

echo "🔧 KUNO System Diagnosis"
echo "========================"
echo "📅 $(date)"
echo

# Container status
echo "📦 Container Status:"
echo "-------------------"
if docker ps | grep -q kuno; then
    CONTAINER=$(docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}" | grep kuno)
    echo "✅ Running: $CONTAINER"
else
    echo "❌ Container not running"
    echo "📋 Stopped containers:"
    docker ps -a | grep kuno
fi
echo

# Container logs (last 20 lines)
echo "📋 Recent Logs (last 20 lines):"
echo "--------------------------------"
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep kuno | head -1)
if [ ! -z "$CONTAINER_NAME" ]; then
    docker logs --tail 20 $CONTAINER_NAME
else
    echo "❌ No running container found"
fi
echo

# Service connectivity tests
echo "🌐 Service Connectivity:"
echo "------------------------"

# Test backend API
echo -n "Backend API (port 8085): "
if curl -s http://localhost:8085/api/setup/status > /dev/null 2>&1; then
    echo "✅ Accessible"
    echo "   Setup Status: $(curl -s http://localhost:8085/api/setup/status)"
else
    echo "❌ Not accessible"
fi

# Test frontend (port 3000)
echo -n "Frontend (port 3000): "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Accessible"
else
    echo "❌ Not accessible"
fi

# Test nginx (port 80)
echo -n "Nginx (port 80): "
if curl -s http://localhost > /dev/null 2>&1; then
    echo "✅ Accessible"
else
    echo "❌ Not accessible"
fi
echo

# Database check
echo "🗄️  Database Status:"
echo "-------------------"
if [ -f "./data/blog.db" ]; then
    echo "✅ Database file exists: $(ls -lh ./data/blog.db | awk '{print $5}')"
    echo "📊 Database info:"
    sqlite3 ./data/blog.db "SELECT name FROM sqlite_master WHERE type='table';" 2>/dev/null | head -10
else
    echo "❌ Database file not found at ./data/blog.db"
fi
echo

# Environment check
echo "🌍 Environment:"
echo "---------------"
echo "DOCKER: $(docker --version 2>/dev/null || echo 'Not found')"
echo "PWD: $(pwd)"
echo "USER: $(whoami)"
echo

echo "🔍 For real-time logs, run: ./debug-logs.sh"
echo "🔧 To restart container: docker-compose restart"