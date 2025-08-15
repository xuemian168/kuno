"use client"

import { useEffect, useState } from 'react'
import { useSettings } from '@/contexts/settings-context'
import { getApiUrl } from '@/lib/config'

interface BackgroundManagerProps {
  isAdminRoute?: boolean
}

export function BackgroundManager({ isAdminRoute = false }: BackgroundManagerProps) {
  const { settings } = useSettings()
  const [backgroundStyle, setBackgroundStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    // Don't show background on admin routes
    if (isAdminRoute || !settings) {
      setBackgroundStyle({})
      return
    }

    const { background_type, background_color, background_image_url, background_opacity } = settings

    let style: React.CSSProperties = {}

    switch (background_type) {
      case 'color':
        if (background_color) {
          style = {
            backgroundColor: background_color,
            opacity: background_opacity || 0.8,
          }
        }
        break
      
      case 'image':
        if (background_image_url) {
          let imageUrl = background_image_url
          
          // Handle different URL formats
          if (background_image_url.startsWith('/uploads/backgrounds/')) {
            // API relative path
            imageUrl = `${getApiUrl()}${background_image_url}`
          } else if (!background_image_url.startsWith('http')) {
            // Assume it's a relative API path
            imageUrl = `${getApiUrl()}/uploads/backgrounds/${background_image_url}`
          }

          style = {
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            opacity: background_opacity || 0.8,
          }
        }
        break
      
      case 'none':
      default:
        style = {}
        break
    }

    setBackgroundStyle(style)
  }, [settings, isAdminRoute])

  // Don't render anything if no background or on admin routes
  if (isAdminRoute || !settings || settings.background_type === 'none' || Object.keys(backgroundStyle).length === 0) {
    return null
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[-1] bg-fixed"
      style={backgroundStyle}
      aria-hidden="true"
    />
  )
}