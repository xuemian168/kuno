'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { TocItem } from '@/lib/markdown-utils'
import { useTableOfContents } from '@/hooks/use-table-of-contents'
import { useTranslations } from 'next-intl'
import { useDynamicTheme } from '@/contexts/dynamic-theme-context'
import { List, X } from 'lucide-react'

interface TableOfContentsProps {
  tocItems: TocItem[]
  className?: string
}

export function TableOfContents({ tocItems, className }: TableOfContentsProps) {
  const t = useTranslations()
  const { analysisResult, isDynamicThemeActive } = useDynamicTheme()
  const { activeId, scrollToHeading } = useTableOfContents(tocItems)
  const [isExpanded, setIsExpanded] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let frame = 0

    const updatePosition = () => {
      if (frame) {
        return
      }

      frame = window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        const nextProgress = maxScroll > 0
          ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100))
          : 0

        setScrollProgress(nextProgress)
        setIsVisible(scrollTop > 120)
        frame = 0
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition)

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }

      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [])

  useEffect(() => {
    if (!isVisible) {
      setIsExpanded(false)
    }
  }, [isVisible])

  if (!tocItems.length) {
    return null
  }

  const floatingOffset = Math.round(Math.max(-96, Math.min(96, (scrollProgress - 50) * 1.2)))

  return (
    <div
      className={cn(
        'fixed right-3 z-50 transition-all duration-300 ease-out',
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0 pointer-events-none',
        className
      )}
      style={{ top: `calc(50vh + ${floatingOffset}px)` }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="article-table-of-contents"
        className="relative flex h-14 w-11 items-center justify-center overflow-hidden rounded-l-full rounded-r-md border bg-background/95 text-foreground shadow-lg backdrop-blur transition-all duration-200 hover:w-12 hover:bg-muted hover:shadow-xl"
        title={t('article.tableOfContents')}
      >
        <span className="absolute right-0 top-0 h-full w-1 bg-muted">
          <span
            className="block w-full bg-primary transition-[height] duration-200"
            style={{ height: `${scrollProgress}%` }}
          />
        </span>
        <List className="h-5 w-5" />
        <span className="sr-only">{t('article.tableOfContents')}</span>
      </button>

      {isExpanded && (
        <div
          id="article-table-of-contents"
          className={`absolute right-14 top-1/2 w-72 max-w-[calc(100vw-5rem)] -translate-y-1/2 overflow-hidden shadow-xl sm:w-96 enhanced-container-inline ${isDynamicThemeActive && analysisResult ? 'dynamic-theme-active' : ''}`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <List className="h-4 w-4" />
                {t('article.tableOfContents')}
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={t('admin.close')}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">{t('admin.close')}</span>
              </button>
            </div>
            <nav className="max-h-[min(24rem,70vh)] space-y-1 overflow-y-auto">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    scrollToHeading(item.id)
                    setIsExpanded(false)
                  }}
                  className={cn(
                    'block w-full text-left text-sm leading-relaxed py-2 px-2 rounded transition-all hover:bg-muted',
                    {
                      'text-primary bg-primary/10 font-medium border-l-2 border-primary': activeId === item.id,
                      'text-muted-foreground hover:text-foreground': activeId !== item.id,
                      'pl-2': item.level === 1,
                      'pl-4': item.level === 2,
                      'pl-6': item.level === 3,
                      'pl-8': item.level === 4,
                      'pl-10': item.level === 5,
                      'pl-12': item.level === 6,
                    }
                  )}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
