import { BaseTranslationProvider } from './base'

export class GoogleFreeProvider extends BaseTranslationProvider {
  name = 'Google Translate (Free)'
  
  constructor() {
    super() // No API key needed
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    this.validateLanguages(from, to)

    try {
      // Using a public Google Translate endpoint (reverse engineered)
      // Note: This is unofficial and may break at any time
      const url = 'https://translate.googleapis.com/translate_a/single'
      const params = new URLSearchParams({
        client: 'gtx',
        sl: this.convertLanguageCode(from),
        tl: this.convertLanguageCode(to),
        dt: 't',
        q: text
      })

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw this.createError(
          'Translation request failed',
          'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      
      // Extract translated text from the response
      // Google's free API returns a complex array structure
      let translatedText = ''
      if (data && data[0]) {
        for (const sentence of data[0]) {
          if (sentence[0]) {
            translatedText += sentence[0]
          }
        }
      }

      if (!translatedText) {
        throw this.createError(
          'No translation returned',
          'TRANSLATION_ERROR'
        )
      }

      return translatedText
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Google Free error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  getSupportedLanguages(): string[] {
    return [
      'zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt',
      'it', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'sk', 'hu',
      'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'uk', 'be',
      'tr', 'he', 'fa', 'ur', 'hi', 'bn', 'ta', 'te', 'ml', 'kn',
      'gu', 'pa', 'mr', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am',
      'sw', 'zu', 'af', 'sq', 'hy', 'az', 'eu', 'ca', 'cy', 'ga',
      'is', 'mt', 'vi', 'th', 'id', 'ms', 'tl'
    ]
  }

  isConfigured(): boolean {
    // No configuration needed for free version
    return true
  }

  private convertLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'zh': 'zh-CN',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'ru': 'ru',
      'ar': 'ar',
      'pt': 'pt'
    }
    return mapping[code] || code
  }
}