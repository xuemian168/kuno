'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { notFound } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Tag, Eye, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer'
import { apiClient, Article, SiteSettings } from '@/lib/api'
import { ArticleStructuredData, BreadcrumbStructuredData } from '@/components/seo/structured-data'
import { getBaseUrl, getSiteUrl } from '@/lib/utils'
import EmbedCodeGenerator from '@/components/embed-code-generator'
import SocialShare from '@/components/social-share'
import ShareBar from '@/components/share-bar'
import { useAuth } from '@/contexts/auth-context'
import { Link } from '@/i18n/routing'

interface ArticlePageClientProps {
  id: string
  locale: string
  initialArticle?: Article
  initialSettings?: SiteSettings
}

export default function ArticlePageClient({ 
  id, 
  locale, 
  initialArticle, 
  initialSettings 
}: ArticlePageClientProps) {
  const t = useTranslations()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [article, setArticle] = useState<Article | null>(initialArticle || null)
  const [loading, setLoading] = useState(!initialArticle)
  const [error, setError] = useState('')
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(initialSettings || null)

  useEffect(() => {
    // If we have initial data, skip client-side fetching
    if (initialArticle && initialSettings) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        
        const promises: Promise<any>[] = []
        
        if (!initialArticle) {
          promises.push(apiClient.getArticle(parseInt(id), locale).then(data => ({ type: 'article', data })))
        }
        if (!initialSettings) {
          promises.push(apiClient.getSettings({ lang: locale }).then(data => ({ type: 'settings', data })))
        }
        
        const results = await Promise.all(promises)
        
        for (const result of results) {
          if (result.type === 'article') {
            setArticle(result.data)
          } else if (result.type === 'settings') {
            setSiteSettings(result.data)
          }
        }
        
      } catch (err) {
        console.error('Failed to fetch article:', err)
        // If it's a 404 error (article not found), trigger the 404 page
        if (err instanceof Error && (err.message.includes('404') || err.message.includes('Not Found'))) {
          notFound()
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch article')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, locale, initialArticle, initialSettings])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    )
  }

  if (error || !article) {
    // If we have an error or no article, trigger 404 page
    notFound()
  }

  const siteUrl = getSiteUrl()
  // Use default locale from routing config
  const defaultLocale = 'zh' // Default locale from routing config
  const articleUrl = locale === defaultLocale 
    ? `${siteUrl}/article/${id}` 
    : `${siteUrl}/${locale}/article/${id}`
  const homeUrl = locale === defaultLocale ? siteUrl : `${siteUrl}/${locale}`

  const breadcrumbItems = [
    { name: t('nav.home'), url: homeUrl },
    { name: article.title, url: articleUrl }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ArticleStructuredData
        title={article.title}
        description={article.summary || ''}
        url={articleUrl}
        datePublished={article.created_at}
        dateModified={article.updated_at}
        author={siteSettings?.site_title || t('site.title')}
        locale={locale}
        content={article.content}
      />
      <BreadcrumbStructuredData items={breadcrumbItems} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Back Button and Share Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
            <div className="flex items-center gap-2">
              {/* Admin Edit Button */}
              {isAuthenticated && user && (
                <Link href={`/admin/articles/${id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    {locale === 'zh' ? '编辑文章' : 'Edit Article'}
                  </Button>
                </Link>
              )}
              <SocialShare 
                url={articleUrl} 
                title={article.title} 
                description={article.summary || ''} 
              />
              <EmbedCodeGenerator articleId={id} articleTitle={article.title} />
            </div>
          </div>

          {/* Article Header */}
          <header className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(article.created_at)}
              </div>
              {article.view_count !== undefined && siteSettings?.show_view_count !== false && (
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {article.view_count} {t('article.views')}
                </div>
              )}
              <Badge variant="secondary">{article.category.name}</Badge>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {article.title}
            </h1>
            
            {article.summary && (
              <p className="text-xl text-muted-foreground leading-relaxed">
                {article.summary}
              </p>
            )}
            
            {/* Share Bar */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <ShareBar 
                url={articleUrl} 
                title={article.title} 
                description={article.summary || ''} 
              />
            </div>
          </header>

          {/* Article Content */}
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <MarkdownRenderer 
              content={article.content} 
              includeStructuredData={true}
            />
          </article>

          {/* Share Call-to-Action */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center space-y-4">
            <p className="text-lg font-medium">{t('share.enjoyedArticle')}</p>
            <p className="text-sm text-muted-foreground">{t('share.shareWithFriends')}</p>
            <ShareBar 
              url={articleUrl} 
              title={article.title} 
              description={article.summary || ''} 
              className="justify-center"
            />
          </div>

          {/* Article Footer */}
          <footer className="border-t pt-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>{article.category.name}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {formatDate(article.updated_at)}
              </div>
            </div>
          </footer>
        </motion.div>
    </div>
  )
}