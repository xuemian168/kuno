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
import { getSiteUrl, getApiUrl } from '@/lib/config'
import { generateFaviconUrl } from '@/lib/favicon-utils'

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
  
  const siteUrl = getSiteUrl() // For frontend URLs
  
  let siteTitle = t('site.title')
  let siteDescription = t('site.description')
  let faviconConfig = generateFaviconUrl(undefined) // Default favicon config
  let blockSearchEngines = false
  let blockAITraining = false
  
  try {
    // Try to fetch site settings
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/settings?lang=${locale}`)
    if (response.ok) {
      const settings = await response.json()
      siteTitle = settings.site_title || siteTitle
      siteDescription = settings.site_subtitle || siteDescription
      blockSearchEngines = settings.block_search_engines || false
      blockAITraining = settings.block_ai_training || false
      
      // Generate favicon config using unified utility
      faviconConfig = generateFaviconUrl(settings.favicon_url)
    }
  } catch (error) {
    console.error('Failed to fetch site settings:', error)
  }
  
  // Generate alternate language links including self-referential (use relative paths)
  const languages: Record<string, string> = {}
  routing.locales.forEach(loc => {
    languages[loc] = loc === routing.defaultLocale 
      ? `/` 
      : `/${loc}/`
  })
  
  // Add self-referential alternate link (x-default) - should point to default locale
  languages['x-default'] = `/`
  
  const metadata: Metadata = {
    title: siteTitle,
    description: siteDescription,
    alternates: {
      canonical: locale === routing.defaultLocale ? `/` : `/${locale}/`,
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

  // Add favicon with comprehensive icon definitions using unified utility
  metadata.icons = {
    icon: [
      { url: faviconConfig.url, sizes: '16x16', type: faviconConfig.type },
      { url: faviconConfig.url, sizes: '32x32', type: faviconConfig.type },
      { url: faviconConfig.url, sizes: '48x48', type: faviconConfig.type },
      { url: faviconConfig.url, sizes: '64x64', type: faviconConfig.type },
    ],
    shortcut: faviconConfig.url,
    apple: [
      { url: faviconConfig.url, sizes: '180x180', type: faviconConfig.type },
    ],
    other: [
      {
        rel: 'icon',
        url: faviconConfig.url,
        type: faviconConfig.type,
      },
      {
        rel: 'shortcut icon',
        url: faviconConfig.url,
        type: faviconConfig.type,
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