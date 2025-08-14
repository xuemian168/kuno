'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export function CustomCSSInjector() {
  const [customCSS, setCustomCSS] = useState<string>('')

  useEffect(() => {
    const loadCustomCSS = async () => {
      try {
        const settings = await apiClient.getSettings()
        if (settings.custom_css) {
          setCustomCSS(settings.custom_css)
        }
      } catch (error) {
        console.error('Failed to load custom CSS:', error)
      }
    }

    loadCustomCSS()
  }, [])

  useEffect(() => {
    // Remove existing custom CSS if any
    const existingStyle = document.getElementById('kuno-custom-css')
    if (existingStyle) {
      existingStyle.remove()
    }

    // Inject new custom CSS if available
    if (customCSS.trim()) {
      const styleElement = document.createElement('style')
      styleElement.id = 'kuno-custom-css'
      styleElement.type = 'text/css'
      styleElement.textContent = customCSS
      document.head.appendChild(styleElement)
    }

    // Cleanup function
    return () => {
      const styleElement = document.getElementById('kuno-custom-css')
      if (styleElement) {
        styleElement.remove()
      }
    }
  }, [customCSS])

  // This component doesn't render anything visible
  return null
}