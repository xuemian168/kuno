import { BaseTranslationProvider } from './base'

export class MyMemoryProvider extends BaseTranslationProvider {
  name = 'MyMemory'
  private email?: string
  
  constructor(apiKey?: string, email?: string) {
    super(apiKey)
    this.email = email || 'user@example.com' // MyMemory requires an email
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    this.validateLanguages(from, to)

    try {
      const langPair = `${this.convertLanguageCode(from)}|${this.convertLanguageCode(to)}`
      const params = new URLSearchParams({
        q: text,
        langpair: langPair,
        de: this.email!
      })

      // Add API key if provided (for higher rate limits)
      if (this.apiKey) {
        params.append('key', this.apiKey)
      }

      const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`, {
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
      
      if (data.responseStatus !== 200) {
        throw this.createError(
          data.responseDetails || 'Translation failed',
          'TRANSLATION_ERROR'
        )
      }

      // Check if we hit the rate limit
      if (data.responseData.translatedText.includes('MYMEMORY WARNING')) {
        throw this.createError(
          'Rate limit exceeded. Please try again later or provide an API key.',
          'RATE_LIMIT'
        )
      }

      return data.responseData.translatedText
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `MyMemory error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    // MyMemory doesn't support batch translation, so we use the base implementation
    // which translates one by one
    return super.translateBatch(texts, from, to)
  }

  getSupportedLanguages(): string[] {
    // MyMemory supports many languages
    return ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt']
  }

  isConfigured(): boolean {
    // MyMemory works without API key (with rate limits)
    return true
  }

  private convertLanguageCode(code: string): string {
    // MyMemory uses ISO 639-1 codes with some variations
    const mapping: Record<string, string> = {
      'zh': 'zh-CN', // MyMemory prefers zh-CN over zh
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