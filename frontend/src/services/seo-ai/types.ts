// SEO AI service types and interfaces

export interface SEOAIProvider {
  name: string
  generateSEOTitle(content: string, language: string, options?: SEOTitleOptions): Promise<SEOGenerationResult>
  generateSEODescription(content: string, language: string, options?: SEODescriptionOptions): Promise<SEOGenerationResult>
  extractKeywords(content: string, language: string, options?: KeywordOptions): Promise<KeywordResult>
  generateSEOSlug(title: string, language: string): Promise<string>
  analyzeSEOContent(content: SEOContent, language: string): Promise<SEOAnalysisResult>
  isConfigured(): boolean
  getSupportedLanguages(): string[]
}

export interface SEOTitleOptions {
  maxLength?: number
  includeBrand?: boolean
  brandName?: string
  focus_keyword?: string
  tone?: 'professional' | 'casual' | 'technical' | 'friendly'
  target_audience?: string
}

export interface SEODescriptionOptions {
  maxLength?: number
  includeCallToAction?: boolean
  focus_keyword?: string
  tone?: 'professional' | 'casual' | 'technical' | 'friendly'
  target_audience?: string
}

export interface KeywordOptions {
  maxKeywords?: number
  includeRelatad?: boolean
  focus_topics?: string[]
  difficulty_level?: 'easy' | 'medium' | 'hard'
}

export interface SEOGenerationResult {
  content: string
  confidence: number
  alternatives?: string[]
  suggestions?: string[]
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCost: number
    currency: string
  }
}

export interface KeywordResult {
  primary_keywords: KeywordItem[]
  secondary_keywords: KeywordItem[]
  long_tail_keywords: KeywordItem[]
  suggestions: string[]
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCost: number
    currency: string
  }
}

export interface KeywordItem {
  keyword: string
  relevance: number
  frequency: number
  difficulty?: 'easy' | 'medium' | 'hard'
  search_volume?: 'low' | 'medium' | 'high'
}

export interface SEOContent {
  title: string
  content: string
  description?: string
  keywords?: string
  slug?: string
  meta_title?: string
  meta_description?: string
}

export interface SEOAnalysisResult {
  overall_score: number
  title_analysis: SEOTitleAnalysis
  description_analysis: SEODescriptionAnalysis
  content_analysis: SEOContentAnalysis
  keyword_analysis: SEOKeywordAnalysis
  readability_analysis: ReadabilityAnalysis
  suggestions: SEOSuggestion[]
}

export interface SEOTitleAnalysis {
  score: number
  length: number
  optimal_length: { min: number; max: number }
  has_focus_keyword: boolean
  brand_included: boolean
  uniqueness: number
  issues: string[]
  suggestions: string[]
}

export interface SEODescriptionAnalysis {
  score: number
  length: number
  optimal_length: { min: number; max: number }
  has_focus_keyword: boolean
  has_call_to_action: boolean
  uniqueness: number
  issues: string[]
  suggestions: string[]
}

export interface SEOContentAnalysis {
  score: number
  word_count: number
  paragraph_count: number
  heading_structure: HeadingAnalysis
  keyword_density: KeywordDensity[]
  internal_links: number
  external_links: number
  image_optimization: ImageSEOAnalysis
  issues: string[]
  suggestions: string[]
}

export interface SEOKeywordAnalysis {
  score: number
  focus_keyword_usage: number
  keyword_distribution: KeywordDistribution[]
  keyword_density: number
  optimal_density: { min: number; max: number }
  related_keywords_found: number
  issues: string[]
  suggestions: string[]
}

export interface ReadabilityAnalysis {
  score: number
  reading_level: string
  avg_sentence_length: number
  avg_paragraph_length: number
  passive_voice_percentage: number
  transition_words_percentage: number
  issues: string[]
  suggestions: string[]
}

export interface HeadingAnalysis {
  h1_count: number
  h2_count: number
  h3_count: number
  structure_score: number
  has_keyword_in_headings: boolean
  issues: string[]
}

export interface KeywordDensity {
  keyword: string
  count: number
  density: number
  optimal: boolean
}

export interface KeywordDistribution {
  keyword: string
  title: boolean
  description: boolean
  h1: boolean
  h2: boolean
  content: boolean
  first_paragraph: boolean
  last_paragraph: boolean
}

export interface ImageSEOAnalysis {
  total_images: number
  images_with_alt: number
  images_with_title: number
  optimized_images: number
  score: number
  issues: string[]
}

