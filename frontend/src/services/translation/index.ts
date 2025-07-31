import { TranslationProvider, TranslationConfig } from './types'
import { GoogleTranslateProvider } from './providers/google'
import { DeepLProvider } from './providers/deepl'
import { OpenAIProvider } from './providers/openai'
import { GeminiProvider } from './providers/gemini'
import { VolcanoProvider } from './providers/volcano'
import { LibreTranslateProvider } from './providers/libre-translate'
import { MyMemoryProvider } from './providers/mymemory'
import { GoogleFreeProvider } from './providers/google-free'

export * from './types'

// Translation usage tracking
export interface TranslationUsageStats {
  totalTranslations: number
  totalTokens: number
  totalCost: number
  currency: string
  sessionStats: {
    translations: number
    tokens: number
    cost: number
  }
}

interface ProtectedContent {
  placeholder: string
  originalContent: string
}

interface CachedContent {
  id: string
  originalContent: string
  lineNumbers?: number[]  // For code blocks with line numbers
}

export class TranslationService {
  private providers: Map<string, TranslationProvider> = new Map()
  private activeProvider?: TranslationProvider
  private selectedComments: any[] = []
  private contentCache: Map<string, CachedContent> = new Map()
  private usageStats: TranslationUsageStats = {
    totalTranslations: 0,
    totalTokens: 0,
    totalCost: 0,
    currency: 'USD',
    sessionStats: {
      translations: 0,
      tokens: 0,
      cost: 0
    }
  }

  registerProvider(name: string, provider: TranslationProvider): void {
    this.providers.set(name, provider)
  }

  setActiveProvider(name: string): void {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Translation provider '${name}' not found`)
    }
    this.activeProvider = provider
  }

  getActiveProvider(): TranslationProvider | undefined {
    return this.activeProvider
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  isConfigured(): boolean {
    return !!this.activeProvider && this.activeProvider.isConfigured()
  }

  getUsageStats(): TranslationUsageStats {
    return { ...this.usageStats }
  }

  resetSessionStats(): void {
    this.usageStats.sessionStats = {
      translations: 0,
      tokens: 0,
      cost: 0
    }
  }

  private updateUsageStats(usage: TranslationUsageStats['sessionStats']): void {
    this.usageStats.totalTranslations += usage.translations
    this.usageStats.totalTokens += usage.tokens
    this.usageStats.totalCost += usage.cost
    this.usageStats.sessionStats.translations += usage.translations
    this.usageStats.sessionStats.tokens += usage.tokens
    this.usageStats.sessionStats.cost += usage.cost
  }

  private async cacheAndRemoveProtectedContent(text: string): Promise<string> {
    // Clear previous cache
    this.contentCache.clear()
    let processedText = text

    // Cache code blocks
    const codeBlockPattern = /```[\s\S]*?```/g
    let match
    let cacheIndex = 0
    while ((match = codeBlockPattern.exec(text)) !== null) {
      const cacheId = `CODE_${cacheIndex}`
      const codeBlock = match[0]
      
      // Calculate line numbers for this code block
      const beforeCodeBlock = text.substring(0, match.index)
      const startLineNumber = beforeCodeBlock.split('\n').length
      const endLineNumber = startLineNumber + codeBlock.split('\n').length - 1
      
      this.contentCache.set(cacheId, {
        id: cacheId,
        originalContent: codeBlock,
        lineNumbers: Array.from({length: endLineNumber - startLineNumber + 1}, (_, i) => startLineNumber + i)
      })
      
      // Remove from text, leaving empty lines to maintain line numbers
      const emptyLines = '\n'.repeat(codeBlock.split('\n').length - 1)
      processedText = processedText.substring(0, match.index) + 
                    emptyLines + 
                    processedText.substring(match.index + codeBlock.length)
      
      // Update pattern index
      codeBlockPattern.lastIndex = match.index + emptyLines.length
      cacheIndex++
    }

    // Cache other protected patterns
    const patterns = [
      // YouTube embed tags
      /<youtubeembed\s[^>]*\/?>/gi,
      // Bilibili embed tags  
      /<bilibiliembed\s[^>]*\/?>/gi,
      // Generic custom component tags
      /<[a-z][a-z0-9]*embed\s[^>]*\/?>/gi,
      // Inline code (markdown)
      /`[^`\n]+`/g,
      // HTML/XML tags with attributes
      /<[a-zA-Z][^>]*>/g,
      // URLs
      /https?:\/\/[^\s<>"'\]]+/g,
      // File paths
      /\/[^\s<>"'\]]+\.[a-zA-Z0-9]+/g,
      // Email addresses
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      // Variables and placeholders
      /\{[^}]+\}/g,
      // Programming syntax patterns
      /\[[^\]]+\]/g
    ]

    patterns.forEach((pattern, patternIndex) => {
      let match
      let matchIndex = 0
      pattern.lastIndex = 0
      const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
      
      while ((match = globalPattern.exec(processedText)) !== null) {
        const cacheId = `PATTERN_${patternIndex}_${matchIndex}`
        const placeholder = `CACHED_${cacheId}_CACHED`
        
        this.contentCache.set(cacheId, {
          id: cacheId,
          originalContent: match[0]
        })
        
        // Replace with placeholder instead of empty string
        processedText = processedText.substring(0, match.index) + 
                      placeholder + 
                      processedText.substring(match.index + match[0].length)
        
        // Update pattern lastIndex to account for placeholder length
        globalPattern.lastIndex = match.index + placeholder.length
        
        matchIndex++
        
        if (matchIndex > 1000) {
          break
        }
      }
    })

    return processedText
  }

