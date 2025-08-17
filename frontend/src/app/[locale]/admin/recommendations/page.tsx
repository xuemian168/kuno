'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import RecommendationManager from '@/components/admin/recommendation-manager'

interface RecommendationsPageProps {
  params: Promise<{ locale: string }>
}

export default function RecommendationsPage({ params }: RecommendationsPageProps) {
  const router = useRouter()
  const [locale, setLocale] = useState<string>('zh')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get locale from params
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!apiClient.isAuthenticated()) {
          router.push(`/${locale}/admin/login`)
          return
        }
        
        // Verify the token is still valid
        await apiClient.getCurrentUser()
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Authentication check failed:', error)
        router.push(`/${locale}/admin/login`)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, locale])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <RecommendationManager language={locale} />
}