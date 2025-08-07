'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TocItem } from '@/lib/markdown-utils'
import { useTableOfContents } from '@/hooks/use-table-of-contents'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, List } from 'lucide-react'

interface TableOfContentsProps {
  tocItems: TocItem[]
  className?: string
}

export function TableOfContents({ tocItems, className }: TableOfContentsProps) {
  const t = useTranslations()
  const { activeId, scrollToHeading } = useTableOfContents(tocItems)
  const [isExpanded, setIsExpanded] = useState(false)

  if (!tocItems.length) {
    return null
  }

  return (
    <>
      {/* Desktop: Collapsible sidebar */}
      <div className={cn(
        'hidden lg:block fixed right-0 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ease-in-out',
        isExpanded ? 'translate-x-0' : 'translate-x-[calc(100%-3rem)]',
        className
      )}>
        <div className="bg-background border border-border rounded-l-lg shadow-lg max-h-[70vh] overflow-hidden">
          {/* Toggle button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-12 h-12 bg-muted hover:bg-muted/80 transition-colors border-r border-border"
            title={isExpanded ? '收起目录' : '展开目录'}
          >
            {isExpanded ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Content */}
          <div className={cn(
            'transition-all duration-300 overflow-hidden',
            isExpanded ? 'w-64 opacity-100' : 'w-0 opacity-0'
          )}>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                <List className="h-4 w-4" />
                {t('article.tableOfContents')}
              </div>
              <nav className="space-y-1 max-h-[calc(70vh-8rem)] overflow-y-auto">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToHeading(item.id)}
                    className={cn(
                      'block w-full text-left text-xs leading-relaxed py-1.5 px-2 rounded transition-all hover:bg-muted',
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
                    <span className="line-clamp-2">{item.text}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Floating button with modal */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
          title="目录"
        >
          <List className="h-5 w-5" />
        </button>

        {/* Mobile modal */}
        {isExpanded && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsExpanded(false)}
            />
            <div className="fixed bottom-20 right-6 z-50 bg-background border border-border rounded-lg shadow-xl w-72 max-h-80 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <List className="h-4 w-4" />
                    {t('article.tableOfContents')}
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    ×
                  </button>
                </div>
                <nav className="space-y-1 max-h-64 overflow-y-auto">
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
          </>
        )}
      </div>
    </>
  )
}