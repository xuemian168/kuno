#!/bin/bash

# 构建信息生成脚本
# 这个脚本可以在 Docker 构建过程中运行，生成版本和构建信息

echo "🔧 Generating build information..."

# 获取 Git 信息
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# 获取版本信息（从 package.json 或标签）
VERSION=$(node -p "require('./frontend/package.json').version" 2>/dev/null || echo "1.0.0")

# 生成构建号（基于时间戳）
BUILD_DATE=$(date +"%Y-%m-%d")
BUILD_TIME=$(date +"%H%M")
BUILD_NUMBER="${BUILD_DATE//-/.}.${BUILD_TIME}"

# 输出构建信息
echo "📦 Build Information:"
echo "   Version: $VERSION"
echo "   Build: $BUILD_NUMBER"
echo "   Date: $BUILD_DATE"
echo "   Commit: $GIT_COMMIT"
echo "   Branch: $GIT_BRANCH"

# 生成环境变量文件（用于 Docker 构建）
cat > build.env << EOF
NEXT_PUBLIC_APP_VERSION=$VERSION
NEXT_PUBLIC_BUILD_NUMBER=$BUILD_NUMBER
NEXT_PUBLIC_BUILD_DATE=$BUILD_DATE
NEXT_PUBLIC_GIT_COMMIT=$GIT_COMMIT
NEXT_PUBLIC_GIT_BRANCH=$GIT_BRANCH
EOF

echo "✅ Build info saved to build.env"

# 如果在 Docker 中，可以将这些信息注入到构建中
if [ -n "$DOCKER_BUILD" ]; then
    echo "🐳 Docker build detected, injecting build info..."
    # 这些环境变量将在构建时可用
    export NEXT_PUBLIC_APP_VERSION=$VERSION
    export NEXT_PUBLIC_BUILD_NUMBER=$BUILD_NUMBER
    export NEXT_PUBLIC_BUILD_DATE=$BUILD_DATE
    export NEXT_PUBLIC_GIT_COMMIT=$GIT_COMMIT
    export NEXT_PUBLIC_GIT_BRANCH=$GIT_BRANCH
fi

# 输出 Docker 构建命令示例
echo ""
echo "🐳 Docker Build Example:"
echo "docker build \\"
echo "  --build-arg APP_VERSION=$VERSION \\"
echo "  --build-arg BUILD_NUMBER=$BUILD_NUMBER \\"
echo "  --build-arg BUILD_DATE=$BUILD_DATE \\"
echo "  --build-arg GIT_COMMIT=$GIT_COMMIT \\"
echo "  --build-arg GIT_BRANCH=$GIT_BRANCH \\"
echo "  -f frontend/Dockerfile \\"
echo "  -t blog-frontend:$VERSION ."