'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useDynamicTheme } from '@/contexts/dynamic-theme-context'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Share2, 
  Twitter, 
  Facebook, 
  Link, 
  Mail, 
  MessageCircle,
  Send,
  Copy,
  Check
} from 'lucide-react'

interface SocialShareProps {
  url: string
  title: string
  description?: string
}

export default function SocialShare({ url, title, description }: SocialShareProps) {
  const t = useTranslations()
  const { analysisResult, isDynamicThemeActive } = useDynamicTheme()
  const [copied, setCopied] = useState(false)
  
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const encodedDescription = encodeURIComponent(description || '')

  const shareLinks = [
    {
      name: t('share.twitter'),
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:bg-blue-50 dark:hover:bg-blue-950'
    },
    {
      name: t('share.facebook'),
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:bg-blue-600/10 dark:hover:bg-blue-400/10'
    },
    {
      name: t('share.linkedin'),
      icon: () => (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      ),
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'hover:bg-blue-700/10 dark:hover:bg-blue-300/10'
    },
    {
      name: t('share.whatsapp'),
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: 'hover:bg-green-50 dark:hover:bg-green-950'
    },
    {
      name: t('share.telegram'),
      icon: Send,
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:bg-blue-50 dark:hover:bg-blue-950'
    },
    {
      name: t('share.email'),
      icon: Mail,
      url: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
      color: 'hover:bg-gray-50 dark:hover:bg-gray-800'
    }
  ]

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShare = (shareUrl: string) => {
    window.open(shareUrl, '_blank', 'width=600,height=400')
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          {t('share.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('share.shareArticle')}</DialogTitle>
          <DialogDescription>
            {t('share.shareDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-3 py-4">
          {shareLinks.map((platform) => {
            const Icon = platform.icon
            return (
              <button
                key={platform.name}
                onClick={() => handleShare(platform.url)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${platform.color} border`}
                style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{platform.name}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <input
              type="text"
              value={url}
              readOnly
              className="w-full px-3 py-2 text-sm border rounded-md bg-gray-50 dark:bg-gray-800"
              style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
            />
          </div>
          <Button
            size="sm"
            onClick={handleCopyLink}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                {t('share.copied')}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                {t('share.copyLink')}
              </>
            )}
          </Button>
        </div>

        {/* Native Share API for mobile */}
        {typeof window !== 'undefined' && navigator.share && (
          <div className="pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
            <Button
              className="w-full"
              onClick={() => {
                navigator.share({
                  title,
                  text: description,
                  url
                }).catch(() => {
                  // User cancelled or error
                })
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {t('share.shareViaSystem')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}