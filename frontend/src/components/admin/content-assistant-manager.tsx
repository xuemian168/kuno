'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Lightbulb, 
  TrendingUp, 
  Tags, 
  Search, 
  RefreshCw, 
  CheckCircle,
  AlertCircle,
  Sparkles,
  Target,
  BarChart3,
  BookOpen,
  Zap,
  Brain,
  Loader2,
  Copy,
  Download
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useClientLocale } from '@/hooks/useClientLocale'

interface TopicGap {
  topic: string
  description: string
  related_topics: string[]
  priority: number
  language: string
  suggested_titles: string[]
  keywords: string[]
}

interface WritingIdea {
  title: string
  description: string
  category: string
  keywords: string[]
  difficulty_level: string
  estimated_length: number
  inspiration: string
  language: string
  relevance_score: number
}

interface SmartTag {
  tag: string
  confidence: number
  type: string
  context: string
}

interface SEOKeyword {
  keyword: string
  search_volume: number
  difficulty: number
  relevance: number
  type: string
  suggestions: string[]
  language: string
}

interface TopicCluster {
  name: string
  articles: number[]
  keywords: string[]
  size: number
  coherence: number
}

interface ContentGapAnalysis {
  total_articles: number
  language_distribution: Record<string, number>
  topic_clusters: TopicCluster[]
  identified_gaps: TopicGap[]
  recommendations: WritingIdea[]
  coverage_score: number
  generated_at: string
}

interface ContentAssistantManagerProps {
  className?: string
}

