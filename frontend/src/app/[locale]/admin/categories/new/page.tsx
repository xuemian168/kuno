"use client"

import { useState, useEffect } from "react"
import { CategoryForm } from "@/components/admin/category-form"

interface NewCategoryPageProps {
  params: Promise<{ locale: string }>
}

export default function NewCategoryPage({ params }: NewCategoryPageProps) {
  const [locale, setLocale] = useState<string>('zh')

  useEffect(() => {
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  return <CategoryForm locale={locale} />
}