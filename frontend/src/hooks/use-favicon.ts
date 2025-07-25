"use client"

import { useEffect } from 'react'
import { getFullApiUrl } from '@/lib/utils'

export function useFavicon(faviconUrl?: string) {
  useEffect(() => {
    if (!faviconUrl) return

    // Get the full URL
    const fullUrl = getFullApiUrl(faviconUrl)

    // Get existing favicon link or create new one
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    
    if (!faviconLink) {
      faviconLink = document.createElement('link')
      faviconLink.rel = 'icon'
      document.head.appendChild(faviconLink)
    }
    
    // Update favicon URL
    faviconLink.href = fullUrl
    
    // Also update shortcut icon if it exists
    const shortcutIcon = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement
    if (shortcutIcon) {
      shortcutIcon.href = fullUrl
    }
    
    // Update apple-touch-icon if it exists
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
    if (appleTouchIcon) {
      appleTouchIcon.href = fullUrl
    }
  }, [faviconUrl])
}