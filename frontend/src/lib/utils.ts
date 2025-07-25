import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
    const baseUrl = apiBaseUrl.replace('/api', '') // Remove /api suffix
    return `${baseUrl}${path}`
  }
  
  return path
}
