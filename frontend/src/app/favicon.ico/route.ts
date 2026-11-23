import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getApiUrl } from '@/lib/config'

// Search engines fall back to /favicon.ico, so it must serve the favicon uploaded
// in the admin settings rather than always the bundled KUNO icon.
export const dynamic = 'force-dynamic'

// Short enough that a newly uploaded favicon shows up within a day.
const CACHE_CONTROL = 'public, max-age=86400'
const FETCH_TIMEOUT_MS = 5000

// Maps a stored favicon_url ("/uploads/x", "uploads/x" or "/api/uploads/x") to a
// path under the API's /uploads route; anything else is rejected.
function uploadPath(faviconUrl: string): string | null {
  let path = faviconUrl.startsWith('/') ? faviconUrl : `/${faviconUrl}`
  if (path.startsWith('/api/')) {
    path = path.slice('/api'.length)
  }
  return path.startsWith('/uploads/') && !path.includes('..') ? path : null
}

async function uploadedFavicon(): Promise<NextResponse | null> {
  const apiUrl = getApiUrl()
  const settingsRes = await fetch(`${apiUrl}/settings`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!settingsRes.ok) return null

  const { favicon_url: faviconUrl } = (await settingsRes.json()) as { favicon_url?: string }
  if (!faviconUrl) return null

  if (/^https?:\/\//i.test(faviconUrl)) {
    return NextResponse.redirect(faviconUrl, 302)
  }

  const path = uploadPath(faviconUrl)
  if (!path) return null

  const iconRes = await fetch(`${apiUrl}${path}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  const contentType = iconRes.headers.get('content-type') || ''
  if (!iconRes.ok || !contentType.startsWith('image/')) return null

  return new NextResponse(await iconRes.arrayBuffer(), {
    status: 200,
    headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
  })
}

async function bundledFavicon(): Promise<NextResponse> {
  try {
    // Not public/favicon.ico: a public file would shadow this route.
    const icon = await readFile(join(process.cwd(), 'public', 'kuno-favicon.ico'))
    return new NextResponse(icon, {
      status: 200,
      headers: { 'Content-Type': 'image/x-icon', 'Cache-Control': CACHE_CONTROL },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}

export async function GET() {
  try {
    const uploaded = await uploadedFavicon()
    if (uploaded) return uploaded
  } catch (error) {
    console.error('Failed to serve uploaded favicon, using the bundled one:', error)
  }
  return bundledFavicon()
}
