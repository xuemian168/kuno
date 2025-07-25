'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ImageStructuredData } from '../seo/structured-data'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  includeStructuredData?: boolean
  priority?: boolean
  sizes?: string
  fill?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  includeStructuredData = false,
  priority = false,
  sizes,
  fill = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  // Extract file extension for encoding format
  const getEncodingFormat = (src: string): string => {
    const extension = src.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'webp':
        return 'image/webp'
      case 'gif':
        return 'image/gif'
      case 'svg':
        return 'image/svg+xml'
      default:
        return 'image/jpeg'
    }
  }

  if (error) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500">Failed to load image</p>
        <p className="text-sm text-gray-400 mt-2">{alt}</p>
      </div>
    )
  }

  return (
    <>
      {includeStructuredData && width && height && (
        <ImageStructuredData
          name={alt}
          url={src}
          width={width}
          height={height}
          encodingFormat={getEncodingFormat(src)}
        />
      )}
      <div className={`relative overflow-hidden rounded-lg ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        )}
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          className={`transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } ${fill ? 'object-cover' : ''}`}
          priority={priority}
          quality={quality}
          sizes={sizes}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setError(true)
          }}
        />
      </div>
    </>
  )
}