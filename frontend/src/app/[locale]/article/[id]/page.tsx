import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import ArticlePageClient from './article-client'
import { generateArticleMetadata } from '@/lib/metadata-utils'
import { fetchArticle, fetchSettings } from '@/lib/server-api'
import { ArticleStructuredData, BreadcrumbStructuredData } from '@/components/seo/structured-data'
import { getSiteUrl } from '@/lib/config'
import { routing } from '@/i18n/routing'

interface ArticlePageProps {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id, locale } = await params
  const t = await getTranslations({ locale })

  try {
    const article = await fetchArticle(parseInt(id), locale)

    return generateArticleMetadata({
      locale,
      canonical: `/article/${article.seo_slug || id}`,
      article: {
        title: article.title,
        summary: article.summary,
        seo_title: article.seo_title,
        seo_description: article.seo_description,
        cover_image_url: article.cover_image_url,
        cover_image_alt: article.cover_image_alt,
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
        index: false,
        follow: true,
      }
    })
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id, locale } = await params

  // 服务端获取文章数据和设置（SEO 关键：确保初始 HTML 包含完整内容）
  let article, settings
  try {
    ;[article, settings] = await Promise.all([
      fetchArticle(parseInt(id), locale),
      fetchSettings(locale),
    ])
  } catch (error) {
    // 仅 404 显示 notFound 页面，其他错误向上抛出让 Next.js error boundary 处理
    if (error instanceof Error && error.message.includes('404')) {
      notFound()
    }
    throw error
  }

  // 服务端渲染结构化数据
  const siteUrl = getSiteUrl()
  const defaultLocale = routing.defaultLocale
  const articleUrl = locale === defaultLocale
    ? `${siteUrl}/article/${article.seo_slug || id}`
    : `${siteUrl}/${locale}/article/${article.seo_slug || id}`
  const homeUrl = locale === defaultLocale ? siteUrl : `${siteUrl}/${locale}`
  const t = await getTranslations({ locale })

  const breadcrumbItems = [
    { name: t('nav.home'), url: homeUrl },
    { name: article.title, url: articleUrl }
  ]

  return (
    <>
      <ArticleStructuredData
        title={article.title}
        description={article.summary || ''}
        url={articleUrl}
        datePublished={article.created_at}
        dateModified={article.updated_at}
        author={settings?.site_title || 'Blog'}
        locale={locale}
        content={article.content}
      />
      <BreadcrumbStructuredData items={breadcrumbItems} />
      <ArticlePageClient
        id={id}
        locale={locale}
        initialArticle={article}
        initialSettings={settings}
      />
    </>
  )
}