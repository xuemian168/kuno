'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Calendar, Sparkles, AlertCircle } from 'lucide-react'
import { apiClient, EmbeddingSearchResult } from '@/lib/api'
import Link from 'next/link'
import { useClientLocale } from '@/hooks/useClientLocale'

interface RelatedArticlesProps {
  articleId: number
  currentTitle: string
  maxItems?: number
  enableSemanticSearch?: boolean
  className?: string
}

export function RelatedArticles({ 
  articleId, 
  currentTitle, 
  maxItems = 5, 
  enableSemanticSearch = true,
  className = ''
}: RelatedArticlesProps) {
  const [relatedArticles, setRelatedArticles] = useState<EmbeddingSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ragAvailable, setRagAvailable] = useState<boolean | null>(null)
  const { currentLocale } = useClientLocale()

  useEffect(() => {
    checkRAGAvailability()
  }, [])

  useEffect(() => {
    if (enableSemanticSearch && articleId && ragAvailable) {
      fetchRelatedArticles()
    }
  }, [articleId, currentLocale, enableSemanticSearch, ragAvailable])

  const checkRAGAvailability = async () => {
    try {
      const status = await apiClient.getRAGServiceStatus()
      setRagAvailable(status.rag_enabled)
    } catch (err) {
      console.error('Error checking RAG availability:', err)
      setRagAvailable(false)
    }
  }

  const fetchRelatedArticles = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getSimilarArticles(articleId, {
        language: currentLocale,
        limit: maxItems
      })
      
      setRelatedArticles(response.results || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch related articles'
      setError(errorMessage)
      console.error('Error fetching related articles:', err)
    } finally {
      setLoading(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(currentLocale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Truncate text
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  // Don't render if semantic search is disabled or RAG is not available
  if (!enableSemanticSearch || ragAvailable === false) {
    return null
  }

  // Show loading while checking RAG availability
  if (ragAvailable === null) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {currentLocale === 'zh' ? '相关文章' : 'Related Articles'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {currentLocale === 'zh' ? '正在检查服务状态...' : 'Checking service availability...'}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Don't render if loading and no previous results
  if (loading && relatedArticles.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {currentLocale === 'zh' ? '相关文章' : 'Related Articles'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: maxItems }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Don't render if error and no previous results
  if (error && relatedArticles.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {currentLocale === 'zh' ? '相关文章' : 'Related Articles'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertCircle className="h-4 w-4" />
            {currentLocale === 'zh' ? '暂时无法加载相关文章' : 'Unable to load related articles'}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Don't render if no results
  if (!loading && relatedArticles.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {currentLocale === 'zh' ? '相关文章' : 'Related Articles'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {currentLocale === 'zh' 
            ? '基于AI语义分析推荐的相关内容' 
            : 'AI-powered content recommendations based on semantic analysis'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {relatedArticles && relatedArticles.length > 0 && relatedArticles.map((article, index) => (
          <div key={article.article_id} className="group">
            <Link 
              href={`/${currentLocale}/article/${article.article_id}`}
              className="block space-y-2 p-3 rounded-lg border transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-sm leading-tight group-hover:text-primary line-clamp-2">
                  {article?.title || ''}
                </h4>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {Math.round((article?.similarity || 0) * 100)}%
                  </Badge>
                </div>
              </div>
              
              {article?.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {truncateText(article.summary, 120)}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {article?.created_at ? formatDate(article.created_at) : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {article?.view_count || 0}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {article?.category_name || ''}
                </Badge>
              </div>
            </Link>
          </div>
        ))}
        
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}
        
        {relatedArticles.length === 0 && !loading && (
          <div className="text-center text-sm text-muted-foreground py-4">
            {currentLocale === 'zh' ? '暂无相关文章' : 'No related articles found'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Hook for fetching related articles data
export function useRelatedArticles(articleId: number, options?: {
  language?: string
  limit?: number
  enabled?: boolean
}) {
  const [relatedArticles, setRelatedArticles] = useState<EmbeddingSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentLocale } = useClientLocale()

  const language = options?.language || currentLocale
  const limit = options?.limit || 5
  const enabled = options?.enabled !== false

  useEffect(() => {
    if (!enabled || !articleId) return

    const fetchRelatedArticles = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await apiClient.getSimilarArticles(articleId, {
          language,
          limit
        })
        
        setRelatedArticles(response.results || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch related articles'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchRelatedArticles()
  }, [articleId, language, limit, enabled])

  return {
    relatedArticles,
    loading,
    error,
    refetch: () => {
      if (enabled && articleId) {
        // Re-trigger the effect
        setRelatedArticles([])
        setError(null)
      }
    }
  }
}

// Skeleton component for loading state
export function RelatedArticlesSkeleton({ maxItems = 5, className = '' }: { maxItems?: number, className?: string }) {
  const { currentLocale } = useClientLocale()
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {currentLocale === 'zh' ? '相关文章' : 'Related Articles'}
        </CardTitle>
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: maxItems }).map((_, index) => (
          <div key={index} className="space-y-2 p-3 border rounded-lg">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}