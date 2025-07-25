"use client"

import { motion } from "framer-motion"
import { LogOut } from "lucide-react"
import { useTranslations } from 'next-intl'
import ModeToggle from "@/components/mode-toggle"
import LanguageSwitcher from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { useSettings } from "@/contexts/settings-context"
import { useAuth } from "@/contexts/auth-context"
import { Link } from '@/i18n/routing'

export default function Header() {
  const t = useTranslations()
  const { settings } = useSettings()
  const { user, logout, isAuthenticated } = useAuth()
  
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
            <span className="hidden font-bold sm:inline-block">
              {settings?.site_title || 'Blog'}
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              className="transition-colors hover:text-foreground/80 text-foreground/60"
              href="/"
            >
              {t('nav.home')}
            </Link>
            {isAuthenticated && user && (
              <>
                <Link
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                  href="/admin"
                >
                  {t('nav.admin')}
                </Link>
                <Link
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
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
              <span className="font-bold">
                {settings?.site_title || 'Blog'}
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