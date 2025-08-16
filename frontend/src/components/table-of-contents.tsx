'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TocItem } from '@/lib/markdown-utils'
import { useTableOfContents } from '@/hooks/use-table-of-contents'
import { useTranslations } from 'next-intl'
import { useDynamicTheme } from '@/contexts/dynamic-theme-context'
import { List } from 'lucide-react'

interface TableOfContentsProps {
  tocItems: TocItem[]
  className?: string
}

export function TableOfContents({ tocItems, className }: TableOfContentsProps) {
  const t = useTranslations()
  const { analysisResult, isDynamicThemeActive } = useDynamicTheme()
  const { activeId, scrollToHeading } = useTableOfContents(tocItems)
  const [isExpanded, setIsExpanded] = useState(false)

  if (!tocItems.length) {
    return null
  }

  return (
    <>
      {/* Unified: Floating button with modal for all devices */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 sm:w-12 sm:h-12 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
          title={t('article.tableOfContents')}
        >
          <List className="h-6 w-6 sm:h-5 sm:w-5" />
        </button>

        {/* Unified modal */}
        {isExpanded && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsExpanded(false)}
            />
            <div className={`fixed bottom-20 right-6 z-50 enhanced-container-inline ${isDynamicThemeActive && analysisResult ? 'dynamic-theme-active' : ''} shadow-xl w-80 sm:w-96 max-h-96 overflow-hidden`}>
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
                <nav className="space-y-1 max-h-72 overflow-y-auto">
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