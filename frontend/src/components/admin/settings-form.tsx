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
import { Settings, Save, RefreshCw, Globe, Check, Languages, Key, Info, Wand2, Loader2, Eye, EyeOff, Shield, Lock, Share2, Upload, Image, Star, Volume2, VolumeX, HelpCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { translationService, TranslationConfig, SUPPORTED_LANGUAGES, SupportedLanguage } from "@/services/translation"
import { languageManager } from "@/services/translation/language-manager"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { SocialMediaManager } from "@/components/admin/social-media-manager"
import { getFullApiUrl } from "@/lib/utils"
import { setSoundEnabled } from "@/lib/sound"
import { NotificationDialog, useNotificationDialog } from "@/components/ui/notification-dialog"
import { AboutDialog } from "@/components/admin/about-dialog"
import { UpdateChecker } from "@/components/admin/update-checker"

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
    show_view_count: true,
    enable_sound_effects: true
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
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordChanging, setPasswordChanging] = useState(false)

  // File upload state
  const [logoUploading, setLogoUploading] = useState(false)
  const [faviconUploading, setFaviconUploading] = useState(false)
  
  // Notification dialog
  const notification = useNotificationDialog()
  
  // About dialog state
  const [showAboutDialog, setShowAboutDialog] = useState(false)

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
          show_view_count: settingsData.show_view_count ?? true,
          enable_sound_effects: settingsData.enable_sound_effects ?? true
        })
        setTranslations(settingsData.translations || [])
        
        // Sync sound settings to localStorage
        setSoundEnabled(settingsData.enable_sound_effects ?? true)
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
        enable_sound_effects: formData.enable_sound_effects,
        logo_url: settings?.logo_url || '',
        favicon_url: settings?.favicon_url || '',
        translations: allTranslations
      }

      const updatedSettings = await apiClient.updateSettings(settingsData)
      setSettings(updatedSettings)
      updateSettings(updatedSettings) // Update global settings
      
      // Update localStorage for sound effects
      setSoundEnabled(updatedSettings.enable_sound_effects ?? true)

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

      notification.showSuccess(
        locale === 'zh' ? '设置保存成功！' : 'Settings Updated Successfully!',
        locale === 'zh' ? '您的设置已成功保存并应用。' : 'Your settings have been saved and applied successfully.'
      )
    } catch (error) {
      console.error('Failed to update settings:', error)
      notification.showError(
        locale === 'zh' ? '保存失败' : 'Save Failed',
        locale === 'zh' ? '设置保存失败，请稍后重试。' : 'Failed to save settings. Please try again later.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Update sound settings immediately when changed
    if (field === 'enable_sound_effects') {
      setSoundEnabled(value as boolean)
    }
  }

  const handleReset = () => {
    if (settings) {
      setFormData({
        site_title: settings.site_title,
        site_subtitle: settings.site_subtitle,
        footer_text: settings.footer_text,
        show_view_count: settings.show_view_count ?? true,
        enable_sound_effects: settings.enable_sound_effects ?? true
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
      notification.showError(
        locale === 'zh' ? '翻译失败' : 'Translation Failed',
        locale === 'zh' ? '自动翻译失败，请检查翻译服务配置。' : 'Translation failed. Please check your translation service configuration.'
      )
    } finally {
      setTranslatingLanguage(null)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (passwordForm.newPassword.length < 6) {
      alert(t('settings.passwordMinLength'))
      return
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert(t('settings.passwordMismatch'))
      return
    }
    
    setPasswordChanging(true)
    try {
      await apiClient.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      notification.showSuccess(
        locale === 'zh' ? '密码修改成功！' : 'Password Changed Successfully!',
        locale === 'zh' ? '您的密码已成功修改。' : 'Your password has been changed successfully.'
      )
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      console.error('Password change failed:', error)
      notification.showError(
        locale === 'zh' ? '密码修改失败' : 'Password Change Failed',
        locale === 'zh' ? '密码修改失败，请检查当前密码是否正确。' : 'Password change failed. Please check if your current password is correct.'
      )
    } finally {
      setPasswordChanging(false)
    }
  }

  const handlePasswordFormChange = (field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLogoUploading(true)
    try {
      const response = await apiClient.uploadLogo(file)
      if (settings) {
        const updatedSettings = { ...settings, logo_url: response.url }
        setSettings(updatedSettings)
        updateSettings(updatedSettings)
      }
      notification.showSuccess(
        locale === 'zh' ? 'Logo上传成功！' : 'Logo Uploaded Successfully!',
        locale === 'zh' ? '您的Logo已成功上传并应用。' : 'Your logo has been uploaded and applied successfully.'
      )
    } catch (error: any) {
      console.error('Logo upload failed:', error)
      notification.showError(
        locale === 'zh' ? 'Logo上传失败' : 'Logo Upload Failed',
        locale === 'zh' ? 'Logo上传失败，请检查文件格式和大小。' : 'Logo upload failed. Please check file format and size.'
      )
    } finally {
      setLogoUploading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFaviconUploading(true)
    try {
      const response = await apiClient.uploadFavicon(file)
      if (settings) {
        const updatedSettings = { ...settings, favicon_url: response.url }
        setSettings(updatedSettings)
        updateSettings(updatedSettings)
      }
      notification.showSuccess(
        locale === 'zh' ? 'Favicon上传成功！' : 'Favicon Uploaded Successfully!',
        locale === 'zh' ? '您的Favicon已成功上传并应用。' : 'Your favicon has been uploaded and applied successfully.'
      )
    } catch (error: any) {
      console.error('Favicon upload failed:', error)
      notification.showError(
        locale === 'zh' ? 'Favicon上传失败' : 'Favicon Upload Failed',
        locale === 'zh' ? 'Favicon上传失败，请检查文件格式和大小。' : 'Favicon upload failed. Please check file format and size.'
      )
    } finally {
      setFaviconUploading(false)
      // Reset file input
      event.target.value = ''
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
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 dark:from-violet-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 border border-violet-200 dark:border-violet-800">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-cyan-500/10 opacity-60"></div>
          <div className="relative p-8 flex items-center justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg">
                    <Settings className="h-8 w-8 text-white" />
                  </div>
{t('settings.systemSettings')}
                </h1>
                <Button
                  variant="ghost"
                  onClick={() => setShowAboutDialog(true)}
                  className="gap-2 text-violet-600 hover:text-violet-700 hover:bg-violet-100 dark:text-violet-400 dark:hover:text-violet-300 dark:hover:bg-violet-950/30"
                >
                  <HelpCircle className="h-5 w-5" />
                  {locale === 'zh' ? '关于' : 'About'}
                </Button>
              </div>
              <p className="text-muted-foreground mt-3 text-lg">
                {t('settings.configureBlogSystem')}
              </p>
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={saving} 
              className="gap-2 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 text-base"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {t('settings.saveSettings')}
                </>
              )}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 gap-2"
            >
              <Settings className="h-4 w-4" />
              {t('settings.basicSettings')}
            </TabsTrigger>
            <TabsTrigger 
              value="translations" 
              className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <Globe className="h-4 w-4" />
              {locale === 'zh' ? '翻译设置' : 'Translation'}
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <Shield className="h-4 w-4" />
              {t('settings.security')}
            </TabsTrigger>
            <TabsTrigger 
              value="social" 
              className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <Share2 className="h-4 w-4" />
              {t('settings.socialMedia')}
            </TabsTrigger>
            <TabsTrigger 
              value="system" 
              className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <Info className="h-4 w-4" />
              {locale === 'zh' ? '系统信息' : 'System'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
              <CardHeader className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 border-b border-emerald-200 dark:border-emerald-700 pt-6 pb-4 px-4 rounded-t-lg flex flex-col justify-center min-h-[80px]">
                <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                  <Info className="h-5 w-5" />
                  {t('settings.siteInfoSettings')}
                </CardTitle>
                <CardDescription className="text-emerald-700 dark:text-emerald-300">
                  {t('settings.configureSiteInfo')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-3">
                  <Label htmlFor="site_title" className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.siteTitle')}</Label>
                  <Input
                    id="site_title"
                    value={formData.site_title}
                    onChange={(e) => handleChange('site_title', e.target.value)}
                    placeholder={t('settings.enterSiteTitle')}
                    required
                    className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg transition-colors"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.titleDescription')}
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="site_subtitle" className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.siteSubtitle')}</Label>
                  <Input
                    id="site_subtitle"
                    value={formData.site_subtitle}
                    onChange={(e) => handleChange('site_subtitle', e.target.value)}
                    placeholder={t('settings.enterSiteSubtitle')}
                    className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg transition-colors"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.subtitleDescription')}
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="footer_text" className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.footerText')}</Label>
                  <Input
                    id="footer_text"
                    value={formData.footer_text}
                    onChange={(e) => handleChange('footer_text', e.target.value)}
                    placeholder="© 2025 xuemian168"
                    className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg transition-colors"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.footerDescription')}
                  </p>
                </div>

                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${formData.show_view_count ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'} transition-colors`}>
                          {formData.show_view_count ? (
                            <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <Label htmlFor="show_view_count" className="text-base font-medium cursor-pointer">
                            {t('settings.showViewCount')}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('settings.viewCountDescription')}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="show_view_count"
                        checked={formData.show_view_count}
                        onCheckedChange={(checked: boolean) => handleChange('show_view_count', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${formData.enable_sound_effects ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'} transition-colors`}>
                          {formData.enable_sound_effects ? (
                            <Volume2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <VolumeX className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <Label htmlFor="enable_sound_effects" className="text-base font-medium cursor-pointer">
                            {locale === 'zh' ? '启用音效' : 'Enable Sound Effects'}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {locale === 'zh' ? '保存成功时播放提示音' : 'Play notification sound when saving successfully'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="enable_sound_effects"
                        checked={formData.enable_sound_effects}
                        onCheckedChange={(checked: boolean) => handleChange('enable_sound_effects', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* Branding Section */}
            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
              <CardHeader className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/50 dark:to-red-900/50 border-b border-orange-200 dark:border-orange-700 pt-6 pb-4 px-4 rounded-t-lg flex flex-col justify-center min-h-[80px]">
                <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
                  <Star className="h-5 w-5" />
                  {t('settings.branding')}
                </CardTitle>
                <CardDescription className="text-orange-700 dark:text-orange-300">
                  {t('settings.brandingDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.logo')}</Label>
                  <div className="flex items-center gap-4">
                    {settings?.logo_url && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={getFullApiUrl(settings.logo_url)} 
                          alt="Current Logo" 
                          className="h-12 w-auto object-contain rounded border bg-white"
                        />
                        <span className="text-sm text-muted-foreground">{t('settings.currentLogo')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="logo-upload"
                        accept=".png,.jpg,.jpeg,.svg,.webp"
                        onChange={handleLogoUpload}
                        disabled={logoUploading}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={logoUploading}
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        className="gap-2"
                      >
                        {logoUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('settings.logoUploading')}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            {t('settings.uploadLogo')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.logoFormats')}
                  </p>
                </div>

                {/* Favicon Upload */}
                <div className="space-y-3">
                  <Label className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.favicon')}</Label>
                  <div className="flex items-center gap-4">
                    {settings?.favicon_url && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={getFullApiUrl(settings.favicon_url)} 
                          alt="Current Favicon" 
                          className="h-8 w-8 object-contain rounded border bg-white"
                        />
                        <span className="text-sm text-muted-foreground">{t('settings.currentFavicon')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="favicon-upload"
                        accept=".ico,.png,.svg"
                        onChange={handleFaviconUpload}
                        disabled={faviconUploading}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={faviconUploading}
                        onClick={() => document.getElementById('favicon-upload')?.click()}
                        className="gap-2"
                      >
                        {faviconUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('settings.faviconUploading')}
                          </>
                        ) : (
                          <>
                            <Image className="h-4 w-4" />
                            {t('settings.uploadFavicon')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.faviconFormats')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {settings && (
              <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
                <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border-b border-purple-200 dark:border-purple-700 pt-6 pb-4 px-4 rounded-t-lg flex flex-col justify-center min-h-[80px]">
                  <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100 text-lg">
                    <Eye className="h-5 w-5" />
                    {t('settings.realTimePreview')}
                  </CardTitle>
                  <CardDescription className="text-purple-700 dark:text-purple-300 text-sm">
                    {t('settings.previewDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[200px] flex flex-col justify-center space-y-3">
                    <div className="font-bold text-xl text-gray-900 dark:text-white text-center">
                      {formData.site_title || t('settings.myBlog')}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 text-center">
                      {formData.site_subtitle || t('settings.blogSubtitle')}
                    </div>
                    {formData.footer_text && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 pt-2 mt-2 border-t border-gray-200 dark:border-gray-600 text-center">
                        {t('settings.footerPrefix')}{formData.footer_text}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="translations" className="space-y-6">
            {/* Language Configuration Section */}
            <Card className="pt-0">
              <CardHeader className="pt-6 pb-4 px-6">
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  {t('settings.languageConfiguration')}
                </CardTitle>
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
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Translation API Configuration Section */}
            <Card className="pt-0">
              <CardHeader className="pt-6 pb-4 px-6">
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  {t('settings.translationAPIConfiguration')}
                </CardTitle>
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
              </CardContent>
            </Card>

            {/* Site Translations Section */}
            <Card className="pt-0">
              <CardHeader className="pt-6 pb-4 px-6">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t('settings.siteTranslations')}
                </CardTitle>
                <CardDescription>
                  {locale === 'zh' ? '为不同语言配置网站标题和副标题' : 'Configure site title and subtitle for different languages'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {availableLanguages.map((lang) => {
                    const translation = getTranslation(lang.code)
                    const progress = getProgress(lang.code)
                    
                    return (
                      <Card key={lang.code} className="border border-gray-200 dark:border-gray-700 pt-0">
                        <CardHeader className="pt-6 pb-4 px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CardTitle className="text-lg">{lang.name}</CardTitle>
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
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="security" className="space-y-6">
            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
              <CardHeader className="bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/50 dark:to-orange-900/50 border-b border-red-200 dark:border-red-700 pt-6 pb-4 px-4 rounded-t-lg flex flex-col justify-center min-h-[80px]">
                <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                  <Lock className="h-5 w-5" />
                  {t('settings.changePassword')}
                </CardTitle>
                <CardDescription className="text-red-700 dark:text-red-300">
                  {t('settings.changePasswordDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="current_password" className="text-base font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.currentPassword')}
                    </Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => handlePasswordFormChange('currentPassword', e.target.value)}
                      placeholder={t('settings.enterCurrentPassword')}
                      required
                      className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-red-500 dark:focus:border-red-400 rounded-lg transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="new_password" className="text-base font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.newPassword')}
                    </Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => handlePasswordFormChange('newPassword', e.target.value)}
                      placeholder={t('settings.enterNewPassword')}
                      required
                      minLength={6}
                      className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-red-500 dark:focus:border-red-400 rounded-lg transition-colors"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('settings.passwordMinLength')}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="confirm_password" className="text-base font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.confirmPassword')}
                    </Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => handlePasswordFormChange('confirmPassword', e.target.value)}
                      placeholder={t('settings.confirmNewPassword')}
                      required
                      className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-red-500 dark:focus:border-red-400 rounded-lg transition-colors"
                    />
                    {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <p className="text-sm text-red-500">
                        {t('settings.passwordMismatch')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={passwordChanging || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                      className="gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3"
                    >
                      {passwordChanging ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          {t('settings.changingPassword')}
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          {t('settings.changePassword')}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
              <CardContent className="p-6">
                <SocialMediaManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <UpdateChecker />
          </TabsContent>
        </Tabs>
      </motion.div>
      
      {/* Notification Dialog */}
      <NotificationDialog
        open={notification.open}
        onOpenChange={notification.hideNotification}
        type={notification.type}
        title={notification.title}
        description={notification.description}
      />
      
      {/* About Dialog */}
      <AboutDialog
        open={showAboutDialog}
        onOpenChange={setShowAboutDialog}
        locale={locale}
      />
    </div>
  )
}