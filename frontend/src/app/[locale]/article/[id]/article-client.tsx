'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { apiClient, Article } from '@/lib/api'
import { ArticleStructuredData, BreadcrumbStructuredData } from '@/components/seo/structured-data'

interface ArticlePageClientProps {
  id: string
  locale: string
}

export default function ArticlePageClient({ id, locale }: ArticlePageClientProps) {
  const t = useTranslations()
  const router = useRouter()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [siteSettings, setSiteSettings] = useState<{ site_title: string; site_subtitle: string } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [articleData, settingsData] = await Promise.all([
          apiClient.getArticle(parseInt(id), locale),
          apiClient.getSettings({ lang: locale })
        ])
        setArticle(articleData)
        setSiteSettings(settingsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch article')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, locale])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">{t('common.loading')}</div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center text-red-500">{error || 'Article not found'}</div>
        </main>
        <Footer />
      </div>
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const articleUrl = locale === 'zh' 
    ? `${baseUrl}/article/${id}` 
    : `${baseUrl}/${locale}/article/${id}`
  const homeUrl = locale === 'zh' ? baseUrl : `${baseUrl}/${locale}`

  const breadcrumbItems = [
    { name: t('nav.home'), url: homeUrl },
    { name: article.title, url: articleUrl }
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Back Button */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
          </div>

          {/* Article Header */}
          <header className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(article.created_at)}
              </div>
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
          </header>

          {/* Article Content */}
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <MarkdownRenderer 
              content={article.content} 
              includeStructuredData={true}
            />
          </article>

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
      </main>
      
      <Footer />
    </div>
  )
}