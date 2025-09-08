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
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { MarkdownEditor } from "@/components/markdown/markdown-editor"
import { apiClient, Article, Category, ArticleTranslation, MediaLibrary } from "@/lib/api"
import { Languages, Plus, Trash2, Pin, ImageIcon, X } from "lucide-react"
import MediaSelector from "@/components/admin/media-selector"
import { getMediaUrl } from "@/lib/config"


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
    category_id: article?.category_id || 0,
    created_at: article?.created_at || new Date().toISOString(),
    is_pinned: article?.is_pinned || false,
    pin_order: article?.pin_order || 1,
    cover_image_url: article?.cover_image_url || "",
    cover_image_id: article?.cover_image_id || undefined,
    cover_image_alt: article?.cover_image_alt || ""
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

  // Media selector state and handlers
  const [mediaSelector, setMediaSelector] = useState({
    open: false
  })

  const handleCoverImageSelect = (media: MediaLibrary) => {
    setFormData(prev => ({
      ...prev,
      cover_image_url: media.url,
      cover_image_id: media.id,
      cover_image_alt: media.alt || ""
    }))
    setMediaSelector({ open: false })
  }

  const removeCoverImage = () => {
    setFormData(prev => ({
      ...prev,
      cover_image_url: "",
      cover_image_id: undefined,
      cover_image_alt: ""
    }))
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

  const handleChange = (field: string, value: string | number | boolean) => {
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

            {/* Publication Time */}
            <div className="space-y-2">
              <Label htmlFor="created_at">{locale === 'zh' ? '发布时间' : 'Publication Time'}</Label>
              <Input
                id="created_at"
                type="datetime-local"
                value={new Date(formData.created_at).toISOString().slice(0, 16)}
                onChange={(e) => handleChange('created_at', new Date(e.target.value).toISOString())}
              />
            </div>

            {/* Pin Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_pinned"
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) => handleChange('is_pinned', checked)}
                />
                <Label htmlFor="is_pinned" className="flex items-center gap-2">
                  <Pin className="h-4 w-4" />
                  {t('admin.pinArticle')}
                </Label>
              </div>
              
              {formData.is_pinned && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="pin_order">{t('admin.pinPriority')}</Label>
                  <Select
                    value={formData.pin_order.toString()}
                    onValueChange={(value) => handleChange('pin_order', parseInt(value))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('admin.firstPlace')}</SelectItem>
                      <SelectItem value="2">{t('admin.secondPlace')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.maxPinnedArticles')}
                  </p>
                </div>
              )}
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

                    {/* Cover Image Section - Only show for primary language */}
                    {translation.language === locale && (
                      <div className="space-y-2">
                        <Label>{locale === 'zh' ? '封面图片' : 'Cover Image'}</Label>
                        {formData.cover_image_url ? (
                          <div className="relative inline-block">
                            <img
                              src={getMediaUrl(formData.cover_image_url)}
                              alt={formData.cover_image_alt}
                              className="h-32 w-48 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={removeCoverImage}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMediaSelector({ open: true })}
                            className="h-32 w-48 border-dashed flex flex-col items-center justify-center gap-2"
                          >
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {locale === 'zh' ? '选择封面图片' : 'Select Cover Image'}
                            </span>
                          </Button>
                        )}
                        {formData.cover_image_url && (
                          <div className="space-y-2">
                            <Label htmlFor="cover-image-alt">{locale === 'zh' ? '图片描述 (Alt)' : 'Image Alt Text'}</Label>
                            <Input
                              id="cover-image-alt"
                              value={formData.cover_image_alt}
                              onChange={(e) => setFormData(prev => ({ ...prev, cover_image_alt: e.target.value }))}
                              placeholder={locale === 'zh' ? '输入图片描述...' : 'Enter image description...'}
                            />
                          </div>
                        )}
                      </div>
                    )}

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
      
      {/* Media Selector Dialog */}
      <MediaSelector
        open={mediaSelector.open}
        onOpenChange={(open) => setMediaSelector({ open })}
        onSelect={(media) => handleCoverImageSelect(media as MediaLibrary)}
        acceptedTypes="image"
      />
    </motion.div>
  )
}