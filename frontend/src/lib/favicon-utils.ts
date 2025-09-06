/**
 * Favicon utilities for consistent icon handling across the application
 */

import { getMediaUrl } from './config'

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
 * @param faviconUrl - The favicon URL from settings
 * @param customOrigin - Optional custom origin to use instead of getMediaUrl logic
 */
export function generateFaviconUrl(faviconUrl: string | null | undefined, customOrigin?: string): FaviconConfig {
  // Default fallback - use relative path for better compatibility
  const defaultFavicon: FaviconConfig = {
    url: '/kuno.png',
    type: 'image/png'
  }
  
  if (!faviconUrl) {
    return defaultFavicon
  }
  
  // Handle different URL formats
  if (faviconUrl.startsWith('http://') || faviconUrl.startsWith('https://')) {
    // Absolute URL - use as-is
    return {
      url: faviconUrl,
      type: getMimeType(faviconUrl)
    }
  } else if (customOrigin) {
    // Use custom origin for URL generation - prioritize over other conditions
    let normalizedPath = faviconUrl.startsWith('/') ? faviconUrl : `/${faviconUrl}`
    if (normalizedPath.startsWith('/uploads/')) {
      normalizedPath = `/api${normalizedPath}`
    } else if (!normalizedPath.startsWith('/api/') && normalizedPath.includes('uploads/')) {
      normalizedPath = `/api/uploads/${faviconUrl}`
    }
    
    return {
      url: `${customOrigin}${normalizedPath}`,
      type: getMimeType(faviconUrl)
    }
  } else if (faviconUrl.startsWith('/api/uploads/') || faviconUrl.startsWith('/uploads/') || faviconUrl.startsWith('uploads/')) {
    // Backend media resource - for favicon, use relative paths to avoid localhost issues
    let normalizedPath = faviconUrl.startsWith('/') ? faviconUrl : `/${faviconUrl}`
    if (normalizedPath.startsWith('/uploads/')) {
      normalizedPath = `/api${normalizedPath}`
    } else if (!normalizedPath.startsWith('/api/') && normalizedPath.includes('uploads/')) {
      normalizedPath = `/api/uploads/${faviconUrl}`
    }
    
    return {
      url: normalizedPath, // Use relative path - browser will resolve with current domain
      type: getMimeType(faviconUrl)
    }
  } else if (faviconUrl.startsWith('/')) {
    // Frontend static resource - use as relative path
    return {
      url: faviconUrl,
      type: getMimeType(faviconUrl)
    }
  } else {
    // Relative path - normalize to absolute path
    let normalizedPath = `/${faviconUrl}`
    if (!normalizedPath.startsWith('/api/') && normalizedPath.includes('uploads/')) {
      normalizedPath = `/api/uploads/${faviconUrl}`
    }
    
    return {
      url: normalizedPath, // Use relative path - browser will resolve with current domain
      type: getMimeType(faviconUrl)
    }
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
  
  // Use the centralized getMediaUrl function for consistency
  return getMediaUrl(mediaUrl)
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