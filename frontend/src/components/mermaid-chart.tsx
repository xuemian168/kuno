"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import mermaid from 'mermaid'
import Panzoom, { PanzoomObject } from '@panzoom/panzoom'
import { MermaidToolbar } from './mermaid-toolbar'

interface MermaidChartProps {
  chart: string
  className?: string
  debug?: boolean
  interactive?: boolean
  showToolbar?: boolean
}

export function MermaidChart({ 
  chart, 
  className = "", 
  debug = false, 
  interactive = true, 
  showToolbar = true 
}: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const panzoomRef = useRef<PanzoomObject | null>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { resolvedTheme } = useTheme()
  
  const chartId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`)

  // 调试输出
  const debugLog = useCallback((message: string) => {
    if (debug) {
      console.log(`[MermaidChart] ${message}`)
    }
  }, [debug])

  // 优化 SVG 响应式属性
  const optimizeSvgForResponsive = useCallback((svgString: string) => {
    try {
      // 解析 SVG
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgString, 'image/svg+xml')
      const svgElement = doc.querySelector('svg')
      
      if (!svgElement) return svgString
      
      // 获取原始尺寸
      const originalWidth = svgElement.getAttribute('width')
      const originalHeight = svgElement.getAttribute('height')
      
      // 设置响应式属性
      svgElement.setAttribute('width', '100%')
      svgElement.setAttribute('height', 'auto')
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      
      // 确保有正确的 viewBox
      if (!svgElement.getAttribute('viewBox') && originalWidth && originalHeight) {
        svgElement.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight}`)
      }
      
      // 添加样式确保显示完整
      svgElement.setAttribute('style', `
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      `.replace(/\s+/g, ' ').trim())
      
      return new XMLSerializer().serializeToString(doc)
    } catch (error) {
      debugLog(`SVG 优化失败: ${error}`)
      return svgString
    }
  }, [debugLog])

  // 渲染 Mermaid 图表
  const renderChart = useCallback(async () => {
    if (!chart.trim()) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setIsError(false)
      debugLog('开始渲染图表')

      // 配置 Mermaid - 优化响应式设置
      const isDark = resolvedTheme === 'dark'
      await mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: 16,
        // 优化流程图配置
        flowchart: { 
          useMaxWidth: true, 
          htmlLabels: true,
          curve: 'basis',
          padding: 20
        },
        // 优化序列图配置
        sequence: { 
          useMaxWidth: true,
          actorMargin: 50,
          boxMargin: 10,
          boxTextMargin: 5,
          noteMargin: 10,
          messageMargin: 35,
          mirrorActors: true,
          bottomMarginAdj: 1,
          rightAngles: false,
          showSequenceNumbers: false
        },
        // 优化甘特图配置
        gantt: { 
          useMaxWidth: true,
          leftPadding: 75,
          gridLineStartPadding: 35,
          numberSectionStyles: 4,
          axisFormat: '%m/%d/%Y'
        },
        // 优化饼图配置
        pie: {
          useMaxWidth: true,
          textPosition: 0.75
        },
        // 优化 Git 图配置
        gitGraph: {
          useMaxWidth: true,
          mainBranchName: 'main'
        }
      })

      // 渲染 SVG
      const currentChartId = `${chartId.current}-${Date.now()}`
      const { svg } = await mermaid.render(currentChartId, chart.trim())
      
      // 优化 SVG 响应式属性
      const optimizedSvg = optimizeSvgForResponsive(svg)
      
      debugLog('SVG 渲染和优化完成')
      setSvgContent(optimizedSvg)
      setIsLoading(false)
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error)
      debugLog(`渲染失败: ${errorStr}`)
      setIsError(true)
      setErrorMessage(errorStr)
      setIsLoading(false)
    }
  }, [chart, resolvedTheme, debug, debugLog, optimizeSvgForResponsive])

  // 初始化 panzoom
  const initializePanzoom = useCallback(() => {
    if (!interactive || !containerRef.current) return

    const svgElement = containerRef.current.querySelector('svg')
    if (!svgElement) return

    try {
      debugLog('初始化 Panzoom')
      
      // 清理现有实例
      if (panzoomRef.current) {
        panzoomRef.current.destroy()
      }

      // 创建新实例
      const panzoomInstance = Panzoom(svgElement, {
        maxScale: window.innerWidth < 768 ? 5 : 10,
        minScale: 0.1,
        step: window.innerWidth < 768 ? 0.3 : 0.5,
        cursor: 'grab',
        contain: 'outside',
        animate: true,
        duration: 200,
        touchAction: 'none'
      })

      panzoomRef.current = panzoomInstance

      // 支持滚轮缩放
      const parent = svgElement.parentElement
      if (parent) {
        parent.addEventListener('wheel', panzoomInstance.zoomWithWheel)
      }

      debugLog('Panzoom 初始化完成')
    } catch (error) {
      debugLog(`Panzoom 初始化失败: ${error}`)
    }
  }, [interactive, debugLog])

  // 工具栏事件处理
  const handleZoomIn = useCallback(() => panzoomRef.current?.zoomIn(), [])
  const handleZoomOut = useCallback(() => panzoomRef.current?.zoomOut(), [])
  const handleReset = useCallback(() => panzoomRef.current?.reset(), [])
  
  const handleDownload = useCallback(() => {
    if (!svgContent) return
    
    try {
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `mermaid-chart-${Date.now()}.svg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      debugLog(`下载失败: ${error}`)
    }
  }, [svgContent, debugLog])

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    
    try {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen?.()
        setIsFullscreen(true)
      } else {
        document.exitFullscreen?.()
        setIsFullscreen(false)
      }
    } catch (error) {
      debugLog(`全屏切换失败: ${error}`)
    }
  }, [isFullscreen, debugLog])

  // 渲染效果
  useEffect(() => {
    if (resolvedTheme !== undefined) {
      renderChart()
    }
  }, [renderChart, resolvedTheme])

  // SVG 内容变化后初始化 panzoom
  useEffect(() => {
    if (svgContent && !isLoading && !isError) {
      // 延迟初始化确保 DOM 完全渲染
      const timer = setTimeout(initializePanzoom, 100)
      return () => clearTimeout(timer)
    }
  }, [svgContent, isLoading, isError, initializePanzoom])

  // 监听窗口大小变化，重新调整图表
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout

    const handleResize = () => {
      // 防抖处理
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        debugLog('窗口大小变化，重新调整图表')
        
        // 如果有 SVG 内容，重新初始化 panzoom
        if (svgContent && interactive) {
          initializePanzoom()
        }
      }, 300)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
    }
  }, [svgContent, interactive, initializePanzoom, debugLog])

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return

    let resizeTimer: NodeJS.Timeout
    
    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          debugLog(`容器尺寸变化: ${Math.round(width)}x${Math.round(height)}`)
          
          // 当容器尺寸变化时，重新初始化 panzoom
          if (svgContent && interactive) {
            initializePanzoom()
          }
        }
      }, 200)
    })

    resizeObserver.observe(containerRef.current)
    
    return () => {
      resizeObserver.disconnect()
      clearTimeout(resizeTimer)
    }
  }, [svgContent, interactive, initializePanzoom, debugLog])

  // 全屏状态监听
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // 键盘快捷键
  useEffect(() => {
    if (!interactive) return

    const handleKeydown = (e: KeyboardEvent) => {
      if (!panzoomRef.current) return

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault()
            handleZoomIn()
            break
          case '-':
            e.preventDefault()
            handleZoomOut()
            break
          case '0':
            e.preventDefault()
            handleReset()
            break
        }
      }

      if (e.key === 'F11') {
        e.preventDefault()
        handleFullscreen()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [interactive, handleZoomIn, handleZoomOut, handleReset, handleFullscreen])

  // 清理
  useEffect(() => {
    return () => {
      if (panzoomRef.current) {
        panzoomRef.current.destroy()
      }
    }
  }, [])

  return (
    <div className={className}>
      {/* 工具栏 */}
      {showToolbar && interactive && !isLoading && !isError && svgContent && (
        <div className="mb-4">
          <MermaidToolbar
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
            onDownload={handleDownload}
            onFullscreen={handleFullscreen}
            disabled={false}
          />
        </div>
      )}

      {/* 图表容器 */}
      <div
        ref={containerRef}
        className={`mermaid-chart bg-background border rounded-lg ${
          isFullscreen ? 'fixed inset-0 z-50 bg-background p-8' : 'p-4'
        }`}
        style={{
          minHeight: isFullscreen ? '100vh' : '300px',
          minWidth: '100%',
          width: '100%',
          overflow: interactive ? 'hidden' : 'auto',
          cursor: interactive ? 'grab' : 'default',
          touchAction: interactive ? 'none' : 'auto',
          position: 'relative'
        }}
      >
        {/* 加载状态 */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground text-sm animate-pulse">
              正在渲染图表...
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {isError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="text-red-800 dark:text-red-200">
              <h3 className="font-medium mb-2">图表渲染失败</h3>
              <p className="text-sm opacity-75 mb-3">{errorMessage}</p>
              <button
                onClick={renderChart}
                className="px-3 py-1 bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-200 rounded text-sm hover:bg-red-300 dark:hover:bg-red-600"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {/* 成功状态 - 使用 dangerouslySetInnerHTML 安全渲染 */}
        {!isLoading && !isError && svgContent && (
          <div
            className="mermaid-svg-container"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{ 
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 'inherit',
              overflow: interactive ? 'visible' : 'auto'
            }}
          />
        )}
      </div>
    </div>
  )
}