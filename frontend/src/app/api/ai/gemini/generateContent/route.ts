import { NextRequest, NextResponse } from 'next/server'
import { PROVIDER_DEFAULTS } from '@/services/ai-providers/utils'
import {
  getApiKeyFromRequest,
  getForwardedAuthHeaders,
  getProviderTargetUrl,
  hasCustomProviderBaseUrl,
  hasForwardedAuthHeaders,
  proxyProviderRequest
} from '../../proxy-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const model = request.nextUrl.searchParams.get('model')

  if (!model) {
    return NextResponse.json(
      { error: { message: 'Gemini model is required' } },
      { status: 400 }
    )
  }

  const normalizedModel = model.startsWith('models/') ? model.slice('models/'.length) : model
  const path = PROVIDER_DEFAULTS.gemini.generateContentPath.replace(
    '{model}',
    encodeURIComponent(normalizedModel)
  )
  const targetUrl = getProviderTargetUrl(
    request,
    PROVIDER_DEFAULTS.gemini.baseUrl,
    path
  )

  if (targetUrl instanceof NextResponse) {
    return targetUrl
  }

  if (hasCustomProviderBaseUrl(request)) {
    const headers = getForwardedAuthHeaders(request)

    if (!hasForwardedAuthHeaders(headers)) {
      return NextResponse.json(
        { error: { message: 'Gemini API key is required' } },
        { status: 401 }
      )
    }

    return proxyProviderRequest(
      request,
      targetUrl,
      headers
    )
  }

  const apiKey = getApiKeyFromRequest(request)

  if (!apiKey) {
    return NextResponse.json(
      { error: { message: 'Gemini API key is required' } },
      { status: 401 }
    )
  }

  return proxyProviderRequest(
    request,
    `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`,
    {}
  )
}
