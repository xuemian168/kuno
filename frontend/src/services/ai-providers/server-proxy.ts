import { getApiUrl } from '../../lib/config'

export type AIServerProxyScope = 'translation' | 'summary' | 'seo' | 'global'
export type AIServerProxyProvider = 'openai' | 'gemini' | 'volcano' | 'claude'

const PROVIDER_PATHS: Record<AIServerProxyProvider, string> = {
  openai: '/ai-proxy/openai/chat/completions',
  volcano: '/ai-proxy/volcano/chat/completions',
  claude: '/ai-proxy/claude/messages',
  gemini: '/ai-proxy/gemini/generateContent'
}

export function getServerAIProxyEndpoint(
  provider: AIServerProxyProvider,
  scope: AIServerProxyScope,
  params?: Record<string, string | undefined>
): string {
  const query = new URLSearchParams({ scope })

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) {
      query.set(key, value)
    }
  })

  return `${getApiUrl()}${PROVIDER_PATHS[provider]}?${query.toString()}`
}

export function getServerAIProxyHeaders(contentType = 'application/json'): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': contentType
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  return headers
}

export function isMaskedOrServerManagedKey(apiKey?: string, isConfigured?: boolean): boolean {
  if (isConfigured) return true
  if (!apiKey) return false

  return (
    apiKey.includes('*') ||
    apiKey.includes('---') ||
    apiKey === 'configured' ||
    apiKey === '已配置' ||
    apiKey === '__server_managed__'
  )
}
