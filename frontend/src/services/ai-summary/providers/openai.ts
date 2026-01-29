import { BaseAISummaryProvider } from './base'
import { AISummaryResult, AuthHeaderType } from '../types'
import { getProviderEndpoint, PROVIDER_DEFAULTS } from '../../ai-providers/utils'

export class OpenAISummaryProvider extends BaseAISummaryProvider {
  name = 'OpenAI Summary'
  protected model = 'gpt-3.5-turbo'
  private baseUrl?: string
  private authType: AuthHeaderType = 'bearer'
  private customAuthHeader?: string

  constructor(apiKey?: string, model?: string, maxKeywords?: number, summaryLength?: 'short' | 'medium' | 'long', baseUrl?: string, authType?: AuthHeaderType, customAuthHeader?: string) {
    super(apiKey, model, maxKeywords, summaryLength)
    if (model) this.model = model
    if (baseUrl) this.baseUrl = baseUrl
    if (authType) this.authType = authType
    if (customAuthHeader) this.customAuthHeader = customAuthHeader
  }

  private getEndpoint(): string {
    return getProviderEndpoint(
      this.baseUrl,
      PROVIDER_DEFAULTS.openai.baseUrl,
      PROVIDER_DEFAULTS.openai.chatCompletionsPath
    )
  }

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (!this.apiKey) {
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
        } else {
          // Fallback to bearer if custom header not specified
          headers['Authorization'] = `Bearer ${this.apiKey}`
        }
        break
      default:
        headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    return headers
  }

  async generateSummary(content: string, language: string): Promise<AISummaryResult> {
    if (!this.isConfigured()) {
      throw this.createError('OpenAI API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)
    const cleanedContent = this.cleanContent(content)
    const languageName = this.getLanguageName(language)
    const summaryLengthPrompt = this.getSummaryLengthPrompt()

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.buildAuthHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are an expert content analyst and SEO specialist. Analyze the provided article content and generate:
1. An engaging, SEO-optimized title (max 60 characters)
2. A compelling summary (${summaryLengthPrompt})
3. SEO keywords (${this.maxKeywords} keywords/phrases, comma-separated)

Respond in ${languageName} language with the following JSON format:
{
  "title": "Generated title here",
  "summary": "Generated summary here",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Focus on:
- Main topics and key points
- Technical concepts and important terms
- Target audience interests
- Search engine optimization
- Readability and engagement`
            },
            {
              role: 'user',
              content: `Please analyze this article content and generate title, summary, and SEO keywords:\n\n${cleanedContent}`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'AI summary generation failed',
          error.error?.code || 'SUMMARY_ERROR'
        )
      }

      const data = await response.json()
      const resultText = data.choices[0].message.content.trim()

      // Parse JSON response
      let result: any
      try {
        result = JSON.parse(resultText)
      } catch (parseError) {
        // Fallback parsing if JSON is malformed
        const titleMatch = resultText.match(/"title":\s*"([^"]+)"/i)
        const summaryMatch = resultText.match(/"summary":\s*"([^"]+)"/i)
        const keywordsMatch = resultText.match(/"keywords":\s*\[(.*?)\]/i)
        
        result = {
          title: titleMatch ? titleMatch[1] : 'Generated Title',
          summary: summaryMatch ? summaryMatch[1] : 'Generated summary...',
          keywords: keywordsMatch ? 
            keywordsMatch[1].split(',').map((k: string) => k.trim().replace(/"/g, '')) : 
            ['keyword1', 'keyword2', 'keyword3']
        }
      }

      // Calculate usage stats
      const inputTokens = data.usage?.prompt_tokens || 0
      const outputTokens = data.usage?.completion_tokens || 0
      const totalTokens = data.usage?.total_tokens || inputTokens + outputTokens
      
      // Pricing as of 2024 (per 1K tokens)
      const pricing: Record<string, { input: number, output: number }> = {
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
      }
      
      const modelPricing = pricing[this.model] || pricing['gpt-3.5-turbo']
      const estimatedCost = (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output

      return {
        title: result.title || 'Generated Title',
        summary: result.summary || 'Generated summary...',
        keywords: Array.isArray(result.keywords) ? result.keywords : ['keyword1', 'keyword2'],
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
        `OpenAI AI summary error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async generateSEOKeywords(content: string, language: string): Promise<string[]> {
    const result = await this.generateSummary(content, language)
    return result.keywords
  }

  async generateTitle(content: string, language: string): Promise<string> {
    const result = await this.generateSummary(content, language)
    return result.title
  }

  getSupportedLanguages(): string[] {
    // OpenAI supports all major languages
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
}