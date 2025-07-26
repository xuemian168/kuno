import { MetadataRoute } from 'next'
import { apiClient } from '@/lib/api'
import { routing } from '@/i18n/routing'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  const routes: MetadataRoute.Sitemap = []
  
  // Add home pages for each locale
  routing.locales.forEach(locale => {
    const url = locale === routing.defaultLocale 
      ? `${baseUrl}/` 
      : `${baseUrl}/${locale}/`
    
    routes.push({
      url,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map(loc => [
            loc,
            loc === routing.defaultLocale 
              ? `${baseUrl}/` 
              : `${baseUrl}/${loc}/`
          ])
        )
      }
    })
  })
  
  try {
    // Fetch all articles
    const articles = await apiClient.getArticles()
    
    // Add article pages for each locale
    articles.forEach(article => {
      routing.locales.forEach(locale => {
        const url = locale === routing.defaultLocale 
          ? `${baseUrl}/article/${article.id}` 
          : `${baseUrl}/${locale}/article/${article.id}`
        
        // Extract media from article content for image sitemap
        const extractMediaFromContent = (content: string) => {
          const images: string[] = []
          
          // Extract YouTube video thumbnails
          const youtubeMatches = content.match(/<YouTubeEmbed\s+url="([^"]+)"/g)
          if (youtubeMatches) {
            youtubeMatches.forEach(match => {
              const urlMatch = match.match(/url="([^"]+)"/)
              if (urlMatch) {
                const videoId = urlMatch[1].match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
                if (videoId) {
                  images.push(`https://img.youtube.com/vi/${videoId[1]}/maxresdefault.jpg`)
                }
              }
            })
          }
          
          return images
        }
        
        const images = extractMediaFromContent(article.content)
        
        // Use SEO-friendly URL if seo_slug is available
        const seoSlug = article.seo_slug
        const baseArticleUrl = seoSlug
          ? (locale === routing.defaultLocale 
              ? `${baseUrl}/article/${seoSlug}` 
              : `${baseUrl}/${locale}/article/${seoSlug}`)
          : url

        routes.push({
          url: baseArticleUrl,
          lastModified: new Date(article.updated_at || article.created_at),
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: {
            languages: Object.fromEntries(
              routing.locales.map(loc => {
                const localeUrl = seoSlug
                  ? (loc === routing.defaultLocale 
                      ? `${baseUrl}/article/${seoSlug}` 
                      : `${baseUrl}/${loc}/article/${seoSlug}`)
                  : (loc === routing.defaultLocale 
                      ? `${baseUrl}/article/${article.id}` 
                      : `${baseUrl}/${loc}/article/${article.id}`)
                return [loc, localeUrl]
              })
            )
          },
          // Add images to sitemap for better SEO
          ...(images.length > 0 && {
            images: images
          })
        })
      })
    })
  } catch (error) {
    console.error('Failed to fetch articles for sitemap:', error)
  }
  
  return routes
}