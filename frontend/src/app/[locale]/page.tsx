import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import HomePageClient from './home-client'
import { generatePageMetadata } from '@/lib/metadata-utils'
import { apiClient } from '@/lib/api'

// Enable ISR for homepage - revalidate every 30 minutes
export const revalidate = 1800

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  
  // Use the home title as a custom title
  const homeTitle = t('nav.home')
  
  return generatePageMetadata({
    locale,
    title: homeTitle,
    canonical: '/',
    includeRSS: true,
    robots: {
      index: true,
      follow: true,
    }
  })
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  
  try {
    // Pre-fetch data on server side for SSG
    const [articles, categories, settings] = await Promise.all([
      apiClient.getArticles({ lang: locale }),
      apiClient.getCategories({ lang: locale }),
      apiClient.getSettings({ lang: locale })
    ])

    return (
      <HomePageClient 
        locale={locale}
        initialArticles={articles}
        initialCategories={categories}
        initialSettings={settings}
      />
    )
  } catch (error) {
    console.error('[SSG] Failed to pre-fetch homepage data:', error)
    // Fallback to client-side rendering on error
    return <HomePageClient locale={locale} />
  }
}