import { NextRequest, NextResponse } from 'next/server'

export function getApiKeyFromRequest(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization')
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim()
  }

  return (
    request.headers.get('x-api-key') ||
    request.headers.get('x-goog-api-key') ||
    request.headers.get('api-key')
  )
}

export function getBearerAuthorization(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization')
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization
  }

  const apiKey = getApiKeyFromRequest(request)
  return apiKey ? `Bearer ${apiKey}` : null
}

export function hasCustomProviderBaseUrl(request: NextRequest): boolean {
  return !!request.nextUrl.searchParams.get('baseUrl')
}

export function getForwardedAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {}
  const authorization = request.headers.get('authorization')
  const xApiKey = request.headers.get('x-api-key')
  const xGoogApiKey = request.headers.get('x-goog-api-key')
  const apiKey = request.headers.get('api-key')
  const customAuthHeader = request.headers.get('x-kuno-forward-auth-header')

  if (authorization) {
    headers.Authorization = authorization
  }

  if (xApiKey) {
    headers['x-api-key'] = xApiKey
  }

  if (xGoogApiKey) {
    headers['x-goog-api-key'] = xGoogApiKey
  }

  if (apiKey) {
    headers['api-key'] = apiKey
  }

  if (customAuthHeader && isSafeHeaderName(customAuthHeader)) {
    const customAuthValue = request.headers.get(customAuthHeader)
    if (customAuthValue) {
      headers[customAuthHeader] = customAuthValue
    }
  }

  return headers
}

export function hasForwardedAuthHeaders(headers: Record<string, string>): boolean {
  return Object.keys(headers).length > 0
}

export function getProviderTargetUrl(
  request: NextRequest,
  defaultBaseUrl: string,
  path: string
): string | NextResponse {
  const customBaseUrl = request.nextUrl.searchParams.get('baseUrl')

  if (!customBaseUrl) {
    return `${defaultBaseUrl.replace(/\/$/, '')}${path}`
  }

  const normalizedBaseUrl = normalizeProviderBaseUrl(customBaseUrl)
  const validationError = validateCustomBaseUrl(normalizedBaseUrl)

  if (validationError) {
    return NextResponse.json(
      { error: { message: validationError } },
      { status: 400 }
    )
  }

  const cleanBase = normalizedBaseUrl.replace(/\/$/, '')
  return cleanBase.endsWith(path) ? cleanBase : `${cleanBase}${path}`
}

export async function proxyProviderRequest(
  request: NextRequest,
  url: string,
  headers: Record<string, string>
): Promise<NextResponse> {
  const body = await request.text()

  try {
    const upstreamResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
        ...headers
      },
      body,
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
    console.error('AI provider proxy request failed:', error)

    return NextResponse.json(
      { error: { message: 'AI provider proxy request failed' } },
      { status: 502 }
    )
  }
}

function normalizeProviderBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

function validateCustomBaseUrl(baseUrl: string): string | null {
  let parsed: URL

  try {
    parsed = new URL(baseUrl)
  } catch {
    return 'Invalid provider base URL'
  }

  if (parsed.protocol !== 'https:') {
    return 'Custom provider base URL must use HTTPS'
  }

  const hostname = parsed.hostname.toLowerCase()

  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    isPrivateIPv4(hostname) ||
    isPrivateIPv6(hostname)
  ) {
    return 'Custom provider base URL cannot target localhost or private network addresses'
  }

  return null
}

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part))

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }

  const [a, b] = parts

  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  )
}

function isPrivateIPv6(hostname: string): boolean {
  return (
    hostname === '::1' ||
    hostname.startsWith('fc') ||
    hostname.startsWith('fd') ||
    hostname.startsWith('fe80:')
  )
}

function isSafeHeaderName(headerName: string): boolean {
  const normalized = headerName.toLowerCase()

  if (
    normalized === 'cookie' ||
    normalized === 'host' ||
    normalized === 'origin' ||
    normalized === 'referer' ||
    normalized === 'accept' ||
    normalized === 'content-type' ||
    normalized === 'content-length' ||
    normalized === 'user-agent' ||
    normalized.startsWith('sec-') ||
    normalized.startsWith('x-forwarded-') ||
    normalized.startsWith('x-real-ip')
  ) {
    return false
  }

  return /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(headerName)
}
