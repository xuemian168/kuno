'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useImageColorAnalyzer, AnalysisResult } from '@/hooks/useImageColorAnalyzer'

interface DynamicThemeContextType {
  analysisResult: AnalysisResult | null
  isAnalyzing: boolean
  error: string | null
  analyzeBackground: (imageUrl: string) => Promise<void>
  clearAnalysis: () => void
  isDynamicThemeActive: boolean
  toggleDynamicTheme: () => void
}

const DynamicThemeContext = createContext<DynamicThemeContextType | undefined>(undefined)

interface DynamicThemeProviderProps {
  children: React.ReactNode
}

export function DynamicThemeProvider({ children }: DynamicThemeProviderProps) {
  const [isDynamicThemeActive, setIsDynamicThemeActive] = useState(true)
  const { analyze, analysisResult, isAnalyzing, error, clearCache } = useImageColorAnalyzer({
    sampleSize: 64, // Optimized for performance
    cacheEnabled: true,
    contrastThreshold: 4.5 // WCAG AA standard
  })

  // Apply CSS variables when analysis result changes
  useEffect(() => {
    if (!isDynamicThemeActive || !analysisResult) {
      // Reset to default theme
      document.documentElement.style.removeProperty('--dynamic-text-color')
      document.documentElement.style.removeProperty('--dynamic-bg-color')
      document.documentElement.style.removeProperty('--dynamic-bg-alpha')
      document.documentElement.style.removeProperty('--dynamic-border-color')
      document.documentElement.style.removeProperty('--dynamic-accent-color')
      return
    }

    const { textColor, averageColor, contrastRatio, isAccessible } = analysisResult

    // Set CSS custom properties for dynamic theming
    document.documentElement.style.setProperty('--dynamic-text-color', textColor)
    document.documentElement.style.setProperty('--dynamic-bg-color', averageColor.hex)
    
    // Adjust background opacity based on contrast ratio
    const bgAlpha = isAccessible ? 0.85 : 0.95
    document.documentElement.style.setProperty('--dynamic-bg-alpha', bgAlpha.toString())
    
    // Generate accent colors based on average color
    const accentColor = adjustColorBrightness(averageColor.hex, averageColor.isLight ? -20 : 20)
    const borderColor = adjustColorBrightness(averageColor.hex, averageColor.isLight ? -10 : 10)
    
    document.documentElement.style.setProperty('--dynamic-accent-color', accentColor)
    document.documentElement.style.setProperty('--dynamic-border-color', borderColor)

    // Add accessibility warning if needed
    if (!isAccessible) {
      console.warn(`Low contrast ratio detected: ${contrastRatio.toFixed(2)}. Consider using a different background or adjusting colors.`)
    }
  }, [analysisResult, isDynamicThemeActive])

  // Analyze background image
  const analyzeBackground = useCallback(async (imageUrl: string) => {
    if (!isDynamicThemeActive) return
    
    try {
      await analyze(imageUrl)
    } catch (error) {
      console.error('Failed to analyze background image:', error)
    }
  }, [analyze, isDynamicThemeActive])

  // Clear analysis and reset theme
  const clearAnalysis = useCallback(() => {
    clearCache()
    // Reset CSS variables
    document.documentElement.style.removeProperty('--dynamic-text-color')
    document.documentElement.style.removeProperty('--dynamic-bg-color')
    document.documentElement.style.removeProperty('--dynamic-bg-alpha')
    document.documentElement.style.removeProperty('--dynamic-border-color')
    document.documentElement.style.removeProperty('--dynamic-accent-color')
  }, [clearCache])

  // Toggle dynamic theme
  const toggleDynamicTheme = useCallback(() => {
    setIsDynamicThemeActive(prev => {
      const newValue = !prev
      if (!newValue) {
        clearAnalysis()
      }
      return newValue
    })
  }, [clearAnalysis])

  // Save theme preference to localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('dynamic-theme-enabled')
    if (savedPreference !== null) {
      setIsDynamicThemeActive(JSON.parse(savedPreference))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('dynamic-theme-enabled', JSON.stringify(isDynamicThemeActive))
  }, [isDynamicThemeActive])

  const value: DynamicThemeContextType = {
    analysisResult,
    isAnalyzing,
    error,
    analyzeBackground,
    clearAnalysis,
    isDynamicThemeActive,
    toggleDynamicTheme
  }

  return (
    <DynamicThemeContext.Provider value={value}>
      {children}
    </DynamicThemeContext.Provider>
  )
}

export function useDynamicTheme() {
  const context = useContext(DynamicThemeContext)
  if (context === undefined) {
    throw new Error('useDynamicTheme must be used within a DynamicThemeProvider')
  }
  return context
}

// Utility function to adjust color brightness
function adjustColorBrightness(hex: string, amount: number): string {
  const color = hex.replace('#', '')
  const num = parseInt(color, 16)
  
  let r = (num >> 16) + amount
  let g = ((num & 0x0000FF00) >> 8) + amount
  let b = (num & 0x000000FF) + amount
  
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}