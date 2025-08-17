'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Users, TrendingUp, Eye, Clock, Target, Brain, BarChart3 } from 'lucide-react'
import { apiClient, RecommendationResult, UserProfile, ReadingPatterns, RecommendationAnalytics } from '@/lib/api'
import UserList from './user-list'

interface RecommendationManagerProps {
  language?: string
}

const RecommendationManager: React.FC<RecommendationManagerProps> = ({ language = 'en' }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popularContent, setPopularContent] = useState<RecommendationResult[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [readingPatterns, setReadingPatterns] = useState<ReadingPatterns | null>(null)
  const [analytics, setAnalytics] = useState<RecommendationAnalytics | null>(null)
  const [similarUsers, setSimilarUsers] = useState<string[]>([])

  // Multilingual text helper
  const t = (key: string): string => {
    const texts: Record<string, Record<string, string>> = {
      title: {
        zh: '个性化推荐系统',
        en: 'Personalized Recommendation System',
        ja: 'パーソナライズド推薦システム'
      },
      subtitle: {
        zh: '管理和分析用户行为，优化内容推荐',
        en: 'Manage and analyze user behavior, optimize content recommendations',
        ja: 'ユーザー行動を管理・分析し、コンテンツ推薦を最適化'
      },
      refreshData: {
        zh: '刷新数据',
        en: 'Refresh Data',
        ja: 'データを更新'
      },
      overview: {
        zh: '概览',
        en: 'Overview',
        ja: '概要'
      },
      popularContent: {
        zh: '热门内容',
        en: 'Popular Content',
        ja: '人気コンテンツ'
      },
      userAnalysis: {
        zh: '用户分析',
        en: 'User Analysis',
        ja: 'ユーザー分析'
      },
      analyticsReport: {
        zh: '分析报告',
        en: 'Analytics Report',
        ja: '分析レポート'
      },
      systemStatus: {
        zh: '推荐系统状态',
        en: 'Recommendation System Status',
        ja: '推薦システム状態'
      },
      running: {
        zh: '运行中',
        en: 'Running',
        ja: '稼働中'
      },
      multiAlgorithm: {
        zh: '多算法智能推荐',
        en: 'Multi-algorithm intelligent recommendations',
        ja: 'マルチアルゴリズム知能推薦'
      },
      trendingContent7Days: {
        zh: '过去7天的趋势内容',
        en: 'Trending content from past 7 days',
        ja: '過去7日間のトレンドコンテンツ'
      },
      algorithms: {
        zh: '推荐算法',
        en: 'Recommendation Algorithms',
        ja: '推薦アルゴリズム'
      },
      algorithmTypes: {
        zh: '内容、协同、趋势、探索',
        en: 'Content, Collaborative, Trending, Discovery',
        ja: 'コンテンツ、協調、トレンド、発見'
      },
      cacheEfficiency: {
        zh: '缓存效率',
        en: 'Cache Efficiency',
        ja: 'キャッシュ効率'
      },
      efficient: {
        zh: '高效',
        en: 'Efficient',
        ja: '効率的'
      },
      threeTierCache: {
        zh: '三层缓存系统',
        en: 'Three-tier cache system',
        ja: '3層キャッシュシステム'
      },
      systemOverview: {
        zh: '系统概述',
        en: 'System Overview',
        ja: 'システム概要'
      },
      systemDescription: {
        zh: '个性化推荐系统通过分析用户行为、文章内容和社交信号，为每个用户提供最相关的内容推荐。',
        en: 'The personalized recommendation system analyzes user behavior, article content, and social signals to provide the most relevant content recommendations for each user.',
        ja: 'パーソナライズド推薦システムは、ユーザーの行動、記事コンテンツ、ソーシャルシグナルを分析し、各ユーザーに最も関連性の高いコンテンツ推薦を提供します。'
      },
      recommendationAlgorithms: {
        zh: '推荐算法',
        en: 'Recommendation Algorithms',
        ja: '推薦アルゴリズム'
      },
      dataSources: {
        zh: '数据源',
        en: 'Data Sources',
        ja: 'データソース'
      },
      popularRecommendations: {
        zh: '热门推荐内容',
        en: 'Popular Recommended Content',
        ja: '人気推薦コンテンツ'
      },
      popularDescription: {
        zh: '基于用户互动和阅读数据的趋势内容，按推荐置信度排序',
        en: 'Trending content based on user interaction and reading data, sorted by recommendation confidence',
        ja: 'ユーザーのインタラクションと読み取りデータに基づいたトレンドコンテンツ、推薦信頼度順にソート'
      },
      userBehaviorAnalysis: {
        zh: '用户行为分析',
        en: 'User Behavior Analysis',
        ja: 'ユーザー行動分析'
      },
      recommendationEffectAnalysis: {
        zh: '推荐效果分析',
        en: 'Recommendation Effect Analysis',
        ja: '推薦効果分析'
      }
    }
    
    return texts[key]?.[language] || texts[key]?.['en'] || key
  }

  // Load popular content on component mount
  useEffect(() => {
    loadPopularContent()
  }, [language])

  const loadPopularContent = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getPopularContent({
        language,
        limit: 10,
        days: 7
      })
      setPopularContent(response.popular_content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load popular content')
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (userId: string) => {
    if (!userId.trim()) return
    
    try {
      setLoading(true)
      setError(null)
      
      const [profileResponse, patternsResponse, analyticsResponse, similarResponse] = await Promise.allSettled([
        apiClient.getUserProfile(userId),
        apiClient.getUserReadingPatterns(userId, 30),
        apiClient.getRecommendationAnalytics(userId, 30),
        apiClient.getSimilarUsers(userId, 5)
      ])

      if (profileResponse.status === 'fulfilled') {
        setUserProfile(profileResponse.value.profile)
      } else {
        console.warn('Failed to load user profile:', profileResponse.reason)
      }

      if (patternsResponse.status === 'fulfilled') {
        setReadingPatterns(patternsResponse.value.patterns)
      } else {
        console.warn('Failed to load reading patterns:', patternsResponse.reason)
      }

      if (analyticsResponse.status === 'fulfilled') {
        setAnalytics(analyticsResponse.value.analytics)
      } else {
        console.warn('Failed to load analytics:', analyticsResponse.reason)
      }

      if (similarResponse.status === 'fulfilled') {
        setSimilarUsers(similarResponse.value.similar_users)
      } else {
        console.warn('Failed to load similar users:', similarResponse.reason)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    loadUserProfile(userId)
  }

  const formatReadingTime = (seconds: number): string => {
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.round(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`
  }

  const getRecommendationTypeColor = (type: string): string => {
    switch (type) {
      case 'content_based': return 'bg-blue-100 text-blue-800'
      case 'collaborative': return 'bg-green-100 text-green-800'
      case 'trending': return 'bg-red-100 text-red-800'
      case 'serendipity': return 'bg-purple-100 text-purple-800'
      case 'learning_path': return 'bg-amber-100 text-amber-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRecommendationIcon = (recommendation: RecommendationResult): string => {
    if (recommendation.is_learning_path || recommendation.category === 'learning') {
      return '📚'
    }
    switch (recommendation.recommendation_type) {
      case 'content_based': return '🔗'
      case 'collaborative': return '👥'
      case 'trending': return '🔥'
      case 'serendipity': return '🌟'
      default: return '📄'
    }
  }

  const getRecommendationCategoryLabel = (recommendation: RecommendationResult, language: string): string => {
    if (recommendation.is_learning_path || recommendation.category === 'learning') {
      if (language === 'zh') return '学习路径'
      if (language === 'ja') return '学習パス'
      return 'Learning Path'
    }
    if (language === 'zh') return '智能推荐'
    if (language === 'ja') return 'スマート推薦'
    return 'Discovery'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <Button onClick={loadPopularContent} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('refreshData')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="popular">{t('popularContent')}</TabsTrigger>
          <TabsTrigger value="users">{t('userAnalysis')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('analyticsReport')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('systemStatus')}</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{t('running')}</div>
                <p className="text-xs text-muted-foreground">
                  {t('multiAlgorithm')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('popularContent')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{popularContent.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t('trendingContent7Days')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('algorithms')}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-xs text-muted-foreground">
                  {t('algorithmTypes')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('cacheEfficiency')}</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{t('efficient')}</div>
                <p className="text-xs text-muted-foreground">
                  {t('threeTierCache')}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('systemOverview')}</CardTitle>
              <CardDescription>
                {t('systemDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">{t('recommendationAlgorithms')}</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {language === 'zh' ? (
                      <>
                        <li>• 基于内容的推荐（文章相似性）</li>
                        <li>• 协同过滤（相似用户喜好）</li>
                        <li>• 趋势内容推荐（热门文章）</li>
                        <li>• 探索性推荐（多样化内容）</li>
                      </>
                    ) : language === 'ja' ? (
                      <>
                        <li>• コンテンツベース推薦（記事類似性）</li>
                        <li>• 協調フィルタリング（類似ユーザーの好み）</li>
                        <li>• トレンドコンテンツ推薦（人気記事）</li>
                        <li>• 探索的推薦（多様なコンテンツ）</li>
                      </>
                    ) : (
                      <>
                        <li>• Content-based recommendations (article similarity)</li>
                        <li>• Collaborative filtering (similar user preferences)</li>
                        <li>• Trending content recommendations (popular articles)</li>
                        <li>• Exploratory recommendations (diverse content)</li>
                      </>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">{t('dataSources')}</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {language === 'zh' ? (
                      <>
                        <li>• 用户阅读行为和时长</li>
                        <li>• 文章向量嵌入和相似性</li>
                        <li>• 滚动深度和互动数据</li>
                        <li>• 设备和时间偏好</li>
                      </>
                    ) : language === 'ja' ? (
                      <>
                        <li>• ユーザー読み取り行動と時間</li>
                        <li>• 記事ベクトル埋め込みと類似性</li>
                        <li>• スクロール深度とインタラクションデータ</li>
                        <li>• デバイスと時間の好み</li>
                      </>
                    ) : (
                      <>
                        <li>• User reading behavior and duration</li>
                        <li>• Article vector embeddings and similarity</li>
                        <li>• Scroll depth and interaction data</li>
                        <li>• Device and time preferences</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popular" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('popularRecommendations')}
              </CardTitle>
              <CardDescription>
                {t('popularDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">加载中...</span>
                </div>
              ) : popularContent.length > 0 ? (
                <div className="space-y-4">
                  {popularContent.map((recommendation, index) => (
                    <div key={recommendation.article.id} className="border rounded-lg p-4 hover:bg-accent">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-mono text-gray-500">#{index + 1}</span>
                            <span className="text-lg">{getRecommendationIcon(recommendation)}</span>
                            <Badge className={getRecommendationTypeColor(recommendation.recommendation_type)}>
                              {getRecommendationCategoryLabel(recommendation, language)}
                            </Badge>
                            <Badge variant="outline">
                              {language === 'zh' ? '置信度' : language === 'ja' ? '信頼度' : 'Confidence'}: {formatConfidence(recommendation.confidence)}
                            </Badge>
                            {(recommendation.is_learning_path || recommendation.category === 'learning') && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                                {language === 'zh' ? '学习' : language === 'ja' ? '学習' : 'Learning'}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg mb-1">
                            {recommendation.article.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">
                            {recommendation.article.summary}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {recommendation.article.view_count || 0} 次浏览
                            </span>
                            <span>
                              分类: {recommendation.article.category.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      {recommendation.reason_details && (
                        <div className={`mt-2 p-2 rounded text-sm ${
                          recommendation.is_learning_path || recommendation.category === 'learning'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          <strong>
                            {language === 'zh' ? '推荐理由:' : language === 'ja' ? '推薦理由:' : 'Recommendation Reason:'}
                          </strong> {recommendation.reason_details}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无热门内容数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('userBehaviorAnalysis')}
              </CardTitle>
              <CardDescription>
                输入用户ID分析其阅读行为和偏好模式，或从下方列表中选择用户
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="输入用户ID (例如: user_123 或 IP地址)"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadUserProfile(selectedUserId)
                    }
                  }}
                />
                <Button 
                  onClick={() => loadUserProfile(selectedUserId)}
                  disabled={!selectedUserId.trim() || loading}
                >
                  分析
                </Button>
              </div>

              {/* User List Component */}
              <div className="mb-6">
                <UserList 
                  onUserSelect={handleUserSelect}
                  language={language}
                />
              </div>

              {userProfile && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">阅读统计</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>总阅读时间:</span>
                            <span className="font-medium">
                              {formatReadingTime(userProfile.total_reading_time)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>文章数量:</span>
                            <span className="font-medium">{userProfile.article_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>平均阅读时间:</span>
                            <span className="font-medium">
                              {formatReadingTime(userProfile.avg_reading_time)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>阅读速度:</span>
                            <span className="font-medium">{Math.round(userProfile.reading_speed)} 词/分钟</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">用户偏好</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>主要语言:</span>
                            <span className="font-medium">{userProfile.language}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>设备偏好:</span>
                            <span className="font-medium">{userProfile.device_preference || '未知'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>平均滚动深度:</span>
                            <span className="font-medium">
                              {Math.round(Math.min(userProfile.avg_scroll_depth, 1.0) * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>最后活跃:</span>
                            <span className="font-medium">
                              {new Date(userProfile.last_active).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">相似用户</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {similarUsers.length > 0 ? (
                          <div className="space-y-1">
                            {similarUsers.map((userId, index) => (
                              <div key={userId} className="text-sm p-1 bg-gray-50 rounded">
                                {userId}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">暂无相似用户</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {readingPatterns && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">阅读模式分析</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">设备分布</h4>
                            <div className="space-y-1">
                              {Object.entries(readingPatterns?.device_distribution || {}).map(([device, count]) => (
                                <div key={device} className="flex justify-between text-sm">
                                  <span>{device}:</span>
                                  <span>{count} 次</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">分类兴趣</h4>
                            <div className="space-y-1">
                              {Object.entries(readingPatterns?.category_interests || {})
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 5)
                                .map(([category, score]) => (
                                  <div key={category} className="flex justify-between text-sm">
                                    <span>{category}:</span>
                                    <span>{score.toFixed(2)}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('recommendationEffectAnalysis')}
              </CardTitle>
              <CardDescription>
                推荐系统的性能指标和用户反馈分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{analytics.total_recommendations}</div>
                    <div className="text-sm text-gray-600">总推荐数</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(analytics.click_through_rate * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">点击率</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(analytics.avg_confidence * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">平均置信度</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {Object.keys(analytics.type_distribution).length}
                    </div>
                    <div className="text-sm text-gray-600">推荐类型</div>
                  </div>
                </div>
              ) : selectedUserId ? (
                <div className="text-center py-8 text-gray-500">
                  请先选择用户查看分析数据
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  请输入用户ID查看分析数据
                </div>
              )}

              {analytics && analytics.type_distribution && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">推荐类型分布</h4>
                  <div className="space-y-2">
                    {Object.entries(analytics?.type_distribution || {}).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getRecommendationTypeColor(type)}>
                            {type}
                          </Badge>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RecommendationManager