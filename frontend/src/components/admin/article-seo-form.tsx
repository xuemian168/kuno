"use client"

import { useState } from "react"
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Search, Globe, Hash, Link } from "lucide-react"
import { Article } from "@/lib/api"

interface Translation {
  language: string
  title: string
  content: string
  summary: string
}

interface SEOData {
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  seo_slug?: string
}

interface ArticleSEOFormProps {
  article?: Article
  translations: Translation[]
  activeLanguage: string
  locale: string
  onSEOChange: (seoData: SEOData) => void
}

export function ArticleSEOForm({ 
  article, 
  translations, 
  activeLanguage, 
  locale,
  onSEOChange 
}: ArticleSEOFormProps) {
  const t = useTranslations()

  // Get current SEO data from article (global SEO fields)
  const currentSEO: SEOData = {
    seo_title: article?.seo_title || '',
    seo_description: article?.seo_description || '',
    seo_keywords: article?.seo_keywords || '',
    seo_slug: article?.seo_slug || ''
  }

  const handleSEOFieldChange = (field: keyof SEOData, value: string) => {
    const updatedSEO = { ...currentSEO, [field]: value }
    onSEOChange(updatedSEO)
  }

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          {t('seo.seoSettings')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SEO Title */}
        <div className="space-y-2">
          <Label htmlFor="seo-title" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('seo.seoTitle')}
          </Label>
          <Input
            id="seo-title"
            value={currentSEO.seo_title}
            onChange={(e) => handleSEOFieldChange('seo_title', e.target.value)}
            placeholder={t('seo.seoTitlePlaceholder')}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            {t('seo.seoTitleDescription')} ({currentSEO.seo_title?.length || 0}/60)
          </p>
        </div>

        {/* SEO Description */}
        <div className="space-y-2">
          <Label htmlFor="seo-description" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {t('seo.seoDescription')}
          </Label>
          <Textarea
            id="seo-description"
            value={currentSEO.seo_description}
            onChange={(e) => handleSEOFieldChange('seo_description', e.target.value)}
            placeholder={t('seo.seoDescriptionPlaceholder')}
            className="min-h-[100px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {t('seo.seoDescriptionDescription')} ({currentSEO.seo_description?.length || 0}/160)
          </p>
        </div>

        {/* SEO Keywords */}
        <div className="space-y-2">
          <Label htmlFor="seo-keywords" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            {t('seo.seoKeywords')}
          </Label>
          <Input
            id="seo-keywords"
            value={currentSEO.seo_keywords}
            onChange={(e) => handleSEOFieldChange('seo_keywords', e.target.value)}
            placeholder={t('seo.seoKeywordsPlaceholder')}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            {t('seo.seoKeywordsDescription')}
          </p>
        </div>

        {/* SEO Slug */}
        <div className="space-y-2">
          <Label htmlFor="seo-slug" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            {t('seo.seoSlug')}
          </Label>
          <div className="flex gap-2">
            <Input
              id="seo-slug"
              value={currentSEO.seo_slug}
              onChange={(e) => handleSEOFieldChange('seo_slug', e.target.value)}
              placeholder={t('seo.seoSlugPlaceholder')}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => {
                const translation = translations.find(t => t.language === activeLanguage)
                const title = translation?.title || article?.title || ''
                const slug = generateSlug(title)
                handleSEOFieldChange('seo_slug', slug)
              }}
              className="px-3 py-2 text-xs bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              {t('seo.generateSlug')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('seo.seoSlugDescription')}
          </p>
        </div>

        {/* SEO Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('seo.searchPreview')}</Label>
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="text-blue-600 text-lg font-medium truncate">
              {currentSEO.seo_title || t('seo.noTitle')}
            </div>
            <div className="text-green-600 text-sm truncate mt-1">
              example.com/article/{currentSEO.seo_slug || 'article-slug'}
            </div>
            <div className="text-gray-600 text-sm mt-2 line-clamp-2">
              {currentSEO.seo_description || t('seo.noDescription')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}