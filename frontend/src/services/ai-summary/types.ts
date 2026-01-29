export interface AISummaryProvider {
  name: string
  generateSummary(content: string, language: string): Promise<AISummaryResult>
  generateSEOKeywords(content: string, language: string): Promise<string[]>
  generateTitle(content: string, language: string): Promise<string>
  isConfigured(): boolean
  getSupportedLanguages(): string[]
}

export interface AISummaryResult {
  title: string
  summary: string
  keywords: string[]
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    estimatedCost?: number
    currency?: string
  }
}

export type AuthHeaderType = 'bearer' | 'x-api-key' | 'x-goog-api-key' | 'api-key' | 'custom'

export interface AISummaryConfig {
  provider: 'openai' | 'gemini' | 'volcano' | 'claude'
  apiKey?: string
  model?: string
  baseUrl?: string  // Custom base URL for API endpoint
  maxKeywords?: number
  summaryLength?: 'short' | 'medium' | 'long'
  authType?: AuthHeaderType // API authentication method (default: bearer)
  customAuthHeader?: string // Custom header name when authType is 'custom'
}

export interface ArticleContent {
  content: string
  existingTitle?: string
  existingSummary?: string
  language: string
}