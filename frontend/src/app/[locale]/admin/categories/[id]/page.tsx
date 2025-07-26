"use client"

import { useEffect, useState } from "react"
import { CategoryForm } from "@/components/admin/category-form"
import { apiClient, Category } from "@/lib/api"

interface EditCategoryPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default function EditCategoryPage({ params }: EditCategoryPageProps) {
  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [locale, setLocale] = useState<string>('zh')

  useEffect(() => {
    params.then(({ locale: paramLocale, id }) => {
      setLocale(paramLocale)
      
      const fetchCategory = async () => {
        try {
          const categoryId = parseInt(id)
          const categoryData = await apiClient.getCategory(categoryId)
          setCategory(categoryData)
        } catch (error) {
          console.error('Failed to fetch category:', error)
        } finally {
          setLoading(false)
        }
      }

      if (id) {
        fetchCategory()
      }
    })
  }, [params])

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading category...</p>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Category not found.</p>
      </div>
    )
  }

  return <CategoryForm category={category} isEditing locale={locale} />
}