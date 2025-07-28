// Get API URL from environment variable or default
function getApiBaseUrl(): string {
  // Use environment variable if available, otherwise use default
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  
  // If no environment variable is set, use default localhost
  if (!apiUrl || apiUrl === '' || apiUrl === 'undefined') {
    return 'http://localhost:8080/api'
  }
  
  return apiUrl
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
  // SEO Fields
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  seo_slug?: string
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
  enable_sound_effects?: boolean
  logo_url?: string
  favicon_url?: string
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

export interface AnalyticsData {
  total_views: number
  total_articles: number
  views_today: number
  views_this_week: number
  views_this_month: number
  top_articles: ArticleViewStats[]
  recent_views: DailyViewStats[]
  category_stats: CategoryViewStats[]
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  async getMediaList(type?: 'image' | 'video', page = 1, limit = 20): Promise<MediaListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    
    if (type) {
      params.append('type', type)
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
}

export const apiClient = new ApiClient()