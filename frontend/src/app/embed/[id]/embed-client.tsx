'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer'
import '../embed.css'

interface EmbedClientProps {
  id: string
  theme?: string
  height?: string
}

export default function EmbedClient({ id, theme = 'light', height }: EmbedClientProps) {
  const [article, setArticle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const data = await apiClient.getArticle(parseInt(id))
        setArticle(data)
      } catch (err) {
        setError('Failed to load article')
        console.error('Error fetching article:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [id])

  useEffect(() => {
    // Send height to parent window
    const sendHeight = () => {
      const height = document.documentElement.scrollHeight
      window.parent.postMessage({ type: 'resize', height }, '*')
    }

    // Send height on load and resize
    sendHeight()
    window.addEventListener('resize', sendHeight)
    
    // Observe content changes
    const observer = new ResizeObserver(sendHeight)
    observer.observe(document.body)

    return () => {
      window.removeEventListener('resize', sendHeight)
      observer.disconnect()
    }
  }, [article])

  useEffect(() => {
    // Apply theme to html element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] bg-white dark:bg-gray-900">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="flex items-center justify-center min-h-[200px] bg-white dark:bg-gray-900">
        <div className="text-red-500 dark:text-red-400">{error || 'Article not found'}</div>
      </div>
    )
  }

  return (
    <div className="embed-container p-4 md:p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" style={{ minHeight: height || 'auto' }}>
        <article className="prose dark:prose-invert max-w-none">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{article.title}</h1>
          
          {article.created_at && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {new Date(article.created_at).toLocaleDateString()}
            </div>
          )}

          <MarkdownRenderer content={article.content} />
          
          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            <a 
              href={`/article/${id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Read on original site →
            </a>
          </div>
        </article>
      </div>
  )
}