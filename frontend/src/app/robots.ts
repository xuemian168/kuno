import { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/utils'
import { getApiUrl } from '@/lib/config'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = getBaseUrl()
  
  try {
    // Fetch settings to check privacy controls
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/settings`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store' // Don't cache during build
    })
    
    if (response.ok) {
      const settings = await response.json()
      
      // If search engines are blocked, disallow everything
      if (settings.block_search_engines) {
        const rules: MetadataRoute.Robots = {
          rules: {
            userAgent: '*',
            disallow: '/',
          }
        }
        
        // Also block AI training bots if enabled
        if (settings.block_ai_training) {
          rules.rules = [
            { userAgent: '*', disallow: '/' },
            { userAgent: 'GPTBot', disallow: '/' },
            { userAgent: 'ChatGPT-User', disallow: '/' },
            { userAgent: 'CCBot', disallow: '/' },
            { userAgent: 'anthropic-ai', disallow: '/' },
            { userAgent: 'Claude-Web', disallow: '/' },
            { userAgent: 'PerplexityBot', disallow: '/' },
            { userAgent: 'Google-Extended', disallow: '/' }
          ]
        }
        
        return rules
      }
      
      // If only AI training is blocked
      if (settings.block_ai_training) {
        return {
          rules: [
            {
              userAgent: '*',
              allow: '/',
              disallow: [
                '/admin',
                '/admin/*',
                '/api/*',
              ],
            },
            { userAgent: 'GPTBot', disallow: '/' },
            { userAgent: 'ChatGPT-User', disallow: '/' },
            { userAgent: 'CCBot', disallow: '/' },
            { userAgent: 'anthropic-ai', disallow: '/' },
            { userAgent: 'Claude-Web', disallow: '/' },
            { userAgent: 'PerplexityBot', disallow: '/' },
            { userAgent: 'Google-Extended', disallow: '/' }
          ],
          sitemap: `${baseUrl}/sitemap.xml`,
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch settings for robots.txt:', error)
    // Fallback to default behavior if API fails
  }
  
  // Default behavior when no privacy controls are enabled
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/*',
        '/api/*',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}