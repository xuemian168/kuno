import { TranslationProvider, TranslationError } from '../types'

export abstract class BaseTranslationProvider implements TranslationProvider {
  abstract name: string
  protected apiKey?: string
  protected apiSecret?: string

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
  }

  abstract translate(text: string, from: string, to: string): Promise<string>
  
  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    // Default implementation: translate one by one
    // Providers can override this for better performance
    const promises = texts.map(text => this.translate(text, from, to))
    return Promise.all(promises)
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  abstract getSupportedLanguages(): string[]

  protected createError(message: string, code: string): TranslationError {
    const error = new Error(message) as TranslationError
    error.code = code
    error.provider = this.name
    return error
  }

  protected validateLanguages(from: string, to: string): void {
    const supported = this.getSupportedLanguages()
    if (!supported.includes(from) || !supported.includes(to)) {
      throw this.createError(
        `Unsupported language pair: ${from} -> ${to}`,
        'UNSUPPORTED_LANGUAGE'
      )
    }
  }
}