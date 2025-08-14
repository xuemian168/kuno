"use client"

import { usePathname } from 'next/navigation'
import { BackgroundManager } from './background-manager'

export function LayoutBackground() {
  const pathname = usePathname()
  
  // Check if current route is an admin route
  const isAdminRoute = pathname.includes('/admin')
  
  return <BackgroundManager isAdminRoute={isAdminRoute} />
}