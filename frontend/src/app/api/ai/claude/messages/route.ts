import { NextRequest, NextResponse } from 'next/server'
import { PROVIDER_DEFAULTS } from '@/services/ai-providers/utils'
import {
  getApiKeyFromRequest,
  getForwardedAuthHeaders,
  getProviderTargetUrl,
  hasCustomProviderBaseUrl,
  hasForwardedAuthHeaders
} from '../../proxy-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const headers = hasCustomProviderBaseUrl(request)
    ? getForwardedAuthHeaders(request)
    : getOfficialClaudeAuthHeaders(request)

  if (!hasForwardedAuthHeaders(headers)) {
    return NextResponse.json(
      { error: { message: 'Claude API key is required' } },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON request body' } },
      { status: 400 }
    )
  }

  try {
    const targetUrl = getProviderTargetUrl(
      request,
      PROVIDER_DEFAULTS.claude.baseUrl,
      PROVIDER_DEFAULTS.claude.messagesPath
    )

    if (targetUrl instanceof NextResponse) {
      return targetUrl
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...withClaudeVersionHeaders(headers, request)
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    })

    const responseText = await upstreamResponse.text()
    const contentType = upstreamResponse.headers.get('content-type') || 'application/json'

    return new NextResponse(responseText, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: {
        'Content-Type': contentType
      }
    })
  } catch (error) {
    console.error('Claude proxy request failed:', error)

    return NextResponse.json(
      { error: { message: 'Claude proxy request failed' } },
      { status: 502 }
    )
  }
}

function getOfficialClaudeAuthHeaders(request: NextRequest): Record<string, string> {
  const apiKey = getApiKeyFromRequest(request)
  return apiKey ? { 'x-api-key': apiKey } : {}
}

function withClaudeVersionHeaders(
  headers: Record<string, string>,
  request: NextRequest
): Record<string, string> {
  const version = request.headers.get('anthropic-version') || PROVIDER_DEFAULTS.claude.apiVersion
  const beta = request.headers.get('anthropic-beta')

  return {
    ...headers,
    ...(version ? { 'anthropic-version': version } : {}),
    ...(beta ? { 'anthropic-beta': beta } : {})
  }
}
