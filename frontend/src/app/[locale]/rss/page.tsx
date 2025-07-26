import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import RSSPageClient from './rss-client'

interface RSSPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: RSSPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  let siteTitle = t('site.title')
  let siteDescription = t('site.description')
  let rssTitle = t('rss.rssFeeds')
  const rssDescription = t('rss.rssDescription')
  
  try {
    // Try to fetch site settings
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/settings?lang=${locale}`)
    if (response.ok) {
      const settings = await response.json()
      siteTitle = settings.site_title || siteTitle
      siteDescription = settings.site_subtitle || siteDescription
      rssTitle = `${t('rss.rssFeeds')} - ${siteTitle}`
    }
  } catch (error) {
    console.error('Failed to fetch site settings:', error)
  }
  
  // Generate alternate language links for RSS page
  const languages: Record<string, string> = {}
  const { routing } = await import('@/i18n/routing')
  routing.locales.forEach(loc => {
    languages[loc] = loc === routing.defaultLocale 
      ? `${baseUrl}/rss` 
      : `${baseUrl}/${loc}/rss`
  })

  return {
    title: rssTitle,
    description: rssDescription,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: locale === routing.defaultLocale ? '/rss' : `/${locale}/rss`,
      languages,
    },
    openGraph: {
      title: rssTitle,
      description: rssDescription,
      url: locale === routing.defaultLocale ? `${baseUrl}/rss` : `${baseUrl}/${locale}/rss`,
      siteName: siteTitle,
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: rssTitle,
      description: rssDescription,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function RSSPage({ params }: RSSPageProps) {
  const { locale } = await params
  
  return <RSSPageClient locale={locale} />
}