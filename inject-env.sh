#!/bin/sh

# This script injects environment variables into the Next.js standalone build
# at container runtime, allowing dynamic configuration without rebuilds

echo "Injecting runtime environment variables..."

# Fix database directory permissions (resolves readonly database error)
echo "Setting up database directory permissions..."
mkdir -p /app/data
chown -R appuser:appgroup /app/data
chmod -R 755 /app/data

# If database file exists, ensure it has proper permissions
if [ -f /app/data/blog.db ]; then
    chown appuser:appgroup /app/data/blog.db
    chmod 644 /app/data/blog.db
    echo "Fixed permissions for existing database file"
else
    echo "Database file will be created by backend with proper permissions"
fi

# Default API URL
DEFAULT_API_URL="http://localhost:8080/api"

# Get the API URL from environment variable or use default
API_URL="${NEXT_PUBLIC_API_URL:-$DEFAULT_API_URL}"

echo "Setting API URL to: $API_URL"

# Find all JavaScript files in the Next.js build that might contain the API URL
find /app/frontend -name "*.js" -type f | while read -r file; do
    # Replace the placeholder or hardcoded localhost URLs with the runtime API URL
    sed -i "s|http://localhost:8080/api|$API_URL|g" "$file" 2>/dev/null || true
done

echo "Environment variable injection completed"