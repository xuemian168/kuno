import type { Metadata } from "next";
import { Geist, Geist_Mono, Krona_One } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeProvider } from '@/components/theme-provider'
import { SettingsProvider } from '@/contexts/settings-context'
import { AuthProvider } from '@/contexts/auth-context'
import { DynamicThemeProvider } from '@/contexts/dynamic-theme-context'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { CustomCSSInjector } from '@/components/custom-css-injector'
import { CustomJSInjector } from '@/components/custom-js-injector'
import { LayoutBackground } from '@/components/layout-background'
import '../globals.css'
import { getBaseUrl, getSiteUrl, getApiUrl } from '@/lib/config'
import { apiClient } from '@/lib/api'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const kronaOne = Krona_One({
  variable: "--font-krona-one",
  subsets: ["latin"],
  weight: "400",
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  
  const baseUrl = getBaseUrl() // For API calls
  const siteUrl = getSiteUrl() // For frontend URLs
  
  let siteTitle = t('site.title')
  let siteDescription = t('site.description')
  let faviconUrl: string | undefined
  let blockSearchEngines = false
  let blockAITraining = false
  
  try {
    // Try to fetch site settings
    const apiUrl = getApiUrl()
    const baseApiUrl = getBaseUrl()
    const response = await fetch(`${apiUrl}/settings?lang=${locale}`)
    if (response.ok) {
      const settings = await response.json()
      siteTitle = settings.site_title || siteTitle
      siteDescription = settings.site_subtitle || siteDescription
      blockSearchEngines = settings.block_search_engines || false
      blockAITraining = settings.block_ai_training || false
      
      // Handle favicon URL
      if (settings.favicon_url) {
        if (settings.favicon_url.startsWith('http')) {
          // Absolute URL - use as-is
          faviconUrl = settings.favicon_url
        } else if (settings.favicon_url.startsWith('/api/')) {
          // API relative path - use proper backend URL
          if (process.env.NODE_ENV === 'development') {
            faviconUrl = `http://localhost:8085${settings.favicon_url}`
          } else {
            faviconUrl = `${baseApiUrl}${settings.favicon_url}`
          }
        } else if (settings.favicon_url.startsWith('/')) {
          // Frontend static path - use site URL
          faviconUrl = `${siteUrl}${settings.favicon_url}`
        } else {
          // Relative path - assume it's an API upload
          if (process.env.NODE_ENV === 'development') {
            faviconUrl = `http://localhost:8085/api/uploads/${settings.favicon_url}`
          } else {
            faviconUrl = `${baseApiUrl}/api/uploads/${settings.favicon_url}`
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch site settings:', error)
  }
  
  // Generate alternate language links
  const languages: Record<string, string> = {}
  routing.locales.forEach(loc => {
    languages[loc] = loc === routing.defaultLocale 
      ? `${siteUrl}/` 
      : `${siteUrl}/${loc}/`
  })
  
  const metadata: Metadata = {
    title: siteTitle,
    description: siteDescription,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: locale === routing.defaultLocale ? '/' : `/${locale}/`,
      languages,
      types: {
        'application/rss+xml': [
          {
            url: `${getApiUrl()}/rss?lang=${locale}`,
            title: `${siteTitle} RSS Feed`,
          },
        ],
      },
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: locale === routing.defaultLocale ? `${siteUrl}/` : `${siteUrl}/${locale}/`,
      siteName: siteTitle,
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: siteDescription,
    },
    robots: blockSearchEngines ? {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    } : {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }

  // Add favicon with comprehensive icon definitions to prevent browser defaults
  let finalFaviconUrl: string
  let faviconType: string = 'image/png'
  
  if (faviconUrl) {
    finalFaviconUrl = faviconUrl
    
    // Detect favicon type from extension
    if (faviconUrl.toLowerCase().includes('.ico')) {
      faviconType = 'image/x-icon'
    } else if (faviconUrl.toLowerCase().includes('.svg')) {
      faviconType = 'image/svg+xml'
    } else if (faviconUrl.toLowerCase().includes('.jpg') || faviconUrl.toLowerCase().includes('.jpeg')) {
      faviconType = 'image/jpeg'
    }
  } else {
    // Fallback to default favicon - use relative path for better compatibility
    finalFaviconUrl = '/kuno.png'
  }
  
  // Comprehensive icon metadata to override all browser defaults
  metadata.icons = {
    icon: [
      { url: finalFaviconUrl, sizes: '16x16', type: faviconType },
      { url: finalFaviconUrl, sizes: '32x32', type: faviconType },
      { url: finalFaviconUrl, sizes: '48x48', type: faviconType },
      { url: finalFaviconUrl, sizes: '64x64', type: faviconType },
    ],
    shortcut: finalFaviconUrl,
    apple: [
      { url: finalFaviconUrl, sizes: '180x180', type: faviconType },
    ],
    other: [
      {
        rel: 'icon',
        url: finalFaviconUrl,
        type: faviconType,
      },
      {
        rel: 'shortcut icon',
        url: finalFaviconUrl,
        type: faviconType,
      },
    ],
  }

  // Add AI training blocking meta tags if enabled
  if (blockAITraining || blockSearchEngines) {
    const additionalMeta: Record<string, string> = {}
    
    if (blockSearchEngines) {
      additionalMeta['robots'] = 'noindex, nofollow, noarchive, nosnippet'
    }
    
    if (blockAITraining) {
      additionalMeta['robots'] = (additionalMeta['robots'] || '') + ', noimageai'
      // Specific AI training prevention meta tags
      additionalMeta['ai-training'] = 'no'
      additionalMeta['gptbot'] = 'noindex'
      additionalMeta['chatgpt'] = 'noindex'
    }
    
    metadata.other = additionalMeta
  }

  return metadata
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params
}: LocaleLayoutProps) {
  const { locale } = await params
  
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${kronaOne.variable} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <SettingsProvider>
                <DynamicThemeProvider>
                  <CustomCSSInjector />
                  <CustomJSInjector />
                  <LayoutBackground />
                  <div className="min-h-screen bg-transparent flex flex-col relative">
                    <Header />
                    <main className="flex-1">
                      {children}
                    </main>
                    <Footer />
                  </div>
                </DynamicThemeProvider>
              </SettingsProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}