import { BaseTranslationProvider } from './base'

export class LibreTranslateProvider extends BaseTranslationProvider {
  name = 'LibreTranslate'
  private apiUrl: string
  
  constructor(apiKey?: string, apiUrl?: string) {
    super(apiKey)
    // Default to the public instance, but allow custom self-hosted instances
    this.apiUrl = apiUrl || 'https://libretranslate.com/translate'
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    this.validateLanguages(from, to)

    try {
      const params: any = {
        q: text,
        source: this.convertLanguageCode(from),
        target: this.convertLanguageCode(to),
        format: 'text'
      }

      // Only add API key if configured (some instances don't require it)
      if (this.apiKey) {
        params.api_key = this.apiKey
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error || 'Translation failed',
          'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      return data.translatedText
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `LibreTranslate error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    this.validateLanguages(from, to)

    try {
      const params: any = {
        q: texts,
        source: this.convertLanguageCode(from),
        target: this.convertLanguageCode(to),
        format: 'text'
      }

      if (this.apiKey) {
        params.api_key = this.apiKey
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error || 'Translation failed',
          'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      // LibreTranslate returns an array of translations when input is array
      return data.translatedText || data.map((item: any) => item.translatedText)
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      // Fallback to individual translations if batch fails
      return super.translateBatch(texts, from, to)
    }
  }

  getSupportedLanguages(): string[] {
    // LibreTranslate supports many languages, listing the common ones
    return ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt']
  }

  isConfigured(): boolean {
    // LibreTranslate can work without API key on some instances
    return true
  }

  private convertLanguageCode(code: string): string {
    // LibreTranslate uses standard ISO 639-1 codes
    const mapping: Record<string, string> = {
      'zh': 'zh',
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