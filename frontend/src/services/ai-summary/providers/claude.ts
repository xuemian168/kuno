import { BaseAISummaryProvider } from './base'
import { AISummaryResult } from '../types'
import { getClaudeEndpoint, PROVIDER_DEFAULTS } from '../../ai-providers/utils'

export class ClaudeSummaryProvider extends BaseAISummaryProvider {
  name = 'Claude Summary'
  protected model = 'claude-3-5-sonnet-20241022'
  private baseUrl?: string

  constructor(apiKey?: string, model?: string, maxKeywords?: number, summaryLength?: 'short' | 'medium' | 'long', baseUrl?: string) {
    super(apiKey, model, maxKeywords, summaryLength)
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
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `You are a professional content analyst. Generate a comprehensive analysis of the given article in ${languageName}. Respond with a JSON object containing:
- "title": A compelling title for the article (max 60 characters)
- "summary": A ${summaryLengthPrompt} summary capturing the main points
- "keywords": An array of ${this.maxKeywords} relevant SEO keywords

Article content:
${cleanedContent}

Respond ONLY with valid JSON, no additional text.`
            }
          ],
          temperature: 0.3,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Failed to generate summary',
          error.error?.type || 'API_ERROR'
        )
      }

      const data = await response.json()

      if (!data.content || data.content.length === 0) {
        throw this.createError('No response content', 'NO_CONTENT')
      }

      const resultText = data.content[0].text
      const result = JSON.parse(resultText)

      // Calculate usage
      const inputTokens = data.usage?.input_tokens || 0
      const outputTokens = data.usage?.output_tokens || 0
      const totalTokens = inputTokens + outputTokens

      // Claude pricing (per 1M tokens)
      const pricing: Record<string, { input: number, output: number }> = {
        'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
        'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
        'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
      }

      const modelPricing = pricing[this.model] || pricing['claude-3-5-sonnet-20241022']
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
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `Extract ${this.maxKeywords} SEO-optimized keywords from the following article in ${languageName}.
Return ONLY a JSON array of strings, no additional text.

Article content:
${cleanedContent}`
            }
          ],
          temperature: 0.3,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Failed to generate keywords',
          error.error?.type || 'API_ERROR'
        )
      }

      const data = await response.json()

      if (!data.content || data.content.length === 0) {
        throw this.createError('No response content', 'NO_CONTENT')
      }

      const keywords = JSON.parse(data.content[0].text)
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
        body: JSON.stringify({
          model: this.model,
          max_tokens: 256,
          messages: [
            {
              role: 'user',
              content: `Generate a compelling, SEO-friendly title (max 60 characters) for the following article in ${languageName}.
Return ONLY the title text, no quotes or additional formatting.

Article content:
${cleanedContent}`
            }
          ],
          temperature: 0.5,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Failed to generate title',
          error.error?.type || 'API_ERROR'
        )
      }

      const data = await response.json()

      if (!data.content || data.content.length === 0) {
        throw this.createError('No response content', 'NO_CONTENT')
      }

      return data.content[0].text.trim()
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
