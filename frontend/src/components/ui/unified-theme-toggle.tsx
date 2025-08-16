'use client'

import { useState } from 'react'
import { Moon, Sun, Monitor, Eye, EyeOff, Palette, Settings } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
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

export function UnifiedThemeToggle() {
  const t = useTranslations('themeSettings')
  const { theme, setTheme } = useTheme()
  const { 
    analysisResult, 
    isAnalyzing, 
    isDynamicThemeActive, 
    toggleDynamicTheme,
    clearAnalysis 
  } = useDynamicTheme()

  // Determine the primary icon based on current state
  const getPrimaryIcon = () => {
    if (isDynamicThemeActive && (analysisResult || isAnalyzing)) {
      return <Palette className="h-4 w-4" />
    }
    
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4 scale-100 rotate-0 transition-all" />
      case 'dark':
        return <Moon className="h-4 w-4 scale-100 rotate-0 transition-all" />
      case 'system':
        return <Monitor className="h-4 w-4 scale-100 rotate-0 transition-all" />
      default:
        return (
          <>
            <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </>
        )
    }
  }

  // Determine status indicator
  const getStatusIndicator = () => {
    if (isAnalyzing) {
      return <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
    }
    if (analysisResult && isDynamicThemeActive) {
      return <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
    }
    return null
  }

  const contrastRating = analysisResult ? (
    analysisResult.contrastRatio >= 7 ? 'AAA' :
    analysisResult.contrastRatio >= 4.5 ? 'AA' : 'Fail'
  ) : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 relative"
          title={t('title')}
        >
          {getPrimaryIcon()}
          {getStatusIndicator()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {t('title')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Basic Theme Mode Selection */}
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium mb-2">{t('baseTheme')}</p>
          <div className="grid grid-cols-3 gap-1">
            <DropdownMenuItem 
              className={`justify-center ${theme === 'light' ? 'bg-accent' : ''}`}
              onSelect={() => setTheme('light')}
            >
              <div className="flex flex-col items-center gap-1">
                <Sun className="h-4 w-4" />
                <span className="text-xs">{t('light')}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className={`justify-center ${theme === 'dark' ? 'bg-accent' : ''}`}
              onSelect={() => setTheme('dark')}
            >
              <div className="flex flex-col items-center gap-1">
                <Moon className="h-4 w-4" />
                <span className="text-xs">{t('dark')}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className={`justify-center ${theme === 'system' ? 'bg-accent' : ''}`}
              onSelect={() => setTheme('system')}
            >
              <div className="flex flex-col items-center gap-1">
                <Monitor className="h-4 w-4" />
                <span className="text-xs">{t('system')}</span>
              </div>
            </DropdownMenuItem>
          </div>
        </div>

        <DropdownMenuSeparator />
        
        {/* Dynamic Theme Toggle */}
        <DropdownMenuItem onSelect={toggleDynamicTheme}>
          {isDynamicThemeActive ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              {t('disableDynamicTheme')}
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              {t('enableDynamicTheme')}
            </>
          )}
        </DropdownMenuItem>

        {/* Dynamic Theme Analysis Results */}
        {analysisResult && isDynamicThemeActive && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{t('contrastAnalysis')}</span>
                <Badge 
                  variant={contrastRating === 'Fail' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  WCAG {contrastRating}
                </Badge>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t('contrastRatio')}:</span>
                  <span className="font-mono">
                    {analysisResult.contrastRatio.toFixed(2)}:1
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>{t('textColor')}:</span>
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
                  <span>{t('background')}:</span>
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
                    ⚠️ {t('lowContrastWarning')}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Analysis Loading State */}
        {isAnalyzing && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                {t('analyzingBackground')}
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={clearAnalysis} disabled={!analysisResult}>
          <Settings className="h-4 w-4 mr-2" />
          {t('clearAnalysisCache')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UnifiedThemeToggle