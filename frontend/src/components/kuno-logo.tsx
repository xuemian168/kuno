'use client'

import { cn } from '@/lib/utils'

interface KunoLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'gradient' | 'white' | 'dark'
}

const sizeStyles = {
  sm: 'text-2xl', // 24px
  md: 'text-4xl', // 36px  
  lg: 'text-6xl', // 60px
  xl: 'text-8xl', // 96px
}

export function KunoLogo({ className, size = 'md', variant = 'gradient' }: KunoLogoProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'white':
        return {
          className: 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]',
          style: {}
        }
      case 'dark':
        return {
          className: 'text-gray-900 drop-shadow-[0_2px_4px_rgba(255,255,255,0.3)]',
          style: {}
        }
      case 'gradient':
      default:
        return {
          className: 'bg-gradient-to-br from-[#ACB147] to-[#20B725] bg-clip-text text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]',
          style: {
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }
        }
    }
  }

  const variantStyles = getVariantStyles()

  return (
    <div 
      className={cn(
        // Base styles from Figma
        'font-krona font-normal select-none',
        variantStyles.className,
        sizeStyles[size],
        className
      )}
      style={{
        // Exact line height from Figma
        lineHeight: '1.25',
        ...variantStyles.style
      }}
    >
      KUNO
    </div>
  )
}