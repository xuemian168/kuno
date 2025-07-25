'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, ArrowRight, Eye } from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { apiClient, Article, Category } from '@/lib/api'
import { Link } from '@/i18n/routing'
import NextLink from 'next/link'
import { WebsiteStructuredData } from '@/components/seo/structured-data'

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
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">{t('common.loading')}</div>
        </main>
        <Footer />
      </div>
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const homeUrl = locale === 'zh' ? baseUrl : `${baseUrl}/${locale}`

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WebsiteStructuredData 
        name={siteSettings?.site_title || t('site.title')}
        description={siteSettings?.site_subtitle || t('site.description')}
        url={homeUrl}
        locale={locale}
      />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {siteSettings?.site_title || t('site.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {siteSettings?.site_subtitle || t('site.description')}
            </p>
          </motion.div>
        </section>

        {/* Category Filter */}
        <section className="mb-8">
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
        </section>

        {/* Articles Grid */}
        <section>
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No articles found</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">{article.category.name}</Badge>
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
                      <NextLink href={`/${locale}/article/${article.id}`}>
                        <Button variant="ghost" className="w-full group-hover:bg-primary/10">
                          Read More
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </NextLink>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  )
}