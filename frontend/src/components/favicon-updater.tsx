"use client"

import { useEffect } from 'react'
import { useSettings } from '@/contexts/settings-context'
import { getMediaUrl } from '@/lib/config'

// This component updates the favicon on the client side when settings change
// It's mainly used in admin interface for immediate feedback
export function FaviconUpdater() {
  const { settings } = useSettings()

  useEffect(() => {
    if (!settings?.favicon_url) return

    const fullUrl = getMediaUrl(settings.favicon_url)

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
  }, [settings?.favicon_url])

  return null // This component doesn't render anything
}