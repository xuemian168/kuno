"use client"

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import WorldMap from 'react-svg-worldmap'
import { GeographicStats } from '@/lib/api'

interface WorldMapComponentProps {
  data: GeographicStats[]
  loading?: boolean
}

export function WorldMapComponent({ data, loading }: WorldMapComponentProps) {
  const t = useTranslations()
  const { theme } = useTheme()

  // Transform data for react-svg-worldmap
  const mapData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Group data by country and sum up the values
    const countryMap = data.reduce((acc, item) => {
      const country = item.country
      if (!acc[country]) {
        acc[country] = {
          country,
          value: 0,
          visitor_count: 0,
          view_count: 0
        }
      }
      acc[country].value += item.view_count // Use view_count as the primary metric
      acc[country].visitor_count += item.visitor_count
      acc[country].view_count += item.view_count
      return acc
    }, {} as Record<string, {
      country: string
      value: number
      visitor_count: number
      view_count: number
    }>)

    // Convert to array format expected by react-svg-worldmap
    return Object.values(countryMap).map(item => ({
      country: convertCountryName(item.country),
      value: item.value
    }))
  }, [data])

  // Get the maximum value for color scaling
  const maxValue = useMemo(() => {
    return Math.max(...mapData.map(item => item.value), 1)
  }, [mapData])

  // Color scheme based on theme - using primary color gradients
  const colorScheme = useMemo(() => {
    const isDark = theme === 'dark'
    return isDark 
      ? ['#1e293b', '#475569', '#64748b', '#94a3b8', '#3b82f6', '#2563eb', '#1d4ed8'] // Dark theme with blue highlights
      : ['#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#3b82f6', '#2563eb', '#1d4ed8'] // Light theme with blue highlights
  }, [theme])

  // Convert country names to ISO 2-letter codes that react-svg-worldmap expects
  function convertCountryName(countryName: string): string {
    const countryMapping: Record<string, string> = {
      'China': 'CN',
      'United States': 'US',
      'Japan': 'JP',
      'Germany': 'DE',
      'United Kingdom': 'GB',
      'France': 'FR',
      'Italy': 'IT',
      'Spain': 'ES',
      'Canada': 'CA',
      'Australia': 'AU',
      'Brazil': 'BR',
      'India': 'IN',
      'Russia': 'RU',
      'South Korea': 'KR',
      'Netherlands': 'NL',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Finland': 'FI',
      'Switzerland': 'CH',
      'Austria': 'AT',
      'Belgium': 'BE',
      'Portugal': 'PT',
      'Greece': 'GR',
      'Poland': 'PL',
      'Czech Republic': 'CZ',
      'Hungary': 'HU',
      'Ireland': 'IE',
      'Mexico': 'MX',
      'Argentina': 'AR',
      'Chile': 'CL',
      'Colombia': 'CO',
      'Peru': 'PE',
      'Venezuela': 'VE',
      'South Africa': 'ZA',
      'Egypt': 'EG',
      'Turkey': 'TR',
      'Saudi Arabia': 'SA',
      'United Arab Emirates': 'AE',
      'Israel': 'IL',
      'Thailand': 'TH',
      'Vietnam': 'VN',
      'Malaysia': 'MY',
      'Singapore': 'SG',
      'Indonesia': 'ID',
      'Philippines': 'PH',
      'Taiwan': 'TW',
      'Hong Kong': 'HK',
      'New Zealand': 'NZ'
    }
    
    return countryMapping[countryName] || countryName.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (mapData.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-muted-foreground">{t('analytics.noGeographicData')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Map Legend */}
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-medium">{t('analytics.visitorWorldMap')}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t('analytics.lowActivity')}</span>
          <div className="flex gap-1">
            {colorScheme.map((color, index) => (
              <div
                key={index}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span>{t('analytics.highActivity')}</span>
        </div>
      </div>

      {/* World Map */}
      <div className="w-full h-96 bg-background rounded-lg border overflow-hidden">
        <WorldMap
          data={mapData}
          size="responsive"
          color={theme === 'dark' ? '#475569' : '#94a3b8'}
          backgroundColor="transparent"
          borderColor={theme === 'dark' ? '#334155' : '#cbd5e1'}
          strokeOpacity={0.5}
          tooltipBgColor={theme === 'dark' ? '#1e293b' : '#ffffff'}
          tooltipTextColor={theme === 'dark' ? '#f1f5f9' : '#1e293b'}
          richInteraction
          frame={false}
          valueSuffix=" views"
        />
      </div>

      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-primary">
            {Object.keys(mapData.reduce((acc, item) => ({ ...acc, [item.country]: true }), {})).length}
          </div>
          <div className="text-xs text-muted-foreground">{t('analytics.countries')}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary">
            {data.reduce((sum, item) => sum + item.visitor_count, 0)}
          </div>
          <div className="text-xs text-muted-foreground">{t('analytics.totalVisitors')}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary">
            {data.reduce((sum, item) => sum + item.view_count, 0)}
          </div>
          <div className="text-xs text-muted-foreground">{t('analytics.totalViews')}</div>
        </div>
      </div>
    </div>
  )
}