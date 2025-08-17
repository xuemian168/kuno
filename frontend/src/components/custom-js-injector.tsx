'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export function CustomJSInjector() {
  const [customJS, setCustomJS] = useState<string>('')

  useEffect(() => {
    const loadCustomJS = async () => {
      try {
        const settings = await apiClient.getSettings()
        if (settings.custom_js) {
          setCustomJS(settings.custom_js)
        }
      } catch (error) {
        console.error('Failed to load custom JavaScript:', error)
      }
    }

    loadCustomJS()
  }, [])

  useEffect(() => {
    // Remove existing custom JS if any
    const existingScript = document.getElementById('kuno-custom-js')
    if (existingScript) {
      existingScript.remove()
    }

    // Inject new custom JavaScript if available
    if (customJS.trim()) {
      try {
        const scriptElement = document.createElement('script')
        scriptElement.id = 'kuno-custom-js'
        scriptElement.type = 'text/javascript'
        scriptElement.textContent = customJS
        
        // Append script to document head
        document.head.appendChild(scriptElement)
      } catch (error) {
        console.error('Error injecting custom JavaScript:', error)
      }
    }

    // Cleanup function
    return () => {
      const scriptElement = document.getElementById('kuno-custom-js')
      if (scriptElement) {
        scriptElement.remove()
      }
    }
  }, [customJS])

  // This component doesn't render anything visible
  return null
}