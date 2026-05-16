import { BaseTranslationProvider } from './base'
import { AuthHeaderType, TranslationResult, TranslationModelProfile } from '../types'
import { DEFAULT_AI_MODELS } from '../../ai-providers/models'
import { buildClaudeMessagesRequestBody, getClaudeResponseText } from '../../ai-providers/claude-messages'
import { formatErrorMessage } from '../error-messages'
import { getClaudeEndpoint, PROVIDER_DEFAULTS, shouldUseBrowserProxy } from '../../ai-providers/utils'
import { AIServerProxyScope, getServerAIProxyEndpoint, getServerAIProxyHeaders } from '../../ai-providers/server-proxy'
import { createTranslationModelProfile } from '../model-profiles'
import { buildBatchTranslationSystemPrompt, buildTranslationSystemPrompt } from '../prompt-utils'

export class ClaudeProvider extends BaseTranslationProvider {
  name = 'Claude'
  private model = DEFAULT_AI_MODELS.claude
  private baseUrl?: string
  private authType: AuthHeaderType = 'x-api-key'
  private customAuthHeader?: string
  private useServerProxy = false
  private serverProxyScope: AIServerProxyScope = 'global'

  constructor(apiKey?: string, model?: string, baseUrl?: string, authType?: AuthHeaderType, customAuthHeader?: string, useServerProxy?: boolean, serverProxyScope?: AIServerProxyScope) {
    super(apiKey)
    if (model) this.model = model
    if (baseUrl) this.baseUrl = baseUrl
    if (authType) this.authType = authType
    if (customAuthHeader) this.customAuthHeader = customAuthHeader
    if (useServerProxy) this.useServerProxy = true
    if (serverProxyScope) this.serverProxyScope = serverProxyScope
  }

  private getEndpoint(): string {
    if (this.useServerProxy) {
      return getServerAIProxyEndpoint('claude', this.serverProxyScope)
    }

    return getClaudeEndpoint(this.baseUrl)
  }

  private isUsingCustomBaseUrl(): boolean {
    return !!this.baseUrl && this.baseUrl !== PROVIDER_DEFAULTS.claude.baseUrl
  }

  private isUsingProxy(): boolean {
    return shouldUseBrowserProxy(this.baseUrl)
  }

  private getHeaders(): HeadersInit {
    if (this.useServerProxy) {
      return {
        ...getServerAIProxyHeaders(),
        'anthropic-version': PROVIDER_DEFAULTS.claude.apiVersion,
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': PROVIDER_DEFAULTS.claude.apiVersion,
    }

    if (!this.apiKey) {
      return headers
    }

    if (!this.isUsingCustomBaseUrl()) {
      headers['x-api-key'] = this.apiKey
      return headers
    }

    switch (this.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.apiKey}`
        break
      case 'x-api-key':
        headers['x-api-key'] = this.apiKey
        break
      case 'x-goog-api-key':
        headers['x-goog-api-key'] = this.apiKey
        break
      case 'api-key':
        headers['api-key'] = this.apiKey
        break
      case 'custom':
        if (this.customAuthHeader) {
          headers[this.customAuthHeader] = this.apiKey
          if (this.isUsingProxy()) {
            headers['x-kuno-forward-auth-header'] = this.customAuthHeader
          }
        } else {
          headers['x-api-key'] = this.apiKey
        }
        break
      default:
        headers['x-api-key'] = this.apiKey
    }

    return headers
  }

  getModelProfile(): TranslationModelProfile {
    return createTranslationModelProfile('claude', this.model)
  }

  private getMaxOutputTokens(text: string): number {
    return Math.min(Math.max(Math.ceil(text.length * 1.5), 1024), this.getModelProfile().maxOutputTokens)
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
        body: JSON.stringify(buildClaudeMessagesRequestBody({
          model: this.model,
          systemPrompt: buildTranslationSystemPrompt(fromLang, toLang),
          userPrompt: `Text to translate:
${text}`,
          temperature: 0.3,
          maxOutputTokens: this.getMaxOutputTokens(text),
        }))
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

      const translatedText = getClaudeResponseText(data)

      if (!translatedText) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }

      return translatedText
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
        body: JSON.stringify(buildClaudeMessagesRequestBody({
          model: this.model,
          systemPrompt: buildTranslationSystemPrompt(fromLang, toLang),
          userPrompt: `Text to translate:
${text}`,
          temperature: 0.3,
          maxOutputTokens: this.getMaxOutputTokens(text),
        }))
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

      const translatedText = getClaudeResponseText(data)

      if (!translatedText) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }

      // Calculate estimated cost based on model
      const inputTokens = data.usage?.input_tokens || 0
      const outputTokens = data.usage?.output_tokens || 0
      const totalTokens = inputTokens + outputTokens

      let estimatedCost = 0
      const currency = 'USD'

      // Claude pricing as of 2026-05 (per 1M tokens)
      const pricing: Record<string, { input: number, output: number }> = {
        'claude-opus-4-7': { input: 5.00, output: 25.00 },
        'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
        'claude-haiku-4-5': { input: 1.00, output: 5.00 },
        'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00 },
        'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
        'claude-3-5-sonnet-20240620': { input: 3.00, output: 15.00 },
        'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
        'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
        'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
        'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      }

      const modelPricing = pricing[this.model] || pricing[DEFAULT_AI_MODELS.claude]
      estimatedCost = (inputTokens / 1000000) * modelPricing.input + (outputTokens / 1000000) * modelPricing.output

      return {
        translatedText,
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
        body: JSON.stringify(buildClaudeMessagesRequestBody({
          model: this.model,
          systemPrompt: buildBatchTranslationSystemPrompt(fromLang, toLang),
          userPrompt: numberedTexts,
          temperature: 0.3,
          maxOutputTokens: this.getMaxOutputTokens(numberedTexts),
        }))
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

      const translatedText = getClaudeResponseText(data)

      if (!translatedText) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }

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
