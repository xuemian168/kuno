/**
 * Utility functions for URL generation and handling
 */

/**
 * Get the base URL for the current environment
 * In production, this will use the current domain
 * In development, it will use the configured API URL
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin
  }
  
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
}

/**
 * Generate a complete URL for media assets
 * @param path - The relative path (e.g., "/uploads/images/example.jpg")
 * @returns Complete URL for the media asset
 */
export function getMediaUrl(path: string): string {
  if (!path) return ''
  
  // If path already contains a protocol, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // Ensure path starts with /
  let normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  // Convert /uploads to /api/uploads since backend serves static files from /api/uploads
  if (normalizedPath.startsWith('/uploads')) {
    normalizedPath = `/api${normalizedPath}`
  }
  
  // In development, use the configured API URL
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_API_URL) {
    // Remove /api suffix if present to avoid double /api
    const apiUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '')
    return `${apiUrl}${normalizedPath}`
  }
  
  // In production, use current domain
  return `${getBaseUrl()}${normalizedPath}`
}

/**
 * Generate API URL for requests
 * @param endpoint - The API endpoint (e.g., "/articles")
 * @returns Complete API URL
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `${getBaseUrl()}/api`
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${normalizedEndpoint}`
}