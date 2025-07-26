# Docker Hub Deployment Guide

This guide covers all the ways to deploy the I18N Blog using the pre-built Docker images from Docker Hub.

## ⚠️ Important: Configuration Required

**Before deployment, you MUST configure your API URL:**

The blog requires the `NEXT_PUBLIC_API_URL` environment variable to function properly. This should be set to your domain followed by `/api`:

- ✅ Correct: `https://yourdomain.com/api`
- ✅ Correct: `https://blog.example.com/api` 
- ❌ Wrong: `https://your-domain.com/api` (placeholder text)
- ❌ Wrong: `https://yourdomain.com` (missing `/api`)

**All deployment methods below require you to replace `yourdomain.com` with your actual domain.**

### Build vs Runtime Configuration

The Docker image is built **without** hardcoded API URLs. The `NEXT_PUBLIC_API_URL` environment variable must be provided at **container runtime**, not build time. This allows the same Docker image to be used across different environments (development, staging, production) by simply changing the environment variable.

## 🚀 Quick Start Methods

### Method 1: One-Click Script (Recommended)

The fastest way to get started:

```bash
curl -sSL https://raw.githubusercontent.com/xuemian168/i18n_blog/main/deploy-from-hub.sh | bash
```

This script will:
- Check Docker installation
- Prompt for configuration
- Pull the latest image
- Start the container with proper settings
- Display access information

### Method 2: Docker Run

For manual control:

```bash
docker run -d \
  --name i18n-blog \
  --restart unless-stopped \
  -p 80:80 \
  -v blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL=https://yourdomain.com/api \
  -e DB_PATH=/app/data/blog.db \
  ictrun/i18n_blog:latest
```

**Note:** Replace `https://yourdomain.com/api` with your actual domain.

### Method 3: Docker Compose

For production deployments:

```bash
# Download compose file
curl -O https://raw.githubusercontent.com/xuemian168/i18n_blog/main/docker-compose.hub.yml

# Configure environment
curl -O https://raw.githubusercontent.com/xuemian168/i18n_blog/main/.env.hub.example
cp .env.hub.example .env
# Edit .env with your settings

# Deploy
docker-compose -f docker-compose.hub.yml up -d
```

## 🏷️ Available Images

### Image Tags

- `ictrun/i18n_blog:latest` - Latest stable release
- `ictrun/i18n_blog:v1.0.0` - Specific version (recommended for production)
- `ictrun/i18n_blog:develop` - Development branch (latest features, may be unstable)

### Multi-Architecture Support

All images support both:
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, including Apple Silicon)

## ⚙️ Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | None | Your API endpoint URL (e.g., https://yourdomain.com/api) |
| `DB_PATH` | No | `/app/data/blog.db` | SQLite database path |
| `GIN_MODE` | No | `release` | Go Gin mode (release/debug) |
| `NODE_ENV` | No | `production` | Node.js environment |
| `RECOVERY_MODE` | No | `false` | Password recovery mode |

### Volume Mounts

| Container Path | Purpose | Recommended Host Path |
|----------------|---------|----------------------|
| `/app/data` | Database and persistent data | `blog-data` (named volume) or `./data` |
| `/app/backend/uploads` | Uploaded media files (optional) | `./uploads` |

### Port Mapping

| Container Port | Service | Recommended Host Port |
|----------------|---------|----------------------|
| `80` | HTTP (Nginx proxy) | `80` or `8080` |

## 🛠️ Deployment Scenarios

### Development/Testing

```bash
docker run -d \
  --name blog-dev \
  -p 3000:80 \
  -v $(pwd)/dev-data:/app/data \
  -e NEXT_PUBLIC_API_URL=http://localhost:3000/api \
  ictrun/i18n_blog:develop
```

**Note:** For development, use `http://localhost:3000/api` as shown above.

### Production with Custom Domain

```bash
docker run -d \
  --name blog-prod \
  --restart unless-stopped \
  -p 80:80 \
  -v blog-data:/app/data \
  -v /opt/blog/uploads:/app/backend/uploads \
  -e NEXT_PUBLIC_API_URL=https://yourdomain.com/api \
  ictrun/i18n_blog:latest
```

**Important:** Replace `yourdomain.com` with your actual domain name.

