import type { Metadata } from 'next'
import { generateBasicMetadata } from '@/lib/metadata-utils'

export async function generateMetadata(): Promise<Metadata> {
  return generateBasicMetadata({
    title: 'Blog',
    description: 'A modern blog platform'
  })
}

// Root layout for non-locale routes (sitemap.xml, robots.txt, etc.)
// Locale routes use [locale]/layout.tsx which provides the full HTML structure
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Only return children - locale layouts handle HTML structure
  return children
}