export interface SEOSuggestion {
  type: 'title' | 'description' | 'content' | 'keywords' | 'technical' | 'readability' | 'performance' | 'overall'
  priority: 'high' | 'medium' | 'low'
  message: string
  suggestion: string
  impact: string
}

export type AuthHeaderType = 'bearer' | 'x-api-key' | 'x-goog-api-key' | 'api-key' | 'custom'

export interface SEOConfig {
  provider: 'openai' | 'gemini' | 'volcano' | 'claude'
  apiKey?: string
  model?: string
  baseUrl?: string  // Custom base URL for API endpoint
  language_preferences?: Record<string, any>
  default_options?: {
    title?: SEOTitleOptions
    description?: SEODescriptionOptions
    keywords?: KeywordOptions
  }
  authType?: AuthHeaderType // API authentication method (default: bearer)
  customAuthHeader?: string // Custom header name when authType is 'custom'
}

export interface SEOAIResult {
  seo_title: string
  seo_description: string
  keywords: string[]
  slug: string
  analysis: SEOAnalysisResult
  confidence: number
  total_usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCost: number
    currency: string
  }
}

export interface SEOError extends Error {
  code: string
  provider: string
}

// Batch operation types
export interface BatchSEORequest {
  articles: Array<{
    id: number
    title: string
    content: string
    summary?: string
    language: string
  }>
  options?: {
    include_title?: boolean
    include_description?: boolean
    include_keywords?: boolean
    include_analysis?: boolean
  }
}

export interface BatchSEOResult {
  results: Array<{
    article_id: number
    success: boolean
    seo_data?: SEOAIResult
    error?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
    total_cost: number
    currency: string
  }
}

// SEO audit and monitoring types
export interface SEOAuditResult {
  audit_id: string
  timestamp: Date
  overall_score: number
  pages_audited: number
  issues_found: number
  technical_seo: TechnicalSEOAudit
  content_seo: ContentSEOAudit
  performance_seo: PerformanceSEOAudit
  recommendations: SEORecommendation[]
}

export interface TechnicalSEOAudit {
  score: number
  sitemap_status: 'ok' | 'missing' | 'error'
  robots_txt_status: 'ok' | 'missing' | 'error'
  meta_tags_status: 'ok' | 'issues'
  structured_data_status: 'ok' | 'missing' | 'error'
  ssl_status: 'ok' | 'missing'
  mobile_friendly: boolean
  page_speed_score: number
  issues: string[]
}

export interface ContentSEOAudit {
  score: number
  duplicate_titles: number
  duplicate_descriptions: number
  missing_titles: number
  missing_descriptions: number
  thin_content_pages: number
  keyword_cannibalization: number
  issues: string[]
}

export interface PerformanceSEOAudit {
  score: number
  core_web_vitals: {
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay  
    cls: number // Cumulative Layout Shift
  }
  load_time: number
  image_optimization: number
  code_optimization: number
  issues: string[]
}

export interface SEORecommendation {
  type: 'technical' | 'content' | 'performance' | 'keywords'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  effort: 'low' | 'medium' | 'high'
  pages_affected: number
}

// Auto-check types
export interface AutoSEOCheckConfig {
  articles?: string[]
  checkTypes?: ('content' | 'technical' | 'keywords' | 'performance')[]
  schedule?: SEOCheckSchedule
  notifications?: {
    email?: boolean
    dashboard?: boolean
    webhook?: string
  }
  thresholds?: {
    min_score?: number
    max_issues?: number
    performance_threshold?: number
  }
}

export interface SEOCheckSchedule {
  frequency: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
  time?: string
  timezone?: string
}

export interface AutoSEOCheckResult {
  id: string
  timestamp: string
  config: AutoSEOCheckConfig
  report: SEOHealthReport | null
  success: boolean
  error?: string
}

export interface SEOIssue {
  id: string
  type: 'title' | 'description' | 'content' | 'keywords' | 'technical' | 'performance'
  severity: 'critical' | 'warning' | 'info'
  message: string
  article_id: string
  priority: 'high' | 'medium' | 'low'
  detected_at: string
  resolved_at?: string
  status: 'open' | 'resolved' | 'ignored'
}

export interface SEOHealthReport {
  overall_health: 'excellent' | 'good' | 'fair' | 'poor'
  overall_score: number
  total_articles: number
  articles_checked: number
  issues_found: number
  critical_issues: number
  recommendations: SEOSuggestion[]
  check_timestamp: string
  check_duration: number
  articles_summary: {
    excellent: number  // 90+
    good: number       // 70-89
    fair: number       // 50-69
    poor: number       // <50
  }
  top_issues: SEOIssue[]
  improved_articles: string[]
  declined_articles: string[]
}