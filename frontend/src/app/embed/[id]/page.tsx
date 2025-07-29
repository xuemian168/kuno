import type { Metadata } from "next";
import { notFound } from 'next/navigation'
import EmbedClient from './embed-client'
import { apiClient } from '@/lib/api'

interface EmbedPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ theme?: string; height?: string }>
}

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { id } = await params
  
  try {
    const article = await apiClient.getArticle(parseInt(id))
    
    return {
      title: article.title,
      description: article.summary || '',
      robots: {
        index: true,
        follow: true,
      },
    }
  } catch (error) {
    return {
      title: 'Article Not Found',
      robots: {
        index: false,
        follow: false,
      },
    }
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