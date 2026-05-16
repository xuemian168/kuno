import { BaseAISummaryProvider } from './base'
import { AISummaryResult, AuthHeaderType } from '../types'
import { DEFAULT_AI_MODELS } from '../../ai-providers/models'
import { buildClaudeMessagesRequestBody, getClaudeResponseText } from '../../ai-providers/claude-messages'
import { getClaudeEndpoint, PROVIDER_DEFAULTS, shouldUseBrowserProxy } from '../../ai-providers/utils'
import { AIServerProxyScope, getServerAIProxyEndpoint, getServerAIProxyHeaders } from '../../ai-providers/server-proxy'

export class ClaudeSummaryProvider extends BaseAISummaryProvider {
  name = 'Claude Summary'
  protected model = DEFAULT_AI_MODELS.claude
  private baseUrl?: string
  private authType: AuthHeaderType = 'x-api-key'
  private customAuthHeader?: string
  private useServerProxy = false
  private serverProxyScope: AIServerProxyScope = 'global'

  constructor(apiKey?: string, model?: string, maxKeywords?: number, summaryLength?: 'short' | 'medium' | 'long', baseUrl?: string, authType?: AuthHeaderType, customAuthHeader?: string, useServerProxy?: boolean, serverProxyScope?: AIServerProxyScope) {
    super(apiKey, model, maxKeywords, summaryLength)
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

  async generateSummary(content: string, language: string): Promise<AISummaryResult> {
    if (!this.isConfigured()) {
      throw this.createError('Claude API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)
    const cleanedContent = this.cleanContent(content)
    const languageName = this.getLanguageName(language)
    const summaryLengthPrompt = this.getSummaryLengthPrompt()

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(buildClaudeMessagesRequestBody({
          model: this.model,
          systemPrompt: `You are a professional content analyst. Generate a comprehensive analysis of the given article in ${languageName}. Respond with valid JSON only.`,
          userPrompt: `Return a JSON object containing:
- "title": A compelling title for the article (max 60 characters)
- "summary": A ${summaryLengthPrompt} summary capturing the main points
- "keywords": An array of ${this.maxKeywords} relevant SEO keywords

Article content:
${cleanedContent}`,
          temperature: 0.3,
          maxOutputTokens: 2048,
        }))
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Failed to generate summary',
          error.error?.type || 'API_ERROR'
        )
      }

      const data = await response.json()

      const resultText = getClaudeResponseText(data)

      if (!resultText) {
        throw this.createError('No response content', 'NO_CONTENT')
      }
      const result = JSON.parse(resultText)

      // Calculate usage
      const inputTokens = data.usage?.input_tokens || 0
      const outputTokens = data.usage?.output_tokens || 0
      const totalTokens = inputTokens + outputTokens

      // Claude pricing as of 2026-05 (per 1M tokens)
      const pricing: Record<string, { input: number, output: number }> = {
        'claude-opus-4-7': { input: 5.00, output: 25.00 },
        'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
        'claude-haiku-4-5': { input: 1.00, output: 5.00 },
        'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00 },
        'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
        'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
        'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
      }

      const modelPricing = pricing[this.model] || pricing[DEFAULT_AI_MODELS.claude]
      const estimatedCost = (inputTokens / 1000000) * modelPricing.input + (outputTokens / 1000000) * modelPricing.output

      return {
        title: result.title || 'Untitled',
        summary: result.summary || '',
        keywords: result.keywords || [],
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCost,
          currency: 'USD'
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        error instanceof Error ? error.message : 'Unknown error',
        'SUMMARY_ERROR'
      )
    }
  }

  async generateSEOKeywords(content: string, language: string): Promise<string[]> {
    if (!this.isConfigured()) {
      throw this.createError('Claude API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)
    const cleanedContent = this.cleanContent(content)
    const languageName = this.getLanguageName(language)

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(buildClaudeMessagesRequestBody({
          model: this.model,
          systemPrompt: `Extract SEO keywords from article content in ${languageName}. Return only a JSON array of strings.`,
          userPrompt: `Extract ${this.maxKeywords} SEO-optimized keywords from the following article.

Article content:
${cleanedContent}`,
          temperature: 0.3,
          maxOutputTokens: 1024,
        }))
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Failed to generate keywords',
          error.error?.type || 'API_ERROR'
        )
      }

      const data = await response.json()

      const resultText = getClaudeResponseText(data)

      if (!resultText) {
        throw this.createError('No response content', 'NO_CONTENT')
      }

      const keywords = JSON.parse(resultText)
      return Array.isArray(keywords) ? keywords : []
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        error instanceof Error ? error.message : 'Unknown error',
        'KEYWORDS_ERROR'
      )
    }
  }

  async generateTitle(content: string, language: string): Promise<string> {
    if (!this.isConfigured()) {
      throw this.createError('Claude API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)
    const cleanedContent = this.cleanContent(content)
    const languageName = this.getLanguageName(language)

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(buildClaudeMessagesRequestBody({
          model: this.model,
          systemPrompt: `Generate a compelling, SEO-friendly title in ${languageName}. Return only the title text.`,
          userPrompt: `Generate a title with a maximum length of 60 characters for the following article.

Article content:
${cleanedContent}`,
          temperature: 0.5,
          maxOutputTokens: 256,
        }))
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Failed to generate title',
          error.error?.type || 'API_ERROR'
        )
      }

      const data = await response.json()

      const titleText = getClaudeResponseText(data)

      if (!titleText) {
        throw this.createError('No response content', 'NO_CONTENT')
      }

      return titleText
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        error instanceof Error ? error.message : 'Unknown error',
        'TITLE_ERROR'
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
      'sw', 'zu', 'af'
    ]
  }
}
