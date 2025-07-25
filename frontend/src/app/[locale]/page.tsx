import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import HomePageClient from './home-client'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  let siteTitle = t('site.title')
  let siteDescription = t('site.description')
  let homeTitle = t('site.homeTitle')
  
  try {
    // Try to fetch site settings
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/settings?lang=${locale}`)
    if (response.ok) {
      const settings = await response.json()
      siteTitle = settings.site_title || siteTitle
      siteDescription = settings.site_subtitle || siteDescription
      homeTitle = `${t('nav.home')} - ${siteTitle}`
    }
  } catch (error) {
    console.error('Failed to fetch site settings:', error)
  }
  
  // Generate alternate language links for home page
  const languages: Record<string, string> = {}
  const { routing } = await import('@/i18n/routing')
  routing.locales.forEach(loc => {
    languages[loc] = loc === routing.defaultLocale 
      ? `${baseUrl}/` 
      : `${baseUrl}/${loc}/`
  })
  
  return {
    title: homeTitle,
    description: siteDescription,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: locale === routing.defaultLocale ? '/' : `/${locale}/`,
      languages,
    },
    openGraph: {
      title: homeTitle,
      description: siteDescription,
      url: locale === routing.defaultLocale ? `${baseUrl}/` : `${baseUrl}/${locale}/`,
      siteName: siteTitle,
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: homeTitle,
      description: siteDescription,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  
  return <HomePageClient locale={locale} />
}