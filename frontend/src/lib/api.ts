import { getApiUrl } from './config'

// 使用统一的配置管理，自动检测 API URL
function getApiBaseUrl(): string {
  return getApiUrl()
}

export interface ArticleTranslation {
  id: number
  article_id: number
  language: string
  title: string
  content: string
  summary: string
  created_at: string
  updated_at: string
}

export interface Article {
  id: number
  title: string
  content: string
  content_type: string
  summary: string
  category_id: number
  category: Category
  default_lang: string
  translations: ArticleTranslation[]
  view_count?: number
  // Cover Image Fields
  cover_image_url?: string
  cover_image_id?: number
  cover_image_alt?: string
  // Pinned Fields
  is_pinned?: boolean
  pin_order?: number
  pinned_at?: string
  // SEO Fields
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  seo_slug?: string
  // Comment Translation Settings
  selected_comments?: string  // JSON string of selected comments
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface SiteSettingsTranslation {
  id?: number
  settings_id?: number
  language: string
  site_title: string
  site_subtitle: string
  created_at?: string
  updated_at?: string
}

export interface SiteSettings {
  id: number
  site_title: string
  site_subtitle: string
  footer_text: string
  icp_filing?: string
  psb_filing?: string
  show_view_count?: boolean
  show_site_title?: boolean
  enable_sound_effects?: boolean
  logo_url?: string
  favicon_url?: string
  custom_css?: string
  custom_js?: string
  theme_config?: string
  active_theme?: string
  default_language?: string  // Site default language
  // Background settings
  background_type?: string  // "none" | "color" | "image"
  background_color?: string
  background_image_url?: string
  background_opacity?: number
  setup_completed?: boolean
  ai_config?: string // JSON string of AI configuration
  // Privacy and Indexing Control
  block_search_engines?: boolean
  block_ai_training?: boolean
  translations?: SiteSettingsTranslation[]
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  username: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface EmbeddingSearchResult {
  article_id: number
  title: string
  summary: string
  category_name: string
  language: string
  similarity: number
  view_count: number
  created_at: string
}

export interface SemanticSearchRequest {
  query: string
  language?: string
  limit?: number
  threshold?: number
}

export interface SemanticSearchResponse {
  results: EmbeddingSearchResult[]
  count: number
  query: string
  message?: string
}

export interface EmbeddingStats {
  total_embeddings: number
  by_language: Array<{
    language: string
    count: number
  }>
  by_content_type: Array<{
    content_type: string
    count: number
  }>
  latest_update?: string
}

// Visualization data types
export interface VectorData {
  id: number
  article_id: number
  title: string
  language: string
  content_type: string
  x: number
  y: number
  created_at: string
}

export interface GraphNode {
  id: number
  article_id: number
  title: string
  language: string
  size: number
}

export interface GraphEdge {
  source: number
  target: number
  similarity: number
  weight: number
}

export interface SimilarityGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface QualityMetrics {
  total_vectors: number
  average_norm: number
  vector_distribution: Record<string, number>
  similarity_stats: Record<string, number>
  outliers: VectorData[]
  cluster_stats: Record<string, any>
}

export interface RAGProcessStep {
  step: string
  description: string
  duration_ms: number
  data: any
}

export interface RAGProcessVisualization {
  query_vector: number[]
  steps: RAGProcessStep[]
  retrieved_docs: VectorData[]
  similarity_map: Record<number, number>
}

export interface ProviderStatus {
  [key: string]: {
    configured: boolean
    model: string
    dimensions: number
  }
}

export interface EmbeddingTrend {
  date: string
  count: number
  provider: string
}

export interface AIProviderConfig {
  provider: string // "openai", "gemini", "volcano"
  api_key: string
  model: string
  enabled: boolean
  is_configured?: boolean // Whether a real key is configured (from backend)
  settings?: Record<string, string> // Additional provider-specific settings
}

export interface AIConfig {
  default_provider: string
  providers: Record<string, AIProviderConfig>
  embedding_config: {
    default_provider: string
    enabled: boolean
  }
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RecoveryStatusResponse {
  is_recovery_mode: boolean
  message?: string
}

export interface SetupStatusResponse {
  setup_completed: boolean
}

export interface SetupRequest {
  site_title: string
  site_subtitle: string
  default_language: string
  admin_username: string
  admin_password: string
}

export interface SetupResponse {
  success: boolean
  message: string
  token?: string
}

export interface LanguageConfig {
  default_language: string
  enabled_languages: string[]
  supported_languages: Record<string, string>
}

export interface SocialMedia {
  id: number
  platform: string
  url: string
  icon_name: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MediaLibrary {
  id: number
  file_name: string
  original_name: string
  file_path: string
  file_size: number
  mime_type: string
  media_type: 'image' | 'video'
  url: string
  alt: string
  created_at: string
  updated_at: string
}

export interface ArticleViewStats {
  id: number
  title: string
  view_count: number
  category: string
  created_at: string
}

export interface DailyViewStats {
  date: string
  views: number
}

export interface CategoryViewStats {
  category: string
  view_count: number
  article_count: number
}

export interface GeographicStats {
  country: string
  region: string
  city: string
  visitor_count: number
  view_count: number
}

export interface BrowserStats {
  browser: string
  browser_version: string
  visitor_count: number
  view_count: number
}

export interface PlatformStats {
  os: string
  os_version: string
  platform: string
  device_type: string
  visitor_count: number
  view_count: number
}

export interface TrendStats {
  date: string
  views: number
  unique_visitors: number
  desktop_visitors: number
  mobile_visitors: number
  tablet_visitors: number
}

export interface AnalyticsData {
  total_views: number
  total_articles: number
  views_today: number
  views_this_week: number
  views_this_month: number
  top_articles: ArticleViewStats[]
  recent_views: DailyViewStats[]
  category_stats: CategoryViewStats[]
  geographic_stats: GeographicStats[]
  browser_stats: BrowserStats[]
  platform_stats: PlatformStats[]
}

export interface ArticleAnalytics {
  article: Article
  unique_visitors: number
  total_views: number
  daily_views: DailyViewStats[]
  recent_visitors: Array<{
    ip_address: string
    user_agent: string
    created_at: string
  }>
}

export interface MediaListResponse {
  media: MediaLibrary[]
  total: number
  page: number
  limit: number
}

// SEO-related types
export interface SEOKeyword {
  id: number
  article_id?: number
  keyword: string
  language: string
  target_url: string
  current_rank: number
  best_rank: number
  search_volume: number
  difficulty: 'easy' | 'medium' | 'hard'
  tracking_status: 'active' | 'paused'
  notes: string
  tags: string
  created_at: string
  updated_at: string
  article?: Article
}

export interface SEOKeywordGroup {
  id: number
  name: string
  description: string
  color: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SEOHealthCheck {
  id: number
  article_id?: number
  check_type: 'article' | 'site' | 'auto'
  overall_score: number
  title_score: number
  description_score: number
  content_score: number
  keyword_score: number
  readability_score: number
  technical_score: number
  issues_found: number
  check_results: string
  suggestions: string
  language: string
  check_duration: number
  created_at: string
  updated_at: string
  article?: Article
}

export interface SEOAnalysisResult {
  overall_score: number
  title_analysis: {
    score: number
    length: number
    optimal_length: { min: number; max: number }
    has_focus_keyword: boolean
    brand_included: boolean
    uniqueness: number
    issues: string[]
    suggestions: string[]
  }
  description_analysis: {
    score: number
    length: number
    optimal_length: { min: number; max: number }
    has_focus_keyword: boolean
    has_call_to_action: boolean
    uniqueness: number
    issues: string[]
    suggestions: string[]
  }
  content_analysis: {
    score: number
    word_count: number
    paragraph_count: number
    heading_structure: {
      h1_count: number
      h2_count: number
      h3_count: number
      structure_score: number
      has_keyword_in_headings: boolean
      issues: string[]
    }
    keyword_density: Array<{
      keyword: string
      count: number
      density: number
    }>
    internal_links: number
    external_links: number
    image_optimization: {
      total_images: number
      images_with_alt: number
      images_with_title: number
      optimized_images: number
      score: number
      issues: string[]
    }
    issues: string[]
    suggestions: string[]
  }
  keyword_analysis: {
    score: number
    focus_keyword_usage: number
    keyword_distribution: Array<{
      keyword: string
      title: number
      headings: number
      content: number
      meta: number
    }>
    keyword_density: number
    optimal_density: { min: number; max: number }
    related_keywords_found: number
    issues: string[]
    suggestions: string[]
  }
  readability_analysis: {
    score: number
    reading_level: string
    avg_sentence_length: number
    avg_paragraph_length: number
    passive_voice_percentage: number
    transition_words_percentage: number
    issues: string[]
    suggestions: string[]
  }
  technical_analysis: {
    score: number
    url_structure: {
      length: number
      has_keywords: boolean
      is_readable: boolean
      has_underscore: boolean
      score: number
    }
    meta_tags: {
      has_title: boolean
      has_description: boolean
      has_keywords: boolean
      has_viewport: boolean
      has_canonical: boolean
      score: number
    }
    schema: {
      has_article_schema: boolean
      has_breadcrumbs: boolean
      has_author: boolean
      score: number
    }
    issues: string[]
    suggestions: string[]
  }
  suggestions: string[]
  created_at: string
}

export interface SEOAutomationRule {
  id: number
  name: string
  rule_type: 'health_check' | 'keyword_monitor' | 'content_audit'
  trigger_condition: 'schedule' | 'on_publish' | 'on_update' | 'threshold'
  schedule: string
  target_scope: 'all' | 'category' | 'specific_articles'
  target_ids: string
  rule_config: string
  notification_settings: string
  is_active: boolean
  last_run?: string
  next_run?: string
  run_count: number
  created_at: string
  updated_at: string
}

export interface SEONotification {
  id: number
  type: 'health_alert' | 'ranking_change' | 'keyword_opportunity'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  article_id?: number
  keyword_id?: number
  action_url: string
  is_read: boolean
  is_archived: boolean
  expires_at?: string
  created_at: string
  updated_at: string
  article?: Article
  keyword?: SEOKeyword
}

// Content Assistant Interfaces
export interface TopicGap {
  topic: string
  description: string
  related_topics: string[]
  priority: number
  language: string
  suggested_titles: string[]
  keywords: string[]
}

export interface WritingIdea {
  title: string
  description: string
  category: string
  keywords: string[]
  difficulty_level: string
  estimated_length: number
  inspiration: string
  language: string
  relevance_score: number
}

export interface SmartTag {
  tag: string
  confidence: number
  type: string
  context: string
}

export interface SEOKeywordRecommendation {
  keyword: string
  search_volume: number
  difficulty: number
  relevance: number
  type: string
  suggestions: string[]
  language: string
}

export interface TopicCluster {
  name: string
  articles: number[]
  keywords: string[]
  size: number
  coherence: number
}

export interface ContentGapAnalysis {
  total_articles: number
  language_distribution: Record<string, number>
  topic_clusters: TopicCluster[]
  identified_gaps: TopicGap[]
  recommendations: WritingIdea[]
  coverage_score: number
  generated_at: string
}

export interface ContentAssistantStats {
  total_analyses_performed: number
  total_ideas_generated: number
  total_tags_generated: number
  cache_hit_rate: number
}

export interface TopicTrends {
  top_clusters: TopicCluster[]
  coverage_score: number
  language_distribution: Record<string, number>
  generated_at: string
}

export interface ContentIdeaValidation {
  is_viable: boolean
  confidence: number
  suggested_tags: SmartTag[]
  recommendations: string[]
}

// Personalized Recommendations Interfaces
export interface RecommendationResult {
  article: Article
  confidence: number
  reason_type: string
  reason_details: string
  similarity?: number
  position: number
  recommendation_type: string
  category?: string
  is_learning_path?: boolean
}

export interface ReadingPath {
  path_id: string
  title: string
  description: string
  articles: RecommendationResult[]
  total_time: number
  difficulty: string
  progress: number
  created_at: string
}

export interface UserProfile {
  id: number
  user_id: string
  language: string
  preferred_topics: string
  reading_speed: number
  avg_reading_time: number
  avg_scroll_depth: number
  device_preference: string
  active_hours: string
  interest_vector: string
  last_active: string
  total_reading_time: number
  article_count: number
  created_at: string
  updated_at: string
}

export interface RecentUser {
  user_id: string
  last_active: string
  total_reading_time: number
  article_count: number
  device_preference: string
  language: string
  avg_scroll_depth: number
}

export interface ReadingPatterns {
  total_reading_time: number
  average_reading_time: number
  average_scroll_depth: number
  reading_speed: number
  preferred_hours: number[]
  device_distribution: Record<string, number>
  topic_interests: Record<string, number>
  category_interests: Record<string, number>
  reading_frequency: Record<string, number>
}

export interface RecommendationAnalytics {
  total_recommendations: number
  click_through_rate: number
  type_distribution: Record<string, number>
  avg_confidence: number
}

export interface UserBehaviorTrackingRequest {
  user_id?: string
  session_id: string
  article_id: number
  interaction_type: 'view' | 'share' | 'comment' | 'like'
  reading_time?: number
  scroll_depth?: number
  device_info?: {
    device_type: string
    browser: string
    os: string
    screen_size: string
    user_agent: string
  }
  utm_params?: Record<string, string>
  referrer_type?: string
  language?: string
}

export interface PersonalizedRecommendationsRequest {
  user_id?: string
  language?: string
  limit?: number
  exclude_read?: boolean
  include_reason?: boolean
  min_confidence?: number
  categories?: string[]
  max_age?: number
  diversify?: boolean
}

export interface ReadingPathRequest {
  user_id?: string
  topic: string
  language?: string
}

class ApiClient {
  private token: string | null = null

