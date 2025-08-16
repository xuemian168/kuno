"use client"

import { useState, useEffect } from "react"
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Download, Eye, Trash2, Clock, Globe, Database, FileText, BarChart3, TrendingUp, BookOpen } from "lucide-react"
import { apiClient } from "@/lib/api"
import { LLMsTxtIntroduction } from './llms-txt-introduction'

interface CacheStats {
  cache_entries: number
  cache_expiry_hours: number
  entries: Array<{
    key: string
    language: string
    timestamp: string
    age_minutes: number
  }>
}

interface UsageStats {
  period_days: number
  summary: Array<{
    service_type: string
    provider: string
    total_requests: number
    success_requests: number
    total_tokens: number
    total_cost: number
    currency: string
    avg_response_time: number
  }>
  daily_usage: Array<{
    date: string
    total_requests: number
    success_requests: number
    total_cost: number
    avg_response_time: number
  }>
  cache_stats: CacheStats
}

interface LLMsTxtManagerProps {
  locale: string
}

export function LLMsTxtManager({ locale }: LLMsTxtManagerProps) {
  const t = useTranslations()
  const [selectedLanguage, setSelectedLanguage] = useState("zh")
  const [previewContent, setPreviewContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Available languages for LLMs.txt generation
  const availableLanguages = [
    { code: "zh", name: "中文" },
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
    { code: "ko", name: "한국어" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
    { code: "ru", name: "Русский" },
  ]

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const fetchCacheStats = async () => {
    try {
      const stats = await apiClient.getLLMsTxtCacheStats()
      setCacheStats(stats)
    } catch (error) {
      console.error('Failed to fetch cache stats:', error)
    }
  }

  const fetchUsageStats = async () => {
    try {
      const stats = await apiClient.getLLMsTxtUsageStats(30)
      // Ensure arrays exist to prevent null/undefined errors
      const sanitizedStats = {
        ...stats,
        summary: stats.summary || [],
        daily_usage: stats.daily_usage || [],
        cache_stats: stats.cache_stats || { cache_entries: 0, cache_expiry_hours: 1, entries: [] }
      }
      setUsageStats(sanitizedStats)
      setCacheStats(sanitizedStats.cache_stats)
    } catch (error) {
      console.error('Failed to fetch usage stats:', error)
      showMessage('error', 'Failed to fetch usage statistics')
      // Set fallback data
      setUsageStats({
        period_days: 30,
        summary: [],
        daily_usage: [],
        cache_stats: { cache_entries: 0, cache_expiry_hours: 1, entries: [] }
      })
    }
  }

  const generatePreview = async () => {
    setIsLoading(true)
    setPreviewContent("")
    
    try {
      const content = await apiClient.previewLLMsTxt(selectedLanguage)
      setPreviewContent(content)
    } catch (error) {
      console.error('Failed to generate preview:', error)
      showMessage('error', 'Failed to generate preview')
    } finally {
      setIsLoading(false)
    }
  }

  const clearCache = async () => {
    setIsGenerating(true)
    
    try {
      await apiClient.clearLLMsTxtCache()
      showMessage('success', 'Cache cleared successfully')
      fetchCacheStats()
    } catch (error) {
      console.error('Failed to clear cache:', error)
      showMessage('error', 'Failed to clear cache')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadLLMsTxt = () => {
    if (!previewContent) return
    
    const blob = new Blob([previewContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `llms-${selectedLanguage}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const viewLive = () => {
    // Get the current site URL and construct the LLMs.txt URL
    const baseUrl = window.location.origin
    const url = `${baseUrl}/llms.txt?lang=${selectedLanguage}`
    window.open(url, '_blank')
  }

  useEffect(() => {
    fetchCacheStats()
    fetchUsageStats()
  }, [])

  useEffect(() => {
    if (selectedLanguage) {
      generatePreview()
    }
  }, [selectedLanguage])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            LLMs.txt {t('ai.llms_txt_manager')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('ai.llms_txt_description')}
          </p>
        </CardHeader>
      </Card>

      {/* Message Alert */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="introduction" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="introduction" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {locale === 'zh' ? '关于LLMs.txt' : 'About LLMs.txt'}
          </TabsTrigger>
          <TabsTrigger value="generator">{t('ai.generator')}</TabsTrigger>
          <TabsTrigger value="cache">{t('ai.cache_management')}</TabsTrigger>
          <TabsTrigger value="usage">{t('ai.usage_statistics')}</TabsTrigger>
        </TabsList>

        <TabsContent value="introduction">
          <LLMsTxtIntroduction locale={locale} />
        </TabsContent>

        <TabsContent value="generator" className="space-y-4">
          {/* Language Selection and Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('ai.generate_llms_txt')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="language">{t('common.language')}</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={generatePreview} 
                    disabled={isLoading}
                    variant="default"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    {t('common.refresh')}
                  </Button>
                  <Button 
                    onClick={viewLive} 
                    variant="outline"
                    disabled={!previewContent}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t('common.view_live')}
                  </Button>
                  <Button 
                    onClick={downloadLLMsTxt} 
                    variant="outline"
                    disabled={!previewContent}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('common.download')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('common.preview')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('ai.llms_txt_preview_description')}
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={previewContent}
                readOnly
                className="min-h-[400px] font-mono text-sm"
                placeholder={isLoading ? t('common.loading') + "..." : t('ai.select_language_to_preview')}
              />
              <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                {previewContent && (
                  <>
                    <Badge variant="outline">
                      {previewContent.length} {t('common.characters')}
                    </Badge>
                    <Badge variant="outline">
                      {previewContent.split('\n').length} {t('common.lines')}
                    </Badge>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          {/* Cache Statistics */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                {t('ai.cache_statistics')}
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={fetchCacheStats} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('common.refresh')}
                </Button>
                <Button 
                  onClick={clearCache} 
                  variant="destructive" 
                  size="sm"
                  disabled={isGenerating}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('ai.clear_cache')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cacheStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">
                        {t('ai.cache_entries')}: <Badge variant="outline">{cacheStats.cache_entries}</Badge>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">
                        {t('ai.cache_expiry')}: <Badge variant="outline">{cacheStats.cache_expiry_hours}h</Badge>
                      </span>
                    </div>
                  </div>

                  {cacheStats.entries.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{t('ai.cached_entries')}</h4>
                      <div className="space-y-2">
                        {cacheStats.entries.map((entry, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{entry.language}</Badge>
                              <span className="text-sm font-mono">{entry.key}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {Math.round(entry.age_minutes)} {t('common.minutes_ago')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cacheStats.entries.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t('ai.no_cached_entries')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">{t('common.loading')}...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          {/* Usage Statistics */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('ai.usage_statistics')}
              </CardTitle>
              <Button onClick={fetchUsageStats} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.refresh')}
              </Button>
            </CardHeader>
            <CardContent>
              {usageStats ? (
                <div className="space-y-6">
                  {/* Summary Statistics */}
                  {usageStats.summary && usageStats.summary.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {usageStats.summary.map((summary, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">{t('ai.api_calls')}</span>
                          </div>
                          <div className="text-2xl font-bold">{summary.total_requests}</div>
                          <div className="text-xs text-muted-foreground">
                            {t('ai.success_rate')}: {summary.total_requests > 0 ? Math.round((summary.success_requests / summary.total_requests) * 100) : 0}%
                          </div>
                        </div>
                      ))}
                      
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">{t('ai.avg_response_time')}</span>
                        </div>
                        <div className="text-2xl font-bold">
                          {Math.round(usageStats.summary[0].avg_response_time)}ms
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('ai.average_response_time')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No usage data available</p>
                      <p className="text-sm">Generate some LLMs.txt content to see usage statistics</p>
                    </div>
                  )}

                  {/* Daily Usage Chart */}
                  {usageStats.daily_usage && usageStats.daily_usage.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{t('ai.daily_usage')} ({t('ai.last_30_days')})</h4>
                      <div className="space-y-1">
                        {usageStats.daily_usage && usageStats.daily_usage.slice(-7).map((day, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                            <span>{new Date(day.date).toLocaleDateString()}</span>
                            <div className="flex gap-4">
                              <span>{t('ai.requests')}: {day.total_requests}</span>
                              <span>{t('ai.success')}: {day.success_requests}</span>
                              <span>{t('ai.avg_time')}: {Math.round(day.avg_response_time)}ms</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Period Information */}
                  <div className="text-sm text-muted-foreground">
                    <Badge variant="outline">
                      {t('ai.statistics_period')}: {usageStats.period_days} {t('common.days')}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">{t('common.loading')}...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}