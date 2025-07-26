# I18N Blog - Multilingual Blog System

A modern, full-stack blog application with multilingual support, featuring a Go backend and Next.js frontend, all packaged in a single Docker container for easy deployment.

## 🌟 Features

- **🌍 Multilingual Support**: Chinese, English, Japanese with easy language switching
- **📝 Markdown Editor**: Rich text editing with live preview and syntax highlighting  
- **🎨 Modern UI**: Responsive design with dark/light theme toggle
- **🔒 Admin Panel**: Complete content management system
- **⚡ High Performance**: Go backend with Next.js SSG frontend
- **🐳 Docker Ready**: One-click deployment with automatic initialization
- **💾 SQLite Database**: File-based database with automatic migrations
- **🔍 SEO Optimized**: Meta tags, sitemap, and structured data

## 🚀 Quick Start

### One-Click Deployment

```bash
curl -sSL https://raw.githubusercontent.com/xuemian168/i18n_blog/main/deploy-from-hub.sh -o deploy.sh && chmod +x deploy.sh && ./deploy.sh
```

> **Note**: Interactive scripts require local execution for proper functionality.

### Manual Deployment

```bash
docker run -d \
  --name i18n-blog \
  --restart unless-stopped \
  -p 80:80 \
  -v blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL=https://your-domain.com/api \
  xuemian168/i18n-blog:latest
```

### Using Docker Compose

```yaml
version: '3.8'
services:
  blog:
    image: xuemian168/i18n-blog:latest
    ports:
      - "80:80"
    volumes:
      - blog_data:/app/data
    environment:
      - NEXT_PUBLIC_API_URL=https://your-domain.com/api
    restart: unless-stopped

volumes:
  blog_data:
```

## 🏷️ Available Tags

- `latest` - Latest stable release
- `v1.0.0` - Specific version releases  
- `develop` - Development branch (bleeding edge)

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-domain.com/api` | Your API endpoint URL |
| `DB_PATH` | `//data/blog.db` | SQLite database path |
| `GIN_MODE` | `release` | Go Gin mode (release/debug) |
| `NODE_ENV` | `production` | Node.js environment |
| `RECOVERY_MODE` | `false` | Password recovery mode |

### Volumes

- `/app/data` - SQLite database and persistent data
- `/app/backend/uploads` - Optional: uploaded media files

### Ports

- `80` - HTTP server (Nginx proxy to backend:8080 and frontend:3000)

## 🎯 First Time Setup

1. Access your blog at `http://localhost` (or your domain)
2. Login to admin panel at `/admin`:
   - **Username**: `admin`
   - **Password**: `xuemian168`
3. **⚠️ Important**: Change the default password immediately!
4. Start creating your multilingual content!

## 📊 What's Included

- **Hello World Article**: Pre-installed sample article showcasing all Markdown features in multiple languages
- **Welcome Category**: Default category with translations
- **Admin Interface**: Full content management system
- **Automatic Backups**: Built-in data persistence
- **Multi-language Support**: Easy language switching for content and UI

## 🛠️ Management

```bash
# View logs
docker logs i18n-blog

# Update to latest
docker pull xuemian168/i18n-blog:latest && docker restart i18n-blog

# Backup data
docker cp i18n-blog:/app/data ./backup-$(date +%Y%m%d)

# Reset admin password (emergency)
docker exec -it i18n-blog sqlite3 /app/data/blog.db "UPDATE users SET password='$2a$10$...' WHERE username='admin'"
```

## 📚 Documentation

- **GitHub Repository**: https://github.com/xuemian168/i18n_blog
- **Full Documentation**: https://github.com/xuemian168/i18n_blog#readme
- **Issue Tracker**: https://github.com/xuemian168/i18n_blog/issues

## 🏗️ Architecture

- **Backend**: Go 1.23 + Gin framework + GORM + SQLite
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Deployment**: Multi-stage Docker build + Nginx reverse proxy
- **Database**: SQLite with automatic migrations
- **i18n**: Next-intl with dynamic language switching

## 📄 License

MIT License - See repository for details

---

**Star the repository on GitHub if you find this useful!** ⭐