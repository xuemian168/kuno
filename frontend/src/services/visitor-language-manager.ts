import { SUPPORTED_LANGUAGES, SupportedLanguage } from './translation/types'
import { languageManager } from './translation/language-manager'

export interface VisitorLanguageConfig {
  enabledLocales: SupportedLanguage[]
  defaultLocale: SupportedLanguage
  localeNames: Record<string, string>
}

class VisitorLanguageManager {
  private static instance: VisitorLanguageManager
  private config: VisitorLanguageConfig

  private constructor() {
    this.config = this.loadConfig()
  }

  public static getInstance(): VisitorLanguageManager {
    if (!VisitorLanguageManager.instance) {
      VisitorLanguageManager.instance = new VisitorLanguageManager()
    }
    return VisitorLanguageManager.instance
  }

  private loadConfig(): VisitorLanguageConfig {
    try {
      // Get enabled languages from language manager
      const enabledLanguages = languageManager.getEnabledLanguages()
      
      // Create locale names mapping
      const localeNames: Record<string, string> = {}
      enabledLanguages.forEach(lang => {
        localeNames[lang] = SUPPORTED_LANGUAGES[lang]
      })

      return {
        enabledLocales: enabledLanguages,
        defaultLocale: 'zh', // Always default to Chinese
        localeNames
      }
    } catch (error) {
      console.error('Failed to load visitor language config:', error)
      // Fallback configuration
      return {
        enabledLocales: ['zh', 'en'],
        defaultLocale: 'zh',
        localeNames: { zh: '中文', en: 'English' }
      }
    }
  }

  public getConfig(): VisitorLanguageConfig {
    // Refresh config each time to get latest settings
    this.config = this.loadConfig()
    return this.config
  }

  public getEnabledLocales(): SupportedLanguage[] {
    return this.getConfig().enabledLocales
  }

  public getDefaultLocale(): SupportedLanguage {
    return this.getConfig().defaultLocale
  }

  public getLocaleNames(): Record<string, string> {
    return this.getConfig().localeNames
  }

  public isValidLocale(locale: string): locale is SupportedLanguage {
    return this.getEnabledLocales().includes(locale as SupportedLanguage)
  }

  public getLocaleName(locale: string): string {
    return this.getLocaleNames()[locale] || locale
  }

  // Get fallback locale if requested locale is not enabled
  public getFallbackLocale(requestedLocale: string): SupportedLanguage {
    if (this.isValidLocale(requestedLocale)) {
      return requestedLocale
    }
    
    // Always fallback to Chinese first, then English
    const enabledLocales = this.getEnabledLocales()
    if (enabledLocales.includes('zh')) {
      return 'zh'
    } else if (enabledLocales.includes('en')) {
      return 'en'
    } else {
      // Return the first enabled locale as last resort
      return enabledLocales[0] || 'zh'
    }
  }
}

export const visitorLanguageManager = VisitorLanguageManager.getInstance()

// Utility functions for Next.js integration
export function getDynamicLocales(): SupportedLanguage[] {
  return visitorLanguageManager.getEnabledLocales()
}

export function getDynamicDefaultLocale(): SupportedLanguage {
  return visitorLanguageManager.getDefaultLocale()
}

export function getDynamicLocaleNames(): Record<string, string> {
  return visitorLanguageManager.getLocaleNames()
}