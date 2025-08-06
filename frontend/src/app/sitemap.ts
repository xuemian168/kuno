import { MetadataRoute } from 'next'
import { getApiUrl, getSiteUrl } from '@/lib/config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get URLs using unified configuration
  const apiUrl = getApiUrl()
  const baseUrl = getSiteUrl()
  
  // Define supported locales (keeping it simple to avoid routing import issues)
  const locales = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'hi']
  const defaultLocale = 'zh'
  
  const routes: MetadataRoute.Sitemap = []
  
  // Add home pages for each locale
  locales.forEach(locale => {
    const url = locale === defaultLocale 
      ? `${baseUrl}/` 
      : `${baseUrl}/${locale}/`
    
    routes.push({
      url,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
      alternates: {
        languages: Object.fromEntries(
          locales.map(loc => [
            loc,
            loc === defaultLocale 
              ? `${baseUrl}/` 
              : `${baseUrl}/${loc}/`
          ])
        )
      }
    })
  })
  
  try {
    // Fetch articles directly with fetch to avoid import issues
    const response = await fetch(`${apiUrl}/articles`, {
      headers: {
        'Accept': 'application/json',
      },
      // Don't cache during build
      cache: 'no-store'
    })
    
    if (response.ok) {
      const articles = await response.json()
      
      // Filter out future articles
      const now = new Date()
      const publishedArticles = articles.filter((article: any) => 
        new Date(article.created_at) <= now
      )
      
      // Add article pages for each locale
      publishedArticles.forEach((article: any) => {
        locales.forEach(locale => {
          // Use SEO-friendly URL if seo_slug is available
          const seoSlug = article.seo_slug
          const baseArticleUrl = seoSlug
            ? (locale === defaultLocale 
                ? `${baseUrl}/article/${seoSlug}` 
                : `${baseUrl}/${locale}/article/${seoSlug}`)
            : (locale === defaultLocale 
                ? `${baseUrl}/article/${article.id}` 
                : `${baseUrl}/${locale}/article/${article.id}`)

          routes.push({
            url: baseArticleUrl,
            lastModified: new Date(article.updated_at || article.created_at),
            changeFrequency: 'weekly',
            priority: 0.8,
            alternates: {
              languages: Object.fromEntries(
                locales.map(loc => {
                  const localeUrl = seoSlug
                    ? (loc === defaultLocale 
                        ? `${baseUrl}/article/${seoSlug}` 
                        : `${baseUrl}/${loc}/article/${seoSlug}`)
                    : (loc === defaultLocale 
                        ? `${baseUrl}/article/${article.id}` 
                        : `${baseUrl}/${loc}/article/${article.id}`)
                  return [loc, localeUrl]
                })
              )
            }
          })
        })
      })
    }
  } catch (error) {
    console.error('Failed to fetch articles for sitemap:', error)
    // Continue with basic routes even if article fetch fails
  }
  
  return routes
}