"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Eye, TrendingUp, Calendar, Users, ArrowLeft } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient, Article, AnalyticsData } from "@/lib/api"
import { GeographicChart } from "@/components/analytics/geographic-chart"
import { BrowserChart } from "@/components/analytics/browser-chart"

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>
}


export default function AnalyticsPage({ params }: AnalyticsPageProps) {
  const t = useTranslations()
  const [locale, setLocale] = useState<string>('zh')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const analyticsData = await apiClient.getAnalytics({ lang: locale })
        setAnalytics(analyticsData)
      } catch (error) {
        console.error('Failed to fetch analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [locale])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const topArticles = analytics?.top_articles || []

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{t('analytics.title')}</h1>
            <p className="text-muted-foreground">{t('analytics.description')}</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.totalViews')}</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_views || 0}</div>
            <p className="text-xs text-muted-foreground">{t('analytics.allTimeViews')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.thisMonth')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.views_this_month || 0}</div>
            <p className="text-xs text-muted-foreground">{t('analytics.viewsThisMonth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.thisWeek')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.views_this_week || 0}</div>
            <p className="text-xs text-muted-foreground">{t('analytics.viewsThisWeek')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.today')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.views_today || 0}</div>
            <p className="text-xs text-muted-foreground">{t('analytics.viewsToday')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performing Articles */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.topPerformingArticles')}</CardTitle>
            <CardDescription>{t('analytics.articlesRankedByViews')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topArticles.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{t('analytics.noArticlesFound')}</p>
              ) : (
                topArticles.map((article, index) => (
                  <div key={article.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                        <Badge variant="outline" className="text-xs">
                          {article.category}
                        </Badge>
                      </div>
                      <h4 className="font-medium line-clamp-1">{article.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('analytics.published')} {formatDate(article.created_at)}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        <Eye className="h-3 w-3" />
                        {article.view_count}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.categoryPerformance')}</CardTitle>
            <CardDescription>{t('analytics.viewsByCategory')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics?.category_stats || []).map((category) => (
                <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{category.category}</h4>
                    <p className="text-sm text-muted-foreground">
                      {category.article_count} {category.article_count === 1 ? t('analytics.article') : t('analytics.articles')}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <Eye className="h-3 w-3" />
                      {category.view_count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Viewed Article Highlight */}
      {topArticles.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t('analytics.mostViewedArticle')}</CardTitle>
            <CardDescription>{t('analytics.topPerformingContent')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">{topArticles[0].category}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {t('analytics.published')} {formatDate(topArticles[0].created_at)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{topArticles[0].title}</h3>
                </div>
                <div className="text-right ml-6">
                  <div className="flex items-center gap-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                    <Eye className="h-6 w-6" />
                    {topArticles[0].view_count}
                  </div>
                  <p className="text-sm text-muted-foreground">{t('analytics.totalViews')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Geographic Analytics */}
        <GeographicChart />
        
        {/* Browser & Device Analytics */}
        <BrowserChart />
      </div>
    </motion.div>
  )
}