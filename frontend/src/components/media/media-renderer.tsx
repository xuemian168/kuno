'use client'

import { MediaLibrary } from '@/lib/api'
import { getMediaUrl } from '@/lib/utils'
import OptimizedImage from './optimized-image'
import { VideoStructuredData } from '../seo/structured-data'

interface MediaRendererProps {
  media: MediaLibrary
  className?: string
  includeStructuredData?: boolean
  priority?: boolean
  sizes?: string
  quality?: number
}

export default function MediaRenderer({
  media,
  className = '',
  includeStructuredData = false,
  priority = false,
  sizes,
  quality = 75
}: MediaRendererProps) {
  const isVideo = media.media_type === 'video'
  const isImage = media.media_type === 'image'
  const mediaUrl = getMediaUrl(media.url)

  if (isVideo) {
    return (
      <>
        {includeStructuredData && (
          <VideoStructuredData
            name={media.alt || media.original_name}
            description={media.alt || ''}
            embedUrl={mediaUrl}
            url={mediaUrl}
          />
        )}
        <div className={`relative aspect-video rounded-lg overflow-hidden ${className}`}>
          <video
            src={mediaUrl}
            controls
            className="absolute inset-0 w-full h-full object-cover"
            preload="metadata"
            aria-label={media.alt || media.original_name}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </>
    )
  }

  if (isImage) {
    return (
      <OptimizedImage
        src={mediaUrl}
        alt={media.alt || media.original_name}
        className={className}
        includeStructuredData={includeStructuredData}
        priority={priority}
        sizes={sizes}
        quality={quality}
        fill={true}
      />
    )
  }

  // Fallback for unknown media types
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
      <p className="text-gray-500">Unsupported media type</p>
      <p className="text-sm text-gray-400 mt-2">{media.original_name}</p>
    </div>
  )
}