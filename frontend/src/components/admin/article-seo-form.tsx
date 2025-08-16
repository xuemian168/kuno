"use client"

import { useState, useEffect } from "react"
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Globe, 
  Hash, 
  Link, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Zap,
  Eye
} from "lucide-react"
import { Article } from "@/lib/api"
import { seoAIService, initializeSEOAIService } from "@/services/seo-ai"
import { SEOAnalyzer } from "@/services/seo-ai/analyzer"
import { SEOAnalysisResult, SEOAIResult } from "@/services/seo-ai/types"

interface Translation {
  language: string
  title: string
  content: string
  summary: string
}

interface SEOData {
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  seo_slug?: string
}

interface ArticleSEOFormProps {
  article?: Article
  translations: Translation[]
  activeLanguage: string
  locale: string
  onSEOChange: (seoData: SEOData) => void
}

export function ArticleSEOForm({ 
  article, 
  translations, 
  activeLanguage, 
  locale,
  onSEOChange 
}: ArticleSEOFormProps) {
  const t = useTranslations()

  // Get current SEO data from article (global SEO fields)
  const [currentSEO, setCurrentSEO] = useState<SEOData>({
    seo_title: article?.seo_title || '',
    seo_description: article?.seo_description || '',
    seo_keywords: article?.seo_keywords || '',
    seo_slug: article?.seo_slug || ''
  })

  // AI enhancement states
  const [isGenerating, setIsGenerating] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<SEOAnalysisResult | null>(null)
  const [hasAIProvider, setHasAIProvider] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('optimize')
  const [focusKeyword, setFocusKeyword] = useState('')

  // Initialize AI service
  useEffect(() => {
    const initAI = async () => {
      try {
        // Try to initialize with stored configuration
        // This would come from settings in a real implementation
        setHasAIProvider(seoAIService.isConfigured())
      } catch (error) {
        console.error('Failed to initialize SEO AI service:', error)
      }
    }
    
    initAI()
  }, [])

  // Update analysis when SEO data changes
  useEffect(() => {
    if (currentSEO.seo_title || currentSEO.seo_description || currentSEO.seo_keywords) {
      performAnalysis()
    }
  }, [currentSEO, focusKeyword])

  const handleSEOFieldChange = (field: keyof SEOData, value: string) => {
    const updatedSEO = { ...currentSEO, [field]: value }
    setCurrentSEO(updatedSEO)
    onSEOChange(updatedSEO)
  }

  // Perform SEO analysis
  const performAnalysis = async () => {
    if (!currentSEO.seo_title && !currentSEO.seo_description) return

    try {
      const translation = translations.find(t => t.language === activeLanguage)
      const content = translation?.content || article?.content || ''
      const title = currentSEO.seo_title || translation?.title || article?.title || ''
      const description = currentSEO.seo_description || translation?.summary || article?.summary || ''

      const analysis = SEOAnalyzer.analyzeSEOContent({
        title,
        content,
        description,
        keywords: currentSEO.seo_keywords,
        slug: currentSEO.seo_slug,
        meta_title: currentSEO.seo_title,
        meta_description: currentSEO.seo_description
      }, activeLanguage, focusKeyword)

      setAnalysisResult(analysis)
    } catch (error) {
      console.error('SEO analysis failed:', error)
    }
  }

  // Generate complete SEO with AI
  const handleGenerateCompleteSEO = async () => {
    if (!hasAIProvider) {
      setAiError('请先在设置中配置AI服务')
      return
    }

    setIsGenerating(true)
    setAiError(null)

    try {
      const translation = translations.find(t => t.language === activeLanguage)
      const content = translation?.content || article?.content || ''
      const title = translation?.title || article?.title || ''
      const summary = translation?.summary || article?.summary || ''

      if (!content) {
        throw new Error('内容为空，无法生成SEO')
      }

      const result = await seoAIService.generateCompleteSEO({
        title,
        content,
        description: summary,
        keywords: focusKeyword
      }, activeLanguage, {
        title_options: { focus_keyword: focusKeyword },
        description_options: { focus_keyword: focusKeyword },
        keyword_options: { focus_topics: focusKeyword ? [focusKeyword] : [] }
      })

      // Update SEO fields with AI results
      const updatedSEO = {
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        seo_keywords: result.keywords.join(', '),
        seo_slug: result.slug
      }

      setCurrentSEO(updatedSEO)
      onSEOChange(updatedSEO)
      setAnalysisResult(result.analysis)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成SEO失败'
      setAiError(errorMessage)
      console.error('AI SEO generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate individual SEO elements
  const handleGenerateSEOTitle = async () => {
    if (!hasAIProvider) return

    setIsGenerating(true)
    try {
      const translation = translations.find(t => t.language === activeLanguage)
      const content = translation?.content || article?.content || ''
      
      const result = await seoAIService.generateSEOTitle(content, activeLanguage, {
        focus_keyword: focusKeyword,
        maxLength: 60
      })

      handleSEOFieldChange('seo_title', result.content)
    } catch (error) {
      setAiError(error instanceof Error ? error.message : '生成标题失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateSEODescription = async () => {
    if (!hasAIProvider) return

    setIsGenerating(true)
    try {
      const translation = translations.find(t => t.language === activeLanguage)
      const content = translation?.content || article?.content || ''
      
      const result = await seoAIService.generateSEODescription(content, activeLanguage, {
        focus_keyword: focusKeyword,
        maxLength: 160,
        includeCallToAction: true
      })

      handleSEOFieldChange('seo_description', result.content)
    } catch (error) {
      setAiError(error instanceof Error ? error.message : '生成描述失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExtractKeywords = async () => {
    if (!hasAIProvider) return

    setIsGenerating(true)
    try {
      const translation = translations.find(t => t.language === activeLanguage)
      const content = translation?.content || article?.content || ''
      
      const result = await seoAIService.extractKeywords(content, activeLanguage, {
        maxKeywords: 15
      })

      const allKeywords = [
        ...result.primary_keywords.map(k => k.keyword),
        ...result.secondary_keywords.map(k => k.keyword)
      ]

      handleSEOFieldChange('seo_keywords', allKeywords.join(', '))
    } catch (error) {
      setAiError(error instanceof Error ? error.message : '提取关键词失败')
    } finally {
      setIsGenerating(false)
    }
  }

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Get score badge variant
  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          {t('seo.seoSettings')}
          {analysisResult && (
            <Badge variant={getScoreBadgeVariant(analysisResult.overall_score)}>
              SEO得分: {analysisResult.overall_score}/100
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Error Alert */}
        {aiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{aiError}</AlertDescription>
          </Alert>
        )}

        {/* Focus Keyword */}
        <div className="space-y-2">
          <Label htmlFor="focus-keyword" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            焦点关键词
          </Label>
          <Input
            id="focus-keyword"
            value={focusKeyword}
            onChange={(e) => setFocusKeyword(e.target.value)}
            placeholder="输入主要关键词..."
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            设置焦点关键词以获得更准确的SEO分析和建议
          </p>
        </div>

        {/* AI Generation Controls */}
        {hasAIProvider && (
          <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
            <Button
              onClick={handleGenerateCompleteSEO}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI智能优化全部
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateSEOTitle}
              disabled={isGenerating}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              生成标题
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateSEODescription}
              disabled={isGenerating}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              生成描述
            </Button>
            <Button
              variant="outline"
              onClick={handleExtractKeywords}
              disabled={isGenerating}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              提取关键词
            </Button>
          </div>
        )}

        {/* Tabs for different SEO sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="optimize">SEO优化</TabsTrigger>
            <TabsTrigger value="analysis">分析报告</TabsTrigger>
            <TabsTrigger value="preview">搜索预览</TabsTrigger>
          </TabsList>

          <TabsContent value="optimize" className="space-y-6">
            {/* SEO Title */}
            <div className="space-y-2">
              <Label htmlFor="seo-title" className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  SEO标题
                </div>
                {analysisResult?.title_analysis && (
                  <Badge variant={getScoreBadgeVariant(analysisResult.title_analysis.score)}>
                    {analysisResult.title_analysis.score}/100
                  </Badge>
                )}
              </Label>
              <Input
                id="seo-title"
                value={currentSEO.seo_title}
                onChange={(e) => handleSEOFieldChange('seo_title', e.target.value)}
                placeholder="输入SEO标题..."
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>建议长度: 30-60字符</span>
                <span className={(currentSEO.seo_title?.length || 0) > 60 ? 'text-red-500' : ''}>
                  {currentSEO.seo_title?.length || 0}/60
                </span>
              </div>
              {(analysisResult?.title_analysis?.issues?.length || 0) > 0 && (
                <div className="text-sm text-amber-600">
                  <span className="font-medium">建议：</span>
                  {analysisResult?.title_analysis?.suggestions?.join('; ')}
                </div>
              )}
            </div>

            {/* SEO Description */}
            <div className="space-y-2">
              <Label htmlFor="seo-description" className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  SEO描述
                </div>
                {analysisResult?.description_analysis && (
                  <Badge variant={getScoreBadgeVariant(analysisResult.description_analysis.score)}>
                    {analysisResult.description_analysis.score}/100
                  </Badge>
                )}
              </Label>
              <Textarea
                id="seo-description"
                value={currentSEO.seo_description}
                onChange={(e) => handleSEOFieldChange('seo_description', e.target.value)}
                placeholder="输入SEO描述..."
                className="min-h-[100px] resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>建议长度: 120-160字符</span>
                <span className={(currentSEO.seo_description?.length || 0) > 160 ? 'text-red-500' : ''}>
                  {currentSEO.seo_description?.length || 0}/160
                </span>
              </div>
              {(analysisResult?.description_analysis?.issues?.length || 0) > 0 && (
                <div className="text-sm text-amber-600">
                  <span className="font-medium">建议：</span>
                  {analysisResult?.description_analysis?.suggestions?.join('; ')}
                </div>
              )}
            </div>

            {/* SEO Keywords */}
            <div className="space-y-2">
              <Label htmlFor="seo-keywords" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                SEO关键词
              </Label>
              <Input
                id="seo-keywords"
                value={currentSEO.seo_keywords}
                onChange={(e) => handleSEOFieldChange('seo_keywords', e.target.value)}
                placeholder="输入关键词，用逗号分隔..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                使用逗号分隔多个关键词，建议3-5个主要关键词
              </p>
            </div>

            {/* SEO Slug */}
            <div className="space-y-2">
              <Label htmlFor="seo-slug" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                SEO URL别名
              </Label>
              <div className="flex gap-2">
                <Input
                  id="seo-slug"
                  value={currentSEO.seo_slug}
                  onChange={(e) => handleSEOFieldChange('seo_slug', e.target.value)}
                  placeholder="url-friendly-slug"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const translation = translations.find(t => t.language === activeLanguage)
                    const title = translation?.title || article?.title || ''
                    const slug = generateSlug(title)
                    handleSEOFieldChange('seo_slug', slug)
                  }}
                  className="px-3"
                >
                  生成
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                用于搜索引擎友好的URL，只能包含字母、数字和连字符
              </p>
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            {analysisResult ? (
              <>
                {/* Overall Score */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">SEO总体评分</h3>
                    <Badge variant={getScoreBadgeVariant(analysisResult.overall_score)} className="text-lg px-3 py-1">
                      {analysisResult.overall_score}/100
                    </Badge>
                  </div>
                  <Progress value={analysisResult.overall_score} className="h-2" />
                </div>

                {/* Detailed Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">标题优化</span>
                      <span className={`text-sm font-medium ${getScoreColor(analysisResult.title_analysis.score)}`}>
                        {analysisResult.title_analysis.score}
                      </span>
                    </div>
                    <Progress value={analysisResult.title_analysis.score} className="h-1" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">描述优化</span>
                      <span className={`text-sm font-medium ${getScoreColor(analysisResult.description_analysis.score)}`}>
                        {analysisResult.description_analysis.score}
                      </span>
                    </div>
                    <Progress value={analysisResult.description_analysis.score} className="h-1" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">内容结构</span>
                      <span className={`text-sm font-medium ${getScoreColor(analysisResult.content_analysis.score)}`}>
                        {analysisResult.content_analysis.score}
                      </span>
                    </div>
                    <Progress value={analysisResult.content_analysis.score} className="h-1" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">关键词优化</span>
                      <span className={`text-sm font-medium ${getScoreColor(analysisResult.keyword_analysis.score)}`}>
                        {analysisResult.keyword_analysis.score}
                      </span>
                    </div>
                    <Progress value={analysisResult.keyword_analysis.score} className="h-1" />
                  </div>
                </div>

                {/* Suggestions */}
                {analysisResult.suggestions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">优化建议</h3>
                    {analysisResult.suggestions.map((suggestion, index) => (
                      <Alert key={index} variant={suggestion.priority === 'high' ? 'destructive' : 'default'}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <div className="font-medium">{suggestion.message}</div>
                            <div className="text-sm">{suggestion.suggestion}</div>
                            <div className="text-xs text-muted-foreground">影响：{suggestion.impact}</div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                填写SEO信息后将显示分析结果
              </div>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                搜索结果预览
              </Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="text-blue-600 text-lg font-medium truncate hover:text-blue-800 cursor-pointer">
                  {currentSEO.seo_title || '您的SEO标题将显示在这里'}
                </div>
                <div className="text-green-600 text-sm truncate mt-1">
                  example.com/article/{currentSEO.seo_slug || 'your-article-slug'}
                </div>
                <div className="text-gray-600 text-sm mt-2 line-clamp-2">
                  {currentSEO.seo_description || '您的SEO描述将显示在这里，告诉用户这篇文章的主要内容...'}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                这是您的文章在Google等搜索引擎中的显示效果
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* AI Service Status */}
        {!hasAIProvider && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              配置AI服务后可使用智能SEO优化功能。前往设置页面配置OpenAI或Gemini API。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}