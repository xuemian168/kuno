中文 | [English](./README.md)

# KUNO

一个现代化的多语言博客平台，支持一键 Docker 部署。

![kuno](./docs/kuno.png)

**KUNO** /ˈkuːnoʊ/

名称灵感源自东方哲学与现代技术理念的融合：
> - "KUN" 是"坤"（kūn）的拼音，出自《易经》，意为大地，承载万物，象征系统对多语言、多格式内容的全面支持与包容。
> - "O" 代表 Origin（起源）和 Open（开放），象征内容的开始，也代表系统的开放性、拓展性与现代架构设计理念。

我们的 logo 灵感来自于 "坤卦" ☷ —— 六个阴爻（⚋⚋⚋⚋⚋⚋）大地、顺势、承载、包容，也代表了 KUNO 系统的核心价值。

KUNO 旨在打造一个 轻量、极速、国际化优先 的内容管理系统，让内容创作者与开发者都能如“坤”般自由、有序地构建万象世界。

## 测试站
[QUT.EDU.KG](https://qut.edu.kg/)


## 🌟 特性

- 📝 支持 Markdown 编辑和实时预览
- 🌍 多语言国际化支持（70+ 种语言）
- 🎨 现代化界面设计，支持深色/浅色主题
- 📱 响应式设计，完美适配移动端
- 🐳 Docker 容器化部署，开箱即用
- 🔒 安全的管理后台
- 📊 文章分类管理
- 🔍 SEO 优化支持

### 🌐 支持的语言

系统支持以下 70+ 种语言的界面切换：

| 地区 | 支持的语言 |
|------|-----------|
| **核心语言** | 🇨🇳 中文 • 🇬🇧 English |
| **亚洲语言** | 🇯🇵 日本語 • 🇰🇷 한국어 • 🇹🇭 ไทย • 🇻🇳 Tiếng Việt • 🇮🇩 Bahasa Indonesia • 🇲🇾 Bahasa Melayu • 🇵🇭 Filipino • 🇲🇲 မြန်မာ • 🇰🇭 ខ្មែរ • 🇱🇦 ລາວ |
| **欧洲语言** | 🇪🇸 Español • 🇫🇷 Français • 🇩🇪 Deutsch • 🇷🇺 Русский • 🇵🇹 Português • 🇮🇹 Italiano • 🇳🇱 Nederlands • 🇸🇪 Svenska • 🇩🇰 Dansk • 🇳🇴 Norsk • 🇫🇮 Suomi • 🇵🇱 Polski • 🇨🇿 Čeština • 🇸🇰 Slovenčina • 🇭🇺 Magyar • 🇷🇴 Română • 🇧🇬 Български • 🇭🇷 Hrvatski • 🇷🇸 Српски • 🇸🇮 Slovenščina • 🇪🇪 Eesti • 🇱🇻 Latviešu • 🇱🇹 Lietuvių • 🇺🇦 Українська • 🇧🇾 Беларуская • 🇹🇷 Türkçe • 🇬🇷 Ελληνικά • 🇦🇱 Shqip • 🇦🇲 Հայերեն • 🇦🇿 Azərbaycan • 🇬🇪 ქართული |
| **中东和非洲语言** | 🇸🇦 العربية • 🇮🇱 עברית • 🇮🇷 فارسی • 🇵🇰 اردو • 🇪🇹 አማርኛ • 🇰🇪 Kiswahili • 🇿🇦 isiZulu • 🇿🇦 Afrikaans |
| **南亚语言** | 🇮🇳 हिन्दी • 🇧🇩 বাংলা • 🇮🇳 தமிழ் • 🇮🇳 తెలుగు • 🇮🇳 മലയാളം • 🇮🇳 ಕನ್ನಡ • 🇮🇳 ગુજરાતી • 🇮🇳 ਪੰਜਾਬੀ • 🇮🇳 मराठी • 🇳🇵 नेपाली • 🇱🇰 සිංහල |
| **太平洋及其他地区** | 🇳🇿 Te Reo Māori • 🇼🇸 Gagana Samoa • 🇹🇴 Lea Fakatonga • 🇫🇯 Na Vosa Vakaviti • 🇮🇪 Gaeilge • 🇮🇸 Íslenska • 🇲🇹 Malti • 🇪🇸 Euskera • 🇪🇸 Català |

## 🚀 快速部署

### 方法一：一键部署（推荐）

创建专用目录并部署：

```bash
# 1. 创建专用目录（推荐使用 /opt）
sudo mkdir -p /opt/kuno
cd /opt/kuno

# 2. 下载并执行部署脚本
curl -sSL "https://raw.githubusercontent.com/xuemian168/kuno/main/deploy-from-hub.sh?$(date +%s)" -o deploy.sh && chmod +x deploy.sh && ./deploy.sh
```

**重要提示**：
- 不要使用 `curl | bash` 的方式，这会导致语法错误
- 建议在 `/opt/kuno` 目录下部署，避免污染用户主目录

### 方法二：手动部署

```bash
# 1. 创建专用目录
sudo mkdir -p /opt/kuno
cd /opt/kuno

# 2. 创建数据目录
mkdir -p ./blog-data

# 3. 运行容器
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

**⚠️ 重要配置说明**：
- `NEXT_PUBLIC_API_URL` - **必须根据你的实际网络环境修改**
  - 本地访问：`http://localhost/api` 或 `http://127.0.0.1/api`
  - 局域网访问：`http://192.168.1.100/api`（使用实际 IP）
  - 公网域名：`https://yourdomain.com/api`
  - 端口非 80：`http://localhost:8080/api`
- `JWT_SECRET` - **生产环境强烈建议设置**
  - 用于签名 JWT 令牌的密钥
  - 如未设置，系统会自动生成随机密钥（重启后会改变）
  - 建议使用至少 32 字符的复杂字符串

**目录说明**：
- `/opt/kuno/` - 应用主目录
- `/opt/kuno/blog-data/` - 数据存储目录（包含数据库和上传文件）
- `/opt/kuno/deploy.sh` - 部署脚本（方法一）

## 📋 环境要求

- Docker 已安装并运行
- 端口 80 可用（或修改为其他端口）

## 🔧 访问地址

部署成功后，可以通过以下地址访问：

- **博客首页**：http://localhost
- **管理后台**：http://localhost/admin
- **默认账号**：admin / xuemian168

⚠️ **重要**：首次登录后请立即修改默认密码！

## 📖 使用说明

### 管理后台功能

1. **文章管理**
   - 创建、编辑、删除文章
   - Markdown 编辑器，支持实时预览
   - 文章分类管理

2. **多语言支持**
   - 支持中文、英文、日文界面
   - 自动检测浏览器语言偏好

3. **系统设置**
   - 站点基本信息配置
   - 主题切换设置

### 内容创作

- 使用 Markdown 语法编写文章
- 支持代码高亮显示
- 支持表格、列表、引用等丰富格式
- 实时预览功能

## 🛠️ 管理命令

```bash
# 查看运行状态
docker ps | grep kuno

# 查看日志
docker logs kuno

# 停止博客
docker stop kuno

# 启动博客
docker start kuno

# 重启博客
docker restart kuno

# 删除容器（注意：会丢失数据）
docker rm -f kuno
```

## 📊 数据备份

博客数据存储在 `/opt/kuno/blog-data` 目录中，建议定期备份：

```bash
# 进入应用目录
cd /opt/kuno

# 备份数据
sudo tar -czf blog-backup-$(date +%Y%m%d).tar.gz ./blog-data

# 恢复数据
sudo tar -xzf blog-backup-20241201.tar.gz
```

## 🔄 更新博客

```bash
# 停止当前容器
docker stop kuno
docker rm kuno

# 拉取最新镜像
docker pull ictrun/kuno:latest

# 进入应用目录
cd /opt/kuno

# 重新运行（注意修改 NEXT_PUBLIC_API_URL）
docker run -d \
    --name kuno \
    --restart unless-stopped \
    -p 80:80 \
    -v /opt/kuno/blog-data:/app/data \
    -e NEXT_PUBLIC_API_URL="http://localhost/api" \
    ictrun/kuno:latest
```

## 🔐 密码重置

### 忘记管理员密码时的处理方法

如果忘记了管理员密码，可以通过以下步骤安全重置：

#### 步骤 1：停止容器
```bash
docker stop kuno
```

#### 步骤 2：启用恢复模式
进入应用目录并使用恢复模式重新运行容器：
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

系统会：
- 重置管理员密码为 `xuemian168`
- 在日志中显示重置信息
- **出于安全考虑拒绝启动**

#### 步骤 3：查看重置结果
```bash
# 查看日志确认密码已重置
docker logs kuno_recovery

# 删除恢复模式容器
docker rm -f kuno_recovery
```

#### 步骤 4：正常启动博客
```bash
# 使用正常模式重新启动
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

#### 步骤 5：使用新密码登录
- **用户名**：`admin`
- **密码**：`xuemian168`

#### 步骤 6：立即修改密码
1. 登录管理后台：`http://localhost/admin`
2. 进入 **设置** → **安全设置**
3. 修改为安全的新密码

### 安全注意事项

⚠️ **重要安全提醒**：
- 恢复模式需要对服务器的**物理访问权限**
- 系统在恢复模式下**不会正常启动**，防止未授权访问
- 密码重置后**立即禁用**恢复模式
- **务必修改**默认密码为安全密码
- 恢复模式仅供紧急使用

## ❓ 常见问题

**Q: 端口被占用怎么办？**
A: 修改 `-p 80:80` 为其他端口，如 `-p 8080:80`，然后通过 http://localhost:8080 访问。

**Q: 如何备份文章数据？**
A: 文章数据保存在 `/opt/kuno/blog-data` 目录中，定期备份此目录即可。

**Q: 如何自定义域名？**
A: 修改 `NEXT_PUBLIC_API_URL` 环境变量为你的域名，如 `https://yourdomain.com/api`。

**Q: 恢复模式无法重置密码怎么办？**
A: 确保环境变量设置正确 (`RECOVERY_MODE=true`)，并检查 Docker 日志中的错误信息。

## 📞 技术支持

如果遇到问题，请：
1. 查看容器日志：`docker logs kuno`
2. 访问项目主页：https://github.com/xuemian168/kuno
3. 提交 Issue 获取帮助

## 赞助
本项目由 [TIKHUB.IO](https://tikhub.io/) 提供支持
> TikHub.io 是一家成立于美国的提供优质数据接口服务供应商。致力于为开发者、创作者及企业提供一站式，海外社交媒体数据 API 和工具服务平台。它面向全球用户，支持自定义扩展并构建社区驱动的生态体系。
![Tikhub_LOGO](./docs/tikhub.png)

## License
[Apache License 2.0](./LICENSE)