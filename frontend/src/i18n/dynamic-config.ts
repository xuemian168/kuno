import { visitorLanguageManager } from '@/services/visitor-language-manager'
import { SupportedLanguage } from '@/services/translation/types'

// Dynamic locale configuration that reads from visitor language manager
export function getDynamicLocales(): SupportedLanguage[] {
  try {
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      return visitorLanguageManager.getEnabledLocales()
    } else {
      // Server-side fallback - include common languages to ensure routing works
      return ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de'] as SupportedLanguage[]
    }
  } catch (error) {
    console.error('Failed to get dynamic locales:', error)
    return ['zh', 'en'] // fallback
  }
}

export function getDynamicDefaultLocale(): SupportedLanguage {
  try {
    return visitorLanguageManager.getDefaultLocale()
  } catch (error) {
    console.error('Failed to get dynamic default locale:', error)
    return 'zh' // fallback
  }
}

export function getDynamicLocaleNames(): Record<string, string> {
  try {
    return visitorLanguageManager.getLocaleNames()
  } catch (error) {
    console.error('Failed to get dynamic locale names:', error)
    return { zh: '中文', en: 'English' } // fallback
  }
}

export function isValidDynamicLocale(locale: string): locale is SupportedLanguage {
  try {
    return visitorLanguageManager.isValidLocale(locale)
  } catch (error) {
    console.error('Failed to validate dynamic locale:', error)
    return ['zh', 'en'].includes(locale) // fallback
  }
}