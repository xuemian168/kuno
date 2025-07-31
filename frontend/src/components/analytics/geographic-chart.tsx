"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient, GeographicStats } from '@/lib/api'
import { Globe, MapPin, Users, Eye, Map } from 'lucide-react'
import { WorldMapComponent } from './world-map'

export function GeographicChart() {
  const t = useTranslations()
  const [geographicData, setGeographicData] = useState<GeographicStats[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.getGeographicAnalytics()
        setGeographicData(response.geographic_stats || [])
      } catch (error) {
        console.error('Failed to fetch geographic analytics:', error)
        setGeographicData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('analytics.geographicDistribution')}
          </CardTitle>
          <CardDescription>{t('analytics.visitorsByLocation')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group data by country for better visualization
  const countryData = (geographicData || []).reduce((acc, item) => {
    if (!acc[item.country]) {
      acc[item.country] = {
        country: item.country,
        visitor_count: 0,
        view_count: 0,
        regions: []
      }
    }
    acc[item.country].visitor_count += item.visitor_count
    acc[item.country].view_count += item.view_count
    acc[item.country].regions.push(item)
    return acc
  }, {} as Record<string, {
    country: string
    visitor_count: number
    view_count: number
    regions: GeographicStats[]
  }>)

  const topCountries = Object.values(countryData)
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 10)

  const totalViews = (geographicData || []).reduce((sum, item) => sum + item.view_count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t('analytics.geographicDistribution')}
        </CardTitle>
        <CardDescription>{t('analytics.visitorsByLocation')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              {t('analytics.worldMap') || 'World Map'}
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('analytics.detailedList') || 'Detailed List'}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="map" className="mt-6">
            <WorldMapComponent data={geographicData || []} loading={loading} />
          </TabsContent>
          
          <TabsContent value="list" className="mt-6">
            <div className="space-y-6">
              {/* Top Countries */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('analytics.topCountries')}
                </h4>
                <div className="space-y-3">
                  {topCountries.map((country, index) => (
                    <div key={country.country} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{country.country}</p>
                          <p className="text-xs text-muted-foreground">
                            {country.regions.length} {country.regions.length === 1 ? t('analytics.region') : t('analytics.regions')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {country.visitor_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {country.view_count}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {((country.view_count / totalViews) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regional Breakdown */}
              {(geographicData || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">{t('analytics.regionalBreakdown')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {(geographicData || []).slice(0, 20).map((item, index) => (
                      <div key={`${item.country}-${item.region}-${item.city}`} className="p-2 border rounded text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.city}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.region}, {item.country}
                            </p>
                          </div>
                          <div className="text-right text-xs">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {item.visitor_count}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {item.view_count}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(geographicData || []).length === 0 && (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">{t('analytics.noGeographicData')}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}