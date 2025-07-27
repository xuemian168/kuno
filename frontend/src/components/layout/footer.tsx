"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useSettings } from '@/contexts/settings-context'
import { apiClient, SocialMedia } from '@/lib/api'
import { 
  Github, 
  Globe, 
  Twitter, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Youtube, 
  MessageCircle, 
  Send, 
  Mail,
  Hash
} from 'lucide-react'

// Social media icon mapping
const SOCIAL_ICONS: Record<string, any> = {
  github: Github,
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  discord: MessageCircle,
  telegram: Send,
  wechat: MessageCircle,
  email: Mail,
  custom: Hash
}

export default function Footer() {
  const t = useTranslations()
  const { settings } = useSettings()
  const pathname = usePathname()
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([])
  
  // Simple static file path - middleware now excludes images from i18n routing
  const getStaticPath = (filename: string) => {
    return `/${filename}`
  }

  useEffect(() => {
    const fetchSocialMedia = async () => {
      try {
        const data = await apiClient.getSocialMediaList()
        setSocialMedia(data)
      } catch (error) {
        console.error('Failed to fetch social media:', error)
      }
    }

    fetchSocialMedia()
  }, [])

  const getSocialIcon = (iconName: string) => {
    const IconComponent = SOCIAL_ICONS[iconName] || Globe
    return <IconComponent className="h-4 w-4" />
  }

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* Social Media Links - Left Side */}
          <div className="flex items-center space-x-4 md:flex-1">
            {socialMedia.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative"
                title={item.platform}
              >
                <div className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  {getSocialIcon(item.icon_name)}
                </div>
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.platform}
                </span>
              </a>
            ))}
          </div>

          {/* Copyright and Credits - Center */}
          <div className="flex flex-col items-center space-y-2 text-center md:flex-1">
            <div className="text-sm text-muted-foreground">
              {settings?.footer_text || '© 2025 xuemian168'}
            </div>
            
            {/* Filing Numbers - ICP and PSB on the same line */}
            {(settings?.icp_filing || settings?.psb_filing) && (
              <div className="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground/60">
                {settings?.icp_filing && (
                  <>
                    <a
                      href="https://beian.miit.gov.cn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-muted-foreground/80 transition-colors"
                    >
                      {settings.icp_filing}
                    </a>
                    {settings?.psb_filing && <span className="mx-1">|</span>}
                  </>
                )}
                {settings?.psb_filing && (
                  <a
                    href="http://www.beian.gov.cn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-muted-foreground/80 transition-colors"
                  >
                    <img 
                      src="/ga.png"
                      alt="公安备案" 
                      className="w-3 h-3 inline-block"
                      style={{ objectFit: 'contain' }}
                    />
                    <span>{settings.psb_filing}</span>
                  </a>
                )}
              </div>
            )}
            
            <a
              href="https://github.com/ictrun/i18n_blog"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-xs text-muted-foreground/60 hover:text-muted-foreground/80 transition-colors"
            >
              <Github className="h-3 w-3" />
              <span>Powered by ICT.RUN</span>
            </a>
          </div>

          {/* Right Side - Reserved for future use */}
          <div className="md:flex-1"></div>
        </div>
      </div>
    </footer>
  )
}