### Behind Reverse Proxy (Nginx/Traefik)

```bash
docker run -d \
  --name blog \
  --restart unless-stopped \
  -p 8080:80 \
  -v blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL=https://yourdomain.com/api \
  --network web \
  ictrun/i18n_blog:latest
```

**Note:** Configure your reverse proxy to forward requests to port 8080.

## 🔧 Management Tasks

### Update to Latest Version

```bash
# Pull new image
docker pull ictrun/i18n_blog:latest

# Stop current container
docker stop i18n-blog

# Remove old container
docker rm i18n-blog

# Start with new image (replace yourdomain.com with your domain)
docker run -d \
  --name i18n-blog \
  --restart unless-stopped \
  -p 80:80 \
  -v blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL=https://yourdomain.com/api \
  ictrun/i18n_blog:latest
```

### Backup Data

```bash
# Create backup directory
mkdir -p ./backups/$(date +%Y%m%d)

# Backup database and uploads
docker cp i18n-blog:/app/data ./backups/$(date +%Y%m%d)/
docker cp i18n-blog:/app/backend/uploads ./backups/$(date +%Y%m%d)/ 2>/dev/null || true
```

### Restore Data

```bash
# Stop container
docker stop i18n-blog

# Restore data
docker cp ./backups/20240101/data i18n-blog:/app/
docker cp ./backups/20240101/uploads i18n-blog:/app/backend/ 2>/dev/null || true

# Start container
docker start i18n-blog
```

### View Logs

```bash
# View all logs
docker logs i18n-blog

# Follow logs
docker logs -f i18n-blog

# View last 100 lines
docker logs --tail 100 i18n-blog
```

### Database Management

```bash
# Access SQLite database
docker exec -it i18n-blog sqlite3 /app/data/blog.db

# Export database
docker exec i18n-blog sqlite3 /app/data/blog.db .dump > backup.sql

# Check database size
docker exec i18n-blog du -h /app/data/blog.db
```

## 🔒 Security Considerations

### Change Default Password

1. Access admin panel: `http://your-domain/admin`
2. Login with `admin` / `xuemian168`
3. **Immediately change password** in Settings

### Enable Recovery Mode (Emergency)

If you forget the admin password:

```bash
# Stop container
docker stop i18n-blog

# Start with recovery mode (replace yourdomain.com with your domain)
docker run -d \
  --name i18n-blog \
  --restart unless-stopped \
  -p 80:80 \
  -v blog-data:/app/data \
  -e RECOVERY_MODE=true \
  -e NEXT_PUBLIC_API_URL=https://yourdomain.com/api \
  ictrun/i18n_blog:latest

# Check logs for reset confirmation
docker logs i18n-blog

# The system will reset password and refuse to start
# Disable recovery mode and restart
docker stop i18n_blog
docker run -d \
  --name i18n_blog \
  --restart unless-stopped \
  -p 80:80 \
  -v blog-data:/app/data \
  -e RECOVERY_MODE=false \
  -e NEXT_PUBLIC_API_URL=https://yourdomain.com/api \
  ictrun/i18n_blog:latest
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs i18n-blog

# Check if port is available
sudo netstat -tlnp | grep :80

# Check if image exists
docker images | grep ictrun/i18n_blog
```

### Can't Access Website

1. Check container status: `docker ps`
2. Check port mapping: `docker port i18n_blog`
3. Check logs: `docker logs i18n_blog`
4. Test locally: `curl http://localhost/api/categories`

### Database Issues

```bash
# Check database file
docker exec i18n_blog ls -la /app/data/

# Check database connectivity
docker exec i18n_blog sqlite3 /app/data/blog.db "SELECT COUNT(*) FROM articles;"

# Reset database (WARNING: This deletes all data)
docker exec i18n_blog rm /app/data/blog.db
docker restart i18n_blog
```

## 📞 Support

- **Documentation**: [GitHub Repository](https://github.com/xuemian168/i18n_blog)
- **Issues**: [GitHub Issues](https://github.com/xuemian168/i18n_blog/issues)
- **Docker Hub**: [xuemian168/i18n_blog](https://hub.docker.com/r/ictrun/i18n_blog)

---

**Need help?** Open an issue on GitHub with your docker logs and configuration details.