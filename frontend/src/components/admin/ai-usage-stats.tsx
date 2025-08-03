"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { aiUsageTracker, AIUsageStats, DailyUsageStats } from "@/services/ai-usage-tracker"
import { 
  Activity, 
  DollarSign, 
  Hash, 
  RefreshCw, 
  TrendingUp,
  Zap,
  Database,
  Clock,
  Brain,
  Languages,
  Search
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AIUsageStatsProps {
  className?: string
  showDetailed?: boolean
  locale?: string
}

export function AIUsageStatsComponent({ className, showDetailed = false, locale = 'zh' }: AIUsageStatsProps) {
  const [stats, setStats] = useState<AIUsageStats[]>([])
  const [totalCost, setTotalCost] = useState<{ totalCost: number; currency: string; periodDays: number } | null>(null)
  const [dailyStats, setDailyStats] = useState<Record<string, DailyUsageStats>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshStats = async () => {
    setRefreshing(true)
    setError(null)
    try {
      // Get usage stats for last 30 days
      const [usageStats, costData, dailyData] = await Promise.all([
        aiUsageTracker.getUsageStats(undefined, undefined, 30),
        aiUsageTracker.getTotalCost(30),
        aiUsageTracker.getDailyUsage(30)
      ])
      
      setStats(usageStats)
      setTotalCost(costData)
      setDailyStats(dailyData)
    } catch (error) {
      console.error('Failed to fetch AI usage stats:', error)
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Authorization')) {
          setError(locale === 'zh' ? '需要管理员权限才能查看AI使用统计' : 'Admin privileges required to view AI usage statistics')
        } else if (error.message.includes('500')) {
          setError(locale === 'zh' ? '服务器内部错误，请稍后重试' : 'Server error, please try again later')
        } else {
          setError(locale === 'zh' ? '无法加载AI使用统计数据' : 'Failed to load AI usage statistics')
        }
      } else {
        setError(locale === 'zh' ? '未知错误' : 'Unknown error')
      }
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshStats()
    
    // Refresh stats every 60 seconds
    const interval = setInterval(refreshStats, 60000)
    return () => clearInterval(interval)
  }, [])

  const formatCost = (cost: number | undefined | null, currency: string = 'USD') => {
    if (!cost || cost === 0) return locale === 'zh' ? '免费' : 'Free'
    return `$${cost.toFixed(6)} ${currency}`
  }

  const formatNumber = (num: number | undefined | null) => {
    if (!num || num === 0) return '0'
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'summary':
        return <Brain className="h-4 w-4 text-blue-500" />
      case 'translation':
        return <Languages className="h-4 w-4 text-green-500" />
      case 'seo':
        return <Search className="h-4 w-4 text-purple-500" />
      default:
        return <Zap className="h-4 w-4 text-gray-500" />
    }
  }

  const getServiceName = (serviceType: string) => {
    switch (serviceType) {
      case 'summary':
        return locale === 'zh' ? 'AI摘要' : 'AI Summary'
      case 'translation':
        return locale === 'zh' ? 'AI翻译' : 'AI Translation'
      case 'seo':
        return locale === 'zh' ? 'SEO生成' : 'SEO Generation'
      default:
        return serviceType
    }
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">
          {locale === 'zh' ? '加载AI使用统计...' : 'Loading AI usage stats...'}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshStats}
                disabled={refreshing}
                className="gap-1"
              >
                <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
                {locale === 'zh' ? '重试' : 'Retry'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!showDetailed) {
    // Compact version
    const totalRequests = stats?.reduce((sum, stat) => sum + stat.totalRequests, 0) || 0
    const totalTokens = stats?.reduce((sum, stat) => sum + stat.totalTokens, 0) || 0
    
    return (
      <div className={cn("flex items-center gap-3 text-sm", className)}>
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-blue-500" />
          <span className="font-medium">{locale === 'zh' ? 'AI使用' : 'AI Usage'}</span>
        </div>
        
        {totalRequests > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>{totalRequests}</span>
            </div>
          </>
        )}
        
        {totalTokens > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1 text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span>{formatNumber(totalTokens)}</span>
            </div>
          </>
        )}
        
        {totalCost && totalCost.totalCost > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>{formatCost(totalCost.totalCost, totalCost.currency)}</span>
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
      {/* Total Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-orange-500" />
            {locale === 'zh' ? 'AI使用总计 (30天)' : 'AI Usage Summary (30 days)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.reduce((sum, stat) => sum + stat.totalRequests, 0) || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {locale === 'zh' ? '总请求数' : 'Total Requests'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatNumber(stats?.reduce((sum, stat) => sum + stat.totalTokens, 0) || 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                {locale === 'zh' ? '总Token数' : 'Total Tokens'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {totalCost ? formatCost(totalCost.totalCost, totalCost.currency) : '$0.00'}
              </div>
              <div className="text-xs text-muted-foreground">
                {locale === 'zh' ? '总费用' : 'Total Cost'}
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t flex justify-end">
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

      {/* Service Breakdown */}
      {stats && stats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              {locale === 'zh' ? '服务类型分解' : 'Service Breakdown'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getServiceIcon(stat.serviceType)}
                    <div>
                      <div className="font-medium">{getServiceName(stat.serviceType)}</div>
                      <div className="text-sm text-muted-foreground">
                        {stat.provider} • {stat.successRequests}/{stat.totalRequests} {locale === 'zh' ? '成功' : 'success'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCost(stat.totalCost, stat.currency)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(stat.totalTokens)} tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data Message */}
      {(!stats || stats.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{locale === 'zh' ? '暂无AI使用记录' : 'No AI usage records found'}</p>
              <p className="text-sm mt-2">
                {locale === 'zh' ? '开始使用AI功能后，统计数据将显示在此处' : 'Usage statistics will appear here after using AI features'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}