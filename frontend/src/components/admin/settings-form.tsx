"use client"

import { useState, useEffect } from "react"
import { useTranslations } from 'next-intl'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { apiClient, SiteSettings, SiteSettingsTranslation } from "@/lib/api"
import { useSettings } from "@/contexts/settings-context"
import { Settings, Save, RefreshCw, Globe, Check } from "lucide-react"

const availableLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' }
]

interface SettingsFormProps {
  locale: string
}

export function SettingsForm({ locale }: SettingsFormProps) {
  const t = useTranslations()
  const { updateSettings } = useSettings()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [formData, setFormData] = useState({
    site_title: "",
    site_subtitle: ""
  })
  const [translations, setTranslations] = useState<SiteSettingsTranslation[]>([])
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      try {
        const settingsData = await apiClient.getSettings()
        setSettings(settingsData)
        setFormData({
          site_title: settingsData.site_title,
          site_subtitle: settingsData.site_subtitle
        })
        setTranslations(settingsData.translations || [])
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const getTranslation = (language: string) => {
    if (language === 'zh') {
      return {
        language: 'zh',
        site_title: formData.site_title,
        site_subtitle: formData.site_subtitle
      }
    }
    
    return translations.find(t => t.language === language) || {
      language,
      site_title: '',
      site_subtitle: ''
    }
  }

  const updateTranslation = (language: string, field: string, value: string) => {
    if (language === 'zh') {
      setFormData(prev => ({ ...prev, [field]: value }))
      return
    }

    setTranslations(prev => {
      const newTranslations = [...prev]
      const existingIndex = newTranslations.findIndex(t => t.language === language)
      
      if (existingIndex >= 0) {
        newTranslations[existingIndex] = {
          ...newTranslations[existingIndex],
          [field]: value
        }
      } else {
        newTranslations.push({
          language,
          site_title: field === 'site_title' ? value : '',
          site_subtitle: field === 'site_subtitle' ? value : ''
        })
      }
      
      return newTranslations
    })
  }

  const getProgress = (lang: string) => {
    const translation = getTranslation(lang)
    let completed = 0
    if (translation.site_title.trim()) completed++
    if (translation.site_subtitle.trim()) completed++
    return Math.round((completed / 2) * 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Collect all translations except default (zh)
      const allTranslations = translations.filter(t => 
        t.language !== 'zh' && (t.site_title.trim() || t.site_subtitle.trim())
      )

      const settingsData = {
        site_title: formData.site_title,
        site_subtitle: formData.site_subtitle,
        translations: allTranslations
      }

      const updatedSettings = await apiClient.updateSettings(settingsData)
      setSettings(updatedSettings)
      updateSettings(updatedSettings) // Update global settings
      alert('Settings updated successfully!')
    } catch (error) {
      console.error('Failed to update settings:', error)
      alert('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleReset = () => {
    if (settings) {
      setFormData({
        site_title: settings.site_title,
        site_subtitle: settings.site_subtitle
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading settings...</span>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              {t('admin.settings')}
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your site settings and translations
            </p>
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t('common.save')}
              </>
            )}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="translations" className="gap-2">
              <Globe className="h-4 w-4" />
              Translations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Site Information</CardTitle>
                <CardDescription>
                  Configure your site's basic information (Chinese - Default)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site_title">Site Title</Label>
                  <Input
                    id="site_title"
                    value={formData.site_title}
                    onChange={(e) => handleChange('site_title', e.target.value)}
                    placeholder="Enter site title"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    This will appear in the header and browser title.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site_subtitle">Site Subtitle</Label>
                  <Input
                    id="site_subtitle"
                    value={formData.site_subtitle}
                    onChange={(e) => handleChange('site_subtitle', e.target.value)}
                    placeholder="Enter site subtitle"
                  />
                  <p className="text-sm text-muted-foreground">
                    A brief description that appears on the homepage.
                  </p>
                </div>
              </CardContent>
            </Card>

            {settings && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>How your site information will appear</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-muted rounded-lg space-y-1">
                    <div className="font-bold text-lg">{formData.site_title || "Blog"}</div>
                    <div className="text-muted-foreground">{formData.site_subtitle || "A minimalist space for thoughts and ideas"}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="translations" className="space-y-6">
            <div className="grid gap-6">
              {availableLanguages.map((lang) => {
                const translation = getTranslation(lang.code)
                const progress = getProgress(lang.code)
                
                return (
                  <Card key={lang.code}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle>{lang.name}</CardTitle>
                          {lang.code === 'zh' && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                progress === 100 ? 'bg-green-500' : 
                                progress > 0 ? 'bg-yellow-500' : 'bg-muted'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {progress}%
                          </span>
                          {progress === 100 && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </div>
                      <CardDescription>
                        Configure site information for {lang.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Site Title ({lang.name})</Label>
                        <Input
                          value={translation.site_title}
                          onChange={(e) => updateTranslation(lang.code, 'site_title', e.target.value)}
                          placeholder={`Enter site title in ${lang.name}`}
                          disabled={lang.code === 'zh'}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Site Subtitle ({lang.name})</Label>
                        <Input
                          value={translation.site_subtitle}
                          onChange={(e) => updateTranslation(lang.code, 'site_subtitle', e.target.value)}
                          placeholder={`Enter site subtitle in ${lang.name}`}
                          disabled={lang.code === 'zh'}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}