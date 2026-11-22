import { createNavigation } from 'next-intl/navigation'
import { defineRouting } from 'next-intl/routing'

// Use a static set of commonly supported languages for routing
// This ensures consistency between server and client rendering
export const locales = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'hi'] as const
export const defaultLocale = 'zh'

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Every locale is served under its prefix (`/zh/...`); SEO URLs rely on this.
  localePrefix: 'always',
  // The middleware's `Link` header lists all 12 locales (incl. untranslated,
  // noindex pages) with the internal http:// origin, contradicting the
  // per-page hreflang in <head>. Pages emit their own alternates instead.
  alternateLinks: false
})

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)