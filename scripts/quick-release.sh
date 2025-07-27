#!/bin/bash

# Quick Release Script for I18N Blog
# Usage: ./scripts/quick-release.sh <version>
# This script creates a tag and triggers GitHub Actions for automated release

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
VERSION=$1

if [ -z "$VERSION" ]; then
    echo -e "${RED}❌ Version is required${NC}"
    echo "Usage: $0 <version>"
    echo "Example: $0 v1.0.0"
    exit 1
fi

# Validate version format
if [[ ! $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ Invalid version format. Use semantic versioning (e.g., v1.0.0)${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Quick Release Process${NC}"
echo -e "${BLUE}📦 Version: ${VERSION}${NC}"
echo ""

# Check if we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  Warning: You are not on the main branch (current: $CURRENT_BRANCH)${NC}"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Release cancelled${NC}"
        exit 1
    fi
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Working directory is not clean. Please commit or stash changes.${NC}"
    git status --short
    exit 1
fi

# Check if tag already exists
if git tag -l | grep -q "^${VERSION}$"; then
    echo -e "${YELLOW}⚠️  Tag ${VERSION} already exists${NC}"
    read -p "Do you want to delete and recreate it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🗑️  Deleting existing tag...${NC}"
        git tag -d ${VERSION}
        git push origin :refs/tags/${VERSION} 2>/dev/null || echo "Remote tag not found or already deleted"
    else
        echo -e "${RED}❌ Release cancelled${NC}"
        exit 1
    fi
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin main

# Update version in package.json
if [ -f "frontend/package.json" ]; then
    echo -e "${YELLOW}📝 Updating package.json version...${NC}"
    cd frontend
    npm version ${VERSION#v} --no-git-tag-version
    cd ..
    git add frontend/package.json
fi

# Create and push tag
echo -e "${YELLOW}🏷️  Creating git tag...${NC}"
git commit -m "chore: bump version to ${VERSION}" || true
git tag -a ${VERSION} -m "Release ${VERSION}"

echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git push origin main
git push origin ${VERSION}

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   🎉 Tag Created Successfully!              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}✅ Tag ${VERSION} pushed to GitHub${NC}"
echo -e "${BLUE}🔄 GitHub Actions will automatically build and release to Docker Hub${NC}"
echo ""
echo -e "${BLUE}📋 Check progress at:${NC}"
echo -e "   https://github.com/xuemian168/i18n_blog/actions"
echo ""
echo -e "${BLUE}📦 Once completed, the image will be available at:${NC}"
echo -e "   docker pull ictrun/i18n_blog:${VERSION}"
echo -e "   docker pull ictrun/i18n_blog:latest"