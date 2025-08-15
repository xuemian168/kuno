'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Loader2, 
  Search, 
  Zap, 
  ArrowRight, 
  Timer, 
  Target,
  BarChart3,
  FileText
} from 'lucide-react'
import { apiClient, RAGProcessVisualization, VectorData } from '@/lib/api'
import { useClientLocale } from '@/hooks/useClientLocale'

interface RAGProcessViewerProps {
  className?: string
}

export function RAGProcessViewer({ className = '' }: RAGProcessViewerProps) {
  const { currentLocale } = useClientLocale()
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('zh')
  const [limit, setLimit] = useState(10)
  const [processData, setProcessData] = useState<RAGProcessVisualization | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getRAGProcessVisualization(query, {
        language,
        limit
      })
      setProcessData(response.process)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze RAG process'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'query_embedding':
        return <Zap className="h-4 w-4" />
      case 'similarity_search':
        return <Search className="h-4 w-4" />
      case 'ranking':
        return <BarChart3 className="h-4 w-4" />
      default:
        return <Target className="h-4 w-4" />
    }
  }

  const getStepColor = (step: string) => {
    switch (step) {
      case 'query_embedding':
        return 'bg-blue-500'
      case 'similarity_search':
        return 'bg-green-500'
      case 'ranking':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'bg-green-500'
    if (similarity >= 0.6) return 'bg-yellow-500'
    if (similarity >= 0.4) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {currentLocale === 'zh' ? 'RAG检索过程可视化' : 'RAG Retrieval Process Visualization'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">
                {currentLocale === 'zh' ? '搜索查询' : 'Search Query'}
              </label>
              <Input
                placeholder={currentLocale === 'zh' ? '输入你的搜索问题...' : 'Enter your search question...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {currentLocale === 'zh' ? '语言' : 'Language'}
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {currentLocale === 'zh' ? '结果数量' : 'Result Limit'}
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {currentLocale === 'zh' ? '分析检索过程' : 'Analyze Retrieval Process'}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive">
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Visualization */}
      {processData && (
        <div className="space-y-6">
          {/* Process Steps */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '检索过程步骤' : 'Retrieval Process Steps'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(processData?.steps || []).map((step, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getStepColor(step.step)}`}>
                      {getStepIcon(step.step)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">
                          {step.step === 'query_embedding' && (currentLocale === 'zh' ? '查询向量化' : 'Query Embedding')}
                          {step.step === 'similarity_search' && (currentLocale === 'zh' ? '相似度搜索' : 'Similarity Search')}
                          {step.step === 'ranking' && (currentLocale === 'zh' ? '结果排序' : 'Result Ranking')}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {formatDuration(step.duration_ms)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </p>
                      
                      {/* Step-specific data */}
                      <div className="mt-2 text-xs text-muted-foreground">
                        {step.step === 'query_embedding' && (
                          <div className="flex gap-4">
                            <span>Query: &quot;{step.data.query}&quot;</span>
                            <span>Vector Size: {step.data.vector_size}</span>
                          </div>
                        )}
                        {step.step === 'similarity_search' && (
                          <div className="flex gap-4">
                            <span>Candidates Found: {step.data.candidates_found}</span>
                            <span>Threshold: {step.data.search_threshold}</span>
                          </div>
                        )}
                        {step.step === 'ranking' && (
                          <span>Final Results: {step.data.final_results}</span>
                        )}
                      </div>
                    </div>

                    {index < (processData?.steps?.length || 0) - 1 && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Query Vector Info */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '查询向量信息' : 'Query Vector Information'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {currentLocale === 'zh' ? '向量维度' : 'Vector Dimensions'}
                  </label>
                  <p className="text-lg font-semibold">{processData?.query_vector?.length || 0}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {currentLocale === 'zh' ? '向量范数' : 'Vector Norm'}
                  </label>
                  <p className="text-lg font-semibold">
                    {Math.sqrt(processData.query_vector.reduce((sum, val) => sum + val * val, 0)).toFixed(4)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {currentLocale === 'zh' ? '非零元素' : 'Non-zero Elements'}
                  </label>
                  <p className="text-lg font-semibold">
                    {(processData?.query_vector || []).filter(val => Math.abs(val) > 0.001).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retrieved Documents */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '检索到的文档' : 'Retrieved Documents'}
                <Badge variant="outline" className="ml-2">
                  {processData?.retrieved_docs?.length || 0} {currentLocale === 'zh' ? '篇' : 'articles'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(processData?.retrieved_docs || []).map((doc, index) => {
                  const similarity = processData.similarity_map[doc.article_id]
                  return (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium truncate">{doc.title}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{doc.language}</Badge>
                            <Badge variant="secondary" className="text-xs">{doc.content_type}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {(similarity * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {currentLocale === 'zh' ? '相似度' : 'Similarity'}
                          </div>
                        </div>
                        
                        <div className="w-20">
                          <Progress 
                            value={similarity * 100} 
                            className="h-2"
                          />
                        </div>

                        <div className={`w-3 h-3 rounded-full ${getSimilarityColor(similarity)}`} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '性能摘要' : 'Performance Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {currentLocale === 'zh' ? '总耗时' : 'Total Time'}
                  </label>
                  <p className="text-lg font-semibold">
                    {formatDuration(processData.steps.reduce((sum, step) => sum + step.duration_ms, 0))}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {currentLocale === 'zh' ? '平均相似度' : 'Average Similarity'}
                  </label>
                  <p className="text-lg font-semibold">
                    {(Object.values(processData.similarity_map).reduce((sum, sim) => sum + sim, 0) / 
                      Object.values(processData?.similarity_map || {}).length * 100).toFixed(1)}%
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {currentLocale === 'zh' ? '最高相似度' : 'Max Similarity'}
                  </label>
                  <p className="text-lg font-semibold">
                    {(Math.max(...Object.values(processData.similarity_map)) * 100).toFixed(1)}%
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {currentLocale === 'zh' ? '检索效率' : 'Retrieval Efficiency'}
                  </label>
                  <p className="text-lg font-semibold">
                    {((processData?.retrieved_docs?.length || 0) / 
                      (processData.steps.find(s => s.step === 'similarity_search')?.duration_ms || 1) * 1000).toFixed(1)} docs/s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}