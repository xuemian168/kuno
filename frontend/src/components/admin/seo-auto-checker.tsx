"use client"

import { useState, useEffect } from "react"
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Settings,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  Eye,
  Calendar,
  Bell,
  Shield,
  Target,
  Activity
} from "lucide-react"
import { autoSEOChecker, scheduleWeeklySEOCheck, scheduleDailySEOCheck } from "@/services/seo-ai/auto-checker"
import { SEOHealthReport, AutoSEOCheckResult, SEOCheckSchedule } from "@/services/seo-ai/types"

export function SEOAutoChecker() {
  const t = useTranslations()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isRunningCheck, setIsRunningCheck] = useState(false)
  const [lastReport, setLastReport] = useState<SEOHealthReport | null>(null)
  const [checkHistory, setCheckHistory] = useState<AutoSEOCheckResult[]>([])
  const [schedules, setSchedules] = useState<Map<string, { schedule: SEOCheckSchedule, id: string }>>(new Map())
  
  // Configuration states
  const [autoCheckConfig, setAutoCheckConfig] = useState({
    enabled: false,
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    notifications: {
      email: false,
      dashboard: true,
      webhook: ''
    },
    thresholds: {
      min_score: 60,
      max_issues: 10,
      performance_threshold: 80
    },
    checkTypes: ['content', 'technical', 'keywords', 'performance'] as ('content' | 'technical' | 'keywords' | 'performance')[]
  })

  const [isConfigOpen, setIsConfigOpen] = useState(false)

  useEffect(() => {
    // Load check history
    const history = autoSEOChecker.getCheckHistory()
    setCheckHistory(history)
    
    // Get last successful report
    const lastSuccessful = history.find(h => h.success && h.report)
    if (lastSuccessful?.report) {
      setLastReport(lastSuccessful.report)
    }
  }, [])

  const runManualCheck = async () => {
    setIsRunningCheck(true)
    try {
      const report = await autoSEOChecker.runAutoCheck({
        checkTypes: autoCheckConfig.checkTypes,
        thresholds: autoCheckConfig.thresholds
      })
      
      setLastReport(report)
      
      // Refresh history
      const history = autoSEOChecker.getCheckHistory()
      setCheckHistory(history)
      
    } catch (error) {
      console.error('Manual SEO check failed:', error)
    } finally {
      setIsRunningCheck(false)
    }
  }

  const toggleScheduledCheck = () => {
    if (autoCheckConfig.enabled) {
      // Disable scheduled checks
      schedules.forEach((_, scheduleId) => {
        autoSEOChecker.cancelSchedule(scheduleId)
      })
      setSchedules(new Map())
      setAutoCheckConfig(prev => ({ ...prev, enabled: false }))
    } else {
      // Enable scheduled checks
      const scheduleFunction = autoCheckConfig.frequency === 'daily' ? scheduleDailySEOCheck : scheduleWeeklySEOCheck
      const scheduleId = scheduleFunction({
        checkTypes: autoCheckConfig.checkTypes,
        thresholds: autoCheckConfig.thresholds,
        notifications: autoCheckConfig.notifications
      })
      
      setSchedules(new Map([
        [scheduleId, {
          schedule: { frequency: autoCheckConfig.frequency, enabled: true },
          id: scheduleId
        }]
      ]))
      setAutoCheckConfig(prev => ({ ...prev, enabled: true }))
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthBadgeVariant = (health: string): 'default' | 'secondary' | 'destructive' => {
    switch (health) {
      case 'excellent': 
      case 'good': return 'default'
      case 'fair': return 'secondary'
      case 'poor': return 'destructive'
      default: return 'secondary'
    }
  }

  const getIssueSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <CheckCircle className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('seo.automation.title')}</h1>
          <p className="text-muted-foreground">{t('seo.automation.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                {t('seo.automation.configure')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('seo.automation.configTitle')}</DialogTitle>
                <DialogDescription>
                  {t('seo.automation.configDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-check-enabled">{t('seo.automation.enableAutoCheck')}</Label>
                    <Switch
                      id="auto-check-enabled"
                      checked={autoCheckConfig.enabled}
                      onCheckedChange={toggleScheduledCheck}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="frequency">{t('seo.automation.checkFrequency')}</Label>
                    <Select 
                      value={autoCheckConfig.frequency} 
                      onValueChange={(value: any) => setAutoCheckConfig(prev => ({ ...prev, frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t('seo.automation.daily')}</SelectItem>
                        <SelectItem value="weekly">{t('seo.automation.weekly')}</SelectItem>
                        <SelectItem value="monthly">{t('seo.automation.monthly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-base font-medium">{t('seo.automation.checkTypes')}</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(['content', 'technical', 'keywords', 'performance'] as const).map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Switch
                            id={`check-${type}`}
                            checked={autoCheckConfig.checkTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setAutoCheckConfig(prev => ({
                                  ...prev,
                                  checkTypes: [...prev.checkTypes, type]
                                }))
                              } else {
                                setAutoCheckConfig(prev => ({
                                  ...prev,
                                  checkTypes: prev.checkTypes.filter(t => t !== type)
                                }))
                              }
                            }}
                          />
                          <Label htmlFor={`check-${type}`} className="text-sm">
                            {type === 'content' ? t('seo.automation.contentAnalysis') :
                             type === 'technical' ? t('seo.automation.technicalSEO') :
                             type === 'keywords' ? t('seo.automation.keywordAnalysis') :
                             t('seo.automation.performanceCheck')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">{t('seo.automation.notificationSettings')}</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="email-notifications"
                          checked={autoCheckConfig.notifications.email}
                          onCheckedChange={(checked) => setAutoCheckConfig(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, email: checked }
                          }))}
                        />
                        <Label htmlFor="email-notifications" className="text-sm">{t('seo.automation.emailNotifications')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="dashboard-notifications"
                          checked={autoCheckConfig.notifications.dashboard}
                          onCheckedChange={(checked) => setAutoCheckConfig(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, dashboard: checked }
                          }))}
                        />
                        <Label htmlFor="dashboard-notifications" className="text-sm">{t('seo.automation.dashboardNotifications')}</Label>
                      </div>
                      <div>
                        <Label htmlFor="webhook-url" className="text-sm">Webhook URL</Label>
                        <Input
                          id="webhook-url"
                          value={autoCheckConfig.notifications.webhook}
                          onChange={(e) => setAutoCheckConfig(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, webhook: e.target.value }
                          }))}
                          placeholder="https://your-webhook-url.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={() => setIsConfigOpen(false)}>
                  {t('seo.automation.saveConfig')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={runManualCheck} 
            disabled={isRunningCheck}
            className="gap-2"
          >
            {isRunningCheck ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {t('seo.automation.runCheck')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">{t('seo.automation.healthStatus')}</TabsTrigger>
          <TabsTrigger value="history">{t('seo.automation.checkHistory')}</TabsTrigger>
          <TabsTrigger value="schedule">{t('seo.automation.scheduleManagement')}</TabsTrigger>
        </TabsList>

        {/* Health Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          {lastReport ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('seo.automation.overallHealth')}</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Badge variant={getHealthBadgeVariant(lastReport.overall_health)} className="text-lg px-3 py-1">
                        {lastReport.overall_health.toUpperCase()}
                      </Badge>
                      <div className="text-2xl font-bold">{lastReport.overall_score}/100</div>
                      <Progress value={lastReport.overall_score} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('seo.automation.articlesChecked')}</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{lastReport.articles_checked}</div>
                    <p className="text-xs text-muted-foreground">
                      {t('seo.automation.totalArticles', { count: lastReport.total_articles })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('seo.automation.issuesFound')}</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{lastReport.issues_found}</div>
                    <p className="text-xs text-red-600">
                      {t('seo.automation.criticalIssues', { count: lastReport.critical_issues })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('seo.automation.checkDuration')}</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(lastReport.check_duration / 1000)}s</div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lastReport.check_timestamp).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('seo.automation.qualityDistribution')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <span className="text-sm">{t('seo.automation.excellent')} (90+)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{lastReport.articles_summary.excellent}</span>
                        <Progress 
                          value={(lastReport.articles_summary.excellent / lastReport.articles_checked) * 100} 
                          className="w-20 h-2" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        <span className="text-sm">{t('seo.automation.good')} (70-89)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{lastReport.articles_summary.good}</span>
                        <Progress 
                          value={(lastReport.articles_summary.good / lastReport.articles_checked) * 100} 
                          className="w-20 h-2" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        <span className="text-sm">{t('seo.automation.fair')} (50-69)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{lastReport.articles_summary.fair}</span>
                        <Progress 
                          value={(lastReport.articles_summary.fair / lastReport.articles_checked) * 100} 
                          className="w-20 h-2" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <span className="text-sm">{t('seo.automation.poor')} (&lt;50)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{lastReport.articles_summary.poor}</span>
                        <Progress 
                          value={(lastReport.articles_summary.poor / lastReport.articles_checked) * 100} 
                          className="w-20 h-2" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('seo.automation.mainRecommendations')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {lastReport.recommendations.slice(0, 5).map((rec, index) => (
                        <Alert key={index} variant={rec.priority === 'high' ? 'destructive' : 'default'}>
                          <Target className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <div className="font-medium">{rec.message}</div>
                              <div className="text-sm">{rec.suggestion}</div>
                              <div className="text-xs text-muted-foreground">{t('seo.automation.impact')}: {rec.impact}</div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {lastReport.top_issues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('seo.automation.majorIssues')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {lastReport.top_issues.slice(0, 10).map((issue, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getIssueSeverityIcon(issue.severity)}
                            <div>
                              <div className="font-medium">{issue.message}</div>
                              <div className="text-sm text-muted-foreground">
                                {t('seo.automation.issueType')}: {issue.type} • {t('seo.automation.priority')}: {issue.priority}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">{issue.severity}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('seo.automation.noCheckYet')}</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {t('seo.automation.noCheckDescription')}
                </p>
                <Button onClick={runManualCheck} disabled={isRunningCheck}>
                  {isRunningCheck ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {t('seo.automation.startCheck')}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Check History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('seo.automation.checkHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {checkHistory.length > 0 ? (
                <div className="space-y-4">
                  {checkHistory.map((check, index) => (
                    <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {check.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <div className="font-medium">
                              {check.success ? t('seo.automation.checkCompleted') : t('seo.automation.checkFailed')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(check.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        {check.report && (
                          <div className="flex items-center gap-4 text-sm">
                            <span>{t('seo.automation.score')}: {check.report.overall_score}/100</span>
                            <span>{t('seo.automation.articles')}: {check.report.articles_checked}</span>
                            <span>{t('seo.automation.issues')}: {check.report.issues_found}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {check.report && (
                          <Badge variant={getHealthBadgeVariant(check.report.overall_health)}>
                            {check.report.overall_health}
                          </Badge>
                        )}
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          {t('seo.automation.view')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4" />
                  <p>{t('seo.automation.noHistory')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Management */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('seo.automation.autoCheckSchedule')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {autoCheckConfig.enabled ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Pause className="h-5 w-5 text-gray-600" />
                    )}
                    <div>
                      <div className="font-medium">
                        {t('seo.automation.autoSEOCheck')} - {autoCheckConfig.frequency === 'daily' ? t('seo.automation.daily') : autoCheckConfig.frequency === 'weekly' ? t('seo.automation.weekly') : t('seo.automation.monthly')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('seo.automation.status')}: {autoCheckConfig.enabled ? t('seo.automation.enabled') : t('seo.automation.disabled')}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={autoCheckConfig.enabled ? 'default' : 'secondary'}>
                    {autoCheckConfig.enabled ? t('seo.automation.running') : t('seo.automation.stopped')}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={toggleScheduledCheck}
                  >
                    {autoCheckConfig.enabled ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        {t('seo.automation.pause')}
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        {t('seo.automation.enable')}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{t('seo.automation.checkConfig')}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('seo.automation.frequency')}:</span> {autoCheckConfig.frequency === 'daily' ? t('seo.automation.daily') : autoCheckConfig.frequency === 'weekly' ? t('seo.automation.weekly') : t('seo.automation.monthly')}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('seo.automation.checkTypes')}:</span> {autoCheckConfig.checkTypes.length} {t('seo.automation.types')}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('seo.automation.minScoreThreshold')}:</span> {autoCheckConfig.thresholds.min_score}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('seo.automation.maxIssues')}:</span> {autoCheckConfig.thresholds.max_issues}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">{t('seo.automation.notificationSettings')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {autoCheckConfig.notifications.email ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                      <span>{t('seo.automation.emailNotifications')}: {autoCheckConfig.notifications.email ? t('seo.automation.enabled') : t('seo.automation.disabled')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {autoCheckConfig.notifications.dashboard ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                      <span>{t('seo.automation.dashboardNotifications')}: {autoCheckConfig.notifications.dashboard ? t('seo.automation.enabled') : t('seo.automation.disabled')}</span>
                    </div>
                    {autoCheckConfig.notifications.webhook && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{t('seo.automation.webhook')}: {t('seo.automation.configured')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}