"use client"

import { useState, useEffect } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { MarkdownEditor } from "@/components/markdown/markdown-editor"
import { apiClient, Article, Category, ArticleTranslation } from "@/lib/api"
import { Languages, Plus, Trash2 } from "lucide-react"


interface ArticleFormProps {
  article?: Article
  isEditing?: boolean
  locale?: string
}

const availableLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' }
]

export function ArticleForm({ article, isEditing = false, locale = 'zh' }: ArticleFormProps) {
  const router = useRouter()
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeTab, setActiveTab] = useState(locale)
  const [formData, setFormData] = useState({
    title: article?.title || "",
    content: article?.content || "",
    content_type: article?.content_type || "markdown",
    summary: article?.summary || "",
    category_id: article?.category_id || 0
  })
  const [translations, setTranslations] = useState<ArticleTranslation[]>(() => {
    // Initialize translations from article data if available
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
    // Initialize with current language
    return [{
      id: 0,
      article_id: 0,
      language: locale,
      title: article?.title || "",
      content: article?.content || "",
      summary: article?.summary || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]
  })

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

  const getCurrentTranslation = () => {
    return translations.find(t => t.language === activeTab) || {
      language: activeTab,
      title: '',
      content: '',
      summary: ''
    }
  }

  const updateTranslation = (field: string, value: string) => {
    setTranslations(prev => {
      const newTranslations = [...prev]
      const existingIndex = newTranslations.findIndex(t => t.language === activeTab)
      
      if (existingIndex >= 0) {
        newTranslations[existingIndex] = {
          ...newTranslations[existingIndex],
          [field]: value
        }
      } else {
        newTranslations.push({
          id: 0,
          article_id: 0,
          language: activeTab,
          title: field === 'title' ? value : '',
          content: field === 'content' ? value : '',
          summary: field === 'summary' ? value : '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
      
      return newTranslations
    })
    
    // Also update main formData if this is the primary language
    if (activeTab === locale) {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const addLanguage = (langCode: string) => {
    if (!translations.find(t => t.language === langCode)) {
      setTranslations(prev => [...prev, {
        id: 0,
        article_id: 0,
        language: langCode,
        title: '',
        content: '',
        summary: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
    }
    setActiveTab(langCode)
  }

  const removeLanguage = (langCode: string) => {
    if (langCode === locale) return // Don't remove primary language
    setTranslations(prev => prev.filter(t => t.language !== langCode))
    if (activeTab === langCode) {
      setActiveTab(locale)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const generateSummary = () => {
    const currentTranslation = getCurrentTranslation()
    const summary = currentTranslation.content.slice(0, 200) + (currentTranslation.content.length > 200 ? "..." : "")
    updateTranslation('summary', summary)
  }

  const currentTranslation = getCurrentTranslation()
  const availableLanguagesToAdd = availableLanguages.filter(
    lang => !translations.find(t => t.language === lang.code)
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {isEditing ? t('article.editArticle') : t('article.createArticle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection - Same for all languages */}
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

            {/* Language Tabs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t('article.translations')}</Label>
                {availableLanguagesToAdd.length > 0 && (
                  <Select onValueChange={addLanguage}>
                    <SelectTrigger className="w-auto">
                      <SelectValue placeholder={
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          {t('article.addLanguage')}
                        </div>
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguagesToAdd.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-auto w-full flex flex-wrap gap-2 p-1">
                  {translations.map((translation) => {
                    const lang = availableLanguages.find(l => l.code === translation.language)
                    return (
                      <TabsTrigger
                        key={translation.language}
                        value={translation.language}
                        className="flex items-center gap-2 px-3 py-2 min-w-[120px] justify-center"
                      >
                        {lang?.name || translation.language}
                        {translation.language === locale && (
                          <Badge variant="secondary" className="text-xs">
                            {t('article.primary')}
                          </Badge>
                        )}
                        {translation.language !== locale && (
                          <span
                            className="inline-flex items-center justify-center h-4 w-4 p-0 ml-1 hover:bg-accent rounded-sm cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeLanguage(translation.language)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </span>
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {translations.map((translation) => (
                  <TabsContent key={translation.language} value={translation.language} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`title-${translation.language}`}>{t('article.title')}</Label>
                      <Input
                        id={`title-${translation.language}`}
                        value={currentTranslation.title}
                        onChange={(e) => updateTranslation('title', e.target.value)}
                        placeholder={t('article.enterTitle')}
                        required={translation.language === locale}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`summary-${translation.language}`}>{t('article.summary')}</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateSummary}
                          disabled={!currentTranslation.content}
                        >
                          {t('article.autoGenerate')}
                        </Button>
                      </div>
                      <Textarea
                        id={`summary-${translation.language}`}
                        value={currentTranslation.summary}
                        onChange={(e) => updateTranslation('summary', e.target.value)}
                        placeholder={t('article.enterSummary')}
                        rows={3}
                        required={translation.language === locale}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`content-${translation.language}`}>{t('article.content')} (Markdown)</Label>
                      <MarkdownEditor
                        value={currentTranslation.content}
                        onChange={(value) => updateTranslation('content', value)}
                        placeholder={t('article.enterContent')}
                        className="min-h-[500px]"
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

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