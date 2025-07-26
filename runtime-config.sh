#!/bin/sh

# Runtime configuration script for Docker container
# This script runs at container startup to set the API URL dynamically

# Default API URL if not provided
DEFAULT_API_URL="http://localhost:8080/api"

# Get the API URL from environment variable or use default
API_URL="${NEXT_PUBLIC_API_URL:-$DEFAULT_API_URL}"

echo "Setting runtime API URL to: $API_URL"

# Replace the placeholder in the runtime config file
sed -i "s|__API_URL__|$API_URL|g" /app/frontend/public/runtime-config.js

echo "Runtime configuration updated successfully"