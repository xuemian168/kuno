"use client"

import { motion } from "framer-motion"
import { LogOut, Home, Rss, LayoutDashboard, Settings, Image, Shield, User, Upload } from "lucide-react"
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import ModeToggle from "@/components/mode-toggle"
import LanguageSwitcher from "@/components/language-switcher"
import { ArticleSearch } from "@/components/article-search"
import { Button } from "@/components/ui/button"
import { useSettings } from "@/contexts/settings-context"
import { useAuth } from "@/contexts/auth-context"
import { Link } from '@/i18n/routing'
import { cn } from "@/lib/utils"
import { getMediaUrl } from "@/lib/config"
import { generateMediaUrl } from "@/lib/favicon-utils"

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
      return pathname.includes('/admin') && !pathname.includes('/admin/settings') && !pathname.includes('/admin/media') && !pathname.includes('/admin/import')
    }
    if (path === '/rss') {
      return pathname.includes('/rss')
    }
    if (path === '/admin/settings') {
      return pathname.includes('/admin/settings')
    }
    if (path === '/admin/media') {
      return pathname.includes('/admin/media')
    }
    if (path === '/admin/import') {
      return pathname.includes('/admin/import')
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
      <div className="container mx-auto px-4 flex h-12 md:h-14 items-center max-w-7xl">
        <div className="mr-4 hidden md:flex">
          <Link className="mr-6 flex items-center space-x-2" href="/">
            {settings?.logo_url ? (
              <img 
                src={generateMediaUrl(settings.logo_url)} 
                alt="Logo" 
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement
                  if (fallback) {
                    fallback.style.display = 'inline-block'
                  }
                }}
              />
            ) : null}
            {!settings?.logo_url && (
              <div className="text-lg font-bold text-primary">
                KUNO
              </div>
            )}
            <div 
              className="text-lg font-bold text-primary hidden"
              style={{ display: 'none' }}
            >
              KUNO
            </div>
            {(settings?.show_site_title ?? true) && (
              <span className="hidden font-bold sm:inline-block">
                {settings?.site_title || t('site.title')}
              </span>
            )}
          </Link>
          <nav className="flex items-center space-x-1 text-sm font-medium">
            {/* Public Navigation */}
            <div className="flex items-center space-x-1">
              <Link
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:bg-accent",
                  isActivePath('/') 
                    ? "text-foreground font-semibold bg-accent" 
                    : "text-foreground/60 hover:text-foreground/80"
                )}
                href="/"
              >
                <Home className="h-4 w-4" />
                <span>{t('nav.home')}</span>
              </Link>
              <Link
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:bg-accent",
                  isActivePath('/rss') 
                    ? "text-foreground font-semibold bg-accent" 
                    : "text-foreground/60 hover:text-foreground/80"
                )}
                href="/rss"
              >
                <Rss className="h-4 w-4" />
                <span>{t('rss.rssFeeds')}</span>
              </Link>
            </div>
            
            {/* Admin Navigation - Visually separated */}
            {isAuthenticated && user && (
              <>
                <div className="w-px h-6 bg-border mx-2" />
                <div className="flex items-center space-x-1 relative">
                  <Link
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:bg-accent ml-4",
                      isActivePath('/admin') && !pathname.includes('/admin/settings') && !pathname.includes('/admin/media')
                        ? "text-foreground font-semibold bg-accent" 
                        : "text-foreground/60 hover:text-foreground/80"
                    )}
                    href="/admin"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:bg-accent",
                      pathname.includes('/admin/settings')
                        ? "text-foreground font-semibold bg-accent" 
                        : "text-foreground/60 hover:text-foreground/80"
                    )}
                    href="/admin/settings"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                  <Link
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:bg-accent",
                      pathname.includes('/admin/media')
                        ? "text-foreground font-semibold bg-accent" 
                        : "text-foreground/60 hover:text-foreground/80"
                    )}
                    href="/admin/media"
                  >
                    <Image className="h-4 w-4" />
                    <span>Media</span>
                  </Link>
                  <Link
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:bg-accent",
                      pathname.includes('/admin/import')
                        ? "text-foreground font-semibold bg-accent" 
                        : "text-foreground/60 hover:text-foreground/80"
                    )}
                    href="/admin/import"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Import</span>
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Link className="flex items-center space-x-2 md:hidden" href="/">
              {settings?.logo_url ? (
                <img 
                  src={generateMediaUrl(settings.logo_url)} 
                  alt="Logo" 
                  className="h-6 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement
                    if (fallback) {
                      fallback.style.display = 'inline-block'
                    }
                  }}
                />
              ) : null}
              {!settings?.logo_url && (
                <div className="text-base font-bold text-primary">
                  KUNO
                </div>
              )}
              <div 
                className="text-base font-bold text-primary hidden"
                style={{ display: 'none' }}
              >
                KUNO
              </div>
              {(settings?.show_site_title ?? true) && (
                <span className="font-bold text-sm sm:text-base truncate">
                  {settings?.site_title || t('site.title')}
                </span>
              )}
            </Link>
          </div>
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {isAuthenticated && user && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 hidden sm:flex">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {user.username}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="gap-1 sm:gap-2"
                  title={t('admin.logout')}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('admin.logout')}</span>
                </Button>
              </>
            )}
            {/* Desktop search */}
            <div className="hidden sm:block">
              <ArticleSearch />
            </div>
            {/* Mobile compact search */}
            <div className="sm:hidden">
              <ArticleSearch compact />
            </div>
            <LanguageSwitcher />
            <ModeToggle />
          </nav>
        </div>
      </div>
    </motion.header>
  )
}