'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, HelpCircle, ChevronDown, ChevronUp, Filter, Calendar, BarChart3 } from 'lucide-react'
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
  compact?: boolean // For mobile/compact view
}

export function ArticleSearch({ trigger, placeholder, compact = false }: ArticleSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [syntaxError, setSyntaxError] = useState<string | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    dateFrom: '',
    dateTo: '',
    minViews: '',
    sortBy: 'date',
    sortOrder: 'desc'
  })
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

    // Don't search if there's a syntax error
    if (syntaxError) {
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
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      // Check if it's a syntax error from the backend
      if (errorMessage.includes('Invalid search syntax') || errorMessage.includes('Invalid search parameters')) {
        setSyntaxError(errorMessage.replace('Invalid search syntax: ', '').replace('Invalid search parameters: ', ''))
      } else {
        setError(errorMessage)
      }
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
      setSyntaxError(null)
      setShowHelp(false)
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

  // Highlight search terms in text
  const highlightSearchTerms = (text: string, searchQuery: string) => {
    if (!text || !searchQuery) return text

    // Extract search terms from query (remove syntax)
    const terms: string[] = []
    
    // Extract quoted phrases
    const quotedMatches = searchQuery.match(/"([^"]+)"/g)
    if (quotedMatches) {
      quotedMatches.forEach(match => {
        const term = match.replace(/"/g, '')
        terms.push(term)
      })
    }

    // Extract field searches
    const fieldMatches = searchQuery.match(/\w+:"([^"]+)"/g)
    if (fieldMatches) {
      fieldMatches.forEach(match => {
        const term = match.replace(/\w+:"([^"]+)"/, '$1')
        terms.push(term)
      })
    }

    // Extract free text terms (excluding syntax)
    const cleanedQuery = searchQuery
      .replace(/"[^"]*"/g, '') // Remove quoted phrases
      .replace(/\w+:"[^"]*"/g, '') // Remove field searches
      .replace(/\w+:[^\s]+/g, '') // Remove other field searches
      .replace(/date:[^\s]+/g, '') // Remove date filters
      .replace(/views?:[^\s]+/g, '') // Remove view filters
      .replace(/sort:[^\s]+/g, '') // Remove sort directives
      .replace(/\b(AND|OR)\b/g, '') // Remove logic operators
      .replace(/-\S+/g, '') // Remove exclusions
      .trim()

    if (cleanedQuery) {
      const freeTerms = cleanedQuery.split(/\s+/).filter(term => term.length > 0)
      terms.push(...freeTerms)
    }

    if (terms.length === 0) return text

    // Create regex pattern for highlighting
    const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const regex = new RegExp(`(${pattern})`, 'gi')
    
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>')
  }

  // Get search query without syntax for highlighting
  const getHighlightQuery = () => {
    // For simplicity, use the original query
    // In a more advanced implementation, you'd parse the query response from the API
    return query
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

  // Validate search syntax
  const validateSearchSyntax = (query: string) => {
    if (!query.trim()) {
      setSyntaxError(null)
      return true
    }

    // Basic validation patterns
    const patterns = {
      field: /(\w+):"([^"]+)"|(\w+):(\S+)/g,
      quoted: /"([^"]*)"/g,
      date: /date:([\d-]+)\.\.([\d-]+)|date:([><]=?)([\d-]+)/g,
      numeric: /(views|view_count):([><]=?)(\d+)/g,
      sort: /sort:(\w+):(asc|desc)/g
    }

    try {
      // Check for unclosed quotes
      const quotes = query.match(/"/g)
      if (quotes && quotes.length % 2 !== 0) {
        setSyntaxError(currentLocale === 'zh' ? '未闭合的引号' : 'Unclosed quotation marks')
        return false
      }

      // Check date format
      const dateMatches = query.match(/date:[\d-]+\.\.[\d-]+|date:[><]=?[\d-]+/g)
      if (dateMatches) {
        for (const match of dateMatches) {
          if (match.includes('..')) {
            const [start, end] = match.replace('date:', '').split('..')
            if (!isValidDate(start) || !isValidDate(end)) {
              setSyntaxError(currentLocale === 'zh' ? '无效的日期格式，请使用 YYYY-MM-DD' : 'Invalid date format, use YYYY-MM-DD')
              return false
            }
          } else {
            const dateStr = match.replace(/date:[><]=?/, '')
            if (!isValidDate(dateStr)) {
              setSyntaxError(currentLocale === 'zh' ? '无效的日期格式，请使用 YYYY-MM-DD' : 'Invalid date format, use YYYY-MM-DD')
              return false
            }
          }
        }
      }

      // Check numeric format
      const numMatches = query.match(/(views|view_count):([><]=?)(\d+)/g)
      if (numMatches) {
        for (const match of numMatches) {
          const numStr = match.replace(/(views|view_count):[><]=?/, '')
          if (isNaN(parseInt(numStr))) {
            setSyntaxError(currentLocale === 'zh' ? '无效的数字格式' : 'Invalid number format')
            return false
          }
        }
      }

      setSyntaxError(null)
      return true
    } catch (err) {
      setSyntaxError(currentLocale === 'zh' ? '语法错误' : 'Syntax error')
      return false
    }
  }

  // Check if date string is valid
  const isValidDate = (dateStr: string) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/
    if (!regex.test(dateStr)) return false
    const date = new Date(dateStr)
    return date.toISOString().slice(0, 10) === dateStr
  }

  // Highlight search syntax in the query
  const highlightSyntax = (text: string) => {
    if (!text) return text

    const highlighted = text
    const patterns = [
      { regex: /(\w+):"([^"]+)"/g, className: 'text-blue-600 font-medium' },
      { regex: /"([^"]*)"/g, className: 'text-green-600' },
      { regex: /date:([\d-]+)\.\.([\d-]+)/g, className: 'text-purple-600' },
      { regex: /date:([><]=?)([\d-]+)/g, className: 'text-purple-600' },
      { regex: /(views|view_count):([><]=?)(\d+)/g, className: 'text-orange-600' },
      { regex: /\b(AND|OR)\b/g, className: 'text-red-600 font-bold' },
      { regex: /-(\S+)/g, className: 'text-red-500' },
      { regex: /sort:(\w+):(asc|desc)/g, className: 'text-teal-600' }
    ]

    // This is a simplified highlighting - in a real implementation,
    // you'd want to use a proper syntax highlighter
    return highlighted
  }

  // Handle query change with syntax validation
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery)
    validateSearchSyntax(newQuery)
  }

  // Build query from advanced filters
  const buildAdvancedQuery = (baseQuery: string, filters: any) => {
    const queryParts = [baseQuery.trim()].filter(Boolean)

    if (filters.category) {
      queryParts.push(`category:"${filters.category}"`)
    }

    if (filters.dateFrom && filters.dateTo) {
      queryParts.push(`date:${filters.dateFrom}..${filters.dateTo}`)
    } else if (filters.dateFrom) {
      queryParts.push(`date:>=${filters.dateFrom}`)
    } else if (filters.dateTo) {
      queryParts.push(`date:<=${filters.dateTo}`)
    }

    if (filters.minViews) {
      queryParts.push(`views:>=${filters.minViews}`)
    }

    if (filters.sortBy && filters.sortOrder) {
      queryParts.push(`sort:${filters.sortBy}:${filters.sortOrder}`)
    }

    return queryParts.join(' ')
  }

  // Apply advanced filters
  const applyAdvancedFilters = () => {
    const advancedQuery = buildAdvancedQuery(query, filters)
    setQuery(advancedQuery)
    setShowAdvancedFilters(false)
  }

  // Reset filters
  const resetFilters = () => {
    setFilters({
      category: '',
      dateFrom: '',
      dateTo: '',
      minViews: '',
      sortBy: 'date',
      sortOrder: 'desc'
    })
  }

  // Search syntax help content
  const getSearchHelp = () => {
    if (currentLocale === 'zh') {
      return {
        title: '高级搜索语法',
        examples: [
          { syntax: 'title:"关键词"', description: '在标题中搜索' },
          { syntax: 'content:"关键词"', description: '在内容中搜索' },
          { syntax: 'category:"分类名"', description: '按分类筛选' },
          { syntax: 'date:2024-01-01..2024-12-31', description: '日期范围搜索' },
          { syntax: 'date:>2024-01-01', description: '晚于指定日期' },
          { syntax: 'views:>100', description: '浏览量大于100' },
          { syntax: '"精确短语"', description: '精确匹配短语' },
          { syntax: '关键词1 AND 关键词2', description: '同时包含两个词' },
          { syntax: '关键词1 OR 关键词2', description: '包含任一个词' },
          { syntax: '-排除词', description: '排除包含此词的文章' },
          { syntax: 'sort:views:desc', description: '按浏览量降序排列' },
          { syntax: 'sort:date:asc', description: '按日期升序排列' }
        ]
      }
    } else {
      return {
        title: 'Advanced Search Syntax',
        examples: [
          { syntax: 'title:"keyword"', description: 'Search in title' },
          { syntax: 'content:"keyword"', description: 'Search in content' },
          { syntax: 'category:"category name"', description: 'Filter by category' },
          { syntax: 'date:2024-01-01..2024-12-31', description: 'Date range search' },
          { syntax: 'date:>2024-01-01', description: 'After specific date' },
          { syntax: 'views:>100', description: 'Views greater than 100' },
          { syntax: '"exact phrase"', description: 'Exact phrase match' },
          { syntax: 'keyword1 AND keyword2', description: 'Contains both terms' },
          { syntax: 'keyword1 OR keyword2', description: 'Contains either term' },
          { syntax: '-exclude', description: 'Exclude articles with this term' },
          { syntax: 'sort:views:desc', description: 'Sort by views descending' },
          { syntax: 'sort:date:asc', description: 'Sort by date ascending' }
        ]
      }
    }
  }

  const defaultTrigger = compact ? (
    // Compact/Mobile version - icon only
    <Button variant="ghost" size="sm" className="w-9 h-9 p-0" title={currentLocale === 'zh' ? '搜索文章' : 'Search Articles'}>
      <Search className="h-4 w-4" />
    </Button>
  ) : (
    // Full desktop version
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
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={placeholder || (currentLocale === 'zh' ? '输入关键词搜索文章...' : 'Enter keywords to search articles...')}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className={`pl-10 pr-20 ${syntaxError ? 'border-red-500 focus:ring-red-500' : ''}`}
                autoFocus
              />
              <div className="absolute right-1 top-1 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  title={currentLocale === 'zh' ? '高级筛选' : 'Advanced filters'}
                >
                  <Filter className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowHelp(!showHelp)}
                  title={currentLocale === 'zh' ? '搜索语法帮助' : 'Search syntax help'}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
                {query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Advanced Search Help */}
            {showHelp && (
              <Card className="border-muted animate-in slide-in-from-top-2 duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">
                      {getSearchHelp().title}
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => setShowHelp(false)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {getSearchHelp().examples.map((example, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => {
                          setQuery(example.syntax)
                          setShowHelp(false)
                        }}
                      >
                        <code className="font-mono text-primary bg-background px-1 rounded">
                          {example.syntax}
                        </code>
                        <span className="text-muted-foreground">
                          {example.description}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {currentLocale === 'zh' ? 
                      '点击示例可直接使用，支持组合多个语法' : 
                      'Click examples to use directly, supports combining multiple syntax'}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <Card className="border-muted animate-in slide-in-from-top-2 duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      {currentLocale === 'zh' ? '高级筛选' : 'Advanced Filters'}
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => setShowAdvancedFilters(false)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Category Filter */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {currentLocale === 'zh' ? '分类' : 'Category'}
                      </label>
                      <Input
                        placeholder={currentLocale === 'zh' ? '输入分类名称' : 'Enter category name'}
                        value={filters.category}
                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                        className="h-8"
                      />
                    </div>

                    {/* Min Views Filter */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {currentLocale === 'zh' ? '最少浏览量' : 'Min Views'}
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.minViews}
                        onChange={(e) => setFilters(prev => ({ ...prev, minViews: e.target.value }))}
                        className="h-8"
                      />
                    </div>

                    {/* Date From */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {currentLocale === 'zh' ? '开始日期' : 'From Date'}
                      </label>
                      <Input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                        className="h-8"
                      />
                    </div>

                    {/* Date To */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {currentLocale === 'zh' ? '结束日期' : 'To Date'}
                      </label>
                      <Input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                        className="h-8"
                      />
                    </div>

                    {/* Sort By */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {currentLocale === 'zh' ? '排序字段' : 'Sort By'}
                      </label>
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="date">{currentLocale === 'zh' ? '日期' : 'Date'}</option>
                        <option value="views">{currentLocale === 'zh' ? '浏览量' : 'Views'}</option>
                        <option value="title">{currentLocale === 'zh' ? '标题' : 'Title'}</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {currentLocale === 'zh' ? '排序顺序' : 'Sort Order'}
                      </label>
                      <select
                        value={filters.sortOrder}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="desc">{currentLocale === 'zh' ? '降序' : 'Descending'}</option>
                        <option value="asc">{currentLocale === 'zh' ? '升序' : 'Ascending'}</option>
                      </select>
                    </div>
                  </div>

                  {/* Filter Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      onClick={applyAdvancedFilters}
                      className="flex-1"
                    >
                      {currentLocale === 'zh' ? '应用筛选' : 'Apply Filters'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={resetFilters}
                    >
                      {currentLocale === 'zh' ? '重置' : 'Reset'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Syntax Error Display */}
            {syntaxError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 animate-in slide-in-from-top-1">
                ⚠️ {syntaxError}
              </div>
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
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <span>
                  {currentLocale === 'zh' 
                    ? `找到 ${results.pagination.total} 篇文章`
                    : `Found ${results.pagination.total} articles`
                  }
                </span>
                {(results as any).sort_by && (
                  <span className="text-xs flex items-center gap-1">
                    {currentLocale === 'zh' ? '排序：' : 'Sort: '}
                    {(results as any).sort_by === 'views' && currentLocale === 'zh' ? '浏览量' :
                     (results as any).sort_by === 'date' && currentLocale === 'zh' ? '日期' :
                     (results as any).sort_by === 'title' && currentLocale === 'zh' ? '标题' :
                     (results as any).sort_by}
                    {(results as any).sort_order === 'desc' ? ' ↓' : ' ↑'}
                  </span>
                )}
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
                          <h3 
                            className="font-medium text-foreground group-hover:text-primary line-clamp-2"
                            dangerouslySetInnerHTML={{
                              __html: highlightSearchTerms(article.title, getHighlightQuery())
                            }}
                          />
                          <Badge variant="outline" className="text-xs shrink-0">
                            {article.category?.name}
                          </Badge>
                        </div>
                        
                        {article.summary && (
                          <p 
                            className="text-sm text-muted-foreground line-clamp-2"
                            dangerouslySetInnerHTML={{
                              __html: highlightSearchTerms(
                                truncateContent(extractTextFromMarkdown(article.summary), 120),
                                getHighlightQuery()
                              )
                            }}
                          />
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDate(article.created_at)}</span>
                          <div className="flex items-center gap-2">
                            {article.view_count !== undefined && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                {article.view_count} {currentLocale === 'zh' ? '次阅读' : 'views'}
                              </span>
                            )}
                            {/* Relevance indicator could go here */}
                          </div>
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