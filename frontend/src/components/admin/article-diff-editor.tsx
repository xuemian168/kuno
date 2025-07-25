"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from 'next-intl'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiClient, Article, Category } from "@/lib/api"
import { 
  ArrowLeft,
  Save,
  Copy,
  Eye,
  EyeOff,
  Languages,
  FileText,
  ToggleLeft,
  ToggleRight,
  Image,
  Video,
  Keyboard,
  HelpCircle,
  Wand2,
  Loader2
} from "lucide-react"
import { translationService, initializeTranslationService } from "@/services/translation"
import { languageManager } from "@/services/translation/language-manager"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"
import MediaPicker from "./media-picker"
import { MediaLibrary } from "@/lib/api"

interface Translation {
  language: string
  title: string
  content: string
  summary: string
}

interface ArticleDiffEditorProps {
  article?: Article
  isEditing?: boolean
  locale?: string
}

// Admin interface languages (hardcoded for admin interface)
const adminInterfaceLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' }
]

export function ArticleDiffEditor({ article, isEditing = false, locale = 'zh' }: ArticleDiffEditorProps) {
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
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const [sourceScrollTop, setSourceScrollTop] = useState(0)
  const [targetScrollTop, setTargetScrollTop] = useState(0)
  const [isScrollSyncing, setIsScrollSyncing] = useState(false)
  const [editMode, setEditMode] = useState<'single' | 'translation'>('translation')
  const [showCopyConfirm, setShowCopyConfirm] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [activeTextarea, setActiveTextarea] = useState<'source' | 'target' | 'single'>('source')
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [hasTranslationProvider, setHasTranslationProvider] = useState(false)
  const [availableLanguages, setAvailableLanguages] = useState(adminInterfaceLanguages)
  
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null)
  const targetTextareaRef = useRef<HTMLTextAreaElement>(null)
  
  const [formData, setFormData] = useState({
    title: article?.title || "",
    content: article?.content || "",
    content_type: article?.content_type || "markdown",
    summary: article?.summary || "",
    category_id: article?.category_id || 0
  })
  
  const [translations, setTranslations] = useState<Translation[]>(() => {
    if (article?.translations && Array.isArray(article.translations)) {
      // Filter out the default language from translations array
      const defaultLang = article.default_lang || 'zh'
      return article.translations
        .filter((t: any) => t.language !== defaultLang)
        .map((t: any) => ({
          language: t.language,
          title: t.title || '',
          content: t.content || '',
          summary: t.summary || ''
        }))
    }
    return []
  })

  const getTranslation = (language: string) => {
    // Check if this language is the article's default language
    const defaultLang = article?.default_lang || 'zh'
    if (language === defaultLang) {
      return {
        language: defaultLang,
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

  // Calculate translation progress for content
  const translationProgress = useMemo(() => {
    if (activeField !== 'content') return { sourceLines: [], targetLines: [], untranslatedLines: [], totalLines: 0, translatedLines: 0 }
    
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
      
      // Check if this line contains media content that should be skipped
      const isMediaContent = (line: string) => {
        // Skip image markdown: ![alt](src)
        if (/^!\[.*\]\(.*\)$/.test(line)) return true
        
        // Skip video HTML tags
        if (/<video\s+.*?>/.test(line) || line === '</video>') return true
        if (line === '  Your browser does not support the video tag.') return true
        
        // Skip YouTube/Bilibili embed components
        if (/<YouTubeEmbed\s+.*?\/>/.test(line)) return true
        if (/<BiliBiliEmbed\s+.*?\/>/.test(line)) return true
        
        return false
      }
      
      // Skip media content lines
      if (isMediaContent(sourceLine)) {
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
    
    // Initialize translation service
    initializeTranslationService()
    
    // Load available languages from language manager
    const enabledLanguages = languageManager.getEnabledLanguageOptions()
    setAvailableLanguages(enabledLanguages)
    
    // Check if translation provider is configured
    const checkProvider = () => {
      const provider = translationService.getActiveProvider()
      setHasTranslationProvider(!!provider)
    }
    
    checkProvider()
    
    // Check again after a short delay to ensure initialization is complete
    const timer = setTimeout(checkProvider, 500)
    return () => clearTimeout(timer)
  }, [locale])

  const handleAutoTranslate = async (field: 'title' | 'content' | 'summary' | 'all') => {
    if (!translationService.getActiveProvider()) {
      alert('Please configure a translation API in settings first')
      return
    }

    setIsTranslating(true)

    try {
      const sourceTranslation = getTranslation(sourceLanguage)
      const defaultLang = article?.default_lang || 'zh'

      if (field === 'all') {
        // Translate all fields at once
        const result = await translationService.translateArticle(
          {
            title: sourceTranslation.title,
            content: sourceTranslation.content,
            summary: sourceTranslation.summary
          },
          sourceLanguage,
          targetLanguage
        )

        if (targetLanguage === defaultLang) {
          setFormData(prev => ({
            ...prev,
            title: result.title,
            content: result.content,
            summary: result.summary
          }))
        } else {
          updateTranslation(targetLanguage, 'title', result.title)
          updateTranslation(targetLanguage, 'content', result.content)
          updateTranslation(targetLanguage, 'summary', result.summary)
        }
      } else {
        // Translate single field
        const sourceText = sourceTranslation[field]
        const translatedText = await translationService.translate(
          sourceText,
          sourceLanguage,
          targetLanguage
        )

        if (targetLanguage === defaultLang) {
          setFormData(prev => ({ ...prev, [field]: translatedText }))
        } else {
          updateTranslation(targetLanguage, field, translatedText)
        }
      }
    } catch (error) {
      console.error('Translation error:', error)
      alert(
        error instanceof Error 
          ? error.message 
          : 'Translation failed. Please check your API configuration.'
      )
    } finally {
      setIsTranslating(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      // Collect only non-default language translations
      const defaultLang = article?.default_lang || 'zh'
      const allTranslations = []
      
      // Add other language translations (exclude default language)
      translations.forEach(t => {
        if (t.language !== defaultLang && (t.title.trim() || t.content.trim() || t.summary.trim())) {
          allTranslations.push(t)
        }
      })

      const articleData = {
        ...formData,
        default_lang: defaultLang, // Keep the existing default language
        translations: allTranslations
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

  const copyToTarget = () => {
    const targetTranslation = getTranslation(targetLanguage)
    const hasExistingContent = targetTranslation[activeField].trim().length > 0
    
    if (hasExistingContent) {
      setShowCopyConfirm(true)
      return
    }
    
    const sourceTranslation = getTranslation(sourceLanguage)
    updateTranslation(targetLanguage, activeField, sourceTranslation[activeField])
  }

  const handleConfirmCopy = () => {
    const sourceTranslation = getTranslation(sourceLanguage)
    updateTranslation(targetLanguage, activeField, sourceTranslation[activeField])
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
              handleSubmit()
            }
            break
          
          case 'p': // Preview toggle - Ctrl/Cmd+P
            e.preventDefault()
            setShowPreview(prev => prev === 'none' ? 'both' : 'none')
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
              const tempLang = sourceLanguage
              setSourceLanguage(targetLanguage)
              setTargetLanguage(tempLang)
            }
            break
          
          case '1': // Switch to title field - Ctrl/Cmd+1
            e.preventDefault()
            if (editMode === 'translation') {
              setActiveField('title')
            }
            break
          
          case '2': // Switch to summary field - Ctrl/Cmd+2
            e.preventDefault()
            if (editMode === 'translation') {
              setActiveField('summary')
            }
            break
          
          case '3': // Switch to content field - Ctrl/Cmd+3
            e.preventDefault()
            if (editMode === 'translation') {
              setActiveField('content')
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
      const defaultLang = article?.default_lang || 'zh'
      updateTranslation(defaultLang, 'content', newText)
    }
    
    // Set cursor position after update
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 10)
  }

  const updateTranslation = (language: string, field: string, value: string) => {
    const defaultLang = article?.default_lang || 'zh'
    if (language === defaultLang) {
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
          language,
          title: field === 'title' ? value : '',
          content: field === 'content' ? value : '',
          summary: field === 'summary' ? value : ''
        })
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

  const handleMediaSelect = (media: MediaLibrary | OnlineVideo, type: 'upload' | 'online') => {
    let markdownText = ''
    
    if (type === 'upload') {
      const uploadedMedia = media as MediaLibrary
      if (uploadedMedia.media_type === 'image') {
        markdownText = `![${uploadedMedia.alt || uploadedMedia.original_name}](${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${uploadedMedia.url})`
      } else {
        markdownText = `<video src="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${uploadedMedia.url}" controls>\n  Your browser does not support the video tag.\n</video>`
      }
    } else {
      const onlineVideo = media as OnlineVideo
      if (onlineVideo.platform === 'youtube') {
        markdownText = `<YouTubeEmbed url="${onlineVideo.url}" title="${onlineVideo.title}" />`
      } else {
        markdownText = `<BiliBiliEmbed url="${onlineVideo.url}" title="${onlineVideo.title}" />`
      }
    }

    // Insert the markdown text into the active textarea
    if (editMode === 'single') {
      insertTextAtCursor('single', markdownText)
    } else {
      // In translation mode, insert into both source and target at the same relative position
      insertTextAtSamePosition(markdownText)
    }
  }

  const insertTextAtSamePosition = (text: string) => {
    // Get the current cursor position from whichever textarea is focused
    let cursorPosition = 0
    let activeTextarea: 'source' | 'target' = 'source'
    const sourceTextarea = sourceTextareaRef.current
    const targetTextarea = targetTextareaRef.current
    
    // Determine which textarea has focus and get its cursor position
    if (sourceTextarea && document.activeElement === sourceTextarea) {
      cursorPosition = sourceTextarea.selectionStart
      activeTextarea = 'source'
    } else if (targetTextarea && document.activeElement === targetTextarea) {
      cursorPosition = targetTextarea.selectionStart
      activeTextarea = 'target'
    } else {
      // If neither has focus, use the source textarea cursor position as default
      cursorPosition = sourceTextarea?.selectionStart || 0
      activeTextarea = 'source'
    }
    
    // Get the content of the active textarea to calculate line/column position
    const activeLanguage = activeTextarea === 'source' ? sourceLanguage : targetLanguage
    const activeTranslation = getTranslation(activeLanguage)
    const beforeCursor = activeTranslation.content.substring(0, cursorPosition)
    const lines = beforeCursor.split('\n')
    const lineIndex = lines.length - 1
    const columnIndex = lines[lines.length - 1].length
    
    // Insert text at the same relative position in both textareas
    insertTextAtPosition('source', text, lineIndex, columnIndex)
    insertTextAtPosition('target', text, lineIndex, columnIndex)
  }

  const insertTextAtPosition = (textarea: 'source' | 'target', text: string, lineIndex: number, columnIndex: number) => {
    const language = textarea === 'source' ? sourceLanguage : targetLanguage
    const translation = getTranslation(language)
    const lines = translation.content.split('\n')
    
    // Ensure we have enough lines
    while (lines.length <= lineIndex) {
      lines.push('')
    }
    
    // Insert text at the specified position
    const targetLine = lines[lineIndex]
    const safeColumnIndex = Math.min(columnIndex, targetLine.length)
    lines[lineIndex] = targetLine.slice(0, safeColumnIndex) + text + targetLine.slice(safeColumnIndex)
    
    const newContent = lines.join('\n')
    updateTranslation(language, 'content', newContent)
    
    // Set cursor position after insertion - focus on the originally active textarea
    setTimeout(() => {
      const textareaElement = textarea === 'source' ? sourceTextareaRef.current : targetTextareaRef.current
      if (textareaElement) {
        // Calculate new cursor position
        const newCursorPosition = lines.slice(0, lineIndex).join('\n').length + 
          (lineIndex > 0 ? 1 : 0) + safeColumnIndex + text.length
        
        // Only focus and set cursor if this is the originally active textarea
        const activeElement = document.activeElement
        if (activeElement === sourceTextareaRef.current && textarea === 'source' ||
            activeElement === targetTextareaRef.current && textarea === 'target') {
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
      const defaultLang = article?.default_lang || 'zh'
      const translation = getTranslation(defaultLang)
      currentValue = translation.content
      language = defaultLang
    } else {
      if (textarea === 'source') {
        const translation = getTranslation(sourceLanguage)
        currentValue = translation.content
        language = sourceLanguage
      } else {
        const translation = getTranslation(targetLanguage)
        currentValue = translation.content
        language = targetLanguage
      }
    }

    // Get cursor position
    let cursorPosition = 0
    const textareaElement = editMode === 'single' 
      ? document.querySelector('#content') as HTMLTextAreaElement
      : (textarea === 'source' ? sourceTextareaRef.current : targetTextareaRef.current)
    
    if (textareaElement) {
      cursorPosition = textareaElement.selectionStart
    }

    // Insert text at cursor position
    const newValue = currentValue.slice(0, cursorPosition) + text + currentValue.slice(cursorPosition)
    
    // Update the content
    updateTranslation(language, 'content', newValue)

    // Set cursor position after insertion
    setTimeout(() => {
      if (textareaElement) {
        textareaElement.focus()
        textareaElement.setSelectionRange(cursorPosition + text.length, cursorPosition + text.length)
      }
    }, 10)
  }

  const handleMediaButtonClick = (textareaType: 'source' | 'target' | 'single') => {
    // In translation mode, we don't need to track which textarea since we insert to both
    if (editMode === 'translation') {
      setActiveTextarea('source') // Set default, but will insert to both anyway
    } else {
      setActiveTextarea(textareaType)
    }
    setShowMediaPicker(true)
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

  const sourceTranslation = getTranslation(sourceLanguage)
  const targetTranslation = getTranslation(targetLanguage)

  const renderLineNumbers = (lines: string[], side: 'source' | 'target') => {
    if (activeField !== 'content') return null
    
    return (
      <div 
        className="absolute left-0 top-0 w-12 h-full border-r border-border text-xs text-muted-foreground font-mono select-none"
        style={{ 
          zIndex: 10,
          backgroundColor: 'hsl(var(--background))'
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
    const defaultLang = article?.default_lang || 'zh'
    const currentTranslation = getTranslation(defaultLang)
    
    return (
      <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('article.title')}</Label>
            <Input
              id="title"
              value={currentTranslation.title}
              onChange={(e) => updateTranslation(defaultLang, 'title', e.target.value)}
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
              onChange={(e) => updateTranslation(defaultLang, 'summary', e.target.value)}
              placeholder={t('article.enterSummary')}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">{t('article.content')}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMediaButtonClick('single')}
                className="h-6 px-2"
                title={t('article.insertMedia')}
              >
                <Image className="h-3 w-3 mr-1" />
                {t('article.insertMedia')}
              </Button>
            </div>
            <Textarea
              id="content"
              value={currentTranslation.content}
              onChange={(e) => updateTranslation(defaultLang, 'content', e.target.value)}
              placeholder={t('article.enterContent')}
              className="min-h-[calc(100vh-400px)] resize-none font-mono text-sm"
            />
          </div>
        </div>
      </div>
    )
  }

  const renderField = (language: string, translation: Translation, isPreview: boolean, side: 'source' | 'target') => {
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
        const lines = translation.content.split('\n')
        
        return isPreview ? (
          <div className="p-4">
            {translation.content ? (
              <MarkdownRenderer content={translation.content} />
            ) : (
              <p className="text-muted-foreground">No content</p>
            )}
          </div>
        ) : (
          <div className="relative flex-1 overflow-hidden">
            {renderLineNumbers(lines, side)}
            {/* Highlight untranslated lines - behind textarea */}
            <div className="absolute inset-0 pl-14 pr-4 py-4 pointer-events-none font-mono text-sm leading-5" style={{ zIndex: -1 }}>
              {lines.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-5 leading-5",
                    activeLine === index && "bg-primary/5",
                    translationProgress.untranslatedLines.includes(index) && "bg-yellow-50 dark:bg-yellow-900/10"
                  )}
                  style={{ lineHeight: '20px' }}
                />
              ))}
            </div>
            <Textarea
              ref={side === 'source' ? sourceTextareaRef : targetTextareaRef}
              value={translation.content}
              onChange={(e) => updateTranslation(language, 'content', e.target.value)}
              onScroll={(e) => handleTextareaScroll(side, e)}
              onClick={(e) => handleTextareaClick(side, e)}
              placeholder={t('article.enterContent')}
              className="pl-14 pr-4 py-4 min-h-[400px] border-0 shadow-none focus-visible:ring-0 resize-none font-mono text-sm w-full h-full bg-transparent"
              style={{
                lineHeight: '20px',
                whiteSpace: 'pre',
                overflowX: 'auto',
                overflowWrap: 'normal',
                wordWrap: 'normal'
              }}
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

        {/* Mode Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditMode(editMode === 'single' ? 'translation' : 'single')}
          className="h-8 gap-2"
        >
          {editMode === 'single' ? (
            <>
              <Languages className="h-4 w-4" />
              {t('article.translationEditor')}
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
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

        {/* Auto Translate All Button - only show in translation mode */}
        {editMode === 'translation' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAutoTranslate('all')}
              disabled={isTranslating || !hasTranslationProvider}
              className="h-8 gap-2"
              title="Auto translate all fields"
            >
              {isTranslating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span className="text-xs">Translate All</span>
            </Button>
            <div className="mx-2 h-4 w-px bg-border" />
          </>
        )}

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

      {/* Field Tabs - Only show in translation mode */}
      {editMode === 'translation' && (
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
          
          {/* Translation Progress */}
          {activeField === 'content' && translationProgress.totalLines > 0 && (
            <div className="text-xs text-muted-foreground mr-4">
              {translationProgress.untranslatedCount > 0 ? (
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
      )}

      {/* Main Editor Area */}
      {editMode === 'single' ? (
        renderSingleEditor()
      ) : (
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
                setSourceLanguage(value)
                // If target language is the same as new source language, switch target to the other language
                if (value === targetLanguage) {
                  const otherLang = availableLanguages.find(lang => lang.code !== value)
                  if (otherLang) {
                    setTargetLanguage(otherLang.code)
                  }
                }
              }}>
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
          <div className="flex-1 relative overflow-hidden">
            {renderField(sourceLanguage, sourceTranslation, showPreview === 'left' || showPreview === 'both', 'source')}
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Language Header */}
          <div className="h-9 border-b px-4 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Select value={targetLanguage} onValueChange={(value) => {
                setTargetLanguage(value)
                // If source language is the same as new target language, switch source to the other language
                if (value === sourceLanguage) {
                  const otherLang = availableLanguages.find(lang => lang.code !== value)
                  if (otherLang) {
                    setSourceLanguage(otherLang.code)
                  }
                }
              }}>
                <SelectTrigger className="h-6 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.filter(lang => lang.code !== sourceLanguage).map(lang => (
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
                className="h-6 px-2 ml-1"
                title="Copy from source"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAutoTranslate(activeField)}
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
          <div className="flex-1 relative overflow-hidden">
            {renderField(targetLanguage, targetTranslation, showPreview === 'right' || showPreview === 'both', 'target')}
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

      {/* Media Picker Dialog */}
      <MediaPicker
        open={showMediaPicker}
        onOpenChange={setShowMediaPicker}
        onMediaSelect={handleMediaSelect}
      />

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              {locale === 'zh' ? '键盘快捷键' : 'Keyboard Shortcuts'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* General Shortcuts */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {locale === 'zh' ? '基本操作' : 'General'}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '保存文章' : 'Save Article'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + S
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '切换预览' : 'Toggle Preview'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + P
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '切换编辑模式' : 'Switch Editor Mode'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + T
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '显示快捷键帮助' : 'Show Keyboard Help'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + /
                  </kbd>
                </div>
              </div>
            </div>

            {/* Translation Mode Shortcuts */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {locale === 'zh' ? '翻译模式' : 'Translation Mode'}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '从源语言复制到目标语言' : 'Copy Source to Target'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + D
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '交换左右面板语言' : 'Switch Panel Languages'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + L
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '切换到标题字段' : 'Switch to Title Field'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + 1
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '切换到摘要字段' : 'Switch to Summary Field'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + 2
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '切换到内容字段' : 'Switch to Content Field'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + 3
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '聚焦左侧面板' : 'Focus Left Panel'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Alt + ←</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '聚焦右侧面板' : 'Focus Right Panel'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Alt + →</kbd>
                </div>
              </div>
            </div>

            {/* Media Shortcuts */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {locale === 'zh' ? '媒体操作' : 'Media'}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '插入媒体' : 'Insert Media'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + M
                  </kbd>
                </div>
              </div>
            </div>

            {/* Text Formatting Shortcuts */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {locale === 'zh' ? '文本格式化' : 'Text Formatting'}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '粗体' : 'Bold'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + B
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '斜体' : 'Italic'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + I
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '代码' : 'Code'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + U
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>{locale === 'zh' ? '链接' : 'Link'}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + K
                  </kbd>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
            {locale === 'zh' 
              ? '💡 提示：在内容编辑区域中，可以选择文本后使用格式化快捷键来包装选中的内容。'
              : '💡 Tip: In content editing areas, you can select text and use formatting shortcuts to wrap the selected content.'
            }
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}