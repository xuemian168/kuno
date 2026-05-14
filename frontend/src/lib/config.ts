/**
 * 统一配置管理
 * 消除对 NEXT_PUBLIC_API_URL 环境变量的依赖，实现智能 URL 自动检测
 */

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)
}

function normalizePublicUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim()
  if (!trimmedUrl) {
    return ''
  }

  const absoluteUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedUrl)
    ? trimmedUrl
    : `${trimmedUrl.startsWith('localhost') || trimmedUrl.startsWith('127.0.0.1') || trimmedUrl.startsWith('0.0.0.0') ? 'http' : 'https'}://${trimmedUrl}`

  try {
    const parsedUrl = new URL(absoluteUrl)

    if (!isLocalHost(parsedUrl.hostname)) {
      parsedUrl.protocol = 'https:'
    }

    if ((parsedUrl.protocol === 'https:' && parsedUrl.port === '443') ||
        (parsedUrl.protocol === 'http:' && parsedUrl.port === '80')) {
      parsedUrl.port = ''
    }

    return parsedUrl.toString().replace(/\/$/, '')
  } catch (error) {
    return trimmedUrl.replace(/\/$/, '')
  }
}

function getServerHeaders(): Headers | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { headers } = require('next/headers')
    const headersResult = headers()

    if (headersResult && typeof headersResult.get === 'function') {
      return headersResult as Headers
    }
  } catch (error) {
    // headers() 可能在某些上下文中不可用（如静态生成）
  }

  return null
}

function getConfiguredPublicUrl(): string {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    process.env.HOST ||
    ''

  return explicitUrl ? normalizePublicUrl(explicitUrl) : ''
}

/**
 * 获取 API 基础 URL
 * 自动适配不同环境，无需配置 NEXT_PUBLIC_API_URL
 */
export function getApiUrl(): string {
  // 客户端环境：使用当前页面的 origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`
  }

  // 服务端环境：优先使用内部 API URL（Docker 容器间通信）
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL
  }

  // 回退：使用对外站点 URL，避免在 SEO 元数据中泄露内部地址
  return getPublicApiUrl()
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

  const configuredUrl = getConfiguredPublicUrl()
  if (configuredUrl) {
    return configuredUrl
  }

  const headersList = getServerHeaders()
  if (headersList) {
    const host = headersList.get('x-forwarded-host') || headersList.get('host')
    const forwardedProto = headersList.get('x-forwarded-proto')

    if (host) {
      const protocol = forwardedProto ||
        (host.includes('localhost') || host.startsWith('127.0.0.1') || host.startsWith('0.0.0.0')
          ? 'http'
          : 'https')
      return normalizePublicUrl(`${protocol}://${host}`)
    }
  }

  return process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'http://localhost'
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
  
  // 服务端环境：使用 getBaseUrl 确保正确的域名
  return `${getBaseUrl()}${normalizedPath}`
}

/**
 * 生成网站 URL（用于 SEO、sitemap 等）
 * 与 getBaseUrl 的区别：这个专门用于对外展示的 URL
 */
export function getSiteUrl(): string {
  return getBaseUrl()
}

/**
 * 获取对外公开的 API URL
 * 用于 RSS、Sitemap、OpenGraph 等需要暴露给搜索引擎或第三方的场景
 */
export function getPublicApiUrl(): string {
  return `${getSiteUrl()}/api`
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
