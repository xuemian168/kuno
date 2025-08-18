'use client'

import { usePathname } from 'next/navigation'
import AuthGuard from '@/components/auth-guard'
import { FaviconUpdater } from '@/components/favicon-updater'
import { AdminBreadcrumb } from '@/components/admin/breadcrumb'
import { MonacoInit } from '@/components/monaco-init'

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
      <MonacoInit />
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <FaviconUpdater />
        <AdminBreadcrumb />
        {children}
      </div>
    </AuthGuard>
  )
}