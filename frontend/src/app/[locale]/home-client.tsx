'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, ArrowRight, Eye, Rss, Pin } from 'lucide-react'
import { apiClient, Article, Category } from '@/lib/api'
import NextLink from 'next/link'
import { WebsiteStructuredData } from '@/components/seo/structured-data'
import { getBaseUrl } from '@/lib/utils'
import { PersonalizedRecommendations } from '@/components/recommendations'

interface HomePageClientProps {
  locale: string
}

export default function HomePageClient({ locale }: HomePageClientProps) {
  const t = useTranslations()
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [siteSettings, setSiteSettings] = useState<{ site_title: string; site_subtitle: string; show_view_count?: boolean } | null>(null)
  const [ragAvailable, setRagAvailable] = useState<boolean | null>(null)

  // Check RAG availability
  const checkRAGAvailability = async () => {
    try {
      const status = await apiClient.getRAGServiceStatus()
      setRagAvailable(status.rag_enabled)
    } catch (err) {
      console.error('Error checking RAG availability:', err)
      setRagAvailable(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [articlesData, categoriesData, settingsData] = await Promise.all([
          apiClient.getArticles({ categoryId: selectedCategory || undefined, lang: locale }),
          apiClient.getCategories({ lang: locale }),
          apiClient.getSettings({ lang: locale })
        ])
        setArticles(articlesData)
        setCategories(categoriesData)
        setSiteSettings(settingsData)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [locale, selectedCategory])

  // Check RAG availability on component mount
  useEffect(() => {
    checkRAGAvailability()
  }, [])

  const handleCategoryFilter = (categoryId: number | null) => {
    setSelectedCategory(categoryId)
  }

  const filteredArticles = selectedCategory
    ? articles.filter(article => article.category_id === selectedCategory)
    : articles

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    )
  }

  const baseUrl = getBaseUrl()
  const homeUrl = locale === 'zh' ? baseUrl : `${baseUrl}/${locale}`

  return (
    <div className="container mx-auto px-4 py-8">
      <WebsiteStructuredData 
        name={siteSettings?.site_title || t('site.title')}
        description={siteSettings?.site_subtitle || t('site.description')}
        url={homeUrl}
        locale={locale}
      />
        {/* Hero Section */}
        <section className="text-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
              {siteSettings?.site_title || t('site.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {siteSettings?.site_subtitle || t('site.description')}
            </p>
          </motion.div>
        </section>

        {/* Category Filter and RSS */}
        <section className="mb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge
                variant={selectedCategory === null ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => handleCategoryFilter(null)}
              >
                {t('media.all')}
              </Badge>
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => handleCategoryFilter(category.id)}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <NextLink href="/rss">
                <Button variant="outline" size="sm" className="gap-2">
                  <Rss className="h-4 w-4" />
                  {t('rss.subscribeToRSS')}
                </Button>
              </NextLink>
            </div>
          </div>
        </section>

        {/* Main Content: Conditional Layout based on RAG availability */}
        <div className={`grid grid-cols-1 gap-8 ${ragAvailable ? 'lg:grid-cols-4' : ''}`}>
          {/* Articles Section */}
          <section className={ragAvailable ? 'lg:col-span-3' : ''}>
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No articles found</p>
              </div>
            ) : (
              <div className={`grid gap-6 md:grid-cols-2 ${ragAvailable ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
                {filteredArticles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <NextLink href={`/${locale}/article/${article.id}`} className="block h-full">
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {article.is_pinned && (
                                <div className="bg-yellow-500 text-white rounded-full p-1 shadow-lg">
                                  <Pin className="h-3 w-3" />
                                </div>
                              )}
                              <Badge variant="secondary">{article.category.name}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {formatDate(article.created_at)}
                              </div>
                              {article.view_count !== undefined && siteSettings?.show_view_count !== false && (
                                <div className="flex items-center">
                                  <Eye className="h-4 w-4 mr-1" />
                                  {article.view_count}
                                </div>
                              )}
                            </div>
                          </div>
                          <CardTitle className="group-hover:text-primary transition-colors">
                            {article.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="mb-4">
                            {article.summary}
                          </CardDescription>
                          <div className="flex items-center text-primary font-medium">
                            {locale === 'zh' ? '阅读更多' : 'Read More'}
                            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </NextLink>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Recommendations Sidebar - Only render when RAG is available */}
          {ragAvailable && (
            <aside className="lg:col-span-1">
              <PersonalizedRecommendations 
                language={locale}
                maxRecommendations={1}
                showReason={true}
                className="sticky top-4"
              />
            </aside>
          )}
        </div>
    </div>
  )
}