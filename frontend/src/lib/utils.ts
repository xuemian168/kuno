import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get base URL from API URL
export function getBaseUrl(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
  return apiBaseUrl.replace('/api', '') // Remove /api suffix
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
