import { SUPPORTED_LANGUAGES, SupportedLanguage, LanguageSettings } from './types'

const DEFAULT_ENABLED_LANGUAGES: SupportedLanguage[] = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru']

export class LanguageManager {
  private static instance: LanguageManager
  private settings: LanguageSettings

  private constructor() {
    this.settings = this.loadSettings()
  }

  public static getInstance(): LanguageManager {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager()
    }
    return LanguageManager.instance
  }

  private loadSettings(): LanguageSettings {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      // Server-side fallback
      return {
        enabledLanguages: DEFAULT_ENABLED_LANGUAGES,
        defaultSourceLanguage: 'zh',
        adminInterfaceLanguages: ['zh', 'en']
      }
    }

    try {
      const saved = localStorage.getItem('blog_language_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          enabledLanguages: parsed.enabledLanguages || DEFAULT_ENABLED_LANGUAGES,
          defaultSourceLanguage: parsed.defaultSourceLanguage || 'zh',
          adminInterfaceLanguages: ['zh', 'en'] // Always fixed
        }
      }
    } catch (error) {
      console.error('Failed to load language settings:', error)
    }

    return {
      enabledLanguages: DEFAULT_ENABLED_LANGUAGES,
      defaultSourceLanguage: 'zh',
      adminInterfaceLanguages: ['zh', 'en']
    }
  }

  private saveSettings(): void {
    // Only save in browser environment
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem('blog_language_settings', JSON.stringify({
        enabledLanguages: this.settings.enabledLanguages,
        defaultSourceLanguage: this.settings.defaultSourceLanguage
      }))
    } catch (error) {
      console.error('Failed to save language settings:', error)
    }
  }

  public getEnabledLanguages(): SupportedLanguage[] {
    return this.settings.enabledLanguages
  }

  public getAdminInterfaceLanguages(): ('zh' | 'en')[] {
    return this.settings.adminInterfaceLanguages
  }

  public getDefaultSourceLanguage(): SupportedLanguage {
    return this.settings.defaultSourceLanguage
  }

  public getAllSupportedLanguages(): Record<SupportedLanguage, string> {
    return SUPPORTED_LANGUAGES
  }

  public getEnabledLanguageOptions(): Array<{ code: SupportedLanguage; name: string }> {
    return this.settings.enabledLanguages.map(code => ({
      code,
      name: SUPPORTED_LANGUAGES[code]
    }))
  }

  public setEnabledLanguages(languages: SupportedLanguage[]): void {
    // Ensure at least Chinese and English are always included
    const requiredLanguages: SupportedLanguage[] = ['zh', 'en']
    const uniqueLanguages = Array.from(new Set([...requiredLanguages, ...languages]))
    
    this.settings.enabledLanguages = uniqueLanguages
    this.saveSettings()
  }

  public setDefaultSourceLanguage(language: SupportedLanguage): void {
    if (this.settings.enabledLanguages.includes(language)) {
      this.settings.defaultSourceLanguage = language
      this.saveSettings()
    }
  }

  public isLanguageEnabled(language: SupportedLanguage): boolean {
    return this.settings.enabledLanguages.includes(language)
  }

  public addLanguage(language: SupportedLanguage): void {
    if (!this.settings.enabledLanguages.includes(language)) {
      this.settings.enabledLanguages.push(language)
      this.saveSettings()
    }
  }

  public removeLanguage(language: SupportedLanguage): void {
    // Cannot remove Chinese or English (required for admin interface)
    if (language === 'zh' || language === 'en') {
      return
    }

    this.settings.enabledLanguages = this.settings.enabledLanguages.filter(l => l !== language)
    
    // If removed language was the default, switch to Chinese
    if (this.settings.defaultSourceLanguage === language) {
      this.settings.defaultSourceLanguage = 'zh'
    }
    
    this.saveSettings()
  }

  public resetToDefaults(): void {
    this.settings.enabledLanguages = DEFAULT_ENABLED_LANGUAGES
    this.settings.defaultSourceLanguage = 'zh'
    this.saveSettings()
  }
}

export const languageManager = LanguageManager.getInstance()