  constructor() {
    this.loadToken()
  }

  private getBaseUrl(): string {
    return getApiBaseUrl()
  }

  private loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
  }

  private saveToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
      this.token = token
    }
  }

  private clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      this.token = null
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      headers,
      ...options,
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login'
        }
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Articles
  async getArticles(options?: { categoryId?: number; lang?: string }): Promise<Article[]> {
    const params = new URLSearchParams()
    if (options?.categoryId) params.set('category_id', options.categoryId.toString())
    if (options?.lang) params.set('lang', options.lang)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    return this.request<Article[]>(`/articles${queryString}`)
  }

  async getArticle(id: number, lang?: string): Promise<Article> {
    const params = lang ? `?lang=${lang}` : ''
    return this.request<Article>(`/articles/${id}${params}`)
  }

  async createArticle(article: Omit<Article, 'id' | 'created_at' | 'updated_at' | 'category'>): Promise<Article> {
    return this.request<Article>('/articles', {
      method: 'POST',
      body: JSON.stringify(article),
    })
  }

  async updateArticle(id: number, article: Partial<Article>): Promise<Article> {
    return this.request<Article>(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(article),
    })
  }

  async deleteArticle(id: number): Promise<void> {
    await this.request(`/articles/${id}`, {
      method: 'DELETE',
    })
  }

