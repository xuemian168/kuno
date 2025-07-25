'use client'

import { useState } from 'react'
import { VideoStructuredData } from './seo/structured-data'

interface BiliBiliEmbedProps {
  url: string
  title?: string
  description?: string
  className?: string
  includeStructuredData?: boolean
}

export default function BiliBiliEmbed({ 
  url, 
  title = 'Bilibili video', 
  description = '',
  className = '',
  includeStructuredData = false
}: BiliBiliEmbedProps) {
  const [error, setError] = useState(false)

  // Extract BV ID or av ID from various Bilibili URL formats
  const getVideoInfo = (url: string): { id: string; type: 'bv' | 'av' } | null => {
    const patterns = [
      // BV format: https://www.bilibili.com/video/BV1xx411c7mD
      /(?:bilibili\.com\/video\/)?(BV[a-zA-Z0-9]+)/,
      // av format: https://www.bilibili.com/video/av123456
      /(?:bilibili\.com\/video\/)?av(\d+)/,
      // Short format: https://b23.tv/BV1xx411c7mD
      /b23\.tv\/(BV[a-zA-Z0-9]+)/,
      // Short format av: https://b23.tv/av123456
      /b23\.tv\/av(\d+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        if (match[1].startsWith('BV')) {
          return { id: match[1], type: 'bv' }
        } else {
          return { id: match[1], type: 'av' }
        }
      }
    }

    return null
  }

  const videoInfo = getVideoInfo(url)

  if (!videoInfo || error) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500">Invalid Bilibili URL</p>
        <p className="text-sm text-gray-400 mt-2">{url}</p>
      </div>
    )
  }

  // Build embed URL
  const embedUrl = videoInfo.type === 'bv' 
    ? `https://player.bilibili.com/player.html?bvid=${videoInfo.id}&page=1&high_quality=1&danmaku=0`
    : `https://player.bilibili.com/player.html?aid=${videoInfo.id}&page=1&high_quality=1&danmaku=0`

  return (
    <>
      {includeStructuredData && (
        <VideoStructuredData
          name={title}
          description={description}
          embedUrl={embedUrl}
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
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
    </>
  )
}