'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Youtube, Plus, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import YouTubeEmbed from '@/components/youtube-embed'
import BiliBiliEmbed from '@/components/bilibili-embed'
import { generateBilibiliThumbnail, getBiliBiliVideoInfo } from '@/lib/bilibili-utils'

interface OnlineVideo {
  id: string
  url: string
  title: string
  thumbnail: string
  platform: 'youtube' | 'bilibili'
}

interface VideoAddProps {
  onVideoAdd?: (video: OnlineVideo) => void
}

export default function VideoAdd({ onVideoAdd }: VideoAddProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<OnlineVideo | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<'youtube' | 'bilibili'>('youtube')
  const [fetchingTitle, setFetchingTitle] = useState(false)

  const getYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    return null
  }


  const detectPlatform = (url: string): 'youtube' | 'bilibili' | null => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube'
    }
    if (url.includes('bilibili.com') || url.includes('b23.tv')) {
      return 'bilibili'
    }
    return null
  }

  const fetchYouTubeTitle = async (videoId: string): Promise<string | null> => {
    try {
      // Use YouTube's oEmbed API (no API key required)
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      if (response.ok) {
        const data = await response.json()
        return data.title || null
      }
    } catch (error) {
      console.error('Failed to fetch YouTube title:', error)
    }
    return null
  }

  const fetchBilibiliTitle = async (url: string): Promise<string | null> => {
    try {
      const videoInfo = getBiliBiliVideoInfo(url)
      if (videoInfo) {
        // Try using a public API endpoint for Bilibili video info
        // This is a simple approach - in production you might want to use a backend proxy
        try {
          const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${videoInfo.id}`
          const response = await fetch(apiUrl)
          if (response.ok) {
            const data = await response.json()
            if (data.code === 0 && data.data && data.data.title) {
              return data.data.title
            }
          }
        } catch (apiError) {
          console.log('Bilibili API failed, trying fallback methods:', apiError)
        }
        
        // Fallback: return null so user can input manually
        return null
      }
    } catch (error) {
      console.error('Failed to fetch Bilibili title:', error)
    }
    return null
  }

  const fetchVideoTitle = async (url: string, platform: 'youtube' | 'bilibili'): Promise<string | null> => {
    if (platform === 'youtube') {
      const videoId = getYouTubeVideoId(url)
      if (videoId) {
        return await fetchYouTubeTitle(videoId)
      }
    } else if (platform === 'bilibili') {
      return await fetchBilibiliTitle(url)
    }
    return null
  }


  const handlePreview = async () => {
    if (!url.trim()) {
      setError('Please enter a video URL')
      return
    }

    setFetchingTitle(true)
    setError('')

    const detectedPlatform = detectPlatform(url)
    if (!detectedPlatform) {
      setError('Please enter a valid YouTube or Bilibili URL')
      setFetchingTitle(false)
      return
    }

    let videoId: string | null = null
    let thumbnail = ''
    let videoTitle = title.trim()

    if (detectedPlatform === 'youtube') {
      videoId = getYouTubeVideoId(url)
      if (videoId) {
        thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        // Auto-fetch title if not provided
        if (!videoTitle) {
          const fetchedTitle = await fetchVideoTitle(url, detectedPlatform)
          if (fetchedTitle) {
            videoTitle = fetchedTitle
            setTitle(fetchedTitle) // Update the input field
          }
        }
      }
    } else if (detectedPlatform === 'bilibili') {
      const videoInfo = getBiliBiliVideoInfo(url)
      if (videoInfo) {
        videoId = videoInfo.id
        // Generate Bilibili thumbnail
        thumbnail = generateBilibiliThumbnail(videoInfo.id)
        // Auto-fetch title if not provided
        if (!videoTitle) {
          const fetchedTitle = await fetchVideoTitle(url, detectedPlatform)
          if (fetchedTitle) {
            videoTitle = fetchedTitle
            setTitle(fetchedTitle) // Update the input field
          }
        }
      }
    }

    if (!videoId) {
      setError(`Invalid ${detectedPlatform === 'youtube' ? 'YouTube' : 'Bilibili'} URL`)
      setFetchingTitle(false)
      return
    }

    const video: OnlineVideo = {
      id: videoId,
      url: url.trim(),
      title: videoTitle || `${detectedPlatform === 'youtube' ? 'YouTube' : 'Bilibili'} Video`,
      thumbnail,
      platform: detectedPlatform
    }

    setPreview(video)
    setSelectedPlatform(detectedPlatform)
    setFetchingTitle(false)
  }

  const handleAdd = () => {
    if (!preview) return

    onVideoAdd?.(preview)
    
    // Reset form
    setUrl('')
    setTitle('')
    setPreview(null)
    setError('')
  }

  const handleReset = () => {
    setUrl('')
    setTitle('')
    setPreview(null)
    setError('')
  }

  const handleAutoFetchTitle = async () => {
    if (!url.trim()) {
      setError('Please enter a video URL first')
      return
    }

    const detectedPlatform = detectPlatform(url)
    if (!detectedPlatform) {
      setError('Please enter a valid YouTube or Bilibili URL')
      return
    }

    setFetchingTitle(true)
    setError('')

    try {
      const fetchedTitle = await fetchVideoTitle(url, detectedPlatform)
      if (fetchedTitle) {
        setTitle(fetchedTitle)
      } else {
        setError(`Could not fetch title from ${detectedPlatform === 'youtube' ? 'YouTube' : 'Bilibili'}`)
      }
    } catch (error) {
      setError('Failed to fetch video title')
    } finally {
      setFetchingTitle(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          Add Online Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          <div className="space-y-4">
            <Tabs value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="youtube">YouTube</TabsTrigger>
                <TabsTrigger value="bilibili">Bilibili</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="video-url">
                {selectedPlatform === 'youtube' ? 'YouTube' : 'Bilibili'} URL
              </Label>
              <Input
                id="video-url"
                placeholder={
                  selectedPlatform === 'youtube' 
                    ? 'https://www.youtube.com/watch?v=...' 
                    : 'https://www.bilibili.com/video/BV...'
                }
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-title">Title (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="video-title"
                  placeholder="Enter a custom title for this video"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoFetchTitle}
                  disabled={!url.trim() || fetchingTitle}
                  className="shrink-0"
                >
                  {fetchingTitle ? (
                    <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click the button to automatically fetch the video title
              </p>
            </div>

            <Button 
              onClick={handlePreview}
              disabled={!url.trim() || fetchingTitle}
              className="w-full"
            >
              {fetchingTitle ? (
                <>
                  <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full mr-2" />
                  Fetching Title...
                </>
              ) : (
                'Preview Video'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preview</Label>
              {preview.platform === 'youtube' ? (
                <YouTubeEmbed url={preview.url} title={preview.title} />
              ) : (
                <BiliBiliEmbed url={preview.url} title={preview.title} />
              )}
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  preview.platform === 'youtube' 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {preview.platform === 'youtube' ? 'YouTube' : 'Bilibili'}
                </div>
              </div>
              <p className="font-medium">{preview.title}</p>
              <p className="text-sm text-gray-500 truncate">{preview.url}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdd} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 space-y-2">
          <div>
            <p className="font-medium">YouTube formats:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>https://www.youtube.com/watch?v=VIDEO_ID</li>
              <li>https://youtu.be/VIDEO_ID</li>
              <li>https://www.youtube.com/embed/VIDEO_ID</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Bilibili formats:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>https://www.bilibili.com/video/BV1234567890</li>
              <li>https://www.bilibili.com/video/av123456</li>
              <li>https://b23.tv/BV1234567890</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}