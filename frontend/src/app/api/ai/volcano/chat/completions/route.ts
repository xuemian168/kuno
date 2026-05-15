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
    PROVIDER_DEFAULTS.volcano.baseUrl,
    PROVIDER_DEFAULTS.volcano.chatCompletionsPath
  )

  if (targetUrl instanceof NextResponse) {
    return targetUrl
  }

  const headers = hasCustomProviderBaseUrl(request)
    ? getForwardedAuthHeaders(request)
    : getOfficialVolcanoAuthHeaders(request)

  if (!hasForwardedAuthHeaders(headers)) {
    return NextResponse.json(
      { error: { message: 'Volcano Engine API key is required' } },
      { status: 401 }
    )
  }

  return proxyProviderRequest(
    request,
    targetUrl,
    headers
  )
}

function getOfficialVolcanoAuthHeaders(request: NextRequest): Record<string, string> {
  const authorization = getBearerAuthorization(request)
  return authorization ? { Authorization: authorization } : {}
}
