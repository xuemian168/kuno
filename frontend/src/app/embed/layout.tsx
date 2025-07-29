import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/app/globals.css'
import '@/styles/markdown.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Embedded Article',
  robots: {
    index: true,
    follow: true,
  },
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-white dark:bg-gray-900`}>
        {children}
      </body>
    </html>
  )
}