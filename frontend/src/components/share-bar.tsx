'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { 
  Twitter, 
  Facebook, 
  Link, 
  MessageCircle,
  Send,
  Copy,
  Check,
  Share2
} from 'lucide-react'

interface ShareBarProps {
  url: string
  title: string
  description?: string
  className?: string
}

export default function ShareBar({ url, title, description, className = '' }: ShareBarProps) {
  const t = useTranslations()
  const [copied, setCopied] = useState(false)
  
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const shareButtons = [
    {
      name: t('share.twitter'),
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300',
      bgColor: 'hover:bg-blue-50 dark:hover:bg-blue-950'
    },
    {
      name: t('share.facebook'),
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400',
      bgColor: 'hover:bg-blue-100 dark:hover:bg-blue-900'
    },
    {
      name: t('share.whatsapp'),
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: 'text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400',
      bgColor: 'hover:bg-green-50 dark:hover:bg-green-950'
    },
    {
      name: t('share.telegram'),
      icon: Send,
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300',
      bgColor: 'hover:bg-blue-50 dark:hover:bg-blue-950'
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

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title,
        text: description,
        url
      }).catch(() => {
        // User cancelled or error
      })
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">{t('share.shareLabel')}</span>
      
      {shareButtons.map((platform) => {
        const Icon = platform.icon
        return (
          <button
            key={platform.name}
            onClick={() => handleShare(platform.url)}
            className={`p-2 rounded-lg transition-all ${platform.bgColor} ${platform.color}`}
            title={platform.name}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}

      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

      <button
        onClick={handleCopyLink}
        className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        title={t('share.copyLink')}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>

      {/* Native Share for mobile */}
      {typeof window !== 'undefined' && navigator.share && (
        <>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            onClick={handleNativeShare}
            className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            title={t('share.title')}
          >
            <Share2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}