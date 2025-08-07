'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { apiClient, Article } from '@/lib/api'
import Link from 'next/link'
import { useClientLocale } from '@/hooks/useClientLocale'

interface SearchResult {
  articles: Article[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  query: string
}

interface ArticleSearchProps {
  trigger?: React.ReactNode
  placeholder?: string
}

export function ArticleSearch({ trigger, placeholder }: ArticleSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentLocale } = useClientLocale()
  
  // Debounce search query to avoid excessive API calls
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  // Search function
  const searchArticles = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.searchArticles(searchQuery, {
        page: 1,
        limit: 10,
        lang: currentLocale
      })
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      searchArticles(debouncedQuery)
    } else {
      setResults(null)
    }
  }, [debouncedQuery, currentLocale])

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults(null)
      setError(null)
    }
  }, [open])

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(currentLocale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Truncate content for preview
  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }

  // Extract text content from markdown
  const extractTextFromMarkdown = (markdown: string) => {
    return markdown
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
      .trim()
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="relative">
      <Search className="h-4 w-4 mr-2" />
      {currentLocale === 'zh' ? '搜索文章' : 'Search Articles'}
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 ml-2">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {currentLocale === 'zh' ? '搜索文章' : 'Search Articles'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 flex-1 overflow-hidden">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder || (currentLocale === 'zh' ? '输入关键词搜索文章...' : 'Enter keywords to search articles...')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>{currentLocale === 'zh' ? '搜索中...' : 'Searching...'}</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-destructive">
              {currentLocale === 'zh' ? '搜索出错：' : 'Search error: '}{error}
            </div>
          )}

          {/* No Results */}
          {!loading && !error && debouncedQuery && results?.articles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {currentLocale === 'zh' ? '未找到相关文章' : 'No articles found'}
            </div>
          )}

          {/* Search Results */}
          {results && results.articles.length > 0 && (
            <div className="flex-1 overflow-auto space-y-3">
              <div className="text-sm text-muted-foreground mb-3">
                {currentLocale === 'zh' 
                  ? `找到 ${results.pagination.total} 篇文章`
                  : `Found ${results.pagination.total} articles`
                }
              </div>
              
              {results.articles.map((article) => (
                <Card key={article.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <Link 
                      href={`/${currentLocale}/article/${article.id}`}
                      className="block group"
                      onClick={() => setOpen(false)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-foreground group-hover:text-primary line-clamp-2">
                            {article.title}
                          </h3>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {article.category?.name}
                          </Badge>
                        </div>
                        
                        {article.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {truncateContent(extractTextFromMarkdown(article.summary), 120)}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDate(article.created_at)}</span>
                          {article.view_count !== undefined && (
                            <span>
                              {article.view_count} {currentLocale === 'zh' ? '次阅读' : 'views'}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
              
              {results.pagination.total_pages > 1 && (
                <div className="text-center text-sm text-muted-foreground mt-4">
                  {currentLocale === 'zh' 
                    ? `显示第 1 页，共 ${results.pagination.total_pages} 页`
                    : `Showing page 1 of ${results.pagination.total_pages}`
                  }
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && !debouncedQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{currentLocale === 'zh' ? '开始输入以搜索文章' : 'Start typing to search articles'}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Keyboard shortcut hook
export function useSearchShortcut(callback: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        callback()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [callback])
}