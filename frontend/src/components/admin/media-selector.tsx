'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, Video, Youtube, Search, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import MediaUpload from '@/components/admin/media-upload'
import VideoAdd from '@/components/admin/video-add'
import { apiClient, MediaLibrary } from '@/lib/api'
import { generateBilibiliThumbnail } from '@/lib/bilibili-utils'
import { getMediaUrl } from '@/lib/config'

interface OnlineVideo {
  id: string
  url: string
  title: string
  thumbnail: string
  platform: 'youtube' | 'bilibili'
}

interface MediaSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (item: MediaLibrary | OnlineVideo, type: 'media' | 'online') => void
  acceptedTypes?: 'image' | 'video' | 'all'
}

export default function MediaSelector({ 
  open, 
  onOpenChange, 
  onSelect, 
  acceptedTypes = 'all' 
}: MediaSelectorProps) {
  const [media, setMedia] = useState<MediaLibrary[]>([])
  const [onlineVideos, setOnlineVideos] = useState<OnlineVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'browse' | 'upload' | 'online'>('browse')
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'online'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [error, setError] = useState('')
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  // Responsive items per page: 8 on desktop, 6 on tablet, 4 on mobile
  const [itemsPerPage] = useState(8)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (open) {
      setCurrentPage(1) // Reset to first page when opening or changing filter/search
      fetchMedia()
    }
  }, [open, filterType, debouncedSearchTerm])

  useEffect(() => {
    if (open) {
      fetchMedia()
    }
  }, [currentPage]) // Fetch data when page changes

  const fetchMedia = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await apiClient.getMediaList(
        filterType === 'all' || filterType === 'online' ? undefined : filterType as 'image' | 'video',
        currentPage,
        itemsPerPage,
        debouncedSearchTerm || undefined
      )
      
      setMedia(response.media)
      setTotalItems(response.total)
      setTotalPages(Math.ceil(response.total / itemsPerPage))
      
      // Load online videos from localStorage (not paginated)
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
    // Refresh the current page to show the new media
    fetchMedia()
    setSelectedTab('browse')
  }

  const handleVideoAdd = (video: OnlineVideo) => {
    // If it's a Bilibili video and doesn't have a proper thumbnail, generate one
    if (video.platform === 'bilibili' && video.thumbnail.includes('placeholder')) {
      video.thumbnail = generateBilibiliThumbnail(video.id)
    }
    
    const updatedVideos = [video, ...onlineVideos]
    setOnlineVideos(updatedVideos)
    localStorage.setItem('online-videos', JSON.stringify(updatedVideos))
    setSelectedTab('browse')
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      setCurrentPage(newPage)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const filteredOnlineVideos = onlineVideos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.url.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const shouldShowOnline = acceptedTypes === 'all' || acceptedTypes === 'video'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
        </DialogHeader>
        
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            {shouldShowOnline && <TabsTrigger value="online">Online Video</TabsTrigger>}
          </TabsList>

          <TabsContent value="browse" className="flex-1 flex flex-col space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search media..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={filterType} onValueChange={(value) => setFilterType(value as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  {(acceptedTypes === 'all' || acceptedTypes === 'image') && (
                    <TabsTrigger value="image">Images</TabsTrigger>
                  )}
                  {(acceptedTypes === 'all' || acceptedTypes === 'video') && (
                    <TabsTrigger value="video">Videos</TabsTrigger>
                  )}
                  {shouldShowOnline && <TabsTrigger value="online">Online</TabsTrigger>}
                </TabsList>
              </Tabs>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Media Grid */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-t-lg" />
                      <CardContent className="p-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Regular Media Files */}
                  {(filterType !== 'online') && media.filter(item => 
                    acceptedTypes === 'all' || item.media_type === acceptedTypes
                  ).map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Card 
                        className="cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => onSelect(item, 'media')}
                      >
                        <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden relative">
                          {item.media_type === 'image' ? (
                            <img
                              src={getMediaUrl(item.url)}
                              alt={item.alt}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1">
                            <Badge variant={item.media_type === 'image' ? 'default' : 'secondary'} className="text-xs">
                              {item.media_type}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-2">
                          <p className="text-xs font-medium truncate">
                            {item.original_name}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}

                  {/* Online Videos */}
                  {(filterType === 'online' || filterType === 'all') && shouldShowOnline && filteredOnlineVideos.map((video) => (
                    <motion.div
                      key={`youtube-${video.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Card 
                        className="cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => onSelect(video, 'online')}
                      >
                        <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden relative">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`${video.platform === 'youtube' ? 'bg-red-600' : 'bg-blue-500'} rounded-full p-2`}>
                              <Youtube className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div className="absolute top-1 right-1">
                            <Badge variant={video.platform === 'youtube' ? 'destructive' : 'default'} className="text-xs">
                              {video.platform === 'youtube' ? 'YouTube' : 'Bilibili'}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-2">
                          <p className="text-xs font-medium truncate">
                            {video.title}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* Pagination Controls */}
              {!loading && totalPages > 1 && (filterType !== 'online') && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {totalItems} items • Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else {
                        const start = Math.max(1, currentPage - 2)
                        const end = Math.min(totalPages, start + 4)
                        pageNumber = start + i
                        if (pageNumber > end) return null
                      }
                      
                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNumber)}
                          disabled={loading}
                          className="h-8 w-8 p-0"
                        >
                          {pageNumber}
                        </Button>
                      )
                    })}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1">
            <MediaUpload 
              onUploadComplete={handleUploadComplete}
              acceptedTypes={acceptedTypes}
            />
          </TabsContent>

          {shouldShowOnline && (
            <TabsContent value="online" className="flex-1">
              <VideoAdd onVideoAdd={handleVideoAdd} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}