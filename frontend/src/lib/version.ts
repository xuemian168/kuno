// 版本和构建信息
// 在实际项目中，这些信息通常来自：
// 1. package.json 的 version 字段
// 2. 构建时的环境变量
// 3. Git 信息（commit hash, build date 等）

export interface AppVersion {
  name: string
  version: string
  build: string
  buildDate: string
  commit?: string
  branch?: string
}

// 获取当前构建日期
const getBuildDate = (): string => {
  // 在实际构建中，这可以从环境变量获取
  // 例如：process.env.BUILD_DATE || new Date().toISOString().split('T')[0]
  return new Date().toISOString().split('T')[0]
}

// 生成构建号（通常基于时间戳）
const generateBuildNumber = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  
  return `${year}.${month}.${day}.${hours}${minutes}`
}

export const getAppVersion = (): AppVersion => {
  // 在生产环境中，这些值通常通过构建时注入
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"
  const buildNumber = process.env.NEXT_PUBLIC_BUILD_NUMBER || generateBuildNumber()
  const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE || getBuildDate()
  
  return {
    name: "I18N BLOG",
    version: version,
    build: buildNumber,
    buildDate: buildDate,
    // 在实际项目中可以添加：
    commit: process.env.NEXT_PUBLIC_GIT_COMMIT?.substring(0, 7),
    branch: process.env.NEXT_PUBLIC_GIT_BRANCH || 'main'
  }
}

// 应用信息常量
export const APP_INFO = {
  name: "I18N BLOG",
  fullName: "I18N Blog System",
  description: {
    zh: "一个简洁优雅的现代化博客系统，支持多语言、Markdown编辑、媒体管理等功能。",
    en: "A minimalist and elegant modern blog system with multi-language support, Markdown editing, media management and more."
  },
  features: {
    zh: [
      "🎨 现代化的界面设计",
      "🌐 多语言支持",
      "📝 Markdown编辑器",
      "🖼️ 媒体库管理", 
      "🔍 SEO优化",
      "📱 响应式设计",
      "🔐 安全认证",
      "🚀 高性能部署"
    ],
    en: [
      "🎨 Modern UI Design",
      "🌐 Multi-language Support", 
      "📝 Markdown Editor",
      "🖼️ Media Library",
      "🔍 SEO Optimization",
      "📱 Responsive Design",
      "🔐 Secure Authentication", 
      "🚀 High Performance"
    ]
  },
  techStack: {
    frontend: ["Next.js 14", "TypeScript", "Tailwind CSS", "shadcn/ui", "Framer Motion"],
    backend: ["Go", "Gin", "GORM", "SQLite"],
    deployment: ["Docker", "Nginx"]
  },
  author: "xuemian168",
  repository: "https://github.com/ictrun/i18n_blog",
  license: "MIT",
  website: "https://blog.xuemian168.com"
}