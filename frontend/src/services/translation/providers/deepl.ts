import { BaseTranslationProvider } from './base'

export class DeepLProvider extends BaseTranslationProvider {
  name = 'DeepL'
  private baseUrl = 'https://api-free.deepl.com/v2' // Use paid API endpoint for pro accounts
  
  async translate(text: string, from: string, to: string): Promise<string> {
    if (!this.isConfigured()) {
      throw this.createError('DeepL API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    try {
      const params = new URLSearchParams({
        auth_key: this.apiKey!,
        text: text,
        source_lang: this.convertLanguageCode(from).toUpperCase(),
        target_lang: this.convertLanguageCode(to).toUpperCase()
      })

      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.message || 'Translation failed',
          'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      return data.translations[0].text
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `DeepL error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (!this.isConfigured()) {
      throw this.createError('DeepL API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    try {
      const params = new URLSearchParams({
        auth_key: this.apiKey!,
        source_lang: this.convertLanguageCode(from).toUpperCase(),
        target_lang: this.convertLanguageCode(to).toUpperCase()
      })

      // DeepL supports multiple texts in one request
      texts.forEach(text => params.append('text', text))

      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.message || 'Translation failed',
          'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      return data.translations.map((t: any) => t.text)
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `DeepL error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  getSupportedLanguages(): string[] {
    // DeepL supports fewer languages but with higher quality
    return ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'pt']
  }

  private convertLanguageCode(code: string): string {
    // DeepL uses specific codes
    const mapping: Record<string, string> = {
      'zh': 'ZH',
      'en': 'EN',
      'ja': 'JA',
      'ko': 'KO',
      'es': 'ES',
      'fr': 'FR',
      'de': 'DE',
      'ru': 'RU',
      'pt': 'PT'
    }
    return mapping[code] || code.toUpperCase()
  }
}