"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from 'next-intl'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MarkdownEditor } from "@/components/markdown/markdown-editor"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"
import { apiClient, Article, Category } from "@/lib/api"
import { 
  Languages, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3,
  SplitSquareHorizontal,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react"

interface Translation {
  language: string
  title: string
  content: string
  summary: string
}

interface ArticleTranslationFormProps {
  article?: Article
  isEditing?: boolean
  locale?: string
}

const availableLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' }
]

export function ArticleTranslationForm({ article, isEditing = false, locale = 'zh' }: ArticleTranslationFormProps) {
  const router = useRouter()
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [viewMode, setViewMode] = useState<'tabs' | 'split'>('split')
  const [showPreview, setShowPreview] = useState(false)
  const [sourceLanguage, setSourceLanguage] = useState(locale)
  const [targetLanguage, setTargetLanguage] = useState(locale === 'zh' ? 'en' : 'zh')
  
  const [formData, setFormData] = useState({
    title: article?.title || "",
    content: article?.content || "",
    content_type: article?.content_type || "markdown",
    summary: article?.summary || "",
    category_id: article?.category_id || 0
  })
  
  const [translations, setTranslations] = useState<Translation[]>(() => {
    if (article?.translations && Array.isArray(article.translations)) {
      return article.translations.map((t: any) => ({
        language: t.language,
        title: t.title || '',
        content: t.content || '',
        summary: t.summary || ''
      }))
    }
    return []
  })

  // Calculate translation progress
  const translationProgress = useMemo(() => {
    const progress: Record<string, number> = {}
    
    availableLanguages.forEach(lang => {
      const translation = translations.find(t => t.language === lang.code)
      if (!translation) {
        progress[lang.code] = 0
        return
      }
      
      let completed = 0
      let total = 3 // title, content, summary
      
      if (translation.title.trim()) completed++
      if (translation.content.trim()) completed++
      if (translation.summary.trim()) completed++
      
      progress[lang.code] = Math.round((completed / total) * 100)
    })
    
    return progress
  }, [translations])

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const values = Object.values(translationProgress)
    if (values.length === 0) return 0
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }, [translationProgress])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await apiClient.getCategories({ lang: locale })
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }

    fetchCategories()
  }, [locale])

  const getTranslation = (language: string) => {
    return translations.find(t => t.language === language) || {
      language,
      title: '',
      content: '',
      summary: ''
    }
  }

  const updateTranslation = (language: string, field: string, value: string) => {
    setTranslations(prev => {
      const newTranslations = [...prev]
      const existingIndex = newTranslations.findIndex(t => t.language === language)
      
      if (existingIndex >= 0) {
        newTranslations[existingIndex] = {
          ...newTranslations[existingIndex],
          [field]: value
        }
      } else {
        newTranslations.push({
          language,
          title: field === 'title' ? value : '',
          content: field === 'content' ? value : '',
          summary: field === 'summary' ? value : ''
        })
      }
      
      return newTranslations
    })
  }

  const copyFromSource = (field: 'title' | 'content' | 'summary') => {
    const sourceTranslation = getTranslation(sourceLanguage)
    const value = sourceLanguage === locale 
      ? formData[field] 
      : sourceTranslation[field]
    
    if (targetLanguage === locale) {
      setFormData(prev => ({ ...prev, [field]: value }))
    } else {
      updateTranslation(targetLanguage, field, value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const articleData = {
        ...formData,
        translations: translations.filter(t => t.title.trim() || t.content.trim() || t.summary.trim())
      }

      if (isEditing && article) {
        await apiClient.updateArticle(article.id, articleData)
      } else {
        await apiClient.createArticle(articleData)
      }
      router.push('/admin')
    } catch (error) {
      console.error('Failed to save article:', error)
      alert('Failed to save article')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateSummary = (language: string) => {
    const content = language === locale 
      ? formData.content 
      : getTranslation(language).content
    
    const summary = content.slice(0, 200) + (content.length > 200 ? "..." : "")
    
    if (language === locale) {
      setFormData(prev => ({ ...prev, summary }))
    } else {
      updateTranslation(language, 'summary', summary)
    }
  }

  const sourceTranslation = sourceLanguage === locale ? formData : getTranslation(sourceLanguage)
  const targetTranslation = targetLanguage === locale ? formData : getTranslation(targetLanguage)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="max-w-7xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {isEditing ? t('article.editArticle') : t('article.createArticle')}
            </CardTitle>
            
            <div className="flex items-center gap-4">
              {/* Translation Progress */}
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('article.translationProgress')}:</span>
                <div className="flex items-center gap-2">
                  <Progress value={overallProgress} className="w-[100px]" />
                  <span className="text-sm font-medium">{overallProgress}%</span>
                </div>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === 'split' ? 'default' : 'outline'}
                  onClick={() => setViewMode('split')}
                >
                  <SplitSquareHorizontal className="h-4 w-4 mr-1" />
                  {t('article.splitView')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === 'tabs' ? 'default' : 'outline'}
                  onClick={() => setViewMode('tabs')}
                >
                  <Languages className="h-4 w-4 mr-1" />
                  {t('article.tabView')}
                </Button>
              </div>
              
              {/* Preview Toggle */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('article.category')}</Label>
              <Select
                value={formData.category_id.toString()}
                onValueChange={(value) => handleChange('category_id', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('article.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Language Progress Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableLanguages.map(lang => (
                <Card key={lang.code} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{lang.name}</span>
                    {translationProgress[lang.code] === 100 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : translationProgress[lang.code] > 0 ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <Progress value={translationProgress[lang.code]} className="h-2" />
                  <span className="text-xs text-muted-foreground mt-1">
                    {translationProgress[lang.code]}% {t('common.completed')}
                  </span>
                </Card>
              ))}
            </div>

            <Separator />

            {/* Translation Editor */}
            {viewMode === 'split' ? (
              <div className="space-y-4">
                {/* Language Selectors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('article.sourceLanguage')}</Label>
                    <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLanguages.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('article.targetLanguage')}</Label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLanguages.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Split View Editor */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Source Language */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('article.title')}</Label>
                      <Input
                        value={sourceTranslation.title}
                        onChange={(e) => {
                          if (sourceLanguage === locale) {
                            handleChange('title', e.target.value)
                          } else {
                            updateTranslation(sourceLanguage, 'title', e.target.value)
                          }
                        }}
                        placeholder={t('article.enterTitle')}
                        disabled={showPreview}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('article.summary')}</Label>
                      <Textarea
                        value={sourceTranslation.summary}
                        onChange={(e) => {
                          if (sourceLanguage === locale) {
                            handleChange('summary', e.target.value)
                          } else {
                            updateTranslation(sourceLanguage, 'summary', e.target.value)
                          }
                        }}
                        placeholder={t('article.enterSummary')}
                        rows={3}
                        disabled={showPreview}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('article.content')}</Label>
                      {showPreview ? (
                        <Card className="p-4 min-h-[500px] overflow-auto">
                          <MarkdownRenderer content={sourceTranslation.content} />
                        </Card>
                      ) : (
                        <MarkdownEditor
                          value={sourceTranslation.content}
                          onChange={(value) => {
                            if (sourceLanguage === locale) {
                              handleChange('content', value)
                            } else {
                              updateTranslation(sourceLanguage, 'content', value)
                            }
                          }}
                          placeholder={t('article.enterContent')}
                          className="min-h-[500px]"
                        />
                      )}
                    </div>
                  </div>

                  {/* Target Language */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t('article.title')}</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => copyFromSource('title')}
                          disabled={showPreview}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {t('article.copyFromSource')}
                        </Button>
                      </div>
                      <Input
                        value={targetTranslation.title}
                        onChange={(e) => {
                          if (targetLanguage === locale) {
                            handleChange('title', e.target.value)
                          } else {
                            updateTranslation(targetLanguage, 'title', e.target.value)
                          }
                        }}
                        placeholder={t('article.enterTitle')}
                        disabled={showPreview}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t('article.summary')}</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => copyFromSource('summary')}
                            disabled={showPreview}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {t('article.copyFromSource')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => generateSummary(targetLanguage)}
                            disabled={!targetTranslation.content || showPreview}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            {t('article.autoGenerate')}
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={targetTranslation.summary}
                        onChange={(e) => {
                          if (targetLanguage === locale) {
                            handleChange('summary', e.target.value)
                          } else {
                            updateTranslation(targetLanguage, 'summary', e.target.value)
                          }
                        }}
                        placeholder={t('article.enterSummary')}
                        rows={3}
                        disabled={showPreview}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t('article.content')}</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => copyFromSource('content')}
                          disabled={showPreview}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {t('article.copyFromSource')}
                        </Button>
                      </div>
                      {showPreview ? (
                        <Card className="p-4 min-h-[500px] overflow-auto">
                          <MarkdownRenderer content={targetTranslation.content} />
                        </Card>
                      ) : (
                        <MarkdownEditor
                          value={targetTranslation.content}
                          onChange={(value) => {
                            if (targetLanguage === locale) {
                              handleChange('content', value)
                            } else {
                              updateTranslation(targetLanguage, 'content', value)
                            }
                          }}
                          placeholder={t('article.enterContent')}
                          className="min-h-[500px]"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Tab View (existing implementation)
              <div>
                {/* Keep existing tab implementation as fallback */}
                <Alert>
                  <AlertDescription>
                    {t('article.tabViewDescription')}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? t('common.saving') : (isEditing ? t('article.updateArticle') : t('article.createArticle'))}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}