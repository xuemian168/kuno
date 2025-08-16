import { SUPPORTED_LANGUAGES, SupportedLanguage } from './translation/types'
import { languageManager } from './translation/language-manager'
import { apiClient } from '@/lib/api'

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

  private async loadConfigFromAPI(): Promise<VisitorLanguageConfig | null> {
    try {
      const apiConfig = await apiClient.getLanguageConfig()
      
      // Create locale names mapping
      const localeNames: Record<string, string> = apiConfig.supported_languages

      return {
        enabledLocales: apiConfig.enabled_languages as SupportedLanguage[],
        defaultLocale: apiConfig.default_language as SupportedLanguage,
        localeNames
      }
    } catch (error) {
      console.warn('Failed to load language config from API:', error)
      return null
    }
  }

  private loadConfig(): VisitorLanguageConfig {
    try {
      // Get enabled languages from language manager as fallback
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
      // Ultimate fallback configuration with Arabic included
      return {
        enabledLocales: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar'],
        defaultLocale: 'zh',
        localeNames: { 
          zh: '中文', 
          en: 'English',
          ja: '日本語',
          ko: '한국어',
          es: 'Español',
          fr: 'Français',
          de: 'Deutsch',
          ru: 'Русский',
          ar: 'العربية'
        }
      }
    }
  }

  public getConfig(): VisitorLanguageConfig {
    // Return cached config if available
    if (this.config) {
      return this.config
    }
    
    // Load from local fallback first
    this.config = this.loadConfig()
    
    // Try to update from API in the background
    this.loadConfigFromAPI().then(apiConfig => {
      if (apiConfig) {
        this.config = apiConfig
      }
    }).catch(error => {
      console.warn('Background API config loading failed:', error)
    })
    
    return this.config
  }

  public async getConfigAsync(): Promise<VisitorLanguageConfig> {
    // Try to load from API first
    const apiConfig = await this.loadConfigFromAPI()
    if (apiConfig) {
      this.config = apiConfig
      return this.config
    }
    
    // Fall back to local config
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

export async function getDynamicLocalesAsync(): Promise<SupportedLanguage[]> {
  const config = await visitorLanguageManager.getConfigAsync()
  return config.enabledLocales
}

export async function getDynamicDefaultLocaleAsync(): Promise<SupportedLanguage> {
  const config = await visitorLanguageManager.getConfigAsync()
  return config.defaultLocale
}

export async function getDynamicLocaleNamesAsync(): Promise<Record<string, string>> {
  const config = await visitorLanguageManager.getConfigAsync()
  return config.localeNames
}