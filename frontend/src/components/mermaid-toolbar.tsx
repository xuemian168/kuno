"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Move } from 'lucide-react'

interface MermaidToolbarProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onDownload: () => void
  onFullscreen?: () => void
  className?: string
  disabled?: boolean
}

export function MermaidToolbar({ 
  onZoomIn, 
  onZoomOut, 
  onReset, 
  onDownload, 
  onFullscreen,
  className = "",
  disabled = false 
}: MermaidToolbarProps) {
  const t = useTranslations('mermaid.toolbar')
  const buttonClass = `
    inline-flex items-center justify-center w-8 h-8 
    bg-background border border-border rounded 
    hover:bg-muted hover:border-muted-foreground/20
    disabled:opacity-50 disabled:cursor-not-allowed 
    transition-all duration-200
    text-muted-foreground hover:text-foreground
    focus:outline-none focus:ring-2 focus:ring-primary/50
  `.trim()

  return (
    <div className={`flex items-center gap-1 p-2 bg-card/50 border border-border/50 rounded-lg shadow-sm backdrop-blur-sm ${className}`}>
      {/* 交互提示 */}
      <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground">
        <Move className="w-3 h-3" />
        <span className="hidden sm:inline">{t('dragToMove')}</span>
      </div>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      {/* 缩放控件 */}
      <button
        className={buttonClass}
        onClick={onZoomIn}
        disabled={disabled}
        title={t('zoomIn')}
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      
      <button
        className={buttonClass}
        onClick={onZoomOut}
        disabled={disabled}
        title={t('zoomOut')}
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      
      <button
        className={buttonClass}
        onClick={onReset}
        disabled={disabled}
        title={t('resetView')}
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      {/* 全屏模式 */}
      {onFullscreen && (
        <>
          <button
            className={buttonClass}
            onClick={onFullscreen}
            disabled={disabled}
            title={t('fullscreen')}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-border mx-1" />
        </>
      )}
      
      {/* 下载 */}
      <button
        className={buttonClass}
        onClick={onDownload}
        disabled={disabled}
        title={t('download')}
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  )
}