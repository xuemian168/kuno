'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useDynamicTheme } from '@/contexts/dynamic-theme-context'
import QRCode from 'qrcode'
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
import Image from 'next/image'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ShareBarProps {
  url: string
  title: string
  description?: string
  className?: string
}

// WeChat Icon Component
const WeChatIcon = ({ className }: { className?: string }) => (
  <Image
    src="/browsers/wechat.svg"
    alt="WeChat"
    width={16}
    height={16}
    className={className}
  />
)

// Weibo Icon Component
const WeiboIcon = ({ className }: { className?: string }) => (
  <Image
    src="/browsers/weibo.svg"
    alt="Weibo"
    width={16}
    height={16}
    className={className}
  />
)

export default function ShareBar({ url, title, description, className = '' }: ShareBarProps) {
  const t = useTranslations()
  const { analysisResult, isDynamicThemeActive } = useDynamicTheme()
  const [copied, setCopied] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [qrLoading, setQrLoading] = useState(false)
  
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
      name: t('share.weibo'),
      icon: WeiboIcon,
      url: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}`,
      color: 'text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300',
      bgColor: 'hover:bg-orange-50 dark:hover:bg-orange-950'
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

  const wechatButton = {
    name: t('share.wechat'),
    color: 'text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400',
    bgColor: 'hover:bg-green-50 dark:hover:bg-green-950'
  }

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

  const generateQRCode = async () => {
    if (qrCodeUrl) return qrCodeUrl
    
    setQrLoading(true)
    try {
      const qr = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(qr)
      return qr
    } catch (err) {
      console.error('Failed to generate QR code:', err)
      return ''
    } finally {
      setQrLoading(false)
    }
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

  // Enhanced container class
  const containerClass = `enhanced-container-inline ${isDynamicThemeActive && analysisResult ? 'dynamic-theme-active' : ''} ${className}`

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground mr-2">{t('share.shareLabel')}</span>
      
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

      {/* WeChat QR Code Share */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`p-2 rounded-lg transition-all ${wechatButton.bgColor} ${wechatButton.color}`}
            title={wechatButton.name}
            onMouseEnter={() => generateQRCode()}
            onClick={() => generateQRCode()}
          >
            <WeChatIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="center">
          <div className="text-center space-y-3">
            <h3 className="font-medium text-sm">{t('share.wechatQRTitle')}</h3>
            <div className="flex justify-center">
              {qrLoading ? (
                <div className="w-[200px] h-[200px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                </div>
              ) : qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="rounded-lg border"
                  width={200}
                  height={200}
                />
              ) : (
                <div className="w-[200px] h-[200px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
                  {t('share.qrError')}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('share.wechatQRDesc')}
            </p>
          </div>
        </PopoverContent>
      </Popover>

        <div className="h-4 w-px mx-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

        <button
          onClick={handleCopyLink}
          className="p-2 rounded-lg transition-all hover:bg-accent text-muted-foreground hover:text-foreground"
          title={t('share.copyLink')}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>

        {/* Native Share for mobile */}
        {typeof window !== 'undefined' && typeof navigator.share === 'function' && (
          <>
            <div className="h-4 w-px mx-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <button
              onClick={handleNativeShare}
              className="p-2 rounded-lg transition-all hover:bg-accent text-muted-foreground hover:text-foreground"
              title={t('share.title')}
            >
              <Share2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}