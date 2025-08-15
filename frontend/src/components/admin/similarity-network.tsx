'use client'

import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Loader2, Network, Play, Pause, RotateCcw, ZoomIn } from 'lucide-react'
import { apiClient, SimilarityGraph, GraphNode, GraphEdge } from '@/lib/api'

interface D3GraphNode extends GraphNode {
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}
import { useClientLocale } from '@/hooks/useClientLocale'

interface SimilarityNetworkProps {
  className?: string
}

export function SimilarityNetwork({ className = '' }: SimilarityNetworkProps) {
  const { currentLocale } = useClientLocale()
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<D3GraphNode, GraphEdge> | null>(null)
  
  const [graph, setGraph] = useState<SimilarityGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [threshold, setThreshold] = useState([0.7])
  const [maxNodes, setMaxNodes] = useState(50)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [isSimulationRunning, setIsSimulationRunning] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGraph()
  }, [threshold[0], maxNodes])

  useEffect(() => {
    if (graph && graph.nodes.length > 0) {
      renderNetwork()
    }
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
    }
  }, [graph])

  const fetchGraph = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getSimilarityGraph({
        threshold: threshold[0],
        maxNodes
      })
      setGraph(response.graph)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch similarity graph'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderNetwork = () => {
    if (!svgRef.current || !graph) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = 800
    const height = 600

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })

    svg.call(zoom)

    const container = svg.append('g')

    // Create force simulation
    const d3Nodes: D3GraphNode[] = graph.nodes.map(node => ({ ...node }))
    const simulation = d3.forceSimulation<D3GraphNode>(d3Nodes)
      .force('link', d3.forceLink<D3GraphNode, GraphEdge>(graph.edges)
        .id((d: any) => d.id)
        .distance(d => 100 / (d.similarity + 0.1)) // Stronger similarity = shorter distance
        .strength(d => d.similarity))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => Math.sqrt(d.size) + 5))

    simulationRef.current = simulation

    // Color scale for languages
    const languages = Array.from(new Set(graph.nodes.map(n => n.language)))
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(languages)

    // Create links
    const links = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graph.edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight))

    // Create nodes
    const nodes = container.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(d3Nodes)
      .enter()
      .append('circle')
      .attr('r', (d: any) => Math.sqrt(d.size))
      .attr('fill', (d: any) => colorScale(d.language))
      .attr('stroke', (d: any) => selectedNode?.id === d.id ? '#000' : '#fff')
      .attr('stroke-width', (d: any) => selectedNode?.id === d.id ? 3 : 1.5)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, D3GraphNode>()
        .on('start', (event, d) => {
          if (!event.active && simulationRef.current) {
            simulationRef.current.alphaTarget(0.3).restart()
          }
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active && simulationRef.current) {
            simulationRef.current.alphaTarget(0)
          }
          d.fx = null
          d.fy = null
        }))

    // Add labels
    const labels = container.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(d3Nodes)
      .enter()
      .append('text')
      .text((d: any) => d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title)
      .style('font-size', '10px')
      .style('text-anchor', 'middle')
      .style('pointer-events', 'none')

    // Add node interactions
    nodes
      .on('mouseover', function(event, d: any) {
        d3.select(this)
          .attr('stroke-width', 3)
          .attr('stroke', '#000')

        // Highlight connected links
        links
          .attr('stroke-opacity', l => (l.source as any).id === d.id || (l.target as any).id === d.id ? 1 : 0.1)
          .attr('stroke-width', l => (l.source as any).id === d.id || (l.target as any).id === d.id ? Math.sqrt(l.weight) * 2 : Math.sqrt(l.weight))

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
          <div>Article ID: ${d.article_id}</div>
          <div>Size: ${d.size}</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      })
      .on('mouseout', function(event, d: any) {
        if (selectedNode?.id !== d.id) {
          d3.select(this)
            .attr('stroke-width', 1.5)
            .attr('stroke', '#fff')
        }

        // Reset link highlighting
        links
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', l => Math.sqrt(l.weight))

        d3.selectAll('.tooltip').remove()
      })
      .on('click', function(event, d: any) {
        setSelectedNode(d)
      })

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y)

      nodes
        .attr('cx', (d: any) => d.x!)
        .attr('cy', (d: any) => d.y!)

      labels
        .attr('x', (d: any) => d.x!)
        .attr('y', (d: any) => d.y! + 4)
    })

    // Update simulation running state
    simulation.on('end', () => {
      setIsSimulationRunning(false)
    })
  }

  const toggleSimulation = () => {
    if (!simulationRef.current) return

    if (isSimulationRunning) {
      simulationRef.current.stop()
      setIsSimulationRunning(false)
    } else {
      simulationRef.current.restart()
      setIsSimulationRunning(true)
    }
  }

  const resetZoom = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(750).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity
    )
  }

  const getConnectedNodes = () => {
    if (!selectedNode || !graph) return []
    
    return graph.edges
      .filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id)
      .map(edge => {
        const connectedId = edge.source === selectedNode.id ? edge.target : edge.source
        const connectedNode = graph.nodes.find(n => n.id === connectedId)
        return { node: connectedNode, similarity: edge.similarity }
      })
      .filter(item => item.node)
      .sort((a, b) => b.similarity - a.similarity)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            {currentLocale === 'zh' ? '文章相似度网络' : 'Article Similarity Network'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {currentLocale === 'zh' ? '相似度阈值' : 'Similarity Threshold'}: {threshold[0].toFixed(2)}
              </label>
              <Slider
                value={threshold}
                onValueChange={setThreshold}
                min={0.1}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {currentLocale === 'zh' ? '最大节点数' : 'Max Nodes'}
              </label>
              <Input
                type="number"
                min="10"
                max="200"
                value={maxNodes}
                onChange={(e) => setMaxNodes(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={fetchGraph}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Network className="h-4 w-4" />
              )}
              {currentLocale === 'zh' ? '更新网络' : 'Update Network'}
            </Button>

            <Button
              variant="outline"
              onClick={toggleSimulation}
              className="gap-2"
            >
              {isSimulationRunning ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isSimulationRunning ? 
                (currentLocale === 'zh' ? '暂停模拟' : 'Pause Simulation') :
                (currentLocale === 'zh' ? '开始模拟' : 'Start Simulation')
              }
            </Button>

            <Button
              variant="outline"
              onClick={resetZoom}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {currentLocale === 'zh' ? '重置视图' : 'Reset View'}
            </Button>
          </div>

          {graph && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline">
                {graph.nodes.length} {currentLocale === 'zh' ? '节点' : 'nodes'}
              </Badge>
              <Badge variant="outline">
                {graph.edges.length} {currentLocale === 'zh' ? '连接' : 'edges'}
              </Badge>
            </div>
          )}
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

      {/* Network Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '相似度网络图' : 'Similarity Network Graph'}
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

        {/* Selected Node Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLocale === 'zh' ? '节点详情' : 'Node Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {currentLocale === 'zh' ? '文章标题' : 'Article Title'}
                    </label>
                    <p className="text-sm font-medium">{selectedNode.title}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {currentLocale === 'zh' ? '语言' : 'Language'}
                      </label>
                      <Badge variant="outline">{selectedNode.language}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {currentLocale === 'zh' ? '大小' : 'Size'}
                      </label>
                      <Badge variant="secondary">{selectedNode.size}</Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {currentLocale === 'zh' ? '相关文章' : 'Connected Articles'}
                    </label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {getConnectedNodes().map(({ node, similarity }, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{node?.title}</p>
                            <p className="text-xs text-muted-foreground">{node?.language}</p>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {(similarity * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setSelectedNode(null)}
                  >
                    {currentLocale === 'zh' ? '取消选择' : 'Deselect'}
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {currentLocale === 'zh' ? '点击图中的节点查看详情' : 'Click on a node in the network to see details'}
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