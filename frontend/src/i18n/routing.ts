import { createNavigation } from 'next-intl/navigation'
import { defineRouting } from 'next-intl/routing'

// Use a static set of commonly supported languages for routing
// This ensures consistency between server and client rendering
export const locales = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'hi'] as const
export const defaultLocale = 'zh'

export const routing = defineRouting({
  locales,
  defaultLocale
})

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)