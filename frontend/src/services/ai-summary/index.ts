import { AISummaryProvider, AISummaryConfig, AISummaryResult, ArticleContent } from './types'
import { OpenAISummaryProvider } from './providers/openai'
import { GeminiSummaryProvider } from './providers/gemini'
import { aiUsageTracker, trackSummaryGeneration, trackSEOGeneration } from '../ai-usage-tracker'

export * from './types'

// AI Summary usage tracking
export interface AISummaryUsageStats {
  totalSummaries: number
  totalTokens: number
  totalCost: number
  currency: string
  sessionStats: {
    summaries: number
    tokens: number
    cost: number
  }
}

export class AISummaryService {
  private providers: Map<string, AISummaryProvider> = new Map()
  private activeProvider?: AISummaryProvider
  private usageStats: AISummaryUsageStats = {
    totalSummaries: 0,
    totalTokens: 0,
    totalCost: 0,
    currency: 'USD',
    sessionStats: {
      summaries: 0,
      tokens: 0,
      cost: 0
    }
  }

  registerProvider(name: string, provider: AISummaryProvider): void {
    this.providers.set(name, provider)
  }

  setActiveProvider(name: string): void {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`AI summary provider '${name}' not found`)
    }
    this.activeProvider = provider
  }

  getActiveProvider(): AISummaryProvider | undefined {
    return this.activeProvider
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  isConfigured(): boolean {
    return !!this.activeProvider && this.activeProvider.isConfigured()
  }

  getUsageStats(): AISummaryUsageStats {
    return { ...this.usageStats }
  }

  resetSessionStats(): void {
    this.usageStats.sessionStats = {
      summaries: 0,
      tokens: 0,
      cost: 0
    }
  }

  private updateUsageStats(usage: AISummaryUsageStats['sessionStats']): void {
    this.usageStats.totalSummaries += usage.summaries
    this.usageStats.totalTokens += usage.tokens
    this.usageStats.totalCost += usage.cost
    this.usageStats.sessionStats.summaries += usage.summaries
    this.usageStats.sessionStats.tokens += usage.tokens
    this.usageStats.sessionStats.cost += usage.cost
  }

  async generateSummary(articleContent: ArticleContent): Promise<AISummaryResult> {
    if (!this.activeProvider) {
      throw new Error('No active AI summary provider')
    }

    if (!this.activeProvider.isConfigured()) {
      throw new Error(`AI summary provider '${this.activeProvider.name}' is not configured`)
    }

    const providerName = this.activeProvider.name.toLowerCase().includes('openai') ? 'openai' : 'gemini'
    const model = (this.activeProvider as any).model || 'unknown'
    
    try {
      const result = await trackSummaryGeneration(
        () => this.activeProvider!.generateSummary(
          articleContent.content,
          articleContent.language
        ),
        providerName,
        model,
        articleContent.language,
        articleContent.content.length,
        undefined // articleId not available in ArticleContent interface
      )

      // Update local usage stats if available
      if (result.usage) {
        this.updateUsageStats({
          summaries: 1,
          tokens: result.usage.totalTokens || 0,
          cost: result.usage.estimatedCost || 0
        })

        // Track additional usage details
        await aiUsageTracker.trackUsage({
          serviceType: 'summary',
          provider: providerName,
          model: model,
          operation: 'generate_summary',
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          estimatedCost: result.usage.estimatedCost,
          currency: result.usage.currency || 'USD',
          language: articleContent.language,
          inputLength: articleContent.content.length,
          outputLength: (result.title + result.summary + result.keywords.join(',')).length,
          success: true,
          articleId: undefined // articleId not available in ArticleContent interface
        })
      }

      return result
    } catch (error) {
      console.error('AI summary generation failed:', error)
      throw error
    }
  }

  async generateSEOKeywords(content: string, language: string): Promise<string[]> {
    if (!this.activeProvider) {
      throw new Error('No active AI summary provider')
    }

    if (!this.activeProvider.isConfigured()) {
      throw new Error(`AI summary provider '${this.activeProvider.name}' is not configured`)
    }

    const providerName = this.activeProvider.name.toLowerCase().includes('openai') ? 'openai' : 'gemini'
    
    return await trackSEOGeneration(
      () => this.activeProvider!.generateSEOKeywords(content, language),
      providerName,
      'keywords',
      language,
      content.length
    )
  }

  async generateTitle(content: string, language: string): Promise<string> {
    if (!this.activeProvider) {
      throw new Error('No active AI summary provider')
    }

    if (!this.activeProvider.isConfigured()) {
      throw new Error(`AI summary provider '${this.activeProvider.name}' is not configured`)
    }

    const providerName = this.activeProvider.name.toLowerCase().includes('openai') ? 'openai' : 'gemini'
    
    return await trackSEOGeneration(
      () => this.activeProvider!.generateTitle(content, language),
      providerName,
      'title',
      language,
      content.length
    )
  }

  configureFromSettings(config: AISummaryConfig): void {
    let provider: AISummaryProvider

    switch (config.provider) {
      case 'openai':
        provider = new OpenAISummaryProvider(
          config.apiKey, 
          config.model,
          config.maxKeywords,
          config.summaryLength
        )
        break
      case 'gemini':
        provider = new GeminiSummaryProvider(
          config.apiKey, 
          config.model,
          config.maxKeywords,
          config.summaryLength
        )
        break
      default:
        throw new Error(`Unsupported AI summary provider: ${config.provider}`)
    }

    this.registerProvider(config.provider, provider)
    this.setActiveProvider(config.provider)
  }
}

// Create a singleton instance
export const aiSummaryService = new AISummaryService()

// Helper function to initialize AI summary service from localStorage
export function initializeAISummaryService(): void {
  try {
    const settingsStr = localStorage.getItem('blog_settings')
    let settings = null
    
    if (settingsStr) {
      settings = JSON.parse(settingsStr)
    }
    
    // Check if AI summary settings exist
    if (settings?.aiSummary) {
      try {
        aiSummaryService.configureFromSettings(settings.aiSummary)
      } catch (error) {
        console.error('Failed to configure AI summary service:', error)
      }
    }
  } catch (error) {
    console.error('Failed to initialize AI summary service:', error)
  }
}