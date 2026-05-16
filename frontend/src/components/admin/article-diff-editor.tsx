"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { getApiUrl } from "@/lib/config"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from 'next-intl'
import { useTheme } from "next-themes"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiClient, Article, Category, ArticleTranslation, SiteSettings } from "@/lib/api"
import { getMediaUrl } from "@/lib/config"
import { 
  ArrowLeft,
  Save,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Languages,
  FileText,
  ToggleLeft,
  ToggleRight,
  Image,
  ImageIcon,
  Video,
  Keyboard,
  HelpCircle,
  Wand2,
  Loader2,
  Check,
  X,
  ChevronDown,
  ArrowLeftRight,
  Sparkles,
  Code,
  Trash2
} from "lucide-react"
import { translationService, initializeTranslationService } from "@/services/translation"
import { languageManager } from "@/services/translation/language-manager"
import { SUPPORTED_LANGUAGES, SupportedLanguage } from "@/services/translation/types"
import { getErrorMessage } from "@/services/translation/error-messages"
import { aiSummaryService, initializeAISummaryService } from "@/services/ai-summary"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"
import { ArticleSEOForm } from "@/components/admin/article-seo-form"
import MediaSelector from "./media-selector"
import { MediaLibrary } from "@/lib/api"
import { playSuccessSound, initializeSoundSettings } from "@/lib/sound"
import { NotificationDialog, useNotificationDialog } from "@/components/ui/notification-dialog"
import { LazyDualLanguageEditor as DualLanguageEditor } from "./monaco-editor-lazy"
import { DualLanguageEditorRef } from "./dual-language-editor"
import { TranslationStats } from "./translation-stats"
import { CommentTranslator } from "./comment-translator"



interface ArticleDiffEditorProps {
  article?: Article
  isEditing?: boolean
  locale?: string
}

type ProgressMap = Record<string, number>

// Admin interface languages (hardcoded for admin interface)
const adminInterfaceLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' }
]

