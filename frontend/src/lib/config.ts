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
  
  // 生产环境服务端：使用 getBaseUrl 确保正确的域名
  return `${getBaseUrl()}/api`
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
  
  // 标准化路径 - 对于 uploads 路径，确保有 /api 前缀
  let normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (normalizedPath.startsWith('/uploads/')) {
    normalizedPath = `/api${normalizedPath}`
  } else if (!normalizedPath.startsWith('/api/') && normalizedPath.includes('uploads/')) {
    // 处理不带前导斜杠的 uploads 路径
    normalizedPath = `/api/uploads/${path}`
  }
  
  // 客户端环境：直接使用当前域名
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${normalizedPath}`
  }
  
  // 服务端环境：使用统一的 getApiUrl 逻辑
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:8085${normalizedPath}`
  } else {
    // 生产环境：使用 getBaseUrl 确保正确的域名
    return `${getBaseUrl()}${normalizedPath}`
  }
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