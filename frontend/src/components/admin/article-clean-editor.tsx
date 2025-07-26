"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from 'next-intl'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { apiClient, Article, Category, ArticleTranslation } from "@/lib/api"
import { 
  ArrowLeft,
  Save,
  Copy,
  Eye,
  EyeOff,
  Languages
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ArticleCleanEditorProps {
  article?: Article
  isEditing?: boolean
  locale?: string
}

const availableLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' }
]

export function ArticleCleanEditor({ article, isEditing = false, locale = 'zh' }: ArticleCleanEditorProps) {
  const router = useRouter()
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [sourceLanguage, setSourceLanguage] = useState(locale)
  const [targetLanguage, setTargetLanguage] = useState(locale === 'zh' ? 'en' : 'zh')
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [activeField, setActiveField] = useState<'title' | 'summary' | 'content'>('content')
  const [showPreview, setShowPreview] = useState<'none' | 'left' | 'right' | 'both'>('none')
  
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

  const getTranslation = (language: string) => {
    if (language === locale) {
      return {
        id: 0,
        article_id: 0,
        language: locale,
        title: formData.title,
        content: formData.content,
        summary: formData.summary,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    
    return translations.find(t => t.language === language) || {
      id: 0,
      article_id: 0,
      language,
      title: '',
      content: '',
      summary: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  // Calculate translation progress
  const progress = useMemo(() => {
    const getProgress = (lang: string) => {
      const translation = getTranslation(lang)
      let completed = 0
      if (translation.title.trim()) completed++
      if (translation.content.trim()) completed++
      if (translation.summary.trim()) completed++
      return Math.round((completed / 3) * 100)
    }

    return {
      [sourceLanguage]: getProgress(sourceLanguage),
      [targetLanguage]: getProgress(targetLanguage)
    }
  }, [translations, formData, sourceLanguage, targetLanguage, locale])

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
          [field]: value,
          updated_at: new Date().toISOString()
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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    const startX = e.clientX
    const startWidth = leftPanelWidth

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX
      const containerWidth = window.innerWidth
      const newWidth = Math.max(20, Math.min(80, startWidth + (diff / containerWidth) * 100))
      setLeftPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const sourceTranslation = getTranslation(sourceLanguage)
  const targetTranslation = getTranslation(targetLanguage)

  const renderField = (language: string, translation: ArticleTranslation, isPreview: boolean) => {
    const isSource = language === sourceLanguage
    
    switch (activeField) {
      case 'title':
        return isPreview ? (
          <div className="p-4">
            <h1 className="text-2xl font-bold">{translation.title || 'Untitled'}</h1>
          </div>
        ) : (
          <div className="p-4">
            <Input
              value={translation.title}
              onChange={(e) => updateTranslation(language, 'title', e.target.value)}
              placeholder={t('article.enterTitle')}
              className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 px-0"
            />
          </div>
        )
      
      case 'summary':
        return isPreview ? (
          <div className="p-4">
            <p className="text-muted-foreground leading-relaxed">{translation.summary || 'No summary'}</p>
          </div>
        ) : (
          <div className="p-4">
            <Textarea
              value={translation.summary}
              onChange={(e) => updateTranslation(language, 'summary', e.target.value)}
              placeholder={t('article.enterSummary')}
              className="min-h-[200px] border-0 shadow-none focus-visible:ring-0 px-0 resize-none"
            />
          </div>
        )
      
      case 'content':
        return isPreview ? (
          <div className="p-4 prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ 
              __html: translation.content.replace(/\n/g, '<br>') || '<p class="text-muted-foreground">No content</p>' 
            }} />
          </div>
        ) : (
          <div className="p-4">
            <Textarea
              value={translation.content}
              onChange={(e) => updateTranslation(language, 'content', e.target.value)}
              placeholder={t('article.enterContent')}
              className="min-h-[calc(100vh-200px)] border-0 shadow-none focus-visible:ring-0 px-0 resize-none font-mono text-sm"
            />
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Clean Top Bar */}
      <div className="h-12 border-b flex items-center px-4 bg-card/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin')}
          className="h-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        
        <div className="mx-4 h-4 w-px bg-border" />
        
        <Languages className="h-4 w-4 text-muted-foreground mr-2" />
        <span className="text-sm font-medium">
          {isEditing ? t('article.editArticle') : t('article.createArticle')}
        </span>

        <div className="flex-1" />

        {/* Category */}
        <Select
          value={formData.category_id.toString()}
          onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: parseInt(value) }))}
        >
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mx-2 h-4 w-px bg-border" />

        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="sm"
          className="h-8"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? t('common.saving') : t('common.save')}
        </Button>
      </div>

      {/* Field Tabs */}
      <div className="h-10 border-b flex items-center bg-muted/30">
        <div className="flex">
          {(['title', 'summary', 'content'] as const).map((field) => (
            <button
              key={field}
              onClick={() => setActiveField(field)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 border-transparent",
                activeField === field 
                  ? "bg-background border-primary text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {t(`article.${field}`)}
            </button>
          ))}
        </div>
        
        <div className="flex-1" />
        
        {/* Preview Toggle */}
        <div className="flex items-center gap-1 mr-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(showPreview === 'none' ? 'both' : 'none')}
            className="h-7 px-2"
          >
            {showPreview !== 'none' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div 
          className="flex flex-col border-r"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Language Header */}
          <div className="h-9 border-b px-4 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                <SelectTrigger className="h-6 w-20 text-xs">
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
              <div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all",
                    progress[sourceLanguage] === 100 ? "bg-green-500" : 
                    progress[sourceLanguage] > 0 ? "bg-yellow-500" : "bg-muted"
                  )}
                  style={{ width: `${progress[sourceLanguage]}%` }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {renderField(sourceLanguage, sourceTranslation, showPreview === 'left' || showPreview === 'both')}
          </div>
        </div>

        {/* Resizer */}
        <div
          className={cn(
            "w-1 cursor-col-resize hover:bg-primary/20 transition-colors flex items-center justify-center group",
            isDragging && "bg-primary/20"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="w-1 h-8 bg-border group-hover:bg-primary/50 rounded-full transition-colors" />
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col">
          {/* Language Header */}
          <div className="h-9 border-b px-4 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="h-6 w-20 text-xs">
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
              <div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all",
                    progress[targetLanguage] === 100 ? "bg-green-500" : 
                    progress[targetLanguage] > 0 ? "bg-yellow-500" : "bg-muted"
                  )}
                  style={{ width: `${progress[targetLanguage]}%` }}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToTarget}
                className="h-6 px-2 ml-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {renderField(targetLanguage, targetTranslation, showPreview === 'right' || showPreview === 'both')}
          </div>
        </div>
      </div>
    </div>
  )
}