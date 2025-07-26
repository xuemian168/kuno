import { TranslationProvider, TranslationConfig } from './types'
import { GoogleTranslateProvider } from './providers/google'
import { DeepLProvider } from './providers/deepl'
import { OpenAIProvider } from './providers/openai'
import { LibreTranslateProvider } from './providers/libre-translate'
import { MyMemoryProvider } from './providers/mymemory'
import { GoogleFreeProvider } from './providers/google-free'

export * from './types'

interface ProtectedContent {
  placeholder: string
  originalContent: string
}

export class TranslationService {
  private providers: Map<string, TranslationProvider> = new Map()
  private activeProvider?: TranslationProvider

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

  private protectContent(text: string): { processedText: string; protectedItems: ProtectedContent[] } {
    const protectedItems: ProtectedContent[] = []
    let processedText = text

    // Patterns to protect from translation
    const patterns = [
      // YouTube embed tags (with or without spaces, self-closing or not)
      /<youtubeembed\s[^>]*\/?>/gi,
      // Bilibili embed tags  
      /<bilibiliembed\s[^>]*\/?>/gi,
      // Generic custom component tags
      /<[a-z][a-z0-9]*embed\s[^>]*\/?>/gi,
      // Code blocks (markdown)
      /```[\s\S]*?```/g,
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

    patterns.forEach((pattern, index) => {
      let match
      let matchIndex = 0
      // Use exec to find matches one by one to handle overlapping patterns correctly
      pattern.lastIndex = 0 // Reset regex state
      const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
      
      while ((match = globalPattern.exec(processedText)) !== null) {
        // Use a more unique placeholder format to prevent conflicts
        const placeholder = `___TRANSLATION_PROTECT_${index}_${matchIndex}___`
        protectedItems.push({
          placeholder,
          originalContent: match[0]
        })
        // Replace the matched content with placeholder
        processedText = processedText.substring(0, match.index) + 
                      placeholder + 
                      processedText.substring(match.index + match[0].length)
        
        // Update global pattern lastIndex to account for the new content length
        const lengthDiff = placeholder.length - match[0].length
        globalPattern.lastIndex = match.index + placeholder.length
        
        matchIndex++
        
        // Prevent infinite loops
        if (matchIndex > 1000) {
          console.warn('Too many matches found, breaking to prevent infinite loop')
          break
        }
      }
    })

    return { processedText, protectedItems }
  }

  private restoreProtectedContent(translatedText: string, protectedItems: ProtectedContent[]): string {
    let restoredText = translatedText

    // First, try to restore using exact placeholder matches
    protectedItems.forEach(item => {
      const regex = new RegExp(item.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      restoredText = restoredText.replace(regex, item.originalContent)
    })

    // Then handle various possible transformations of the placeholder
    protectedItems.forEach(item => {
      const variations = [
        item.placeholder.toLowerCase(), // Lowercase
        item.placeholder.replace(/_/g, ' '), // Underscores to spaces
        item.placeholder.replace(/___/g, ' '), // Triple underscores to spaces
        item.placeholder.replace(/TRANSLATION_PROTECT/g, 'Translation Protect'), // Case change
        item.placeholder.replace(/TRANSLATION_PROTECT/g, 'translation protect'), // All lowercase
        item.placeholder.replace(/___TRANSLATION_PROTECT_/g, '__ Protected_').replace(/___/g, '__'), // Specific case
        item.placeholder.replace(/___TRANSLATION_PROTECT_/g, '_Protected_').replace(/___/g, '_'), // Partial underscore
        item.placeholder.replace(/___TRANSLATION_PROTECT_/g, 'Protected_').replace(/___/g, ''), // No leading underscores
      ]

      variations.forEach(variation => {
        // Use global replace to handle multiple occurrences
        const regex = new RegExp(variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        restoredText = restoredText.replace(regex, item.originalContent)
      })
    })

    // Clean up partial placeholders and leftover underscores
    const cleanupPatterns = [
      // Full placeholder patterns
      /___TRANSLATION_PROTECT_\d+_\d+___/gi,
      /__ Protected_\d+_\d+__/gi,
      /__PROTECTED_\d+_\d+__/gi,
      // Partial placeholder patterns
      /_TRANSLATION_PROTECT_\d+_\d+_/gi,
      /TRANSLATION_PROTECT_\d+_\d+/gi,
      /Protected_\d+_\d+/gi,
      // Standalone underscores that might be leftovers
      /^_+(?=<)/gm, // Leading underscores before tags
      /^_+(?=```)/gm, // Leading underscores before code blocks
      // Clean up sequences of underscores that are clearly leftovers
      /(?:\n|^)_+(?=\S)/gm, // Underscores at start of lines before non-whitespace
    ]

    cleanupPatterns.forEach(pattern => {
      restoredText = restoredText.replace(pattern, '')
    })

    return restoredText
  }

  // Public method to clean up corrupted protected content
  public cleanupProtectedContent(text: string): string {
    let cleanedText = text

    // Remove various placeholder patterns that might have been left behind
    const placeholderPatterns = [
      // Full placeholder patterns
      /___TRANSLATION_PROTECT_\d+_\d+___/gi,
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

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!this.activeProvider) {
      throw new Error('No active translation provider')
    }

    if (!this.activeProvider.isConfigured()) {
      throw new Error(`Translation provider '${this.activeProvider.name}' is not configured`)
    }

    // Protect content that shouldn't be translated
    const { processedText, protectedItems } = this.protectContent(text)
    
    // Skip translation if text is empty or only contains protected content
    if (processedText.trim() === '' || 
        (protectedItems.length > 0 && processedText.trim().replace(/___TRANSLATION_PROTECT_\d+_\d+___/g, '').trim() === '')) {
      console.log('Skipping translation: text is empty or only contains protected content')
      return text
    }

    try {
      console.log('Translation input:', { 
        originalText: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        processedText: processedText.substring(0, 200) + (processedText.length > 200 ? '...' : ''),
        protectedItemsCount: protectedItems.length,
        protectedItems: protectedItems.map(item => ({ 
          placeholder: item.placeholder, 
          content: item.originalContent.substring(0, 50) + (item.originalContent.length > 50 ? '...' : '')
        }))
      })

      // Translate the processed text
      const translatedText = await this.activeProvider.translate(processedText, from, to)
      
      console.log('Translation output before restore:', translatedText.substring(0, 200) + (translatedText.length > 200 ? '...' : ''))
      
      // Restore protected content
      const restoredText = this.restoreProtectedContent(translatedText, protectedItems)
      
      console.log('Translation output after restore:', restoredText.substring(0, 200) + (restoredText.length > 200 ? '...' : ''))
      
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
        const translated = await this.translate(text, from, to)
        results.push(translated)
      } catch (error) {
        console.error('Batch translation failed for text:', text, error)
        results.push(text) // Return original text on failure
      }
    }

    return results
  }

  async translateArticle(article: {
    title: string
    content: string
    summary: string
  }, from: string, to: string): Promise<{
    title: string
    content: string
    summary: string
  }> {
    const [title, content, summary] = await this.translateBatch(
      [article.title, article.content, article.summary],
      from,
      to
    )

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