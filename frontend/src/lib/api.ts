const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

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

export interface MediaListResponse {
  media: MediaLibrary[]
  total: number
  page: number
  limit: number
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.loadToken()
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
    const url = `${this.baseUrl}${endpoint}`
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

  // Media
  async uploadMedia(file: File, alt?: string): Promise<MediaLibrary> {
    const formData = new FormData()
    formData.append('file', file)
    if (alt) {
      formData.append('alt', alt)
    }

    const response = await fetch(`${this.baseUrl}/media/upload`, {
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
}

export const apiClient = new ApiClient(API_BASE_URL)