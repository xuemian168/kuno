"use client"

import { useState, useEffect } from "react"
import { useTranslations } from 'next-intl'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { apiClient, Category } from "@/lib/api"
import { Rss, Copy, ExternalLink, Globe, Check } from "lucide-react"
// import { toast } from "sonner" // Not available, using alert instead

const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' }
]

interface RSSFeedsProps {
  locale: string
}

export function RSSFeeds({ locale }: RSSFeedsProps) {
  const t = useTranslations()
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState(locale)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await apiClient.getCategories()
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const getRSSUrl = (categoryId?: number) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
    const path = categoryId ? `/rss/category/${categoryId}` : '/rss'
    return `${baseUrl}${path}?lang=${selectedLanguage}`
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      alert(t('rss.rssLinkCopied'))
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      alert('Failed to copy link')
    }
  }

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <Rss className="h-6 w-6 animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
              <Rss className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
              {t('rss.rssFeeds')}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('rss.rssDescription')}
          </p>
        </div>

        {/* Language Selection */}
        <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
          <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-t-lg border-b border-blue-200 dark:border-blue-700 pt-6 pb-4 px-4 flex flex-col justify-center min-h-[80px]">
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Globe className="h-5 w-5" />
              {t('rss.availableLanguages')}
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              {t('rss.selectLanguage')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center gap-2">
                        <span>{lang.name}</span>
                        {lang.code === locale && (
                          <Badge variant="secondary" className="text-xs">
                            {t('settings.defaultBadge')}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="gap-1">
                <Check className="h-3 w-3" />
                {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* All Articles RSS */}
        <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
          <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 rounded-t-lg border-b border-green-200 dark:border-green-700 pt-6 pb-4 px-4 flex flex-col justify-center min-h-[80px]">
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <Rss className="h-5 w-5" />
              {t('rss.allArticles')}
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              {t('rss.rssForAllArticles')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-sm">
                <code className="flex-1">{getRSSUrl()}</code>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(getRSSUrl())}
                  variant="outline"
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {t('rss.copyRSSLink')}
                </Button>
                <Button
                  onClick={() => openInNewTab(getRSSUrl())}
                  variant="default"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('rss.openInReader')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category RSS Feeds */}
        {categories.length > 0 && (
          <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
            <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-t-lg border-b border-purple-200 dark:border-purple-700 pt-6 pb-4 px-4 flex flex-col justify-center min-h-[80px]">
              <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
                <Rss className="h-5 w-5" />
                {t('rss.categoryArticles')}
              </CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-300">
                {t('rss.rssDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-4">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">
                          分类 RSS
                        </Badge>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm font-mono">
                          <code className="flex-1">{getRSSUrl(category.id)}</code>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => copyToClipboard(getRSSUrl(category.id))}
                            variant="outline"
                            size="sm"
                            className="gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            {t('common.copy')}
                          </Button>
                          <Button
                            onClick={() => openInNewTab(getRSSUrl(category.id))}
                            variant="default"
                            size="sm"
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t('rss.openInReader')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* RSS Information */}
        <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
          <CardContent className="p-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <h3 className="font-semibold text-base text-foreground">{t('rss.aboutRSSFeeds')}</h3>
              <ul className="space-y-2">
                <li>• {t('rss.rssInfo1')}</li>
                <li>• {t('rss.rssInfo2')}</li>
                <li>• {t('rss.rssInfo3')}</li>
                <li>• {t('rss.rssInfo4')}</li>
                <li>• {t('rss.rssInfo5')}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}