#!/bin/bash

# I18N Blog Release Script
# Usage: ./scripts/release.sh <version> [--dry-run]

set -e

# Configuration
REGISTRY="ictrun"
IMAGE_NAME="i18n_blog"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
VERSION=$1
DRY_RUN=false

if [[ "$2" == "--dry-run" ]]; then
    DRY_RUN=true
fi

if [ -z "$VERSION" ]; then
    echo -e "${RED}❌ Version is required${NC}"
    echo "Usage: $0 <version> [--dry-run]"
    echo "Example: $0 v1.0.0"
    exit 1
fi

# Validate version format
if [[ ! $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ Invalid version format. Use semantic versioning (e.g., v1.0.0)${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 I18N Blog Release Process${NC}"
echo -e "${BLUE}📦 Version: ${VERSION}${NC}"
echo -e "${BLUE}🏷️  Image: ${REGISTRY}/${IMAGE_NAME}:${VERSION}${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🧪 DRY RUN MODE - No changes will be made${NC}"
fi

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
    echo -e "${RED}❌ Tag ${VERSION} already exists${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
if [ "$DRY_RUN" = false ]; then
    git pull origin main
fi

# Update version in package.json if it exists
if [ -f "frontend/package.json" ]; then
    echo -e "${YELLOW}📝 Updating package.json version...${NC}"
    if [ "$DRY_RUN" = false ]; then
        cd frontend
        npm version ${VERSION#v} --no-git-tag-version
        cd ..
        git add frontend/package.json
    else
        echo "Would update frontend/package.json to version ${VERSION#v}"
    fi
fi

# Create and push tag
echo -e "${YELLOW}🏷️  Creating git tag...${NC}"
if [ "$DRY_RUN" = false ]; then
    git commit -m "chore: bump version to ${VERSION}" || true
    git tag -a ${VERSION} -m "Release ${VERSION}"
    git push origin main
    git push origin ${VERSION}
else
    echo "Would create tag: ${VERSION}"
    echo "Would push to origin"
fi

# Build and push Docker image
echo -e "${YELLOW}🔨 Building and pushing Docker image...${NC}"
if [ "$DRY_RUN" = false ]; then
    ./scripts/build-and-push.sh ${VERSION}
else
    echo "Would run: ./scripts/build-and-push.sh ${VERSION}"
fi

# Create GitHub release (if gh CLI is available)
if command -v gh &> /dev/null; then
    echo -e "${YELLOW}📋 Creating GitHub release...${NC}"
    if [ "$DRY_RUN" = false ]; then
        gh release create ${VERSION} \
            --title "Release ${VERSION}" \
            --notes "## What's Changed

- Docker image: \`${REGISTRY}/${IMAGE_NAME}:${VERSION}\`
- Docker Hub: https://hub.docker.com/r/${REGISTRY}/${IMAGE_NAME}

## Quick Deploy

\`\`\`bash
# One-click deployment
curl -sSL https://raw.githubusercontent.com/xuemian168/i18n_blog/main/deploy-from-hub.sh | bash

# Or with specific version
docker run -d \\
  --name i18n_blog \\
  -p 80:80 \\
  -v blog-data:/app/data \\
  -e NEXT_PUBLIC_API_URL=https://your-domain.com/api \\
  ${REGISTRY}/${IMAGE_NAME}:${VERSION}
\`\`\`

## Full Changelog

**Full Changelog**: https://github.com/xuemian168/i18n_blog/compare/v$(git describe --tags --abbrev=0 ${VERSION}^)...${VERSION}" \
            --latest
    else
        echo "Would create GitHub release for ${VERSION}"
    fi
else
    echo -e "${YELLOW}⚠️  GitHub CLI not found. Skipping GitHub release creation.${NC}"
    echo -e "${BLUE}📋 Manual steps after release:${NC}"
    echo -e "1. Go to https://github.com/xuemian168/i18n_blog/releases"
    echo -e "2. Create a new release for tag ${VERSION}"
    echo -e "3. Add release notes"
fi

if [ "$DRY_RUN" = false ]; then
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   🎉 Release Successful!                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "${GREEN}✅ Version ${VERSION} released successfully${NC}"
    echo -e "${GREEN}🐳 Docker image: ${REGISTRY}/${IMAGE_NAME}:${VERSION}${NC}"
    echo -e "${GREEN}🌐 Docker Hub: https://hub.docker.com/r/${REGISTRY}/${IMAGE_NAME}${NC}"
    echo ""
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo -e "1. Verify the Docker image works: docker run --rm ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
    echo -e "2. Update documentation if needed"
    echo -e "3. Announce the release"
else
    echo -e "${YELLOW}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     🧪 Dry Run Complete                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "${YELLOW}📋 Would have created release ${VERSION}${NC}"
    echo -e "${YELLOW}🔄 Run without --dry-run to execute the release${NC}"
fi