import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import ArticlePageClient from './article-client'
import { apiClient } from '@/lib/api'
import { generateArticleMetadata } from '@/lib/metadata-utils'

interface ArticlePageProps {
  params: Promise<{ id: string; locale: string }>
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
  
  // Pre-check if article exists on server side for better SEO and performance
  try {
    await apiClient.getArticle(parseInt(id), locale)
  } catch (error) {
    // If article doesn't exist, show 404 page
    if (error instanceof Error && error.message.includes('404')) {
      notFound()
    }
  }
  
  return <ArticlePageClient id={id} locale={locale} />
}