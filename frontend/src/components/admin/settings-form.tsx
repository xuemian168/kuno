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
import { Settings, Save, RefreshCw, Globe, Check, Languages, Key, Info, Wand2, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { translationService, TranslationConfig, SUPPORTED_LANGUAGES, SupportedLanguage } from "@/services/translation"
import { languageManager } from "@/services/translation/language-manager"
import { Checkbox } from "@/components/ui/checkbox"

// Dynamic languages based on user configuration - will be set in component

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
    site_subtitle: "",
    footer_text: "",
    show_view_count: true
  })
  const [translations, setTranslations] = useState<SiteSettingsTranslation[]>([])
  const [activeTab, setActiveTab] = useState('general')
  const [translationConfig, setTranslationConfig] = useState<TranslationConfig>({
    provider: 'google-free',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    apiUrl: '',
    email: '',
    enabledLanguages: languageManager.getEnabledLanguages()
  })
  const [enabledLanguages, setEnabledLanguages] = useState<SupportedLanguage[]>(
    languageManager.getEnabledLanguages()
  )
  const [availableLanguages, setAvailableLanguages] = useState<{ code: string, name: string }[]>([])
  const [hasTranslationProvider, setHasTranslationProvider] = useState(false)
  const [translatingLanguage, setTranslatingLanguage] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      try {
        const settingsData = await apiClient.getSettings()
        setSettings(settingsData)
        setFormData({
          site_title: settingsData.site_title,
          site_subtitle: settingsData.site_subtitle,
          footer_text: settingsData.footer_text,
          show_view_count: settingsData.show_view_count ?? true
        })
        setTranslations(settingsData.translations || [])
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()

    // Load translation settings from localStorage
    const savedSettings = localStorage.getItem('blog_settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        if (parsed.translation) {
          setTranslationConfig(parsed.translation)
          translationService.configureFromSettings(parsed.translation)
          setHasTranslationProvider(!!parsed.translation.provider)
        }
      } catch (error) {
        console.error('Failed to load translation settings:', error)
      }
    }

    // Initialize translation service with default if none configured
    if (!translationService.isConfigured()) {
      const defaultConfig: TranslationConfig = {
        provider: 'google-free'
      }
      translationService.configureFromSettings(defaultConfig)
      setTranslationConfig(defaultConfig)
      setHasTranslationProvider(true)
    } else {
      setHasTranslationProvider(true)
    }
  }, [])

  // Update available languages when enabled languages change
  useEffect(() => {
    const languages = enabledLanguages.map(code => ({
      code,
      name: SUPPORTED_LANGUAGES[code] || code
    }))
    setAvailableLanguages(languages)
  }, [enabledLanguages])

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
        footer_text: formData.footer_text,
        show_view_count: formData.show_view_count,
        translations: allTranslations
      }

      const updatedSettings = await apiClient.updateSettings(settingsData)
      setSettings(updatedSettings)
      updateSettings(updatedSettings) // Update global settings

      // Save translation settings to localStorage
      const configWithLanguages = {
        ...translationConfig,
        enabledLanguages: enabledLanguages
      }
      const allSettings = {
        ...updatedSettings,
        translation: configWithLanguages
      }
      localStorage.setItem('blog_settings', JSON.stringify(allSettings))

      // Update language manager
      languageManager.setEnabledLanguages(enabledLanguages)

      // Configure translation service
      translationService.configureFromSettings(configWithLanguages)
      setHasTranslationProvider(translationService.isConfigured())

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
        site_subtitle: settings.site_subtitle,
        footer_text: settings.footer_text
      })
    }
  }

  const handleAutoTranslate = async (targetLanguage: string) => {
    if (!hasTranslationProvider || targetLanguage === 'zh') return

    setTranslatingLanguage(targetLanguage)
    try {
      // Translate site title
      if (formData.site_title.trim()) {
        const translatedTitle = await translationService.translate(
          formData.site_title,
          'zh',
          targetLanguage as SupportedLanguage
        )
        updateTranslation(targetLanguage, 'site_title', translatedTitle)
      }

      // Translate site subtitle
      if (formData.site_subtitle.trim()) {
        const translatedSubtitle = await translationService.translate(
          formData.site_subtitle,
          'zh',
          targetLanguage as SupportedLanguage
        )
        updateTranslation(targetLanguage, 'site_subtitle', translatedSubtitle)
      }
    } catch (error) {
      console.error('Translation failed:', error)
      alert('Translation failed. Please check your translation service configuration.')
    } finally {
      setTranslatingLanguage(null)
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
              {t('settings.manageSettings')}
            </p>
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {t('settings.savingSettings')}
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">{t('settings.generalSettings')}</TabsTrigger>
            <TabsTrigger value="translations" className="gap-2">
              <Globe className="h-4 w-4" />
              {t('settings.siteTranslations')}
            </TabsTrigger>
            <TabsTrigger value="languages" className="gap-2">
              <Languages className="h-4 w-4" />
              {t('settings.languages')}
            </TabsTrigger>
            <TabsTrigger value="translation-api" className="gap-2">
              <Key className="h-4 w-4" />
              {t('settings.translationAPI')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.siteInformation')}</CardTitle>
                <CardDescription>
                  {t('settings.siteInformationDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site_title">{t('settings.siteTitle')}</Label>
                  <Input
                    id="site_title"
                    value={formData.site_title}
                    onChange={(e) => handleChange('site_title', e.target.value)}
                    placeholder={t('settings.siteTitlePlaceholder')}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    {t('settings.siteTitleDesc')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site_subtitle">{t('settings.siteSubtitle')}</Label>
                  <Input
                    id="site_subtitle"
                    value={formData.site_subtitle}
                    onChange={(e) => handleChange('site_subtitle', e.target.value)}
                    placeholder={t('settings.siteSubtitlePlaceholder')}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t('settings.siteSubtitleDesc')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer_text">Footer Text</Label>
                  <Input
                    id="footer_text"
                    value={formData.footer_text}
                    onChange={(e) => handleChange('footer_text', e.target.value)}
                    placeholder="© 2025 xuemian168"
                  />
                  <p className="text-sm text-muted-foreground">
                    Custom footer text (GitHub author info will always be displayed)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show_view_count"
                      checked={formData.show_view_count}
                      onCheckedChange={(checked) => handleChange('show_view_count', checked)}
                    />
                    <Label htmlFor="show_view_count">Show Article View Count</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Display the number of unique visitors for each article
                  </p>
                </div>
              </CardContent>
            </Card>

            {settings && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.preview')}</CardTitle>
                  <CardDescription>{t('settings.previewDesc')}</CardDescription>
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
                            <Badge variant="secondary">{t('settings.defaultBadge')}</Badge>
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
                          {lang.code !== 'zh' && hasTranslationProvider && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAutoTranslate(lang.code)}
                              disabled={translatingLanguage === lang.code || !formData.site_title.trim()}
                              className="gap-1"
                            >
                              {translatingLanguage === lang.code ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Wand2 className="h-3 w-3" />
                              )}
                              {t('article.autoTranslate')}
                            </Button>
                          )}
                        </div>
                      </div>
                      <CardDescription>
                        {t('settings.configureSiteInfo', { language: lang.name })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('settings.siteTitle')} ({lang.name})</Label>
                        <Input
                          value={translation.site_title}
                          onChange={(e) => updateTranslation(lang.code, 'site_title', e.target.value)}
                          placeholder={t('settings.enterSiteTitleIn', { language: lang.name })}
                          disabled={lang.code === 'zh'}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.siteSubtitle')} ({lang.name})</Label>
                        <Input
                          value={translation.site_subtitle}
                          onChange={(e) => updateTranslation(lang.code, 'site_subtitle', e.target.value)}
                          placeholder={t('settings.enterSiteSubtitleIn', { language: lang.name })}
                          disabled={lang.code === 'zh'}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="languages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.languageConfiguration')}</CardTitle>
                <CardDescription>
                  {t('settings.languageConfigurationDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('validation.required')}:</strong> {t('settings.languageNote')}
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{t('settings.enabledLanguages', { count: enabledLanguages.length })}</h4>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEnabledLanguages(['zh', 'en'])}
                      >
                        {t('settings.resetToMinimal')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => languageManager.resetToDefaults()}
                      >
                        {t('settings.resetToDefault')}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                      <div key={code} className="flex items-center space-x-2">
                        <Checkbox
                          id={`lang-${code}`}
                          checked={enabledLanguages.includes(code as SupportedLanguage)}
                          disabled={code === 'zh' || code === 'en'} // Cannot disable required languages
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEnabledLanguages(prev => [...prev, code as SupportedLanguage])
                            } else {
                              setEnabledLanguages(prev => prev.filter(l => l !== code))
                            }
                          }}
                        />
                        <label
                          htmlFor={`lang-${code}`}
                          className={`text-sm cursor-pointer ${
                            code === 'zh' || code === 'en' ? 'font-medium text-primary' : ''
                          }`}
                        >
                          {name}
                          {(code === 'zh' || code === 'en') && (
                            <span className="ml-1 text-xs text-muted-foreground">{t('settings.required')}</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">{t('settings.quickSelection')}</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEnabledLanguages(['zh', 'en', 'ja', 'ko'])}
                      >
                        {t('settings.eastAsian')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEnabledLanguages(['zh', 'en', 'es', 'fr', 'de', 'it', 'pt'])}
                      >
                        {t('settings.european')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEnabledLanguages(['zh', 'en', 'hi', 'bn', 'ta', 'te', 'ml', 'kn', 'gu', 'pa', 'mr'])}
                      >
                        {t('settings.indian')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEnabledLanguages(['zh', 'en', 'ar', 'fa', 'ur', 'he', 'tr'])}
                      >
                        {t('settings.middleEast')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="translation-api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.translationAPIConfiguration')}</CardTitle>
                <CardDescription>
                  {t('settings.translationAPIDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {t('settings.apiConfigNote')}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>{t('settings.translationProvider')}</Label>
                  <Select
                    value={translationConfig.provider}
                    onValueChange={(value) => {
                      const newConfig = { ...translationConfig, provider: value as any }
                      setTranslationConfig(newConfig)
                      try {
                        translationService.configureFromSettings(newConfig)
                        setHasTranslationProvider(translationService.isConfigured())
                      } catch (error) {
                        console.error('Failed to configure translation service:', error)
                        setHasTranslationProvider(false)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google-free">Google Translate (Free)</SelectItem>
                      <SelectItem value="libretranslate">LibreTranslate (Free/Self-hosted)</SelectItem>
                      <SelectItem value="mymemory">MyMemory (Free)</SelectItem>
                      <SelectItem value="google">Google Translate (API Key)</SelectItem>
                      <SelectItem value="deepl">DeepL (API Key)</SelectItem>
                      <SelectItem value="openai">OpenAI ChatGPT (API Key)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {translationConfig.provider === 'google-free' && t('settings.googleFreeDesc')}
                    {translationConfig.provider === 'libretranslate' && t('settings.libretranslateDesc')}
                    {translationConfig.provider === 'mymemory' && t('settings.mymemoryDesc')}
                    {translationConfig.provider === 'google' && t('settings.googleDesc')}
                    {translationConfig.provider === 'deepl' && t('settings.deeplDesc')}
                    {translationConfig.provider === 'openai' && t('settings.openaiDesc')}
                  </p>
                </div>

                {/* API Key field - only show for providers that need it */}
                {['google', 'deepl', 'openai', 'libretranslate', 'mymemory'].includes(translationConfig.provider) && (
                  <div className="space-y-2">
                    <Label>{t('settings.apiKey')} {['libretranslate', 'mymemory'].includes(translationConfig.provider) && `(${t('settings.apiKeyOptional')})`}</Label>
                    <Input
                      type="password"
                      value={translationConfig.apiKey || ''}
                      onChange={(e) => {
                        const newConfig = { ...translationConfig, apiKey: e.target.value }
                        setTranslationConfig(newConfig)
                        try {
                          translationService.configureFromSettings(newConfig)
                          setHasTranslationProvider(translationService.isConfigured())
                        } catch (error) {
                          console.error('Failed to configure translation service:', error)
                        }
                      }}
                      placeholder={
                        translationConfig.provider === 'google' ? 'Enter your Google Cloud API key' :
                        translationConfig.provider === 'deepl' ? 'Enter your DeepL API key' :
                        translationConfig.provider === 'openai' ? 'Enter your OpenAI API key' :
                        translationConfig.provider === 'libretranslate' ? 'API key (if required by instance)' :
                        'API key for higher rate limits (optional)'
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      {translationConfig.provider === 'google' && (
                        <>Get your API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a></>
                      )}
                      {translationConfig.provider === 'deepl' && (
                        <>Get your API key from <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer" className="text-primary underline">DeepL Pro</a></>
                      )}
                      {translationConfig.provider === 'openai' && (
                        <>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenAI Platform</a></>
                      )}
                      {translationConfig.provider === 'libretranslate' && 'Some LibreTranslate instances require an API key'}
                      {translationConfig.provider === 'mymemory' && 'Optional - provides higher rate limits'}
                    </p>
                  </div>
                )}

                {/* LibreTranslate API URL */}
                {translationConfig.provider === 'libretranslate' && (
                  <div className="space-y-2">
                    <Label>{t('settings.apiURL')}</Label>
                    <Input
                      type="url"
                      value={translationConfig.apiUrl || ''}
                      onChange={(e) => {
                        const newConfig = { ...translationConfig, apiUrl: e.target.value }
                        setTranslationConfig(newConfig)
                        try {
                          translationService.configureFromSettings(newConfig)
                          setHasTranslationProvider(translationService.isConfigured())
                        } catch (error) {
                          console.error('Failed to configure translation service:', error)
                        }
                      }}
                      placeholder="https://libretranslate.com/translate"
                    />
                    <p className="text-sm text-muted-foreground">
                      Leave empty to use the public instance, or enter your self-hosted instance URL
                    </p>
                  </div>
                )}

                {/* MyMemory Email */}
                {translationConfig.provider === 'mymemory' && (
                  <div className="space-y-2">
                    <Label>{t('settings.email')}</Label>
                    <Input
                      type="email"
                      value={translationConfig.email || ''}
                      onChange={(e) => {
                        const newConfig = { ...translationConfig, email: e.target.value }
                        setTranslationConfig(newConfig)
                        try {
                          translationService.configureFromSettings(newConfig)
                          setHasTranslationProvider(translationService.isConfigured())
                        } catch (error) {
                          console.error('Failed to configure translation service:', error)
                        }
                      }}
                      placeholder="your-email@example.com"
                    />
                    <p className="text-sm text-muted-foreground">
                      Used for better rate limits and usage tracking
                    </p>
                  </div>
                )}

                {translationConfig.provider === 'openai' && (
                  <div className="space-y-2">
                    <Label>{t('settings.model')}</Label>
                    <Select
                      value={translationConfig.model || 'gpt-3.5-turbo'}
                      onValueChange={(value) => {
                        const newConfig = { ...translationConfig, model: value }
                        setTranslationConfig(newConfig)
                        try {
                          translationService.configureFromSettings(newConfig)
                          setHasTranslationProvider(translationService.isConfigured())
                        } catch (error) {
                          console.error('Failed to configure translation service:', error)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Economical)</SelectItem>
                        <SelectItem value="gpt-4">GPT-4 (High Quality)</SelectItem>
                        <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo (Balanced)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Choose the AI model for translation quality vs cost trade-off
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">{t('settings.apiStatus')}</h4>
                  {['google-free', 'libretranslate', 'mymemory'].includes(translationConfig.provider) ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      {t('settings.readyToUse')}
                    </Badge>
                  ) : translationConfig.apiKey ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      {t('settings.configured')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t('settings.apiKeyRequired')}</Badge>
                  )}
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="font-medium">{t('settings.providerComparison')}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>{t('settings.googleFreeItem')}</li>
                      <li>{t('settings.libretranslateItem')}</li>
                      <li>{t('settings.mymemoryItem')}</li>
                      <li>{t('settings.googleAPIItem')}</li>
                      <li>{t('settings.deeplItem')}</li>
                      <li>{t('settings.openaiItem')}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}