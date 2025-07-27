"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { SiteSettings, apiClient } from '@/lib/api'

interface SettingsContextType {
  settings: SiteSettings | null
  loading: boolean
  updateSettings: (newSettings: SiteSettings) => void
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>({
    id: 1,
    site_title: 'Blog',
    site_subtitle: 'A minimalist space for thoughts and ideas',
    footer_text: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  const [loading, setLoading] = useState(true)

  const fetchSettings = async () => {
    try {
      const settingsData = await apiClient.getSettings()
      setSettings(settingsData)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      // Fallback to default settings
      setSettings({
        id: 1,
        site_title: 'Blog',
        site_subtitle: 'A minimalist space for thoughts and ideas',
        footer_text: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const updateSettings = (newSettings: SiteSettings) => {
    setSettings(newSettings)
  }

  const refreshSettings = async () => {
    setLoading(true)
    await fetchSettings()
  }

  const value: SettingsContextType = {
    settings,
    loading,
    updateSettings,
    refreshSettings
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}