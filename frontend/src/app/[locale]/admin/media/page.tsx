'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, Video, Trash2, Edit2, Search, Filter, Youtube, Play, ExternalLink, MoreVertical, CheckSquare, Square, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import MediaUpload from '@/components/admin/media-upload'
import VideoAdd from '@/components/admin/video-add'
import { apiClient, MediaLibrary } from '@/lib/api'
import { generateBilibiliThumbnail } from '@/lib/bilibili-utils'
import { getMediaUrl } from '@/lib/url-utils'
import { useTranslations } from 'next-intl'

interface OnlineVideo {
  uuid: string       // Unique identifier for each video entry
  id: string         // Platform video ID (YouTube videoId or Bilibili BV/av)
  url: string
  title: string
  thumbnail: string
  platform: 'youtube' | 'bilibili'
}

interface MediaPageProps {
  params: Promise<{ locale: string }>
}

export default function MediaPage({ params }: MediaPageProps) {
  const t = useTranslations()
  const [media, setMedia] = useState<MediaLibrary[]>([])
  const [onlineVideos, setOnlineVideos] = useState<OnlineVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [locale, setLocale] = useState<string>('zh')
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video' | 'online'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<MediaLibrary | null>(null)
  const [editingAlt, setEditingAlt] = useState('')
  const [error, setError] = useState('')
  const [editingVideo, setEditingVideo] = useState<OnlineVideo | null>(null)
  const [editingVideoTitle, setEditingVideoTitle] = useState('')
  const [contextMenuOpen, setContextMenuOpen] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'created_at' | 'file_size' | 'name'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [fileSizeFilter, setFileSizeFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  
  // Multi-select states
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<number>>(new Set())
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

  // Delete video dialog state
  const [deleteVideoDialog, setDeleteVideoDialog] = useState<{
    open: boolean
    videoToDelete: OnlineVideo | null
  }>({ open: false, videoToDelete: null })

  // Delete media dialog state
  const [deleteMediaDialog, setDeleteMediaDialog] = useState<{
    open: boolean
    mediaToDelete: MediaLibrary | null
  }>({ open: false, mediaToDelete: null })

  // Tab state for automatic switching on paste
  const [activeTab, setActiveTab] = useState('upload')

  useEffect(() => {
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  useEffect(() => {
    fetchMedia()
  }, [selectedType])

  // Load online videos on component mount with UUID migration
  useEffect(() => {
    const savedOnlineVideos = localStorage.getItem('online-videos')
    if (savedOnlineVideos) {
      const videos = JSON.parse(savedOnlineVideos)
      // Migrate old data: add uuid if missing
      const videosWithUuid = videos.map((v: OnlineVideo) => ({
        ...v,
        uuid: v.uuid || crypto.randomUUID()
      }))
      setOnlineVideos(videosWithUuid)
      // Update localStorage with migrated data
      localStorage.setItem('online-videos', JSON.stringify(videosWithUuid))
    }
  }, [])

  // Global paste event listener for automatic tab switching
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return

      const items = Array.from(e.clipboardData.items)
      const hasImage = items.some(item => item.type.startsWith('image/'))
      
      if (hasImage && activeTab !== 'upload') {
        setActiveTab('upload')
      }
    }

    document.addEventListener('paste', handleGlobalPaste)
    
    return () => {
      document.removeEventListener('paste', handleGlobalPaste)
    }
  }, [activeTab])

  const fetchMedia = async () => {
    try {
      setLoading(true)
      if (selectedType !== 'online') {
        const response = await apiClient.getMediaList(
          selectedType === 'all' ? undefined : selectedType as 'image' | 'video'
        )
        setMedia(response.media || [])
      }
      // Load online videos from localStorage with UUID migration
      const savedOnlineVideos = localStorage.getItem('online-videos')
      if (savedOnlineVideos) {
        const videos = JSON.parse(savedOnlineVideos)
        // Migrate old data: add uuid if missing
        const videosWithUuid = videos.map((v: OnlineVideo) => ({
          ...v,
          uuid: v.uuid || crypto.randomUUID()
        }))
        setOnlineVideos(videosWithUuid)
        // Update localStorage with migrated data
        localStorage.setItem('online-videos', JSON.stringify(videosWithUuid))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('media.failedToFetchMedia'))
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = (newMedia: MediaLibrary) => {
    setMedia(prev => [newMedia, ...(prev || [])])
  }

  const handleVideoAdd = (video: OnlineVideo) => {
    // Check for duplicate URL
    const isDuplicate = onlineVideos.some(v => v.url === video.url)
    if (isDuplicate) {
      setError(t('media.videoDuplicateError'))
      setTimeout(() => setError(''), 5000) // Clear error after 5 seconds
      return
    }

    // If it's a Bilibili video and doesn't have a proper thumbnail, generate one
    if (video.platform === 'bilibili' && video.thumbnail.includes('placeholder')) {
      video.thumbnail = generateBilibiliThumbnail(video.id)
    }

    const updatedVideos = [video, ...onlineVideos]
    setOnlineVideos(updatedVideos)
    localStorage.setItem('online-videos', JSON.stringify(updatedVideos))

    // Clear any previous errors
    setError('')
  }

  const handleDeleteOnlineVideo = (videoUuid: string) => {
    const video = onlineVideos.find(v => v.uuid === videoUuid)
    if (!video) return

    setDeleteVideoDialog({
      open: true,
      videoToDelete: video
    })
  }

  const handleConfirmDeleteVideo = () => {
    if (!deleteVideoDialog.videoToDelete) return

    const updatedVideos = onlineVideos.filter(v => v.uuid !== deleteVideoDialog.videoToDelete!.uuid)
    setOnlineVideos(updatedVideos)
    localStorage.setItem('online-videos', JSON.stringify(updatedVideos))

    // Close dialog and reset state
    setDeleteVideoDialog({ open: false, videoToDelete: null })
  }

  const handlePlayVideo = (video: OnlineVideo) => {
    window.open(video.url, '_blank')
  }

  const handleOpenVideo = (video: OnlineVideo) => {
    window.open(video.url, '_blank')
  }

  const handleEditVideo = (video: OnlineVideo) => {
    setEditingVideo(video)
    setEditingVideoTitle(video.title)
  }

  const handleSaveVideoEdit = () => {
    if (!editingVideo) return

    const updatedVideos = onlineVideos.map(v =>
      v.uuid === editingVideo.uuid
        ? { ...v, title: editingVideoTitle.trim() || v.title }
        : v
    )
    setOnlineVideos(updatedVideos)
    localStorage.setItem('online-videos', JSON.stringify(updatedVideos))
    setEditingVideo(null)
    setEditingVideoTitle('')
  }

  const handleCancelVideoEdit = () => {
    setEditingVideo(null)
    setEditingVideoTitle('')
  }

  // Multi-select handlers
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode)
    if (isMultiSelectMode) {
      setSelectedMediaIds(new Set())
    }
  }

  const toggleMediaSelection = (mediaId: number) => {
    const newSelection = new Set(selectedMediaIds)
    if (newSelection.has(mediaId)) {
      newSelection.delete(mediaId)
    } else {
      newSelection.add(mediaId)
    }
    setSelectedMediaIds(newSelection)
  }


  const handleBulkDelete = async () => {
    if (selectedMediaIds.size === 0) return

    const confirmMessage = t('media.confirmBulkDelete', { count: selectedMediaIds.size })
    if (!confirm(confirmMessage)) return

    setBulkDeleteLoading(true)
    try {
      const ids = Array.from(selectedMediaIds)
      const result = await apiClient.bulkDeleteMedia(ids)
      
      // Remove successfully deleted items from state
      setMedia(prev => (prev || []).filter(m => !selectedMediaIds.has(m.id)))
      setSelectedMediaIds(new Set())
      
      if (result.failed.length > 0) {
        setError(`${result.message}. Some files could not be deleted.`)
      } else {
        // Clear any previous errors
        setError('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('media.failedToBulkDelete'))
    } finally {
      setBulkDeleteLoading(false)
    }
  }

  const handleBulkCopyUrls = () => {
    const selectedMedia = media.filter(m => selectedMediaIds.has(m.id))
    const urls = selectedMedia.map(m => getMediaUrl(m.url)).join('\n')
    navigator.clipboard.writeText(urls)
    // You might want to show a toast notification here
  }

  const handleDeleteMedia = async (id: number) => {
    const mediaItem = media.find(m => m.id === id)
    if (!mediaItem) return

    setDeleteMediaDialog({
      open: true,
      mediaToDelete: mediaItem
    })
  }

  const handleConfirmDeleteMedia = async () => {
    if (!deleteMediaDialog.mediaToDelete) return

    try {
      await apiClient.deleteMedia(deleteMediaDialog.mediaToDelete.id)
      setMedia(prev => (prev || []).filter(m => m.id !== deleteMediaDialog.mediaToDelete!.id))

      // Close dialog and reset state
      setDeleteMediaDialog({ open: false, mediaToDelete: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('media.failedToDeleteMedia'))
      // Keep dialog open on error
    }
  }

  const handleUpdateAlt = async () => {
    if (!selectedMedia) return

    try {
      const updated = await apiClient.updateMedia(selectedMedia.id, editingAlt)
      setMedia(prev => prev.map(m => m.id === selectedMedia.id ? updated : m))
      setSelectedMedia(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('media.failedToUpdateMedia'))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredMedia = (media || [])
    .filter(item => {
      // Text search filter
      const matchesSearch = item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.alt.toLowerCase().includes(searchTerm.toLowerCase())
      
      // File size filter
      let matchesSize = true
      if (fileSizeFilter !== 'all') {
        const sizeInMB = item.file_size / (1024 * 1024)
        switch (fileSizeFilter) {
          case 'small':
            matchesSize = sizeInMB < 1
            break
          case 'medium':
            matchesSize = sizeInMB >= 1 && sizeInMB < 10
            break
          case 'large':
            matchesSize = sizeInMB >= 10
            break
        }
      }
      
      // Date filter
      let matchesDate = true
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.created_at)
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        
        switch (dateFilter) {
          case 'today':
            matchesDate = itemDate >= today
            break
          case 'week':
            matchesDate = itemDate >= weekAgo
            break
          case 'month':
            matchesDate = itemDate >= monthAgo
            break
        }
      }
      
      return matchesSearch && matchesSize && matchesDate
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'file_size':
          comparison = a.file_size - b.file_size
          break
        case 'name':
          comparison = a.original_name.localeCompare(b.original_name)
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

  const selectAllVisible = () => {
    const allVisibleIds = new Set(filteredMedia.map(m => m.id))
    setSelectedMediaIds(allVisibleIds)
  }

  const clearSelection = () => {
    setSelectedMediaIds(new Set())
  }

  const isAllSelected = filteredMedia.length > 0 && filteredMedia.every(m => selectedMediaIds.has(m.id))
  const isPartiallySelected = selectedMediaIds.size > 0 && !isAllSelected

  const filteredOnlineVideos = onlineVideos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.url.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('media.mediaLibrary')}</h1>
          <p className="text-muted-foreground">
            {t('media.manageImagesVideos')}
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">{t('media.uploadFiles')}</TabsTrigger>
          <TabsTrigger value="online">{t('media.addOnlineVideo')}</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="mt-4">
          <MediaUpload onUploadComplete={handleUploadComplete} />
        </TabsContent>
        <TabsContent value="online" className="mt-4">
          <VideoAdd onVideoAdd={handleVideoAdd} />
        </TabsContent>
      </Tabs>

      {/* Multi-select Toolbar */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4">
          <Button
            variant={isMultiSelectMode ? "default" : "outline"}
            onClick={toggleMultiSelectMode}
            size="sm"
          >
            {isMultiSelectMode ? (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                {t('media.exitSelectMode')}
              </>
            ) : (
              <>
                <Square className="h-4 w-4 mr-2" />
                {t('media.selectMode')}
              </>
            )}
          </Button>

          {isMultiSelectMode && (
            <>
              <Button
                variant="outline"
                onClick={isAllSelected ? clearSelection : selectAllVisible}
                size="sm"
                className="gap-2"
              >
                {isPartiallySelected ? (
                  <Minus className="h-4 w-4" />
                ) : isAllSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {isAllSelected ? t('media.deselectAll') : t('media.selectAll')}
              </Button>

              {selectedMediaIds.size > 0 && (
                <span className="text-sm font-medium">
                  {t('media.selectedCount', { count: selectedMediaIds.size })}
                </span>
              )}
            </>
          )}
        </div>

        {/* Bulk Actions */}
        {isMultiSelectMode && selectedMediaIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleBulkCopyUrls}
              size="sm"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t('media.copyUrls')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
              size="sm"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {bulkDeleteLoading ? t('common.deleting') : t('media.delete')}
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('media.searchMedia')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
            <TabsList>
              <TabsTrigger value="all">{t('media.all')}</TabsTrigger>
              <TabsTrigger value="image">{t('media.images')}</TabsTrigger>
              <TabsTrigger value="video">{t('media.videos')}</TabsTrigger>
              <TabsTrigger value="online">{t('media.online')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filter and Sort Controls */}
        {selectedType !== 'online' && (
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">{t('media.sortBy')}</Label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created_at' | 'file_size' | 'name')}
                className="px-3 py-1 text-sm border rounded-md bg-background"
              >
                <option value="created_at">{t('media.dateAdded')}</option>
                <option value="file_size">{t('media.fileSize')}</option>
                <option value="name">{t('media.name')}</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2"
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">{t('media.fileSizeFilter')}</Label>
              <select
                value={fileSizeFilter}
                onChange={(e) => setFileSizeFilter(e.target.value as 'all' | 'small' | 'medium' | 'large')}
                className="px-3 py-1 text-sm border rounded-md bg-background"
              >
                <option value="all">{t('media.allSizes')}</option>
                <option value="small">{t('media.small')}</option>
                <option value="medium">{t('media.medium')}</option>
                <option value="large">{t('media.large')}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">{t('media.dateFilter')}</Label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                className="px-3 py-1 text-sm border rounded-md bg-background"
              >
                <option value="all">{t('media.allTime')}</option>
                <option value="today">{t('media.today')}</option>
                <option value="week">{t('media.thisWeek')}</option>
                <option value="month">{t('media.thisMonth')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-t-lg" />
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (selectedType === 'online' ? filteredOnlineVideos.length === 0 : (selectedType === 'all' ? (filteredMedia.length === 0 && filteredOnlineVideos.length === 0) : filteredMedia.length === 0)) ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
            {selectedType === 'online' ? <Youtube className="h-full w-full" /> : <ImageIcon className="h-full w-full" />}
          </div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            {selectedType === 'online' ? t('status.noOnlineVideosFound') : t('status.noMediaFound')}
          </h3>
          <p className="text-gray-500">
            {searchTerm ? t('status.tryAdjustingSearch') : selectedType === 'online' ? t('status.addVideosToGetStarted') : t('status.addFilesToGetStarted')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Regular Media Files */}
          {(selectedType !== 'online') && filteredMedia.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card 
                className={`group hover:shadow-lg transition-all cursor-pointer ${
                  isMultiSelectMode && selectedMediaIds.has(item.id) 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : ''
                }`}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (!isMultiSelectMode) {
                    setContextMenuOpen(`media-${item.id}`)
                  }
                }}
                onClick={() => {
                  if (isMultiSelectMode) {
                    toggleMediaSelection(item.id)
                  } else {
                    setSelectedMedia(item)
                    setEditingAlt(item.alt)
                  }
                }}
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden relative">
                  {item.media_type === 'image' ? (
                    <img
                      src={getMediaUrl(item.url)}
                      alt={item.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-16 w-16 text-gray-400" />
                      <video
                        src={getMediaUrl(item.url)}
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                        muted
                      />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant={item.media_type === 'image' ? 'default' : 'secondary'}>
                      {item.media_type}
                    </Badge>
                  </div>
                  
                  {/* Multi-select checkbox */}
                  {isMultiSelectMode && (
                    <div className="absolute top-2 left-2">
                      <div className="w-6 h-6 rounded-md bg-white border-2 border-gray-300 flex items-center justify-center shadow-sm">
                        {selectedMediaIds.has(item.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium truncate text-sm">
                      {item.original_name}
                    </h3>
                    {!isMultiSelectMode && (
                      <DropdownMenu 
                        open={contextMenuOpen === `media-${item.id}`}
                        onOpenChange={(open) => {
                          if (!open) setContextMenuOpen(null)
                        }}
                      >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(contextMenuOpen === `media-${item.id}` ? null : `media-${item.id}`)
                          }}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(null)
                            setSelectedMedia(item)
                            setEditingAlt(item.alt)
                          }}
                          className="cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          {t('media.viewDetails')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(null)
                            const url = getMediaUrl(item.url)
                            navigator.clipboard.writeText(url)
                          }}
                          className="cursor-pointer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t('media.copyUrl')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(null)
                            const url = getMediaUrl(item.url)
                            window.open(url, '_blank')
                          }}
                          className="cursor-pointer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t('media.openInNewTab')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(null)
                            setSelectedMedia(item)
                            setEditingAlt(item.alt)
                          }}
                          className="cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          {t('media.editAltText')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(null)
                            handleDeleteMedia(item.id)
                          }}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('media.deleteMedia')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>{formatFileSize(item.file_size)}</p>
                    <p>{formatDate(item.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          
          {/* Online Videos */}
          {(selectedType === 'online' || selectedType === 'all') && filteredOnlineVideos.map((video, index) => (
            <motion.div
              key={video.uuid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card
                className="group hover:shadow-lg transition-shadow cursor-pointer"
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenuOpen(video.uuid)
                }}
                onDoubleClick={() => handlePlayVideo(video)}
              >
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`rounded-full p-3 ${video.platform === 'youtube' ? 'bg-red-600' : 'bg-blue-600'}`}>
                      <Youtube className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant={video.platform === 'youtube' ? 'destructive' : 'default'}>
                      {video.platform === 'youtube' ? t('media.youtube') : t('media.bilibili')}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium truncate text-sm">
                      {video.title}
                    </h3>
                    <DropdownMenu
                      open={contextMenuOpen === video.uuid}
                      onOpenChange={(open) => {
                        if (!open) setContextMenuOpen(null)
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(contextMenuOpen === video.uuid ? null : video.uuid)
                          }}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(null)
                            handlePlayVideo(video)
                          }}
                          className="cursor-pointer"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {t('media.playVideo')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(null)
                            handleOpenVideo(video)
                          }}
                          className="cursor-pointer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t('media.openInNewTab')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(null)
                            handleEditVideo(video)
                          }}
                          className="cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          {t('media.editTitle')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextMenuOpen(null)
                            handleDeleteOnlineVideo(video.uuid)
                          }}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('media.deleteVideo')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="truncate">{video.url}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Media Detail Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('media.selectMedia')}</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  {selectedMedia.media_type === 'image' ? (
                    <img
                      src={getMediaUrl(selectedMedia.url)}
                      alt={selectedMedia.alt}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <video
                      src={getMediaUrl(selectedMedia.url)}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = getMediaUrl(selectedMedia.url)
                      navigator.clipboard.writeText(url)
                    }}
                  >
                    {t('common.copyUrl')}
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>{t('common.fileName')}</Label>
                  <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {selectedMedia.original_name}
                  </p>
                </div>
                <div>
                  <Label>{t('common.fileSize')}</Label>
                  <p className="text-sm">{formatFileSize(selectedMedia.file_size)}</p>
                </div>
                <div>
                  <Label>{t('common.type')}</Label>
                  <p className="text-sm">{selectedMedia.mime_type}</p>
                </div>
                <div>
                  <Label>{t('common.uploaded')}</Label>
                  <p className="text-sm">{formatDate(selectedMedia.created_at)}</p>
                </div>
                {selectedMedia.media_type === 'image' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-alt">{t('common.altText')}</Label>
                    <Input
                      id="edit-alt"
                      value={editingAlt}
                      onChange={(e) => setEditingAlt(e.target.value)}
                      placeholder={t('placeholder.describeImage')}
                    />
                    <Button onClick={handleUpdateAlt} size="sm">
                      {t('common.updateAltText')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Video Dialog */}
      <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('media.editVideoTitle')}</DialogTitle>
          </DialogHeader>
          {editingVideo && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-video-title">{t('media.videoTitle')}</Label>
                <Input
                  id="edit-video-title"
                  value={editingVideoTitle}
                  onChange={(e) => setEditingVideoTitle(e.target.value)}
                  placeholder={t('media.enterVideoTitle')}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={editingVideo.platform === 'youtube' ? 'destructive' : 'default'}>
                    {editingVideo.platform === 'youtube' ? 'YouTube' : 'Bilibili'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{editingVideo.url}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancelVideoEdit}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveVideoEdit}>
                  {t('media.saveChanges')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Video Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteVideoDialog.open}
        onOpenChange={(open) => setDeleteVideoDialog({ open, videoToDelete: null })}
        onConfirm={handleConfirmDeleteVideo}
        title={t('media.deleteVideoTitle')}
        description={t('media.deleteVideoDescription')}
        itemName={deleteVideoDialog.videoToDelete?.title}
        confirmText={t('media.deleteVideoConfirmText')}
        locale={locale}
      />

      {/* Delete Media Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteMediaDialog.open}
        onOpenChange={(open) => setDeleteMediaDialog({ open, mediaToDelete: null })}
        onConfirm={handleConfirmDeleteMedia}
        title={t('media.deleteMediaTitle')}
        description={t('media.deleteMediaDescription')}
        itemName={deleteMediaDialog.mediaToDelete?.original_name}
        confirmText={t('media.deleteMediaConfirmText')}
        locale={locale}
      />
    </div>
  )
}