import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeProvider } from '@/components/theme-provider'
import { SettingsProvider } from '@/contexts/settings-context'
import { AuthProvider } from '@/contexts/auth-context'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import '../globals.css'
import { getBaseUrl, getSiteUrl } from '@/lib/utils'
import { apiClient } from '@/lib/api'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  
  const baseUrl = getBaseUrl() // For API calls
  const siteUrl = getSiteUrl() // For frontend URLs
  
  let siteTitle = t('site.title')
  let siteDescription = t('site.description')
  let faviconUrl: string | undefined
  
  try {
    // Try to fetch site settings
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
    const baseApiUrl = apiUrl.replace('/api', '')
    const response = await fetch(`${apiUrl}/settings?lang=${locale}`)
    if (response.ok) {
      const settings = await response.json()
      siteTitle = settings.site_title || siteTitle
      siteDescription = settings.site_subtitle || siteDescription
      
      // Handle favicon URL
      if (settings.favicon_url) {
        faviconUrl = settings.favicon_url.startsWith('http') 
          ? settings.favicon_url 
          : `${baseApiUrl}${settings.favicon_url}`
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
            url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/rss?lang=${locale}`,
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
    robots: {
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
    // Fallback to default favicon - use siteUrl for frontend static files
    finalFaviconUrl = `${siteUrl}/kuno.png`
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <SettingsProvider>
                <div className="min-h-screen bg-background flex flex-col">
                  <Header />
                  <main className="flex-1">
                    {children}
                  </main>
                  <Footer />
                </div>
              </SettingsProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}