import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import { getBaseUrl, getSiteUrl } from '@/lib/utils'
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
  const baseUrl = getBaseUrl() // For API calls
  const siteUrl = getSiteUrl() // For frontend URLs
  
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
    languages[loc] = `${siteUrl}${langPath}`
  })
  
  // Build metadata object
  const metadata: Metadata = {
    title: finalTitle,
    description: finalDescription,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: canonical || (locale === routing.defaultLocale ? '/' : `/${locale}/`),
      languages,
    },
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      url: canonical ? `${siteUrl}${canonical}` : (locale === routing.defaultLocale ? `${siteUrl}/` : `${siteUrl}/${locale}/`),
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

  // Add favicon with comprehensive icon definitions to prevent browser defaults
  let faviconUrl: string
  let faviconType: string = 'image/png'
  
  if (settings?.favicon_url) {
    // Handle custom favicon from settings
    if (settings.favicon_url.startsWith('http')) {
      faviconUrl = settings.favicon_url
    } else if (settings.favicon_url.startsWith('/api/uploads/') || settings.favicon_url.startsWith('/uploads/')) {
      // API uploads path - use baseUrl for backend resources
      faviconUrl = `${baseUrl}${settings.favicon_url}`
    } else if (settings.favicon_url.startsWith('/')) {
      // Other absolute paths - use siteUrl for frontend static resources
      faviconUrl = `${siteUrl}${settings.favicon_url}`
    } else {
      // Relative path - assume it's from uploads (use baseUrl for API)
      faviconUrl = `${baseUrl}/uploads/${settings.favicon_url}`
    }
    
    // Detect favicon type from extension
    if (settings.favicon_url.toLowerCase().includes('.ico')) {
      faviconType = 'image/x-icon'
    } else if (settings.favicon_url.toLowerCase().includes('.svg')) {
      faviconType = 'image/svg+xml'
    } else if (settings.favicon_url.toLowerCase().includes('.jpg') || settings.favicon_url.toLowerCase().includes('.jpeg')) {
      faviconType = 'image/jpeg'
    }
  } else {
    // Fallback to default favicon - use siteUrl for frontend static files
    faviconUrl = `${siteUrl}/kuno.png`
  }
  
  // Comprehensive icon metadata to override all browser defaults
  metadata.icons = {
    icon: [
      { url: faviconUrl, sizes: '16x16', type: faviconType },
      { url: faviconUrl, sizes: '32x32', type: faviconType },
      { url: faviconUrl, sizes: '48x48', type: faviconType },
      { url: faviconUrl, sizes: '64x64', type: faviconType },
    ],
    shortcut: faviconUrl,
    apple: [
      { url: faviconUrl, sizes: '180x180', type: faviconType },
    ],
    other: [
      {
        rel: 'icon',
        url: faviconUrl,
        type: faviconType,
      },
      {
        rel: 'shortcut icon',
        url: faviconUrl,
        type: faviconType,
      },
    ],
  }

  return metadata
}

/**
 * Generate basic metadata without locale dependency (for client components or simple pages)
 */
export async function generateBasicMetadata(options: {
  title?: string
  description?: string
}): Promise<Metadata> {
  const baseUrl = getBaseUrl() // For API calls
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

  // Add favicon with comprehensive icon definitions to prevent browser defaults
  let faviconUrl: string
  let faviconType: string = 'image/png'
  
  if (settings?.favicon_url) {
    // Handle custom favicon from settings
    if (settings.favicon_url.startsWith('http')) {
      faviconUrl = settings.favicon_url
    } else if (settings.favicon_url.startsWith('/api/uploads/') || settings.favicon_url.startsWith('/uploads/')) {
      // API uploads path - use baseUrl for backend resources
      faviconUrl = `${baseUrl}${settings.favicon_url}`
    } else if (settings.favicon_url.startsWith('/')) {
      // Other absolute paths - use siteUrl for frontend static resources
      faviconUrl = `${siteUrl}${settings.favicon_url}`
    } else {
      // Relative path - assume it's from uploads (use baseUrl for API)
      faviconUrl = `${baseUrl}/uploads/${settings.favicon_url}`
    }
    
    // Detect favicon type from extension
    if (settings.favicon_url.toLowerCase().includes('.ico')) {
      faviconType = 'image/x-icon'
    } else if (settings.favicon_url.toLowerCase().includes('.svg')) {
      faviconType = 'image/svg+xml'
    } else if (settings.favicon_url.toLowerCase().includes('.jpg') || settings.favicon_url.toLowerCase().includes('.jpeg')) {
      faviconType = 'image/jpeg'
    }
  } else {
    // Fallback to default favicon - use siteUrl for frontend static files
    faviconUrl = `${siteUrl}/kuno.png`
  }
  
  // Comprehensive icon metadata to override all browser defaults
  metadata.icons = {
    icon: [
      { url: faviconUrl, sizes: '16x16', type: faviconType },
      { url: faviconUrl, sizes: '32x32', type: faviconType },
      { url: faviconUrl, sizes: '48x48', type: faviconType },
      { url: faviconUrl, sizes: '64x64', type: faviconType },
    ],
    shortcut: faviconUrl,
    apple: [
      { url: faviconUrl, sizes: '180x180', type: faviconType },
    ],
    other: [
      {
        rel: 'icon',
        url: faviconUrl,
        type: faviconType,
      },
      {
        rel: 'shortcut icon',
        url: faviconUrl,
        type: faviconType,
      },
    ],
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