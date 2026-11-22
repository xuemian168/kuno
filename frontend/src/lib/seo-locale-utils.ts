import { routing } from '@/i18n/routing'

type SiteTranslationLike = {
  language?: string
  site_title?: string
  site_subtitle?: string
}

type SiteSettingsLike = {
  default_language?: string
  translations?: SiteTranslationLike[]
}

type ArticleTranslationLike = {
  language?: string
  title?: string
  summary?: string
  content?: string
}

type ArticleLike = {
  default_lang?: string
  translations?: ArticleTranslationLike[]
}

const supportedLocaleSet = new Set<string>(routing.locales as readonly string[])

function hasMeaningfulText(value?: string | null): boolean {
  return Boolean(value?.trim())
}

export function normalizeSeoLocales(
  locales: Array<string | null | undefined>,
  fallbackLocale: string = routing.defaultLocale
): string[] {
  const normalizedLocales = Array.from(new Set(
    locales.filter((locale): locale is string => Boolean(locale && supportedLocaleSet.has(locale)))
  ))

  return normalizedLocales.length > 0 ? normalizedLocales : [fallbackLocale]
}

/**
 * Build the public path for a locale.
 *
 * Routing is configured with `localePrefix: 'always'`, so every locale —
 * including the default one — is served under its prefix (`/zh/...`).
 * Unprefixed paths answer with a 307 redirect, so SEO URLs (canonical,
 * hreflang, sitemap, JSON-LD) must always carry the prefix.
 */
export function buildLocalizedPath(path: string, locale: string): string {
  const normalizedPath = path === '' ? '/' : (path.startsWith('/') ? path : `/${path}`)

  return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`
}

export function getSiteAvailableLocales(settings?: SiteSettingsLike | null): string[] {
  const defaultLocale = settings?.default_language && supportedLocaleSet.has(settings.default_language)
    ? settings.default_language
    : routing.defaultLocale

  const translatedLocales = (settings?.translations || [])
    .filter((translation) => {
      if (!translation.language || !supportedLocaleSet.has(translation.language)) {
        return false
      }

      return hasMeaningfulText(translation.site_title) || hasMeaningfulText(translation.site_subtitle)
    })
    .map((translation) => translation.language as string)

  return normalizeSeoLocales([defaultLocale, ...translatedLocales], defaultLocale)
}

export function hasMeaningfulArticleTranslation(translation?: ArticleTranslationLike | null): boolean {
  if (!translation?.language || !supportedLocaleSet.has(translation.language)) {
    return false
  }

  return hasMeaningfulText(translation.title) ||
    hasMeaningfulText(translation.summary) ||
    hasMeaningfulText(translation.content)
}

export function getArticleAvailableLocales(
  article?: ArticleLike | null,
  siteAvailableLocales?: string[]
): string[] {
  const defaultLocale = article?.default_lang && supportedLocaleSet.has(article.default_lang)
    ? article.default_lang
    : routing.defaultLocale

  const translatedLocales = (article?.translations || [])
    .filter((translation) => hasMeaningfulArticleTranslation(translation))
    .map((translation) => translation.language as string)

  const articleLocales = normalizeSeoLocales([defaultLocale, ...translatedLocales], defaultLocale)

  if (!siteAvailableLocales?.length) {
    return articleLocales
  }

  const allowedLocales = new Set(normalizeSeoLocales(siteAvailableLocales, defaultLocale))
  const filteredLocales = articleLocales.filter((locale) => locale === defaultLocale || allowedLocales.has(locale))

  return filteredLocales.length > 0 ? filteredLocales : [defaultLocale]
}
