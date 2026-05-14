import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import { getSiteUrl, getApiUrl, getPublicApiUrl } from '@/lib/config'
import { generateIconsMetadata } from '@/lib/favicon-utils'
import { routing } from '@/i18n/routing'
import { buildLocalizedPath, getSiteAvailableLocales, normalizeSeoLocales } from '@/lib/seo-locale-utils'

export interface SiteSettings {
  site_title?: string
  site_subtitle?: string
  favicon_url?: string
  logo_url?: string
  show_site_title?: boolean
  default_language?: string
  translations?: Array<{
    language: string
    site_title?: string
    site_subtitle?: string
  }>
}

export interface PageMetadataOptions {
  locale: string
  title?: string
  description?: string
  canonical?: string
  customSettings?: SiteSettings
  includeRSS?: boolean
  availableLocales?: string[]
  robots?: {
    index?: boolean
    follow?: boolean
  }
}

/**
 * Fetch site settings from API
 */
async function fetchSiteSettings(locale: string): Promise<SiteSettings | null> {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/settings?lang=${locale}`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    })
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch site settings:', error)
  }
  
  return null
}

/**
 * Generate consistent metadata for all pages
 */
export async function generatePageMetadata(options: PageMetadataOptions): Promise<Metadata> {
  const {
    locale,
    title: customTitle,
    description: customDescription,
    canonical,
    customSettings,
    includeRSS = true,
    availableLocales,
    robots = { index: true, follow: true }
  } = options

  const t = await getTranslations({ locale })
  const siteUrl = getSiteUrl() // For frontend URLs (still needed for other metadata)
  
  // Use custom settings if provided, otherwise fetch from API
  const settings = customSettings || await fetchSiteSettings(locale)
  
  // Determine final values with fallbacks
  const siteTitle = settings?.site_title || t('site.title')
  const siteDescription = settings?.site_subtitle || t('site.description')
  
  const finalTitle = customTitle ? `${customTitle} - ${siteTitle}` : siteTitle
  const finalDescription = customDescription || siteDescription

  const seoLocales = normalizeSeoLocales(
    availableLocales && availableLocales.length > 0
      ? availableLocales
      : getSiteAvailableLocales(settings),
    routing.defaultLocale
  )
  const defaultLocale = routing.defaultLocale
  const isCurrentLocaleIndexable = seoLocales.includes(locale)
  const canonicalLocale = isCurrentLocaleIndexable ? locale : defaultLocale
  const shouldIndex = Boolean(robots.index && isCurrentLocaleIndexable)
  
  // Generate alternate language links including self-referential
  const languages: Record<string, string> = {}
  const canonicalPath = canonical || '/'
  seoLocales.forEach(loc => {
    languages[loc] = `${siteUrl}${buildLocalizedPath(canonicalPath, loc, defaultLocale)}`
  })
  
  // x-default 始终指向默认语言版本
  languages['x-default'] = `${siteUrl}${buildLocalizedPath(canonicalPath, defaultLocale, defaultLocale)}`
  
  // Build canonical URL - full absolute URL is preferred for SEO
  const fullCanonicalPath = buildLocalizedPath(canonicalPath, canonicalLocale, defaultLocale)
  const fullCanonicalUrl = `${siteUrl}${fullCanonicalPath}`

  // Build metadata object
  const metadata: Metadata = {
    title: finalTitle,
    description: finalDescription,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: fullCanonicalUrl,
      languages,
    },
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      url: fullCanonicalUrl,
      siteName: siteTitle,
      locale: canonicalLocale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: finalDescription,
    },
    robots: {
      index: shouldIndex,
      follow: robots.follow,
      googleBot: {
        index: shouldIndex,
        follow: robots.follow,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }

  // Add RSS feed link if enabled
  if (includeRSS) {
    metadata.alternates = {
      ...metadata.alternates,
      types: {
        'application/rss+xml': [
          {
            url: `${getPublicApiUrl()}/rss?lang=${canonicalLocale}`,
            title: `${siteTitle} RSS Feed`,
          },
        ],
      },
    }
  }

  // Add favicon using simplified utility
  metadata.icons = generateIconsMetadata(settings?.favicon_url)

  return metadata
}

/**
 * Generate basic metadata without locale dependency (for client components or simple pages)
 */
export async function generateBasicMetadata(options: {
  title?: string
  description?: string
}): Promise<Metadata> {
  const siteUrl = getSiteUrl() // For frontend URLs
  
  // Try to fetch settings without locale dependency
  const settings = await fetchSiteSettings('zh') // Use default locale
  
  const finalTitle = options.title || settings?.site_title || 'Admin Panel'
  const finalDescription = options.description || settings?.site_subtitle || 'Content Management System'
  
  const metadata: Metadata = {
    title: finalTitle,
    description: finalDescription,
    metadataBase: new URL(siteUrl),
  }

  // Add favicon using simplified utility
  metadata.icons = generateIconsMetadata(settings?.favicon_url)

  return metadata
}

/**
 * Generate metadata specifically for article pages
 */
export async function generateArticleMetadata(options: PageMetadataOptions & {
  article?: {
    title: string
    summary?: string
    seo_title?: string
    seo_description?: string
    cover_image_url?: string
    cover_image_alt?: string
    created_at: string
    updated_at: string
    default_lang?: string
    translations?: Array<{
      language: string
      title?: string
      summary?: string
      content?: string
    }>
  }
}): Promise<Metadata> {
  const { article, ...baseOptions } = options

  if (!article) {
    return generatePageMetadata(baseOptions)
  }

  const finalTitle = article.seo_title || article.title
  const finalDescription = article.seo_description || article.summary || ''

  const metadata = await generatePageMetadata({
    ...baseOptions,
    title: finalTitle,
    description: finalDescription,
  })

  // Add article-specific OpenGraph data
  if (metadata.openGraph) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: 'article',
      publishedTime: article.created_at,
      modifiedTime: article.updated_at,
    }

    // Add og:image if cover image exists
    if (article.cover_image_url) {
      const siteUrl = getSiteUrl()
      // 服务端构建完整的图片 URL
      const imageUrl = article.cover_image_url.startsWith('http')
        ? article.cover_image_url
        : article.cover_image_url.startsWith('/uploads/')
          ? `${siteUrl}/api${article.cover_image_url}`
          : `${siteUrl}${article.cover_image_url}`

      metadata.openGraph = {
        ...metadata.openGraph,
        images: [{
          url: imageUrl,
          alt: article.cover_image_alt || article.title,
        }],
      }
      metadata.twitter = {
        ...metadata.twitter,
        images: [imageUrl],
      }
    }
  }

  return metadata
}
