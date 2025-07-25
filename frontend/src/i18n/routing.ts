import { createNavigation } from 'next-intl/navigation'
import { defineRouting } from 'next-intl/routing'

export const locales = ['zh', 'en'] as const
export const defaultLocale = 'zh'

export const routing = defineRouting({
  locales,
  defaultLocale
})

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)