export function ContentAssistantManager({ className = '' }: ContentAssistantManagerProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gapAnalysis, setGapAnalysis] = useState<ContentGapAnalysis | null>(null)
  const [writingIdeas, setWritingIdeas] = useState<WritingIdea[]>([])
  const [smartTags, setSmartTags] = useState<SmartTag[]>([])
  const [seoKeywords, setSeoKeywords] = useState<SEOKeyword[]>([])
  
  // Form states
  const [tagContent, setTagContent] = useState('')
  const [keywordContent, setKeywordContent] = useState('')
  const [primaryKeyword, setPrimaryKeyword] = useState('')
  const [inspirationCategory, setInspirationCategory] = useState('')
  
  const { currentLocale } = useClientLocale()

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchTopicGaps()
    }
  }, [currentLocale, mounted])

  const fetchTopicGaps = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getTopicGaps(currentLocale)
      setGapAnalysis(response.analysis)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch topic gaps'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchWritingInspiration = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getWritingInspiration({
        language: currentLocale,
        limit: 10,
        category: inspirationCategory || undefined
      })
      setWritingIdeas(response.ideas)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch writing inspiration'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const generateSmartTags = async () => {
    if (!tagContent.trim()) {
      setError(currentLocale === 'zh' ? '请输入内容以生成标签' : 'Please enter content to generate tags')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.generateSmartTags({
        content: tagContent,
        language: currentLocale
      })
      setSmartTags(response.tags)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate smart tags'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const recommendSEOKeywords = async () => {
    if (!keywordContent.trim()) {
      setError(currentLocale === 'zh' ? '请输入内容以推荐关键词' : 'Please enter content to recommend keywords')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.recommendSEOKeywords({
        content: keywordContent,
        language: currentLocale,
        primary_keyword: primaryKeyword
      })
      setSeoKeywords(response.keywords)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to recommend SEO keywords'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You might want to show a toast notification here
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(currentLocale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  const getKeywordTypeColor = (type: string) => {
    switch (type) {
      case 'primary': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
      case 'secondary': return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
      case 'long-tail': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  // Prevent hydration issues by not rendering until mounted
  if (!mounted) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {currentLocale === 'zh' ? '智能内容助手' : 'Content Assistant'}
            </h1>
            <p className="text-muted-foreground">
              {currentLocale === 'zh' 
                ? 'AI驱动的内容创作和优化工具' 
                : 'AI-powered content creation and optimization tools'}
            </p>
          </div>
          <Button onClick={fetchTopicGaps} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {currentLocale === 'zh' ? '刷新' : 'Refresh'}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="gaps" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gaps" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              {currentLocale === 'zh' ? '内容空白' : 'Content Gaps'}
            </TabsTrigger>
            <TabsTrigger value="inspiration" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              {currentLocale === 'zh' ? '写作灵感' : 'Writing Ideas'}
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              {currentLocale === 'zh' ? '智能标签' : 'Smart Tags'}
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              {currentLocale === 'zh' ? 'SEO关键词' : 'SEO Keywords'}
            </TabsTrigger>
          </TabsList>

          {/* Content Gaps Tab */}
          <TabsContent value="gaps" className="space-y-6">
            {gapAnalysis && (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {currentLocale === 'zh' ? '文章总数' : 'Total Articles'}
                          </p>
                          <p className="text-2xl font-bold">{gapAnalysis?.total_articles || 0}</p>
                        </div>
                        <BookOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {currentLocale === 'zh' ? '覆盖率评分' : 'Coverage Score'}
                          </p>
                          <p className="text-2xl font-bold">
                            {Math.round((gapAnalysis?.coverage_score || 0) * 100)}%
                          </p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <Progress 
                        value={(gapAnalysis?.coverage_score || 0) * 100} 
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {currentLocale === 'zh' ? '主题集群' : 'Topic Clusters'}
                          </p>
                          <p className="text-2xl font-bold">{gapAnalysis?.topic_clusters?.length || 0}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Topic Clusters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      {currentLocale === 'zh' ? '主题集群分析' : 'Topic Cluster Analysis'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(gapAnalysis?.topic_clusters || []).map((cluster, index) => (
                        <Card key={index} className="border-muted">
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{cluster.name}</h4>
                                <Badge variant="secondary">{cluster.size}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {currentLocale === 'zh' ? '关键词' : 'Keywords'}: {cluster.keywords.join(', ')}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {currentLocale === 'zh' ? '一致性' : 'Coherence'}:
                                </span>
                                <Progress value={cluster.coherence * 100} className="flex-1 h-2" />
                                <span className="text-xs">{Math.round(cluster.coherence * 100)}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Identified Gaps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      {currentLocale === 'zh' ? '识别的内容空白' : 'Identified Content Gaps'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(gapAnalysis?.identified_gaps || []).map((gap, index) => (
                        <Card key={index} className="border-muted">
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-medium">{gap.topic}</h4>
                                  <p className="text-sm text-muted-foreground">{gap.description}</p>
                                </div>
                                <Badge 
                                  variant={gap.priority > 0.7 ? "destructive" : gap.priority > 0.4 ? "default" : "secondary"}
                                >
                                  {currentLocale === 'zh' ? '优先级' : 'Priority'}: {Math.round(gap.priority * 100)}%
                                </Badge>
                              </div>
                              
                              <div>
                                <p className="text-sm font-medium mb-2">
                                  {currentLocale === 'zh' ? '建议标题' : 'Suggested Titles'}:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {(gap?.suggested_titles || []).map((title, titleIndex) => (
                                    <Badge 
                                      key={titleIndex} 
                                      variant="outline" 
                                      className="cursor-pointer hover:bg-muted"
                                      onClick={() => copyToClipboard(title)}
                                    >
                                      {title}
                                      <Copy className="h-3 w-3 ml-1" />
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-sm font-medium mb-2">
                                  {currentLocale === 'zh' ? '相关关键词' : 'Related Keywords'}:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {(gap?.keywords || []).map((keyword, keywordIndex) => (
                                    <Badge key={keywordIndex} variant="secondary" className="text-xs">
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Writing Inspiration Tab */}
          <TabsContent value="inspiration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  {currentLocale === 'zh' ? '获取写作灵感' : 'Get Writing Inspiration'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="category">
                      {currentLocale === 'zh' ? '分类 (可选)' : 'Category (Optional)'}
                    </Label>
                    <Input
                      id="category"
                      value={inspirationCategory}
                      onChange={(e) => setInspirationCategory(e.target.value)}
                      placeholder={currentLocale === 'zh' ? '输入分类名称' : 'Enter category name'}
                    />
                  </div>
                  <Button onClick={fetchWritingInspiration} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Sparkles className="h-4 w-4 mr-2" />
                    {currentLocale === 'zh' ? '获取灵感' : 'Get Ideas'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {(writingIdeas || []).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(writingIdeas || []).map((idea, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-lg leading-tight">{idea.title}</h3>
                          <Badge className={getDifficultyColor(idea.difficulty_level)}>
                            {idea.difficulty_level}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{idea.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {idea.estimated_length} {currentLocale === 'zh' ? '词' : 'words'}
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-4 w-4" />
                            {Math.round(idea.relevance_score * 100)}% {currentLocale === 'zh' ? '相关性' : 'relevance'}
                          </span>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-2">
                            {currentLocale === 'zh' ? '关键词' : 'Keywords'}:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(idea?.keywords || []).map((keyword, keywordIndex) => (
                              <Badge key={keywordIndex} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm italic">{idea.inspiration}</p>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => copyToClipboard(idea.title)}
                          className="w-full"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {currentLocale === 'zh' ? '复制标题' : 'Copy Title'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Smart Tags Tab */}
          <TabsContent value="tags" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5" />
                  {currentLocale === 'zh' ? '生成智能标签' : 'Generate Smart Tags'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tag-content">
                    {currentLocale === 'zh' ? '文章内容' : 'Article Content'}
                  </Label>
                  <Textarea
                    id="tag-content"
                    value={tagContent}
                    onChange={(e) => setTagContent(e.target.value)}
                    placeholder={currentLocale === 'zh' 
                      ? '输入文章内容以生成智能标签...' 
                      : 'Enter article content to generate smart tags...'}
                    rows={6}
                  />
                </div>
                <Button onClick={generateSmartTags} disabled={loading || !tagContent.trim()}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Zap className="h-4 w-4 mr-2" />
                  {currentLocale === 'zh' ? '生成标签' : 'Generate Tags'}
                </Button>
              </CardContent>
            </Card>

            {smartTags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {currentLocale === 'zh' ? '生成的智能标签' : 'Generated Smart Tags'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(smartTags || []).map((tag, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tag.tag}</span>
                            <Badge variant="outline">{tag.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{tag.context}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm font-medium">{Math.round(tag.confidence * 100)}%</p>
                            <p className="text-xs text-muted-foreground">
                              {currentLocale === 'zh' ? '置信度' : 'confidence'}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(tag.tag)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SEO Keywords Tab */}
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  {currentLocale === 'zh' ? '推荐SEO关键词' : 'Recommend SEO Keywords'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="keyword-content">
                    {currentLocale === 'zh' ? '文章内容' : 'Article Content'}
                  </Label>
                  <Textarea
                    id="keyword-content"
                    value={keywordContent}
                    onChange={(e) => setKeywordContent(e.target.value)}
                    placeholder={currentLocale === 'zh' 
                      ? '输入文章内容以推荐SEO关键词...' 
                      : 'Enter article content to recommend SEO keywords...'}
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="primary-keyword">
                    {currentLocale === 'zh' ? '主要关键词 (可选)' : 'Primary Keyword (Optional)'}
                  </Label>
                  <Input
                    id="primary-keyword"
                    value={primaryKeyword}
                    onChange={(e) => setPrimaryKeyword(e.target.value)}
                    placeholder={currentLocale === 'zh' ? '输入主要关键词' : 'Enter primary keyword'}
                  />
                </div>
                <Button onClick={recommendSEOKeywords} disabled={loading || !keywordContent.trim()}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Search className="h-4 w-4 mr-2" />
                  {currentLocale === 'zh' ? '推荐关键词' : 'Recommend Keywords'}
                </Button>
              </CardContent>
            </Card>

            {seoKeywords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {currentLocale === 'zh' ? '推荐的SEO关键词' : 'Recommended SEO Keywords'}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const keywordList = (seoKeywords || []).map(k => k?.keyword || '').join('\n')
                        copyToClipboard(keywordList)
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {currentLocale === 'zh' ? '导出全部' : 'Export All'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(seoKeywords || []).map((keyword, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-lg">{keyword.keyword}</span>
                              <Badge className={getKeywordTypeColor(keyword.type)}>
                                {keyword.type}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">
                                  {currentLocale === 'zh' ? '搜索量' : 'Search Volume'}
                                </p>
                                <p className="font-medium">{keyword.search_volume.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  {currentLocale === 'zh' ? '难度' : 'Difficulty'}
                                </p>
                                <p className="font-medium">{Math.round(keyword.difficulty * 100)}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  {currentLocale === 'zh' ? '相关性' : 'Relevance'}
                                </p>
                                <p className="font-medium">{Math.round(keyword.relevance * 100)}%</p>
                              </div>
                              <div className="flex items-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => copyToClipboard(keyword.keyword)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {keyword.suggestions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">
                              {currentLocale === 'zh' ? '使用建议' : 'Usage Suggestions'}:
                            </p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                              {(keyword?.suggestions || []).map((suggestion, suggestionIndex) => (
                                <li key={suggestionIndex}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}