import { NextRequest, NextResponse } from 'next/server'
import { PROVIDER_DEFAULTS } from '@/services/ai-providers/utils'
import {
  getBearerAuthorization,
  getForwardedAuthHeaders,
  getProviderTargetUrl,
  hasCustomProviderBaseUrl,
  hasForwardedAuthHeaders,
  proxyProviderRequest
} from '../../../proxy-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const targetUrl = getProviderTargetUrl(
    request,
    PROVIDER_DEFAULTS.openai.baseUrl,
    PROVIDER_DEFAULTS.openai.chatCompletionsPath
  )

  if (targetUrl instanceof NextResponse) {
    return targetUrl
  }

  const headers = hasCustomProviderBaseUrl(request)
    ? getForwardedAuthHeaders(request)
    : getOfficialOpenAIAuthHeaders(request)

  if (!hasForwardedAuthHeaders(headers)) {
    return NextResponse.json(
      { error: { message: 'OpenAI API key is required' } },
      { status: 401 }
    )
  }

  const organization = request.headers.get('openai-organization')
  if (organization) {
    headers['OpenAI-Organization'] = organization
  }

  const project = request.headers.get('openai-project')
  if (project) {
    headers['OpenAI-Project'] = project
  }

  return proxyProviderRequest(
    request,
    targetUrl,
    headers
  )
}

function getOfficialOpenAIAuthHeaders(request: NextRequest): Record<string, string> {
  const authorization = getBearerAuthorization(request)
  return authorization ? { Authorization: authorization } : {}
}
