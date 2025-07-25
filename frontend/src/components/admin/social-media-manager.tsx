"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { apiClient, SocialMedia } from '@/lib/api'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  GripVertical, 
  Link2, 
  Globe,
  Github,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  MessageCircle,
  Send,
  Mail,
  Hash
} from 'lucide-react'

// Platform icon mapping
const PLATFORM_ICONS: Record<string, any> = {
  github: Github,
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  discord: MessageCircle,
  telegram: Send,
  wechat: MessageCircle,
  email: Mail,
  custom: Hash
}

// Common platforms
const COMMON_PLATFORMS = [
  { value: 'github', label: 'GitHub', icon: 'github' },
  { value: 'twitter', label: 'Twitter/X', icon: 'twitter' },
  { value: 'facebook', label: 'Facebook', icon: 'facebook' },
  { value: 'instagram', label: 'Instagram', icon: 'instagram' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { value: 'youtube', label: 'YouTube', icon: 'youtube' },
  { value: 'discord', label: 'Discord', icon: 'discord' },
  { value: 'telegram', label: 'Telegram', icon: 'telegram' },
  { value: 'wechat', label: 'WeChat', icon: 'wechat' },
  { value: 'email', label: 'Email', icon: 'email' },
  { value: 'custom', label: 'Custom', icon: 'custom' }
]

interface SocialMediaFormData {
  platform: string
  url: string
  icon_name: string
  is_active: boolean
}

export function SocialMediaManager() {
  const t = useTranslations()
  const [socialMediaList, setSocialMediaList] = useState<SocialMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState<SocialMediaFormData>({
    platform: '',
    url: '',
    icon_name: '',
    is_active: true
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSocialMedia()
  }, [])

  const fetchSocialMedia = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getAllSocialMedia()
      setSocialMediaList(data)
    } catch (error) {
      console.error('Failed to fetch social media:', error)
      setError('Failed to load social media links')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setFormData({
      platform: '',
      url: '',
      icon_name: '',
      is_active: true
    })
    setError('')
  }

  const handleEdit = (item: SocialMedia) => {
    setEditingId(item.id)
    setIsAdding(false)
    setFormData({
      platform: item.platform,
      url: item.url,
      icon_name: item.icon_name,
      is_active: item.is_active
    })
    setError('')
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({
      platform: '',
      url: '',
      icon_name: '',
      is_active: true
    })
    setError('')
  }

  const handlePlatformChange = (value: string) => {
    setFormData({
      ...formData,
      platform: value,
      icon_name: value
    })
  }

  const handleSave = async () => {
    if (!formData.platform || !formData.url) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (isAdding) {
        await apiClient.createSocialMedia({
          ...formData,
          display_order: socialMediaList.length
        })
        alert(t('settings.socialMediaAdded'))
      } else if (editingId) {
        await apiClient.updateSocialMedia(editingId, formData)
        alert(t('settings.socialMediaUpdated'))
      }

      await fetchSocialMedia()
      handleCancel()
    } catch (error) {
      console.error('Failed to save social media:', error)
      setError('Failed to save social media link')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('settings.confirmDeleteSocialMedia'))) {
      return
    }

    try {
      await apiClient.deleteSocialMedia(id)
      alert(t('settings.socialMediaDeleted'))
      await fetchSocialMedia()
    } catch (error) {
      console.error('Failed to delete social media:', error)
      alert('Failed to delete social media link')
    }
  }

  const handleToggleActive = async (item: SocialMedia) => {
    try {
      await apiClient.updateSocialMedia(item.id, {
        is_active: !item.is_active
      })
      await fetchSocialMedia()
    } catch (error) {
      console.error('Failed to update social media:', error)
    }
  }

  const renderIcon = (iconName: string) => {
    const IconComponent = PLATFORM_ICONS[iconName] || Globe
    return <IconComponent className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-2">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('settings.socialMedia')}</h3>
          <p className="text-sm text-muted-foreground">{t('settings.socialMediaDesc')}</p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t('settings.addSocialMedia')}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="text-base">
                  {isAdding ? t('settings.addSocialMedia') : t('settings.editSocialMedia')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.platform')}</Label>
                    <Select
                      value={formData.platform}
                      onValueChange={handlePlatformChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('settings.selectPlatform')} />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_PLATFORMS.map(platform => (
                          <SelectItem key={platform.value} value={platform.value}>
                            <div className="flex items-center gap-2">
                              {renderIcon(platform.icon)}
                              <span>{t(`settings.${platform.value}` as any)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('settings.url')}</Label>
                    <Input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder={t('settings.enterUrl')}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      {t('settings.isActive')}
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {saving ? t('common.saving') : t('common.save')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Social Media List */}
      <div className="space-y-2">
        {socialMediaList.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">{t('settings.noSocialMedia')}</p>
            </CardContent>
          </Card>
        ) : (
          socialMediaList.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className={!item.is_active ? 'opacity-60' : ''}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div className="p-2 rounded-lg bg-secondary">
                      {renderIcon(item.icon_name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.platform}</span>
                        {!item.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            {t('common.disabled')}
                          </Badge>
                        )}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        <Link2 className="h-3 w-3" />
                        {item.url}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => handleToggleActive(item)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}