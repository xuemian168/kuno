import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get base URL for API resources (backend)
 * Uses API URL with /api suffix removed
 */
export function getBaseUrl(): string {
  // In browser environment, use current origin for consistent URL generation
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Server-side: use API URL, remove /api suffix
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
  return apiBaseUrl.replace('/api', '')
}

/**
 * Get frontend site URL (for static assets)
 * Prioritizes explicit configuration, falls back to smart defaults
 */
export function getSiteUrl(): string {
  // In browser, use current location
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
  
  // Production fallback - derive from API URL
  return getBaseUrl()
}

// Convert relative API URLs to absolute URLs
export function getFullApiUrl(path: string): string {
  if (!path) return path
  
  // If it's already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // If it's a relative API path, prepend the API base URL
  if (path.startsWith('/api/')) {
    const baseUrl = getBaseUrl()
    return `${baseUrl}${path}`
  }
  
  return path
}

// Convert media URLs to accessible URLs
export function getMediaUrl(mediaUrl: string): string {
  if (!mediaUrl) return mediaUrl
  
  // If it's already a full URL, return as is
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl
  }
  
  // For relative upload paths, prepend the API base URL
  if (mediaUrl.startsWith('/uploads/')) {
    const baseUrl = getBaseUrl()
    return `${baseUrl}/api${mediaUrl}`
  }
  
  return mediaUrl
}
