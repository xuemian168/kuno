'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Eye, Clock, Sparkles, TrendingUp, Users } from 'lucide-react'
import { apiClient, RecommendationResult } from '@/lib/api'
import { getDeviceInfo } from '@/lib/device-utils'

interface PersonalizedRecommendationsProps {
  language?: string
  userId?: string
  maxRecommendations?: number
  showReason?: boolean
  className?: string
  excludeArticleId?: number
  title?: string
}

const PersonalizedRecommendations: React.FC<PersonalizedRecommendationsProps> = ({
  language = 'zh',
  userId,
  maxRecommendations = 5,
  showReason = true,
  className = '',
  excludeArticleId,
  title
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [ragAvailable, setRagAvailable] = useState<boolean | null>(null)

  // Check RAG availability
  const checkRAGAvailability = useCallback(async () => {
    try {
      const status = await apiClient.getRAGServiceStatus()
      setRagAvailable(status.rag_enabled)
    } catch (err) {
      console.error('Error checking RAG availability:', err)
      setRagAvailable(false)
    }
  }, [])

  // Generate a session-based user ID if none provided
  const getSessionUserId = useCallback(() => {
    if (userId) return userId
    
    if (typeof window === 'undefined') return `ssr_session_${Date.now()}`
    
    // Try to get from localStorage first
    let sessionUserId = localStorage.getItem('session_user_id')
    if (!sessionUserId) {
      // Generate a session-based ID using timestamp and random string
      sessionUserId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      localStorage.setItem('session_user_id', sessionUserId)
    }
    return sessionUserId
  }, [userId])

  const loadRecommendations = useCallback(async () => {
    if (!isMounted || ragAvailable === false) return
    
    try {
      setLoading(true)
      setError(null)
      
      const sessionUserId = getSessionUserId()
      
      const response = await apiClient.getPersonalizedRecommendations({
        user_id: sessionUserId,
        language,
        limit: excludeArticleId ? maxRecommendations + 1 : maxRecommendations, // Request one extra to filter out current article
        exclude_read: true,
        include_reason: showReason,
        diversify: true,
        min_confidence: 0.1
      })
      
      // Filter out the current article if excludeArticleId is provided
      let filteredRecommendations = response.recommendations || []
      if (excludeArticleId && filteredRecommendations.length > 0) {
        filteredRecommendations = filteredRecommendations
          .filter(rec => rec.article.id !== excludeArticleId)
          .slice(0, maxRecommendations)
      }
      
      setRecommendations(filteredRecommendations)
    } catch (err) {
      setError(language === 'zh' ? '加载推荐内容失败' : 'Failed to load recommendations')
      console.error('Failed to load recommendations:', err)
    } finally {
      setLoading(false)
    }
  }, [language, maxRecommendations, showReason, getSessionUserId, excludeArticleId, isMounted, ragAvailable])

  // Track user behavior when viewing an article
  const trackClick = async (articleId: number, recommendationType: string) => {
    try {
      const sessionUserId = getSessionUserId()
      const deviceInfo = getDeviceInfo()
      
      await apiClient.trackUserBehavior({
        session_id: sessionUserId,
        article_id: articleId,
        interaction_type: 'view',
        reading_time: 0, // Will be tracked when actually reading
        scroll_depth: 0,
        device_info: {
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          screen_size: deviceInfo.screenSize,
          user_agent: deviceInfo.userAgent
        },
        language
      })
    } catch (err) {
      console.error('Failed to track behavior:', err)
    }
  }


  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'content_based': return <Sparkles className="h-4 w-4" />
      case 'collaborative': return <Users className="h-4 w-4" />
      case 'trending': return <TrendingUp className="h-4 w-4" />
      case 'serendipity': return <Eye className="h-4 w-4" />
      default: return <Sparkles className="h-4 w-4" />
    }
  }

  const getRecommendationLabel = (type: string) => {
    const labels = {
      zh: {
        content_based: '相似内容',
        collaborative: '协同推荐',
        trending: '热门推荐',
        serendipity: '探索发现',
        default: '智能推荐'
      },
      en: {
        content_based: 'Similar Content',
        collaborative: 'Collaborative',
        trending: 'Trending',
        serendipity: 'Discovery',
        default: 'Smart Recommendation'
      }
    }
    const langLabels = labels[language as keyof typeof labels] || labels.zh
    return langLabels[type as keyof typeof langLabels] || langLabels.default
  }

  const formatReadingTime = (content: string): string => {
    const wordsPerMinute = 200 // Average reading speed
    const wordCount = content.split(/\s+/).length
    const minutes = Math.ceil(wordCount / wordsPerMinute)
    return language === 'zh' ? `${minutes} 分钟阅读` : `${minutes} min read`
  }

  const getTexts = () => {
    const texts = {
      zh: {
        title: title || '为您推荐',
        loading: '正在为您智能推荐...',
        error: '加载推荐内容失败',
        retry: '重试',
        noContent: '暂无推荐内容',
        refresh: '刷新推荐',
        reasonPrefix: '推荐理由：',
        match: '匹配'
      },
      en: {
        title: title || 'Recommended for You',
        loading: 'Loading smart recommendations...',
        error: 'Failed to load recommendations',
        retry: 'Retry',
        noContent: 'No recommendations available',
        refresh: 'Refresh Recommendations',
        reasonPrefix: 'Reason: ',
        match: 'match'
      }
    }
    return texts[language as keyof typeof texts] || texts.zh
  }

  // Mount effect
  useEffect(() => {
    setIsMounted(true)
    checkRAGAvailability()
  }, [checkRAGAvailability])

  useEffect(() => {
    if (isMounted && ragAvailable === true) {
      loadRecommendations()
    }
  }, [loadRecommendations, isMounted, ragAvailable])

  const texts = getTexts()

  // Don't render if RAG is not available
  if (ragAvailable === false) {
    return null
  }

  // Show loading while checking RAG availability
  if (ragAvailable === null) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {texts.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>{language === 'zh' ? '正在检查服务状态...' : 'Checking service availability...'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {texts.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>{texts.loading}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {texts.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-500 mb-2">{texts.error}</p>
            <Button variant="outline" size="sm" onClick={loadRecommendations}>
              {texts.retry}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {texts.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-500">{texts.noContent}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {texts.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations && recommendations.length > 0 && recommendations.map((recommendation, index) => (
          <div
            key={recommendation?.article?.id || index}
            className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer"
            onClick={() => {
              if (recommendation?.article?.id) {
                trackClick(recommendation.article.id, recommendation.recommendation_type)
                window.location.href = `/${language}/article/${recommendation.article.id}`
              }
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getRecommendationIcon(recommendation.recommendation_type)}
                  <span className="ml-1">{getRecommendationLabel(recommendation.recommendation_type)}</span>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {Math.round((recommendation?.confidence || 0) * 100)}% {texts.match}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">#{index + 1}</span>
            </div>
            
            <h3 className="font-semibold text-lg mb-2 hover:text-blue-600 transition-colors">
              {recommendation?.article?.title || ''}
            </h3>
            
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {recommendation?.article?.summary || ''}
            </p>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {recommendation?.article?.view_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {recommendation?.article?.content ? formatReadingTime(recommendation.article.content) : '0 min'}
                </span>
                <span>{recommendation?.article?.category?.name || ''}</span>
              </div>
            </div>
            
            {showReason && recommendation.reason_details && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                <strong>{texts.reasonPrefix}</strong>{recommendation.reason_details}
              </div>
            )}
          </div>
        ))}
        
        <div className="text-center pt-2">
          <Button variant="outline" size="sm" onClick={loadRecommendations}>
            {texts.refresh}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PersonalizedRecommendations