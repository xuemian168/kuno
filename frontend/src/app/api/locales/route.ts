import { NextResponse } from 'next/server'
import { visitorLanguageManager } from '@/services/visitor-language-manager'

export async function GET() {
  try {
    const config = visitorLanguageManager.getConfig()
    
    return NextResponse.json({
      locales: config.enabledLocales,
      defaultLocale: config.defaultLocale,
      localeNames: config.localeNames
    })
  } catch (error) {
    console.error('Failed to get locale configuration:', error)
    
    // Fallback to basic configuration
    return NextResponse.json({
      locales: ['zh', 'en'],
      defaultLocale: 'zh',
      localeNames: {
        zh: '中文',
        en: 'English'
      }
    })
  }
}