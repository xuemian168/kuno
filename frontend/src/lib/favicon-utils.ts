/**
 * Favicon utilities for consistent icon handling across the application
 */

import { getBaseUrl, getSiteUrl } from './config'

export interface FaviconConfig {
  url: string
  type: string
}

/**
 * Detect MIME type from file extension
 */
function getMimeType(url: string): string {
  const lower = url.toLowerCase()
  
  if (lower.includes('.ico')) return 'image/x-icon'
  if (lower.includes('.svg')) return 'image/svg+xml'
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg'
  if (lower.includes('.png')) return 'image/png'
  if (lower.includes('.gif')) return 'image/gif'
  if (lower.includes('.webp')) return 'image/webp'
  
  // Default to PNG
  return 'image/png'
}

/**
 * Generate favicon URL from settings
 */
export function generateFaviconUrl(faviconUrl: string | null | undefined): FaviconConfig {
  // Default fallback - use relative path for better compatibility
  const defaultFavicon: FaviconConfig = {
    url: '/kuno.png',
    type: 'image/png'
  }
  
  if (!faviconUrl) {
    return defaultFavicon
  }
  
  let finalUrl: string
  
  // Handle different URL formats
  if (faviconUrl.startsWith('http://') || faviconUrl.startsWith('https://')) {
    // Absolute URL - use as-is
    finalUrl = faviconUrl
  } else if (faviconUrl.startsWith('/api/')) {
    // API resource - use proper API URL construction
    if (typeof window !== 'undefined') {
      // Client side - use current origin
      finalUrl = `${window.location.origin}${faviconUrl}`
    } else {
      // Server side - use appropriate backend URL
      if (process.env.NODE_ENV === 'development') {
        finalUrl = `http://localhost:8085${faviconUrl}`
      } else {
        finalUrl = `${getBaseUrl()}${faviconUrl}`
      }
    }
  } else if (faviconUrl.startsWith('/uploads/')) {
    // Direct uploads path - add /api prefix
    if (typeof window !== 'undefined') {
      finalUrl = `${window.location.origin}/api${faviconUrl}`
    } else {
      if (process.env.NODE_ENV === 'development') {
        finalUrl = `http://localhost:8085/api${faviconUrl}`
      } else {
        finalUrl = `${getBaseUrl()}/api${faviconUrl}`
      }
    }
  } else if (faviconUrl.startsWith('/')) {
    // Frontend static resource - use site URL
    finalUrl = `${getSiteUrl()}${faviconUrl}`
  } else {
    // Relative path - assume it's from uploads
    if (typeof window !== 'undefined') {
      finalUrl = `${window.location.origin}/api/uploads/${faviconUrl}`
    } else {
      if (process.env.NODE_ENV === 'development') {
        finalUrl = `http://localhost:8085/api/uploads/${faviconUrl}`
      } else {
        finalUrl = `${getBaseUrl()}/api/uploads/${faviconUrl}`
      }
    }
  }
  
  return {
    url: finalUrl,
    type: getMimeType(finalUrl)
  }
}

/**
 * Generate media URL for any uploaded asset (favicon, logo, etc.)
 * Handles all URL formats consistently
 */
export function generateMediaUrl(mediaUrl: string | null | undefined): string {
  if (!mediaUrl) {
    return ''
  }
  
  // Handle different URL formats - same logic as favicon
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    // Absolute URL - use as-is
    return mediaUrl
  } else if (mediaUrl.startsWith('/api/uploads/') || mediaUrl.startsWith('/uploads/')) {
    // Backend API resource - use media base URL
    return `${getBaseUrl()}${mediaUrl}`
  } else if (mediaUrl.startsWith('/')) {
    // Frontend static resource - use site URL
    return `${getSiteUrl()}${mediaUrl}`
  } else {
    // Relative path - assume it's from uploads
    return `${getBaseUrl()}/uploads/${mediaUrl}`
  }
}

/**
 * Generate Next.js metadata icons configuration
 * Uses minimal, modern approach instead of over-engineered multiple sizes
 */
export function generateIconsMetadata(faviconUrl: string | null | undefined) {
  const favicon = generateFaviconUrl(faviconUrl)
  
  return {
    icon: favicon.url,
    shortcut: favicon.url,
    apple: favicon.url,
  }
}