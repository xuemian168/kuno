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
import { NotificationDialog, useNotificationDialog } from '@/components/ui/notification-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const notification = useNotificationDialog()
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
  const [isDragging, setIsDragging] = useState(false)
  const [reorderTimeout, setReorderTimeout] = useState<NodeJS.Timeout | null>(null)
  const [draggedItem, setDraggedItem] = useState<SocialMedia | null>(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null)
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null as SocialMedia | null
  })
  const [deleting, setDeleting] = useState(false)

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
        notification.showSuccess(t('settings.socialMediaAdded'))
      } else if (editingId) {
        await apiClient.updateSocialMedia(editingId, formData)
        notification.showSuccess(t('settings.socialMediaUpdated'))
      }

      await fetchSocialMedia()
      handleCancel()
    } catch (error) {
      console.error('Failed to save social media:', error)
      notification.showError(
        'Failed to save',
        'Failed to save social media link. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (item: SocialMedia) => {
    setDeleteDialog({
      open: true,
      item: item
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteDialog.item) return

    setDeleting(true)
    try {
      await apiClient.deleteSocialMedia(deleteDialog.item.id)
      notification.showSuccess(t('settings.socialMediaDeleted'))
      await fetchSocialMedia()
      setDeleteDialog({ open: false, item: null })
    } catch (error) {
      console.error('Failed to delete social media:', error)
      notification.showError(
        'Delete failed',
        'Failed to delete social media link. Please try again.'
      )
    } finally {
      setDeleting(false)
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

  const handleDragStart = (e: React.DragEvent, item: SocialMedia, index: number) => {
    setDraggedItem(item)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDraggedOverIndex(index)
  }

  const handleDragLeave = () => {
    setDraggedOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDraggedOverIndex(null)
    
    if (!draggedItem) return

    const draggedIndex = socialMediaList.findIndex(item => item.id === draggedItem.id)
    if (draggedIndex === dropIndex) {
      setIsDragging(false)
      return
    }

    // Create new array with the item moved to the new position
    const newList = [...socialMediaList]
    newList.splice(draggedIndex, 1)
    newList.splice(dropIndex, 0, draggedItem)
    
    setSocialMediaList(newList)
    
    // Save the new order
    try {
      const orderData = newList.map((item, index) => ({
        id: item.id,
        order: index
      }))
      await apiClient.updateSocialMediaOrder(orderData)
    } catch (error) {
      console.error('Failed to update order:', error)
      // Revert to original order on error
      await fetchSocialMedia()
    } finally {
      setIsDragging(false)
      setDraggedItem(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedOverIndex(null)
    setDraggedItem(null)
    setIsDragging(false)
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (reorderTimeout) {
        clearTimeout(reorderTimeout)
      }
    }
  }, [reorderTimeout])

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
          <p className="text-sm text-muted-foreground">
            {isDragging ? 'Saving order...' : t('settings.socialMediaDesc')}
          </p>
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
          <>
            {socialMediaList.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}
              >
                {/* Drop indicator */}
                {draggedOverIndex === index && draggedItem?.id !== item.id && (
                  <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary z-10" />
                )}
                <Card className={`${!item.is_active ? 'opacity-60' : ''} transition-all hover:shadow-md`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
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
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          {/* Drop zone after last item */}
          {isDragging && (
            <div
              className="relative h-20 border-2 border-dashed border-muted-foreground/20 rounded-lg"
              onDragOver={(e) => handleDragOver(e, socialMediaList.length)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, socialMediaList.length)}
            >
              {draggedOverIndex === socialMediaList.length && (
                <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary" />
              )}
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Drop here to move to end
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="text-lg font-semibold">
                {t('settings.confirmDeleteSocialMedia')}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground mt-3">
              This action cannot be undone. This will permanently delete the social media link.
            </DialogDescription>
          </DialogHeader>

          {deleteDialog.item && (
            <div className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <AlertDescription className="text-sm">
                  <span className="font-medium">About to delete: </span>
                  <span className="font-mono text-sm bg-muted px-1 py-0.5 rounded">
                    {deleteDialog.item.platform} - {deleteDialog.item.url}
                  </span>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, item: null })}
              disabled={deleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  {t('common.delete')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <NotificationDialog
        open={notification.open}
        onOpenChange={notification.hideNotification}
        type={notification.type}
        title={notification.title}
        description={notification.description}
      />
    </div>
  )
}