"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { translationService, TranslationUsageStats } from "@/services/translation"
import { 
  Activity, 
  DollarSign, 
  Hash, 
  RefreshCw, 
  TrendingUp,
  Zap,
  Database,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TranslationStatsProps {
  className?: string
  showDetailed?: boolean
  locale?: string
}

export function TranslationStats({ className, showDetailed = false, locale = 'zh' }: TranslationStatsProps) {
  const [stats, setStats] = useState<TranslationUsageStats | null>(null)
  const [currentProvider, setCurrentProvider] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)

  const refreshStats = () => {
    setRefreshing(true)
    setTimeout(() => {
      const currentStats = translationService.getUsageStats()
      setStats(currentStats)
      
      const provider = translationService.getActiveProvider()
      setCurrentProvider(provider?.name || 'None')
      setRefreshing(false)
    }, 300)
  }

  useEffect(() => {
    refreshStats()
    
    // Refresh stats every 30 seconds
    const interval = setInterval(refreshStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatCost = (cost: number, currency: string = 'USD') => {
    if (cost === 0) return locale === 'zh' ? '免费' : 'Free'
    return `$${cost.toFixed(6)} ${currency}`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  if (!stats) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">
          {locale === 'zh' ? '加载统计数据...' : 'Loading stats...'}
        </span>
      </div>
    )
  }

  if (!showDetailed) {
    // Compact version for article editor
    return (
      <div className={cn("flex items-center gap-3 text-sm", className)}>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-blue-500" />
          <span className="font-medium">{currentProvider}</span>
        </div>
        
        {stats.sessionStats.translations > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>{stats.sessionStats.translations}</span>
            </div>
          </>
        )}
        
        {stats.sessionStats.tokens > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1 text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span>{formatNumber(stats.sessionStats.tokens)}</span>
            </div>
          </>
        )}
        
        {stats.sessionStats.cost > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>{formatCost(stats.sessionStats.cost, stats.currency)}</span>
            </div>
          </>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshStats}
          disabled={refreshing}
          className="h-6 px-2 ml-2"
        >
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        </Button>
      </div>
    )
  }

  // Detailed version for settings page
  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Provider */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            {locale === 'zh' ? '当前翻译引擎' : 'Current Translation Engine'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Badge variant={currentProvider !== 'None' ? 'default' : 'secondary'} className="text-sm">
              {currentProvider}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStats}
              disabled={refreshing}
              className="gap-1"
            >
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              {locale === 'zh' ? '刷新' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-500" />
            {locale === 'zh' ? '本次会话统计' : 'Session Statistics'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.sessionStats.translations}
              </div>
              <div className="text-xs text-muted-foreground">
                {locale === 'zh' ? '翻译次数' : 'Translations'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatNumber(stats.sessionStats.tokens)}
              </div>
              <div className="text-xs text-muted-foreground">
                {locale === 'zh' ? 'Token数' : 'Tokens'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCost(stats.sessionStats.cost, stats.currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {locale === 'zh' ? '会话费用' : 'Session Cost'}
              </div>
            </div>
          </div>
          
          {stats.sessionStats.translations > 0 && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => translationService.resetSessionStats()}
                className="w-full gap-1"
              >
                <TrendingUp className="h-3 w-3" />
                {locale === 'zh' ? '重置会话统计' : 'Reset Session Stats'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-orange-500" />
            {locale === 'zh' ? '总计统计' : 'Total Statistics'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalTranslations}
              </div>
              <div className="text-xs text-muted-foreground">
                {locale === 'zh' ? '总翻译数' : 'Total Translations'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatNumber(stats.totalTokens)}
              </div>
              <div className="text-xs text-muted-foreground">
                {locale === 'zh' ? '总Token数' : 'Total Tokens'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCost(stats.totalCost, stats.currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {locale === 'zh' ? '总费用' : 'Total Cost'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}