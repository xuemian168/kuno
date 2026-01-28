import { 
  SEOAIProvider, 
  SEOConfig, 
  SEOAIResult, 
  BatchSEORequest, 
  BatchSEOResult,
  SEOContent,
  SEOGenerationResult,
  KeywordResult,
  SEOAnalysisResult
} from './types'
import { OpenAISEOProvider } from './providers/openai'
import { aiUsageTracker } from '../ai-usage-tracker'

export * from './types'

// SEO AI usage tracking
export interface SEOAIUsageStats {
  totalOperations: number
  totalTokens: number
  totalCost: number
  currency: string
  sessionStats: {
    operations: number
    tokens: number
    cost: number
  }
}

export class SEOAIService {
  private providers: Map<string, SEOAIProvider> = new Map()
  private activeProvider?: SEOAIProvider
  private usageStats: SEOAIUsageStats = {
    totalOperations: 0,
    totalTokens: 0,
    totalCost: 0,
    currency: 'USD',
    sessionStats: {
      operations: 0,
      tokens: 0,
      cost: 0
    }
  }

  registerProvider(name: string, provider: SEOAIProvider): void {
    this.providers.set(name, provider)
  }

  setActiveProvider(name: string): void {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`SEO AI provider '${name}' not found`)
    }
    this.activeProvider = provider
  }

  getActiveProvider(): SEOAIProvider | undefined {
    return this.activeProvider
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  isConfigured(): boolean {
    return this.activeProvider?.isConfigured() || false
  }

  /**
   * Generate complete SEO optimization for content
   */
  async generateCompleteSEO(content: SEOContent, language: string, options?: {
    include_title?: boolean
    include_description?: boolean
    include_keywords?: boolean
    include_analysis?: boolean
    title_options?: any
    description_options?: any
    keyword_options?: any
  }): Promise<SEOAIResult> {
    if (!this.activeProvider) {
      throw new Error('No active SEO AI provider configured')
    }

    const {
      include_title = true,
      include_description = true,
      include_keywords = true,
      include_analysis = true,
      title_options = {},
      description_options = {},
      keyword_options = {}
    } = options || {}

    const startTime = Date.now()
    const totalUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      currency: 'USD'
    }

    try {
      let seo_title = content.meta_title || content.title
      let seo_description = content.meta_description || content.description || ''
      let keywords: string[] = []
      let analysis: SEOAnalysisResult | null = null

      // Generate SEO title
      if (include_title) {
        const titleResult = await this.activeProvider.generateSEOTitle(
          content.content, 
          language, 
          { ...title_options, focus_keyword: content.keywords }
        )
        seo_title = titleResult.content
        if (titleResult.usage) {
          this.addUsage(totalUsage, titleResult.usage)
        }
      }

      // Generate SEO description
      if (include_description) {
        const descResult = await this.activeProvider.generateSEODescription(
          content.content, 
          language,
          { ...description_options, focus_keyword: content.keywords }
        )
        seo_description = descResult.content
        if (descResult.usage) {
          this.addUsage(totalUsage, descResult.usage)
        }
      }

      // Extract keywords
      if (include_keywords) {
        const keywordResult = await this.activeProvider.extractKeywords(
          content.content,
          language,
          keyword_options
        )
        keywords = [
          ...keywordResult.primary_keywords.map(k => k.keyword),
          ...keywordResult.secondary_keywords.map(k => k.keyword)
        ]
        if (keywordResult.usage) {
          this.addUsage(totalUsage, keywordResult.usage)
        }
      }

      // Generate SEO slug
      const slug = await this.activeProvider.generateSEOSlug(seo_title, language)

      // Analyze SEO content
      if (include_analysis) {
        analysis = await this.activeProvider.analyzeSEOContent({
          ...content,
          meta_title: seo_title,
          meta_description: seo_description,
          keywords: keywords.join(', ')
        }, language)
      }

      // Update usage statistics
      this.updateUsageStats(totalUsage)

      // Track usage with detailed metrics
      const responseTime = Date.now() - startTime
      await this.trackSEOUsage({
        operation: 'generate_complete_seo',
        language,
        inputLength: content.content.length,
        outputLength: seo_title.length + seo_description.length,
        ...totalUsage,
        success: true,
        responseTime
      })

      const result: SEOAIResult = {
        seo_title,
        seo_description,
        keywords,
        slug,
        analysis: analysis || this.getDefaultAnalysis(),
        confidence: 0.85,
        total_usage: totalUsage
      }

      return result

    } catch (error) {
      // Track failed usage
      const responseTime = Date.now() - startTime
      await this.trackSEOUsage({
        operation: 'generate_complete_seo',
        language,
        inputLength: content.content.length,
        outputLength: 0,
        ...totalUsage,
        success: false,
        responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  }

  /**
   * Generate SEO title only
   */
  async generateSEOTitle(content: string, language: string, options?: any): Promise<SEOGenerationResult> {
    if (!this.activeProvider) {
      throw new Error('No active SEO AI provider configured')
    }

    const result = await this.activeProvider.generateSEOTitle(content, language, options)
    
    if (result.usage) {
      this.updateUsageStats(result.usage)
      await this.trackSEOUsage({
        operation: 'generate_seo_title',
        language,
        inputLength: content.length,
        outputLength: result.content.length,
        ...result.usage,
        success: true,
        responseTime: 0
      })
    }

    return result
  }

  /**
   * Generate SEO description only
   */
  async generateSEODescription(content: string, language: string, options?: any): Promise<SEOGenerationResult> {
    if (!this.activeProvider) {
      throw new Error('No active SEO AI provider configured')
    }

    const result = await this.activeProvider.generateSEODescription(content, language, options)
    
    if (result.usage) {
      this.updateUsageStats(result.usage)
      await this.trackSEOUsage({
        operation: 'generate_seo_description',
        language,
        inputLength: content.length,
        outputLength: result.content.length,
        ...result.usage,
        success: true,
        responseTime: 0
      })
    }

    return result
  }

  /**
   * Extract keywords only
   */
  async extractKeywords(content: string, language: string, options?: any): Promise<KeywordResult> {
    if (!this.activeProvider) {
      throw new Error('No active SEO AI provider configured')
    }

    const result = await this.activeProvider.extractKeywords(content, language, options)
    
    if (result.usage) {
      this.updateUsageStats(result.usage)
      await this.trackSEOUsage({
        operation: 'extract_keywords',
        language,
        inputLength: content.length,
        outputLength: result.primary_keywords.length + result.secondary_keywords.length,
        ...result.usage,
        success: true,
        responseTime: 0
      })
    }

    return result
  }

  /**
   * Analyze SEO content
   */
  async analyzeSEOContent(content: SEOContent, language: string): Promise<SEOAnalysisResult> {
    if (!this.activeProvider) {
      throw new Error('No active SEO AI provider configured')
    }

    return await this.activeProvider.analyzeSEOContent(content, language)
  }

  /**
   * Batch process multiple articles
   */
  async batchProcessSEO(request: BatchSEORequest): Promise<BatchSEOResult> {
    if (!this.activeProvider) {
      throw new Error('No active SEO AI provider configured')
    }

    const results: BatchSEOResult['results'] = []
    let totalCost = 0
    let successful = 0
    let failed = 0

    for (const article of request.articles) {
      try {
        const seoResult = await this.generateCompleteSEO({
          title: article.title,
          content: article.content,
          description: article.summary
        }, article.language, request.options)

        results.push({
          article_id: article.id,
          success: true,
          seo_data: seoResult
        })

        totalCost += seoResult.total_usage?.estimatedCost || 0
        successful++

      } catch (error) {
        results.push({
          article_id: article.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failed++
      }
    }

    return {
      results,
      summary: {
        total: request.articles.length,
        successful,
        failed,
        total_cost: totalCost,
        currency: 'USD'
      }
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): SEOAIUsageStats {
    return { ...this.usageStats }
  }

  /**
   * Reset session statistics
   */
  resetSessionStats(): void {
    this.usageStats.sessionStats = {
      operations: 0,
      tokens: 0,
      cost: 0
    }
  }

  private addUsage(total: any, usage: any): void {
    total.inputTokens += usage.inputTokens || 0
    total.outputTokens += usage.outputTokens || 0
    total.totalTokens += usage.totalTokens || 0
    total.estimatedCost += usage.estimatedCost || 0
  }

  private updateUsageStats(usage: any): void {
    this.usageStats.totalOperations++
    this.usageStats.totalTokens += usage.totalTokens || 0
    this.usageStats.totalCost += usage.estimatedCost || 0
    
    this.usageStats.sessionStats.operations++
    this.usageStats.sessionStats.tokens += usage.totalTokens || 0
    this.usageStats.sessionStats.cost += usage.estimatedCost || 0
  }

  private async trackSEOUsage(usage: any): Promise<void> {
    try {
      await aiUsageTracker.trackUsage({
        serviceType: 'seo',
        provider: this.activeProvider?.name || 'unknown',
        operation: usage.operation,
        language: usage.language,
        inputLength: usage.inputLength,
        outputLength: usage.outputLength,
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: usage.totalTokens || 0,
        estimatedCost: usage.estimatedCost || 0,
        currency: usage.currency || 'USD',
        success: usage.success,
        responseTime: usage.responseTime || 0,
        errorMessage: usage.errorMessage
      })
    } catch (error) {
      console.error('Failed to track SEO usage:', error)
    }
  }

  private getDefaultAnalysis(): SEOAnalysisResult {
    return {
      overall_score: 0,
      title_analysis: {
        score: 0, length: 0, optimal_length: { min: 30, max: 60 },
        has_focus_keyword: false, brand_included: false, uniqueness: 0,
        issues: [], suggestions: []
      },
      description_analysis: {
        score: 0, length: 0, optimal_length: { min: 120, max: 160 },
        has_focus_keyword: false, has_call_to_action: false, uniqueness: 0,
        issues: [], suggestions: []
      },
      content_analysis: {
        score: 0, word_count: 0, paragraph_count: 0,
        heading_structure: { h1_count: 0, h2_count: 0, h3_count: 0, structure_score: 0, has_keyword_in_headings: false, issues: [] },
        keyword_density: [], internal_links: 0, external_links: 0,
        image_optimization: { total_images: 0, images_with_alt: 0, images_with_title: 0, optimized_images: 0, score: 0, issues: [] },
        issues: [], suggestions: []
      },
      keyword_analysis: {
        score: 0, focus_keyword_usage: 0, keyword_distribution: [], keyword_density: 0,
        optimal_density: { min: 0.5, max: 2.5 }, related_keywords_found: 0, issues: [], suggestions: []
      },
      readability_analysis: {
        score: 0, reading_level: '', avg_sentence_length: 0, avg_paragraph_length: 0,
        passive_voice_percentage: 0, transition_words_percentage: 0, issues: [], suggestions: []
      },
      suggestions: []
    }
  }
}

// Initialize SEO AI service
export const seoAIService = new SEOAIService()

// Register OpenAI provider by default
seoAIService.registerProvider('openai', new OpenAISEOProvider())

/**
 * Initialize SEO AI service with configuration
 */
export async function initializeSEOAIService(config?: SEOConfig): Promise<void> {
  if (!config) return

  try {
    const { provider, apiKey, model, baseUrl } = config

    switch (provider) {
      case 'openai':
        const openaiProvider = new OpenAISEOProvider(apiKey, model, baseUrl)
        seoAIService.registerProvider('openai', openaiProvider)
        seoAIService.setActiveProvider('openai')
        break

      // Add other providers as needed
      // case 'gemini':
      //   const geminiProvider = new GeminiSEOProvider(apiKey, model, baseUrl)
      //   seoAIService.registerProvider('gemini', geminiProvider)
      //   seoAIService.setActiveProvider('gemini')
      //   break

      default:
        console.warn(`Unsupported SEO AI provider: ${provider}`)
    }
  } catch (error) {
    console.error('Failed to initialize SEO AI service:', error)
  }
}