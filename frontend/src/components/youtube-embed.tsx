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
  // YouTube video IDs are exactly 11 characters: letters, numbers, underscore, hyphen
  const getVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        const videoId = match[1]
        // YouTube videoId is fixed at 11 characters
        if (videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId)) {
          return videoId
        }
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
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          onError={() => setError(true)}
          loading="lazy"
        />
      </div>
    </>
  )
}