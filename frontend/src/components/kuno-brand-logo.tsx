'use client'

import { cn } from '@/lib/utils'

interface KunoBrandLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  showIcon?: boolean
}

const sizeStyles = {
  sm: {
    text: 'text-lg', // 18px
    iconSize: 20,
  },
  md: {
    text: 'text-2xl', // 24px
    iconSize: 28,
  },
  lg: {
    text: 'text-4xl', // 36px
    iconSize: 40,
  },
  xl: {
    text: 'text-6xl', // 60px
    iconSize: 64,
  }
}

// Simple geometric icon based on Figma rectangles
function KunoGeometricIcon({ size }: { size: number }) {
  const rectWidth = Math.max(2, Math.floor(size * 0.2))
  const rectHeight = Math.max(1, Math.floor(size * 0.15))
  const gap = Math.max(1, Math.floor(size * 0.08))
  
  return (
    <div 
      className="relative flex-shrink-0"
      style={{ 
        width: size, 
        height: size,
        filter: 'drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.25))'
      }}
    >
      {/* Left column - 3 rectangles stacked vertically */}
      <div 
        className="absolute left-0 top-1/2 transform -translate-y-1/2 flex flex-col"
        style={{ gap: `${gap}px` }}
      >
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725] rounded-sm"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725] rounded-sm"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725] rounded-sm"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
      </div>
      
      {/* Right column - 3 rectangles stacked vertically */}
      <div 
        className="absolute right-0 top-1/2 transform -translate-y-1/2 flex flex-col"
        style={{ gap: `${gap}px` }}
      >
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725] rounded-sm"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725] rounded-sm"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725] rounded-sm"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
      </div>
    </div>
  )
}

export function KunoBrandLogo({ 
  className, 
  size = 'md', 
  showText = true, 
  showIcon = true 
}: KunoBrandLogoProps) {
  const styles = sizeStyles[size]
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Icon Part */}
      {showIcon && (
        <KunoGeometricIcon size={styles.iconSize} />
      )}
      
      {/* Text Part */}
      {showText && (
        <div 
          className={cn(
            'font-krona font-normal select-none',
            'bg-gradient-to-br from-[#ACB147] to-[#20B725]',
            'bg-clip-text text-transparent',
            'drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]',
            styles.text
          )}
          style={{
            lineHeight: '1.2',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          KUNO
        </div>
      )}
    </div>
  )
}