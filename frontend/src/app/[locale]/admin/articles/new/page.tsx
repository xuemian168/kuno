"use client"

import { useState, useEffect } from "react"
import { ArticleDiffEditor } from "@/components/admin/article-diff-editor"

interface NewArticlePageProps {
  params: Promise<{ locale: string }>
}

export default function NewArticlePage({ params }: NewArticlePageProps) {
  const [locale, setLocale] = useState<string>('zh')

  useEffect(() => {
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  return <ArticleDiffEditor locale={locale} />
}