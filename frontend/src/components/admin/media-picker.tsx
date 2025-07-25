'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Image as ImageIcon, 
  Video, 
  Search, 
  Upload, 
  Youtube, 
  X,
  Check,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import MediaUpload from './media-upload'
import VideoAdd from './video-add'
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

interface MediaPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMediaSelect: (media: MediaLibrary | OnlineVideo, type: 'upload' | 'online') => void
}

export default function MediaPicker({ open, onOpenChange, onMediaSelect }: MediaPickerProps) {
  const t = useTranslations()
  const [media, setMedia] = useState<MediaLibrary[]>([])
  const [onlineVideos, setOnlineVideos] = useState<OnlineVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<'upload' | 'online' | 'add'>('upload')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<MediaLibrary | OnlineVideo | null>(null)

  useEffect(() => {
    if (open) {
      fetchMedia()
    }
  }, [open])

  const fetchMedia = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getMediaList()
      setMedia(response.media)
      
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
    // Auto-select the newly uploaded media
    setSelectedMedia(newMedia)
  }

  const handleVideoAdd = (video: OnlineVideo) => {
    // If it's a Bilibili video and doesn't have a proper thumbnail, generate one
    if (video.platform === 'bilibili' && video.thumbnail.includes('placeholder')) {
      video.thumbnail = generateBilibiliThumbnail(video.id)
    }
    
    const updatedVideos = [video, ...onlineVideos]
    setOnlineVideos(updatedVideos)
    localStorage.setItem('online-videos', JSON.stringify(updatedVideos))
    
    // Auto-select the newly added video
    setSelectedMedia(video)
  }

  const handleSelectMedia = () => {
    if (!selectedMedia) return

    const mediaType = 'platform' in selectedMedia ? 'online' : 'upload'
    onMediaSelect(selectedMedia, mediaType)
    onOpenChange(false)
    setSelectedMedia(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t('article.selectMedia')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">{t('article.uploadedMedia')}</TabsTrigger>
              <TabsTrigger value="online">{t('article.onlineVideos')}</TabsTrigger>
              <TabsTrigger value="add">{t('article.addNewMedia')}</TabsTrigger>
            </TabsList>

            {/* Search Bar (for upload and online tabs) */}
            {(selectedType === 'upload' || selectedType === 'online') && (
              <div className="relative mt-4 mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('media.searchMedia')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Upload Tab */}
            <TabsContent value="upload" className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                {loading ? (
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-auto">
                    {[...Array(8)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-t-lg" />
                        <CardContent className="p-2">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredMedia.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {searchTerm ? t('status.noMediaFound') : t('status.noMediaFound')}
                      </h3>
                      <p className="text-gray-500">
                        {searchTerm ? t('status.tryAdjustingSearch') : t('status.addFilesToGetStarted')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-auto">
                    {filteredMedia.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card 
                          className={`group hover:shadow-lg transition-all cursor-pointer ${
                            selectedMedia?.id === item.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedMedia(item)}
                        >
                          <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden relative">
                            {item.media_type === 'image' ? (
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${item.url}`}
                                alt={item.alt}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2">
                              <Badge variant={item.media_type === 'image' ? 'default' : 'secondary'}>
                                {item.media_type}
                              </Badge>
                            </div>
                            {selectedMedia?.id === item.id && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <div className="bg-primary rounded-full p-2">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                          <CardContent className="p-2">
                            <p className="text-xs font-medium truncate">{item.original_name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(item.file_size)}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Online Videos Tab */}
            <TabsContent value="online" className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                {filteredOnlineVideos.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Youtube className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {searchTerm ? t('status.noOnlineVideosFound') : t('status.noOnlineVideosFound')}
                      </h3>
                      <p className="text-gray-500">
                        {searchTerm ? t('status.tryAdjustingSearch') : t('status.addVideosToGetStarted')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-auto">
                    {filteredOnlineVideos.map((video, index) => (
                      <motion.div
                        key={`video-${video.id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card 
                          className={`group hover:shadow-lg transition-all cursor-pointer ${
                            selectedMedia && 'platform' in selectedMedia && selectedMedia.id === video.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedMedia(video)}
                        >
                          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden relative">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className={`rounded-full p-2 ${video.platform === 'youtube' ? 'bg-red-600' : 'bg-blue-600'}`}>
                                <Youtube className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="absolute top-2 right-2">
                              <Badge variant={video.platform === 'youtube' ? 'destructive' : 'default'}>
                                {video.platform === 'youtube' ? 'YouTube' : 'Bilibili'}
                              </Badge>
                            </div>
                            {selectedMedia && 'platform' in selectedMedia && selectedMedia.id === video.id && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <div className="bg-primary rounded-full p-2">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                          <CardContent className="p-2">
                            <p className="text-xs font-medium truncate">{video.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{video.platform}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Add New Media Tab */}
            <TabsContent value="add" className="flex-1 overflow-hidden">
              <div className="h-full">
                <Tabs defaultValue="upload-new" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload-new">{t('article.uploadFiles')}</TabsTrigger>
                    <TabsTrigger value="add-video">{t('article.addVideo')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload-new" className="flex-1 mt-4">
                    <MediaUpload onUploadComplete={handleUploadComplete} />
                  </TabsContent>
                  <TabsContent value="add-video" className="flex-1 mt-4">
                    <VideoAdd onVideoAdd={handleVideoAdd} />
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer with Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedMedia ? (
              'platform' in selectedMedia ? (
                `${t('article.mediaSelected')}: ${selectedMedia.title} (${selectedMedia.platform})`
              ) : (
                `${t('article.mediaSelected')}: ${selectedMedia.original_name} (${selectedMedia.media_type})`
              )
            ) : (
              t('article.noMediaSelected')
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSelectMedia}
              disabled={!selectedMedia}
            >
              {t('article.insertSelectedMedia')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}