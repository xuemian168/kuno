import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import HomePageClient from './home-client'
import { generatePageMetadata } from '@/lib/metadata-utils'

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
  
  return <HomePageClient locale={locale} />
}