"use client"

import { useMemo, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps'
import { GeographicStats } from '@/lib/api'

interface WorldMapComponentProps {
  data: GeographicStats[]
  loading?: boolean
}

// World map topology URL - using a reliable GeoJSON source
const geoUrl = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"

export function WorldMapComponent({ data, loading }: WorldMapComponentProps) {
  const t = useTranslations()
  const { theme } = useTheme()
  const [tooltipContent, setTooltipContent] = useState<string>("")
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Transform data for react-simple-maps
  const mapData = useMemo(() => {
    if (!data || data.length === 0) return new Map()

    // Group data by country and sum up the values
    // Special handling for Hong Kong, Macau, and Taiwan - combine with China
    const countryMap = data.reduce((acc, item) => {
      let country = item.country
      
      // Combine Hong Kong, Macau, and Taiwan data with China
      if (country === 'Hong Kong' || country === 'Macau' || country === 'Taiwan') {
        country = 'China'
      }
      
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

    // Convert to Map for efficient lookup using multiple keys
    const result = new Map()
    Object.values(countryMap).forEach(item => {
      const isoCode = convertCountryName(item.country)
      
      // Add with ISO 3-letter code
      result.set(isoCode, item)
      
      // Add with original country name
      result.set(item.country, item)
      
      // Add with normalized country names for common variations
      const normalizedNames = [
        item.country.toLowerCase(),
        item.country.replace(/\s+/g, ''),
        item.country.replace(/\s+/g, '').toLowerCase()
      ]
      normalizedNames.forEach(name => result.set(name, item))
    })
    return result
  }, [data])

  // Get the maximum value for color scaling
  const maxValue = useMemo(() => {
    if (mapData.size === 0) return 1
    return Math.max(...Array.from(mapData.values()).map((item: any) => item.value), 1)
  }, [mapData])

  // Get color for a country based on its value
  const getCountryColor = (countryData: any) => {
    if (!countryData || countryData.value === 0) {
      return theme === 'dark' ? '#1e293b' : '#f8fafc' // Default color for countries with no data
    }
    
    const intensity = countryData.value / maxValue
    const isDark = theme === 'dark'
    
    if (intensity < 0.2) return isDark ? '#475569' : '#cbd5e1'
    if (intensity < 0.4) return isDark ? '#64748b' : '#94a3b8'
    if (intensity < 0.6) return isDark ? '#94a3b8' : '#64748b'
    if (intensity < 0.8) return '#3b82f6'
    return '#2563eb'
  }

  // Color scheme for legend
  const colorScheme = useMemo(() => {
    const isDark = theme === 'dark'
    return isDark 
      ? ['#1e293b', '#475569', '#64748b', '#94a3b8', '#3b82f6', '#2563eb'] // Dark theme
      : ['#f8fafc', '#cbd5e1', '#94a3b8', '#64748b', '#3b82f6', '#2563eb'] // Light theme
  }, [theme])

  // Optimized event handlers
  const handleMouseEnter = useCallback((event: any, countryData: any, countryName: string) => {
    if (countryData) {
      setTooltipContent(`${countryName}: ${countryData.value} views (${countryData.visitor_count} visitors)`)
    } else {
      setTooltipContent(`${countryName}: No data`)
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setPosition({ x: rect.left + rect.width / 2, y: rect.top })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTooltipContent("")
  }, [])

  // Convert country names to ISO 3-letter codes that react-simple-maps expects
  function convertCountryName(countryName: string): string {
    const countryMapping: Record<string, string> = {
      'China': 'CHN',
      'United States': 'USA',
      'Japan': 'JPN',
      'Germany': 'DEU',
      'United Kingdom': 'GBR',
      'France': 'FRA',
      'Italy': 'ITA',
      'Spain': 'ESP',
      'Canada': 'CAN',
      'Australia': 'AUS',
      'Brazil': 'BRA',
      'India': 'IND',
      'Russia': 'RUS',
      'South Korea': 'KOR',
      'Netherlands': 'NLD',
      'Sweden': 'SWE',
      'Norway': 'NOR',
      'Denmark': 'DNK',
      'Finland': 'FIN',
      'Switzerland': 'CHE',
      'Austria': 'AUT',
      'Belgium': 'BEL',
      'Portugal': 'PRT',
      'Greece': 'GRC',
      'Poland': 'POL',
      'Czech Republic': 'CZE',
      'Hungary': 'HUN',
      'Ireland': 'IRL',
      'Mexico': 'MEX',
      'Argentina': 'ARG',
      'Chile': 'CHL',
      'Colombia': 'COL',
      'Peru': 'PER',
      'Venezuela': 'VEN',
      'South Africa': 'ZAF',
      'Egypt': 'EGY',
      'Turkey': 'TUR',
      'Saudi Arabia': 'SAU',
      'United Arab Emirates': 'ARE',
      'Israel': 'ISR',
      'Thailand': 'THA',
      'Vietnam': 'VNM',
      'Malaysia': 'MYS',
      'Singapore': 'SGP',
      'Indonesia': 'IDN',
      'Philippines': 'PHL',
      'Taiwan': 'CHN',
      'Hong Kong': 'CHN',
      'Macau': 'CHN',
      'New Zealand': 'NZL'
    }
    
    return countryMapping[countryName] || countryName.substring(0, 3).toUpperCase()
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

  if (mapData.size === 0) {
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
      <div className="relative w-full bg-background rounded-lg border shadow-sm overflow-hidden" style={{ height: '500px' }}>
        <ComposableMap 
          projection="geoNaturalEarth1"
          projectionConfig={{
            scale: 140,
            center: [0, 0]
          }}
          width={800}
          height={400}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup
            zoom={1}
            minZoom={0.5}
            maxZoom={4}
            center={[0, 0]}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) => 
                geographies.map((geo, index) => {
                  // Handle the actual data format from the GeoJSON
                  const countryName = geo.properties?.name || 
                                     geo.properties?.ADMIN || 
                                     geo.properties?.NAME_EN || 
                                     geo.properties?.NAME || 
                                     geo.properties?.NAME_LONG || 
                                     'Unknown'
                  
                  // Special handling for Hong Kong, Macau, and Taiwan - treat as China for display
                  const isHongKong = countryName.includes('Hong Kong') || 
                                    countryName.includes('香港') ||
                                    geo.properties?.ISO_A3 === 'HKG' ||
                                    geo.properties?.ADM0_A3 === 'HKG'
                  
                  const isMacau = countryName.includes('Macau') || 
                                 countryName.includes('Macao') ||
                                 countryName.includes('澳门') ||
                                 geo.properties?.ISO_A3 === 'MAC' ||
                                 geo.properties?.ADM0_A3 === 'MAC'
                  
                  const isTaiwan = countryName.includes('Taiwan') || 
                                  countryName.includes('台湾') ||
                                  geo.properties?.ISO_A3 === 'TWN' ||
                                  geo.properties?.ADM0_A3 === 'TWN'
                  
                  const iso3 = geo.properties?.['ISO3166-1-Alpha-3'] || 
                              geo.properties?.ISO_A3 || 
                              geo.properties?.ADM0_A3 || 
                              convertCountryName(countryName) || 
                              geo.id
                  
                  // Try multiple possible matches
                  let countryData = null
                  
                  // If this is Hong Kong, Macau, or Taiwan, use China's data
                  if (isHongKong || isMacau || isTaiwan) {
                    countryData = mapData.get('China') || mapData.get('CHN')
                  } else {
                    // Try direct matches first
                    const directMatches = [
                      iso3,
                      countryName,
                      geo.properties?.name,
                      geo.properties?.['ISO3166-1-Alpha-3'],
                      geo.properties?.['ISO3166-1-Alpha-2'],
                      geo.properties?.ADMIN,
                      geo.properties?.NAME_EN,
                      geo.properties?.NAME_LONG
                    ].filter(Boolean)
                    
                    for (const key of directMatches) {
                      countryData = mapData.get(key)
                      if (countryData) break
                    }
                  }
                  
                  // Try normalized matches (but skip for Hong Kong, Macau, Taiwan)
                  if (!countryData && countryName !== 'Unknown' && !isHongKong && !isMacau && !isTaiwan) {
                    const normalizedMatches = [
                      countryName.toLowerCase(),
                      countryName.replace(/\s+/g, ''),
                      countryName.replace(/\s+/g, '').toLowerCase()
                    ]
                    
                    for (const key of normalizedMatches) {
                      countryData = mapData.get(key)
                      if (countryData) break
                    }
                  }
                  
                  // Last resort: fuzzy matching (but skip for Hong Kong, Macau, Taiwan)
                  if (!countryData && countryName !== 'Unknown' && !isHongKong && !isMacau && !isTaiwan) {
                    for (const [key, value] of mapData.entries()) { 
                      if (typeof value === 'object' && value.country) {
                        const sourceCountry = value.country.toLowerCase()
                        const targetCountry = countryName.toLowerCase()
                        
                        if (sourceCountry.includes(targetCountry) ||
                            targetCountry.includes(sourceCountry) ||
                            sourceCountry.replace(/\s+/g, '') === targetCountry.replace(/\s+/g, '')) {
                          countryData = value
                          break
                        }
                      }
                    }
                  }
                  
                  // For display purposes, treat Hong Kong, Macau, Taiwan as China
                  const displayCountryName = (isHongKong || isMacau || isTaiwan) ? 'China' : countryName
                  
                  
                  return (
                    <Geography
                      key={geo.rsmKey || `country-${index}`}
                      geography={geo}
                      fill={getCountryColor(countryData)}
                      stroke={theme === 'dark' ? '#334155' : '#cbd5e1'}
                      strokeWidth={0.5}
                      onMouseEnter={(event) => handleMouseEnter(event, countryData, displayCountryName)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        default: {
                          outline: "none",
                        },
                        hover: {
                          fill: theme === 'dark' ? '#1d4ed8' : '#2563eb',
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: {
                          outline: "none",
                        },
                      }}
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
        
        {/* Tooltip */}
        {tooltipContent && (
          <div
            className="absolute z-10 bg-popover text-popover-foreground text-xs rounded p-2 shadow-lg border pointer-events-none"
            style={{
              left: `${position.x}px`,
              top: `${position.y - 10}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            {tooltipContent}
          </div>
        )}
        
        {/* Zoom Controls Info */}
        <div className="absolute top-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1">
          可缩放拖拽
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-primary">
            {mapData.size}
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