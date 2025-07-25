#!/bin/bash

# Blog Application Stop Script

echo "🛑 Stopping Blog Application..."

# Stop both development and production setups
docker-compose down
docker-compose -f docker-compose.prod.yml down

echo "✅ Blog application stopped successfully!"
echo ""
echo "📝 To start again, run: ./start.sh"
echo "🗑️  To remove all data, run: docker-compose down -v"