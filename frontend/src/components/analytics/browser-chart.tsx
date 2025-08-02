"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient, BrowserStats, PlatformStats } from '@/lib/api'
import { Monitor, Smartphone, Tablet, Users, Eye, Globe } from 'lucide-react'

interface BrowserChartProps {
  className?: string
}

export function BrowserChart({ className }: BrowserChartProps) {
  const t = useTranslations()
  const [browserData, setBrowserData] = useState<BrowserStats[] | null>(null)
  const [platformData, setPlatformData] = useState<PlatformStats[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.getBrowserAnalytics()
        setBrowserData(response.browser_stats || [])
        setPlatformData(response.platform_stats || [])
      } catch (error) {
        console.error('Failed to fetch browser analytics:', error)
        setBrowserData([])
        setPlatformData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {t('analytics.browserAndDevice')}
          </CardTitle>
          <CardDescription>{t('analytics.visitorsByBrowserAndDevice')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group browser data by browser name
  const browserGroups = (browserData || []).reduce((acc, item) => {
    if (!acc[item.browser]) {
      acc[item.browser] = {
        browser: item.browser,
        visitor_count: 0,
        view_count: 0,
        versions: []
      }
    }
    acc[item.browser].visitor_count += item.visitor_count
    acc[item.browser].view_count += item.view_count
    acc[item.browser].versions.push(item)
    return acc
  }, {} as Record<string, {
    browser: string
    visitor_count: number
    view_count: number
    versions: BrowserStats[]
  }>)

  // Group platform data by device type
  const deviceGroups = (platformData || []).reduce((acc, item) => {
    if (!acc[item.device_type]) {
      acc[item.device_type] = {
        device_type: item.device_type,
        visitor_count: 0,
        view_count: 0,
        platforms: []
      }
    }
    acc[item.device_type].visitor_count += item.visitor_count
    acc[item.device_type].view_count += item.view_count
    acc[item.device_type].platforms.push(item)
    return acc
  }, {} as Record<string, {
    device_type: string
    visitor_count: number
    view_count: number
    platforms: PlatformStats[]
  }>)

  const topBrowsers = Object.values(browserGroups)
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 8)

  const deviceTypes = Object.values(deviceGroups)
    .sort((a, b) => b.view_count - a.view_count)

  const totalViews = (browserData || []).reduce((sum, item) => sum + item.view_count, 0)

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'tablet':
        return <Tablet className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getBrowserIcon = (browser: string) => {
    const browserName = browser.toLowerCase()
    
    if (browserName.includes('chrome')) {
      return <img src="/browsers/chrome.svg" alt="Chrome" className="h-4 w-4" />
    } else if (browserName.includes('firefox')) {
      return <img src="/browsers/firefox.svg" alt="Firefox" className="h-4 w-4" />
    } else if (browserName.includes('safari')) {
      return <img src="/browsers/safari.svg" alt="Safari" className="h-4 w-4" />
    } else if (browserName.includes('edge')) {
      return <img src="/browsers/edge.svg" alt="Edge" className="h-4 w-4" />
    } else if (browserName.includes('opera')) {
      return <img src="/browsers/opera.svg" alt="Opera" className="h-4 w-4" />
    } else if (browserName.includes('wechat') || browserName.includes('微信')) {
      return <img src="/browsers/wechat.svg" alt="WeChat" className="h-4 w-4" />
    } else {
      // Default browser icon for unknown browsers
      return <Globe className="h-4 w-4" />
    }
  }

  const getOSIcon = (os: string) => {
    const osName = os.toLowerCase()
    
    if (osName.includes('android')) {
      return <img src="/devices/android.svg" alt="Android" className="h-4 w-4" />
    } else if (osName.includes('ios') || osName.includes('iphone') || osName.includes('ipad')) {
      return <img src="/devices/ios.svg" alt="iOS" className="h-4 w-4" />
    } else if (osName.includes('macos') || osName.includes('mac os') || osName.includes('darwin')) {
      return <img src="/devices/macos.svg" alt="macOS" className="h-4 w-4" />
    } else if (osName.includes('windows') || osName.includes('win')) {
      return <img src="/devices/windows.svg" alt="Windows" className="h-4 w-4" />
    } else if (osName.includes('linux') || osName.includes('ubuntu') || osName.includes('debian') || osName.includes('fedora') || osName.includes('centos')) {
      return <img src="/devices/linux.svg" alt="Linux" className="h-4 w-4" />
    } else {
      // Default OS icon for unknown operating systems
      return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          {t('analytics.browserAndDevice')}
        </CardTitle>
        <CardDescription>{t('analytics.visitorsByBrowserAndDevice')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="browsers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browsers">{t('analytics.browsers')}</TabsTrigger>
            <TabsTrigger value="devices">{t('analytics.devices')}</TabsTrigger>
            <TabsTrigger value="platforms">{t('analytics.platforms')}</TabsTrigger>
          </TabsList>

          <TabsContent value="browsers" className="space-y-3">
            {topBrowsers.length > 0 ? (
              topBrowsers.map((browser, index) => (
                <div key={browser.browser} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {getBrowserIcon(browser.browser)}
                      <div>
                        <p className="font-medium">{browser.browser}</p>
                        <p className="text-xs text-muted-foreground">
                          {browser.versions.length} {browser.versions.length === 1 ? t('analytics.version') : t('analytics.versions')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {browser.visitor_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {browser.view_count}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((browser.view_count / totalViews) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">{t('analytics.noBrowserData')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="devices" className="space-y-3">
            {deviceTypes.length > 0 ? (
              deviceTypes.map((device, index) => (
                <div key={device.device_type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(device.device_type)}
                      <div>
                        <p className="font-medium capitalize">{device.device_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {device.platforms.length} {device.platforms.length === 1 ? t('analytics.platform') : t('analytics.platforms')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {device.visitor_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {device.view_count}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((device.view_count / totalViews) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">{t('analytics.noDeviceData')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="platforms" className="space-y-3">
            {(platformData || []).length > 0 ? (
              (platformData || []).map((platform, index) => (
                <div key={`${platform.os}-${platform.os_version}-${platform.device_type}`} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-2">
                    {getOSIcon(platform.os)}
                    <div>
                      <p className="font-medium">{platform.os} {platform.os_version}</p>
                      <p className="text-xs text-muted-foreground">
                        {platform.platform} • {platform.device_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {platform.visitor_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {platform.view_count}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">{t('analytics.noPlatformData')}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}