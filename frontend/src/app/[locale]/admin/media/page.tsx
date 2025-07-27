'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, Video, Trash2, Edit2, Search, Filter, Youtube, Play, ExternalLink, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import MediaUpload from '@/components/admin/media-upload'
import VideoAdd from '@/components/admin/video-add'
import { apiClient, MediaLibrary } from '@/lib/api'
import { generateBilibiliThumbnail } from '@/lib/bilibili-utils'
import { useTranslations } from 'next-intl'

interface OnlineVideo {
  id: string
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

  useEffect(() => {
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  useEffect(() => {
    fetchMedia()
  }, [selectedType])

  // Load online videos on component mount
  useEffect(() => {
    const savedOnlineVideos = localStorage.getItem('online-videos')
    if (savedOnlineVideos) {
      setOnlineVideos(JSON.parse(savedOnlineVideos))
    }
  }, [])

  const fetchMedia = async () => {
    try {
      setLoading(true)
      if (selectedType !== 'online') {
        const response = await apiClient.getMediaList(
          selectedType === 'all' ? undefined : selectedType as 'image' | 'video'
        )
        setMedia(response.media)
      }
      // Load online videos from localStorage
      const savedOnlineVideos = localStorage.getItem('online-videos')
      if (savedOnlineVideos) {
        setOnlineVideos(JSON.parse(savedOnlineVideos))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('media.failedToFetchMedia'))
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = (newMedia: MediaLibrary) => {
    setMedia(prev => [newMedia, ...prev])
  }

  const handleVideoAdd = (video: OnlineVideo) => {
    // If it's a Bilibili video and doesn't have a proper thumbnail, generate one
    if (video.platform === 'bilibili' && video.thumbnail.includes('placeholder')) {
      video.thumbnail = generateBilibiliThumbnail(video.id)
    }
    
    const updatedVideos = [video, ...onlineVideos]
    setOnlineVideos(updatedVideos)
    localStorage.setItem('online-videos', JSON.stringify(updatedVideos))
  }

  const handleDeleteOnlineVideo = (videoUrl: string) => {
    if (!confirm(t('media.confirmDeleteVideo'))) return
    
    const updatedVideos = onlineVideos.filter(v => v.url !== videoUrl)
    setOnlineVideos(updatedVideos)
    localStorage.setItem('online-videos', JSON.stringify(updatedVideos))
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
      v.url === editingVideo.url 
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

  const handleDeleteMedia = async (id: number) => {
    if (!confirm(t('media.confirmDeleteMedia'))) return

    try {
      await apiClient.deleteMedia(id)
      setMedia(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('media.failedToDeleteMedia'))
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

  const filteredMedia = media
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
      <Tabs defaultValue="upload" className="w-full">
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
                className="group hover:shadow-lg transition-shadow cursor-pointer"
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenuOpen(`media-${item.id}`)
                }}
              >
                <div 
                  className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden relative"
                  onClick={() => {
                    setSelectedMedia(item)
                    setEditingAlt(item.alt)
                  }}
                >
                  {item.media_type === 'image' ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${item.url}`}
                      alt={item.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-16 w-16 text-gray-400" />
                      <video
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${item.url}`}
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
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium truncate text-sm">
                      {item.original_name}
                    </h3>
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
                            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${item.url}`
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
                            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${item.url}`
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
              key={`${video.platform}-${video.id}-${video.url}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card 
                className="group hover:shadow-lg transition-shadow cursor-pointer"
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenuOpen(video.url)
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
                      open={contextMenuOpen === video.url}
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
                            setContextMenuOpen(contextMenuOpen === video.url ? null : video.url)
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
                            handleDeleteOnlineVideo(video.url)
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
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${selectedMedia.url}`}
                      alt={selectedMedia.alt}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <video
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${selectedMedia.url}`}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${selectedMedia.url}`
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
    </div>
  )
}