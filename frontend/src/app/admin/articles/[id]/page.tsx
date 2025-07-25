"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArticleForm } from "@/components/admin/article-form"
import { apiClient, Article } from "@/lib/api"

export default function EditArticlePage() {
  const params = useParams()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const id = parseInt(params.id as string)
        const articleData = await apiClient.getArticle(id)
        setArticle(articleData)
      } catch (error) {
        console.error('Failed to fetch article:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchArticle()
    }
  }, [params.id])

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

  return <ArticleForm article={article} isEditing />
}