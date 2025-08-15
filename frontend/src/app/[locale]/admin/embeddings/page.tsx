"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Brain } from "lucide-react"
import { Link } from '@/i18n/routing'
import { Button } from "@/components/ui/button"
import { EmbeddingManager } from "@/components/admin/embedding-manager"

interface EmbeddingsPageProps {
  params: Promise<{ locale: string }>
}

export default function EmbeddingsPage({ params }: EmbeddingsPageProps) {
  const [locale, setLocale] = useState<string>('zh')

  useEffect(() => {
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {locale === 'zh' ? '返回' : 'Back'}
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold">
                {locale === 'zh' ? 'RAG知识库管理' : 'RAG Knowledge Base'}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {locale === 'zh' 
                ? '管理AI向量化和语义搜索功能，提供全面的可视化分析工具' 
                : 'Manage AI vectorization and semantic search with comprehensive visualization tools'}
            </p>
          </div>
        </div>
      </div>

      {/* Embedding Manager with RAG Visualization */}
      <EmbeddingManager />
    </motion.div>
  )
}