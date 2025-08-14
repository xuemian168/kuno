[中文](./README_CN.md) | English

# KUNO

![kuno](./docs/kuno.png)

**KUNO** /ˈkuːnoʊ/

The name draws inspiration from the fusion of Eastern philosophy and modern technological concepts:
> - "KUN" is the pinyin of "坤" (kūn) from the I Ching (Book of Changes), meaning earth, carrying all things, symbolizing the system's comprehensive support and inclusiveness for multilingual and multi-format content.
> - "O" represents Origin and Open, symbolizing the beginning of content and the system's openness, extensibility, and modern architectural design philosophy.

Our logo is inspired by the Kun hexagram ☷ — six lines representing earth, harmony, carrying capacity, and inclusiveness, which also embodies KUNO system's core values.

KUNO is designed as a lightweight, blazing-fast, i18n-first CMS, empowering creators to build rich, structured content ecosystems with freedom and harmony.

A full-stack blog application with Go backend and Next.js frontend, containerized with Docker for easy deployment.

## Demo

[QUT.EDU.KG](https://qut.edu.kg/)

## Features

- 📝 **Blog Management**: Create, edit, and delete articles
- 🌍 **Multi-language Support**: 70+ languages interface
- 🏷️ **Category System**: Organize posts by categories  
- 🌙 **Dark Mode**: Toggle between light and dark themes
- 📱 **Responsive Design**: Mobile-first responsive layout
- ⚡ **Fast Performance**: Optimized with modern frameworks
- 🔒 **Admin Panel**: Complete content management system
- ⚙️ **Site Settings**: Customizable site title and subtitle
- 🖋️ **Markdown Editor**: Rich text editing with live preview
- 🐳 **Docker Ready**: One-click deployment with Docker
- 🔄 **Zero-Downtime Deployment**: Blue-green deployment with <2s downtime
- 🏥 **Health Checks**: Automatic service health verification
- 🛡️ **Auto-Rollback**: Failed deployments automatically restore previous version
- 🤖 **LLMs.txt Support**: AI-friendly content description for search engines and language models
- 📊 **Usage Analytics**: Comprehensive usage statistics and performance monitoring

### 🌐 Supported Languages

The system supports interface switching for 70+ languages:

| Region | Languages |
|--------|-----------|
| **Core** | 🇨🇳 Chinese • 🇬🇧 English |
| **Asian** | 🇯🇵 Japanese • 🇰🇷 Korean • 🇹🇭 Thai • 🇻🇳 Vietnamese • 🇮🇩 Indonesian • 🇲🇾 Malay • 🇵🇭 Filipino • 🇲🇲 Myanmar • 🇰🇭 Khmer • 🇱🇦 Lao |
| **European** | 🇪🇸 Spanish • 🇫🇷 French • 🇩🇪 German • 🇷🇺 Russian • 🇵🇹 Portuguese • 🇮🇹 Italian • 🇳🇱 Dutch • 🇸🇪 Swedish • 🇩🇰 Danish • 🇳🇴 Norwegian • 🇫🇮 Finnish • 🇵🇱 Polish • 🇨🇿 Czech • 🇸🇰 Slovak • 🇭🇺 Hungarian • 🇷🇴 Romanian • 🇧🇬 Bulgarian • 🇭🇷 Croatian • 🇷🇸 Serbian • 🇸🇮 Slovenian • 🇪🇪 Estonian • 🇱🇻 Latvian • 🇱🇹 Lithuanian • 🇺🇦 Ukrainian • 🇧🇾 Belarusian • 🇹🇷 Turkish • 🇬🇷 Greek • 🇦🇱 Albanian • 🇦🇲 Armenian • 🇦🇿 Azerbaijani • 🇬🇪 Georgian |
| **Middle Eastern & African** | 🇸🇦 Arabic • 🇮🇱 Hebrew • 🇮🇷 Persian • 🇵🇰 Urdu • 🇪🇹 Amharic • 🇰🇪 Swahili • 🇿🇦 Zulu • 🇿🇦 Afrikaans |
| **South Asian** | 🇮🇳 Hindi • 🇧🇩 Bengali • 🇮🇳 Tamil • 🇮🇳 Telugu • 🇮🇳 Malayalam • 🇮🇳 Kannada • 🇮🇳 Gujarati • 🇮🇳 Punjabi • 🇮🇳 Marathi • 🇳🇵 Nepali • 🇱🇰 Sinhala |
| **Pacific & Others** | 🇳🇿 Māori • 🇼🇸 Samoan • 🇹🇴 Tongan • 🇫🇯 Fijian • 🇮🇪 Irish • 🇮🇸 Icelandic • 🇲🇹 Maltese • 🇪🇸 Basque • 🇪🇸 Catalan |

## Quick Start

### 🚀 One-Click Deployment (Recommended)

Create a dedicated directory and deploy:

```bash
# 1. Create dedicated directory (recommended: /opt)
sudo mkdir -p /opt/kuno
cd /opt/kuno

# 2. Download and execute deployment script
curl -sSL "https://raw.githubusercontent.com/xuemian168/kuno/main/deploy-from-hub.sh?$(date +%s)" -o deploy.sh && chmod +x deploy.sh && sudo ./deploy.sh
```

The deployment script will guide you through a simplified configuration process:
1. **Choose Protocol**: HTTP or HTTPS (HTTPS recommended)
2. **Enter Domain**: e.g., `qut.edu.kg`
3. **Select Deployment Strategy**:
   - **Standard Deployment**: Simple deployment with ~30s downtime
   - **Blue-Green Deployment**: Zero-downtime deployment with health checks (recommended)
4. **Auto-construct API URL**: The system will automatically generate the complete API URL, e.g., `https://qut.edu.kg/api`

### ⚡ Quick Deploy (Ultra-Fast Update)

For existing deployments that need rapid updates:

```bash
# Ultra-fast deployment with <2s downtime
./quick-deploy.sh [image] [port] [container-name]

# Example:
./quick-deploy.sh ictrun/kuno:latest 80 kuno
```

> **🎯 Deployment Features**:
> - **Zero-Downtime Deployment**: Blue-green strategy with health checks
> - **Rolling Updates**: <2 seconds downtime for production environments  
> - **Automatic Rollback**: Failed deployments automatically restore previous version
> - **Health Verification**: Ensures new container is fully ready before switching
> - **Parallel Processing**: Image pulling happens while service continues running

> **Important Notes**:
> - Do not use `curl | bash` as it will cause syntax errors
> - Deploy in `/opt/kuno` to avoid cluttering the home directory
> - The new deployment script simplifies the configuration process - users only need to select protocol and enter domain

### Manual Deployment

```bash
# 1. Create dedicated directory
sudo mkdir -p /opt/kuno
cd /opt/kuno

# 2. Create data directory
mkdir -p ./blog-data

# 3. Run container
docker run -d \
  --name kuno \
  --restart unless-stopped \
  -p 80:80 \
  -v /opt/kuno/blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL="http://localhost/api" \
  -e DB_PATH="/app/data/blog.db" \
  -e GIN_MODE="release" \
  -e NODE_ENV="production" \
  -e JWT_SECRET="your-secure-secret-key" \
  ictrun/kuno:latest
```

**⚠️ Important Configuration**:
- `NEXT_PUBLIC_API_URL` - **MUST be modified according to your network environment**
  - Local access: `http://localhost/api` or `http://127.0.0.1/api`
  - LAN access: `http://192.168.1.100/api` (use your actual IP)
  - Public domain: `https://yourdomain.com/api`
  - Non-80 port: `http://localhost:8080/api`
- `JWT_SECRET` - **Strongly recommended for production**
  - Secret key for signing JWT tokens
  - If not set, a random key is auto-generated (changes on restart)
  - Use a complex string of at least 32 characters

**Directory Structure**:
- `/opt/kuno/` - Application main directory
- `/opt/kuno/blog-data/` - Unified data storage
  - `/opt/kuno/blog-data/blog.db` - SQLite database
  - `/opt/kuno/blog-data/uploads/` - Upload files directory
    - `/opt/kuno/blog-data/uploads/images/` - Image files
    - `/opt/kuno/blog-data/uploads/videos/` - Video files
    - `/opt/kuno/blog-data/uploads/branding/` - Branding files
- `/opt/kuno/deploy.sh` - Deployment script (one-click method)

### 🛠️ Development Setup

#### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

#### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd blog
   ```

2. **Start the application**:
   ```bash
   ./start.sh
   ```

3. **Access the application**:
   - **Frontend**: http://localhost:3000
   - **API**: http://localhost:8080/api
   - **Admin Panel**: http://localhost:3000/admin

### 🐳 Docker Hub Deployment Options

#### Option 1: Using Docker Compose (Recommended)

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/xuemian168/kuno/main/docker-compose.hub.yml

# Configure environment
cp .env.hub.example .env
# Edit .env with your settings

# Deploy
docker-compose -f docker-compose.hub.yml up -d
```

#### Option 2: Direct Docker Run

```bash
# Create dedicated directory
cd /opt/kuno

# Run container with bind mount (modify NEXT_PUBLIC_API_URL!)
docker run -d \
  --name kuno \
  --restart unless-stopped \
  -p 80:80 \
  -v /opt/kuno/blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL=https://your-api-domain.com/api \
  -e DB_PATH=/app/data/blog.db \
  ictrun/kuno:latest
```

#### Available Tags

- `ictrun/kuno:latest` - Latest stable release
- `ictrun/kuno:v1.0.0` - Specific version
- `ictrun/kuno:develop` - Development branch

### 🔧 Configuration

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-domain.com/api` | Your API endpoint URL |
| `DB_PATH` | `/app/data/blog.db` | SQLite database path |
| `UPLOAD_DIR` | `/app/data/uploads` | Upload files directory path |
| `GIN_MODE` | `release` | Go Gin mode (release/debug) |
| `NODE_ENV` | `production` | Node.js environment |
| `RECOVERY_MODE` | `false` | Password recovery mode |
| `JWT_SECRET` | *(auto-generated)* | JWT signing secret (recommended for production) |

#### First Time Setup

1. **Access the blog**: http://localhost (or your domain)
2. **Admin login**: http://localhost/admin
   - Username: `admin`
   - Password: `xuemian168`
3. **⚠️ Important**: Change the default password immediately!

### 📊 Management Commands

```bash
# Check status
docker ps | grep kuno

# View logs
docker logs kuno

# Backup data (from /opt/kuno)
cd /opt/kuno
sudo tar -czf blog-backup-$(date +%Y%m%d).tar.gz ./blog-data

# Stop and remove
docker stop kuno
docker rm kuno
```

## 🔄 Upgrade Instructions

### 🚀 Quick Upgrade (Zero-Downtime, Recommended)

For the fastest, safest upgrade with zero downtime:

```bash
# Method 1: Using the enhanced deployment script (recommended)
cd /opt/kuno
./deploy.sh
# Choose "Blue-Green Deployment" when prompted

# Method 2: Using quick-deploy script  
./quick-deploy.sh ictrun/kuno:latest 80 kuno
```

**✨ Benefits**:
- **<2 seconds downtime**: Service continues running during image pull
- **Health checks**: New container verified before switching
- **Automatic rollback**: Failed updates restore previous version
- **Production-ready**: Safe for live environments

### 🐳 For Docker Deployment (Traditional Method)

To upgrade your Docker deployment while preserving all data:

#### Step 1: Backup Your Data (Recommended)
```bash
# Create backup directory
mkdir -p ./backups/$(date +%Y%m%d_%H%M%S)

# Backup the data volume
docker run --rm -v blog-data:/data -v $(pwd)/backups/$(date +%Y%m%d_%H%M%S):/backup alpine sh -c "cd /data && tar czf /backup/blog-data-backup.tar.gz ."

# Or if using bind mount, simply copy the directory
cd /opt/kuno
cp -r ./blog-data ./backups/$(date +%Y%m%d_%H%M%S)/
```

#### Step 2: Pull the Latest Image
```bash
docker pull ictrun/kuno:latest
```

#### Step 3: Stop and Remove the Old Container
```bash
docker stop kuno
docker rm kuno
```

#### Step 4: Start the New Container
```bash
# If using named volume (recommended)
docker run -d \
  --name kuno \
  --restart unless-stopped \
  -p 80:80 \
  -v blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL=https://your-domain.com/api \
  -e DB_PATH=/app/data/blog.db \
  ictrun/kuno:latest

# If using bind mount
cd /opt/kuno
docker run -d \
  --name kuno \
  --restart unless-stopped \
  -p 80:80 \
  -v /opt/kuno/blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL=https://your-domain.com/api \
  -e DB_PATH=/app/data/blog.db \
  ictrun/kuno:latest
```

#### Step 5: Verify the Upgrade
```bash
# Check container status
docker ps | grep kuno

# Check logs for any errors
docker logs kuno

# Test the application
curl -f http://localhost/api/categories || echo "API check failed"
```

### 🐳 For Docker Compose Deployment

To upgrade your Docker Compose deployment while preserving all data:

#### Step 1: Backup Your Data (Recommended)
```bash
# Create backup directory
mkdir -p ./backups/$(date +%Y%m%d_%H%M%S)

# Stop services temporarily for consistent backup
docker-compose stop

# Backup the data volume
docker run --rm -v blog_blog_data:/data -v $(pwd)/backups/$(date +%Y%m%d_%H%M%S):/backup alpine sh -c "cd /data && tar czf /backup/blog-data-backup.tar.gz ."

# Or backup the entire compose environment
cp -r ./data ./backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
cp docker-compose.yml ./backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
cp .env ./backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true

# Restart services
docker-compose start
```

#### Step 2: Pull the Latest Images
```bash
docker-compose pull
```

#### Step 3: Upgrade with Zero Downtime
```bash
# Method 1: Rolling update (recommended for production)
docker-compose up -d --force-recreate --remove-orphans

# Method 2: Complete restart (if you need to stop everything)
docker-compose down && docker-compose up -d
```

#### Step 4: Clean Up Old Images (Optional)
```bash
# Remove unused images to free up space
docker image prune -f

# Or remove specific old images
docker images | grep kuno | grep -v latest | awk '{print $3}' | xargs docker rmi 2>/dev/null || true
```

#### Step 5: Verify the Upgrade
```bash
# Check all services status
docker-compose ps

# Check logs for any errors
docker-compose logs -f --tail=50

# Test the application
curl -f http://localhost:3000 || echo "Frontend check failed"
curl -f http://localhost:8080/api/categories || echo "API check failed"
```

### 🔄 Automated Upgrade Script

For convenience, you can create an automated upgrade script:

#### For Docker Deployment
```bash
#!/bin/bash
# save as upgrade-docker.sh

set -e

echo "🚀 Starting Docker deployment upgrade..."

# Configuration
CONTAINER_NAME="kuno"
IMAGE_NAME="ictrun/kuno:latest"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Create backup
echo "📦 Creating backup..."
mkdir -p "$BACKUP_DIR"
docker run --rm -v blog-data:/data -v "$BACKUP_DIR":/backup alpine sh -c "cd /data && tar czf /backup/blog-data-backup.tar.gz ."

# Pull latest image
echo "⬇️ Pulling latest image..."
docker pull "$IMAGE_NAME"

# Stop and remove old container
echo "🛑 Stopping old container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Start new container
echo "🚀 Starting new container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 80:80 \
  -v blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost/api}" \
  -e DB_PATH=/app/data/blog.db \
  "$IMAGE_NAME"

# Verify
echo "✅ Verifying upgrade..."
sleep 10
if docker ps | grep -q "$CONTAINER_NAME"; then
  echo "✅ Upgrade completed successfully!"
  echo "📄 Backup saved to: $BACKUP_DIR"
else
  echo "❌ Upgrade failed! Check logs: docker logs $CONTAINER_NAME"
  exit 1
fi
```

#### For Docker Compose Deployment
```bash
#!/bin/bash
# save as upgrade-compose.sh

set -e

echo "🚀 Starting Docker Compose deployment upgrade..."

# Configuration
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Create backup
echo "📦 Creating backup..."
mkdir -p "$BACKUP_DIR"
docker-compose stop
docker run --rm -v blog_blog_data:/data -v "$BACKUP_DIR":/backup alpine sh -c "cd /data && tar czf /backup/blog-data-backup.tar.gz ."
cp -r ./data "$BACKUP_DIR/" 2>/dev/null || true
cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || true
cp .env "$BACKUP_DIR/" 2>/dev/null || true

# Pull and upgrade
echo "⬇️ Pulling latest images..."
docker-compose pull

echo "🔄 Upgrading services..."
docker-compose up -d --force-recreate --remove-orphans

# Clean up
echo "🧹 Cleaning up old images..."
docker image prune -f

# Verify
echo "✅ Verifying upgrade..."
sleep 15
if docker-compose ps | grep -q "Up"; then
  echo "✅ Upgrade completed successfully!"
  echo "📄 Backup saved to: $BACKUP_DIR"
else
  echo "❌ Upgrade failed! Check logs: docker-compose logs"
  exit 1
fi
```

### 🛠️ Rollback Instructions

If an upgrade fails, you can rollback to the previous version:

#### For Docker Deployment
```bash
# Stop the failed container
docker stop kuno && docker rm kuno

# Restore from backup (if needed)
docker run --rm -v blog-data:/data -v $(pwd)/backups/BACKUP_DATE:/backup alpine sh -c "cd /data && tar xzf /backup/blog-data-backup.tar.gz"

# Run the previous image version
docker run -d \
  --name kuno \
  --restart unless-stopped \
  -p 80:80 \
  -v blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL=https://your-domain.com/api \
  ictrun/kuno:PREVIOUS_TAG
```

#### For Docker Compose Deployment
```bash
# Edit docker-compose.yml to use previous image tag
# Then restart
docker-compose down
docker-compose up -d

# Restore data if needed
docker-compose stop
docker run --rm -v blog_blog_data:/data -v $(pwd)/backups/BACKUP_DATE:/backup alpine sh -c "cd /data && tar xzf /backup/blog-data-backup.tar.gz"
docker-compose start
```

### 📋 Upgrade Checklist

- [ ] **Backup your data** before starting
- [ ] **Test the backup** by extracting it to a temporary location
- [ ] **Note your current version** for potential rollback
- [ ] **Check available disk space** for new images
- [ ] **Plan maintenance window** for production systems
- [ ] **Verify environment variables** are correctly set
- [ ] **Test the application** after upgrade
- [ ] **Monitor logs** for any issues
- [ ] **Update any external monitoring** or health checks
- [ ] **Document the upgrade** in your change log

### Manual Deployment

#### Development Mode
```bash
docker-compose up --build -d
```

#### Production Mode (with Nginx)
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

## Architecture

![structure](./docs/structure.png))

#### Important Configuration Notes

- **Runtime Configuration**: The API URL can be set dynamically at container startup via the `NEXT_PUBLIC_API_URL` environment variable.
- **No Rebuild Required**: Changes to the API URL only require restarting the container, not rebuilding the image.
- **Automatic Detection**: The system automatically detects and applies the API URL configuration during container startup.
- **Fallback Support**: If no environment variable is provided, defaults to `http://localhost:8080/api`.

#### Example Configurations

**Local Development:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

**Production:**
```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

The frontend will automatically use:
- API requests: `https://yourdomain.com/api/*`
- Base URL for SEO/metadata: `https://yourdomain.com`

### Docker Volumes

- `blog_data`: Unified persistent storage for SQLite database and upload files
  - Database: `/app/data/blog.db`
  - Uploads: `/app/data/uploads/` (images, videos, branding)

## Management Commands

### Start Application
```bash
./start.sh
```

### Stop Application
```bash
./stop.sh
```

### View Logs
```bash
docker-compose logs -f
```

### Restart Services
```bash
docker-compose restart
```

### Clean Everything
```bash
docker-compose down -v
docker system prune -f
```

## Password Recovery

### When Admin Password is Forgotten

If you forget the admin password, follow these steps to reset it safely:

#### Step 1: Stop the Container
```bash
docker stop kuno
```

#### Step 2: Enable Recovery Mode
Navigate to the application directory and run with recovery mode:
```bash
cd /opt/kuno

docker run -d \
  --name kuno_recovery \
  --restart unless-stopped \
  -p 80:80 \
  -v /opt/kuno/blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL="http://localhost/api" \
  -e DB_PATH="/app/data/blog.db" \
  -e RECOVERY_MODE="true" \
  ictrun/kuno:latest
```

The system will:
- Reset the admin password to `xuemian168`
- Display the reset credentials in the logs
- **Refuse to start** for security reasons

#### Step 3: Check Reset Result
```bash
# View logs to confirm password reset
docker logs kuno_recovery

# Remove recovery container
docker rm -f kuno_recovery
```

#### Step 4: Start Blog Normally
```bash
# Run with normal mode
docker run -d \
  --name kuno \
  --restart unless-stopped \
  -p 80:80 \
  -v /opt/kuno/blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL="http://localhost/api" \
  -e DB_PATH="/app/data/blog.db" \
  -e RECOVERY_MODE="false" \
  ictrun/kuno:latest
```

#### Step 5: Login with New Password
- **Username**: `admin`
- **Password**: `xuemian168`

#### Step 6: Change Password Immediately
1. Login to the admin panel at `http://localhost/admin`
2. Go to **Settings** → **Security Settings**
3. Change your password to a secure one

### Security Notes

⚠️ **Important Security Considerations:**

- Recovery mode requires **physical access** to the server to modify environment variables
- The system **will not start** when recovery mode is active - this prevents unauthorized access
- Always **disable recovery mode** immediately after password reset
- **Change the default password** immediately after recovery
- Recovery mode is designed for emergency use only

### Troubleshooting Recovery Issues

**Problem**: System won't start after enabling recovery mode
**Solution**: This is intentional. Check the logs to confirm password was reset, then disable recovery mode.

**Problem**: Recovery mode doesn't reset password
**Solution**: Ensure the environment variable is set correctly (`RECOVERY_MODE=true`) and check Docker logs for error messages.

## Development

### Local Development (without Docker)

#### Backend
```bash
cd backend
go mod download
go run cmd/server/main.go
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Building

#### Backend
```bash
cd backend
go build -o bin/server cmd/server/main.go
```

#### Frontend
```bash
cd frontend
npm run build
npm start
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000 and 8080 are available
2. **Docker permissions**: Run with `sudo` if needed on Linux
3. **Build failures**: Clear Docker cache with `docker system prune -f`
4. **Deployment script errors**: 
   - **Issue**: `curl | bash` fails with "syntax error near unexpected token 'fi'"
   - **Solution**: Download script first: `curl -sSL https://raw.githubusercontent.com/xuemian168/kuno/main/deploy-from-hub.sh -o deploy.sh && chmod +x deploy.sh && ./deploy.sh`
   - **Reason**: Interactive scripts require local execution, not piped execution
5. **API URL issues**:
   - **Issue**: Frontend shows "Request URL: http://localhost:8080/api/..." even when `NEXT_PUBLIC_API_URL` is set
   - **Solution**: Restart the container to apply the new environment variable
   - **Verification**: Check container logs: `docker logs container-name` to see "Setting runtime API URL to: your-url"

### Health Checks

The application includes health checks for both services:
- Backend: `http://localhost:8080/api/categories`
- Frontend: `http://localhost:3000`

### Logs

View service logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Production Considerations

- Use `docker-compose.prod.yml` for production
- Configure proper SSL certificates in the `ssl` directory
- Update Nginx configuration for your domain
- Set up backup for the SQLite database
- Configure monitoring and logging

## 🤖 LLMs.txt Support

KUNO provides comprehensive support for AI search engines and language models through the LLMs.txt standard, making your content easily discoverable and analyzable by AI systems.

### Features

- **🌍 Multi-language Generation**: Generate LLMs.txt files in 8 major languages (Chinese, English, Japanese, Korean, Spanish, French, German, Russian)
- **🧠 Intelligent Content Analysis**: Automatically extracts key topics, categories, and article summaries
- **⚡ Smart Caching**: 1-hour cache strategy with automatic invalidation when content changes
- **📈 Usage Statistics**: Comprehensive analytics including API calls, response times, and success rates
- **🔄 Auto-refresh**: Cache automatically updates when articles or site settings change

### Design Benefits

1. **AI Search Engine Friendly**: Provides structured information for Claude, ChatGPT, and other AI models to understand your site content
2. **SEO Enhancement**: Improves discoverability by AI-powered search systems
3. **Performance Optimized**: Smart caching reduces server load while ensuring fresh content
4. **Multilingual Support**: Localized content descriptions in multiple languages
5. **Rich Metadata**: Includes article counts, view statistics, categories, and key topics
6. **Structured Format**: Follows LLMs.txt standard with proper markdown formatting

### Access Points

- **Public Endpoint**: `https://yourdomain.com/llms.txt` (supports `?lang=en` parameter)
- **API Endpoint**: `https://yourdomain.com/api/llms.txt` (with language parameter)
- **Admin Interface**: Manage and preview LLMs.txt content through the admin panel

### Usage Statistics Tracking

The system tracks comprehensive usage metrics:

- **📊 API Call Statistics**: Total requests, success rate, and failure analysis
- **⏱️ Performance Monitoring**: Average response times and cache hit rates
- **📅 Daily Usage Reports**: Historical data for the past 30 days
- **🌐 Language Distribution**: Usage breakdown by language
- **💾 Cache Performance**: Cache entries, expiry times, and efficiency metrics

### Admin Management

Access the LLMs.txt manager in the admin panel to:
- Generate and preview content in different languages
- View usage statistics and performance metrics
- Manage cache and clear cached content
- Download generated LLMs.txt files

## Sponsorship
This project is sponsored by [TIKHUB.IO](https://tikhub.io/)
> TikHub.io is a provider of high-quality data interface services. It is committed to providing a one-stop overseas social media data API and tool service platform for developers, creators, and enterprises. It faces global users, supports custom extensions, and builds a community-driven ecosystem.
![Tikhub_LOGO](./docs/tikhub.png)

## License

[Apache License 2.0](./LICENSE)