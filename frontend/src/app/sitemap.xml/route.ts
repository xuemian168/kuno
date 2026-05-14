import { getApiUrl, getSiteUrl } from '@/lib/config'
import { buildLocalizedPath, getArticleAvailableLocales, getSiteAvailableLocales } from '@/lib/seo-locale-utils'

export const dynamic = 'force-dynamic'

type SiteSettingsResponse = {
  block_search_engines?: boolean
  default_language?: string
  translations?: Array<{
    language: string
    site_title?: string
    site_subtitle?: string
  }>
}

type SitemapArticle = {
  id: number | string
  seo_slug?: string
  default_lang?: string
  translations?: Array<{
    language: string
    title?: string
    summary?: string
    content?: string
  }>
  created_at: string
  updated_at?: string
}

function generateAlternateLinks(siteUrl: string, locales: string[], path: string): string {
  return locales
    .map((locale) => {
      const href = `${siteUrl}${buildLocalizedPath(path, locale)}`
      return `<xhtml:link rel="alternate" hreflang="${locale}" href="${href}" />`
    })
    .join('\n')
}

export async function GET() {
  const apiUrl = getApiUrl()
  const siteUrl = getSiteUrl()
  let siteSettings: SiteSettingsResponse | null = null

  try {
    const settingsResponse = await fetch(`${apiUrl}/settings`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })

    if (settingsResponse.ok) {
      const fetchedSettings = await settingsResponse.json() as SiteSettingsResponse | null
      siteSettings = fetchedSettings

      if (fetchedSettings?.block_search_engines) {
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

  const siteLocales = getSiteAvailableLocales(siteSettings)
  const urls: string[] = []

  siteLocales.forEach((locale) => {
    const path = buildLocalizedPath('/', locale)
    urls.push(`<url>
<loc>${siteUrl}${path}</loc>
${generateAlternateLinks(siteUrl, siteLocales, '/')}
<lastmod>${new Date().toISOString()}</lastmod>
<changefreq>daily</changefreq>
<priority>1</priority>
</url>`)
  })

  try {
    const response = await fetch(`${apiUrl}/articles`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })

    if (response.ok) {
      const articles: SitemapArticle[] = await response.json()
      const now = new Date()
      const publishedArticles = articles.filter((article) => new Date(article.created_at) <= now)

      publishedArticles.forEach((article) => {
        const articleIdentifier = article.seo_slug || article.id
        const articlePath = `/article/${articleIdentifier}`
        const articleLocales = getArticleAvailableLocales(article)
        const alternates = generateAlternateLinks(siteUrl, articleLocales, articlePath)

        articleLocales.forEach((locale) => {
          urls.push(`<url>
<loc>${siteUrl}${buildLocalizedPath(articlePath, locale)}</loc>
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