  private restoreCachedContent(translatedText: string, originalText: string): string {
    if (this.contentCache.size === 0) {
      return translatedText
    }

    let restoredText = translatedText
    const translatedLines = translatedText.split('\n')
    
    // Restore code blocks based on line numbers
    this.contentCache.forEach((cachedItem) => {
      if (cachedItem.id.startsWith('CODE_') && cachedItem.lineNumbers) {
        const startLine = cachedItem.lineNumbers[0] - 1 // Convert to 0-based index
        const endLine = cachedItem.lineNumbers[cachedItem.lineNumbers.length - 1] - 1
        
        // Replace the empty lines with the original code block
        const beforeLines = translatedLines.slice(0, startLine)
        const afterLines = translatedLines.slice(endLine + 1)
        const codeBlockLines = cachedItem.originalContent.split('\n')
        
        const newTranslatedLines = [...beforeLines, ...codeBlockLines, ...afterLines]
        restoredText = newTranslatedLines.join('\n')
      }
    })

    // Restore other protected patterns using placeholders
    this.contentCache.forEach((cachedItem) => {
      if (cachedItem.id.startsWith('PATTERN_')) {
        const placeholder = `CACHED_${cachedItem.id}_CACHED`
        const placeholderRegex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        restoredText = restoredText.replace(placeholderRegex, cachedItem.originalContent)
      }
    })
    
    return restoredText
  }


  private async translateWithSelectiveComments(text: string, from: string, to: string): Promise<string> {
    // Cache protected content and remove it from text
    const processedText = await this.cacheAndRemoveProtectedContent(text)
    
    // Skip translation if text is empty after removing protected content
    if (processedText.trim() === '') {
      return text
    }

    try {
      // Translate the cleaned text normally
      let translatedText: string
      let usage: any = null

      // Use translateWithUsage if available (for AI providers)
      if (this.activeProvider!.translateWithUsage) {
        const result = await this.activeProvider!.translateWithUsage(processedText, from, to)
        translatedText = result.translatedText
        usage = result.usage
      } else {
        // Fallback to regular translate
        translatedText = await this.activeProvider!.translate(processedText, from, to)
      }

      // Update usage stats if available
      if (usage) {
        this.updateUsageStats({
          translations: 1,
          tokens: usage.totalTokens || 0,
          cost: usage.estimatedCost || 0
        })
      }
      
      // Restore cached content
      const restoredText = this.restoreCachedContent(translatedText, text)
      
      // Now handle selective comment translation on the result
      return await this.applySelectiveCommentTranslation(restoredText, text, from, to)
      
    } catch (error) {
      console.error('Translation with selective comments failed:', error)
      return text
    }
  }

