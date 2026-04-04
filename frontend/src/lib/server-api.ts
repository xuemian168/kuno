/**
 * 服务端专用 API 函数
 * 仅在 Server Components 中使用，配合 Next.js 缓存和请求去重
 */

import type { Article, Category, SiteSettings } from './api'

function getServerApiUrl(): string {
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return `${process.env.NEXT_PUBLIC_SITE_URL}/api`
  }
  return 'http://localhost:8085/api'
}

async function serverFetch<T>(path: string, revalidate = 60): Promise<T> {
  const apiUrl = getServerApiUrl()
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function fetchArticles(locale: string, categoryId?: number): Promise<Article[]> {
  const params = new URLSearchParams()
  if (categoryId) params.set('category_id', categoryId.toString())
  params.set('lang', locale)
  return serverFetch<Article[]>(`/articles?${params.toString()}`)
}

export async function fetchArticle(id: string | number, locale: string): Promise<Article> {
  return serverFetch<Article>(`/articles/${id}?lang=${locale}`)
}

export async function fetchCategories(locale: string): Promise<Category[]> {
  return serverFetch<Category[]>(`/categories?lang=${locale}`)
}

export async function fetchSettings(locale: string): Promise<SiteSettings> {
  return serverFetch<SiteSettings>(`/settings?lang=${locale}`, 300)
}
