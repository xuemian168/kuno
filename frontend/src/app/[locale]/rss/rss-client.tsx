'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RSSFeeds } from '@/components/rss/rss-feeds'
import { apiClient } from '@/lib/api'

interface RSSPageClientProps {
  locale: string
}

export default function RSSPageClient({ locale }: RSSPageClientProps) {
  const t = useTranslations()
  const [loading, setLoading] = useState(true)
  const [siteSettings, setSiteSettings] = useState<{ site_title: string; site_subtitle: string } | null>(null)

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        setLoading(true)
        const settingsData = await apiClient.getSettings({ lang: locale })
        setSiteSettings(settingsData)
      } catch (error) {
        console.error('Failed to fetch site settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSiteSettings()
  }, [locale])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* RSS Feeds Component */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <RSSFeeds locale={locale} />
      </motion.div>
    </div>
  )
}