  private async applySelectiveCommentTranslation(translatedText: string, originalText: string, from: string, to: string): Promise<string> {
    const translatedLines = translatedText.split('\n')
    const originalLines = originalText.split('\n')
    const processedLines: string[] = []
    
    for (let i = 0; i < Math.max(translatedLines.length, originalLines.length); i++) {
      const translatedLine = translatedLines[i] || ''
      const originalLine = originalLines[i] || ''
      const lineNumber = i + 1
      const trimmedOriginalLine = originalLine.trim()
      
      // Check if original line contains comments
      const hasComment = trimmedOriginalLine.startsWith('#') || trimmedOriginalLine.startsWith('//') || 
                        trimmedOriginalLine.startsWith('<!--') || originalLine.includes('//') || 
                        (originalLine.includes('#') && !originalLine.includes('http'))
      
      if (hasComment) {
        // Check if this line's comments should be translated
        const shouldTranslateComments = this.selectedComments.some(comment => 
          comment.lineNumber === lineNumber
        )
        
        if (shouldTranslateComments) {
          // Directly translate the comment part from original
          if (trimmedOriginalLine.startsWith('#')) {
            // Hash comment
            const match = originalLine.match(/^(\s*)(#\s*)(.+)$/)
            if (match) {
              const [, indent, hashSymbol, commentText] = match
              try {
                const translatedComment = await this.activeProvider!.translate(commentText, from, to)
                const translatedCommentLine = indent + hashSymbol + translatedComment
                processedLines.push(translatedCommentLine)
              } catch (error) {
                processedLines.push(translatedLine) // Fallback to translated version
              }
            } else {
              processedLines.push(translatedLine)
            }
          } else if (originalLine.includes('#')) {
            // Inline hash comment
            const hashIndex = originalLine.indexOf('#')
            const codePart = originalLine.substring(0, hashIndex + 1)
            const commentPart = originalLine.substring(hashIndex + 1).trim()
            
            try {
              const translatedComment = await this.activeProvider!.translate(commentPart, from, to)
              const translatedCommentLine = codePart + ' ' + translatedComment
              processedLines.push(translatedCommentLine)
            } catch (error) {
              processedLines.push(translatedLine) // Fallback to translated version
            }
          } else {
            processedLines.push(translatedLine)
          }
        } else {
          // Keep original comment line unchanged (don't translate comments)
          processedLines.push(originalLine)
        }
      } else {
        // No comments, use the translated version
        processedLines.push(translatedLine)
      }
    }
    
    return processedLines.join('\n')
  }


  // Public method to clean up corrupted protected content
  public cleanupProtectedContent(text: string): string {
    let cleanedText = text

    // Remove various placeholder patterns that might have been left behind
    const placeholderPatterns = [
      // New cache placeholder patterns
      /CACHED_PATTERN_\d+_\d+_CACHED/gi,
      /cached_pattern_\d+_\d+_cached/gi,
      // Old placeholder patterns for compatibility
      /XPROTECTCODEX\d+XPROTECTCODEX/gi,
      /xprotectcodex\d+xprotectcodex/gi,
      /XPROTECTX\d+X\d+XPROTECTX/gi,
      /xprotectx\d+x\d+xprotectx/gi,
      /___TRANSLATION_PROTECT_\d+_\d+___/gi,
      /____translation_protect_\d+_\d+___/gi,
      /__ Protected_\d+_\d+__/gi,
      /__PROTECTED_\d+_\d+__/gi,
      /__ Translation_Protect_\d+_\d+__/gi,
      /__ translation_protect_\d+_\d+__/gi,
      // Partial placeholder patterns
      /_TRANSLATION_PROTECT_\d+_\d+_/gi,
      /TRANSLATION_PROTECT_\d+_\d+/gi,
      /Protected_\d+_\d+/gi,
      // Leading underscores before specific content
      /^_+(?=<YouTubeEmbed)/gm,
      /^_+(?=<youtubeembed)/gmi,
      /^_+(?=<BilibiliEmbed)/gm,
      /^_+(?=<bilibiliembed)/gmi,
      /^_+(?=```)/gm,
      /^_+(?=<[a-zA-Z])/gm,
      // Underscores at start of lines that look like leftovers
      /(?:\n|^)_+(?=\S)/gm,
    ]

    placeholderPatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern, '')
    })

    // Clean up extra whitespace that might result from removing placeholders
    cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n')
    cleanedText = cleanedText.replace(/^\s+|\s+$/g, '')

    return cleanedText
  }

  async translate(text: string, from: string, to: string, selectedComments?: any[]): Promise<string> {
    // Use selectedComments parameter or existing stored comments
    const commentsToUse = selectedComments || this.selectedComments
    
    // If we have selected comments, use direct selective translation
    if (commentsToUse && commentsToUse.length > 0) {
      // Store for use in translateWithSelectiveComments
      this.selectedComments = commentsToUse
      return await this.translateWithSelectiveComments(text, from, to)
    }
    
    if (!this.activeProvider) {
      throw new Error('No active translation provider')
    }

    if (!this.activeProvider.isConfigured()) {
      throw new Error(`Translation provider '${this.activeProvider.name}' is not configured`)
    }

    // Use memory cache system for protected content
    const processedText = await this.cacheAndRemoveProtectedContent(text)
    
    // Skip translation if text is empty after removing protected content
    if (processedText.trim() === '') {
      return text
    }

    try {

      let translatedText: string
      let usage: any = null

      // Use translateWithUsage if available (for AI providers)
      if (this.activeProvider.translateWithUsage) {
        const result = await this.activeProvider.translateWithUsage(processedText, from, to)
        translatedText = result.translatedText
        usage = result.usage
      } else {
        // Fallback to regular translate
        translatedText = await this.activeProvider.translate(processedText, from, to)
      }

      // Update usage stats if available
      if (usage) {
        this.updateUsageStats({
          translations: 1,
          tokens: usage.totalTokens || 0,
          cost: usage.estimatedCost || 0
        })
      }
      
      // Restore cached content
      const restoredText = this.restoreCachedContent(translatedText, text)
      
      return restoredText
    } catch (error) {
      console.error('Translation failed:', error)
      // Return original text if translation fails
      return text
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (!this.activeProvider) {
      throw new Error('No active translation provider')
    }

    if (!this.activeProvider.isConfigured()) {
      throw new Error(`Translation provider '${this.activeProvider.name}' is not configured`)
    }

    // Process each text individually to handle protected content properly
    const results: string[] = []
    
    for (const text of texts) {
      try {
        // Pass selectedComments to each translate call
        const translated = await this.translate(text, from, to, this.selectedComments)
        results.push(translated)
      } catch (error) {
        results.push(text) // Return original text on failure
      }
    }

    return results
  }

  async translateArticle(article: {
    title: string
    content: string
    summary: string
  }, from: string, to: string, selectedComments?: any[]): Promise<{
    title: string
    content: string
    summary: string
  }> {
    // Store selected comments for use in translation
    this.selectedComments = selectedComments || []
    
    const [title, content, summary] = await this.translateBatch(
      [article.title, article.content, article.summary],
      from,
      to
    )

    // Clear selected comments after translation
    this.selectedComments = []

    return { title, content, summary }
  }

  configureFromSettings(config: TranslationConfig): void {
    let provider: TranslationProvider

    switch (config.provider) {
      case 'google':
        provider = new GoogleTranslateProvider(config.apiKey)
        break
      case 'deepl':
        provider = new DeepLProvider(config.apiKey)
        break
      case 'openai':
        provider = new OpenAIProvider(config.apiKey, config.model)
        break
      case 'gemini':
        provider = new GeminiProvider(config.apiKey, config.model)
        break
      case 'volcano':
        provider = new VolcanoProvider(config.apiKey, config.apiSecret, config.region)
        break
      case 'libretranslate':
        provider = new LibreTranslateProvider(config.apiKey, config.apiUrl)
        break
      case 'mymemory':
        provider = new MyMemoryProvider(config.apiKey, config.email)
        break
      case 'google-free':
        provider = new GoogleFreeProvider()
        break
      default:
        throw new Error(`Unsupported translation provider: ${config.provider}`)
    }

    this.registerProvider(config.provider, provider)
    this.setActiveProvider(config.provider)
  }
}

// Create a singleton instance
export const translationService = new TranslationService()

// Helper function to initialize translation service from localStorage
export function initializeTranslationService(): void {
  try {
    const settingsStr = localStorage.getItem('blog_settings')
    let settings = null
    
    if (settingsStr) {
      settings = JSON.parse(settingsStr)
    }
    
    // If no translation settings exist, use default free provider
    if (!settings || !settings.translation || !settings.translation.provider) {
      const defaultConfig: TranslationConfig = {
        provider: 'google-free'
      }
      
      // Save default config to localStorage
      const newSettings = {
        ...(settings || {}),
        translation: defaultConfig
      }
      localStorage.setItem('blog_settings', JSON.stringify(newSettings))
      
      translationService.configureFromSettings(defaultConfig)
    } else {
      translationService.configureFromSettings(settings.translation)
    }
  } catch (error) {
    console.error('Failed to initialize translation service:', error)
    
    // Fallback to default free provider on error
    try {
      const defaultConfig: TranslationConfig = {
        provider: 'google-free'
      }
      translationService.configureFromSettings(defaultConfig)
    } catch (fallbackError) {
      console.error('Failed to set default translation provider:', fallbackError)
    }
  }
}