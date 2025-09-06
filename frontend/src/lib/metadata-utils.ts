import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import { getSiteUrl, getApiUrl } from '@/lib/config'
import { generateIconsMetadata } from '@/lib/favicon-utils'
import { routing } from '@/i18n/routing'

export interface SiteSettings {
  site_title?: string
  site_subtitle?: string
  favicon_url?: string
  logo_url?: string
  show_site_title?: boolean
}

export interface PageMetadataOptions {
  locale: string
  title?: string
  description?: string
  canonical?: string
  customSettings?: SiteSettings
  includeRSS?: boolean
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
  
  // Generate alternate language links including self-referential
  const languages: Record<string, string> = {}
  routing.locales.forEach(loc => {
    const path = canonical || '/'
    const langPath = loc === routing.defaultLocale 
      ? path 
      : `/${loc}${path === '/' ? '' : path}`
    languages[loc] = `${siteUrl}${langPath}`
  })
  
  // Add self-referential alternate link (x-default)
  const currentLangPath = locale === routing.defaultLocale 
    ? (canonical || '/') 
    : `/${locale}${canonical === '/' ? '' : canonical || ''}`
  languages['x-default'] = `${siteUrl}${currentLangPath}`
  
  // Build canonical URL - full absolute URL is preferred for SEO
  const canonicalPath = canonical || '/'
  const fullCanonicalPath = locale === routing.defaultLocale 
    ? canonicalPath 
    : `/${locale}${canonicalPath === '/' ? '' : canonicalPath}`
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
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: finalDescription,
    },
    robots: {
      index: robots.index,
      follow: robots.follow,
      googleBot: {
        index: robots.index,
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
            url: `${getApiUrl()}/rss?lang=${locale}`,
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
    created_at: string
    updated_at: string
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
  }

  return metadata
}