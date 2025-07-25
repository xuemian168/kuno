"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Header from "@/components/layout/header"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"
import { apiClient, Article } from "@/lib/api"

export default function ArticlePage() {
  const params = useParams()
  const router = useRouter()
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
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading article...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Article not found.</p>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <article className="prose prose-neutral dark:prose-invert max-w-none">
            <div className="not-prose mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="outline">
                  {article.category.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(article.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                {article.title}
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8">
                {article.summary}
              </p>
              
              <Separator className="mb-8" />
            </div>

            {article.content_type === 'markdown' ? (
              <MarkdownRenderer content={article.content} />
            ) : (
              <div className="whitespace-pre-wrap">
                {article.content}
              </div>
            )}
          </article>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 pt-8 border-t"
          >
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(article.updated_at).toLocaleDateString()}
              </div>
              <Button 
                variant="outline" 
                onClick={() => router.push('/')}
              >
                Back to All Articles
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}