  async importMarkdown(data: { title: string, content: string, category_id?: number }): Promise<{ message: string, article: Article }> {
    return this.request('/articles/import', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async importGhost(file: File): Promise<{ message: string, result: { imported_articles: number, imported_pages: number, imported_tags: number, errors: string[] } }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.getBaseUrl()}/articles/import-ghost`, {
      method: 'POST',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login'
        }
      }
      throw new Error(`Import failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Categories
  async getCategories(options?: { lang?: string }): Promise<Category[]> {
    const params = options?.lang ? `?lang=${options.lang}` : ''
    return this.request<Category[]>(`/categories${params}`)
  }

  async getCategory(id: number): Promise<Category> {
    return this.request<Category>(`/categories/${id}`)
  }

  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    })
  }

  async updateCategory(id: number, category: Partial<Category>): Promise<Category> {
    return this.request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    })
  }

  async deleteCategory(id: number): Promise<void> {
    await this.request(`/categories/${id}`, {
      method: 'DELETE',
    })
  }

  // Settings
  async getSettings(params?: { lang?: string }): Promise<SiteSettings> {
    const queryParams = new URLSearchParams()
    if (params?.lang) {
      queryParams.append('lang', params.lang)
    }
    const url = queryParams.toString() ? `/settings?${queryParams}` : '/settings'
    return this.request<SiteSettings>(url)
  }

  // Language configuration
  async getLanguageConfig(): Promise<LanguageConfig> {
    return this.request<LanguageConfig>('/languages')
  }

  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    return this.request<SiteSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  // Upload logo file
  async uploadLogo(file: File): Promise<{ url: string; message: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.getBaseUrl()}/settings/upload-logo`, {
      method: 'POST',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login'
        }
      }
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Upload favicon file
  async uploadFavicon(file: File): Promise<{ url: string; message: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.getBaseUrl()}/settings/upload-favicon`, {
      method: 'POST',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login'
        }
      }
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Upload background image file
  async uploadBackgroundImage(file: File): Promise<{ url: string; message: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.getBaseUrl()}/settings/upload-background`, {
      method: 'POST',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login'
        }
      }
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Remove background image
  async removeBackgroundImage(): Promise<{ message: string }> {
    const response = await fetch(`${this.getBaseUrl()}/settings/background`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login'
        }
      }
      throw new Error(`Remove failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    
    this.saveToken(response.token)
    return response
  }

  logout() {
    this.clearToken()
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  isAuthenticated(): boolean {
    return !!this.token
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/me')
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/change-password', {
      method: 'PUT',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    })
  }

  async getRecoveryStatus(): Promise<RecoveryStatusResponse> {
    return this.request('/recovery-status', {
      method: 'GET',
    })
  }

  // Setup
  async getSetupStatus(): Promise<SetupStatusResponse> {
    return this.request('/setup/status', {
      method: 'GET',
    })
  }

  async initializeSetup(data: SetupRequest): Promise<SetupResponse> {
    return this.request('/setup/initialize', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Social Media
  async getSocialMediaList(): Promise<SocialMedia[]> {
    return this.request('/social-media')
  }

  async getAllSocialMedia(): Promise<SocialMedia[]> {
    return this.request('/social-media/all', {
      method: 'GET',
    })
  }

  async getSocialMedia(id: number): Promise<SocialMedia> {
    return this.request(`/social-media/${id}`)
  }

  async createSocialMedia(data: Omit<SocialMedia, 'id' | 'created_at' | 'updated_at'>): Promise<SocialMedia> {
    return this.request('/social-media', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSocialMedia(id: number, data: Partial<SocialMedia>): Promise<SocialMedia> {
    return this.request(`/social-media/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteSocialMedia(id: number): Promise<{ message: string }> {
    return this.request(`/social-media/${id}`, {
      method: 'DELETE',
    })
  }

  async updateSocialMediaOrder(order: { id: number; order: number }[]): Promise<{ message: string }> {
    return this.request('/social-media/order', {
      method: 'PUT',
      body: JSON.stringify(order),
    })
  }

  // Media
  async uploadMedia(file: File, alt?: string): Promise<MediaLibrary> {
    const formData = new FormData()
    formData.append('file', file)
    if (alt) {
      formData.append('alt', alt)
    }

    const response = await fetch(`${this.getBaseUrl()}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login'
        }
      }
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getMediaList(type?: 'image' | 'video', page = 1, limit = 20, search?: string): Promise<MediaListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    
    if (type) {
      params.append('type', type)
    }
    
    if (search) {
      params.append('search', search)
    }

    return this.request<MediaListResponse>(`/media?${params}`)
  }

  async getMedia(id: number): Promise<MediaLibrary> {
    return this.request<MediaLibrary>(`/media/${id}`)
  }

  async updateMedia(id: number, alt: string): Promise<MediaLibrary> {
    return this.request<MediaLibrary>(`/media/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ alt }),
    })
  }

  async deleteMedia(id: number): Promise<{ message: string }> {
    return this.request(`/media/${id}`, {
      method: 'DELETE',
    })
  }

  async bulkDeleteMedia(ids: number[]): Promise<{
    success_count: number
    total_count: number
    failed: Array<{ id: number; filename: string; error: string }>
    message: string
  }> {
    return this.request('/media/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    })
  }

  // Analytics endpoints
  async getAnalytics(params?: { lang?: string }): Promise<AnalyticsData> {
    const queryParams = new URLSearchParams()
    if (params?.lang) {
      queryParams.append('lang', params.lang)
    }
    const url = queryParams.toString() ? `/analytics?${queryParams}` : '/analytics'
    return this.request<AnalyticsData>(url)
  }

  async getArticleAnalytics(id: number, params?: { lang?: string }): Promise<ArticleAnalytics> {
    const queryParams = new URLSearchParams()
    if (params?.lang) {
      queryParams.append('lang', params.lang)
    }
    const url = queryParams.toString() ? `/analytics/articles/${id}?${queryParams}` : `/analytics/articles/${id}`
    return this.request<ArticleAnalytics>(url)
  }

  async getGeographicAnalytics(): Promise<{ geographic_stats: GeographicStats[] }> {
    return this.request('/analytics/geographic')
  }

  async getGeographicStats(): Promise<GeographicStats[]> {
    const result = await this.request<{ geographic_stats: GeographicStats[] }>('/analytics/geographic')
    return result.geographic_stats
  }

  async getBrowserAnalytics(): Promise<{ browser_stats: BrowserStats[], platform_stats: PlatformStats[] }> {
    return this.request('/analytics/browsers')
  }

  async getTrendAnalytics(days?: number): Promise<{ trends: TrendStats[] }> {
    const queryParams = new URLSearchParams()
    if (days) {
      queryParams.append('days', days.toString())
    }
    const url = queryParams.toString() ? `/analytics/trends?${queryParams}` : '/analytics/trends'
    return this.request(url)
  }

  // Export endpoints
  async exportArticle(id: number, params?: { lang?: string }): Promise<void> {
    const queryParams = new URLSearchParams()
    if (params?.lang) {
      queryParams.append('lang', params.lang)
    }
    const url = queryParams.toString() ? `/export/article/${id}?${queryParams}` : `/export/article/${id}`
    
    // Direct download via window.open
    const fullUrl = `${this.getBaseUrl()}${url}`
    const token = localStorage.getItem('auth_token')
    if (token) {
      // Use fetch to handle authentication
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        
        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `article-${id}.md`
        link.download = filename
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
      } else {
        const errorText = await response.text()
        throw new Error(`Export failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
    }
  }

  async exportArticles(params?: { 
    lang?: string
    categoryId?: number
    articleIds?: number[]
  }): Promise<void> {
    const queryParams = new URLSearchParams()
    if (params?.lang) {
      queryParams.append('lang', params.lang)
    }
    if (params?.categoryId) {
      queryParams.append('category_id', params.categoryId.toString())
    }
    if (params?.articleIds && params.articleIds.length > 0) {
      queryParams.append('article_ids', params.articleIds.join(','))
    }
    
    const url = queryParams.toString() ? `/export/articles?${queryParams}` : '/export/articles'
    const fullUrl = `${this.getBaseUrl()}${url}`
    const token = localStorage.getItem('auth_token')
    
    if (token) {
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'articles-export.zip'
        link.download = filename
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
      } else {
        const errorText = await response.text()
        throw new Error(`Export failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
    }
  }

  async exportAllArticles(params?: { lang?: string }): Promise<void> {
    const queryParams = new URLSearchParams()
    if (params?.lang) {
      queryParams.append('lang', params.lang)
    }
    
    const url = queryParams.toString() ? `/export/all?${queryParams}` : '/export/all'
    const fullUrl = `${this.getBaseUrl()}${url}`
    const token = localStorage.getItem('auth_token')
    
    if (token) {
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'blog-export.zip'
        link.download = filename
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
      } else {
        const errorText = await response.text()
        throw new Error(`Export failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
    }
  }

  // System endpoints
  async getSystemInfo(): Promise<{ system_info: any }> {
    return this.request('/system/info')
  }

  async checkUpdates(): Promise<any> {
    return this.request('/system/check-updates')
  }

  async clearCache(): Promise<{ message: string }> {
    return this.request('/system/clear-cache', {
      method: 'POST'
    })
  }

  // Search endpoints
  async searchArticles(query: string, options?: {
    page?: number
    limit?: number
    lang?: string
  }): Promise<{
    articles: Article[]
    pagination: {
      page: number
      limit: number
      total: number
      total_pages: number
    }
    query: string
  }> {
    const params = new URLSearchParams({
      q: query,
      ...(options?.page && { page: options.page.toString() }),
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.lang && { lang: options.lang })
    })

    return this.request(`/articles/search?${params.toString()}`)
  }

  // Semantic search endpoints
  async semanticSearch(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
    return this.request('/search/semantic', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async hybridSearch(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
    return this.request('/search/hybrid', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getSimilarArticles(articleId: number, options?: {
    language?: string
    limit?: number
  }): Promise<SemanticSearchResponse> {
    const params = new URLSearchParams()
    if (options?.language) {
      params.append('language', options.language)
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString())
    }
    const queryString = params.toString() ? `?${params.toString()}` : ''
    return this.request(`/search/similar/${articleId}${queryString}`)
  }

  // Embedding management endpoints (admin only)
  async getEmbeddingStats(): Promise<{ stats: EmbeddingStats }> {
    return this.request('/embeddings/stats')
  }

  async processArticleEmbeddings(articleId: number): Promise<{ message: string; article_id: number }> {
    return this.request(`/embeddings/process/${articleId}`, {
      method: 'POST',
    })
  }

  async batchProcessEmbeddings(): Promise<{ message: string }> {
    return this.request('/embeddings/batch-process', {
      method: 'POST',
    })
  }

  async rebuildEmbeddings(): Promise<{ message: string }> {
    return this.request('/embeddings/rebuild', {
      method: 'POST',
    })
  }

  async deleteArticleEmbeddings(articleId: number): Promise<{
    message: string
    article_id: number
    deleted_count: number
  }> {
    return this.request(`/embeddings/article/${articleId}`, {
      method: 'DELETE',
    })
  }

  async getProviderStatus(): Promise<{
    providers: ProviderStatus
    available: string[]
  }> {
    return this.request('/embeddings/providers')
  }

  async setDefaultProvider(provider: string): Promise<{
    message: string
    provider: string
  }> {
    return this.request('/embeddings/providers/default', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    })
  }

  async getEmbeddingTrends(days?: number): Promise<{
    trends: EmbeddingTrend[]
    days: number
  }> {
    const params = days ? `?days=${days}` : ''
    return this.request(`/embeddings/trends${params}`)
  }

  // Visualization endpoints
  async getEmbeddingVectors(options?: {
    method?: string
    limit?: number
  }): Promise<{
    vectors: VectorData[]
    method: string
    dimensions: number
    count: number
  }> {
    const params = new URLSearchParams()
    if (options?.method) params.append('method', options.method)
    if (options?.limit) params.append('limit', options.limit.toString())
    
    const queryString = params.toString()
    return this.request(`/embeddings/vectors${queryString ? `?${queryString}` : ''}`)
  }

  async getSimilarityGraph(options?: {
    threshold?: number
    maxNodes?: number
  }): Promise<{
    graph: SimilarityGraph
    threshold: number
    max_nodes: number
  }> {
    const params = new URLSearchParams()
    if (options?.threshold !== undefined) params.append('threshold', options.threshold.toString())
    if (options?.maxNodes) params.append('max_nodes', options.maxNodes.toString())
    
    const queryString = params.toString()
    return this.request(`/embeddings/similarity-graph${queryString ? `?${queryString}` : ''}`)
  }

  async getQualityMetrics(): Promise<{
    metrics: QualityMetrics
  }> {
    return this.request('/embeddings/quality-metrics')
  }

  async getRAGProcessVisualization(query: string, options?: {
    language?: string
    limit?: number
  }): Promise<{
    process: RAGProcessVisualization
    query: string
    language: string
  }> {
    const params = new URLSearchParams()
    params.append('query', query)
    if (options?.language) params.append('language', options.language)
    if (options?.limit) params.append('limit', options.limit.toString())
    
    return this.request(`/embeddings/rag-process?${params.toString()}`)
  }

  // LLMs.txt endpoints
  async generateLLMsTxt(lang: string = 'zh'): Promise<string> {
    const response = await fetch(`${this.getBaseUrl()}/llms-txt/generate?lang=${lang}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'text/plain',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to generate LLMs.txt: ${response.statusText}`)
    }
    
    return await response.text()
  }

  async previewLLMsTxt(lang: string = 'zh'): Promise<string> {
    const response = await fetch(`${this.getBaseUrl()}/llms-txt/preview?lang=${lang}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'text/plain',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to preview LLMs.txt: ${response.statusText}`)
    }
    
    return await response.text()
  }

  async clearLLMsTxtCache(): Promise<{ message: string }> {
    return this.request('/llms-txt/clear-cache', {
      method: 'POST'
    })
  }

  async getLLMsTxtCacheStats(): Promise<{
    cache_entries: number
    cache_expiry_hours: number
    entries: Array<{
      key: string
      language: string
      timestamp: string
      age_minutes: number
    }>
  }> {
    return this.request('/llms-txt/cache-stats')
  }

  // Public LLMs.txt endpoint (no authentication required)
  async getLLMsTxtPublic(lang: string = 'zh'): Promise<string> {
    const response = await fetch(`${this.getBaseUrl()}/llms.txt?lang=${lang}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch LLMs.txt: ${response.statusText}`)
    }
    
    return await response.text()
  }

  async getLLMsTxtUsageStats(days: number = 30): Promise<{
    period_days: number
    summary: Array<{
      service_type: string
      provider: string
      total_requests: number
      success_requests: number
      total_tokens: number
      total_cost: number
      currency: string
      avg_response_time: number
    }>
    daily_usage: Array<{
      date: string
      total_requests: number
      success_requests: number
      total_cost: number
      avg_response_time: number
    }>
    cache_stats: {
      cache_entries: number
      cache_expiry_hours: number
      entries: Array<{
        key: string
        language: string
        timestamp: string
        age_minutes: number
      }>
    }
  }> {
    return this.request(`/llms-txt/usage-stats?days=${days}`)
  }

  // SEO Management endpoints
  async getSEOHealth(): Promise<{
    health_check: SEOHealthCheck
    message: string
  }> {
    return this.request('/seo/health')
  }

  async runSEOHealthCheck(type: 'site' | 'article' = 'site', articleId?: number): Promise<{
    health_check: SEOHealthCheck
    message: string
  }> {
    const params = new URLSearchParams({ type })
    if (type === 'article' && articleId) {
      params.append('article_id', articleId.toString())
    }
    return this.request(`/seo/health/check?${params.toString()}`, {
      method: 'POST'
    })
  }

  async getSEOHealthHistory(filters?: {
    article_id?: number
    check_type?: string
    limit?: number
  }): Promise<{
    history: SEOHealthCheck[]
    count: number
  }> {
    const params = new URLSearchParams()
    if (filters?.article_id) params.append('article_id', filters.article_id.toString())
    if (filters?.check_type) params.append('check_type', filters.check_type)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    
    const queryString = params.toString()
    return this.request(`/seo/health/history${queryString ? `?${queryString}` : ''}`)
  }

  async getArticleSEO(articleId: number): Promise<{
    article: Article
    latest_health_check: SEOHealthCheck | null
    keywords: SEOKeyword[]
    keyword_count: number
  }> {
    return this.request(`/seo/articles/${articleId}`)
  }

  async updateArticleSEO(articleId: number, data: {
    seo_title?: string
    seo_description?: string
    seo_keywords?: string
    seo_slug?: string
  }): Promise<{
    article: Article
    message: string
  }> {
    return this.request(`/seo/articles/${articleId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async analyzeArticleSEO(articleId: number, options?: {
    focus_keyword?: string
    language?: string
  }): Promise<{
    analysis: SEOAnalysisResult
    message: string
  }> {
    return this.request(`/seo/articles/${articleId}/analyze`, {
      method: 'POST',
      body: JSON.stringify(options || {})
    })
  }

  async generateArticleSEO(articleId: number, options: {
    generate_title?: boolean
    generate_description?: boolean
    generate_keywords?: boolean
    focus_keyword?: string
    language?: string
  }): Promise<{
    result: {
      generated_content: Record<string, string>
      suggestions: string[]
    }
    message: string
  }> {
    return this.request(`/seo/articles/${articleId}/generate`, {
      method: 'POST',
      body: JSON.stringify(options)
    })
  }

  async getSEOKeywords(filters?: {
    article_id?: number
    language?: string
    tracking_status?: string
    difficulty?: string
    search?: string
  }): Promise<{
    keywords: SEOKeyword[]
    count: number
  }> {
    const params = new URLSearchParams()
    if (filters?.article_id) params.append('article_id', filters.article_id.toString())
    if (filters?.language) params.append('language', filters.language)
    if (filters?.tracking_status) params.append('tracking_status', filters.tracking_status)
    if (filters?.difficulty) params.append('difficulty', filters.difficulty)
    if (filters?.search) params.append('search', filters.search)
    
    const queryString = params.toString()
    return this.request(`/seo/keywords${queryString ? `?${queryString}` : ''}`)
  }

  async createSEOKeyword(keyword: Omit<SEOKeyword, 'id' | 'created_at' | 'updated_at'>): Promise<{
    keyword: SEOKeyword
    message: string
  }> {
    return this.request('/seo/keywords', {
      method: 'POST',
      body: JSON.stringify(keyword)
    })
  }

  async updateSEOKeyword(keywordId: number, updates: Partial<SEOKeyword>): Promise<{
    keyword: SEOKeyword
    message: string
  }> {
    return this.request(`/seo/keywords/${keywordId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  async deleteSEOKeyword(keywordId: number): Promise<{
    message: string
  }> {
    return this.request(`/seo/keywords/${keywordId}`, {
      method: 'DELETE'
    })
  }

  async suggestSEOKeywords(articleId: number, baseKeyword: string): Promise<{
    suggestions: string[]
    count: number
  }> {
    return this.request('/seo/keywords/suggest', {
      method: 'POST',
      body: JSON.stringify({
        article_id: articleId,
        base_keyword: baseKeyword
      })
    })
  }

  async getSEOKeywordStats(): Promise<{
    stats: Record<string, any>
  }> {
    return this.request('/seo/keywords/stats')
  }

  async getSEOKeywordGroups(): Promise<{
    groups: SEOKeywordGroup[]
    count: number
  }> {
    return this.request('/seo/keywords/groups')
  }

  async createSEOKeywordGroup(group: Omit<SEOKeywordGroup, 'id' | 'created_at' | 'updated_at'>): Promise<{
    group: SEOKeywordGroup
    message: string
  }> {
    return this.request('/seo/keywords/groups', {
      method: 'POST',
      body: JSON.stringify(group)
    })
  }

  async getSEOKeywordsByGroup(): Promise<{
    grouped_keywords: Record<string, SEOKeyword[]>
  }> {
    return this.request('/seo/keywords/by-group')
  }

  async bulkImportSEOKeywords(data: {
    article_id?: number
    keywords: string[]
    language?: string
  }): Promise<{
    created_keywords: SEOKeyword[]
    count: number
    message: string
  }> {
    return this.request('/seo/keywords/bulk-import', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateKeywordRankings(): Promise<{
    message: string
  }> {
    return this.request('/seo/keywords/update-rankings', {
      method: 'POST'
    })
  }

  async getSEOMetrics(): Promise<{
    metrics: Record<string, any>
    message: string
  }> {
    return this.request('/seo/metrics')
  }

  async getSEOAutomationRules(): Promise<{
    rules: SEOAutomationRule[]
    count: number
  }> {
    return this.request('/seo/automation/rules')
  }

  async getSEONotifications(filters?: {
    is_read?: boolean
    severity?: string
    limit?: number
  }): Promise<{
    notifications: SEONotification[]
    count: number
  }> {
    const params = new URLSearchParams()
    if (filters?.is_read !== undefined) params.append('is_read', filters.is_read.toString())
    if (filters?.severity) params.append('severity', filters.severity)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    
    const queryString = params.toString()
    return this.request(`/seo/notifications${queryString ? `?${queryString}` : ''}`)
  }

  async markSEONotificationRead(notificationId: number): Promise<{
    message: string
  }> {
    return this.request(`/seo/notifications/${notificationId}/read`, {
      method: 'PUT'
    })
  }

  // Content Assistant Methods
  async getTopicGaps(language: string = 'en'): Promise<{
    analysis: ContentGapAnalysis
    message: string
  }> {
    return this.request(`/content-assistant/topic-gaps?language=${language}`)
  }

  async getWritingInspiration(params: {
    category?: string
    language?: string
    limit?: number
  } = {}): Promise<{
    ideas: WritingIdea[]
    count: number
    message: string
  }> {
    const searchParams = new URLSearchParams()
    if (params.category) searchParams.append('category', params.category)
    if (params.language) searchParams.append('language', params.language)
    if (params.limit) searchParams.append('limit', params.limit.toString())
    
    const queryString = searchParams.toString()
    return this.request(`/content-assistant/writing-inspiration${queryString ? `?${queryString}` : ''}`)
  }

  async generateSmartTags(data: {
    content: string
    language?: string
  }): Promise<{
    tags: SmartTag[]
    count: number
    message: string
  }> {
    return this.request('/content-assistant/smart-tags', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async recommendSEOKeywords(data: {
    content: string
    language?: string
    primary_keyword?: string
  }): Promise<{
    keywords: SEOKeywordRecommendation[]
    count: number
    message: string
  }> {
    return this.request('/content-assistant/seo-keywords', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getContentAssistantStats(): Promise<{
    stats: ContentAssistantStats
    message: string
  }> {
    return this.request('/content-assistant/stats')
  }

  async getTopicTrends(language: string = 'en'): Promise<{
    trends: TopicTrends
    message: string
  }> {
    return this.request(`/content-assistant/trends?language=${language}`)
  }

  async validateContentIdea(data: {
    title: string
    language?: string
    category?: string
  }): Promise<{
    validation: ContentIdeaValidation
    message: string
  }> {
    return this.request('/content-assistant/validate-idea', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Personalized Recommendations Methods
  async trackUserBehavior(data: UserBehaviorTrackingRequest): Promise<{
    message: string
  }> {
    return this.request('/recommendations/track', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // RAG service status
  async getRAGServiceStatus(): Promise<{
    rag_enabled: boolean
    services: {
      embedding: {
        available: boolean
        providers: string[]
        embedding_count: number
        error?: string
      }
      recommendation: {
        available: boolean
        error?: string
      }
    }
    message: string
  }> {
    return this.request('/rag/status')
  }

  async getPersonalizedRecommendations(params: PersonalizedRecommendationsRequest = {}): Promise<{
    recommendations: RecommendationResult[]
    count: number
    user_id: string
    message: string
  }> {
    const searchParams = new URLSearchParams()
    if (params.user_id) searchParams.append('user_id', params.user_id)
    if (params.language) searchParams.append('language', params.language)
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.exclude_read !== undefined) searchParams.append('exclude_read', params.exclude_read.toString())
    if (params.include_reason !== undefined) searchParams.append('include_reason', params.include_reason.toString())
    if (params.min_confidence !== undefined) searchParams.append('min_confidence', params.min_confidence.toString())
    if (params.diversify !== undefined) searchParams.append('diversify', params.diversify.toString())
    if (params.categories) searchParams.append('categories', params.categories.join(','))
    if (params.max_age) searchParams.append('max_age', params.max_age.toString())
    
    const queryString = searchParams.toString()
    return this.request(`/recommendations/personalized${queryString ? `?${queryString}` : ''}`)
  }

  async generateReadingPath(data: ReadingPathRequest): Promise<{
    reading_path: ReadingPath
    message: string
  }> {
    return this.request('/recommendations/reading-path', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getPopularContent(params: {
    language?: string
    limit?: number
    days?: number
  } = {}): Promise<{
    popular_content: RecommendationResult[]
    count: number
    days: number
    message: string
  }> {
    const searchParams = new URLSearchParams()
    if (params.language) searchParams.append('language', params.language)
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.days) searchParams.append('days', params.days.toString())
    
    const queryString = searchParams.toString()
    return this.request(`/recommendations/popular${queryString ? `?${queryString}` : ''}`)
  }

  // Admin Recommendation Management Methods
  async getUserProfile(userId: string): Promise<{
    profile: UserProfile
    interests: Record<string, any>
    message: string
  }> {
    return this.request(`/recommendations/users/${userId}/profile`)
  }

  async getUserReadingPatterns(userId: string, days: number = 30): Promise<{
    patterns: ReadingPatterns
    days: number
    message: string
  }> {
    return this.request(`/recommendations/users/${userId}/patterns?days=${days}`)
  }

  async getSimilarUsers(userId: string, limit: number = 10): Promise<{
    similar_users: string[]
    count: number
    message: string
  }> {
    return this.request(`/recommendations/users/${userId}/similar?limit=${limit}`)
  }

  async getRecommendationAnalytics(userId: string, days: number = 30): Promise<{
    analytics: RecommendationAnalytics
    days: number
    message: string
  }> {
    return this.request(`/recommendations/users/${userId}/analytics?days=${days}`)
  }

  async markRecommendationClicked(userId: string, recommendationId: number): Promise<{
    message: string
  }> {
    return this.request(`/recommendations/users/${userId}/recommendations/${recommendationId}/click`, {
      method: 'PUT'
    })
  }

  async getRecentUsers(options?: { limit?: number; offset?: number; days?: number }): Promise<{
    users: RecentUser[]
    count: number
    limit: number
    offset: number
    days: number
    message: string
  }> {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())
    if (options?.days) params.set('days', options.days.toString())
    const queryString = params.toString() ? `?${params.toString()}` : ''
    return this.request(`/recommendations/users/recent${queryString}`)
  }
}

export const apiClient = new ApiClient()