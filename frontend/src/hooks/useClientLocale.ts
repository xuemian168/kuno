'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { visitorLanguageManager } from '@/services/visitor-language-manager'
import { SupportedLanguage } from '@/services/translation/types'

export function useClientLocale() {
  const [currentLocale, setCurrentLocale] = useState<string>('zh')
  const [availableLocales, setAvailableLocales] = useState<SupportedLanguage[]>(['zh', 'en'])
  const [localeNames, setLocaleNames] = useState<Record<string, string>>({ zh: '中文', en: 'English' })
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Load dynamic language configuration
    const config = visitorLanguageManager.getConfig()
    setAvailableLocales(config.enabledLocales)
    setLocaleNames(config.localeNames)

    // Extract current locale from pathname
    const pathSegments = pathname.split('/')
    const localeFromPath = pathSegments[1]
    
    if (config.enabledLocales.includes(localeFromPath as SupportedLanguage)) {
      setCurrentLocale(localeFromPath)
    } else {
      // Redirect to default locale if current locale is not enabled
      const fallbackLocale = visitorLanguageManager.getFallbackLocale(localeFromPath)
      const newPath = `/${fallbackLocale}${pathname.startsWith(`/${localeFromPath}`) ? pathname.slice(localeFromPath.length + 1) : pathname}`
      router.replace(newPath)
      setCurrentLocale(fallbackLocale)
    }
  }, [pathname, router])

  const switchLocale = (newLocale: SupportedLanguage) => {
    if (!visitorLanguageManager.isValidLocale(newLocale)) {
      return
    }

    // Replace current locale in pathname
    const pathSegments = pathname.split('/')
    const currentLocaleFromPath = pathSegments[1]
    
    let newPath: string
    if (availableLocales.includes(currentLocaleFromPath as SupportedLanguage)) {
      // Replace existing locale
      pathSegments[1] = newLocale
      newPath = pathSegments.join('/')
    } else {
      // Add locale prefix
      newPath = `/${newLocale}${pathname}`
    }

    router.push(newPath)
    setCurrentLocale(newLocale)
  }

  return {
    currentLocale,
    availableLocales,
    localeNames,
    switchLocale,
    isValidLocale: (locale: string) => visitorLanguageManager.isValidLocale(locale)
  }
}