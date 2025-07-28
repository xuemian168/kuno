中文 | [English](./README.md)

# I18N 博客系统

一个现代化的多语言博客平台，支持一键 Docker 部署。

## 🌟 特性

- 📝 支持 Markdown 编辑和实时预览
- 🌍 多语言国际化支持 (中文/英文/日文)
- 🎨 现代化界面设计，支持深色/浅色主题
- 📱 响应式设计，完美适配移动端
- 🐳 Docker 容器化部署，开箱即用
- 🔒 安全的管理后台
- 📊 文章分类管理
- 🔍 SEO 优化支持

## 🚀 快速部署

### 方法一：一键部署（推荐）

复制以下命令到终端直接运行：

```bash
curl -sSL https://raw.githubusercontent.com/xuemian168/i18n_blog/main/deploy-from-hub.sh -o deploy.sh && chmod +x deploy.sh && ./deploy.sh
```

**重要提示**：不要使用 `curl | bash` 的方式，这会导致语法错误。

### 方法二：手动部署

```bash
# 1. 创建数据目录
mkdir -p ./blog-data

# 2. 运行容器
docker run -d \
    --name i18n_blog \
    --restart unless-stopped \
    -p 80:80 \
    -v $(pwd)/blog-data:/app/data \
    -e NEXT_PUBLIC_API_URL="http://localhost/api" \
    -e DB_PATH="/app/data/blog.db" \
    -e GIN_MODE="release" \
    -e NODE_ENV="production" \
    ictrun/i18n_blog:latest
```

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
docker ps | grep i18n_blog

# 查看日志
docker logs i18n_blog

# 停止博客
docker stop i18n_blog

# 启动博客
docker start i18n_blog

# 重启博客
docker restart i18n_blog

# 删除容器（注意：会丢失数据）
docker rm -f i18n_blog
```

## 📊 数据备份

博客数据存储在 `./blog-data` 目录中，建议定期备份：

```bash
# 备份数据
tar -czf blog-backup-$(date +%Y%m%d).tar.gz ./blog-data

# 恢复数据
tar -xzf blog-backup-20241201.tar.gz
```

## 🔄 更新博客

```bash
# 停止当前容器
docker stop i18n_blog
docker rm i18n_blog

# 拉取最新镜像
docker pull ictrun/i18n_blog:latest

# 重新运行（使用之前的命令）
docker run -d \
    --name i18n_blog \
    --restart unless-stopped \
    -p 80:80 \
    -v $(pwd)/blog-data:/app/data \
    -e NEXT_PUBLIC_API_URL="http://localhost/api" \
    ictrun/i18n_blog:latest
```

## 🔐 密码重置

### 忘记管理员密码时的处理方法

如果忘记了管理员密码，可以通过以下步骤安全重置：

#### 步骤 1：停止容器
```bash
docker stop i18n_blog
```

#### 步骤 2：启用恢复模式
使用恢复模式重新运行容器：
```bash
docker run -d \
    --name i18n_blog_recovery \
    --restart unless-stopped \
    -p 80:80 \
    -v $(pwd)/blog-data:/app/data \
    -e NEXT_PUBLIC_API_URL="http://localhost/api" \
    -e DB_PATH="/app/data/blog.db" \
    -e RECOVERY_MODE="true" \
    ictrun/i18n_blog:latest
```

系统会：
- 重置管理员密码为 `xuemian168`
- 在日志中显示重置信息
- **出于安全考虑拒绝启动**

#### 步骤 3：查看重置结果
```bash
# 查看日志确认密码已重置
docker logs i18n_blog_recovery

# 删除恢复模式容器
docker rm -f i18n_blog_recovery
```

#### 步骤 4：正常启动博客
```bash
# 使用正常模式重新启动
docker run -d \
    --name i18n_blog \
    --restart unless-stopped \
    -p 80:80 \
    -v $(pwd)/blog-data:/app/data \
    -e NEXT_PUBLIC_API_URL="http://localhost/api" \
    -e DB_PATH="/app/data/blog.db" \
    -e RECOVERY_MODE="false" \
    ictrun/i18n_blog:latest
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
A: 文章数据保存在 `./blog-data` 目录中，定期备份此目录即可。

**Q: 如何自定义域名？**
A: 修改 `NEXT_PUBLIC_API_URL` 环境变量为你的域名，如 `https://yourdomain.com/api`。

**Q: 恢复模式无法重置密码怎么办？**
A: 确保环境变量设置正确 (`RECOVERY_MODE=true`)，并检查 Docker 日志中的错误信息。

## 📞 技术支持

如果遇到问题，请：
1. 查看容器日志：`docker logs i18n_blog`
2. 访问项目主页：https://github.com/xuemian168/i18n_blog
3. 提交 Issue 获取帮助