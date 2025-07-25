"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Plus, Edit, Trash2, Settings } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { apiClient, Article, Category } from "@/lib/api"

interface AdminPageProps {
  params: Promise<{ locale: string }>
}

export default function AdminPage({ params }: AdminPageProps) {
  const t = useTranslations()
  const [locale, setLocale] = useState<string>('zh')
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get locale from params
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesData, categoriesData] = await Promise.all([
          apiClient.getArticles({ lang: locale }),
          apiClient.getCategories({ lang: locale })
        ])
        setArticles(articlesData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [locale])

  const handleDeleteArticle = async (id: number) => {
    if (!confirm(t('common.confirm') + ' ' + t('common.delete') + ' article?')) return
    
    try {
      await apiClient.deleteArticle(id)
      setArticles(articles.filter(article => article.id !== id))
    } catch (error) {
      console.error('Failed to delete article:', error)
      alert('Failed to delete article')
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm(t('common.confirm') + ' ' + t('common.delete') + ' category?')) return
    
    try {
      await apiClient.deleteCategory(id)
      setCategories(categories.filter(category => category.id !== id))
    } catch (error) {
      console.error('Failed to delete category:', error)
      alert('Failed to delete category')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto"
    >
          <div className="text-center mb-12">
            <div className="flex justify-between items-center mb-6">
              <div></div>
              <Link href="/admin/settings">
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('admin.settings')}
                </Button>
              </Link>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              {t('admin.dashboard')}
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your blog content and categories
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin.articles')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{articles.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin.categories')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {articles.length > 0 ? new Date(Math.max(...articles.map(a => new Date(a.updated_at).getTime()))).toLocaleDateString() : 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Articles Management */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{t('admin.articles')}</h2>
              <Link href="/admin/articles/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('article.createArticle')}
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No articles found.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {articles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {article.category.name}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(article.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/admin/articles/${article.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteArticle(article.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-lg">{article.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {article.summary}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <Separator className="mb-8" />

          {/* Categories Management */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{t('admin.categories')}</h2>
              <Link href="/admin/categories/new">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('category.createCategory')}
                </Button>
              </Link>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No categories found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <div className="flex gap-2">
                            <Link href={`/admin/categories/${category.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {category.description && (
                          <CardDescription>
                            {category.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
    </motion.div>
  )
}