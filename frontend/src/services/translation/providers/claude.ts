import { BaseTranslationProvider } from './base'
import { TranslationResult } from '../types'
import { formatErrorMessage } from '../error-messages'
import { getClaudeEndpoint, PROVIDER_DEFAULTS } from '../../ai-providers/utils'

export class ClaudeProvider extends BaseTranslationProvider {
  name = 'Claude'
  private model = 'claude-3-5-sonnet-20241022'
  private baseUrl?: string

  constructor(apiKey?: string, model?: string, baseUrl?: string) {
    super(apiKey)
    if (model) this.model = model
    if (baseUrl) this.baseUrl = baseUrl
  }

  private getEndpoint(): string {
    return getClaudeEndpoint(this.baseUrl)
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey || '',
      'anthropic-version': PROVIDER_DEFAULTS.claude.apiVersion,
    }
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!this.isConfigured()) {
      throw this.createError('Claude API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(from)
    const toLang = this.getLanguageName(to)

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}.
Maintain the original formatting, tone, and style.
Only provide the translation without any explanation or additional text.

Text to translate:
${text}`
            }
          ],
          temperature: 0.3,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        let errorMessage = 'Translation failed'
        let errorCode = 'TRANSLATION_ERROR'

        if (error.error) {
          errorMessage = error.error.message || errorMessage
          errorCode = error.error.type || String(response.status)
        } else if (error.message) {
          errorMessage = error.message
          errorCode = String(response.status)
        }

        const friendlyMessage = formatErrorMessage(errorMessage, errorCode, this.name)

        throw this.createError(friendlyMessage, errorCode)
      }

      const data = await response.json()

      // Claude returns content as an array
      if (!data.content || data.content.length === 0) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }

      return data.content[0].text.trim()
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const friendlyMessage = formatErrorMessage(errorMessage, 'PROVIDER_ERROR', this.name)
      throw this.createError(friendlyMessage, 'PROVIDER_ERROR')
    }
  }

  async translateWithUsage(text: string, from: string, to: string): Promise<TranslationResult> {
    if (!this.isConfigured()) {
      throw this.createError('Claude API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(from)
    const toLang = this.getLanguageName(to)

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}.
Maintain the original formatting, tone, and style.
Only provide the translation without any explanation or additional text.

Text to translate:
${text}`
            }
          ],
          temperature: 0.3,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        let errorMessage = 'Translation failed'
        let errorCode = 'TRANSLATION_ERROR'

        if (error.error) {
          errorMessage = error.error.message || errorMessage
          errorCode = error.error.type || String(response.status)
        } else if (error.message) {
          errorMessage = error.message
          errorCode = String(response.status)
        }

        const friendlyMessage = formatErrorMessage(errorMessage, errorCode, this.name)

        throw this.createError(friendlyMessage, errorCode)
      }

      const data = await response.json()

      if (!data.content || data.content.length === 0) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }

      // Calculate estimated cost based on model
      const inputTokens = data.usage?.input_tokens || 0
      const outputTokens = data.usage?.output_tokens || 0
      const totalTokens = inputTokens + outputTokens

      let estimatedCost = 0
      const currency = 'USD'

      // Claude pricing as of 2024 (per 1M tokens)
      const pricing: Record<string, { input: number, output: number }> = {
        'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
        'claude-3-5-sonnet-20240620': { input: 3.00, output: 15.00 },
        'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
        'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
        'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
        'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      }

      const modelPricing = pricing[this.model] || pricing['claude-3-5-sonnet-20241022']
      estimatedCost = (inputTokens / 1000000) * modelPricing.input + (outputTokens / 1000000) * modelPricing.output

      return {
        translatedText: data.content[0].text.trim(),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCost,
          currency
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const friendlyMessage = formatErrorMessage(errorMessage, 'PROVIDER_ERROR', this.name)
      throw this.createError(friendlyMessage, 'PROVIDER_ERROR')
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (!this.isConfigured()) {
      throw this.createError('Claude API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(from)
    const toLang = this.getLanguageName(to)

    try {
      // Format texts as a numbered list for batch translation
      const numberedTexts = texts.map((text, i) => `${i + 1}. ${text}`).join('\n\n')

      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `You are a professional translator. Translate the following numbered texts from ${fromLang} to ${toLang}.
Maintain the original formatting, tone, and style for each text.
Keep the same numbering format in your response.
Only provide the translations without any explanation.

${numberedTexts}`
            }
          ],
          temperature: 0.3,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        let errorMessage = 'Translation failed'
        let errorCode = 'TRANSLATION_ERROR'

        if (error.error) {
          errorMessage = error.error.message || errorMessage
          errorCode = error.error.type || String(response.status)
        } else if (error.message) {
          errorMessage = error.message
          errorCode = String(response.status)
        }

        const friendlyMessage = formatErrorMessage(errorMessage, errorCode, this.name)

        throw this.createError(friendlyMessage, errorCode)
      }

      const data = await response.json()

      if (!data.content || data.content.length === 0) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }

      const translatedText = data.content[0].text.trim()

      // Parse the numbered response
      const translations = translatedText
        .split(/\n+/)
        .filter((line: string) => line.match(/^\d+\./))
        .map((line: string) => line.replace(/^\d+\.\s*/, ''))

      if (translations.length !== texts.length) {
        // Fallback to individual translations if parsing fails
        return super.translateBatch(texts, from, to)
      }

      return translations
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const friendlyMessage = formatErrorMessage(errorMessage, 'PROVIDER_ERROR', this.name)
      throw this.createError(friendlyMessage, 'PROVIDER_ERROR')
    }
  }

  getSupportedLanguages(): string[] {
    // Claude supports all major languages
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

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      'zh': 'Chinese',
      'en': 'English',
      'ja': 'Japanese',
      'ko': 'Korean',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'ru': 'Russian',
      'ar': 'Arabic',
      'pt': 'Portuguese'
    }
    return names[code] || code
  }
}