export function ArticleDiffEditor({ article, isEditing = false, locale = 'zh' }: ArticleDiffEditorProps) {
  const router = useRouter()
  const t = useTranslations()
  const { theme, resolvedTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)
  
  // Normalize locale to standard language code (e.g., 'zh-CN' -> 'zh')
  const normalizedLocale = locale.split('-')[0] as SupportedLanguage
  
  // Initialize language states as null, will be set after siteSettings loads
  const [sourceLanguage, setSourceLanguage] = useState<SupportedLanguage | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage | null>(null)
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [activeField, setActiveField] = useState<'basic' | 'content' | 'seo'>('content')
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const [sourceScrollTop, setSourceScrollTop] = useState(0)
  const [targetScrollTop, setTargetScrollTop] = useState(0)
  const [isUploadingPastedImage, setIsUploadingPastedImage] = useState(false)
  const [pasteUploadProgress, setPasteUploadProgress] = useState(0)
  const [isScrollSyncing, setIsScrollSyncing] = useState(false)
  const [editMode, setEditMode] = useState<'single' | 'translation'>('single')
  const [showSinglePreview, setShowSinglePreview] = useState(false)
  const [singleEditorLanguage, setSingleEditorLanguage] = useState<SupportedLanguage | null>(null)
  const [showCopyConfirm, setShowCopyConfirm] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [isSelectingCoverImage, setIsSelectingCoverImage] = useState(false)
  const [activeTextarea, setActiveTextarea] = useState<'source' | 'target' | 'single'>('source')
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [currentTranslatingLanguage, setCurrentTranslatingLanguage] = useState<SupportedLanguage | null>(null)
  const [hasTranslationProvider, setHasTranslationProvider] = useState(false)
  const [savedCursorSelection, setSavedCursorSelection] = useState<{
    textarea: 'source' | 'target' | 'single'
    start: number
    end: number
  }>({ textarea: 'source', start: 0, end: 0 })
  const [availableLanguages, setAvailableLanguages] = useState(() => {
    // Initialize with enabled language options from language manager
    return languageManager.getEnabledLanguageOptions()
  })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [hasAISummaryProvider, setHasAISummaryProvider] = useState(false)
  const [showCommentTranslator, setShowCommentTranslator] = useState(false)
  const [currentCodeContent, setCurrentCodeContent] = useState('')
  const [selectedComments, setSelectedComments] = useState<any[]>([])
  
  // Notification dialog
  const notification = useNotificationDialog()
  
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null)
  const targetTextareaRef = useRef<HTMLTextAreaElement>(null)
  const singleTextareaRef = useRef<HTMLTextAreaElement>(null)
  const dualLanguageEditorRef = useRef<DualLanguageEditorRef>(null)

  // Get the site's default language
  const getDefaultLanguage = (): SupportedLanguage => {
    return (siteSettings?.default_language || article?.default_lang || 'zh') as SupportedLanguage
  }

  // Get language display name
  const getLanguageDisplayName = (languageCode: string) => {
    const language = availableLanguages.find(lang => lang.code === languageCode)
    console.log('Getting display name for:', languageCode, 'found:', language, 'availableLanguages:', availableLanguages)
    return language ? language.name : SUPPORTED_LANGUAGES[languageCode as keyof typeof SUPPORTED_LANGUAGES] || languageCode
  }

  // Helper function for publication time validation
  const validatePublicationTime = (dateTime: string): { isValid: boolean, message?: string } => {
    const date = new Date(dateTime)
    const now = new Date()
    
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        message: normalizedLocale === 'zh' ? '无效的日期时间格式' : 'Invalid date time format'
      }
    }
    
    // Check if the date is too far in the past (more than 10 years)
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(now.getFullYear() - 10)
    
    if (date < tenYearsAgo) {
      return {
        isValid: false,
        message: normalizedLocale === 'zh' ? '发布时间不能早于10年前' : 'Publication time cannot be more than 10 years ago'
      }
    }
    
    // Check if the date is too far in the future (more than 5 years)
    const fiveYearsFromNow = new Date()
    fiveYearsFromNow.setFullYear(now.getFullYear() + 5)
    
    if (date > fiveYearsFromNow) {
      return {
        isValid: false,
        message: normalizedLocale === 'zh' ? '发布时间不能晚于5年后' : 'Publication time cannot be more than 5 years in the future'
      }
    }
    
    return { isValid: true }
  }

  // Helper function to format publication time for display
  const formatPublicationTime = (dateTime: string): string => {
    const date = new Date(dateTime)
    const now = new Date()
    
    if (date > now) {
      return normalizedLocale === 'zh' ? '（定时发布）' : '(Scheduled)'
    } else {
      return normalizedLocale === 'zh' ? '（已发布）' : '(Published)'
    }
  }

  // Helper function to get current timezone
  const getCurrentTimezone = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return 'UTC'
    }
  }

  // Helper function to format datetime with timezone info
  const formatDateTimeWithTimezone = (dateTime: string): string => {
    const date = new Date(dateTime)
    const timezone = getCurrentTimezone()
    
    try {
      const formatted = date.toLocaleString(normalizedLocale === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
      return `${formatted} (${timezone})`
    } catch {
      return date.toLocaleString()
    }
  }
  
  const [formData, setFormData] = useState({
    title: article?.title || "",
    content: article?.content || "",
    content_type: article?.content_type || "markdown",
    summary: article?.summary || "",
    category_id: article?.category_id || 0,
    created_at: article?.created_at || new Date().toISOString(),
    // Cover Image Fields
    cover_image_url: article?.cover_image_url || "",
    cover_image_id: article?.cover_image_id || undefined,
    cover_image_alt: article?.cover_image_alt || "",
    // SEO Fields
    seo_title: article?.seo_title || "",
    seo_description: article?.seo_description || "",
    seo_keywords: article?.seo_keywords || "",
    seo_slug: article?.seo_slug || ""
  })
  
  const [translations, setTranslations] = useState<ArticleTranslation[]>(() => {
    if (article?.translations && Array.isArray(article.translations)) {
      // Just store all translations initially, we'll filter them dynamically
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

  const getTranslation = (language: string | null): ArticleTranslation => {
    // If language is null, return empty translation
    if (!language) {
      return {
        id: 0,
        article_id: article?.id || 0,
        language: '',
        title: '',
        content: '',
        summary: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    
    // Get the default language - either from site settings, article, or fallback to 'zh'
    const defaultLang = getDefaultLanguage()
    
    // If requesting the default language, return data from formData
    if (language === defaultLang) {
      return {
        id: 0,
        article_id: article?.id || 0,
        language: defaultLang,
        title: formData.title,
        content: formData.content,
        summary: formData.summary,
        created_at: formData.created_at || new Date().toISOString(),
        updated_at: article?.updated_at || new Date().toISOString()
      }
    }
    
    // For non-default languages, look in the translations array
    const existingTranslation = translations.find(t => t.language === language)
    
    if (existingTranslation) {
      return existingTranslation
    }
    
    // Return empty translation for new language
    return {
      id: 0,
      article_id: article?.id || 0,
      language,
      title: '',
      content: '',
      summary: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  // Calculate translation progress
  const progress: ProgressMap = useMemo(() => {
    if (!sourceLanguage || !targetLanguage) return {}
    
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
  }, [translations, formData, sourceLanguage, targetLanguage, normalizedLocale])

  // Calculate translation progress for content
  const translationProgress = useMemo(() => {
    if (activeField !== 'content' || !sourceLanguage || !targetLanguage) return { sourceLines: [] as string[], targetLines: [] as string[], untranslatedLines: [] as number[], totalLines: 0, translatedLines: 0 }
    
    const sourceTranslation = getTranslation(sourceLanguage)
    const targetTranslation = getTranslation(targetLanguage)
    
    const sourceLines = sourceTranslation.content.split('\n')
    const targetLines = targetTranslation.content.split('\n')
    const maxLines = Math.max(sourceLines.length, targetLines.length)
    
    const untranslatedLines = []
    let translatedCount = 0
    let totalNonEmptyLines = 0
    let inCodeBlock = false
    
    for (let i = 0; i < maxLines; i++) {
      const sourceLine = (sourceLines[i] || '').trim()
      const targetLine = (targetLines[i] || '').trim()
      
      // Check if we're entering or exiting a code block
      if (sourceLine.startsWith('```')) {
        inCodeBlock = !inCodeBlock
        continue // Skip code block markers
      }
      
      // Skip lines inside code blocks
      if (inCodeBlock) {
        continue
      }
      
      // Check if this line contains content that should not be translated
      const isNonTranslatableContent = (line: string) => {
        // Skip image markdown: ![alt](src)
        if (/^!\[.*\]\(.*\)$/.test(line)) return true
        
        // Skip video HTML tags
        if (/<video\s+.*?>/.test(line) || 
        /.*?<\/video>.*?/.test(line) ||
        /.*?Your browser does not support the video tag\..*?/.test(line)) return true
        
        // Skip YouTube/Bilibili embed components
        if (/<YouTubeEmbed\s+.*?\/>/.test(line)) return true
        if (/<BiliBiliEmbed\s+.*?\/>/.test(line)) return true
        
        // Skip lines starting with warning symbols and similar special characters
        if (/^[⚠️❗️💡🔥✅❌⭐️📝💻🎯🚀🔔📋📊⚡️🎉🛠️🔗📁📖📌]+/.test(line.trim())) return true
        
        // Skip markdown links: - [Text](URL)
        if (/^\s*-\s*\[.*\]\(.*\)\s*$/.test(line)) return true
        
        // Skip broken/partial markdown links that might result from translation
        if (/^\s*-\s*\[.*\]\(___/.test(line)) return true
        if (/^\s*-\s*\[.*\]\($/.test(line)) return true
        if (/^\s*-\s*\[.*\]\(https?:\/\//.test(line)) return true
        
        // Skip lines that look like partial markdown links
        if (/^\s*-\s*\[.*\]\(\s*$/.test(line)) return true
        if (/^\s*"\s*-\s*\[.*\]\(/.test(line)) return true
        
        // Skip standalone URLs
        if (/^https?:\/\//.test(line.trim())) return true
        
        // Skip lines that contain common link domains (to catch partial translations)
        if (/\b(docs\.docker\.com|github\.com|stackoverflow\.com|npmjs\.com|reactjs\.org)\b/.test(line)) return true
        
        return false
      }
      
      // Skip non-translatable content lines
      if (isNonTranslatableContent(sourceLine)) {
        continue
      }
      
      // Only count non-empty source lines as requiring translation
      if (sourceLine) {
        totalNonEmptyLines++
        
        // If target line is empty or same as source, it's untranslated
        if (!targetLine || targetLine === sourceLine) {
          untranslatedLines.push(i)
        } else {
          translatedCount++
        }
      }
    }
    
    return { 
      sourceLines, 
      targetLines, 
      untranslatedLines, 
      totalLines: totalNonEmptyLines,
      translatedLines: translatedCount,
      untranslatedCount: untranslatedLines.length
    }
  }, [sourceLanguage, targetLanguage, activeField, getTranslation])

  // Helper function to parse translation errors
  const parseTranslationError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : '未知错误'
    const code = (error as any).code
    const provider = translationService.getActiveProvider()?.name || 'unknown'

    return getErrorMessage(message, code, provider)
  }, [])

  // Initialize languages once site settings are loaded
  useEffect(() => {
    if (siteSettings && availableLanguages.length > 0) {
      const defaultLang = getDefaultLanguage()
      
      // Clean up any translations for the default language
      setTranslations(prev => prev.filter(t => t.language !== defaultLang))
      
      // Set source language to default language from site settings
      if (sourceLanguage !== defaultLang) {
        setSourceLanguage(defaultLang)
      }
      
      // Set target language to a different language than default
      const otherLang = availableLanguages.find(lang => lang.code !== defaultLang)
      if (otherLang && (!targetLanguage || targetLanguage === defaultLang)) {
        setTargetLanguage(otherLang.code)
      }
    }
  }, [siteSettings, availableLanguages, sourceLanguage, targetLanguage])

  useEffect(() => {
    // Initialize sound settings
    initializeSoundSettings();
    
    const fetchCategories = async () => {
      try {
        const categoriesData = await apiClient.getCategories({ lang: normalizedLocale })
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }

    const fetchSiteSettings = async () => {
      try {
        const settings = await apiClient.getSettings()
        setSiteSettings(settings)
      } catch (error) {
        console.error('Failed to fetch site settings:', error)
      }
    }

    fetchCategories()
    fetchSiteSettings()
    
    const initializeAIServices = async () => {
      await initializeTranslationService()
      await initializeAISummaryService()

      const provider = translationService.getActiveProvider()
      setHasTranslationProvider(!!provider)

      const aiProvider = aiSummaryService.getActiveProvider()
      setHasAISummaryProvider(!!aiProvider && aiSummaryService.isConfigured())
    }

    initializeAIServices()
    
    // Load available languages from language manager
    const enabledLanguages = languageManager.getEnabledLanguageOptions()
    setAvailableLanguages(enabledLanguages)
    
    // Check if translation provider is configured
    const checkProvider = () => {
      const provider = translationService.getActiveProvider()
      setHasTranslationProvider(!!provider)
    }
    
    // Check if AI summary provider is configured
    const checkAIProvider = () => {
      const aiProvider = aiSummaryService.getActiveProvider()
      setHasAISummaryProvider(!!aiProvider && aiSummaryService.isConfigured())
    }
    
    checkProvider()
    checkAIProvider()
    
    // Check again after a short delay to ensure initialization is complete
    const timer = setTimeout(() => {
      checkProvider()
      checkAIProvider()
    }, 500)
    return () => clearTimeout(timer)
  }, [normalizedLocale])

  useEffect(() => {
    if (availableLanguages.length === 0) return

    const defaultLang = getDefaultLanguage()
    const fallbackLanguage = availableLanguages.some((lang) => lang.code === defaultLang)
      ? defaultLang
      : sourceLanguage || availableLanguages[0]?.code || null

    if (!singleEditorLanguage || !availableLanguages.some((lang) => lang.code === singleEditorLanguage)) {
      setSingleEditorLanguage(fallbackLanguage as SupportedLanguage | null)
    }
  }, [availableLanguages, sourceLanguage, siteSettings, singleEditorLanguage])

  // Set initial category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && formData.category_id === 0) {
      setFormData(prev => ({ ...prev, category_id: categories[0].id }))
    }
  }, [categories])

  // Restore selected comments from article data
  useEffect(() => {
    if (article?.selected_comments) {
      try {
        const savedComments = JSON.parse(article.selected_comments)
        setSelectedComments(savedComments)
        console.log('Restored selected comments from article:', savedComments)
      } catch (error) {
        console.error('Failed to parse saved comments:', error)
        setSelectedComments([])
      }
    } else {
      setSelectedComments([])
    }
  }, [article?.selected_comments])

  // Function to filter out non-translatable content before sending to translation service
  const filterNonTranslatableContent = (text: string): { filtered: string; placeholders: Map<string, string> } => {
    const lines = text.split('\n')
    const placeholders = new Map<string, string>()
    let placeholderIndex = 0
    
    const filteredLines = lines.map((line, index) => {
      const trimmedLine = line.trim()
      const lineNumber = index + 1
      
      // Check if line should not be translated
      if (
        // Special symbols at start
        /^[⚠️❗️💡🔥✅❌⭐️📝💻🎯🚀🔔📋📊⚡️🎉🛠️🔗📁📖📌]+/.test(trimmedLine) ||
        // URLs
        /^https?:\/\//.test(trimmedLine) ||
        // Common domains
        /\b(docs\.docker\.com|github\.com|stackoverflow\.com|npmjs\.com|reactjs\.org)\b/.test(line) ||
        // Image markdown
        /^!\[.*\]\(.*\)$/.test(trimmedLine) ||
        // Video/embed tags
        /<video\s+.*?>/.test(line) || 
        /.*?<\/video>.*?/.test(line) ||
        /.*?Your browser does not support the video tag\..*?/.test(line) ||
        /<YouTubeEmbed\s+.*?\/>/.test(line) ||
        /<BiliBiliEmbed\s+.*?\/>/.test(line)
      ) {
        const placeholder = `{{KUNO_NOTR_${String(placeholderIndex).padStart(4, '0')}}}`
        placeholderIndex++
        placeholders.set(placeholder, line)
        return placeholder
      }
      
      
      return line
    })
    
    return {
      filtered: filteredLines.join('\n'),
      placeholders
    }
  }
  
  // Function to restore non-translatable content after translation
  const restoreNonTranslatableContent = (translatedText: string, placeholders: Map<string, string>): string => {
    let result = translatedText
    
    placeholders.forEach((originalLine, placeholder) => {
      // Use global replace with word boundary to ensure complete replacement
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      result = result.replace(regex, originalLine)
    })
    
    return result
  }

  const handleAutoTranslate = async (field: 'title' | 'content' | 'summary' | 'all') => {
    if (!translationService.getActiveProvider()) {
      alert('Please configure a translation API in settings first')
      return
    }

    setIsTranslating(true)

    try {
      const sourceTranslation = getTranslation(sourceLanguage)
      const defaultLang = getDefaultLanguage()

      if (field === 'all') {
        // Get all enabled languages from language manager
        const enabledLanguages = languageManager.getEnabledLanguages()
        
        // Filter out the source language
        const targetLanguages = enabledLanguages.filter(lang => lang !== sourceLanguage)
        
        if (targetLanguages.length === 0) {
          notification.showError(
            normalizedLocale === 'zh' ? '没有目标语言' : 'No Target Languages',
            normalizedLocale === 'zh' ? '没有其他启用的语言可以翻译' : 'No other enabled languages to translate to'
          )
          return
        }
        
        // Filter content before translation
        console.log('Original content for translation:', sourceTranslation.content.substring(0, 300) + '...')
        console.log('Selected comments for this translation:', selectedComments)
        const { filtered: filteredContent, placeholders: contentPlaceholders } = filterNonTranslatableContent(sourceTranslation.content)
        
        let successCount = 0
        const failedLanguages: Array<{
          language: string
          reason: string
          retryable: boolean
        }> = []

        // Translate to each enabled language
        for (const targetLang of targetLanguages) {
          try {
            // Set current translating language
            setCurrentTranslatingLanguage(targetLang)

            // Translate all fields at once
            const result = await translationService.translateArticle(
              {
                title: sourceTranslation.title,
                content: filteredContent,
                summary: sourceTranslation.summary
              },
              sourceLanguage!,
              targetLang,
              selectedComments
            )

            // Restore non-translatable content
            const restoredContent = restoreNonTranslatableContent(result.content, contentPlaceholders)

            if (targetLang === defaultLang) {
              setFormData(prev => ({
                ...prev,
                title: result.title,
                content: restoredContent,
                summary: result.summary
              }))
            } else {
              updateTranslation(targetLang, 'title', result.title)
              updateTranslation(targetLang, 'content', restoredContent)
              updateTranslation(targetLang, 'summary', result.summary)
            }

            successCount++
          } catch (error) {
            console.error(`Failed to translate to ${targetLang}:`, error)
            const errorDetails = parseTranslationError(error)

            failedLanguages.push({
              language: SUPPORTED_LANGUAGES[targetLang] || targetLang,
              reason: errorDetails.message,
              retryable: errorDetails.retryable || false
            })
          }
        }
        
        // Clear translating language
        setCurrentTranslatingLanguage(null)
        
        // Show final status
        if (successCount === targetLanguages.length) {
          notification.showSuccess(
            normalizedLocale === 'zh' ? '翻译完成！' : 'Translation Complete!',
            normalizedLocale === 'zh' ? `成功翻译到 ${successCount} 种语言` : `Successfully translated to ${successCount} languages`
          )
        } else if (successCount > 0 || failedLanguages.length > 0) {
          const retryableErrors = failedLanguages.filter(f => f.retryable)
          const permanentErrors = failedLanguages.filter(f => !f.retryable)

          let message = ''
          if (successCount > 0) {
            message += normalizedLocale === 'zh'
              ? `成功翻译: ${successCount} 种语言\n\n`
              : `Successfully translated: ${successCount} languages\n\n`
          }

          if (retryableErrors.length > 0) {
            message += normalizedLocale === 'zh' ? '以下错误可重试:\n' : 'Retryable errors:\n'
            retryableErrors.forEach(f => {
              message += `- ${f.language}: ${f.reason}\n`
            })
          }

          if (permanentErrors.length > 0) {
            message += normalizedLocale === 'zh' ? '\n以下错误需要修复配置:\n' : '\nConfiguration errors:\n'
            permanentErrors.forEach(f => {
              message += `- ${f.language}: ${f.reason}\n`
            })
          }

          const hasRetryable = retryableErrors.length > 0

          notification.showWarning(
            normalizedLocale === 'zh' ? '部分翻译完成' : 'Partial Translation Complete',
            message.trim(),
            {
              retryable: hasRetryable,
              suggestion: hasRetryable
                ? (normalizedLocale === 'zh' ? '可以点击重试按钮重新翻译失败的语言' : 'Click retry to translate failed languages again')
                : undefined,
              onRetry: hasRetryable
                ? () => {
                    // Note: This is a simplified retry - ideally should retry only failed languages
                    handleAutoTranslate('all')
                  }
                : undefined
            }
          )
        } else {
          notification.showError(
            normalizedLocale === 'zh' ? '翻译失败' : 'Translation Failed',
            normalizedLocale === 'zh' ? '所有语言翻译均失败' : 'Failed to translate to any language'
          )
        }
      } else {
        // Translate single field
        const sourceText = sourceTranslation[field]
        let translatedText: string
        
        if (field === 'content') {
          // Filter content before translation
          const { filtered, placeholders } = filterNonTranslatableContent(sourceText)
          const rawTranslation = await translationService.translate(
            filtered,
            sourceLanguage!,
            targetLanguage!,
            selectedComments
          )
          // Restore non-translatable content
          translatedText = restoreNonTranslatableContent(rawTranslation, placeholders)
        } else {
          // For title and summary, translate directly
          translatedText = await translationService.translate(
            sourceText,
            sourceLanguage!,
            targetLanguage!,
            selectedComments
          )
        }

        if (targetLanguage === defaultLang) {
          setFormData(prev => ({ ...prev, [field]: translatedText }))
        } else {
          updateTranslation(targetLanguage, field, translatedText)
        }
      }
    } catch (error) {
      console.error('Translation error:', error)

      const errorDetails = parseTranslationError(error)

      notification.showError(
        normalizedLocale === 'zh' ? '翻译失败' : 'Translation Failed',
        errorDetails.message,
        {
          suggestion: errorDetails.suggestion,
          retryable: errorDetails.retryable,
          onRetry: errorDetails.retryable ? () => handleAutoTranslate(field) : undefined
        }
      )
    } finally {
      setIsTranslating(false)
      setCurrentTranslatingLanguage(null)
    }
  }

  const handleAIGenerate = async (type: 'all' | 'title' | 'summary' | 'keywords') => {
    if (!aiSummaryService.isConfigured()) {
      notification.showError(
        normalizedLocale === 'zh' ? 'AI服务未配置' : 'AI Service Not Configured',
        normalizedLocale === 'zh' ? '请先在设置中配置AI服务' : 'Please configure AI service in settings first'
      )
      return
    }

    // Get current content
    const defaultLang = getDefaultLanguage()
    const currentTranslation = getTranslation(defaultLang)
    
    if (!currentTranslation.content.trim()) {
      notification.showError(
        normalizedLocale === 'zh' ? '内容为空' : 'Content is Empty',
        normalizedLocale === 'zh' ? '请先输入文章内容再生成AI总结' : 'Please enter article content before generating AI summary'
      )
      return
    }

    setIsGeneratingAI(true)

    try {
      if (type === 'all') {
        // Generate complete summary including title, summary, and keywords
        const result = await aiSummaryService.generateSummary({
          content: currentTranslation.content,
          existingTitle: currentTranslation.title,
          existingSummary: currentTranslation.summary,
          language: defaultLang
        })

        // Update form data
        setFormData(prev => ({
          ...prev,
          title: result.title,
          summary: result.summary,
          seo_keywords: result.keywords.join(', ')
        }))

        notification.showSuccess(
          normalizedLocale === 'zh' ? 'AI总结生成成功' : 'AI Summary Generated Successfully',
          normalizedLocale === 'zh' 
            ? `已生成标题、摘要和${result.keywords.length}个关键字`
            : `Generated title, summary and ${result.keywords.length} keywords`
        )
      } else if (type === 'title') {
        const title = await aiSummaryService.generateTitle(currentTranslation.content, defaultLang)
        setFormData(prev => ({ ...prev, title }))
        notification.showSuccess(
          normalizedLocale === 'zh' ? '标题生成成功' : 'Title Generated Successfully',
          title
        )
      } else if (type === 'summary') {
        const result = await aiSummaryService.generateSummary({
          content: currentTranslation.content,
          language: defaultLang
        })
        setFormData(prev => ({ ...prev, summary: result.summary }))
        notification.showSuccess(
          normalizedLocale === 'zh' ? '摘要生成成功' : 'Summary Generated Successfully',
          result.summary
        )
      } else if (type === 'keywords') {
        const keywords = await aiSummaryService.generateSEOKeywords(currentTranslation.content, defaultLang)
        setFormData(prev => ({ ...prev, seo_keywords: keywords.join(', ') }))
        notification.showSuccess(
          normalizedLocale === 'zh' ? 'SEO关键字生成成功' : 'SEO Keywords Generated Successfully',
          normalizedLocale === 'zh' ? `生成了${keywords.length}个关键字` : `Generated ${keywords.length} keywords`
        )
      }
    } catch (error) {
      console.error('AI generation failed:', error)
      notification.showError(
        normalizedLocale === 'zh' ? 'AI生成失败' : 'AI Generation Failed',
        normalizedLocale === 'zh' ? 'AI内容生成失败，请稍后重试' : 'AI content generation failed. Please try again later.'
      )
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleSEOChange = (seoData: { seo_title?: string, seo_description?: string, seo_keywords?: string, seo_slug?: string }) => {
    // Update main formData with global SEO data
    setFormData(prev => ({
      ...prev,
      ...seoData
    }))
  }

  const handleCommentTranslation = () => {
    if (!hasTranslationProvider) {
      notification.showError(
        normalizedLocale === 'zh' ? '翻译服务未配置' : 'Translation Service Not Configured',
        normalizedLocale === 'zh' ? '请先在设置中配置翻译服务' : 'Please configure translation service in settings first'
      )
      return
    }

    // Get current content from the active translation
    const currentTranslation = getTranslation(sourceLanguage)
    setCurrentCodeContent(currentTranslation.content)
    setShowCommentTranslator(true)
  }

  const handleCommentSelectionConfirm = (comments: any[]) => {
    // Store selected comments for batch translation use
    setSelectedComments(comments)
    console.log('Selected comments for translation:', comments)
    console.log('Comments with line numbers:', comments.map(c => `Line ${c.lineNumber}: "${c.commentText}"`))
    notification.showSuccess(
      normalizedLocale === 'zh' ? '注释选择已确认' : 'Comment Selection Confirmed',
      comments.length > 0 
        ? (normalizedLocale === 'zh' ? `已选择 ${comments.length} 条注释用于翻译` : `${comments.length} comments selected for translation`)
        : (normalizedLocale === 'zh' ? '未选择任何注释，将跳过注释翻译' : 'No comments selected, comment translation will be skipped')
    )
  }

  const handleSubmit = async (exitAfterSave = false) => {
    // Validate required fields for default language
    // formData contains the default language article data
    if (!formData.title.trim()) {
      const defaultLang = getDefaultLanguage()
      const defaultLangName = SUPPORTED_LANGUAGES[defaultLang as keyof typeof SUPPORTED_LANGUAGES] || defaultLang
      notification.showError(
        normalizedLocale === 'zh' ? `默认语言(${defaultLangName})标题必须输入` : `Title is required for default language (${defaultLangName})`,
        normalizedLocale === 'zh' ? `请输入${defaultLangName}文章标题` : `Please enter article title in ${defaultLangName}`
      )
      return
    }
    
    if (!formData.content.trim()) {
      const defaultLang = getDefaultLanguage()
      const defaultLangName = SUPPORTED_LANGUAGES[defaultLang as keyof typeof SUPPORTED_LANGUAGES] || defaultLang
      notification.showError(
        normalizedLocale === 'zh' ? `默认语言(${defaultLangName})内容必须输入` : `Content is required for default language (${defaultLangName})`, 
        normalizedLocale === 'zh' ? `请输入${defaultLangName}文章内容` : `Please enter article content in ${defaultLangName}`
      )
      return
    }

    if (formData.category_id === 0) {
      notification.showError(
        normalizedLocale === 'zh' ? '分类必须选择' : 'Category is required',
        normalizedLocale === 'zh' ? '请选择文章分类' : 'Please select article category'
      )
      return
    }

    // Validate and sanitize data before saving
    const validationErrors = []
    
    // Validate cover image data
    if (formData.cover_image_url && !formData.cover_image_id) {
      validationErrors.push(normalizedLocale === 'zh' ? '封面图片数据不完整' : 'Cover image data incomplete')
    }
    
    // Validate SEO data lengths
    if (formData.seo_title && formData.seo_title.length > 60) {
      validationErrors.push(normalizedLocale === 'zh' ? 'SEO标题过长 (超过60字符)' : 'SEO title too long (over 60 characters)')
    }
    
    if (formData.seo_description && formData.seo_description.length > 160) {
      validationErrors.push(normalizedLocale === 'zh' ? 'SEO描述过长 (超过160字符)' : 'SEO description too long (over 160 characters)')
    }

    if (validationErrors.length > 0) {
      notification.showError(
        normalizedLocale === 'zh' ? '数据验证失败' : 'Data Validation Failed',
        validationErrors.join('; ')
      )
      return
    }

    setLoading(true)
    setSaveStatus('saving')

    try {
      // Collect only non-default language translations
      const defaultLang = getDefaultLanguage()
      
      // Filter translations to exclude default language and empty translations
      const allTranslations = translations.filter(t => 
        t.language !== defaultLang && 
        (t.title.trim() || t.content.trim() || t.summary.trim())
      )

      // Debug: Log formData before saving
      console.log('💾 Saving article with formData:', formData)
      console.log('🖼️ Cover image data:', {
        cover_image_url: formData.cover_image_url,
        cover_image_id: formData.cover_image_id,
        cover_image_alt: formData.cover_image_alt
      })
      console.log('🔍 SEO data:', {
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        seo_keywords: formData.seo_keywords,
        seo_slug: formData.seo_slug
      })

      const articleData = {
        ...formData,
        default_lang: defaultLang, // Keep the existing default language
        translations: allTranslations,
        selected_comments: JSON.stringify(selectedComments) // Save selected comments
      }

      console.log('📤 Final articleData being sent to API:', articleData)

      if (isEditing && article) {
        const updatedArticle = await apiClient.updateArticle(article.id, articleData)
        console.log('✅ Article updated successfully. Response:', updatedArticle)
        setSaveStatus('saved')
        playSuccessSound() // Play success sound
        
        // Show detailed success notification
        const coverInfo = formData.cover_image_url ? 
          (normalizedLocale === 'zh' ? '✓ 封面图片' : '✓ Cover image') : ''
        const seoInfo = (formData.seo_title || formData.seo_description || formData.seo_keywords) ? 
          (normalizedLocale === 'zh' ? '✓ SEO设置' : '✓ SEO settings') : ''
        const detailsMessage = [coverInfo, seoInfo].filter(Boolean).join(', ')
        
        notification.showSuccess(
          normalizedLocale === 'zh' ? '文章保存成功！' : 'Article Saved Successfully!',
          normalizedLocale === 'zh' 
            ? `您的文章已成功保存${detailsMessage ? ` (${detailsMessage})` : '。'}`
            : `Your article has been saved successfully${detailsMessage ? ` (${detailsMessage})` : '.'}`
        )
        
        if (exitAfterSave) {
          router.push('/admin')
        } else {
          // Reset save status after a delay
          setTimeout(() => setSaveStatus('idle'), 3000)
        }
      } else {
        const newArticle = await apiClient.createArticle(articleData)
        setSaveStatus('saved')
        playSuccessSound() // Play success sound
        
        // Show success notification
        notification.showSuccess(
          normalizedLocale === 'zh' ? '文章创建成功！' : 'Article Created Successfully!',
          normalizedLocale === 'zh' ? '您的文章已成功创建。' : 'Your article has been created successfully.'
        )
        
        if (exitAfterSave) {
          router.push('/admin')
        } else {
          // After creating, redirect to the new article's edit page
          router.replace(`/admin/articles/${newArticle.id}`)
        }
      }
    } catch (error) {
      console.error('Failed to save article:', error)
      setSaveStatus('error')
      
      // Show error notification
      notification.showError(
        normalizedLocale === 'zh' ? '保存失败' : 'Save Failed',
        normalizedLocale === 'zh' ? '文章保存失败，请稍后重试。' : 'Failed to save article. Please try again later.'
      )
      
      // Reset error status after a delay
      setTimeout(() => setSaveStatus('idle'), 5000)
    } finally {
      setLoading(false)
    }
  }

  // 处理Monaco编辑器的图片粘贴事件
  const handleMonacoPaste = async (e: ClipboardEvent, targetSide: 'source' | 'target') => {
    console.log('[Debug] handleMonacoPaste triggered for:', targetSide)
    
    // 检查剪贴板内容
    if (!e.clipboardData) return
    
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    
    if (imageItem) {
      console.log('[Debug] Image detected in paste, preventing default Monaco behavior')
      
      // 完全阻止默认行为
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      
      try {
        setIsUploadingPastedImage(true)
        setPasteUploadProgress(0)
        
        // 获取图片文件
        const file = imageItem.getAsFile()
        if (!file) return
        
        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const extension = file.type.split('/')[1] || 'png'
        const filename = `pasted-image-${timestamp}.${extension}`
        
        // 创建新的File对象
        const namedFile = new File([file], filename, {
          type: file.type,
          lastModified: Date.now()
        })
        
        // 模拟进度
        const progressInterval = setInterval(() => {
          setPasteUploadProgress(prev => Math.min(prev + 10, 90))
        }, 100)
        
        console.log('[Debug] Starting image upload:', filename)
        
        // 上传图片
        const uploadedMedia = await apiClient.uploadMedia(namedFile)
        
        clearInterval(progressInterval)
        setPasteUploadProgress(100)
        
        console.log('[Debug] Image uploaded successfully:', uploadedMedia)
        
        // 生成Markdown文本
        const altText = uploadedMedia.alt || (normalizedLocale === 'zh' 
          ? (file.type.includes('png') ? 'PNG图片' : 
             file.type.includes('jpeg') || file.type.includes('jpg') ? 'JPEG图片' : 
             file.type.includes('gif') ? 'GIF图片' : 
             file.type.includes('webp') ? 'WebP图片' : '图片')
          : (file.type.includes('png') ? 'PNG Image' :
             file.type.includes('jpeg') || file.type.includes('jpg') ? 'JPEG Image' :
             file.type.includes('gif') ? 'GIF Image' :
             file.type.includes('webp') ? 'WebP Image' : 'Image'))
        
        const markdownText = `![${altText}](${getMediaUrl(uploadedMedia.url)})`
        
        console.log('[Debug] Generated markdown:', markdownText)
        
        // 插入到Monaco编辑器
        await insertIntoMonacoEditor(targetSide, markdownText)
        
        // 显示成功通知
        notification.showSuccess(
          normalizedLocale === 'zh' ? '图片上传成功' : 'Image Uploaded Successfully',
          normalizedLocale === 'zh' ? '图片已成功上传并插入到编辑器中' : 'Image uploaded and inserted into editor'
        )
        
      } catch (error) {
        console.error('[Debug] Failed to upload pasted image:', error)
        notification.showError(
          normalizedLocale === 'zh' ? '图片上传失败' : 'Image Upload Failed',
          normalizedLocale === 'zh' ? '请检查网络连接和文件格式' : 'Please check your network connection and file format'
        )
      } finally {
        setIsUploadingPastedImage(false)
        setTimeout(() => setPasteUploadProgress(0), 1000)
      }
    }
  }

  // 在Monaco编辑器中插入文本
  const insertIntoMonacoEditor = async (targetSide: 'source' | 'target', text: string) => {
    if (!dualLanguageEditorRef.current) {
      console.warn('[Debug] DualLanguageEditor ref not available')
      return
    }
    
    const editor = targetSide === 'source' 
      ? dualLanguageEditorRef.current.getLeftEditor?.()
      : dualLanguageEditorRef.current.getRightEditor?.()
    
    if (!editor) {
      console.warn('[Debug] Monaco editor instance not available for:', targetSide)
      return
    }
    
    try {
      // 获取当前光标位置
      const position = editor.getPosition()
      if (!position) {
        console.warn('[Debug] No cursor position available, inserting at end')
        const model = editor.getModel()
        if (model) {
          const endPosition = model.getFullModelRange().getEndPosition()
          editor.setPosition(endPosition)
          const newPosition = editor.getPosition()
          if (newPosition) {
            editor.executeEdits('paste-image', [{
              range: {
                startLineNumber: newPosition.lineNumber,
                startColumn: newPosition.column,
                endLineNumber: newPosition.lineNumber,
                endColumn: newPosition.column
              },
              text: text,
              forceMoveMarkers: true
            }])
          }
        }
        return
      }
      
      console.log('[Debug] Inserting text at position:', position, 'Text:', text)
      
      // 在当前位置插入文本
      const success = editor.executeEdits('paste-image', [{
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        },
        text: text,
        forceMoveMarkers: true
      }])
      
      if (success) {
        // 计算新的光标位置（在插入文本之后）
        const lines = text.split('\n')
        let newLine = position.lineNumber
        let newColumn = position.column
        
        if (lines.length > 1) {
          // 多行插入
          newLine = position.lineNumber + lines.length - 1
          newColumn = lines[lines.length - 1].length + 1
        } else {
          // 单行插入
          newColumn = position.column + text.length
        }
        
        // 设置光标到插入文本的末尾
        editor.setPosition({ lineNumber: newLine, column: newColumn })
        
        // 确保编辑器获得焦点
        editor.focus()
        
        console.log('[Debug] Text inserted successfully, new cursor position:', { lineNumber: newLine, column: newColumn })
      } else {
        console.error('[Debug] Failed to insert text into Monaco editor')
      }
      
    } catch (error) {
      console.error('[Debug] Error inserting text into Monaco editor:', error)
    }
  }

  const copyToTarget = () => {
    if (activeField === 'seo') {
      // SEO fields are not language-specific, so no copying needed
      return
    }
    
    const targetTranslation = getTranslation(targetLanguage)
    const sourceTranslation = getTranslation(sourceLanguage)
    
    let hasExistingContent = false
    
    if (activeField === 'basic') {
      hasExistingContent = targetTranslation.title.trim().length > 0 || targetTranslation.summary.trim().length > 0
    } else if (activeField === 'content') {
      hasExistingContent = targetTranslation.content.trim().length > 0
    }
    
    if (hasExistingContent) {
      setShowCopyConfirm(true)
      return
    }
    
    if (activeField === 'basic') {
      updateTranslation(targetLanguage, 'title', sourceTranslation.title)
      updateTranslation(targetLanguage, 'summary', sourceTranslation.summary)
    } else if (activeField === 'content') {
      updateTranslation(targetLanguage, 'content', sourceTranslation.content)
      // Also update DualLanguageEditor if it's active
      if (dualLanguageEditorRef.current) {
        dualLanguageEditorRef.current.setRightValue(sourceTranslation.content)
      }
    }
  }

  const handleConfirmCopy = () => {
    if (activeField === 'seo') {
      // SEO fields are not language-specific, so no copying needed
      setShowCopyConfirm(false)
      return
    }
    
    const sourceTranslation = getTranslation(sourceLanguage)
    
    if (activeField === 'basic') {
      updateTranslation(targetLanguage, 'title', sourceTranslation.title)
      updateTranslation(targetLanguage, 'summary', sourceTranslation.summary)
    } else if (activeField === 'content') {
      updateTranslation(targetLanguage, 'content', sourceTranslation.content)
      // Also update DualLanguageEditor if it's active
      if (dualLanguageEditorRef.current) {
        dualLanguageEditorRef.current.setRightValue(sourceTranslation.content)
      }
    }
    
    setShowCopyConfirm(false)
  }

  // Keyboard shortcuts implementation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey
      
      // Prevent default for our shortcuts
      if (ctrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 's': // Save - Ctrl/Cmd+S
            e.preventDefault()
            if (!loading) {
              handleSubmit(e.shiftKey) // Shift+Ctrl/Cmd+S to save and exit
            }
            break
          
          
          case 'm': // Media picker - Ctrl/Cmd+M
            e.preventDefault()
            if (activeField === 'content') {
              setShowMediaPicker(true)
            }
            break
          
          case 'd': // Copy from source to target - Ctrl/Cmd+D
            e.preventDefault()
            if (editMode === 'translation') {
              copyToTarget()
            }
            break
          
          case 't': // Switch editor mode - Ctrl/Cmd+T
            e.preventDefault()
            setEditMode(prev => prev === 'single' ? 'translation' : 'single')
            break
          
          case 'l': // Switch panels (left/right languages) - Ctrl/Cmd+L
            e.preventDefault()
            if (editMode === 'translation') {
              swapLanguages()
            }
            break
          
          case '1': // Switch to basic field - Ctrl/Cmd+1
            e.preventDefault()
            if (editMode === 'translation') {
              setActiveField('basic')
            }
            break
          
          case '2': // Switch to content field - Ctrl/Cmd+2
            e.preventDefault()
            if (editMode === 'translation') {
              setActiveField('content')
            }
            break
          
          case '3': // Switch to SEO field - Ctrl/Cmd+3
            e.preventDefault()
            if (editMode === 'translation') {
              setActiveField('seo')
            }
            break
          
          case '/': // Show keyboard shortcuts help - Ctrl/Cmd+/
          case '?': // Show keyboard shortcuts help - Ctrl/Cmd+?
            e.preventDefault()
            setShowKeyboardHelp(true)
            break
        }
      }
      
      // Alt/Option shortcuts
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'arrowleft': // Focus left panel - Alt+Left
            e.preventDefault()
            if (editMode === 'translation' && sourceTextareaRef.current) {
              sourceTextareaRef.current.focus()
            }
            break
          
          case 'arrowright': // Focus right panel - Alt+Right
            e.preventDefault()
            if (editMode === 'translation' && targetTextareaRef.current) {
              targetTextareaRef.current.focus()
            }
            break
        }
      }

      // Text formatting shortcuts (when in content field)
      if (activeField === 'content' && ctrlOrCmd) {
        const activeElement = document.activeElement as HTMLTextAreaElement
        if (activeElement && (activeElement === sourceTextareaRef.current || activeElement === targetTextareaRef.current || activeElement.id === 'content')) {
          switch (e.key.toLowerCase()) {
            case 'b': // Bold - Ctrl/Cmd+B
              e.preventDefault()
              insertFormattingAtCursor(activeElement, '**', '**', 'bold text')
              break
            
            case 'i': // Italic - Ctrl/Cmd+I
              e.preventDefault()
              insertFormattingAtCursor(activeElement, '*', '*', 'italic text')
              break
            
            case 'u': // Underline (code) - Ctrl/Cmd+U
              e.preventDefault()
              insertFormattingAtCursor(activeElement, '`', '`', 'code')
              break
            
            case 'k': // Link - Ctrl/Cmd+K
              e.preventDefault()
              insertFormattingAtCursor(activeElement, '[', '](https://example.com)', 'link text')
              break
          }
        }
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown)
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [loading, activeField, editMode, sourceLanguage, targetLanguage, handleSubmit, copyToTarget])

  // Helper function for text formatting
  const insertFormattingAtCursor = (textarea: HTMLTextAreaElement, prefix: string, suffix: string, placeholder: string) => {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    const selectedText = value.substring(start, end)
    
    let newText = ''
    let newCursorPos = start
    
    if (selectedText) {
      // Wrap selected text
      newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end)
      newCursorPos = start + prefix.length + selectedText.length + suffix.length
    } else {
      // Insert with placeholder
      newText = value.substring(0, start) + prefix + placeholder + suffix + value.substring(end)
      newCursorPos = start + prefix.length + placeholder.length
    }
    
    // Update the corresponding field based on which textarea was active
    if (textarea === sourceTextareaRef.current) {
      updateTranslation(sourceLanguage, 'content', newText)
    } else if (textarea === targetTextareaRef.current) {
      updateTranslation(targetLanguage, 'content', newText)
    } else if (textarea.id === 'content') {
      const activeSingleLanguage = singleEditorLanguage || getDefaultLanguage()
      updateTranslation(activeSingleLanguage, 'content', newText)
    }
    
    // Set cursor position after update
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 10)
  }

  const swapLanguages = useCallback(() => {
    if (!sourceLanguage || !targetLanguage) return
    
    const tempLang = sourceLanguage
    setSourceLanguage(targetLanguage)
    setTargetLanguage(tempLang)
  }, [sourceLanguage, targetLanguage])

  const updateTranslation = (language: string | null, field: keyof Pick<ArticleTranslation, 'title' | 'content' | 'summary'>, value: string) => {
    // If language is null, don't update anything
    if (!language) return
    
    const defaultLang = getDefaultLanguage()
    
    // If updating the default language, update formData
    if (language === defaultLang) {
      setFormData(prev => ({ ...prev, [field]: value }))
      return
    }

    // For non-default languages, update the translations array
    setTranslations(prev => {
      const newTranslations = [...prev]
      const existingIndex = newTranslations.findIndex(t => t.language === language)
      
      if (existingIndex >= 0) {
        // Update existing translation
        newTranslations[existingIndex] = {
          ...newTranslations[existingIndex],
          [field]: value,
          updated_at: new Date().toISOString()
        }
      } else {
        // Create new translation entry only for non-default languages
        const newTranslation: ArticleTranslation = {
          id: 0,
          article_id: article?.id || 0,
          language,
          title: field === 'title' ? value : '',
          content: field === 'content' ? value : '',
          summary: field === 'summary' ? value : '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        newTranslations.push(newTranslation)
      }
      
      return newTranslations
    })
  }

  interface OnlineVideo {
    id: string
    url: string
    title: string
    thumbnail: string
    platform: 'youtube' | 'bilibili'
  }

  const handleMediaSelect = (media: MediaLibrary | OnlineVideo, type: 'media' | 'online') => {
    // Handle cover image selection
    if (isSelectingCoverImage && type === 'media') {
      const uploadedMedia = media as MediaLibrary
      if (uploadedMedia.media_type === 'image') {
        console.log('🖼️ Cover image selected:', uploadedMedia)
        handleCoverImageSelect(uploadedMedia)
        setIsSelectingCoverImage(false)
        return
      }
    }

    let markdownText = ''
    
    if (type === 'media') {
      const uploadedMedia = media as MediaLibrary
      if (uploadedMedia.media_type === 'image') {
        markdownText = `![${uploadedMedia.alt || uploadedMedia.original_name}](${getApiUrl()}${uploadedMedia.url})`
      } else {
        markdownText = `<video src="${getApiUrl()}${uploadedMedia.url}" controls>\n  Your browser does not support the video tag.\n</video>`
      }
    } else {
      const onlineVideo = media as OnlineVideo
      if (onlineVideo.platform === 'youtube') {
        markdownText = `<YouTubeEmbed url="${onlineVideo.url}" title="${onlineVideo.title}" />`
      } else {
        markdownText = `<BiliBiliEmbed url="${onlineVideo.url}" title="${onlineVideo.title}" />`
      }
    }

    // Insert the markdown text
    if (editMode === 'single') {
      insertTextAtCursor('single', markdownText)
    } else if (activeField === 'content') {
      // Insert into both editors at the same position
      insertTextAtSamePosition(markdownText)
    } else {
      // In translation mode for basic fields, insert into both source and target at the same relative position
      insertTextAtSamePosition(markdownText)
    }
  }

  const saveTextareaSelection = (textarea: 'source' | 'target' | 'single', element: HTMLTextAreaElement | null) => {
    if (!element) return

    setSavedCursorSelection({
      textarea,
      start: element.selectionStart,
      end: element.selectionEnd,
    })

    setActiveTextarea(textarea)
  }

  const insertBlockIntoContent = (content: string, start: number, end: number, text: string) => {
    const beforeSelection = content.slice(0, start)
    const afterSelection = content.slice(end)
    const linePrefix = beforeSelection.slice(beforeSelection.lastIndexOf('\n') + 1)
    const nextLineBreakIndex = afterSelection.indexOf('\n')
    const lineSuffix = nextLineBreakIndex === -1 ? afterSelection : afterSelection.slice(0, nextLineBreakIndex)
    const contentBeforeLine = beforeSelection.slice(0, beforeSelection.length - linePrefix.length)
    const contentAfterLine = afterSelection.slice(lineSuffix.length)
    const segments = [linePrefix, text, lineSuffix].filter((segment) => segment.length > 0)
    const replacement = segments.join('\n')
    const cursorOffset = linePrefix.length > 0 ? linePrefix.length + 1 + text.length : text.length

    return {
      newContent: contentBeforeLine + replacement + contentAfterLine,
      newCursorPosition: contentBeforeLine.length + cursorOffset,
    }
  }

  const insertTextAtSamePosition = (text: string) => {
    const sourceTextarea = sourceTextareaRef.current
    const targetTextarea = targetTextareaRef.current
    let cursorPosition = savedCursorSelection.start
    let selectionEnd = savedCursorSelection.end
    let insertionSide: 'source' | 'target' = savedCursorSelection.textarea === 'target' ? 'target' : 'source'

    if (sourceTextarea && document.activeElement === sourceTextarea) {
      cursorPosition = sourceTextarea.selectionStart
      selectionEnd = sourceTextarea.selectionEnd
      insertionSide = 'source'
    } else if (targetTextarea && document.activeElement === targetTextarea) {
      cursorPosition = targetTextarea.selectionStart
      selectionEnd = targetTextarea.selectionEnd
      insertionSide = 'target'
    }
    
    const activeLanguage = insertionSide === 'source' ? sourceLanguage : targetLanguage
    const activeTranslation = getTranslation(activeLanguage)
    const beforeCursor = activeTranslation.content.substring(0, cursorPosition)
    const lines = beforeCursor.split('\n')
    const lineIndex = lines.length - 1
    const columnIndex = lines[lines.length - 1].length
    
    insertTextAtPosition('source', text, lineIndex, columnIndex, insertionSide === 'source' ? selectionEnd : cursorPosition)
    insertTextAtPosition('target', text, lineIndex, columnIndex, insertionSide === 'target' ? selectionEnd : cursorPosition)
  }

  const insertTextAtPosition = (textarea: 'source' | 'target', text: string, lineIndex: number, columnIndex: number, selectionEnd?: number) => {
    const language = textarea === 'source' ? sourceLanguage : targetLanguage
    const translation = getTranslation(language)
    const lines = translation.content.split('\n')
    
    // Ensure we have enough lines
    while (lines.length <= lineIndex) {
      lines.push('')
    }
    
    const targetLine = lines[lineIndex]
    const safeColumnIndex = Math.min(columnIndex, targetLine.length)
    const lineStartOffset = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0)
    const startOffset = lineStartOffset + safeColumnIndex
    const endOffset = typeof selectionEnd === 'number' && selectionEnd >= startOffset ? selectionEnd : startOffset
    const { newContent, newCursorPosition } = insertBlockIntoContent(translation.content, startOffset, endOffset, text)
    
    updateTranslation(language, 'content', newContent)
    
    setTimeout(() => {
      const textareaElement = textarea === 'source' ? sourceTextareaRef.current : targetTextareaRef.current
      if (textareaElement) {
        if (savedCursorSelection.textarea === textarea) {
          textareaElement.focus()
          textareaElement.setSelectionRange(newCursorPosition, newCursorPosition)
        }
      }
    }, 10)
  }

  const insertTextAtCursor = (textarea: 'source' | 'target' | 'single', text: string) => {
    let currentValue = ''
    let language = ''
    
    if (editMode === 'single') {
      const activeSingleLanguage = singleEditorLanguage || getDefaultLanguage()
      const translation = getTranslation(activeSingleLanguage)
      currentValue = translation.content
      language = activeSingleLanguage
    } else {
      if (textarea === 'source') {
        const translation = getTranslation(sourceLanguage!)
        currentValue = translation.content
        language = sourceLanguage!
      } else {
        const translation = getTranslation(targetLanguage!)
        currentValue = translation.content
        language = targetLanguage!
      }
    }

    // Get cursor position
    let cursorPosition = textarea === savedCursorSelection.textarea ? savedCursorSelection.start : 0
    let selectionEnd = textarea === savedCursorSelection.textarea ? savedCursorSelection.end : cursorPosition
    const textareaElement = editMode === 'single' 
      ? singleTextareaRef.current
      : (textarea === 'source' ? sourceTextareaRef.current : targetTextareaRef.current)
    
    if (textareaElement && document.activeElement === textareaElement) {
      cursorPosition = textareaElement.selectionStart
      selectionEnd = textareaElement.selectionEnd
    }

    const { newContent, newCursorPosition } = insertBlockIntoContent(currentValue, cursorPosition, selectionEnd, text)
    
    updateTranslation(language, 'content', newContent)

    setTimeout(() => {
      if (textareaElement) {
        textareaElement.focus()
        textareaElement.setSelectionRange(newCursorPosition, newCursorPosition)
      }
    }, 10)
  }

  const handleMediaButtonClick = (textareaType: 'source' | 'target' | 'single') => {
    const singleTextarea = singleTextareaRef.current
    const sourceTextarea = sourceTextareaRef.current
    const targetTextarea = targetTextareaRef.current

    if (editMode === 'single') {
      saveTextareaSelection('single', singleTextarea)
    } else if (targetTextarea && document.activeElement === targetTextarea) {
      saveTextareaSelection('target', targetTextarea)
    } else {
      saveTextareaSelection('source', sourceTextarea)
    }

    setActiveTextarea(editMode === 'translation' ? savedCursorSelection.textarea === 'target' ? 'target' : 'source' : textareaType)
    setShowMediaPicker(true)
  }

  const handleCoverImageSelect = (media: MediaLibrary) => {
    console.log('🔄 Setting cover image data:', {
      url: media.url,
      id: media.id,
      alt: media.alt || ""
    })
    setFormData(prev => {
      const newData = {
        ...prev,
        cover_image_url: media.url,
        cover_image_id: media.id,
        cover_image_alt: media.alt || ""
      }
      console.log('📝 Updated formData:', newData)
      return newData
    })
    setShowMediaPicker(false)
  }

  const removeCoverImage = () => {
    setFormData(prev => ({
      ...prev,
      cover_image_url: "",
      cover_image_id: undefined,
      cover_image_alt: ""
    }))
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

  const handleTextareaScroll = (side: 'source' | 'target', event: React.UIEvent<HTMLTextAreaElement>) => {
    if (isScrollSyncing) return
    
    const { scrollTop, scrollLeft } = event.currentTarget
    
    setIsScrollSyncing(true)
    
    if (side === 'source') {
      setSourceScrollTop(scrollTop)
      if (targetTextareaRef.current) {
        targetTextareaRef.current.scrollTop = scrollTop
        targetTextareaRef.current.scrollLeft = scrollLeft
      }
    } else {
      setTargetScrollTop(scrollTop)
      if (sourceTextareaRef.current) {
        sourceTextareaRef.current.scrollTop = scrollTop
        sourceTextareaRef.current.scrollLeft = scrollLeft
      }
    }
    
    // Reset sync flag after a brief delay
    setTimeout(() => setIsScrollSyncing(false), 50)
  }

  const handleTextareaClick = (side: 'source' | 'target', event: React.MouseEvent<HTMLTextAreaElement>) => {
    if (activeField !== 'content') return
    
    const textarea = event.currentTarget
    const rect = textarea.getBoundingClientRect()
    const y = event.clientY - rect.top
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight)
    const lineNumber = Math.floor(y / lineHeight)
    
    setActiveLine(lineNumber)
  }

  const sourceTranslation = getTranslation(sourceLanguage!)
  const targetTranslation = getTranslation(targetLanguage!)

  const renderLineNumbers = (lines: string[], side: 'source' | 'target') => {
    if (activeField !== 'content') return null
    
    return (
      <div 
        className="absolute left-0 top-0 w-12 h-full border-r border-border text-xs text-muted-foreground font-mono select-none bg-background"
        style={{ 
          zIndex: 20
        }}
      >
        <div className="py-4">
          {lines.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-5 flex items-center justify-end pr-2 leading-5",
                activeLine === index && "bg-primary/10",
                translationProgress.untranslatedLines.includes(index) && "bg-yellow-100 dark:bg-yellow-900/20"
              )}
              style={{ lineHeight: '20px' }}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderSingleEditor = () => {
    const defaultLang = getDefaultLanguage()
    const activeSingleLanguage = singleEditorLanguage || defaultLang
    const currentTranslation = getTranslation(activeSingleLanguage)
    const isDefaultSingleLanguage = activeSingleLanguage === defaultLang
    
    // If we're showing SEO, render it directly
    if (activeField === 'seo') {
      return (
        <div className="flex-1 overflow-auto">
          <div className="p-4 max-w-4xl mx-auto">
            <ArticleSEOForm
              article={{
                ...article,
                ...formData,
                id: article?.id || 0,
                category: article?.category || { id: 0, name: '', description: '', created_at: '', updated_at: '' },
                default_lang: getDefaultLanguage(),
                translations: article?.translations || [],
                created_at: article?.created_at || new Date().toISOString(),
                updated_at: article?.updated_at || new Date().toISOString()
              }}
              translations={translations}
              activeLanguage={defaultLang}
              locale={normalizedLocale}
              onSEOChange={handleSEOChange}
            />
          </div>
        </div>
      )
    }
    
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 pb-28 max-w-4xl">
          <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('article.title')}</Label>
            <Input
              id="title"
              value={currentTranslation.title}
              onChange={(e) => updateTranslation(activeSingleLanguage, 'title', e.target.value)}
              placeholder={t('article.enterTitle')}
              className="text-lg font-semibold"
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">{t('article.summary')}</Label>
            <Textarea
              id="summary"
              value={currentTranslation.summary}
              onChange={(e) => updateTranslation(activeSingleLanguage, 'summary', e.target.value)}
              placeholder={t('article.enterSummary')}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Publication Time */}
          {isDefaultSingleLanguage && (
          <div className="space-y-2">
            <Label htmlFor="created_at" className="flex items-center gap-2">
              {normalizedLocale === 'zh' ? '发布时间' : 'Publication Time'}
              <span className="text-xs text-muted-foreground font-normal">
                {formatPublicationTime(formData.created_at)}
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="created_at"
                type="datetime-local"
                value={new Date(formData.created_at).toISOString().slice(0, 16)}
                onChange={(e) => {
                  const validation = validatePublicationTime(e.target.value)
                  if (validation.isValid) {
                    setFormData(prev => ({
                      ...prev,
                      created_at: new Date(e.target.value).toISOString()
                    }))
                  } else if (validation.message) {
                    notification.showError(
                      normalizedLocale === 'zh' ? '无效的发布时间' : 'Invalid Publication Time',
                      validation.message
                    )
                  }
                }}
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  created_at: new Date().toISOString()
                }))}
                className="text-xs"
              >
                {normalizedLocale === 'zh' ? '现在' : 'Now'}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                {normalizedLocale === 'zh' 
                  ? '设置文章的发布时间。如果设置为未来时间，文章将在该时间自动发布。点击"现在"设置为当前时间。'
                  : 'Set the publication time for the article. If set to a future time, the article will be automatically published at that time. Click "Now" to set to current time.'
                }
              </p>
              <p className="font-mono">
                {normalizedLocale === 'zh' ? '当前时区' : 'Current timezone'}: {getCurrentTimezone()}
              </p>
              <p className="font-mono">
                {normalizedLocale === 'zh' ? '显示时间' : 'Display time'}: {formatDateTimeWithTimezone(formData.created_at)}
              </p>
            </div>
          </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="content">{t('article.content')}</Label>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">
                    {normalizedLocale === 'zh' ? '编辑语言' : 'Editing Language'}
                  </Label>
                  <Select
                    value={activeSingleLanguage}
                    onValueChange={(value) => setSingleEditorLanguage(value as SupportedLanguage)}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue>{getLanguageDisplayName(activeSingleLanguage)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSinglePreview((prev) => !prev)}
                  className="h-8"
                >
                  {showSinglePreview ? <Edit3 className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showSinglePreview ? t('common.edit') : t('common.preview')}
                </Button>

                {!showSinglePreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMediaButtonClick('single')}
                    className="h-8 px-2"
                    title={t('article.insertMedia')}
                  >
                    <Image className="h-3 w-3 mr-1" />
                    {t('article.insertMedia')}
                  </Button>
                )}
              </div>
            </div>
            {showSinglePreview ? (
              <Card className="min-h-[calc(100vh-420px)] max-h-[calc(100vh-240px)] overflow-y-auto">
                <CardHeader>
                  <CardTitle className="text-lg">{t('common.preview')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {currentTranslation.content ? (
                    <MarkdownRenderer content={currentTranslation.content} />
                  ) : (
                    <p className="text-muted-foreground">{t('article.enterContent')}</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Textarea
                ref={singleTextareaRef}
                id="content"
                value={currentTranslation.content}
                onChange={(e) => updateTranslation(activeSingleLanguage, 'content', e.target.value)}
                onSelect={(e) => saveTextareaSelection('single', e.currentTarget)}
                onClick={(e) => saveTextareaSelection('single', e.currentTarget)}
                onKeyUp={(e) => saveTextareaSelection('single', e.currentTarget)}
                onFocus={(e) => saveTextareaSelection('single', e.currentTarget)}
                placeholder={t('article.enterContent')}
                className="min-h-[calc(100vh-420px)] resize-none font-mono text-sm"
              />
            )}
          </div>
        </div>
      </div>
      </div>
    )
  }

  const renderField = (language: string, translation: ArticleTranslation, isPreview: boolean, side: 'source' | 'target') => {
    const isSource = language === sourceLanguage
    
    switch (activeField) {
      case 'basic':
        return isPreview ? (
          <div className="p-4 space-y-4">
            {/* Cover Image Preview */}
            {formData.cover_image_url && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {normalizedLocale === 'zh' ? '封面预览' : 'Cover Preview'}
                </h3>
                <img
                  src={getMediaUrl(formData.cover_image_url)}
                  alt={formData.cover_image_alt}
                  className="w-full max-w-md h-48 object-cover rounded-lg border"
                />
                {formData.cover_image_alt && (
                  <p className="text-xs text-muted-foreground">
                    Alt: {formData.cover_image_alt}
                  </p>
                )}
              </div>
            )}
            <h1 className="text-2xl font-bold">{translation.title || 'Untitled'}</h1>
            <p className="text-muted-foreground leading-relaxed">{translation.summary || 'No summary'}</p>
            
            {/* SEO信息预览 */}
            {(formData.seo_title || formData.seo_description) && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <h3 className="text-sm font-medium mb-2">{t('seo.seoPreview')}</h3>
                <div className="space-y-2">
                  {formData.seo_title && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('seo.seoTitle')}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 truncate">
                        {formData.seo_title} <span className="text-xs text-muted-foreground">({formData.seo_title.length}/60)</span>
                      </p>
                    </div>
                  )}
                  {formData.seo_description && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('seo.seoDescription')}</p>
                      <p className="text-sm text-foreground/80 leading-tight line-clamp-2">
                        {formData.seo_description} <span className="text-xs text-muted-foreground">({formData.seo_description.length}/160)</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span>
                  {sourceLanguage === 'zh' ? '发布时间' : 'Publication Time'}: {formatDateTimeWithTimezone(formData.created_at)}
                </span>
                <span className="text-xs">
                  {formatPublicationTime(formData.created_at)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor={`title-${side}`}>{t('article.title')}</Label>
              <Input
                id={`title-${side}`}
                value={translation.title}
                onChange={(e) => updateTranslation(language, 'title', e.target.value)}
                placeholder={t('article.enterTitle')}
                className="text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`summary-${side}`}>{t('article.summary')}</Label>
              <Textarea
                id={`summary-${side}`}
                value={translation.summary}
                onChange={(e) => updateTranslation(language, 'summary', e.target.value)}
                placeholder={t('article.enterSummary')}
                className="min-h-[100px] resize-none"
              />
            </div>
            {/* Cover Image Section - Only show on source side and only if it's default language */}
            {isSource && language === getDefaultLanguage() && (
              <div className="space-y-2">
                <Label>{normalizedLocale === 'zh' ? '封面图片' : 'Cover Image'}</Label>
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
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                      onClick={removeCoverImage}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsSelectingCoverImage(true)
                      setShowMediaPicker(true)
                    }}
                    className="h-32 w-48 border-dashed flex flex-col items-center justify-center gap-2"
                  >
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {normalizedLocale === 'zh' ? '选择封面图片' : 'Select Cover Image'}
                    </span>
                  </Button>
                )}
                {formData.cover_image_url && (
                  <div className="space-y-2">
                    <Label htmlFor="cover-image-alt">{normalizedLocale === 'zh' ? '图片描述 (Alt)' : 'Image Alt Text'}</Label>
                    <Input
                      id="cover-image-alt"
                      value={formData.cover_image_alt}
                      onChange={(e) => setFormData(prev => ({ ...prev, cover_image_alt: e.target.value }))}
                      placeholder={normalizedLocale === 'zh' ? '输入图片描述...' : 'Enter image description...'}
                    />
                  </div>
                )}
              </div>
            )}
            {/* SEO快捷字段 - Only show on source side and only if it's default language */}
            {isSource && language === getDefaultLanguage() && (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`seo_title-${side}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t('seo.seoTitle')}
                      <span className="text-xs text-muted-foreground">
                        ({formData.seo_title.length}/60)
                      </span>
                    </div>
                    {!formData.seo_title && formData.title && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, seo_title: prev.title }))}
                        className="h-6 px-2 text-xs"
                      >
                        {normalizedLocale === 'zh' ? '使用标题' : 'Use Title'}
                      </Button>
                    )}
                  </Label>
                  <Input
                    id={`seo_title-${side}`}
                    value={formData.seo_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, seo_title: e.target.value }))}
                    placeholder={formData.title || t('seo.seoTitlePlaceholder')}
                    className={cn(
                      formData.seo_title.length > 60 && "border-yellow-500 focus:border-yellow-500"
                    )}
                  />
                  {formData.seo_title.length > 60 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      {normalizedLocale === 'zh' ? '建议不超过60个字符' : 'Recommended under 60 characters'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`seo_description-${side}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t('seo.seoDescription')}
                      <span className="text-xs text-muted-foreground">
                        ({formData.seo_description.length}/160)
                      </span>
                    </div>
                    {!formData.seo_description && formData.summary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, seo_description: prev.summary }))}
                        className="h-6 px-2 text-xs"
                      >
                        {normalizedLocale === 'zh' ? '使用摘要' : 'Use Summary'}
                      </Button>
                    )}
                  </Label>
                  <Textarea
                    id={`seo_description-${side}`}
                    value={formData.seo_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, seo_description: e.target.value }))}
                    placeholder={formData.summary || t('seo.seoDescriptionPlaceholder')}
                    className={cn(
                      "min-h-[80px] resize-none",
                      formData.seo_description.length > 160 && "border-yellow-500 focus:border-yellow-500"
                    )}
                  />
                  {formData.seo_description.length > 160 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      {normalizedLocale === 'zh' ? '建议不超过160个字符' : 'Recommended under 160 characters'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`seo_keywords-${side}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t('seo.seoKeywords')}
                      <span className="text-xs text-muted-foreground">
                        ({formData.seo_keywords.split(',').filter(k => k.trim()).length} {normalizedLocale === 'zh' ? '个关键字' : 'keywords'})
                      </span>
                    </div>
                  </Label>
                  <Input
                    id={`seo_keywords-${side}`}
                    value={formData.seo_keywords}
                    onChange={(e) => setFormData(prev => ({ ...prev, seo_keywords: e.target.value }))}
                    placeholder={t('seo.seoKeywordsPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {normalizedLocale === 'zh' ? '用逗号分隔关键字' : 'Separate keywords with commas'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`seo_slug-${side}`}>
                    {t('seo.seoSlug')}
                  </Label>
                  <Input
                    id={`seo_slug-${side}`}
                    value={formData.seo_slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, seo_slug: e.target.value }))}
                    placeholder={t('seo.seoSlugPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {normalizedLocale === 'zh' ? '自定义URL路径，留空则自动生成' : 'Custom URL path, leave empty to auto-generate'}
                  </p>
                </div>
              </>
            )}

            {/* Publication Time - Only show on source side and only if it's default language */}
            {isSource && language === getDefaultLanguage() && (
              <div className="space-y-2">
                <Label htmlFor={`created_at-${side}`} className="flex items-center gap-2">
                  {sourceLanguage === 'zh' ? '发布时间' : 'Publication Time'}
                  <span className="text-xs text-muted-foreground font-normal">
                    {formatPublicationTime(formData.created_at)}
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`created_at-${side}`}
                    type="datetime-local"
                    value={new Date(formData.created_at).toISOString().slice(0, 16)}
                    onChange={(e) => {
                      const validation = validatePublicationTime(e.target.value)
                      if (validation.isValid) {
                        setFormData(prev => ({
                          ...prev,
                          created_at: new Date(e.target.value).toISOString()
                        }))
                      } else if (validation.message) {
                        notification.showError(
                          normalizedLocale === 'zh' ? '无效的发布时间' : 'Invalid Publication Time',
                          validation.message
                        )
                      }
                    }}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      created_at: new Date().toISOString()
                    }))}
                    className="text-xs"
                  >
                    {normalizedLocale === 'zh' ? '现在' : 'Now'}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    {normalizedLocale === 'zh' 
                      ? '设置文章的发布时间。如果设置为未来时间，文章将在该时间自动发布。'
                      : 'Set the publication time for the article. If set to a future time, the article will be automatically published at that time.'
                    }
                  </p>
                  <p className="font-mono">
                    {normalizedLocale === 'zh' ? '时区' : 'Timezone'}: {getCurrentTimezone()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      
      case 'content':
        const lines = translation.content.split('\n')
        
        return isPreview ? (
          <div className="p-4 h-full overflow-y-auto">
            {translation.content ? (
              <MarkdownRenderer content={translation.content} />
            ) : (
              <p className="text-muted-foreground">No content</p>
            )}
          </div>
        ) : (
          <div className="relative flex-1 h-full overflow-hidden">
            {renderLineNumbers(lines, side)}
            {/* Highlight untranslated lines - behind textarea */}
            <div className="absolute inset-0 pl-14 pr-4 py-4 pointer-events-none font-mono text-sm leading-5 overflow-hidden" style={{ zIndex: 0 }}>
              {lines.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-5 leading-5",
                    activeLine === index && "bg-primary/5",
                    translationProgress.untranslatedLines.includes(index) && "bg-yellow-50 dark:bg-yellow-900/10"
                  )}
                  style={{ 
                    lineHeight: '20px',
                    width: 'calc(100% - 56px)', // Subtract line number width (14*4=56px)
                    overflow: 'hidden'
                  }}
                />
              ))}
            </div>
            <Textarea
              ref={side === 'source' ? sourceTextareaRef : targetTextareaRef}
              value={translation.content}
              onChange={(e) => updateTranslation(language, 'content', e.target.value)}
              onScroll={(e) => handleTextareaScroll(side, e)}
              onClick={(e) => {
                handleTextareaClick(side, e)
                saveTextareaSelection(side, e.currentTarget)
              }}
              onSelect={(e) => saveTextareaSelection(side, e.currentTarget)}
              onKeyUp={(e) => saveTextareaSelection(side, e.currentTarget)}
              onFocus={(e) => saveTextareaSelection(side, e.currentTarget)}
              placeholder={t('article.enterContent')}
              className="pl-14 pr-4 py-4 border-0 shadow-none focus-visible:ring-0 resize-none font-mono text-sm w-full h-full bg-transparent overflow-auto relative"
              style={{
                lineHeight: '20px',
                whiteSpace: 'pre',
                overflowWrap: 'normal',
                wordWrap: 'normal',
                minHeight: '100%',
                zIndex: 1
              }}
            />
          </div>
        )
      
      default:
        return null
    }
  }

  // Don't render until languages are initialized
  if (!sourceLanguage || !targetLanguage) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
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
        {categories.length > 0 && (
          <Select
            value={formData.category_id > 0 ? formData.category_id.toString() : categories[0]?.id.toString() || ""}
            onValueChange={(value) => {
              const categoryId = parseInt(value)
              if (categoryId !== formData.category_id) {
                setFormData(prev => ({ ...prev, category_id: categoryId }))
              }
            }}
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
        )}

        <div className="mx-2 h-4 w-px bg-border" />

        {/* Mode Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditMode(editMode === 'single' ? 'translation' : 'single')}
          className="h-8 gap-2"
          title={editMode === 'single'
            ? (normalizedLocale === 'zh' ? '切换到翻译双栏模式' : 'Switch to translation two-column mode')
            : (normalizedLocale === 'zh' ? '切换到全屏单栏写作模式' : 'Switch to fullscreen single-column writing mode')}
        >
          {editMode === 'single' ? (
            <>
              <Languages className="h-4 w-4" />
              {t('article.translationEditor')}
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 opacity-50" />
              {t('article.simpleEditor')}
            </>
          )}
        </Button>

        <div className="mx-2 h-4 w-px bg-border" />

        {/* Keyboard Shortcuts Help */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowKeyboardHelp(true)}
          className="h-8"
          title="Keyboard Shortcuts (Ctrl+/)"
        >
          <Keyboard className="h-4 w-4" />
        </Button>

        <div className="mx-2 h-4 w-px bg-border" />

        {/* Translation Stats - show current provider and usage */}
        <TranslationStats 
          className="hidden lg:flex"
          showDetailed={false} 
          locale={locale} 
        />

        <div className="mx-2 h-4 w-px bg-border" />

        {/* Auto Translate All Button - only show in translation mode */}
        {editMode === 'translation' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAutoTranslate('all')}
              disabled={isTranslating || !hasTranslationProvider}
              className="h-8 gap-2"
              title={normalizedLocale === 'zh' 
                ? `自动翻译到所有启用的语言 (${languageManager.getEnabledLanguages().filter(l => l !== sourceLanguage).length} 种语言)`
                : `Auto translate to all enabled languages (${languageManager.getEnabledLanguages().filter(l => l !== sourceLanguage).length} languages)`
              }
            >
              {isTranslating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span className="text-xs">
                {isTranslating && currentTranslatingLanguage ? (
                  normalizedLocale === 'zh' 
                    ? `正在翻译到 ${SUPPORTED_LANGUAGES[currentTranslatingLanguage] || currentTranslatingLanguage}`
                    : `Translating to ${SUPPORTED_LANGUAGES[currentTranslatingLanguage] || currentTranslatingLanguage}`
                ) : (
                  normalizedLocale === 'zh' 
                    ? `翻译全部 (${languageManager.getEnabledLanguages().filter(l => l !== sourceLanguage).length})`
                    : `Translate All (${languageManager.getEnabledLanguages().filter(l => l !== sourceLanguage).length})`
                )}
              </span>
            </Button>
            <div className="mx-2 h-4 w-px bg-border" />
          </>
        )}

        <div className="flex">
          <Button
            onClick={() => handleSubmit(false)}
            disabled={loading || saveStatus === 'saving'}
            size="sm"
            className={cn(
              "h-8 rounded-r-none transition-colors",
              saveStatus === 'saved' && "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600",
              saveStatus === 'error' && "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
            )}
          >
            {saveStatus === 'saving' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {saveStatus === 'saved' && <Check className="h-4 w-4 mr-2" />}
            {saveStatus === 'error' && <X className="h-4 w-4 mr-2" />}
            {saveStatus === 'idle' && <Save className="h-4 w-4 mr-2" />}
            {saveStatus === 'saving' ? t('common.saving') : 
             saveStatus === 'saved' ? t('common.saved') || 'Saved' :
             saveStatus === 'error' ? t('common.saveFailed') || 'Save Failed' :
             t('common.save')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className={cn(
                  "h-8 px-2 rounded-l-none border-l",
                  saveStatus === 'saved' && "bg-green-600 hover:bg-green-700 border-green-700 dark:bg-green-500 dark:hover:bg-green-600 dark:border-green-500",
                  saveStatus === 'error' && "bg-red-600 hover:bg-red-700 border-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:border-red-500"
                )}
                disabled={loading || saveStatus === 'saving'}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSubmit(true)}>
                <Save className="h-4 w-4 mr-2" />
                {normalizedLocale === 'zh' ? '保存并退出' : 'Save and Exit'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Field Tabs - Only show in translation mode */}
      {editMode === 'translation' && (
        <div className="h-10 border-b flex items-center bg-muted/30">
          <div className="flex">
            {(['basic', 'content', 'seo'] as const).map((field) => (
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
                {field === 'seo' ? t('seo.seoSettings') : 
                 field === 'basic' ? `${t('article.title')} & ${t('article.summary')}` : 
                 t(`article.${field}`)}
              </button>
            ))}
          </div>
          
          <div className="flex-1" />
          
          {/* Translation Progress */}
          {activeField === 'content' && translationProgress.totalLines > 0 && (
            <div className="text-xs text-muted-foreground mr-4">
              {(translationProgress.untranslatedCount || 0) > 0 ? (
                <span className="text-orange-600 dark:text-orange-400">
                  {translationProgress.untranslatedCount} {t('article.linesUntranslated')}
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400">
                  {t('article.translationComplete')}
                </span>
              )}
            </div>
          )}
          
          {/* Media Insert Button - Only show for content field */}
          {activeField === 'content' && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMediaButtonClick('source')}
                className="h-7 px-2"
                title={t('article.insertMedia')}
              >
                <Image className="h-4 w-4" />
                <span className="ml-1 text-xs">{t('article.insertMedia')}</span>
              </Button>
            </div>
          )}

          {/* AI Summary Buttons - Only show when AI service is configured */}
          {hasAISummaryProvider && (
            <div className="flex items-center gap-1 mr-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    disabled={isGeneratingAI}
                    title={normalizedLocale === 'zh' ? 'AI生成内容' : 'AI Generate Content'}
                  >
                    {isGeneratingAI ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span className="ml-1 text-xs">
                      {normalizedLocale === 'zh' ? 'AI生成' : 'AI Generate'}
                    </span>
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem 
                    onClick={() => handleAIGenerate('all')}
                    disabled={isGeneratingAI}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {normalizedLocale === 'zh' ? '生成全部 (标题+摘要+关键字)' : 'Generate All (Title+Summary+Keywords)'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleAIGenerate('title')}
                    disabled={isGeneratingAI}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {normalizedLocale === 'zh' ? '生成标题' : 'Generate Title'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleAIGenerate('summary')}
                    disabled={isGeneratingAI}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {normalizedLocale === 'zh' ? '生成摘要' : 'Generate Summary'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleAIGenerate('keywords')}
                    disabled={isGeneratingAI}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    {normalizedLocale === 'zh' ? '生成SEO关键字' : 'Generate SEO Keywords'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Comment Translation Button - Only show for content field and when translation service is configured */}
          {activeField === 'content' && hasTranslationProvider && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCommentTranslation}
                className="h-7 px-2"
                title={normalizedLocale === 'zh' ? '翻译代码注释' : 'Translate Code Comments'}
              >
                <Code className="h-4 w-4" />
                <span className="ml-1 text-xs">
                  {normalizedLocale === 'zh' ? '注释翻译' : 'Comments'}
                </span>
              </Button>
            </div>
          )}
          
          {/* Preview Toggle - Hide for SEO */}
        </div>
      )}

      {/* Main Editor Area */}
      {editMode === 'single' || activeField === 'seo' ? (
        renderSingleEditor()
      ) : activeField === 'content' ? (
        // Use Monaco Editor for content field
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Language Headers */}
          <div className="h-9 border-b flex bg-muted/20">
            <div className="flex-1 px-4 flex items-center justify-between border-r">
              <div className="flex items-center gap-2">
                <Select value={sourceLanguage} onValueChange={(value) => {
                  const typedValue = value as SupportedLanguage
                  if (typedValue !== sourceLanguage) {
                    setSourceLanguage(typedValue)
                    if (typedValue === targetLanguage) {
                      const otherLang = availableLanguages.find(lang => lang.code !== typedValue)
                      if (otherLang) {
                        setTargetLanguage(otherLang.code)
                      }
                    }
                  }
                }}>
                  <SelectTrigger className="h-6 w-32 text-xs">
                    <SelectValue>{getLanguageDisplayName(sourceLanguage)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.filter(lang => lang.code !== targetLanguage).map(lang => (
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
                      progress[sourceLanguage] === 100 ? "bg-green-500 dark:bg-green-400" : 
                      progress[sourceLanguage] > 0 ? "bg-yellow-500 dark:bg-yellow-400" : "bg-muted"
                    )}
                    style={{ width: `${progress[sourceLanguage]}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Swap Languages Button */}
            <div className="flex items-center justify-center border-r">
              <Button
                variant="ghost"
                size="sm"
                onClick={swapLanguages}
                className="h-6 w-6 px-0 hover:bg-primary/10"
                title={normalizedLocale === 'zh' ? '交换左右语言' : 'Swap Languages'}
              >
                <ArrowLeftRight className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex-1 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select value={targetLanguage} onValueChange={(value) => {
                  console.log('Target language change (top):', { value, currentTarget: targetLanguage, currentSource: sourceLanguage })
                  console.log('Available languages for target (top):', availableLanguages.filter(lang => lang.code !== sourceLanguage))
                  const typedValue = value as SupportedLanguage
                  if (typedValue !== targetLanguage) {
                    console.log('Setting target language to (top):', typedValue)
                    setTargetLanguage(typedValue)
                    if (typedValue === sourceLanguage) {
                      console.log('Target same as source (top), finding other language...')
                      const otherLang = availableLanguages.find(lang => lang.code !== typedValue)
                      console.log('Found other language (top):', otherLang)
                      if (otherLang) {
                        console.log('Setting source to (top):', otherLang.code)
                        setSourceLanguage(otherLang.code)
                      }
                    }
                  }
                }}>
                  <SelectTrigger className="h-6 w-32 text-xs">
                    <SelectValue>{getLanguageDisplayName(targetLanguage)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const filteredLangs = availableLanguages.filter(lang => lang.code !== sourceLanguage)
                      console.log('Rendering target language options (top):', filteredLangs, 'sourceLanguage:', sourceLanguage)
                      return filteredLangs.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))
                    })()}
                  </SelectContent>
                </Select>
                <div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all",
                      progress[targetLanguage] === 100 ? "bg-green-500 dark:bg-green-400" : 
                      progress[targetLanguage] > 0 ? "bg-yellow-500 dark:bg-yellow-400" : "bg-muted"
                    )}
                    style={{ width: `${progress[targetLanguage]}%` }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToTarget}
                  className="h-6 px-2 ml-1"
                  title="Copy from source"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAutoTranslate('content')}
                  disabled={isTranslating || !hasTranslationProvider}
                  className="h-6 px-2"
                  title="Auto translate this field"
                >
                  {isTranslating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Dual Language Editor */}
          <div className="flex-1 overflow-hidden">
            <DualLanguageEditor
              key={`dual-editor-${sourceLanguage}-${targetLanguage}`}
              ref={dualLanguageEditorRef}
              leftValue={sourceTranslation.content}
              rightValue={targetTranslation.content}
              leftLanguage={sourceLanguage}
              rightLanguage={targetLanguage}
              leftLanguageName={getLanguageDisplayName(sourceLanguage)}
              rightLanguageName={getLanguageDisplayName(targetLanguage)}
              onLeftChange={(value) => updateTranslation(sourceLanguage, 'content', value)}
              onRightChange={(value) => updateTranslation(targetLanguage, 'content', value)}
              onLeftPaste={(e) => handleMonacoPaste(e, 'source')}
              onRightPaste={(e) => handleMonacoPaste(e, 'target')}
              language="markdown"
              height="100%"
              theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
              className="h-full"
            />
          </div>
        </div>
      ) : (
        // Use original dual panel for basic fields
        <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div 
          className="flex flex-col border-r overflow-hidden"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Language Header */}
          <div className="h-9 border-b px-4 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Select value={sourceLanguage} onValueChange={(value) => {
                const typedValue = value as SupportedLanguage
                if (typedValue !== sourceLanguage) {
                  setSourceLanguage(typedValue)
                  // If target language is the same as new source language, switch target to the other language
                  if (typedValue === targetLanguage) {
                    const otherLang = availableLanguages.find(lang => lang.code !== typedValue)
                    if (otherLang) {
                      setTargetLanguage(otherLang.code)
                    }
                  }
                }
              }}>
                <SelectTrigger className="h-6 w-32 text-xs">
                  <SelectValue>{getLanguageDisplayName(sourceLanguage)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.filter(lang => lang.code !== targetLanguage).map(lang => (
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
          <div className="flex-1 relative overflow-y-auto">
            {renderField(sourceLanguage, sourceTranslation, false, 'source')}
          </div>
        </div>

        {/* Resizer with Swap Button */}
        <div className="relative flex flex-col items-center">
          {/* Swap Languages Button */}
          <div className="flex items-center justify-center h-9 border-b bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={swapLanguages}
              className="h-6 w-6 px-0 hover:bg-primary/10"
              title={normalizedLocale === 'zh' ? '交换左右语言' : 'Swap Languages'}
            >
              <ArrowLeftRight className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Resizer */}
          <div
            className={cn(
              "flex-1 w-1 cursor-col-resize hover:bg-primary/20 transition-colors flex items-center justify-center group",
              isDragging && "bg-primary/20"
            )}
            onMouseDown={handleMouseDown}
          >
            <div className="w-1 h-8 bg-border group-hover:bg-primary/50 rounded-full transition-colors" />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Language Header */}
          <div className="h-9 border-b px-4 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Select value={targetLanguage} onValueChange={(value) => {
                console.log('Target language change:', { value, currentTarget: targetLanguage, currentSource: sourceLanguage })
                console.log('Available languages for target:', availableLanguages.filter(lang => lang.code !== sourceLanguage))
                const typedValue = value as SupportedLanguage
                if (typedValue !== targetLanguage) {
                  console.log('Setting target language to:', typedValue)
                  setTargetLanguage(typedValue)
                  // If source language is the same as new target language, switch source to the other language
                  if (typedValue === sourceLanguage) {
                    console.log('Target same as source, finding other language...')
                    const otherLang = availableLanguages.find(lang => lang.code !== typedValue)
                    console.log('Found other language:', otherLang)
                    if (otherLang) {
                      console.log('Setting source to:', otherLang.code)
                      setSourceLanguage(otherLang.code)
                    }
                  }
                }
              }}>
                <SelectTrigger className="h-6 w-32 text-xs">
                  <SelectValue>{getLanguageDisplayName(targetLanguage)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const filteredLangs = availableLanguages.filter(lang => lang.code !== sourceLanguage)
                    console.log('Rendering target language options (right panel):', filteredLangs, 'sourceLanguage:', sourceLanguage)
                    return filteredLangs.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))
                  })()}
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
                className="h-6 px-2 ml-1"
                title="Copy from source"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeField === 'basic') {
                    handleAutoTranslate('all')
                  } else if (activeField === 'content') {
                    handleAutoTranslate('content')
                  }
                }}
                disabled={isTranslating || !hasTranslationProvider}
                className="h-6 px-2"
                title="Auto translate this field"
              >
                {isTranslating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 relative overflow-y-auto">
            {renderField(targetLanguage, targetTranslation, false, 'target')}
          </div>
        </div>
        </div>
      )}

      {/* Copy Confirmation Dialog */}
      <Dialog open={showCopyConfirm} onOpenChange={setShowCopyConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirm')}</DialogTitle>
            <DialogDescription>
              {t('article.copyWarning')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCopyConfirm(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirmCopy}
              variant="destructive"
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Selector Dialog */}
      <MediaSelector
        open={showMediaPicker}
        onOpenChange={(open) => {
          setShowMediaPicker(open)
          if (!open) {
            setIsSelectingCoverImage(false)
          }
        }}
        onSelect={handleMediaSelect}
        acceptedTypes={isSelectingCoverImage ? "image" : "all"}
      />

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              {normalizedLocale === 'zh' ? '键盘快捷键' : 'Keyboard Shortcuts'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* General Shortcuts */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {normalizedLocale === 'zh' ? '基本操作' : 'General'}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '保存文章' : 'Save Article'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + S
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '保存并退出' : 'Save and Exit'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    Shift + {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + S
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '切换预览模式' : 'Toggle Preview Mode'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + P
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '切换编辑模式' : 'Switch Editor Mode'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + T
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '显示快捷键帮助' : 'Show Keyboard Help'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + /
                  </kbd>
                </div>
              </div>
            </div>

            {/* Translation Mode Shortcuts */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {normalizedLocale === 'zh' ? '翻译模式' : 'Translation Mode'}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '从源语言复制到目标语言' : 'Copy Source to Target'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + D
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '交换左右面板语言' : 'Switch Panel Languages'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + L
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '切换到基本信息（标题&摘要）' : 'Switch to Basic Info (Title & Summary)'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + 1
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '切换到内容字段' : 'Switch to Content Field'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + 2
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '切换到SEO设置' : 'Switch to SEO Settings'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + 3
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '聚焦左侧面板' : 'Focus Left Panel'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Alt + ←</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '聚焦右侧面板' : 'Focus Right Panel'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Alt + →</kbd>
                </div>
              </div>
            </div>

            {/* Media Shortcuts */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {normalizedLocale === 'zh' ? '媒体操作' : 'Media'}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '插入媒体' : 'Insert Media'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + M
                  </kbd>
                </div>
              </div>
            </div>

            {/* Text Formatting Shortcuts */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {normalizedLocale === 'zh' ? '文本格式化' : 'Text Formatting'}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '粗体' : 'Bold'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + B
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '斜体' : 'Italic'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + I
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '代码' : 'Code'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + U
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{normalizedLocale === 'zh' ? '链接' : 'Link'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + K
                  </kbd>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
            {normalizedLocale === 'zh' 
              ? '💡 提示：在内容编辑区域中，可以选择文本后使用格式化快捷键来包装选中的内容。'
              : '💡 Tip: In content editing areas, you can select text and use formatting shortcuts to wrap the selected content.'
            }
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Comment Translator Dialog */}
      <CommentTranslator
        open={showCommentTranslator}
        onOpenChange={setShowCommentTranslator}
        onConfirm={handleCommentSelectionConfirm}
        codeContent={currentCodeContent}
        locale={locale}
        initialSelectedComments={selectedComments}
      />

      {/* Notification Dialog */}
      <NotificationDialog
        open={notification.open}
        onOpenChange={notification.hideNotification}
        type={notification.type}
        title={notification.title}
        description={notification.description}
      />
    </div>
  )
}
