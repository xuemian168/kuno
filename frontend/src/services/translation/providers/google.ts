import { BaseTranslationProvider } from './base'

export class GoogleTranslateProvider extends BaseTranslationProvider {
  name = 'Google Translate'
  
  async translate(text: string, from: string, to: string): Promise<string> {
    if (!this.isConfigured()) {
      throw this.createError('Google Translate API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey!
        },
        body: JSON.stringify({
          q: text,
          source: this.convertLanguageCode(from),
          target: this.convertLanguageCode(to),
          format: 'text'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Translation failed',
          error.error?.code || 'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      return data.data.translations[0].translatedText
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Google Translate error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (!this.isConfigured()) {
      throw this.createError('Google Translate API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey!
        },
        body: JSON.stringify({
          q: texts,
          source: this.convertLanguageCode(from),
          target: this.convertLanguageCode(to),
          format: 'text'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Translation failed',
          error.error?.code || 'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      return data.data.translations.map((t: any) => t.translatedText)
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Google Translate error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      'is', 'mt', 'vi', 'th', 'id', 'ms', 'tl', 'haw', 'mi', 'sm',
      'to', 'fj'
    ]
  }

  private convertLanguageCode(code: string): string {
    // Google uses different codes for Chinese
    const mapping: Record<string, string> = {
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW'
    }
    return mapping[code] || code
  }
}