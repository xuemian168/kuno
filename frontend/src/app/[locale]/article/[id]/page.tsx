import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server'
import ArticlePageClient from './article-client'
import { apiClient } from '@/lib/api'

interface ArticlePageProps {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id, locale } = await params
  const t = await getTranslations({ locale })
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  try {
    const article = await apiClient.getArticle(parseInt(id), locale)
    
    // Get site settings for site title
    let siteTitle = t('site.title')
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/settings?lang=${locale}`)
      if (response.ok) {
        const settings = await response.json()
        siteTitle = settings.site_title || siteTitle
      }
    } catch (error) {
      // Use fallback title
    }
    
    // Generate alternate language links for article
    const languages: Record<string, string> = {}
    const { routing } = await import('@/i18n/routing')
    routing.locales.forEach(loc => {
      const articleUrl = loc === routing.defaultLocale 
        ? `${baseUrl}/article/${id}` 
        : `${baseUrl}/${loc}/article/${id}`
      languages[loc] = articleUrl
    })
    
    const articleTitle = `${article.title} - ${siteTitle}`
    const articleUrl = locale === routing.defaultLocale 
      ? `${baseUrl}/article/${id}` 
      : `${baseUrl}/${locale}/article/${id}`
    
    // Extract media from article content for richer metadata
    const extractMediaFromContent = (content: string) => {
      const images: string[] = []
      const videos: { url: string; platform: 'youtube' | 'bilibili' }[] = []
      
      // Extract YouTube videos
      const youtubeMatches = content.match(/<YouTubeEmbed\s+url="([^"]+)"/g)
      if (youtubeMatches) {
        youtubeMatches.forEach(match => {
          const urlMatch = match.match(/url="([^"]+)"/)
          if (urlMatch) {
            const videoId = urlMatch[1].match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
            if (videoId) {
              images.push(`https://img.youtube.com/vi/${videoId[1]}/maxresdefault.jpg`)
              videos.push({ url: urlMatch[1], platform: 'youtube' })
            }
          }
        })
      }
      
      // Extract Bilibili videos
      const bilibiliMatches = content.match(/<BiliBiliEmbed\s+url="([^"]+)"/g)
      if (bilibiliMatches) {
        bilibiliMatches.forEach(match => {
          const urlMatch = match.match(/url="([^"]+)"/)
          if (urlMatch) {
            videos.push({ url: urlMatch[1], platform: 'bilibili' })
          }
        })
      }
      
      return { images, videos }
    }
    
    const { images } = extractMediaFromContent(article.content)
    
    return {
      title: articleTitle,
      description: article.summary || t('site.description'),
      metadataBase: new URL(baseUrl),
      alternates: {
        canonical: locale === routing.defaultLocale ? `/article/${id}` : `/${locale}/article/${id}`,
        languages,
      },
      openGraph: {
        title: articleTitle,
        description: article.summary || t('site.description'),
        url: articleUrl,
        siteName: siteTitle,
        locale: locale,
        type: 'article',
        authors: [siteTitle],
        publishedTime: article.created_at,
        modifiedTime: article.updated_at,
        ...(images.length > 0 && { images: images.slice(0, 4) }), // Limit to 4 images
      },
      twitter: {
        card: images.length > 0 ? 'summary_large_image' : 'summary',
        title: articleTitle,
        description: article.summary || t('site.description'),
        ...(images.length > 0 && { images: images[0] }),
      },
      robots: {
        index: true,
        follow: true,
      },
    }
  } catch (error) {
    const fallbackTitle = t('site.articleTitle')
    const fallbackUrl = locale === routing.defaultLocale 
      ? `${baseUrl}/article/${id}` 
      : `${baseUrl}/${locale}/article/${id}`
    
    return {
      title: fallbackTitle,
      description: t('site.description'),
      metadataBase: new URL(baseUrl),
      alternates: {
        canonical: locale === routing.defaultLocale ? `/article/${id}` : `/${locale}/article/${id}`,
      },
      openGraph: {
        title: fallbackTitle,
        description: t('site.description'),
        url: fallbackUrl,
        locale: locale,
        type: 'article',
      },
      robots: {
        index: false, // Don't index if article can't be found
        follow: true,
      },
    }
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id, locale } = await params
  
  return <ArticlePageClient id={id} locale={locale} />
}