import { useState, useEffect, useCallback, useRef } from 'react'

export interface ColorInfo {
  r: number
  g: number
  b: number
  hex: string
  brightness: number
  isLight: boolean
}

export interface AnalysisResult {
  dominantColor: ColorInfo
  averageColor: ColorInfo
  textColor: string
  backgroundColor: string
  contrastRatio: number
  isAccessible: boolean
}

interface UseImageColorAnalyzerOptions {
  sampleSize?: number
  cacheEnabled?: boolean
  contrastThreshold?: number
}

export function useImageColorAnalyzer(options: UseImageColorAnalyzerOptions = {}) {
  const {
    sampleSize = 50,
    cacheEnabled = true,
    contrastThreshold = 4.5 // WCAG AA standard
  } = options

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const cacheRef = useRef<Map<string, AnalysisResult>>(new Map())
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
  }, [])

  // Convert RGB to hex
  const rgbToHex = useCallback((r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }, [])

  // Calculate relative luminance (WCAG standard)
  const getLuminance = useCallback((r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }, [])

  // Calculate contrast ratio between two colors
  const getContrastRatio = useCallback((color1: ColorInfo, color2: ColorInfo): number => {
    const lum1 = getLuminance(color1.r, color1.g, color1.b)
    const lum2 = getLuminance(color2.r, color2.g, color2.b)
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    return (brightest + 0.05) / (darkest + 0.05)
  }, [getLuminance])

  // Create ColorInfo object
  const createColorInfo = useCallback((r: number, g: number, b: number): ColorInfo => {
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return {
      r,
      g,
      b,
      hex: rgbToHex(r, g, b),
      brightness,
      isLight: brightness > 128
    }
  }, [rgbToHex])

  // Get optimal text color for given background
  const getOptimalTextColor = useCallback((backgroundColor: ColorInfo): { color: ColorInfo; contrastRatio: number } => {
    const white = createColorInfo(255, 255, 255)
    const black = createColorInfo(0, 0, 0)
    
    const whiteContrast = getContrastRatio(backgroundColor, white)
    const blackContrast = getContrastRatio(backgroundColor, black)
    
    if (whiteContrast >= contrastThreshold && whiteContrast > blackContrast) {
      return { color: white, contrastRatio: whiteContrast }
    } else if (blackContrast >= contrastThreshold) {
      return { color: black, contrastRatio: blackContrast }
    } else {
      // If neither meets threshold, choose the better one
      return whiteContrast > blackContrast 
        ? { color: white, contrastRatio: whiteContrast }
        : { color: black, contrastRatio: blackContrast }
    }
  }, [createColorInfo, getContrastRatio, contrastThreshold])

  // Analyze image colors using Canvas API
  const analyzeImage = useCallback(async (imageUrl: string): Promise<AnalysisResult> => {
    if (!canvasRef.current) {
      throw new Error('Canvas not initialized')
    }

    // Check cache first
    if (cacheEnabled && cacheRef.current.has(imageUrl)) {
      return cacheRef.current.get(imageUrl)!
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const canvas = canvasRef.current!
          const ctx = canvas.getContext('2d')!
          
          // Set canvas size to sample size for performance
          canvas.width = sampleSize
          canvas.height = sampleSize
          
          // Draw and scale image
          ctx.drawImage(img, 0, 0, sampleSize, sampleSize)
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
          const data = imageData.data
          
          // Analyze colors
          let totalR = 0, totalG = 0, totalB = 0
          const colorMap = new Map<string, number>()
          const totalPixels = sampleSize * sampleSize
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            const alpha = data[i + 3]
            
            // Skip transparent pixels
            if (alpha < 128) continue
            
            totalR += r
            totalG += g
            totalB += b
            
            // Track color frequency for dominant color
            const colorKey = `${Math.floor(r/10)*10},${Math.floor(g/10)*10},${Math.floor(b/10)*10}`
            colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1)
          }
          
          // Calculate average color
          const avgR = Math.round(totalR / totalPixels)
          const avgG = Math.round(totalG / totalPixels)
          const avgB = Math.round(totalB / totalPixels)
          const averageColor = createColorInfo(avgR, avgG, avgB)
          
          // Find dominant color
          let dominantColorKey = ''
          let maxCount = 0
          for (const [colorKey, count] of colorMap.entries()) {
            if (count > maxCount) {
              maxCount = count
              dominantColorKey = colorKey
            }
          }
          
          const [domR, domG, domB] = dominantColorKey.split(',').map(Number)
          const dominantColor = createColorInfo(domR, domG, domB)
          
          // Use average color for text optimization (usually more readable)
          const { color: optimalTextColor, contrastRatio } = getOptimalTextColor(averageColor)
          
          const result: AnalysisResult = {
            dominantColor,
            averageColor,
            textColor: optimalTextColor.hex,
            backgroundColor: averageColor.hex,
            contrastRatio,
            isAccessible: contrastRatio >= contrastThreshold
          }
          
          // Cache result
          if (cacheEnabled) {
            cacheRef.current.set(imageUrl, result)
          }
          
          resolve(result)
        } catch (error) {
          reject(new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
      
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageUrl}`))
      }
      
      img.src = imageUrl
    })
  }, [sampleSize, cacheEnabled, createColorInfo, getOptimalTextColor, contrastThreshold])

  // Main analysis function
  const analyze = useCallback(async (imageUrl: string) => {
    if (!imageUrl) {
      setAnalysisResult(null)
      setError(null)
      return
    }

    setIsAnalyzing(true)
    setError(null)
    
    try {
      const result = await analyzeImage(imageUrl)
      setAnalysisResult(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze image'
      setError(errorMessage)
      setAnalysisResult(null)
    } finally {
      setIsAnalyzing(false)
    }
  }, [analyzeImage])

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  return {
    analyze,
    analysisResult,
    isAnalyzing,
    error,
    clearCache,
    // Utility functions for external use
    utils: {
      createColorInfo,
      getContrastRatio,
      getOptimalTextColor,
      getLuminance
    }
  }
}