'use client'

import { useState } from 'react'
import { VideoStructuredData } from './seo/structured-data'

interface YouTubeEmbedProps {
  url: string
  title?: string
  description?: string
  className?: string
  includeStructuredData?: boolean
}

export default function YouTubeEmbed({ 
  url, 
  title = 'YouTube video', 
  description = '',
  className = '',
  includeStructuredData = false
}: YouTubeEmbedProps) {
  const [error, setError] = useState(false)

  // Extract video ID from various YouTube URL formats
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

  const videoId = getVideoId(url)

  if (!videoId || error) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500">Invalid YouTube URL</p>
        <p className="text-sm text-gray-400 mt-2">{url}</p>
      </div>
    )
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}`
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

  return (
    <>
      {includeStructuredData && (
        <VideoStructuredData
          name={title}
          description={description}
          embedUrl={embedUrl}
          thumbnailUrl={thumbnailUrl}
          url={url}
        />
      )}
      <div className={`relative aspect-video rounded-lg overflow-hidden ${className}`}>
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={() => setError(true)}
          loading="lazy"
        />
      </div>
    </>
  )
}