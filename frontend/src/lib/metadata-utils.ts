import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import { getBaseUrl } from '@/lib/utils'
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
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
  const baseUrl = getBaseUrl()
  
  // Use custom settings if provided, otherwise fetch from API
  const settings = customSettings || await fetchSiteSettings(locale)
  
  // Determine final values with fallbacks
  const siteTitle = settings?.site_title || t('site.title')
  const siteDescription = settings?.site_subtitle || t('site.description')
  
  const finalTitle = customTitle ? `${customTitle} - ${siteTitle}` : siteTitle
  const finalDescription = customDescription || siteDescription
  
  // Generate alternate language links
  const languages: Record<string, string> = {}
  routing.locales.forEach(loc => {
    const path = canonical || '/'
    const langPath = loc === routing.defaultLocale 
      ? path 
      : `/${loc}${path === '/' ? '' : path}`
    languages[loc] = `${baseUrl}${langPath}`
  })
  
  // Build metadata object
  const metadata: Metadata = {
    title: finalTitle,
    description: finalDescription,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonical || (locale === routing.defaultLocale ? '/' : `/${locale}/`),
      languages,
    },
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      url: canonical ? `${baseUrl}${canonical}` : (locale === routing.defaultLocale ? `${baseUrl}/` : `${baseUrl}/${locale}/`),
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
            url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/rss?lang=${locale}`,
            title: `${siteTitle} RSS Feed`,
          },
        ],
      },
    }
  }

  // Add favicon if available
  if (settings?.favicon_url) {
    const faviconUrl = settings.favicon_url.startsWith('http') 
      ? settings.favicon_url 
      : `${baseUrl.replace('/api', '')}${settings.favicon_url}`
    
    metadata.icons = {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    }
  }

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