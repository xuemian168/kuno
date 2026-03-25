'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Tag, Eye, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer'
import { TableOfContents } from '@/components/table-of-contents'
import { generateTocFromMarkdown } from '@/lib/markdown-utils'
import { apiClient, Article, SiteSettings } from '@/lib/api'
import { getSiteUrl } from '@/lib/utils'
import EmbedCodeGenerator from '@/components/embed-code-generator'
import SocialShare from '@/components/social-share'
import ShareBar from '@/components/share-bar'
import { useAuth } from '@/contexts/auth-context'
import { Link, routing } from '@/i18n/routing'
import { useDynamicTheme } from '@/contexts/dynamic-theme-context'
import { RelatedArticles } from '@/components/related-articles'

interface ArticlePageClientProps {
  id: string
  locale: string
  initialArticle: Article
  initialSettings: SiteSettings | null
}

export default function ArticlePageClient({ id, locale, initialArticle, initialSettings }: ArticlePageClientProps) {
  const t = useTranslations()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const { analysisResult, isDynamicThemeActive } = useDynamicTheme()
  const [article] = useState<Article>(initialArticle)
  const [siteSettings] = useState<{ site_title: string; site_subtitle: string; show_view_count?: boolean } | null>(initialSettings)
  const [tocItems] = useState<any[]>(() => {
    if (initialArticle?.content) {
      return generateTocFromMarkdown(initialArticle.content)
    }
    return []
  })

  // Behavior tracking state
  const [startTime] = useState(() => typeof window !== 'undefined' ? Date.now() : 0)
  const [isVisible, setIsVisible] = useState(true)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const visibilityTimeRef = useRef(0)
  const lastVisibilityTimeRef = useRef(typeof window !== 'undefined' ? Date.now() : 0)

  // Mount effect to ensure client-side only operations
  useEffect(() => {
    setIsMounted(true)
    lastVisibilityTimeRef.current = Date.now()
  }, [])

  // Behavior tracking effects
  useEffect(() => {
    if (!article || !isMounted) return

    // Track initial view after article loads
    const trackView = async () => {
      if (hasTrackedView) return
      
      try {
        // Generate or get user session ID for tracking
        let sessionId = localStorage.getItem('userSessionId')
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          localStorage.setItem('userSessionId', sessionId)
        }

        await apiClient.trackUserBehavior({
          session_id: sessionId,
          article_id: parseInt(id),
          interaction_type: 'view',
          reading_time: 0,
          scroll_depth: 0,
          device_info: {
            device_type: /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other',
            os: navigator.platform,
            screen_size: `${window.screen.width}x${window.screen.height}`,
            user_agent: navigator.userAgent
          },
          language: locale
        })
        
        setHasTrackedView(true)
      } catch (error) {
        console.error('Error tracking article view:', error)
      }
    }

    // Delay tracking to ensure it's an intentional view
    const trackingTimeout = setTimeout(trackView, 1000)
    return () => clearTimeout(trackingTimeout)
  }, [article, id, locale, hasTrackedView, isMounted])

  // Track reading time and page visibility
  useEffect(() => {
    if (!article || !hasTrackedView || !isMounted) return

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return
      
      const now = Date.now()
      
      if (document.hidden) {
        // Page became hidden, add to visibility time
        if (isVisible) {
          visibilityTimeRef.current += now - lastVisibilityTimeRef.current
          setIsVisible(false)
        }
      } else {
        // Page became visible
        if (!isVisible) {
          lastVisibilityTimeRef.current = now
          setIsVisible(true)
        }
      }
    }

    const handleBeforeUnload = async () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return
      
      const now = Date.now()
      const totalTime = visibilityTimeRef.current + (isVisible ? now - lastVisibilityTimeRef.current : 0)
      const readingTime = Math.round(totalTime / 1000) // Convert to seconds

      if (readingTime > 5) { // Only track if user spent more than 5 seconds
        try {
          const sessionId = localStorage.getItem('userSessionId')
          if (sessionId) {
            // Calculate scroll depth safely
            const scrollDepth = document.body && window.scrollY !== undefined
              ? Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
              : 0
            
            // Track reading time using the API client
            await apiClient.trackUserBehavior({
              session_id: sessionId,
              article_id: parseInt(id),
              interaction_type: 'view',
              reading_time: readingTime,
              scroll_depth: scrollDepth,
              device_info: {
                device_type: /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other',
                os: navigator.platform,
                screen_size: `${window.screen.width}x${window.screen.height}`,
                user_agent: navigator.userAgent
              },
              language: locale
            })
          }
        } catch (error) {
          console.error('Error tracking reading time:', error)
        }
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
      
      // Also track on component unmount
      handleBeforeUnload()
    }
  }, [article, hasTrackedView, id, locale, startTime, isVisible, isMounted])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const siteUrl = getSiteUrl()
  const defaultLocale = routing.defaultLocale
  const articleUrl = locale === defaultLocale
    ? `${siteUrl}/article/${article.seo_slug || id}`
    : `${siteUrl}/${locale}/article/${article.seo_slug || id}`

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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
          <div className={`enhanced-article-header ${isDynamicThemeActive && analysisResult ? 'dynamic-theme-active' : ''}`}>
            <div className="enhanced-article-header-content">
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
                <div className="pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                  <ShareBar 
                    url={articleUrl} 
                    title={article.title} 
                    description={article.summary || ''} 
                  />
                </div>
              </header>
            </div>
          </div>

          {/* Article Content */}
          <div className={`enhanced-article-container ${isDynamicThemeActive && analysisResult ? 'dynamic-theme-active' : ''}`}>
            <div className="enhanced-article-content">
              <article className="prose prose-lg dark:prose-invert max-w-none">
                <MarkdownRenderer 
                  content={article.content} 
                  includeStructuredData={true}
                />
              </article>
            </div>
          </div>
          
          {/* Table of Contents - Floating/Fixed position */}
          {tocItems && tocItems.length > 0 && (
            <TableOfContents tocItems={tocItems} />
          )}

          {/* Share Call-to-Action */}
          <div className={`enhanced-article-container ${isDynamicThemeActive && analysisResult ? 'dynamic-theme-active' : ''}`}>
            <div className="enhanced-article-content text-center space-y-4">
              <p className="text-lg font-medium">{t('share.enjoyedArticle')}</p>
              <p className="text-sm text-muted-foreground">{t('share.shareWithFriends')}</p>
              <ShareBar 
                url={articleUrl} 
                title={article?.title || ''} 
                description={article?.summary || ''} 
                className="justify-center"
              />
            </div>
          </div>

          {/* Article Footer */}
          <footer className="border-t pt-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>{article?.category?.name || ''}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {article?.updated_at ? formatDate(article.updated_at) : ''}
              </div>
            </div>
          </footer>

          {/* Related Articles Section */}
          <div className="border-t pt-8">
            <RelatedArticles 
              articleId={parseInt(id)}
              currentTitle={article?.title || ''}
              maxItems={6}
              enableSemanticSearch={true}
            />
          </div>
        </motion.div>
    </div>
  )
}