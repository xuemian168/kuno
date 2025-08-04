import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import RSSPageClient from './rss-client'
import { generatePageMetadata } from '@/lib/metadata-utils'

interface RSSPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: RSSPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  
  const rssTitle = t('rss.rssFeeds')
  const rssDescription = t('rss.rssDescription')

  return generatePageMetadata({
    locale,
    title: rssTitle,
    description: rssDescription,
    canonical: '/rss',
    includeRSS: true,
    robots: {
      index: true,
      follow: true,
    }
  })
}

export default async function RSSPage({ params }: RSSPageProps) {
  const { locale } = await params
  
  return <RSSPageClient locale={locale} />
}