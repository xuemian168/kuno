import { apiClient } from '../lib/api'

export interface AIUsageMetrics {
  serviceType: 'summary' | 'translation' | 'seo'
  provider: string
  model?: string
  operation: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  estimatedCost?: number
  currency?: string
  language?: string
  inputLength?: number
  outputLength?: number
  responseTime?: number // milliseconds
  success: boolean
  errorMessage?: string
  articleId?: number
}

export interface AIUsageStats {
  serviceType: string
  provider: string
  totalRequests: number
  successRequests: number
  totalTokens: number
  totalCost: number
  currency: string
  avgResponseTime: number
}

export interface DailyUsageStats {
  date: string
  totalRequests: number
  successRequests: number
  totalTokens: number
  totalCost: number
  avgResponseTime: number
}

export interface CostLimits {
  dailyLimit: number
  monthlyLimit: number
}

export interface CostSummary {
  dailyLimit: number
  monthlyLimit: number
  summary: {
    daily: {
      cost: number
      limit: number
      percentage: number
      remaining: number
    }
    monthly: {
      cost: number
      limit: number
      percentage: number
      remaining: number
    }
  }
}

export class AIUsageTracker {
  private static instance: AIUsageTracker
  private trackingEnabled: boolean = true

  private constructor() {}

  static getInstance(): AIUsageTracker {
    if (!AIUsageTracker.instance) {
      AIUsageTracker.instance = new AIUsageTracker()
    }
    return AIUsageTracker.instance
  }

  setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled
  }

  async trackUsage(metrics: AIUsageMetrics): Promise<void> {
    if (!this.trackingEnabled) {
      return
    }

    try {
      // Convert camelCase to snake_case for backend API
      const payload = {
        service_type: metrics.serviceType,
        provider: metrics.provider,
        model: metrics.model,
        operation: metrics.operation,
        input_tokens: metrics.inputTokens || 0,
        output_tokens: metrics.outputTokens || 0,
        total_tokens: metrics.totalTokens || 0,
        estimated_cost: metrics.estimatedCost || 0,
        currency: metrics.currency || 'USD',
        language: metrics.language,
        input_length: metrics.inputLength || 0,
        output_length: metrics.outputLength || 0,
        response_time: metrics.responseTime || 0,
        success: metrics.success,
        error_message: metrics.errorMessage || '',
        article_id: metrics.articleId
      }

      await apiClient.request('/ai-usage/track', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    } catch (error) {
      console.error('Failed to track AI usage:', error)
      // Don't throw error to avoid breaking the main flow
    }
  }

  async getUsageStats(
    serviceType?: string, 
    provider?: string, 
    days: number = 30
  ): Promise<AIUsageStats[]> {
    try {
      const params = new URLSearchParams()
      if (serviceType) params.append('service_type', serviceType)
      if (provider) params.append('provider', provider)
      params.append('days', days.toString())

      const response = await apiClient.request<{ 
        stats: Array<{
          service_type: string
          provider: string
          total_requests: number
          success_requests: number
          total_tokens: number
          total_cost: number
          currency: string
          avg_response_time: number
        }>
      }>(`/ai-usage/stats?${params.toString()}`)
      
      // Convert snake_case to camelCase
      const convertedStats: AIUsageStats[] = response.stats.map(stat => ({
        serviceType: stat.service_type,
        provider: stat.provider,
        totalRequests: stat.total_requests,
        successRequests: stat.success_requests,
        totalTokens: stat.total_tokens,
        totalCost: stat.total_cost,
        currency: stat.currency,
        avgResponseTime: stat.avg_response_time
      }))
      
      return convertedStats
    } catch (error) {
      console.error('Failed to get usage stats:', error)
      throw error
    }
  }

  async getTotalCost(days: number = 30): Promise<{ totalCost: number; currency: string; periodDays: number }> {
    try {
      const response = await apiClient.request<{ total_cost: number; currency: string; period_days: number }>(`/ai-usage/cost?days=${days}`)
      return {
        totalCost: response.total_cost,
        currency: response.currency,
        periodDays: response.period_days
      }
    } catch (error) {
      console.error('Failed to get total cost:', error)
      throw error
    }
  }

  async getRecentUsage(limit: number = 50): Promise<any[]> {
    try {
      const response = await apiClient.request<{ records: any[] }>(`/ai-usage/recent?limit=${limit}`)
      return response.records
    } catch (error) {
      console.error('Failed to get recent usage:', error)
      throw error
    }
  }

  async getDailyUsage(days: number = 30): Promise<Record<string, DailyUsageStats>> {
    try {
      const response = await apiClient.request<{ daily_stats: Record<string, DailyUsageStats> }>(`/ai-usage/daily?days=${days}`)
      return response.daily_stats
    } catch (error) {
      console.error('Failed to get daily usage:', error)
      throw error
    }
  }

  async getUsageByArticle(articleId: number): Promise<any[]> {
    try {
      const response = await apiClient.request<{ records: any[] }>(`/ai-usage/article/${articleId}`)
      return response.records
    } catch (error) {
      console.error('Failed to get article usage:', error)
      throw error
    }
  }

  async getCostLimits(): Promise<CostSummary> {
    try {
      const response = await apiClient.request<{
        daily_limit: number
        monthly_limit: number
        summary: {
          daily: {
            cost: number
            limit: number
            percentage: number
            remaining: number
          }
          monthly: {
            cost: number
            limit: number
            percentage: number
            remaining: number
          }
        }
      }>('/ai-usage/cost-limits')
      
      return {
        dailyLimit: response.daily_limit,
        monthlyLimit: response.monthly_limit,
        summary: response.summary
      }
    } catch (error) {
      console.error('Failed to get cost limits:', error)
      throw error
    }
  }

  async setCostLimits(dailyLimit: number, monthlyLimit: number): Promise<void> {
    try {
      await apiClient.request('/ai-usage/cost-limits', {
        method: 'PUT',
        body: JSON.stringify({
          daily_limit: dailyLimit,
          monthly_limit: monthlyLimit
        })
      })
    } catch (error) {
      console.error('Failed to set cost limits:', error)
      throw error
    }
  }

  // Helper method to wrap AI operations with automatic tracking
  async trackOperation<T>(
    operation: () => Promise<T>,
    baseMetrics: Omit<AIUsageMetrics, 'success' | 'responseTime'>
  ): Promise<T> {
    const startTime = Date.now()
    let success = false
    let errorMessage: string | undefined
    let result: T

    try {
      result = await operation()
      success = true
      return result
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw error
    } finally {
      const responseTime = Date.now() - startTime
      
      await this.trackUsage({
        ...baseMetrics,
        success,
        responseTime,
        errorMessage
      })
    }
  }
}

// Export singleton instance
export const aiUsageTracker = AIUsageTracker.getInstance()

// Helper functions for different AI operations
export async function trackSummaryGeneration<T>(
  operation: () => Promise<T>,
  provider: string,
  model: string,
  language: string,
  inputLength: number,
  articleId?: number
): Promise<T> {
  return aiUsageTracker.trackOperation(operation, {
    serviceType: 'summary',
    provider,
    model,
    operation: 'generate_summary',
    language,
    inputLength,
    articleId
  })
}

export async function trackTranslation<T>(
  operation: () => Promise<T>,
  provider: string,
  fromLanguage: string,
  toLanguage: string,
  inputLength: number,
  articleId?: number
): Promise<T> {
  return aiUsageTracker.trackOperation(operation, {
    serviceType: 'translation',
    provider,
    operation: 'translate_text',
    language: `${fromLanguage}->${toLanguage}`,
    inputLength,
    articleId
  })
}

export async function trackSEOGeneration<T>(
  operation: () => Promise<T>,
  provider: string,
  operationType: 'keywords' | 'title' | 'description',
  language: string,
  inputLength: number,
  articleId?: number
): Promise<T> {
  return aiUsageTracker.trackOperation(operation, {
    serviceType: 'seo',
    provider,
    operation: `generate_${operationType}`,
    language,
    inputLength,
    articleId
  })
}