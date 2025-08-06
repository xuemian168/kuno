/**
 * 统一配置管理
 * 消除对 NEXT_PUBLIC_API_URL 环境变量的依赖，实现智能 URL 自动检测
 */

/**
 * 获取 API 基础 URL
 * 自动适配不同环境，无需配置 NEXT_PUBLIC_API_URL
 */
export function getApiUrl(): string {
  // 客户端环境：使用当前页面的 origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`
  }
  
  // 服务端环境
  // 开发环境：直接连接到后端服务
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8085/api'
  }
  
  // 生产环境服务端：需要返回完整 URL 用于 fetch
  // 在构建时，使用 localhost 作为占位符，实际运行时会被容器内的服务替代
  return 'http://localhost/api'
}

/**
 * 获取基础 URL（不含 /api）
 * 用于生成前端页面 URL
 */
export function getBaseUrl(): string {
  // 客户端环境
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // 服务端环境 - 开发环境
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  
  // 服务端环境 - 生产环境
  // 在 Docker 容器中，使用环境变量或默认值
  const host = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.HOST 
    ? `https://${process.env.HOST}`
    : 'http://localhost'
  
  return host
}

/**
 * 生成媒体文件完整 URL
 * 处理 /uploads 路径的自动转换
 * @param path - 相对路径，如 "/uploads/images/example.jpg"
 */
export function getMediaUrl(path: string): string {
  if (!path) return ''
  
  // 如果已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // 标准化路径
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  // 客户端环境：直接使用当前域名
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${normalizedPath}`
  }
  
  // 服务端环境：开发时连接到后端，生产时使用相对路径
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8085' 
    : ''
    
  return `${baseUrl}${normalizedPath}`
}

/**
 * 生成网站 URL（用于 SEO、sitemap 等）
 * 与 getBaseUrl 的区别：这个专门用于对外展示的 URL
 */
export function getSiteUrl(): string {
  // 优先使用显式设置的网站 URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  
  // 回退到 getBaseUrl 的逻辑
  return getBaseUrl()
}

/**
 * API 请求配置
 * 统一管理所有 API 相关配置
 */
export const API_CONFIG = {
  timeout: 30000, // 30秒超时
  retries: 3,     // 重试次数
} as const

/**
 * 开发环境检测
 */
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'

/**
 * 构建信息（从环境变量获取，保持现有逻辑）
 */
export const BUILD_INFO = {
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER || 'dev',
  buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || 'unknown',
  gitCommit: process.env.NEXT_PUBLIC_GIT_COMMIT || 'dev',
  gitBranch: process.env.NEXT_PUBLIC_GIT_BRANCH || 'main',
} as const