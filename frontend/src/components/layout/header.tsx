"use client"

import { motion } from "framer-motion"
import { LogOut } from "lucide-react"
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import ModeToggle from "@/components/mode-toggle"
import LanguageSwitcher from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { useSettings } from "@/contexts/settings-context"
import { useAuth } from "@/contexts/auth-context"
import { Link } from '@/i18n/routing'
import { getFullApiUrl, cn } from "@/lib/utils"

export default function Header() {
  const t = useTranslations()
  const { settings } = useSettings()
  const { user, logout, isAuthenticated } = useAuth()
  const pathname = usePathname()

  // Function to check if a path is active
  const isActivePath = (path: string) => {
    if (path === '/') {
      return pathname === '/' || pathname.match(/^\/[a-z]{2}$/) || pathname.match(/^\/[a-z]{2}\/$/)
    }
    if (path === '/admin') {
      return pathname.includes('/admin')
    }
    if (path === '/rss') {
      return pathname.includes('/rss')
    }
    if (path === '/media') {
      return pathname.includes('/media')
    }
    return pathname.includes(path)
  }
  
  return (
    <motion.header 
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4 flex h-14 items-center max-w-7xl">
        <div className="mr-4 hidden md:flex">
          <Link className="mr-6 flex items-center space-x-2" href="/">
            {settings?.logo_url && (
              <img 
                src={getFullApiUrl(settings.logo_url)} 
                alt="Logo" 
                className="h-8 w-auto object-contain"
              />
            )}
            <span className="hidden font-bold sm:inline-block">
              {settings?.site_title || t('site.title')}
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              className={cn(
                "transition-colors hover:text-foreground/80",
                isActivePath('/') 
                  ? "text-foreground font-semibold border-b-2 border-primary pb-1" 
                  : "text-foreground/60"
              )}
              href="/"
            >
              {t('nav.home')}
            </Link>
            <Link
              className={cn(
                "transition-colors hover:text-foreground/80",
                isActivePath('/rss') 
                  ? "text-foreground font-semibold border-b-2 border-primary pb-1" 
                  : "text-foreground/60"
              )}
              href="/rss"
            >
              {t('rss.rssFeeds')}
            </Link>
            {isAuthenticated && user && (
              <>
                <Link
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    isActivePath('/admin') 
                      ? "text-foreground font-semibold border-b-2 border-primary pb-1" 
                      : "text-foreground/60"
                  )}
                  href="/admin"
                >
                  {t('nav.admin')}
                </Link>
                <Link
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    isActivePath('/media') 
                      ? "text-foreground font-semibold border-b-2 border-primary pb-1" 
                      : "text-foreground/60"
                  )}
                  href="/admin/media"
                >
                  {t('admin.media')}
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Link className="flex items-center space-x-2 md:hidden" href="/">
              {settings?.logo_url && (
                <img 
                  src={getFullApiUrl(settings.logo_url)} 
                  alt="Logo" 
                  className="h-7 w-auto object-contain"
                />
              )}
              <span className="font-bold">
                {settings?.site_title || t('site.title')}
              </span>
            </Link>
          </div>
          <nav className="flex items-center space-x-2">
            {isAuthenticated && user && (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Welcome, {user.username}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('admin.logout')}</span>
                </Button>
              </>
            )}
            <LanguageSwitcher />
            <ModeToggle />
          </nav>
        </div>
      </div>
    </motion.header>
  )
}