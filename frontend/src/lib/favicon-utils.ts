/**
 * Favicon utilities for consistent icon handling across the application
 */

export interface FaviconConfig {
  url: string
  type: string
}

/**
 * Get the appropriate base URL for media resources
 * Always uses backend API URL for uploads and media resources
 */
function getMediaBaseUrl(): string {
  // For media resources, always use the backend API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
  return apiUrl.replace('/api', '')
}

/**
 * Get the frontend site URL (for static assets)
 */
function getSiteUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`
  }
  
  // Check for explicit site URL first
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  
  // In development, frontend is typically on port 3000
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  
  // Fall back to API URL logic
  return getMediaBaseUrl()
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
  // Default fallback
  const defaultFavicon: FaviconConfig = {
    url: `${getSiteUrl()}/kuno.png`,
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
  } else if (faviconUrl.startsWith('/api/uploads/') || faviconUrl.startsWith('/uploads/')) {
    // Backend API resource - use media base URL
    finalUrl = `${getMediaBaseUrl()}${faviconUrl}`
  } else if (faviconUrl.startsWith('/')) {
    // Frontend static resource - use site URL
    finalUrl = `${getSiteUrl()}${faviconUrl}`
  } else {
    // Relative path - assume it's from uploads
    finalUrl = `${getMediaBaseUrl()}/uploads/${faviconUrl}`
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
    return `${getMediaBaseUrl()}${mediaUrl}`
  } else if (mediaUrl.startsWith('/')) {
    // Frontend static resource - use site URL
    return `${getSiteUrl()}${mediaUrl}`
  } else {
    // Relative path - assume it's from uploads
    return `${getMediaBaseUrl()}/uploads/${mediaUrl}`
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