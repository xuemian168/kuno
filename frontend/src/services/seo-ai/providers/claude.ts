import { BaseSEOAIProvider } from './base'
import {
  SEOGenerationResult,
  KeywordResult,
  SEOContent,
  SEOAnalysisResult,
  SEOTitleOptions,
  SEODescriptionOptions,
  KeywordOptions
} from '../types'
import { getClaudeEndpoint, PROVIDER_DEFAULTS } from '../../ai-providers/utils'

export class ClaudeSEOProvider extends BaseSEOAIProvider {
  name = 'Claude SEO'
  protected model = 'claude-3-5-sonnet-20241022'
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

  async generateSEOTitle(content: string, language: string, options: SEOTitleOptions = {}): Promise<SEOGenerationResult> {
    if (!this.isConfigured()) {
      throw this.createError('Claude API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)

    const {
      maxLength = 60,
      includeBrand = false,
      brandName = '',
      focus_keyword = '',
      tone = 'professional',
      target_audience = 'general'
    } = options

    const languageName = this.getLanguageName(language)

    const prompt = `Generate an SEO-optimized title in ${languageName} for the following content.

Requirements:
- Maximum ${maxLength} characters
- ${includeBrand && brandName ? `Include brand name: "${brandName}"` : 'No brand name required'}
- ${focus_keyword ? `Focus keyword: "${focus_keyword}"` : 'Extract natural keywords'}
- Tone: ${tone}
- Target audience: ${target_audience}
- Must be compelling and click-worthy
- Natural keyword integration

Content:
${content.substring(0, 1000)}

Respond with a JSON object:
{
  "content": "the SEO title",
  "confidence": 0.95,
  "alternatives": ["alternative 1", "alternative 2"],
  "suggestions": ["suggestion for improvement"]
}`

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Failed to generate SEO title',
          error.error?.type || 'API_ERROR'
        )
      }

      const data = await response.json()

      if (!data.content || data.content.length === 0) {
        throw this.createError('No response content', 'NO_CONTENT')
      }

      const result = JSON.parse(data.content[0].text)

      // Calculate usage
      const inputTokens = data.usage?.input_tokens || 0
      const outputTokens = data.usage?.output_tokens || 0
      const totalTokens = inputTokens + outputTokens

      const pricing: Record<string, { input: number, output: number }> = {
        'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
      }

      const modelPricing = pricing[this.model] || pricing['claude-3-5-sonnet-20241022']
      const estimatedCost = (inputTokens / 1000000) * modelPricing.input + (outputTokens / 1000000) * modelPricing.output

      return {
        content: result.content,
        confidence: result.confidence || 0.9,
        alternatives: result.alternatives || [],
        suggestions: result.suggestions || [],
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
        'SEO_TITLE_ERROR'
      )
    }
  }

  async generateSEODescription(content: string, language: string, options: SEODescriptionOptions = {}): Promise<SEOGenerationResult> {
    if (!this.isConfigured()) {
      throw this.createError('Claude API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)

    const {
      maxLength = 160,
      includeCallToAction = true,
      focus_keyword = '',
      tone = 'professional',
      target_audience = 'general'
    } = options

    const languageName = this.getLanguageName(language)

    const prompt = `Generate an SEO-optimized meta description in ${languageName} for the following content.

Requirements:
- Maximum ${maxLength} characters
- ${includeCallToAction ? 'Include compelling call-to-action' : 'No call-to-action required'}
- ${focus_keyword ? `Focus keyword: "${focus_keyword}"` : 'Extract natural keywords'}
- Tone: ${tone}
- Target audience: ${target_audience}
- Must entice clicks while accurately describing content

Content:
${content.substring(0, 1000)}

Respond with a JSON object:
{
  "content": "the SEO description",
  "confidence": 0.95,
  "alternatives": ["alternative 1", "alternative 2"],
  "suggestions": ["suggestion for improvement"]
}`

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Failed to generate SEO description',
          error.error?.type || 'API_ERROR'
        )
      }

      const data = await response.json()

      if (!data.content || data.content.length === 0) {
        throw this.createError('No response content', 'NO_CONTENT')
      }

      const result = JSON.parse(data.content[0].text)

      const inputTokens = data.usage?.input_tokens || 0
      const outputTokens = data.usage?.output_tokens || 0
      const totalTokens = inputTokens + outputTokens

      const pricing: Record<string, { input: number, output: number }> = {
        'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
      }

      const modelPricing = pricing[this.model] || pricing['claude-3-5-sonnet-20241022']
      const estimatedCost = (inputTokens / 1000000) * modelPricing.input + (outputTokens / 1000000) * modelPricing.output

      return {
        content: result.content,
        confidence: result.confidence || 0.9,
        alternatives: result.alternatives || [],
        suggestions: result.suggestions || [],
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
        'SEO_DESCRIPTION_ERROR'
      )
    }
  }

  async extractKeywords(content: string, language: string, options: KeywordOptions = {}): Promise<KeywordResult> {
    if (!this.isConfigured()) {
      throw this.createError('Claude API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)

    const {
      maxKeywords = 10,
      includeRelatad = true,
      focus_topics = [],
      difficulty_level = 'medium'
    } = options

    const languageName = this.getLanguageName(language)

    const prompt = `Extract SEO keywords from the following content in ${languageName}.

Requirements:
- Extract up to ${maxKeywords} keywords
- ${includeRelatad ? 'Include related keywords' : 'Main keywords only'}
- ${focus_topics.length > 0 ? `Focus on topics: ${focus_topics.join(', ')}` : 'All relevant topics'}
- Difficulty level: ${difficulty_level}

Content:
${content.substring(0, 2000)}

Respond with a JSON object:
{
  "primary_keywords": [{"keyword": "term", "relevance": 0.95, "frequency": 5}],
  "secondary_keywords": [{"keyword": "term", "relevance": 0.8, "frequency": 3}],
  "long_tail_keywords": [{"keyword": "long phrase", "relevance": 0.7, "frequency": 2}],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Failed to extract keywords',
          error.error?.type || 'API_ERROR'
        )
      }

      const data = await response.json()

      if (!data.content || data.content.length === 0) {
        throw this.createError('No response content', 'NO_CONTENT')
      }

      const result = JSON.parse(data.content[0].text)

      const inputTokens = data.usage?.input_tokens || 0
      const outputTokens = data.usage?.output_tokens || 0
      const totalTokens = inputTokens + outputTokens

      const pricing: Record<string, { input: number, output: number }> = {
        'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
      }

      const modelPricing = pricing[this.model] || pricing['claude-3-5-sonnet-20241022']
      const estimatedCost = (inputTokens / 1000000) * modelPricing.input + (outputTokens / 1000000) * modelPricing.output

      return {
        primary_keywords: result.primary_keywords || [],
        secondary_keywords: result.secondary_keywords || [],
        long_tail_keywords: result.long_tail_keywords || [],
        suggestions: result.suggestions || [],
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
        'KEYWORDS_ERROR'
      )
    }
  }

  async generateSEOSlug(title: string, language: string): Promise<string> {
    // Simple slug generation - no API call needed
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  async analyzeSEOContent(content: SEOContent, language: string): Promise<SEOAnalysisResult> {
    throw this.createError('SEO content analysis not yet implemented for Claude', 'NOT_IMPLEMENTED')
  }

  getSupportedLanguages(): string[] {
    return [
      'zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt',
      'it', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'sk', 'hu',
      'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'uk', 'be',
      'tr', 'he', 'fa', 'ur', 'hi', 'bn'
    ]
  }
}
