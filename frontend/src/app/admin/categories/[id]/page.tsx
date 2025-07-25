"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CategoryForm } from "@/components/admin/category-form"
import { apiClient, Category } from "@/lib/api"

export default function EditCategoryPage() {
  const params = useParams()
  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const id = parseInt(params.id as string)
        const categoryData = await apiClient.getCategory(id)
        setCategory(categoryData)
      } catch (error) {
        console.error('Failed to fetch category:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchCategory()
    }
  }, [params.id])

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

  return <CategoryForm category={category} isEditing />
}