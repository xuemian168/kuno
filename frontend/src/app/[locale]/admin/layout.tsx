'use client'

import { usePathname } from 'next/navigation'
import AuthGuard from '@/components/auth-guard'
import Header from '@/components/layout/header'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname.includes('/login')

  if (isLoginPage) {
    return children
  }

  return (
    <AuthGuard requireAdmin={true}>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto py-6 px-4 max-w-7xl">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}