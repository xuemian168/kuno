import { getApiUrl } from '@/lib/config'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiUrl = getApiUrl()

  // 从请求头获取正确的域名和协议
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'https'

  // 构建 baseUrl：生产环境强制使用 HTTPS，开发环境使用请求的协议
  const baseUrl = host.includes('localhost')
    ? `http://${host}`
    : `https://${host}`

  try {
    // Check privacy settings first
    const settingsResponse = await fetch(`${apiUrl}/settings`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    })

    if (settingsResponse.ok) {
      const settings = await settingsResponse.json()

      // If search engines are blocked, return empty sitemap
      if (settings.block_search_engines) {
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
          {
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
            },
          }
        )
      }
    }
  } catch (error) {
    console.error('Failed to fetch settings for sitemap:', error)
  }

  // Define supported locales
  const locales = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'hi']
  const defaultLocale = 'zh'

  const urls: string[] = []

  // Helper function to generate alternate links
  const generateAlternates = (getUrl: (locale: string) => string) => {
    return locales
      .map(loc => `<xhtml:link rel="alternate" hreflang="${loc}" href="${getUrl(loc)}" />`)
      .join('\n')
  }

  // Add home pages for each locale
  locales.forEach(locale => {
    const url = locale === defaultLocale
      ? `${baseUrl}/`
      : `${baseUrl}/${locale}/`

    const alternates = generateAlternates(loc =>
      loc === defaultLocale ? `${baseUrl}/` : `${baseUrl}/${loc}/`
    )

    urls.push(`<url>
<loc>${url}</loc>
${alternates}
<lastmod>${new Date().toISOString()}</lastmod>
<changefreq>daily</changefreq>
<priority>1</priority>
</url>`)
  })

  try {
    // Fetch articles
    const response = await fetch(`${apiUrl}/articles`, {
      headers: {
        'Accept': 'application/json',
      },
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
          const seoSlug = article.seo_slug
          const url = seoSlug
            ? (locale === defaultLocale
                ? `${baseUrl}/article/${seoSlug}`
                : `${baseUrl}/${locale}/article/${seoSlug}`)
            : (locale === defaultLocale
                ? `${baseUrl}/article/${article.id}`
                : `${baseUrl}/${locale}/article/${article.id}`)

          const alternates = generateAlternates(loc => {
            return seoSlug
              ? (loc === defaultLocale
                  ? `${baseUrl}/article/${seoSlug}`
                  : `${baseUrl}/${loc}/article/${seoSlug}`)
              : (loc === defaultLocale
                  ? `${baseUrl}/article/${article.id}`
                  : `${baseUrl}/${loc}/article/${article.id}`)
          })

          urls.push(`<url>
<loc>${url}</loc>
${alternates}
<lastmod>${new Date(article.updated_at || article.created_at).toISOString()}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`)
        })
      })
    }
  } catch (error) {
    console.error('Failed to fetch articles for sitemap:', error)
  }

  // Build the complete sitemap XML with correct namespaces
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
