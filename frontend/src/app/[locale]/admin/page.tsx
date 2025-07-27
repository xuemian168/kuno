"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Plus, Edit, Trash2, Settings, Eye, BarChart3, Download, Check, X } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { apiClient, Article, Category } from "@/lib/api"
import { WordPressImport } from "@/components/admin/wordpress-import"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useThrottle } from "@/hooks/use-debounce"

interface AdminPageProps {
  params: Promise<{ locale: string }>
}

export default function AdminPage({ params }: AdminPageProps) {
  const t = useTranslations()
  const [locale, setLocale] = useState<string>('zh')
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportingArticles, setExportingArticles] = useState<Set<number>>(new Set())
  const [bulkExporting, setBulkExporting] = useState(false)
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type: 'article' | 'category' | 'bulk'
    item?: Article | Category
    articleIds?: number[]
  }>({
    open: false,
    type: 'article'
  })
  const [deleting, setDeleting] = useState(false)

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

  const handleDeleteArticle = (article: Article) => {
    setDeleteDialog({
      open: true,
      type: 'article',
      item: article
    })
  }

  const handleDeleteCategory = (category: Category) => {
    setDeleteDialog({
      open: true,
      type: 'category',
      item: category
    })
  }

  const handleExportAll = async () => {
    // Prevent multiple simultaneous exports
    if (exporting) return
    
    try {
      setExporting(true)
      await apiClient.exportAllArticles({ lang: locale })
    } catch (error) {
      console.error('Failed to export articles:', error)
      alert(locale === 'zh' ? '导出失败' : 'Failed to export articles')
    } finally {
      setExporting(false)
    }
  }

  const handleExportArticle = async (articleId: number) => {
    // Prevent exporting the same article multiple times
    if (exportingArticles.has(articleId)) return
    
    try {
      setExportingArticles(prev => new Set([...prev, articleId]))
      await apiClient.exportArticle(articleId, { lang: locale })
    } catch (error) {
      console.error('Failed to export article:', error)
      alert(locale === 'zh' ? '导出失败' : 'Failed to export article')
    } finally {
      setExportingArticles(prev => {
        const newSet = new Set(prev)
        newSet.delete(articleId)
        return newSet
      })
    }
  }

  const handleImportComplete = async () => {
    // Refresh data after import
    setLoading(true)
    try {
      const [articlesData, categoriesData] = await Promise.all([
        apiClient.getArticles({ lang: locale }),
        apiClient.getCategories({ lang: locale })
      ])
      setArticles(articlesData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to refresh data after import:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectArticle = (articleId: number, checked: boolean) => {
    const newSelection = new Set(selectedArticles)
    if (checked) {
      newSelection.add(articleId)
    } else {
      newSelection.delete(articleId)
    }
    setSelectedArticles(newSelection)
  }

  const handleSelectAll = () => {
    if (selectedArticles.size === articles.length) {
      setSelectedArticles(new Set())
    } else {
      setSelectedArticles(new Set(articles.map(a => a.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedArticles.size === 0) return
    
    setDeleteDialog({
      open: true,
      type: 'bulk',
      articleIds: Array.from(selectedArticles)
    })
  }

  const handleBulkExport = async () => {
    if (selectedArticles.size === 0 || bulkExporting) return
    
    try {
      setBulkExporting(true)
      const articleIds = Array.from(selectedArticles)
      await apiClient.exportArticles({ articleIds: articleIds, lang: locale })
      setSelectedArticles(new Set())
    } catch (error) {
      console.error('Failed to export articles:', error)
      alert(locale === 'zh' ? '批量导出失败' : 'Failed to export articles')
    } finally {
      setBulkExporting(false)
    }
  }

  // Create throttled export functions to prevent rapid clicking
  const throttledExportAll = useThrottle(handleExportAll, 2000)
  const throttledBulkExport = useThrottle(handleBulkExport, 2000)
  const throttledExportArticle = useThrottle(handleExportArticle, 1000)

  const handleConfirmDelete = async () => {
    setDeleting(true)
    
    try {
      if (deleteDialog.type === 'article' && deleteDialog.item) {
        const article = deleteDialog.item as Article
        await apiClient.deleteArticle(article.id)
        setArticles(articles.filter(a => a.id !== article.id))
        
        // Clear selection if deleted article was selected
        if (selectedArticles.has(article.id)) {
          const newSelection = new Set(selectedArticles)
          newSelection.delete(article.id)
          setSelectedArticles(newSelection)
        }
      } else if (deleteDialog.type === 'category' && deleteDialog.item) {
        const category = deleteDialog.item as Category
        await apiClient.deleteCategory(category.id)
        setCategories(categories.filter(c => c.id !== category.id))
      } else if (deleteDialog.type === 'bulk' && deleteDialog.articleIds) {
        // Delete articles one by one
        const deletePromises = deleteDialog.articleIds.map(id => 
          apiClient.deleteArticle(id).catch(err => {
            console.error(`Failed to delete article ${id}:`, err)
            return { error: true, id }
          })
        )
        
        await Promise.all(deletePromises)
        
        // Remove deleted articles from the list
        setArticles(articles.filter(article => !deleteDialog.articleIds!.includes(article.id)))
        setSelectedArticles(new Set())
      }
      
      // Close dialog
      setDeleteDialog({ open: false, type: 'article' })
    } catch (error) {
      console.error('Failed to delete:', error)
      alert(locale === 'zh' ? '删除失败' : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const getDeleteDialogInfo = () => {
    if (deleteDialog.type === 'article' && deleteDialog.item) {
      const article = deleteDialog.item as Article
      return {
        title: locale === 'zh' ? '删除文章' : 'Delete Article',
        description: locale === 'zh' 
          ? '此操作将永久删除这篇文章。删除后无法恢复，请谨慎操作。' 
          : 'This action will permanently delete this article. This cannot be undone.',
        itemName: article.title
      }
    } else if (deleteDialog.type === 'category' && deleteDialog.item) {
      const category = deleteDialog.item as Category
      return {
        title: locale === 'zh' ? '删除分类' : 'Delete Category',
        description: locale === 'zh' 
          ? '此操作将永久删除这个分类。删除后无法恢复，请谨慎操作。' 
          : 'This action will permanently delete this category. This cannot be undone.',
        itemName: category.name
      }
    } else if (deleteDialog.type === 'bulk' && deleteDialog.articleIds) {
      return {
        title: locale === 'zh' ? '批量删除文章' : 'Bulk Delete Articles',
        description: locale === 'zh' 
          ? `此操作将永久删除 ${deleteDialog.articleIds.length} 篇文章。删除后无法恢复，请谨慎操作。` 
          : `This action will permanently delete ${deleteDialog.articleIds.length} articles. This cannot be undone.`,
        itemName: locale === 'zh' 
          ? `${deleteDialog.articleIds.length} 篇文章` 
          : `${deleteDialog.articleIds.length} articles`
      }
    }
    
    return {
      title: locale === 'zh' ? '确认删除' : 'Confirm Delete',
      description: locale === 'zh' ? '此操作无法撤销。' : 'This action cannot be undone.',
      itemName: ''
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
              {t('admin.manageBlogContent')}
            </p>
          </div>

          {/* Export Status */}
          {(exporting || bulkExporting || exportingArticles.size > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {exporting && (locale === 'zh' ? '正在导出所有文章...' : 'Exporting all articles...')}
                  {bulkExporting && (locale === 'zh' ? '正在批量导出文章...' : 'Bulk exporting articles...')}
                  {exportingArticles.size > 0 && !exporting && !bulkExporting && 
                    (locale === 'zh' 
                      ? `正在导出 ${exportingArticles.size} 篇文章...` 
                      : `Exporting ${exportingArticles.size} article${exportingArticles.size > 1 ? 's' : ''}...`
                    )
                  }
                </div>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                {locale === 'zh' 
                  ? '请等待当前导出完成，避免重复点击' 
                  : 'Please wait for current export to complete, avoid repeated clicks'
                }
              </p>
            </motion.div>
          )}

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
                <CardTitle className="text-sm font-medium">{t('analytics.totalViews')}</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {articles.reduce((total, article) => total + (article.view_count || 0), 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Articles Management */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{t('admin.articles')}</h2>
              <div className="flex gap-2">
                <Link href="/admin/analytics">
                  <Button variant="outline">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    {t('analytics.title')}
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={throttledExportAll}
                  disabled={exporting}
                >
                  {exporting ? (
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {exporting ? t('export.exporting') : t('export.exportAll')}
                </Button>
                <Link href="/admin/articles/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('article.createArticle')}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedArticles.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-muted rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {selectedArticles.size} {selectedArticles.size === 1 ? t('common.article') : t('common.articles')} {t('common.selected')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedArticles(new Set())}
                    className="gap-1"
                  >
                    <X className="h-3 w-3" />
                    {t('common.clearSelection')}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={throttledBulkExport}
                    disabled={bulkExporting}
                  >
                    {bulkExporting ? (
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {bulkExporting ? t('export.exporting') : t('common.exportSelected')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {bulkDeleting ? t('common.deleting') + '...' : t('common.deleteSelected')}
                  </Button>
                </div>
              </motion.div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('admin.noArticlesFound')}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Select All Checkbox */}
                {articles.length > 0 && (
                  <div className="flex items-center gap-2 pb-2">
                    <Checkbox
                      checked={selectedArticles.size === articles.length && articles.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">{t('common.selectAll')}</span>
                  </div>
                )}
                {articles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className={selectedArticles.has(article.id) ? 'ring-2 ring-primary' : ''}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedArticles.has(article.id)}
                              onCheckedChange={(checked) => handleSelectArticle(article.id, checked as boolean)}
                            />
                            <Badge variant="outline">
                              {article.category.name}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(article.created_at).toLocaleDateString()}
                            </span>
                            {article.view_count !== undefined && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Eye className="h-3 w-3" />
                                {article.view_count}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => throttledExportArticle(article.id)}
                              disabled={exportingArticles.has(article.id)}
                              title={t('export.exportAsMarkdown')}
                            >
                              {exportingArticles.has(article.id) ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <Link href={`/admin/articles/${article.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteArticle(article)}
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

          {/* WordPress Import */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{t('import.contentImport')}</h2>
            <WordPressImport onImportComplete={handleImportComplete} />
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
                <p className="text-muted-foreground">{t('admin.noCategoriesFound')}</p>
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
                              onClick={() => handleDeleteCategory(category)}
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

          {/* Delete Confirmation Dialog */}
          <DeleteConfirmationDialog
            open={deleteDialog.open}
            onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
            onConfirm={handleConfirmDelete}
            title={getDeleteDialogInfo().title}
            description={getDeleteDialogInfo().description}
            itemName={getDeleteDialogInfo().itemName}
            confirmText="delete"
            loading={deleting}
            locale={locale}
          />
    </motion.div>
  )
}