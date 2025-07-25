'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, Video, Trash2, Edit2, Search, Filter, Youtube } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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

  useEffect(() => {
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  useEffect(() => {
    fetchMedia()
  }, [selectedType])

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
      setError(err instanceof Error ? err.message : 'Failed to fetch media')
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

  const handleDeleteOnlineVideo = (videoId: string) => {
    if (!confirm('Are you sure you want to remove this video?')) return
    
    const updatedVideos = onlineVideos.filter(v => v.id !== videoId)
    setOnlineVideos(updatedVideos)
    localStorage.setItem('online-videos', JSON.stringify(updatedVideos))
  }

  const handleDeleteMedia = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media file?')) return

    try {
      await apiClient.deleteMedia(id)
      setMedia(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete media')
    }
  }

  const handleUpdateAlt = async () => {
    if (!selectedMedia) return

    try {
      const updated = await apiClient.updateMedia(selectedMedia.id, editingAlt)
      setMedia(prev => prev.map(m => m.id === selectedMedia.id ? updated : m))
      setSelectedMedia(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update media')
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

  const filteredMedia = media.filter(item =>
    item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.alt.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      ) : (selectedType === 'online' ? filteredOnlineVideos.length === 0 : filteredMedia.length === 0) ? (
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
              <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
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
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedMedia(item)
                          setEditingAlt(item.alt)
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteMedia(item.id)
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
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
              key={`youtube-${video.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="group hover:shadow-lg transition-shadow">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteOnlineVideo(video.id)
                      }}
                      className="text-destructive hover:text-destructive ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
    </div>
  )
}