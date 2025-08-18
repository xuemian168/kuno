"use client"

import { useState, useEffect } from "react"
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Filter,
  Download,
  RefreshCw,
  Globe,
  Users,
  MousePointer,
  Eye,
  Shield,
  Lock
} from "lucide-react"
import { seoAIService } from "@/services/seo-ai"
import { SEOAnalyzer } from "@/services/seo-ai/analyzer"
import { apiClient } from "@/lib/api"

interface ArticleSEOStats {
  id: string
  title: string
  seo_score: number
  seo_title: string
  seo_description: string
  views: number
  clicks: number
  impressions: number
  ctr: number
  position: number
  keywords: string[]
  last_updated: string
  status: 'optimized' | 'needs-attention' | 'poor'
}

interface SEOOverviewStats {
  total_articles: number
  optimized_articles: number
  needs_attention: number
  poor_articles: number
  average_score: number
  total_keywords: number
  top_performing_articles: number
  organic_traffic: number
  trend_direction: 'up' | 'down' | 'stable'
  trend_percentage: number
}

interface KeywordPerformance {
  keyword: string
  position: number
  clicks: number
  impressions: number
  ctr: number
  difficulty: 'easy' | 'medium' | 'hard'
  trend: 'up' | 'down' | 'stable'
}

export function SEODashboard() {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'optimized' | 'needs-attention' | 'poor'>('all')
  const [settings, setSettings] = useState<any>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  
  // Data loaded from API
  const [overviewStats, setOverviewStats] = useState<SEOOverviewStats>({
    total_articles: 0,
    optimized_articles: 0,
    needs_attention: 0,
    poor_articles: 0,
    average_score: 0,
    total_keywords: 0,
    top_performing_articles: 0,
    organic_traffic: 0,
    trend_direction: 'stable',
    trend_percentage: 0
  })

  const [articleStats, setArticleStats] = useState<ArticleSEOStats[]>([])

  const [keywordPerformance, setKeywordPerformance] = useState<KeywordPerformance[]>([])

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true)
      try {
        // Load multiple data sources in parallel
        const [metricsResponse, keywordsResponse, healthResponse, settingsResponse] = await Promise.all([
          apiClient.getSEOMetrics(),
          apiClient.getSEOKeywords(),
          apiClient.getSEOHealth().catch(() => null), // Optional, might not exist yet
          apiClient.getSettings()
        ])
        
        // Extract metrics for overview stats
        const metrics = metricsResponse.metrics
        
        // Update overview stats with real data
        setOverviewStats({
          total_articles: metrics.total_articles || 0,
          optimized_articles: metrics.optimized_articles || 0,
          needs_attention: metrics.needs_attention || 0,
          poor_articles: metrics.poor_articles || 0,
          average_score: metrics.average_score || 0,
          total_keywords: keywordsResponse.keywords.length,
          top_performing_articles: metrics.top_performing_articles || 0,
          organic_traffic: metrics.organic_traffic || 0,
          trend_direction: metrics.trend_direction || 'stable',
          trend_percentage: metrics.trend_percentage || 0
        })
        
        // Transform keywords to performance data
        const performanceData = keywordsResponse.keywords
          .filter(k => k.current_rank && k.current_rank > 0)
          .slice(0, 10) // Top 10
          .map(keyword => ({
            keyword: keyword.keyword,
            position: keyword.current_rank || 0,
            clicks: 0, // Would come from analytics
            impressions: 0, // Would come from analytics
            ctr: 0, // Would come from analytics
            difficulty: keyword.difficulty,
            trend: 'stable' as const // Would be calculated
          }))
        
        setKeywordPerformance(performanceData)
        
        // Set settings
        setSettings(settingsResponse)
        
        // TODO: Load actual article SEO stats from analytics
        // For now, leave articleStats empty until we implement article analytics
        
      } catch (error) {
        console.error('Failed to load SEO dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimized':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'needs-attention':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <BarChart3 className="h-4 w-4 text-gray-600" />
    }
  }

  const filteredArticles = articleStats.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          article.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFilter = filterStatus === 'all' || article.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const refreshData = async () => {
    setIsLoading(true)
    try {
      // Refresh all data
      const [metricsResponse, keywordsResponse] = await Promise.all([
        apiClient.getSEOMetrics(),
        apiClient.getSEOKeywords()
      ])
      
      const metrics = metricsResponse.metrics
      
      setOverviewStats({
        total_articles: metrics.total_articles || 0,
        optimized_articles: metrics.optimized_articles || 0,
        needs_attention: metrics.needs_attention || 0,
        poor_articles: metrics.poor_articles || 0,
        average_score: metrics.average_score || 0,
        total_keywords: keywordsResponse.keywords.length,
        top_performing_articles: metrics.top_performing_articles || 0,
        organic_traffic: metrics.organic_traffic || 0,
        trend_direction: metrics.trend_direction || 'stable',
        trend_percentage: metrics.trend_percentage || 0
      })
      
      const performanceData = keywordsResponse.keywords
        .filter(k => k.current_rank && k.current_rank > 0)
        .slice(0, 10)
        .map(keyword => ({
          keyword: keyword.keyword,
          position: keyword.current_rank || 0,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          difficulty: keyword.difficulty,
          trend: 'stable' as const
        }))
      
      setKeywordPerformance(performanceData)
    } catch (error) {
      console.error('Failed to refresh SEO dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePrivacySetting = async (field: 'block_search_engines' | 'block_ai_training', value: boolean) => {
    setSavingSettings(true)
    try {
      const updatedSettings = {
        ...settings,
        [field]: value
      }
      
      const response = await apiClient.updateSettings(updatedSettings)
      setSettings(response)
    } catch (error) {
      console.error('Failed to update privacy settings:', error)
    } finally {
      setSavingSettings(false)
    }
  }

  const runHealthCheck = async () => {
    setIsLoading(true)
    try {
      // Run a site-wide health check
      const response = await apiClient.runSEOHealthCheck('site')
      console.log('Health check completed:', response)
      
      // Refresh data after health check
      await refreshData()
    } catch (error) {
      console.error('Failed to run SEO health check:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('seo.dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('seo.dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('seo.dashboard.refreshData')}
          </Button>
          <Button variant="outline" onClick={runHealthCheck}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {t('seo.dashboard.runHealthCheck')}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('seo.dashboard.exportReport')}
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('seo.dashboard.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="articles">{t('seo.dashboard.tabs.articles')}</TabsTrigger>
          <TabsTrigger value="keywords">{t('seo.dashboard.tabs.keywords')}</TabsTrigger>
          <TabsTrigger value="insights">{t('seo.dashboard.tabs.insights')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Privacy and Indexing Control */}
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('seo.privacy.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('seo.privacy.description')}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {t('seo.privacy.blockSearchEngines')}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t('seo.privacy.blockSearchEnginesDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.block_search_engines || false}
                    onCheckedChange={(checked) => updatePrivacySetting('block_search_engines', checked)}
                    disabled={savingSettings}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {t('seo.privacy.blockAITraining')}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t('seo.privacy.blockAITrainingDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.block_ai_training || false}
                    onCheckedChange={(checked) => updatePrivacySetting('block_ai_training', checked)}
                    disabled={savingSettings}
                  />
                </div>
                
                {(settings.block_search_engines || settings.block_ai_training) && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {t('seo.privacy.activeWarning')}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('seo.dashboard.metrics.totalArticles')}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.total_articles}</div>
                <p className="text-xs text-muted-foreground">
                  {t('seo.dashboard.metrics.optimized')}: {overviewStats.optimized_articles}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('seo.dashboard.metrics.averageScore')}</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.average_score}</div>
                <Progress value={overviewStats.average_score} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('seo.dashboard.metrics.organicTraffic')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.organic_traffic.toLocaleString()}</div>
                <div className="flex items-center text-xs text-green-600">
                  {getTrendIcon(overviewStats.trend_direction)}
                  <span className="ml-1">+{overviewStats.trend_percentage}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('seo.dashboard.metrics.trackedKeywords')}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.total_keywords}</div>
                <p className="text-xs text-muted-foreground">
                  {t('seo.dashboard.metrics.activeKeywords')}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('seo.dashboard.distribution.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{t('seo.dashboard.distribution.optimized')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{overviewStats.optimized_articles}</span>
                    <Progress 
                      value={(overviewStats.optimized_articles / overviewStats.total_articles) * 100} 
                      className="w-20 h-2" 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">{t('seo.dashboard.distribution.needsAttention')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{overviewStats.needs_attention}</span>
                    <Progress 
                      value={(overviewStats.needs_attention / overviewStats.total_articles) * 100} 
                      className="w-20 h-2" 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">{t('seo.dashboard.distribution.poor')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{overviewStats.poor_articles}</span>
                    <Progress 
                      value={(overviewStats.poor_articles / overviewStats.total_articles) * 100} 
                      className="w-20 h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('seo.dashboard.quickActions.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  {t('seo.dashboard.quickActions.optimizeLowScore')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Target className="h-4 w-4 mr-2" />
                  {t('seo.dashboard.quickActions.analyzeCompetitors')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  {t('seo.dashboard.quickActions.generateReport')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Globe className="h-4 w-4 mr-2" />
                  {t('seo.dashboard.quickActions.checkSitemap')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Articles Analysis Tab */}
        <TabsContent value="articles" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('seo.dashboard.searchArticlesOrKeywords')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                {t('seo.dashboard.allStatus')}
              </Button>
              <Button
                variant={filterStatus === 'optimized' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('optimized')}
                size="sm"
              >
                {t('seo.dashboard.distribution.optimized')}
              </Button>
              <Button
                variant={filterStatus === 'needs-attention' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('needs-attention')}
                size="sm"
              >
                {t('seo.dashboard.distribution.needsAttention')}
              </Button>
              <Button
                variant={filterStatus === 'poor' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('poor')}
                size="sm"
              >
                {t('seo.dashboard.distribution.poor')}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <Card key={article.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(article.status)}
                        <h3 className="font-semibold">{article.title}</h3>
                        <Badge variant={getScoreBadgeVariant(article.seo_score)}>
                          {article.seo_score}/100
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{article.views} {t('seo.dashboard.views')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MousePointer className="h-3 w-3" />
                          <span>{article.clicks} {t('seo.dashboard.clicks')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          <span>{t('seo.keywords.ctr')}: {article.ctr}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>{t('seo.dashboard.averagePosition')}: {article.position}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex flex-wrap gap-1">
                          {article.keywords.map((keyword, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <Button size="sm" variant="outline">
                        {t('seo.dashboard.optimize')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Keywords Performance Tab */}
        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('seo.dashboard.tabs.keywords')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {keywordPerformance.map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{keyword.keyword}</span>
                        <Badge variant={keyword.difficulty === 'easy' ? 'default' : keyword.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                          {keyword.difficulty}
                        </Badge>
                        {getTrendIcon(keyword.trend)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('seo.dashboard.averagePosition')}: {keyword.position} • {t('seo.keywords.ctr')}: {keyword.ctr}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{keyword.clicks}</div>
                      <div className="text-sm text-muted-foreground">{t('seo.dashboard.clicks')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {t('seo.dashboard.insights.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">{t('seo.dashboard.insights.opportunityTitle')}</div>
                      <div className="text-sm">{t('seo.dashboard.insights.opportunityText')}</div>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">{t('seo.dashboard.insights.keywordTitle')}</div>
                      <div className="text-sm">{t('seo.dashboard.insights.keywordText')}</div>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">{t('seo.dashboard.insights.contentTitle')}</div>
                      <div className="text-sm">{t('seo.dashboard.insights.contentText')}</div>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('seo.dashboard.insights.smartActions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  {t('seo.dashboard.insights.generateMeta')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Target className="h-4 w-4 mr-2" />
                  {t('seo.dashboard.insights.createContent')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t('seo.dashboard.insights.optimizeConversion')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  {t('seo.dashboard.insights.updateContent')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}