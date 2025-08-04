import type { Metadata } from "next";
import { notFound } from 'next/navigation'
import EmbedClient from './embed-client'
import { apiClient } from '@/lib/api'
import { generatePageMetadata } from '@/lib/metadata-utils'

interface EmbedPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ theme?: string; height?: string }>
}

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { id } = await params
  
  try {
    const article = await apiClient.getArticle(parseInt(id))
    
    return generatePageMetadata({
      locale: 'en', // Default locale for embed pages
      title: article.title,
      description: article.summary || '',
      canonical: `/embed/${id}`,
      includeRSS: false, // Embed pages don't need RSS
      robots: {
        index: true,
        follow: true,
      }
    })
  } catch (error) {
    return generatePageMetadata({
      locale: 'en',
      title: 'Article Not Found',
      canonical: `/embed/${id}`,
      includeRSS: false,
      robots: {
        index: false,
        follow: false,
      }
    })
  }
}

export default async function EmbedPage({ params, searchParams }: EmbedPageProps) {
  const { id } = await params
  const { theme, height } = await searchParams
  
  try {
    await apiClient.getArticle(parseInt(id))
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      notFound()
    }
  }
  
  return <EmbedClient id={id} theme={theme} height={height} />
}