'use client'

import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Loader2, Zap as Scatter, Filter, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { apiClient, VectorData } from '@/lib/api'
import { useClientLocale } from '@/hooks/useClientLocale'

interface EmbeddingVisualizerProps {
  className?: string
}

export function EmbeddingVisualizer({ className = '' }: EmbeddingVisualizerProps) {
  const { currentLocale } = useClientLocale()
  const svgRef = useRef<SVGSVGElement>(null)
  const [vectors, setVectors] = useState<VectorData[]>([])
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState('pca')
  const [limit, setLimit] = useState(200)
  const [filterLanguage, setFilterLanguage] = useState('all')
  const [filterContentType, setFilterContentType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVector, setSelectedVector] = useState<VectorData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filteredVectors = (vectors || []).filter(vector => {
    const matchesLanguage = filterLanguage === 'all' || vector.language === filterLanguage
    const matchesContentType = filterContentType === 'all' || vector.content_type === filterContentType
    const matchesSearch = !searchTerm || (vector.title && vector.title.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesLanguage && matchesContentType && matchesSearch
  })

  const uniqueLanguages = Array.from(new Set((vectors || []).map(v => v.language).filter(Boolean)))
  const uniqueContentTypes = Array.from(new Set((vectors || []).map(v => v.content_type).filter(Boolean)))

  useEffect(() => {
    fetchVectors()
  }, [method, limit])

  useEffect(() => {
    if (filteredVectors.length > 0) {
      renderVisualization()
    }
  }, [filteredVectors, selectedVector])

  const fetchVectors = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getEmbeddingVectors({ method, limit })
      setVectors(response.vectors)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch vectors'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderVisualization = () => {
    if (!svgRef.current || filteredVectors.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 20, left: 20 }
    const width = 800 - margin.left - margin.right
    const height = 600 - margin.top - margin.bottom

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Create scales
    const xExtent = d3.extent(filteredVectors, d => d.x) as [number, number]
    const yExtent = d3.extent(filteredVectors, d => d.y) as [number, number]

    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([0, width])

    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([height, 0])

    // Color scale for languages
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(uniqueLanguages)

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom as any)

    // Add points
    const circles = g.selectAll('circle')
      .data(filteredVectors)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 4)
      .attr('fill', d => colorScale(d.language))
      .attr('stroke', d => selectedVector?.id === d.id ? '#000' : 'none')
      .attr('stroke-width', d => selectedVector?.id === d.id ? 2 : 0)
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')

    // Add hover and click interactions
    circles
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('r', 6)
          .attr('opacity', 1)

        // Show tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')

        tooltip.html(`
          <div><strong>${d.title}</strong></div>
          <div>Language: ${d.language}</div>
          <div>Type: ${d.content_type}</div>
          <div>Created: ${d.created_at}</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      })
      .on('mouseout', function(event, d) {
        if (selectedVector?.id !== d.id) {
          d3.select(this)
            .attr('r', 4)
            .attr('opacity', 0.7)
        }

        d3.selectAll('.tooltip').remove()
      })
      .on('click', function(event, d) {
        setSelectedVector(d)
      })

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 150}, 20)`)

    const legendItems = legend.selectAll('.legend-item')
      .data(uniqueLanguages)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)

    legendItems.append('circle')
      .attr('r', 4)
      .attr('fill', d => colorScale(d))

    legendItems.append('text')
      .attr('x', 10)
      .attr('y', 4)
      .style('font-size', '12px')
      .text(d => d)
  }

  const resetZoom = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(750).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scatter className="h-5 w-5" />
            {currentLocale === 'zh' ? '向量空间可视化' : 'Vector Space Visualization'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">
                {currentLocale === 'zh' ? '降维方法' : 'Reduction Method'}
              </label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pca">PCA</SelectItem>
                  <SelectItem value="tsne">t-SNE</SelectItem>
                  <SelectItem value="umap">UMAP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">
                {currentLocale === 'zh' ? '数据量限制' : 'Data Limit'}
              </label>
              <Input
                type="number"
                min="50"
                max="1000"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                {currentLocale === 'zh' ? '语言筛选' : 'Language Filter'}
              </label>
              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder={currentLocale === 'zh' ? '所有语言' : 'All Languages'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{currentLocale === 'zh' ? '所有语言' : 'All Languages'}</SelectItem>
                  {uniqueLanguages.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">
                {currentLocale === 'zh' ? '内容类型' : 'Content Type'}
              </label>
              <Select value={filterContentType} onValueChange={setFilterContentType}>
                <SelectTrigger>
                  <SelectValue placeholder={currentLocale === 'zh' ? '所有类型' : 'All Types'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{currentLocale === 'zh' ? '所有类型' : 'All Types'}</SelectItem>
                  {uniqueContentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder={currentLocale === 'zh' ? '搜索文章标题...' : 'Search article titles...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button
              onClick={fetchVectors}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Filter className="h-4 w-4" />
              )}
              {currentLocale === 'zh' ? '刷新' : 'Refresh'}
            </Button>

            <Button
              variant="outline"
              onClick={resetZoom}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {currentLocale === 'zh' ? '重置缩放' : 'Reset Zoom'}
            </Button>
          </div>
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

      {/* Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '向量分布图' : 'Vector Distribution'}
                <Badge variant="outline" className="ml-2">
                  {filteredVectors.length} {currentLocale === 'zh' ? '个点' : 'points'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">{currentLocale === 'zh' ? '加载中...' : 'Loading...'}</span>
                </div>
              ) : (
                <svg
                  ref={svgRef}
                  width="100%"
                  height="600"
                  style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Vector Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '选中向量详情' : 'Selected Vector Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedVector ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {currentLocale === 'zh' ? '文章标题' : 'Article Title'}
                    </label>
                    <p className="text-sm font-medium">{selectedVector.title}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {currentLocale === 'zh' ? '语言' : 'Language'}
                      </label>
                      <Badge variant="outline">{selectedVector.language}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {currentLocale === 'zh' ? '内容类型' : 'Content Type'}
                      </label>
                      <Badge variant="secondary">{selectedVector.content_type}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">X</label>
                      <p className="text-sm">{selectedVector.x.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Y</label>
                      <p className="text-sm">{selectedVector.y.toFixed(2)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {currentLocale === 'zh' ? '创建时间' : 'Created At'}
                    </label>
                    <p className="text-sm">{selectedVector.created_at}</p>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setSelectedVector(null)}
                  >
                    {currentLocale === 'zh' ? '取消选择' : 'Deselect'}
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Scatter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {currentLocale === 'zh' ? '点击图中的点查看详情' : 'Click on a point in the visualization to see details'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}