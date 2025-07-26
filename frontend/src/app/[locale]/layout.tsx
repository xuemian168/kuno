import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeProvider } from '@/components/theme-provider'
import { SettingsProvider } from '@/contexts/settings-context'
import { AuthProvider } from '@/contexts/auth-context'
import '../globals.css'
import { getBaseUrl } from '@/lib/utils'
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
  
  const baseUrl = getBaseUrl()
  
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
      ? `${baseUrl}/` 
      : `${baseUrl}/${loc}/`
  })
  
  const metadata: Metadata = {
    title: siteTitle,
    description: siteDescription,
    metadataBase: new URL(baseUrl),
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
      url: locale === routing.defaultLocale ? `${baseUrl}/` : `${baseUrl}/${locale}/`,
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

  // Add favicon if available
  if (faviconUrl) {
    metadata.icons = {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    }
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
      <head>
        <script src="/runtime-config.js"></script>
      </head>
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
                {children}
              </SettingsProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}