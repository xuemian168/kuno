'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw, 
  Database, 
  Zap, 
  BarChart3, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  Play,
  Zap as ScatterIcon,
  Network,
  Search,
  TrendingUp,
  BookOpen
} from 'lucide-react'
import { apiClient, EmbeddingStats } from '@/lib/api'
import { useClientLocale } from '@/hooks/useClientLocale'
import { EmbeddingVisualizer } from './embedding-visualizer'
import { SimilarityNetwork } from './similarity-network'
import { RAGProcessViewer } from './rag-process-viewer'
import { EmbeddingQualityDashboard } from './embedding-quality-dashboard'
import { RAGIntroduction } from './rag-introduction'

interface EmbeddingManagerProps {
  className?: string
}

export function EmbeddingManager({ className = '' }: EmbeddingManagerProps) {
  const [stats, setStats] = useState<EmbeddingStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const { currentLocale } = useClientLocale()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getEmbeddingStats()
      setStats(response.stats)
      setLastUpdate(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch embedding stats'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleBatchProcess = async () => {
    setProcessing(true)
    setError(null)
    
    try {
      await apiClient.batchProcessEmbeddings()
      await fetchStats() // Refresh stats after processing
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process embeddings'
      setError(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  const handleRebuild = async () => {
    if (!confirm(currentLocale === 'zh' ? '确定要重建所有向量吗？这可能需要一些时间。' : 'Are you sure you want to rebuild all embeddings? This may take some time.')) {
      return
    }
    
    setRebuilding(true)
    setError(null)
    
    try {
      await apiClient.rebuildEmbeddings()
      await fetchStats() // Refresh stats after rebuilding
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rebuild embeddings'
      setError(errorMessage)
    } finally {
      setRebuilding(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString(currentLocale === 'zh' ? 'zh-CN' : 'en-US')
  }

  const getLanguageName = (code: string) => {
    const languageNames: Record<string, { zh: string; en: string }> = {
      'zh': { zh: '中文', en: 'Chinese' },
      'en': { zh: '英文', en: 'English' },
      'ja': { zh: '日文', en: 'Japanese' },
      'es': { zh: '西班牙文', en: 'Spanish' },
      'fr': { zh: '法文', en: 'French' },
      'de': { zh: '德文', en: 'German' },
      'ru': { zh: '俄文', en: 'Russian' }
    }
    
    return languageNames[code]?.[currentLocale as 'zh' | 'en'] || code
  }

  const getContentTypeName = (type: string) => {
    const typeNames: Record<string, { zh: string; en: string }> = {
      'title': { zh: '标题', en: 'Title' },
      'content': { zh: '内容', en: 'Content' },
      'summary': { zh: '摘要', en: 'Summary' },
      'combined': { zh: '组合', en: 'Combined' }
    }
    
    return typeNames[type]?.[currentLocale as 'zh' | 'en'] || type
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {currentLocale === 'zh' ? '向量搜索管理' : 'Vector Search Management'}
          </h2>
          <p className="text-muted-foreground">
            {currentLocale === 'zh' ? '管理文章的AI向量化和语义搜索功能' : 'Manage AI vectorization and semantic search features for articles'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchStats}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {currentLocale === 'zh' ? '刷新' : 'Refresh'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="introduction" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="introduction" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {currentLocale === 'zh' ? 'RAG介绍' : 'RAG Introduction'}
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <Database className="h-4 w-4" />
            {currentLocale === 'zh' ? '概览' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="visualizer" className="gap-2">
            <ScatterIcon className="h-4 w-4" />
            {currentLocale === 'zh' ? '向量分布' : 'Vector Space'}
          </TabsTrigger>
          <TabsTrigger value="network" className="gap-2">
            <Network className="h-4 w-4" />
            {currentLocale === 'zh' ? '相似度网络' : 'Similarity Network'}
          </TabsTrigger>
          <TabsTrigger value="rag-process" className="gap-2">
            <Search className="h-4 w-4" />
            {currentLocale === 'zh' ? 'RAG过程' : 'RAG Process'}
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            {currentLocale === 'zh' ? '质量分析' : 'Quality Analysis'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLocale === 'zh' ? '总向量数' : 'Total Embeddings'}
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stats?.total_embeddings || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLocale === 'zh' ? '支持语言' : 'Languages'}
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stats?.by_language?.length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLocale === 'zh' ? '内容类型' : 'Content Types'}
                </CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stats?.by_content_type?.length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLocale === 'zh' ? '最后更新' : 'Last Updated'}
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {loading ? '...' : 
                   stats?.latest_update ? formatDate(stats.latest_update) :
                   lastUpdate ? lastUpdate.toLocaleTimeString() : 
                   (currentLocale === 'zh' ? '未知' : 'Unknown')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                {currentLocale === 'zh' ? '操作' : 'Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleBatchProcess}
                  disabled={processing || rebuilding}
                  className="gap-2"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {currentLocale === 'zh' ? '批量处理' : 'Batch Process'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRebuild}
                  disabled={processing || rebuilding}
                  className="gap-2"
                >
                  {rebuilding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {currentLocale === 'zh' ? '重建全部' : 'Rebuild All'}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  {currentLocale === 'zh' 
                    ? '• 批量处理：为所有未处理的文章生成向量'
                    : '• Batch Process: Generate embeddings for all unprocessed articles'}
                </p>
                <p>
                  {currentLocale === 'zh' 
                    ? '• 重建全部：删除所有现有向量并重新生成'
                    : '• Rebuild All: Delete all existing embeddings and regenerate'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Language Statistics */}
          {stats?.by_language && stats.by_language.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {currentLocale === 'zh' ? '按语言分布' : 'Distribution by Language'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.by_language.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getLanguageName(item.language)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          {item.count} {currentLocale === 'zh' ? '个向量' : 'embeddings'}
                        </div>
                        <Progress 
                          value={(item.count / (stats.total_embeddings || 1)) * 100} 
                          className="w-24" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Type Statistics */}
          {stats?.by_content_type && stats.by_content_type.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {currentLocale === 'zh' ? '按内容类型分布' : 'Distribution by Content Type'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.by_content_type.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {getContentTypeName(item.content_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          {item.count} {currentLocale === 'zh' ? '个向量' : 'embeddings'}
                        </div>
                        <Progress 
                          value={(item.count / (stats.total_embeddings || 1)) * 100} 
                          className="w-24" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>{currentLocale === 'zh' ? '加载中...' : 'Loading...'}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="introduction">
          <RAGIntroduction />
        </TabsContent>

        <TabsContent value="visualizer">
          <EmbeddingVisualizer />
        </TabsContent>

        <TabsContent value="network">
          <SimilarityNetwork />
        </TabsContent>

        <TabsContent value="rag-process">
          <RAGProcessViewer />
        </TabsContent>

        <TabsContent value="quality">
          <EmbeddingQualityDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}