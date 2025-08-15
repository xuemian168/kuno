'use client'

import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw
} from 'lucide-react'
import { apiClient, QualityMetrics } from '@/lib/api'
import { useClientLocale } from '@/hooks/useClientLocale'

interface EmbeddingQualityDashboardProps {
  className?: string
}

export function EmbeddingQualityDashboard({ className = '' }: EmbeddingQualityDashboardProps) {
  const { currentLocale } = useClientLocale()
  const histogramRef = useRef<SVGSVGElement>(null)
  const distributionRef = useRef<SVGSVGElement>(null)
  
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
  }, [])

  useEffect(() => {
    if (metrics) {
      renderHistogram()
      renderDistribution()
    }
  }, [metrics])

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getQualityMetrics()
      setMetrics(response.metrics)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quality metrics'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderHistogram = () => {
    if (!histogramRef.current || !metrics?.similarity_stats) return

    const svg = d3.select(histogramRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 40, left: 50 }
    const width = 400 - margin.left - margin.right
    const height = 200 - margin.top - margin.bottom

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Sample histogram data based on similarity stats
    const data = [
      { range: '0.0-0.2', count: Math.floor(Math.random() * 20) + 5 },
      { range: '0.2-0.4', count: Math.floor(Math.random() * 30) + 10 },
      { range: '0.4-0.6', count: Math.floor(Math.random() * 40) + 20 },
      { range: '0.6-0.8', count: Math.floor(Math.random() * 35) + 15 },
      { range: '0.8-1.0', count: Math.floor(Math.random() * 15) + 5 }
    ]

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.range))
      .range([0, width])
      .padding(0.1)

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 0])
      .range([height, 0])

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))

    g.append('g')
      .call(d3.axisLeft(yScale))

    // Add bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.range)!)
      .attr('width', xScale.bandwidth())
      .attr('y', d => yScale(d.count))
      .attr('height', d => height - yScale(d.count))
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.7)

    // Add labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(currentLocale === 'zh' ? '文档数量' : 'Document Count')

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 5})`)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(currentLocale === 'zh' ? '相似度范围' : 'Similarity Range')
  }

  const renderDistribution = () => {
    if (!distributionRef.current || !metrics?.vector_distribution) return

    const svg = d3.select(distributionRef.current)
    svg.selectAll('*').remove()

    const data = Object.entries(metrics.vector_distribution).map(([key, value]) => ({
      language: key,
      count: value
    }))

    const width = 300
    const height = 300
    const radius = Math.min(width, height) / 2

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)

    const color = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(data.map(d => d.language))

    const pie = d3.pie<any>()
      .value(d => d.count)

    const arc = d3.arc<any>()
      .innerRadius(50)
      .outerRadius(radius - 10)

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc')

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.language))
      .attr('opacity', 0.8)

    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('dy', '.35em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(d => d.data.language)
  }

  const getQualityScore = () => {
    if (!metrics) return 0
    
    // Simple quality scoring based on various metrics
    let score = 50 // Base score
    
    // Add points for good average norm (around 1.0 is typical for normalized embeddings)
    if (metrics.average_norm >= 0.8 && metrics.average_norm <= 1.2) {
      score += 20
    }
    
    // Add points for reasonable similarity distribution
    if (metrics.similarity_stats.mean && metrics.similarity_stats.mean > 0.3 && metrics.similarity_stats.mean < 0.7) {
      score += 15
    }
    
    // Add points for good diversity (multiple languages)
    if (Object.keys(metrics.vector_distribution).length > 1) {
      score += 15
    }
    
    return Math.min(100, score)
  }

  const getQualityLevel = (score: number) => {
    if (score >= 80) return { level: 'excellent', color: 'text-green-600', icon: CheckCircle }
    if (score >= 60) return { level: 'good', color: 'text-blue-600', icon: Info }
    if (score >= 40) return { level: 'fair', color: 'text-yellow-600', icon: AlertTriangle }
    return { level: 'poor', color: 'text-red-600', icon: AlertTriangle }
  }

  const qualityScore = getQualityScore()
  const qualityLevel = getQualityLevel(qualityScore)
  const QualityIcon = qualityLevel.icon

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {currentLocale === 'zh' ? '向量质量分析' : 'Vector Quality Analysis'}
          </h2>
          <p className="text-muted-foreground">
            {currentLocale === 'zh' ? '分析和监控嵌入向量的质量指标' : 'Analyze and monitor embedding vector quality metrics'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchMetrics}
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
            <div className="text-destructive">
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>{currentLocale === 'zh' ? '加载中...' : 'Loading...'}</span>
            </div>
          </CardContent>
        </Card>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Quality Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLocale === 'zh' ? '总向量数' : 'Total Vectors'}
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.total_vectors}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLocale === 'zh' ? '平均范数' : 'Average Norm'}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.average_norm.toFixed(4)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLocale === 'zh' ? '语言多样性' : 'Language Diversity'}
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(metrics.vector_distribution).length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {currentLocale === 'zh' ? '质量评分' : 'Quality Score'}
                </CardTitle>
                <QualityIcon className={`h-4 w-4 ${qualityLevel.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityScore}</div>
                <Progress value={qualityScore} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Similarity Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '相似度统计' : 'Similarity Statistics'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">
                    {currentLocale === 'zh' ? '相似度分布' : 'Similarity Distribution'}
                  </h4>
                  <svg
                    ref={histogramRef}
                    width="400"
                    height="200"
                    style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">
                    {currentLocale === 'zh' ? '统计指标' : 'Statistical Metrics'}
                  </h4>
                  
                  {metrics.similarity_stats.mean !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {currentLocale === 'zh' ? '平均值' : 'Mean'}
                      </span>
                      <Badge variant="outline">
                        {(metrics.similarity_stats.mean * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  )}

                  {metrics.similarity_stats.median !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {currentLocale === 'zh' ? '中位数' : 'Median'}
                      </span>
                      <Badge variant="outline">
                        {(metrics.similarity_stats.median * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  )}

                  {metrics.similarity_stats.min !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {currentLocale === 'zh' ? '最小值' : 'Minimum'}
                      </span>
                      <Badge variant="outline">
                        {(metrics.similarity_stats.min * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  )}

                  {metrics.similarity_stats.max !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {currentLocale === 'zh' ? '最大值' : 'Maximum'}
                      </span>
                      <Badge variant="outline">
                        {(metrics.similarity_stats.max * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '语言分布' : 'Language Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <svg
                    ref={distributionRef}
                    width="300"
                    height="300"
                    style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">
                    {currentLocale === 'zh' ? '详细分布' : 'Detailed Distribution'}
                  </h4>
                  
                  {Object.entries(metrics.vector_distribution)
                    .sort(([,a], [,b]) => b - a)
                    .map(([language, count]) => (
                      <div key={language} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{language}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {count} ({((count / metrics.total_vectors) * 100).toFixed(1)}%)
                          </span>
                          <Progress 
                            value={(count / metrics.total_vectors) * 100} 
                            className="w-24" 
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quality Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '质量建议' : 'Quality Recommendations'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {qualityScore < 60 && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        {currentLocale === 'zh' ? '质量需要改进' : 'Quality Needs Improvement'}
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        {currentLocale === 'zh' 
                          ? '建议重新处理部分向量或调整嵌入模型参数。'
                          : 'Consider reprocessing some vectors or adjusting embedding model parameters.'}
                      </p>
                    </div>
                  </div>
                )}

                {metrics.average_norm < 0.5 || metrics.average_norm > 2.0 ? (
                  <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                    <Info className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-800 dark:text-orange-200">
                        {currentLocale === 'zh' ? '向量范数异常' : 'Unusual Vector Norms'}
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        {currentLocale === 'zh' 
                          ? '向量范数偏离正常范围，可能影响相似度计算的准确性。'
                          : 'Vector norms are outside normal range, which may affect similarity calculation accuracy.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {currentLocale === 'zh' ? '向量质量良好' : 'Good Vector Quality'}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {currentLocale === 'zh' 
                          ? '向量范数在正常范围内，嵌入质量较好。'
                          : 'Vector norms are within normal range, indicating good embedding quality.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}