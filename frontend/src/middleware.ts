import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { getApiUrl } from './lib/config'

const i18nMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow API, static files, and embed routes to pass through
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/embed') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/llms.txt'
  ) {
    return i18nMiddleware(request)
  }

  // Allow setup page to pass through
  if (pathname.match(/^\/[a-z]{2}\/setup$/)) {
    return i18nMiddleware(request)
  }

  // Check setup status for other routes
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/setup/status`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    if (response.ok) {
      const data = await response.json()
      
      // If setup is not completed, redirect to setup page
      if (!data.setup_completed) {
        // Extract locale from pathname or use default
        const localeMatch = pathname.match(/^\/([a-z]{2})/)
        const locale = localeMatch ? localeMatch[1] : 'en'
        
        const setupUrl = new URL(`/${locale}/setup`, request.url)
        return NextResponse.redirect(setupUrl)
      }
    }
  } catch (error) {
    // If setup status check fails, allow the request to continue
    // This prevents blocking access if the API is temporarily unavailable
    console.error('Failed to check setup status:', error)
  }

  return i18nMiddleware(request)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|embed|sitemap.xml|robots.txt|llms.txt|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.webp).*)'
  ]
}