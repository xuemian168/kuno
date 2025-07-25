import { SupportedLanguage } from '@/services/translation/types'

// Cache for loaded messages
const messagesCache: Record<string, any> = {}

// Available message files
const AVAILABLE_MESSAGES = {
  zh: () => import('./locales/zh.json'),
  en: () => import('./locales/en.json'),
  ja: () => import('./locales/ja.json')
}

export async function loadMessages(locale: SupportedLanguage): Promise<any> {
  // Return cached messages if available
  if (messagesCache[locale]) {
    return messagesCache[locale]
  }

  try {
    // Try to load specific locale messages
    const messages = await AVAILABLE_MESSAGES[locale as keyof typeof AVAILABLE_MESSAGES]?.()
    if (messages) {
      messagesCache[locale] = messages.default || messages
      return messagesCache[locale]
    }
  } catch (error) {
    console.warn(`Failed to load messages for locale ${locale}:`, error)
  }

  // Fallback to English messages (as requested by user)
  try {
    const fallbackMessages = await AVAILABLE_MESSAGES.en()
    messagesCache[locale] = fallbackMessages.default || fallbackMessages
    return messagesCache[locale]
  } catch (error) {
    console.error('Failed to load English fallback messages:', error)
    
    // Last resort: try Chinese messages
    try {
      const chineseFallback = await AVAILABLE_MESSAGES.zh()
      messagesCache[locale] = chineseFallback.default || chineseFallback
      return messagesCache[locale]
    } catch (finalError) {
      console.error('Failed to load any fallback messages:', finalError)
      return {}
    }
  }
}

// Simple translation function for client-side use
export function createSimpleTranslator(messages: any) {
  return function t(key: string, params?: Record<string, any>): string {
    const keys = key.split('.')
    let value = messages
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key // Return key if translation not found
      }
    }
    
    if (typeof value !== 'string') {
      return key
    }
    
    // Simple parameter replacement
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match
      })
    }
    
    return value
  }
}


// Export for global use
if (typeof window !== 'undefined') {
  ;(window as any).__messagesLoader = { loadMessages, createSimpleTranslator }
}