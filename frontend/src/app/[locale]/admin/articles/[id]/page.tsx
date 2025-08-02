"use client"

import { useEffect, useState } from "react"
import { ArticleDiffEditor } from "@/components/admin/article-diff-editor"
import { apiClient, Article } from "@/lib/api"

interface EditArticlePageProps {
  params: Promise<{ locale: string; id: string }>
}

export default function EditArticlePage({ params }: EditArticlePageProps) {
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [locale, setLocale] = useState<string>('zh')

  useEffect(() => {
    params.then(({ locale: paramLocale, id }) => {
      setLocale(paramLocale)
      
      const fetchArticle = async () => {
        try {
          const articleId = parseInt(id)
          // Don't pass locale to get the original article data without translation applied
          const articleData = await apiClient.getArticle(articleId)
          setArticle(articleData)
        } catch (error) {
          console.error('Failed to fetch article:', error)
        } finally {
          setLoading(false)
        }
      }

      if (id) {
        fetchArticle()
      }
    })
  }, [params])

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading article...</p>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Article not found.</p>
      </div>
    )
  }

  return <ArticleDiffEditor article={article} isEditing locale={locale} />
}