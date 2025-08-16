'use client'

import { useState } from 'react'
import { Eye, EyeOff, Palette, Settings } from 'lucide-react'
import { useDynamicTheme } from '@/contexts/dynamic-theme-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

export function DynamicThemeToggle() {
  const { 
    analysisResult, 
    isAnalyzing, 
    isDynamicThemeActive, 
    toggleDynamicTheme,
    clearAnalysis 
  } = useDynamicTheme()

  const [showDetails, setShowDetails] = useState(false)

  const contrastRating = analysisResult ? (
    analysisResult.contrastRatio >= 7 ? 'AAA' :
    analysisResult.contrastRatio >= 4.5 ? 'AA' : 'Fail'
  ) : null

  const ratingColor = contrastRating === 'AAA' ? 'green' : 
                     contrastRating === 'AA' ? 'blue' : 'red'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 relative"
          title="Dynamic Theme Settings"
        >
          <Palette className="h-4 w-4" />
          {isAnalyzing && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
          {analysisResult && isDynamicThemeActive && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Dynamic Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onSelect={toggleDynamicTheme}>
          {isDynamicThemeActive ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Disable Dynamic Theme
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Enable Dynamic Theme
            </>
          )}
        </DropdownMenuItem>

        {analysisResult && isDynamicThemeActive && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Contrast Analysis</span>
                <Badge 
                  variant={contrastRating === 'Fail' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  WCAG {contrastRating}
                </Badge>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Contrast Ratio:</span>
                  <span className="font-mono">
                    {analysisResult.contrastRatio.toFixed(2)}:1
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Text Color:</span>
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-3 h-3 rounded border border-border"
                      style={{ backgroundColor: analysisResult.textColor }}
                    />
                    <span className="font-mono text-xs">
                      {analysisResult.textColor}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Background:</span>
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-3 h-3 rounded border border-border"
                      style={{ backgroundColor: analysisResult.backgroundColor }}
                    />
                    <span className="font-mono text-xs">
                      {analysisResult.backgroundColor}
                    </span>
                  </div>
                </div>

                {!analysisResult.isAccessible && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-yellow-800 dark:text-yellow-200">
                    ⚠️ Low contrast detected. Consider adjusting colors for better accessibility.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {isAnalyzing && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Analyzing background...
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={clearAnalysis} disabled={!analysisResult}>
          <Settings className="h-4 w-4 mr-2" />
          Clear Analysis Cache
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DynamicThemeToggle