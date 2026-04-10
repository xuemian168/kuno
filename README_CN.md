中文 | [English](./README.md)

# KUNO

![kuno](./docs/kuno.png)

**KUNO** /ˈkuːnoʊ/ — 轻量级、国际化优先的内容管理系统，基于 Go + Next.js 构建。名字取自"坤"（kūn），《易经》中承载万物的大地。

全栈博客系统，Docker 容器化一键部署。

## 测试站

[QUT.EDU.KG](https://qut.edu.kg/)

## 特性

- Markdown 编辑器，实时预览，支持 Mermaid 图表
- 70+ 种语言界面切换（基于 next-intl）
- 深色 / 浅色主题
- 响应式布局，移动端适配
- 文章分类管理
- 管理后台
- 站点标题、副标题、品牌自定义
- SEO 优化，支持 LLMs.txt（AI 搜索引擎友好）
- 使用统计和性能监控
- Docker 一键部署，蓝绿发布（停机 < 2 秒）
- 健康检查，部署失败自动回滚

### 支持的语言

| 地区 | 语言 |
|------|------|
| 核心 | 中文、English |
| 亚洲 | 日本語、한국어、ไทย、Tiếng Việt、Bahasa Indonesia、Bahasa Melayu、Filipino、မြန်မာ、ខ្មែរ、ລາວ |
| 欧洲 | Español、Français、Deutsch、Русский、Português、Italiano、Nederlands、Svenska、Dansk、Norsk、Suomi、Polski、Čeština、Slovenčina、Magyar、Română、Български、Hrvatski、Српски、Slovenščina、Eesti、Latviešu、Lietuvių、Українська、Беларуская、Türkçe、Ελληνικά、Shqip、Հայերեն、Azərbaycan、ქართული |
| 中东和非洲 | العربية、עברית、فارسی、اردو、አማርኛ、Kiswahili、isiZulu、Afrikaans |
| 南亚 | हिन्दी、বাংলা、தமிழ்、తెలుగు、മലയാളം、ಕನ್ನಡ、ગુજરાતી、ਪੰਜਾਬੀ、मराठी、नेपाली、සිංහල |
| 太平洋及其他 | Te Reo Māori、Gagana Samoa、Lea Fakatonga、Na Vosa Vakaviti、Gaeilge、Íslenska、Malti、Euskera、Català |

## 快速部署

### 一键部署（推荐）

```bash
sudo mkdir -p /opt/kuno && cd /opt/kuno

curl -sSL "https://raw.githubusercontent.com/xuemian168/kuno/main/deploy-from-hub.sh?$(date +%s)" \
  -o deploy.sh && chmod +x deploy.sh && sudo ./deploy.sh
```

脚本会引导你：
1. 选择 HTTP 或 HTTPS
2. 输入域名（如 `qut.edu.kg`）
3. 选择标准部署或蓝绿部署
4. API URL 自动生成

> **注意**：不要用 `curl | bash`，先下载再执行。建议部署在 `/opt/kuno` 下。

### 快速更新（已有部署）

```bash
./quick-deploy.sh [镜像] [端口] [容器名]

# 示例：
./quick-deploy.sh ictrun/kuno:latest 80 kuno
```

拉取新镜像时旧容器继续服务，切换停机 < 2 秒。健康检查失败自动回滚。

### 手动部署

```bash
sudo mkdir -p /opt/kuno && cd /opt/kuno
mkdir -p ./blog-data

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

⚠️ **`NEXT_PUBLIC_API_URL` 必须根据实际环境修改**：
- 本地：`http://localhost/api`
- 局域网：`http://192.168.1.100/api`
- 公网：`https://yourdomain.com/api`
- 非 80 端口：`http://localhost:8080/api`

`JWT_SECRET` — 生产环境建议设置 32 位以上的字符串。不设置的话会自动生成，重启后失效。

### Docker Compose

```bash
curl -O https://raw.githubusercontent.com/xuemian168/kuno/main/docker-compose.hub.yml
cp .env.hub.example .env
# 编辑 .env
docker-compose -f docker-compose.hub.yml up -d
```

### 可用镜像标签

- `ictrun/kuno:latest` — 最新稳定版
- `ictrun/kuno:v1.0.0` — 指定版本
- `ictrun/kuno:develop` — 开发分支

## 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NEXT_PUBLIC_API_URL` | `https://your-domain.com/api` | API 地址 |
| `DB_PATH` | `/app/data/blog.db` | SQLite 数据库路径 |
| `UPLOAD_DIR` | `/app/data/uploads` | 上传目录 |
| `GIN_MODE` | `release` | Gin 模式 |
| `NODE_ENV` | `production` | Node.js 环境 |
| `RECOVERY_MODE` | `false` | 密码恢复模式 |
| `JWT_SECRET` | *(自动生成)* | JWT 签名密钥 |

API URL 支持运行时修改，重启容器即可生效，不需要重新构建镜像。

### 首次登录

- 地址：`http://localhost/admin`
- 账号：`admin`
- 密码：`xuemian168`

⚠️ 首次登录后立即修改默认密码。

### 目录结构

```
/opt/kuno/
├── blog-data/
│   ├── blog.db              # SQLite 数据库
│   └── uploads/
│       ├── images/
│       ├── videos/
│       └── branding/
└── deploy.sh
```

## 更新

### 零停机更新（推荐）

```bash
cd /opt/kuno
./deploy.sh                                    # 选择蓝绿部署
# 或
./quick-deploy.sh ictrun/kuno:latest 80 kuno
```

### 传统方式

```bash
docker stop kuno && docker rm kuno
docker pull ictrun/kuno:latest

cd /opt/kuno
docker run -d \
  --name kuno \
  --restart unless-stopped \
  -p 80:80 \
  -v /opt/kuno/blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL="http://localhost/api" \
  ictrun/kuno:latest
```

### 更新前备份

```bash
cd /opt/kuno
sudo tar -czf blog-backup-$(date +%Y%m%d).tar.gz ./blog-data
```

### 回滚

```bash
docker stop kuno && docker rm kuno

# 需要时恢复数据
sudo tar -xzf blog-backup-YYYYMMDD.tar.gz

# 运行旧版本
docker run -d --name kuno --restart unless-stopped \
  -p 80:80 -v /opt/kuno/blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL=https://your-domain.com/api \
  ictrun/kuno:PREVIOUS_TAG
```

## 密码重置

忘记管理员密码时：

```bash
# 1. 停止容器
docker stop kuno

# 2. 启动恢复模式容器
docker run -d --name kuno_recovery \
  -p 80:80 \
  -v /opt/kuno/blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL="http://localhost/api" \
  -e DB_PATH="/app/data/blog.db" \
  -e RECOVERY_MODE="true" \
  ictrun/kuno:latest

# 3. 查看日志 — 密码会重置为 xuemian168，然后容器会拒绝启动（这是设计行为）
docker logs kuno_recovery
docker rm -f kuno_recovery

# 4. 正常启动
docker run -d --name kuno --restart unless-stopped \
  -p 80:80 \
  -v /opt/kuno/blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL="http://localhost/api" \
  -e DB_PATH="/app/data/blog.db" \
  -e RECOVERY_MODE="false" \
  ictrun/kuno:latest

# 5. 用 admin / xuemian168 登录，立即修改密码
```

恢复模式需要服务器访问权限才能设置环境变量，且恢复期间系统不会对外提供服务。

## 开发

### 本地开发（不用 Docker）

```bash
# 后端
cd backend
go mod download
go run cmd/server/main.go

# 前端
cd frontend
npm install
npm run dev
```

前端 `http://localhost:3000`，API `http://localhost:8080/api`，管理后台 `http://localhost:3000/admin`。

### Docker 开发

```bash
# 开发模式
docker-compose up --build -d

# 生产模式（带 Nginx）
docker-compose -f docker-compose.prod.yml up --build -d
```

## 常用命令

```bash
docker ps | grep kuno          # 查看状态
docker logs kuno               # 查看日志
docker restart kuno            # 重启
docker stop kuno               # 停止
```

## 常见问题

- **端口冲突**：把 `-p 80:80` 改成 `-p 8080:80`
- **API URL 没生效**：重启容器，看日志里有没有 "Setting runtime API URL to: ..."
- **部署脚本报语法错误**：别用 `curl | bash`，先下载再执行
- **构建失败**：`docker system prune -f` 清理缓存

健康检查端点：后端 `http://localhost:8080/api/categories`，前端 `http://localhost:3000`。

## 赞助

本项目由 [TIKHUB.IO](https://tikhub.io/) 提供支持

> TikHub.io 为开发者、创作者和企业提供社交媒体数据 API 和工具服务。

![Tikhub_LOGO](./docs/tikhub.png)

## License

[Apache License 2.0](./LICENSE)
