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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MarkdownEditor } from "@/components/markdown/markdown-editor"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"
import { apiClient, Article, Category, ArticleTranslation } from "@/lib/api"
import { 
  Languages, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3,
  PanelLeftClose,
  PanelRightClose,
  Maximize2,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"


interface ArticleSplitEditorProps {
  article?: Article
  isEditing?: boolean
  locale?: string
}

const availableLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' }
]

export function ArticleSplitEditor({ article, isEditing = false, locale = 'zh' }: ArticleSplitEditorProps) {
  const router = useRouter()
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [sourceLanguage, setSourceLanguage] = useState(locale)
  const [targetLanguage, setTargetLanguage] = useState(locale === 'zh' ? 'en' : 'zh')
  const [showLeftPreview, setShowLeftPreview] = useState(false)
  const [showRightPreview, setShowRightPreview] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [activeField, setActiveField] = useState<'title' | 'summary' | 'content'>('content')
  
  const [formData, setFormData] = useState({
    title: article?.title || "",
    content: article?.content || "",
    content_type: article?.content_type || "markdown",
    summary: article?.summary || "",
    category_id: article?.category_id || 0
  })
  
  const [translations, setTranslations] = useState<ArticleTranslation[]>(() => {
    if (article?.translations && Array.isArray(article.translations)) {
      return article.translations.map((t: any) => ({
        id: t.id || 0,
        article_id: t.article_id || 0,
        language: t.language,
        title: t.title || '',
        content: t.content || '',
        summary: t.summary || '',
        created_at: t.created_at || new Date().toISOString(),
        updated_at: t.updated_at || new Date().toISOString()
      }))
    }
    return []
  })

  // Calculate translation progress
  const translationProgress = useMemo(() => {
    const progress: Record<string, number> = {}
    
    availableLanguages.forEach(lang => {
      if (lang.code === locale) {
        // Check main data for default language
        let completed = 0
        if (formData.title.trim()) completed++
        if (formData.content.trim()) completed++
        if (formData.summary.trim()) completed++
        progress[lang.code] = Math.round((completed / 3) * 100)
      } else {
        const translation = translations.find(t => t.language === lang.code)
        if (!translation) {
          progress[lang.code] = 0
          return
        }
        
        let completed = 0
        if (translation.title.trim()) completed++
        if (translation.content.trim()) completed++
        if (translation.summary.trim()) completed++
        
        progress[lang.code] = Math.round((completed / 3) * 100)
      }
    })
    
    return progress
  }, [translations, formData, locale])

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
    if (language === locale) {
      return {
        language: locale,
        title: formData.title,
        content: formData.content,
        summary: formData.summary
      }
    }
    
    return translations.find(t => t.language === language) || {
      language,
      title: '',
      content: '',
      summary: ''
    }
  }

  const updateTranslation = (language: string, field: string, value: string) => {
    if (language === locale) {
      setFormData(prev => ({ ...prev, [field]: value }))
      return
    }

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
          id: 0,
          article_id: 0,
          language,
          title: field === 'title' ? value : '',
          content: field === 'content' ? value : '',
          summary: field === 'summary' ? value : '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
      
      return newTranslations
    })
  }

  const copyToTarget = () => {
    const sourceTranslation = getTranslation(sourceLanguage)
    updateTranslation(targetLanguage, activeField, sourceTranslation[activeField])
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const articleData = {
        ...formData,
        default_lang: locale,
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

  const sourceTranslation = getTranslation(sourceLanguage)
  const targetTranslation = getTranslation(targetLanguage)

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header Toolbar */}
      <div className="h-14 border-b flex items-center px-4 gap-4 bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {isEditing ? t('article.editArticle') : t('article.createArticle')}
          </span>
        </div>

        <div className="flex-1" />

        {/* Category Selection */}
        <Select
          value={formData.category_id.toString()}
          onValueChange={(value) => handleChange('category_id', parseInt(value))}
        >
          <SelectTrigger className="w-[180px]">
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

        {/* Progress Indicator */}
        <div className="flex items-center gap-2">
          {availableLanguages.map(lang => (
            <div key={lang.code} className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{lang.code}:</span>
              <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all",
                    translationProgress[lang.code] === 100 
                      ? "bg-green-500" 
                      : translationProgress[lang.code] > 0
                      ? "bg-yellow-500"
                      : "bg-muted"
                  )}
                  style={{ width: `${translationProgress[lang.code]}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? t('common.saving') : t('common.save')}
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Left Panel */}
        <div 
          className="flex flex-col border-r"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Language Selector */}
          <div className="h-10 border-b px-4 flex items-center justify-between bg-muted/50">
            <div className="flex items-center gap-2">
              <Label className="text-sm">{t('article.sourceLanguage')}:</Label>
              <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                <SelectTrigger className="h-7 w-24">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLeftPreview(!showLeftPreview)}
            >
              {showLeftPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeField} onValueChange={(v) => setActiveField(v as any)} className="flex-1 flex flex-col">
            <TabsList className="w-full rounded-none justify-start h-9 p-0">
              <TabsTrigger value="title" className="rounded-none data-[state=active]:shadow-none">
                {t('article.title')}
              </TabsTrigger>
              <TabsTrigger value="summary" className="rounded-none data-[state=active]:shadow-none">
                {t('article.summary')}
              </TabsTrigger>
              <TabsTrigger value="content" className="rounded-none data-[state=active]:shadow-none">
                {t('article.content')}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <div className="p-4">
                <TabsContent value="title" className="m-0">
                  <Input
                    value={sourceTranslation.title}
                    onChange={(e) => updateTranslation(sourceLanguage, 'title', e.target.value)}
                    placeholder={t('article.enterTitle')}
                    className="w-full"
                  />
                </TabsContent>

                <TabsContent value="summary" className="m-0">
                  <Textarea
                    value={sourceTranslation.summary}
                    onChange={(e) => updateTranslation(sourceLanguage, 'summary', e.target.value)}
                    placeholder={t('article.enterSummary')}
                    rows={6}
                    className="w-full resize-none"
                  />
                </TabsContent>

                <TabsContent value="content" className="m-0">
                  {showLeftPreview ? (
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <MarkdownRenderer content={sourceTranslation.content} />
                      </CardContent>
                    </Card>
                  ) : (
                    <MarkdownEditor
                      value={sourceTranslation.content}
                      onChange={(value) => updateTranslation(sourceLanguage, 'content', value)}
                      placeholder={t('article.enterContent')}
                      className="min-h-[calc(100vh-280px)] border-0"
                    />
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Resizer */}
        <div
          className="w-1 cursor-col-resize hover:bg-primary/20 transition-colors relative group"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startWidth = leftPanelWidth

            const handleMouseMove = (e: MouseEvent) => {
              const diff = e.clientX - startX
              const containerWidth = window.innerWidth
              const newWidth = Math.max(20, Math.min(80, startWidth + (diff / containerWidth) * 100))
              setLeftPanelWidth(newWidth)
            }

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-8 bg-primary/50 rounded-full" />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col">
          {/* Language Selector */}
          <div className="h-10 border-b px-4 flex items-center justify-between bg-muted/50">
            <div className="flex items-center gap-2">
              <Label className="text-sm">{t('article.targetLanguage')}:</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="h-7 w-24">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToTarget}
                className="ml-2"
              >
                <Copy className="h-4 w-4 mr-1" />
                {t('article.copyFromSource')}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRightPreview(!showRightPreview)}
            >
              {showRightPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {/* Content Area */}
          <Tabs value={activeField} className="flex-1 flex flex-col">
            <div className="h-9 border-b bg-muted/30" /> {/* Spacer to align with left panel */}
            
            <ScrollArea className="flex-1">
              <div className="p-4">
                <TabsContent value="title" className="m-0">
                  <Input
                    value={targetTranslation.title}
                    onChange={(e) => updateTranslation(targetLanguage, 'title', e.target.value)}
                    placeholder={t('article.enterTitle')}
                    className="w-full"
                  />
                </TabsContent>

                <TabsContent value="summary" className="m-0">
                  <Textarea
                    value={targetTranslation.summary}
                    onChange={(e) => updateTranslation(targetLanguage, 'summary', e.target.value)}
                    placeholder={t('article.enterSummary')}
                    rows={6}
                    className="w-full resize-none"
                  />
                </TabsContent>

                <TabsContent value="content" className="m-0">
                  {showRightPreview ? (
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <MarkdownRenderer content={targetTranslation.content} />
                      </CardContent>
                    </Card>
                  ) : (
                    <MarkdownEditor
                      value={targetTranslation.content}
                      onChange={(value) => updateTranslation(targetLanguage, 'content', value)}
                      placeholder={t('article.enterContent')}
                      className="min-h-[calc(100vh-280px)] border-0"
                    />
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  )
}