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
        const placeholder = `__PROTECTED_${index}_${matchIndex}__`
        protectedItems.push({
          placeholder,
          originalContent: match[0]
        })
        // Replace only the first occurrence to avoid double replacement
        processedText = processedText.replace(match[0], placeholder)
        matchIndex++
        
        // Reset the search position to avoid infinite loops with zero-width matches
        if (match.index === globalPattern.lastIndex) {
          globalPattern.lastIndex++
        }
      }
    })

    return { processedText, protectedItems }
  }

  private restoreProtectedContent(translatedText: string, protectedItems: ProtectedContent[]): string {
    let restoredText = translatedText

    protectedItems.forEach(item => {
      restoredText = restoredText.replace(item.placeholder, item.originalContent)
    })

    return restoredText
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
    if (processedText.trim() === '' || protectedItems.length > 0 && processedText.trim().replace(/__PROTECTED_\d+_\d+__/g, '').trim() === '') {
      return text
    }

    try {
      // Translate the processed text
      const translatedText = await this.activeProvider.translate(processedText, from, to)
      
      // Restore protected content
      return this.restoreProtectedContent(translatedText, protectedItems)
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