import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import ArticlePageClient from './article-client'
import { apiClient } from '@/lib/api'
import { generateArticleMetadata } from '@/lib/metadata-utils'
import { locales } from '@/i18n/routing'

// Enable ISR - revalidate every hour
export const revalidate = 3600
// Allow dynamic params for articles not pre-generated
export const dynamicParams = true

interface ArticlePageProps {
  params: Promise<{ id: string; locale: string }>
}

// Generate static params for popular articles across all locales
export async function generateStaticParams() {
  try {
    // Get all published article IDs
    const articles = await apiClient.getAllPublishedArticleIds()
    
    // Generate params for the most recent 100 articles across all locales
    // This balances build time with coverage of popular content
    const recentArticles = articles.slice(0, 100)
    
    const params = []
    for (const article of recentArticles) {
      for (const locale of locales) {
        params.push({
          id: article.id.toString(),
          locale: locale
        })
      }
    }
    
    console.log(`[SSG] Generated ${params.length} static params for articles (${recentArticles.length} articles × ${locales.length} locales)`)
    return params
  } catch (error) {
    console.error('[SSG] Failed to generate static params for articles:', error)
    // Return empty array on error to allow build to continue
    return []
  }
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id, locale } = await params
  const t = await getTranslations({ locale })
  
  try {
    const article = await apiClient.getArticle(parseInt(id), locale)
    
    return generateArticleMetadata({
      locale,
      canonical: `/article/${id}`,
      article: {
        title: article.title,
        summary: article.summary,
        seo_title: article.seo_title,
        seo_description: article.seo_description,
        created_at: article.created_at,
        updated_at: article.updated_at,
      },
      robots: {
        index: true,
        follow: true,
      }
    })
  } catch (error) {
    const fallbackTitle = t('site.articleTitle')
    
    return generateArticleMetadata({
      locale,
      title: fallbackTitle,
      canonical: `/article/${id}`,
      robots: {
        index: false, // Don't index if article can't be found
        follow: true,
      }
    })
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id, locale } = await params
  
  try {
    // Pre-fetch data on server side for SSG
    const [article, settings] = await Promise.all([
      apiClient.getArticle(parseInt(id), locale),
      apiClient.getSettings({ lang: locale })
    ])
    
    return (
      <ArticlePageClient 
        id={id} 
        locale={locale}
        initialArticle={article}
        initialSettings={settings}
      />
    )
  } catch (error) {
    console.error('[SSG] Failed to pre-fetch article data:', error)
    
    // If article doesn't exist, show 404 page
    if (error instanceof Error && error.message.includes('404')) {
      notFound()
    }
    
    // Fallback to client-side rendering on other errors
    return <ArticlePageClient id={id} locale={locale} />
  }
}