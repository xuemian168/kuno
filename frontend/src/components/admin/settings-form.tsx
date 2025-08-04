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
import { Settings, Save, RefreshCw, Globe, Check, Languages, Key, Info, Wand2, Loader2, Eye, EyeOff, Shield, Lock, Share2, Upload, Image, Star, Volume2, VolumeX, HelpCircle, AlertTriangle, ChevronDown, Activity, Sparkles, Copy, Type } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { translationService, TranslationConfig, SUPPORTED_LANGUAGES, SupportedLanguage } from "@/services/translation"
import { languageManager } from "@/services/translation/language-manager"
import { aiSummaryService, AISummaryConfig } from "@/services/ai-summary"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { SocialMediaManager } from "@/components/admin/social-media-manager"
import { getFullApiUrl } from "@/lib/utils"
import { generateFaviconUrl, generateMediaUrl } from "@/lib/favicon-utils"
import { setSoundEnabled } from "@/lib/sound"
import { NotificationDialog, useNotificationDialog } from "@/components/ui/notification-dialog"
import { AboutDialog } from "@/components/admin/about-dialog"
import { UpdateChecker } from "@/components/admin/update-checker"
import { AIUsageStatsComponent } from "./ai-usage-stats"

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
    icp_filing: "",
    psb_filing: "",
    show_view_count: true,
    show_site_title: true,
    enable_sound_effects: true,
    default_language: "zh"
  })
  const [translations, setTranslations] = useState<SiteSettingsTranslation[]>([])
  const [activeTab, setActiveTab] = useState('general')
  const [translationConfig, setTranslationConfig] = useState<TranslationConfig>({
    provider: 'google-free',
    apiKey: '',
    apiSecret: '',
    model: 'gpt-3.5-turbo',
    apiUrl: '',
    email: '',
    region: 'cn-beijing',
    enabledLanguages: languageManager.getEnabledLanguages()
  })
  const [enabledLanguages, setEnabledLanguages] = useState<SupportedLanguage[]>(
    languageManager.getEnabledLanguages()
  )
  const [availableLanguages, setAvailableLanguages] = useState<{ code: string, name: string }[]>([])
  const [hasTranslationProvider, setHasTranslationProvider] = useState(false)
  const [translatingLanguage, setTranslatingLanguage] = useState<string | null>(null)
  const [aiSummaryConfig, setAISummaryConfig] = useState<AISummaryConfig>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    maxKeywords: 10,
    summaryLength: 'medium'
  })
  const [hasAISummaryProvider, setHasAISummaryProvider] = useState(false)
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [showChinaCompliance, setShowChinaCompliance] = useState(false)

  // Password strength calculation
  const calculatePasswordStrength = (password: string) => {
    if (!password) return { strength: 0, crackTime: '', color: 'gray', level: '' }
    
    let score = 0
    let charsetSize = 0
    
    // Character set size calculation
    if (/[a-z]/.test(password)) charsetSize += 26 // lowercase
    if (/[A-Z]/.test(password)) charsetSize += 26 // uppercase  
    if (/[0-9]/.test(password)) charsetSize += 10 // digits
    if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32 // special characters
    
    // Length bonus
    score += Math.min(password.length * 4, 25)
    
    // Character variety bonus
    score += Math.min(charsetSize * 2, 25)
    
    // Pattern penalties
    if (/(.)\1{2,}/.test(password)) score -= 10 // repeated characters
    if (/123|abc|qwe|password|admin/.test(password.toLowerCase())) score -= 15 // common patterns
    
    // Calculate entropy and crack time
    const entropy = password.length * Math.log2(charsetSize)
    const combinations = Math.pow(charsetSize, password.length)
    const attemptsPerSecond = 1e12 // 1 trillion attempts per second (modern hardware)
    const secondsToCrack = combinations / (2 * attemptsPerSecond) // average case
    
    let crackTime = ''
    let color = 'red'
    let level = locale === 'zh' ? '很弱' : 'Very Weak'
    
    if (secondsToCrack < 1) {
      crackTime = locale === 'zh' ? '瞬间' : 'Instantly'
      color = 'red'
      level = locale === 'zh' ? '很弱' : 'Very Weak'
    } else if (secondsToCrack < 3600) { // < 1 hour
      const minutes = Math.ceil(secondsToCrack / 60)
      crackTime = locale === 'zh' ? `${minutes}分钟` : `${minutes} minute${minutes > 1 ? 's' : ''}`
      color = 'red'
      level = locale === 'zh' ? '弱' : 'Weak'
    } else if (secondsToCrack < 86400) { // < 1 day
      const hours = Math.ceil(secondsToCrack / 3600)
      crackTime = locale === 'zh' ? `${hours}小时` : `${hours} hour${hours > 1 ? 's' : ''}`
      color = 'orange'
      level = locale === 'zh' ? '一般' : 'Fair'
    } else if (secondsToCrack < 2592000) { // < 30 days
      const days = Math.ceil(secondsToCrack / 86400)
      crackTime = locale === 'zh' ? `${days}天` : `${days} day${days > 1 ? 's' : ''}`
      color = 'yellow'
      level = locale === 'zh' ? '好' : 'Good'
    } else if (secondsToCrack < 31536000) { // < 1 year
      const months = Math.ceil(secondsToCrack / 2592000)
      crackTime = locale === 'zh' ? `${months}个月` : `${months} month${months > 1 ? 's' : ''}`
      color = 'green'
      level = locale === 'zh' ? '强' : 'Strong'
    } else {
      const years = Math.ceil(secondsToCrack / 31536000)
      if (years > 1000000000) {
        crackTime = locale === 'zh' ? '数十亿年' : 'Billions of years'
        score = 100 // Ensure "Very Strong" passwords get 100% progress
      } else if (years > 1000000) {
        crackTime = locale === 'zh' ? `${Math.ceil(years / 1000000)}百万年` : `${Math.ceil(years / 1000000)} million years`
        score = Math.max(score, 90) // Ensure very strong passwords get at least 90%
      } else if (years > 1000) {
        crackTime = locale === 'zh' ? `${Math.ceil(years / 1000)}千年` : `${Math.ceil(years / 1000)} thousand years`
        score = Math.max(score, 80) // Ensure strong passwords get at least 80%
      } else {
        crackTime = locale === 'zh' ? `${years}年` : `${years} year${years > 1 ? 's' : ''}`
        score = Math.max(score, 70) // Ensure decent passwords get at least 70%
      }
      color = 'green'
      level = locale === 'zh' ? '很强' : 'Very Strong'
    }
    
    return {
      strength: Math.min(Math.max(score, 0), 100),
      crackTime,
      color,
      level
    }
  }

  const passwordStrength = calculatePasswordStrength(passwordForm.newPassword)

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
          icp_filing: settingsData.icp_filing || "",
          psb_filing: settingsData.psb_filing || "",
          show_view_count: settingsData.show_view_count ?? true,
          show_site_title: settingsData.show_site_title ?? true,
          enable_sound_effects: settingsData.enable_sound_effects ?? true,
          default_language: settingsData.default_language || "zh"
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
        if (parsed.aiSummary) {
          setAISummaryConfig(parsed.aiSummary)
          aiSummaryService.configureFromSettings(parsed.aiSummary)
          setHasAISummaryProvider(aiSummaryService.isConfigured())
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
    
    // Ensure default language is always in enabled languages
    // If current default language is not enabled, switch to first enabled language
    if (!enabledLanguages.includes(formData.default_language as SupportedLanguage)) {
      const newDefaultLang = enabledLanguages[0] || 'zh'
      setFormData(prev => ({ ...prev, default_language: newDefaultLang }))
    }
  }, [enabledLanguages, formData.default_language])

  const getTranslation = (language: string) => {
    if (language === formData.default_language) {
      return {
        language: formData.default_language,
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
    if (language === formData.default_language) {
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
      // Collect all translations except default language
      const allTranslations = translations.filter(t => 
        t.language !== formData.default_language && (t.site_title.trim() || t.site_subtitle.trim())
      )

      const settingsData = {
        site_title: formData.site_title,
        site_subtitle: formData.site_subtitle,
        footer_text: formData.footer_text,
        icp_filing: formData.icp_filing,
        psb_filing: formData.psb_filing,
        show_view_count: formData.show_view_count,
        show_site_title: formData.show_site_title,
        enable_sound_effects: formData.enable_sound_effects,
        default_language: formData.default_language,
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
        translation: configWithLanguages,
        aiSummary: aiSummaryConfig
      }
      localStorage.setItem('blog_settings', JSON.stringify(allSettings))

      // Update language manager
      languageManager.setEnabledLanguages(enabledLanguages)

      // Configure translation service
      translationService.configureFromSettings(configWithLanguages)
      setHasTranslationProvider(translationService.isConfigured())
      
      // Configure AI summary service
      try {
        aiSummaryService.configureFromSettings(aiSummaryConfig)
        setHasAISummaryProvider(aiSummaryService.isConfigured())
      } catch (error) {
        console.error('Failed to configure AI summary service:', error)
        setHasAISummaryProvider(false)
      }

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
        icp_filing: settings.icp_filing || "",
        psb_filing: settings.psb_filing || "",
        show_view_count: settings.show_view_count ?? true,
        show_site_title: settings.show_site_title ?? true,
        enable_sound_effects: settings.enable_sound_effects ?? true,
        default_language: settings.default_language || "zh"
      })
    }
  }

  const handleAutoTranslate = async (targetLanguage: string) => {
    if (!hasTranslationProvider || targetLanguage === formData.default_language) return

    setTranslatingLanguage(targetLanguage)
    try {
      // Translate site title
      if (formData.site_title.trim()) {
        const translatedTitle = await translationService.translate(
          formData.site_title,
          formData.default_language as SupportedLanguage,
          targetLanguage as SupportedLanguage
        )
        updateTranslation(targetLanguage, 'site_title', translatedTitle)
      }

      // Translate site subtitle
      if (formData.site_subtitle.trim()) {
        const translatedSubtitle = await translationService.translate(
          formData.site_subtitle,
          formData.default_language as SupportedLanguage,
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
          <TabsList className="w-full bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-fit">
              <TabsTrigger 
                value="general" 
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 gap-2 whitespace-nowrap flex-shrink-0"
              >
                <Settings className="h-4 w-4" />
                {t('settings.basicSettings')}
              </TabsTrigger>
              <TabsTrigger 
                value="translations" 
                className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0"
              >
                <Globe className="h-4 w-4" />
                {locale === 'zh' ? '翻译设置' : 'Translation'}
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0"
              >
                <Shield className="h-4 w-4" />
                {t('settings.security')}
              </TabsTrigger>
              <TabsTrigger 
                value="social" 
                className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0"
              >
                <Share2 className="h-4 w-4" />
                {t('settings.socialMedia')}
              </TabsTrigger>
              <TabsTrigger 
                value="system" 
                className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0"
              >
                <Info className="h-4 w-4" />
                {locale === 'zh' ? '系统信息' : 'System'}
              </TabsTrigger>
            </div>
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
                  <Label htmlFor="site_title" className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.siteTitle') || 'Site Title'}</Label>
                  <Input
                    id="site_title"
                    value={formData.site_title}
                    onChange={(e) => handleChange('site_title', e.target.value)}
                    placeholder={t('settings.enterSiteTitle') || 'Enter site title'}
                    required
                    className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg transition-colors"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.titleDescription') || 'The name of your blog that will appear in the header and browser title'}
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="site_subtitle" className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.siteSubtitle') || 'Site Subtitle'}</Label>
                  <Input
                    id="site_subtitle"
                    value={formData.site_subtitle}
                    onChange={(e) => handleChange('site_subtitle', e.target.value)}
                    placeholder={t('settings.enterSiteSubtitle') || 'Enter site subtitle'}
                    className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg transition-colors"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.subtitleDescription') || 'A brief description of your blog'}
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="footer_text" className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.footerText') || 'Footer Text'}</Label>
                  <Input
                    id="footer_text"
                    value={formData.footer_text}
                    onChange={(e) => handleChange('footer_text', e.target.value)}
                    placeholder="© 2025 xuemian168"
                    className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg transition-colors"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.footerDescription') || 'Text that appears at the bottom of every page'}
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="default_language" className="text-base font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'zh' ? '默认语言' : 'Default Language'}
                  </Label>
                  <Select
                    value={formData.default_language}
                    onValueChange={(value) => handleChange('default_language', value)}
                  >
                    <SelectTrigger className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledLanguages.map((code) => (
                        <SelectItem key={code} value={code}>
                          {SUPPORTED_LANGUAGES[code]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'zh' 
                      ? `设置网站的默认语言，用于文章编辑和内容验证。只能从已启用的 ${enabledLanguages.length} 种语言中选择。` 
                      : `Set the default language for the site, used for article editing and content validation. Can only be selected from the ${enabledLanguages.length} enabled languages.`
                    }
                  </p>
                </div>

                {/* China Compliance Section */}
                <Card className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-red-200 dark:border-red-800">
                  <CardHeader className="pb-4 cursor-pointer" onClick={() => setShowChinaCompliance(!showChinaCompliance)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                          <span className="text-xl">🇨🇳</span>
                          {t('settings.chinaCompliance')}
                        </CardTitle>
                        <CardDescription className="text-red-700 dark:text-red-300">
                          {t('settings.chinaComplianceDescription')}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowChinaCompliance(!showChinaCompliance)
                        }}
                      >
                        {showChinaCompliance ? (
                          <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
                        ) : (
                          <ChevronDown className="h-4 w-4 transition-transform" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {showChinaCompliance && (
                  <CardContent className="space-y-4">
                    <div className="space-y-6">
                      {/* ICP Filing */}
                      <div className="space-y-3">
                        <Label htmlFor="icp_filing" className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.icpFiling')}</Label>
                        <Input
                          id="icp_filing"
                          value={formData.icp_filing}
                          onChange={(e) => handleChange('icp_filing', e.target.value)}
                          placeholder={t('settings.enterIcpFiling')}
                          className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-red-500 dark:focus:border-red-400 rounded-lg transition-colors"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('settings.icpFilingDescription')}
                        </p>
                      </div>

                      {/* PSB Filing */}
                      <div className="space-y-3">
                        <Label htmlFor="psb_filing" className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.psbFiling')}</Label>
                        <Input
                          id="psb_filing"
                          value={formData.psb_filing}
                          onChange={(e) => handleChange('psb_filing', e.target.value)}
                          placeholder={t('settings.enterPsbFiling')}
                          className="h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-red-500 dark:focus:border-red-400 rounded-lg transition-colors"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('settings.psbFilingDescription')}
                        </p>
                      </div>

                      {/* Combined Preview */}
                      {(formData.icp_filing || formData.psb_filing) && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('settings.filingPreview')}:
                          </p>
                          <div className="text-center text-sm text-gray-600 dark:text-gray-400 flex flex-wrap items-center justify-center gap-1">
                            {formData.icp_filing && (
                              <>
                                <a 
                                  href="https://beian.miit.gov.cn" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {formData.icp_filing}
                                </a>
                                {formData.psb_filing && <span className="mx-1">|</span>}
                              </>
                            )}
                            {formData.psb_filing && (
                              <a 
                                href="http://www.beian.gov.cn" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:underline"
                              >
                                <img 
                                  src="/ga.png" 
                                  alt="公安备案" 
                                  className="w-3 h-3 inline-block"
                                  style={{ objectFit: 'contain' }}
                                />
                                <span>{formData.psb_filing}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  )}
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6 pb-6">
                      <div className="flex items-center justify-between h-full">
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
                              {t('settings.showViewCount') || 'Show View Count'}
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t('settings.viewCountDescription') || 'Display article view counts on the website'}
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

                  <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-6 pb-6">
                      <div className="flex items-center justify-between h-full">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${formData.show_site_title ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-800'} transition-colors`}>
                            {formData.show_site_title ? (
                              <Type className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <EyeOff className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <Label htmlFor="show_site_title" className="text-base font-medium cursor-pointer">
                              {locale === 'zh' ? '显示站点标题' : 'Show Site Title'}
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {locale === 'zh' ? '在Header中显示站点标题文字，关闭后只显示Logo' : 'Show site title text in header, when disabled only logo is displayed'}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="show_site_title"
                          checked={formData.show_site_title}
                          onCheckedChange={(checked: boolean) => handleChange('show_site_title', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-6 pb-6">
                      <div className="flex items-center justify-between h-full">
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
                </div>
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
                          src={generateMediaUrl(settings.logo_url)} 
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
                            {t('settings.uploadLogo') || 'Upload Logo'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.logoFormats') || 'Supports PNG, JPG, JPEG, WebP formats'}
                  </p>
                </div>

                {/* Favicon Upload */}
                <div className="space-y-3">
                  <Label className="text-base font-medium text-gray-700 dark:text-gray-300">{t('settings.favicon')}</Label>
                  <div className="flex items-center gap-4">
                    {settings?.favicon_url && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={generateFaviconUrl(settings.favicon_url).url} 
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
                            {t('settings.uploadFavicon') || 'Upload Favicon'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.faviconFormats') || 'Supports ICO, PNG formats (recommended 32x32 or 16x16)'}
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
                  <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[280px] flex flex-col">
                    {/* Header Area */}
                    <div className="flex-1 flex flex-col justify-center space-y-3 pb-4">
                      <div className="font-bold text-xl text-gray-900 dark:text-white text-center">
                        {formData.site_title || t('settings.myBlog')}
                      </div>
                      <div className="text-gray-600 dark:text-gray-300 text-center">
                        {formData.site_subtitle || t('settings.blogSubtitle')}
                      </div>
                    </div>
                    
                    {/* Footer Preview */}
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                      <div className="flex flex-col items-center space-y-2">
                        {/* Copyright */}
                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          {formData.footer_text || '© 2025 xuemian168'}
                        </div>
                        
                        {/* Filing Numbers */}
                        {(formData.icp_filing || formData.psb_filing) && (
                          <div className="flex flex-wrap items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            {formData.icp_filing && (
                              <>
                                <span className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                  {formData.icp_filing}
                                </span>
                                {formData.psb_filing && <span className="mx-1">|</span>}
                              </>
                            )}
                            {formData.psb_filing && (
                              <span className="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                <span className="w-3 h-3 bg-blue-500 rounded-sm inline-block text-xs text-white text-center leading-3">公</span>
                                <span>{formData.psb_filing}</span>
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Powered by */}
                        <div className="flex items-center space-x-1 text-xs text-gray-400 dark:text-gray-500">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          <span>Powered by ICT.RUN</span>
                        </div>
                      </div>
                    </div>
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
                        onClick={() => setEnabledLanguages([formData.default_language as SupportedLanguage, 'en'])}
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
                          disabled={code === formData.default_language || code === 'en'} // Cannot disable required languages
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
                            code === formData.default_language || code === 'en' ? 'font-medium text-primary' : ''
                          }`}
                        >
                          {name}
                          {(code === formData.default_language || code === 'en') && (
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
                        onClick={() => setEnabledLanguages([formData.default_language as SupportedLanguage, 'en', 'ja', 'ko'])}
                      >
                        {t('settings.eastAsian')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEnabledLanguages([formData.default_language as SupportedLanguage, 'en', 'es', 'fr', 'de', 'it', 'pt'])}
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
                      <SelectItem value="gemini">Google Gemini (API Key)</SelectItem>
                      <SelectItem value="volcano">Volcano Engine (API Key)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* API Key field - only show for providers that need it */}
                {['google', 'deepl', 'openai', 'gemini', 'volcano', 'libretranslate', 'mymemory'].includes(translationConfig.provider) && (
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
                        translationConfig.provider === 'gemini' ? 'Enter your Google AI Studio API key' :
                        translationConfig.provider === 'volcano' ? 'Enter your Volcano Engine Access Key ID' :
                        translationConfig.provider === 'libretranslate' ? 'API key (if required by instance)' :
                        'API key for higher rate limits (optional)'
                      }
                    />
                  </div>
                )}

                {/* API Secret field for Volcano Engine */}
                {translationConfig.provider === 'volcano' && (
                  <div className="space-y-2">
                    <Label>{t('settings.apiSecret') || 'API Secret'}</Label>
                    <Input
                      type="password"
                      value={translationConfig.apiSecret || ''}
                      onChange={(e) => {
                        const newConfig = { ...translationConfig, apiSecret: e.target.value }
                        setTranslationConfig(newConfig)
                        try {
                          translationService.configureFromSettings(newConfig)
                          setHasTranslationProvider(translationService.isConfigured())
                        } catch (error) {
                          console.error('Failed to configure translation service:', error)
                        }
                      }}
                      placeholder="Enter your Volcano Engine Access Key Secret"
                    />
                  </div>
                )}

                {/* Model selection for OpenAI and Gemini */}
                {['openai', 'gemini'].includes(translationConfig.provider) && (
                  <div className="space-y-2">
                    <Label>{t('settings.model') || 'Model'}</Label>
                    <Select
                      value={translationConfig.model || (translationConfig.provider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-1.5-flash')}
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
                        {translationConfig.provider === 'openai' ? (
                          <>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            <SelectItem value="gpt-4">GPT-4</SelectItem>
                            <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo</SelectItem>
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                            <SelectItem value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</SelectItem>
                            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* API URL field for LibreTranslate */}
                {translationConfig.provider === 'libretranslate' && (
                  <div className="space-y-2">
                    <Label>{t('settings.apiUrl') || 'API URL'} ({t('settings.optional') || 'Optional'})</Label>
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
                      placeholder="https://libretranslate.com (default)"
                    />
                  </div>
                )}

                {/* Email field for MyMemory */}
                {translationConfig.provider === 'mymemory' && (
                  <div className="space-y-2">
                    <Label>{t('settings.email') || 'Email'} ({t('settings.optional') || 'Optional'})</Label>
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
                      placeholder="your-email@example.com (for better rate limits)"
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
                  ) : translationConfig.provider === 'volcano' ? (
                    translationConfig.apiKey && translationConfig.apiSecret ? (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        {t('settings.configured')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{locale === 'zh' ? '需要Access Key ID和Secret' : 'Access Key ID and Secret required'}</Badge>
                    )
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

            {/* AI Usage Statistics Section */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {locale === 'zh' ? 'AI使用统计' : 'AI Usage Statistics'}
                </CardTitle>
                <CardDescription>
                  {locale === 'zh' ? '查看AI服务API使用情况和费用统计' : 'View AI service API usage and cost statistics'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIUsageStatsComponent showDetailed={true} locale={locale} />
              </CardContent>
            </Card>

            {/* AI Summary Configuration Section */}
            <Card className="pt-0">
              <CardHeader className="pt-6 pb-4 px-6">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {locale === 'zh' ? 'AI摘要配置' : 'AI Summary Configuration'}
                </CardTitle>
                <CardDescription>
                  {locale === 'zh' ? '配置AI摘要服务用于自动生成文章标题、摘要和SEO关键字' : 'Configure AI summary service for automatic article title, summary, and SEO keywords generation'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {locale === 'zh' ? 'AI摘要配置信息将保存在本地浏览器中。' : 'AI summary configuration is stored locally in your browser.'}
                  </AlertDescription>
                </Alert>

                {/* Copy Translation API Configuration */}
                {(translationConfig.provider === 'openai' || translationConfig.provider === 'gemini') && translationConfig.apiKey && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          {locale === 'zh' ? '检测到翻译服务配置' : 'Translation Service Configuration Detected'}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (translationConfig.provider === 'openai' || translationConfig.provider === 'gemini') {
                            const newConfig = {
                              ...aiSummaryConfig,
                              provider: translationConfig.provider as any,
                              apiKey: translationConfig.apiKey,
                              model: translationConfig.provider === 'openai' 
                                ? (translationConfig.model || 'gpt-3.5-turbo')
                                : 'gemini-1.5-flash'
                            }
                            setAISummaryConfig(newConfig)
                            try {
                              aiSummaryService.configureFromSettings(newConfig)
                              setHasAISummaryProvider(aiSummaryService.isConfigured())
                            } catch (error) {
                              console.error('Failed to configure AI summary service:', error)
                              setHasAISummaryProvider(false)
                            }
                          }
                        }}
                        className="h-7 px-3 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {locale === 'zh' ? '复制配置' : 'Copy Config'}
                      </Button>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      {locale === 'zh' 
                        ? `使用${translationConfig.provider === 'openai' ? 'OpenAI' : 'Gemini'}翻译服务的API配置来设置AI摘要服务`
                        : `Use your ${translationConfig.provider === 'openai' ? 'OpenAI' : 'Gemini'} translation service API configuration for AI summary service`
                      }
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>{locale === 'zh' ? 'AI服务提供商' : 'AI Service Provider'}</Label>
                  <Select
                    value={aiSummaryConfig.provider}
                    onValueChange={(value) => {
                      const newConfig = { ...aiSummaryConfig, provider: value as any }
                      setAISummaryConfig(newConfig)
                      try {
                        aiSummaryService.configureFromSettings(newConfig)
                        setHasAISummaryProvider(aiSummaryService.isConfigured())
                      } catch (error) {
                        console.error('Failed to configure AI summary service:', error)
                        setHasAISummaryProvider(false)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI GPT</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(aiSummaryConfig.provider === 'openai' || aiSummaryConfig.provider === 'gemini') && (
                  <div className="space-y-2">
                    <Label>{locale === 'zh' ? 'API密钥' : 'API Key'}</Label>
                    <div className="relative">
                      <Input
                        type="password"
                        value={aiSummaryConfig.apiKey}
                        onChange={(e) => {
                          const newConfig = { ...aiSummaryConfig, apiKey: e.target.value }
                          setAISummaryConfig(newConfig)
                          try {
                            aiSummaryService.configureFromSettings(newConfig)
                            setHasAISummaryProvider(aiSummaryService.isConfigured())
                          } catch (error) {
                            console.error('Failed to configure AI summary service:', error)
                            setHasAISummaryProvider(false)
                          }
                        }}
                        placeholder={
                          aiSummaryConfig.provider === 'openai' ? 'sk-...' :
                          aiSummaryConfig.provider === 'gemini' ? 'AI...' : 'Enter your API key'
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{locale === 'zh' ? '模型' : 'Model'}</Label>
                  <Select
                    value={aiSummaryConfig.model}
                    onValueChange={(value) => {
                      const newConfig = { ...aiSummaryConfig, model: value }
                      setAISummaryConfig(newConfig)
                      try {
                        aiSummaryService.configureFromSettings(newConfig)
                        setHasAISummaryProvider(aiSummaryService.isConfigured())
                      } catch (error) {
                        console.error('Failed to configure AI summary service:', error)
                        setHasAISummaryProvider(false)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aiSummaryConfig.provider === 'openai' && (
                        <>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        </>
                      )}
                      {aiSummaryConfig.provider === 'gemini' && (
                        <>
                          <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                          <SelectItem value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</SelectItem>
                          <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{locale === 'zh' ? '最大关键字数量' : 'Max Keywords'}</Label>
                    <Select
                      value={String(aiSummaryConfig.maxKeywords)}
                      onValueChange={(value) => {
                        const newConfig = { ...aiSummaryConfig, maxKeywords: parseInt(value) }
                        setAISummaryConfig(newConfig)
                        try {
                          aiSummaryService.configureFromSettings(newConfig)
                          setHasAISummaryProvider(aiSummaryService.isConfigured())
                        } catch (error) {
                          console.error('Failed to configure AI summary service:', error)
                          setHasAISummaryProvider(false)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{locale === 'zh' ? '摘要长度' : 'Summary Length'}</Label>
                    <Select
                      value={aiSummaryConfig.summaryLength}
                      onValueChange={(value) => {
                        const newConfig = { ...aiSummaryConfig, summaryLength: value as any }
                        setAISummaryConfig(newConfig)
                        try {
                          aiSummaryService.configureFromSettings(newConfig)
                          setHasAISummaryProvider(aiSummaryService.isConfigured())
                        } catch (error) {
                          console.error('Failed to configure AI summary service:', error)
                          setHasAISummaryProvider(false)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">{locale === 'zh' ? '短 (1-2句)' : 'Short (1-2 sentences)'}</SelectItem>
                        <SelectItem value="medium">{locale === 'zh' ? '中 (3-4句)' : 'Medium (3-4 sentences)'}</SelectItem>
                        <SelectItem value="long">{locale === 'zh' ? '长 (5-6句)' : 'Long (5-6 sentences)'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">
                    {locale === 'zh' ? '配置状态' : 'Configuration Status'}
                  </span>
                  {hasAISummaryProvider ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      {locale === 'zh' ? '已配置' : 'Configured'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{locale === 'zh' ? '需要API密钥' : 'API Key Required'}</Badge>
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
                              {lang.code === formData.default_language && (
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
                              {lang.code !== formData.default_language && hasTranslationProvider && (
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
                              disabled={lang.code === formData.default_language}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('settings.siteSubtitle')} ({lang.name})</Label>
                            <Input
                              value={translation.site_subtitle}
                              onChange={(e) => updateTranslation(lang.code, 'site_subtitle', e.target.value)}
                              placeholder={t('settings.enterSiteSubtitleIn', { language: lang.name })}
                              disabled={lang.code === formData.default_language}
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
                    
                    {/* Password Strength Indicator */}
                    {passwordForm.newPassword && (
                      <div className="space-y-2 mt-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {locale === 'zh' ? '密码强度' : 'Password Strength'}:
                          </span>
                          <span className={`text-sm font-semibold ${
                            passwordStrength.color === 'red' ? 'text-red-500' :
                            passwordStrength.color === 'orange' ? 'text-orange-500' :
                            passwordStrength.color === 'yellow' ? 'text-yellow-500' :
                            passwordStrength.color === 'green' ? 'text-green-500' : 'text-gray-400'
                          }`}>
                            {passwordStrength.level}
                          </span>
                        </div>
                        
                        {/* Strength Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              passwordStrength.color === 'red' ? 'bg-red-500' :
                              passwordStrength.color === 'orange' ? 'bg-orange-500' :
                              passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                              passwordStrength.color === 'green' ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${passwordStrength.strength}%` }}
                          />
                        </div>
                        
                        {/* Crack Time Warning */}
                        <div className={`flex items-center gap-2 text-sm ${
                          passwordStrength.color === 'red' || passwordStrength.color === 'orange' 
                            ? 'text-red-600 dark:text-red-400' 
                            : passwordStrength.color === 'yellow'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {(passwordStrength.color === 'red' || passwordStrength.color === 'orange') && (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                          <span>
                            {locale === 'zh' 
                              ? `预计破解时间：${passwordStrength.crackTime}` 
                              : `Estimated crack time: ${passwordStrength.crackTime}`
                            }
                          </span>
                        </div>
                        
                        {/* Hardware Baseline Information */}
                        <div className="text-xs text-gray-500 dark:text-gray-500 border-t pt-2 mt-2">
                          {locale === 'zh' ? (
                            <span>📊 算力基准：RTX 4090 GPU (1万亿次/秒) 暴力破解估算</span>
                          ) : (
                            <span>📊 Hardware baseline: RTX 4090 GPU (1 trillion attempts/sec) brute force estimation</span>
                          )}
                        </div>
                        
                        {/* Security Tips */}
                        {passwordStrength.color === 'red' || passwordStrength.color === 'orange' ? (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {locale === 'zh' ? (
                              <span>💡 建议：使用大小写字母、数字和特殊符号的组合，长度至少12位</span>
                            ) : (
                              <span>💡 Tip: Use a mix of uppercase, lowercase, numbers, and symbols with at least 12 characters</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
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