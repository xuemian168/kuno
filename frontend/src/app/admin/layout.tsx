'use client'

import { usePathname } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { useState, useEffect } from 'react'
import AuthGuard from '@/components/auth-guard'
import Header from '@/components/layout/header'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'
  const [messages, setMessages] = useState(null)
  const [locale, setLocale] = useState('zh')

  useEffect(() => {
    // Load messages for the current locale
    const loadMessages = async () => {
      try {
        const msgs = await import(`@/i18n/locales/${locale}.json`)
        setMessages(msgs.default)
      } catch (error) {
        console.error('Failed to load messages:', error)
      }
    }
    loadMessages()
  }, [locale])

  if (!messages) {
    return <div>Loading...</div>
  }

  if (isLoginPage) {
    return (
      <NextIntlClientProvider messages={messages} locale={locale}>
        {children}
      </NextIntlClientProvider>
    )
  }

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <AuthGuard requireAdmin={true}>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto py-6 px-4 max-w-7xl">
            {children}
          </main>
        </div>
      </AuthGuard>
    </NextIntlClientProvider>
  )
}