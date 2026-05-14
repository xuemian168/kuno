import type { Metadata } from "next";
import HomePageClient from './home-client'
import { generatePageMetadata } from '@/lib/metadata-utils'
import { fetchArticles, fetchCategories, fetchSettings } from '@/lib/server-api'
import type { Article, Category, SiteSettings } from '@/lib/api'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params

  return generatePageMetadata({
    locale,
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

  // 服务端获取数据，确保初始 HTML 包含文章内容（SEO 关键）
  let initialArticles: Article[] = []
  let initialCategories: Category[] = []
  let initialSettings: SiteSettings | null = null
  try {
    ;[initialArticles, initialCategories, initialSettings] = await Promise.all([
      fetchArticles(locale),
      fetchCategories(locale),
      fetchSettings(locale),
    ])
  } catch (error) {
    console.error('Failed to fetch initial data:', error)
  }

  return (
    <HomePageClient
      locale={locale}
      initialArticles={initialArticles}
      initialCategories={initialCategories}
      initialSettings={initialSettings}
    />
  )
}
