"use client"

import { useTranslations } from 'next-intl'
import { useSettings } from '@/contexts/settings-context'
import { Github } from 'lucide-react'

export default function Footer() {
  const t = useTranslations()
  const { settings } = useSettings()

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>{settings?.footer_text || '© 2025 xuemian168'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <a
              href="https://github.com/xuemian168/i18n_blog"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-xs text-muted-foreground/60 hover:text-muted-foreground/80 transition-colors"
            >
              <Github className="h-3 w-3" />
              <span>Powered by ICT.RUN</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}