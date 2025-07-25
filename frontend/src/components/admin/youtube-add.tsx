'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Youtube, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import YouTubeEmbed from '@/components/youtube-embed'

interface YouTubeVideo {
  id: string
  url: string
  title: string
  thumbnail: string
}

interface YouTubeAddProps {
  onVideoAdd?: (video: YouTubeVideo) => void
}

export default function YouTubeAdd({ onVideoAdd }: YouTubeAddProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<YouTubeVideo | null>(null)

  const getVideoId = (url: string): string | null => {
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

  const handlePreview = () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    const videoId = getVideoId(url)
    if (!videoId) {
      setError('Invalid YouTube URL. Please enter a valid YouTube video URL.')
      return
    }

    const video: YouTubeVideo = {
      id: videoId,
      url: url.trim(),
      title: title.trim() || 'YouTube Video',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }

    setPreview(video)
    setError('')
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          Add YouTube Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-title">Title (optional)</Label>
              <Input
                id="video-title"
                placeholder="Enter a custom title for this video"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <Button 
              onClick={handlePreview}
              disabled={!url.trim()}
              className="w-full"
            >
              Preview Video
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preview</Label>
              <YouTubeEmbed url={preview.url} title={preview.title} />
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
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

        <div className="text-xs text-gray-500 space-y-1">
          <p>Supported formats:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>https://www.youtube.com/watch?v=VIDEO_ID</li>
            <li>https://youtu.be/VIDEO_ID</li>
            <li>https://www.youtube.com/embed/VIDEO_ID</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}