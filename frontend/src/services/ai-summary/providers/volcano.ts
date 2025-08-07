import { BaseAISummaryProvider } from './base'
import { AISummaryResult } from '../types'

export class VolcanoSummaryProvider extends BaseAISummaryProvider {
  name = 'Volcano Engine'
  private endpoint = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
  
  constructor(apiKey?: string, model?: string, maxKeywords?: number, summaryLength?: 'short' | 'medium' | 'long') {
    super(apiKey, model || 'doubao-seed-1-6-250615', maxKeywords, summaryLength)
  }

  async generateSummary(content: string, language: string): Promise<AISummaryResult> {
    if (!this.isConfigured()) {
      throw this.createError('Volcano Engine API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)
    const cleanedContent = this.cleanContent(content)
    const lengthPrompt = this.getSummaryLengthPrompt()
    const languageName = this.getLanguageName(language)

    const systemPrompt = `You are a professional content analyst. Generate a comprehensive analysis of the given article in ${languageName}. Respond with a JSON object containing:
- "title": A compelling title for the article (max 60 characters)
- "summary": A ${lengthPrompt} summary capturing the main points
- "keywords": An array of ${this.maxKeywords} relevant SEO keywords`

    const userPrompt = `Analyze this article content:\n\n${cleanedContent}`

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
          stream: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw this.createError(
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR'
        )
      }

      const data = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw this.createError('No response generated', 'NO_RESULT')
      }

      const content = data.choices[0].message?.content
      if (!content) {
        throw this.createError('Empty response content', 'EMPTY_RESPONSE')
      }

      let analysisResult
      try {
        analysisResult = JSON.parse(content)
      } catch (parseError) {
        // Fallback: extract information from plain text response
        const lines = content.split('\n').filter((line: string) => line.trim())
        analysisResult = {
          title: lines.find((line: string) => line.includes('标题') || line.includes('Title'))?.split(':')[1]?.trim() || 'Generated Title',
          summary: lines.find((line: string) => line.includes('摘要') || line.includes('Summary'))?.split(':')[1]?.trim() || content.slice(0, 200),
          keywords: ['article', 'content', 'analysis']
        }
      }

      const usage = data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        estimatedCost: this.estimateCost(data.usage.total_tokens),
        currency: 'USD'
      } : undefined

      return {
        title: analysisResult.title || 'Generated Title',
        summary: analysisResult.summary || 'Generated summary',
        keywords: Array.isArray(analysisResult.keywords) ? analysisResult.keywords : [],
        usage
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Volcano Engine error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async generateSEOKeywords(content: string, language: string): Promise<string[]> {
    if (!this.isConfigured()) {
      throw this.createError('Volcano Engine API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)
    const cleanedContent = this.cleanContent(content)
    const languageName = this.getLanguageName(language)

    const systemPrompt = `You are an SEO expert. Generate ${this.maxKeywords} relevant SEO keywords for the given content in ${languageName}. Return only a JSON array of keywords.`

    const userPrompt = `Generate SEO keywords for this content:\n\n${cleanedContent}`

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.5,
          max_tokens: 500,
          stream: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw this.createError(
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR'
        )
      }

      const data = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw this.createError('No response generated', 'NO_RESULT')
      }

      const content = data.choices[0].message?.content
      if (!content) {
        throw this.createError('Empty response content', 'EMPTY_RESPONSE')
      }

      // Log usage statistics for monitoring
      if (data.usage) {
        console.log('Volcano SEO Keywords Usage:', {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
          estimatedCost: this.estimateCost(data.usage.total_tokens),
          model: data.model || this.model,
          inputLength: cleanedContent.length,
          outputLength: content.length
        })
      }

      try {
        const keywords = JSON.parse(content)
        return Array.isArray(keywords) ? keywords.slice(0, this.maxKeywords) : []
      } catch (parseError) {
        // Fallback: extract keywords from plain text
        const lines = content.split('\n')
        const keywords = lines
          .filter((line: string) => line.trim() && !line.includes('关键词') && !line.includes('Keywords'))
          .map((line: string) => line.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '').trim())
          .filter((keyword: string) => keyword.length > 0)
          .slice(0, this.maxKeywords)
        
        return keywords.length > 0 ? keywords : ['article', 'content']
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Volcano Engine error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async generateTitle(content: string, language: string): Promise<string> {
    if (!this.isConfigured()) {
      throw this.createError('Volcano Engine API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)
    const cleanedContent = this.cleanContent(content)
    const languageName = this.getLanguageName(language)

    const systemPrompt = `You are a professional content editor. Generate a compelling, SEO-friendly title for the given content in ${languageName}. The title should be concise (max 60 characters), engaging, and accurately reflect the main topic. Return only the title text.`

    const userPrompt = `Generate a title for this content:\n\n${cleanedContent.slice(0, 1000)}...`

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.8,
          max_tokens: 100,
          stream: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw this.createError(
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR'
        )
      }

      const data = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw this.createError('No response generated', 'NO_RESULT')
      }

      const title = data.choices[0].message?.content?.trim()
      if (!title) {
        throw this.createError('Empty title generated', 'EMPTY_RESPONSE')
      }

      // Log usage statistics for monitoring
      if (data.usage) {
        console.log('Volcano Title Generation Usage:', {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
          estimatedCost: this.estimateCost(data.usage.total_tokens),
          model: data.model || this.model,
          inputLength: cleanedContent.length,
          outputLength: title.length
        })
      }

      // Clean up the title (remove quotes if present)
      return title.replace(/^["']|["']$/g, '').slice(0, 60)
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Volcano Engine error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  getSupportedLanguages(): string[] {
    return [
      'zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt',
      'it', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'sk', 'hu',
      'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'uk', 'be',
      'tr', 'he', 'fa', 'ur', 'hi', 'bn', 'ta', 'te', 'vi', 'th',
      'id', 'ms', 'tl'
    ]
  }

  private estimateCost(totalTokens: number): number {
    // Volcano Engine pricing estimation (approximate)
    // This is an estimate - actual pricing may vary
    const costPerThousandTokens = 0.002 // $0.002 per 1K tokens (estimate)
    return (totalTokens / 1000) * costPerThousandTokens
  }
}