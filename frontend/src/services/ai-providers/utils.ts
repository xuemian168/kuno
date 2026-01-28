/**
 * AI Provider URL 构建工具
 *
 * 提供统一的方式来构建各个 AI provider 的 API endpoint，
 * 支持自定义 base URL 以兼容 OpenAI-compatible 服务（如 OpenRouter、LocalAI 等）
 */

/**
 * Provider 默认配置常量
 */
export const PROVIDER_DEFAULTS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    chatCompletionsPath: '/chat/completions',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    generateContentPath: '/models/{model}:generateContent',
  },
  volcano: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    chatCompletionsPath: '/chat/completions',
  },
} as const

/**
 * 构建完整的 API endpoint
 *
 * @param baseUrl - 自定义 base URL（可选）
 * @param defaultUrl - 默认 base URL
 * @param path - API 路径（可选）
 * @returns 完整的 endpoint URL
 *
 * @example
 * // 使用默认 URL
 * getProviderEndpoint(undefined, 'https://api.openai.com/v1', '/chat/completions')
 * // => 'https://api.openai.com/v1/chat/completions'
 *
 * // 使用自定义 URL
 * getProviderEndpoint('https://openrouter.ai/api/v1', 'https://api.openai.com/v1', '/chat/completions')
 * // => 'https://openrouter.ai/api/v1/chat/completions'
 *
 * // 仅返回 base URL
 * getProviderEndpoint('http://localhost:8080/v1', 'https://api.openai.com/v1')
 * // => 'http://localhost:8080/v1'
 */
export function getProviderEndpoint(
  baseUrl: string | undefined,
  defaultUrl: string,
  path?: string
): string {
  const base = baseUrl || defaultUrl
  const cleanBase = base.replace(/\/$/, '')

  if (!path) return cleanBase

  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

/**
 * 为 Gemini 构建特殊的 endpoint（包含 model 和 API key）
 *
 * Gemini API 的特殊之处在于：
 * 1. URL 中需要包含 model 名称
 * 2. API key 通过 query parameter 传递
 *
 * @param baseUrl - 自定义 base URL（可选）
 * @param model - Gemini 模型名称（如 'gemini-1.5-flash'）
 * @param apiKey - API key
 * @returns 完整的 Gemini endpoint URL
 *
 * @example
 * getGeminiEndpoint(undefined, 'gemini-1.5-flash', 'AIza...')
 * // => 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIza...'
 *
 * getGeminiEndpoint('http://localhost:8000', 'gemini-1.5-flash', 'test-key')
 * // => 'http://localhost:8000/models/gemini-1.5-flash:generateContent?key=test-key'
 */
export function getGeminiEndpoint(
  baseUrl: string | undefined,
  model: string,
  apiKey: string
): string {
  const base = getProviderEndpoint(
    baseUrl,
    PROVIDER_DEFAULTS.gemini.baseUrl
  )

  const path = PROVIDER_DEFAULTS.gemini.generateContentPath.replace(
    '{model}',
    model
  )

  return `${base}${path}?key=${apiKey}`
}
