'use client'

import { cn } from '@/lib/utils'

interface KunoIconProps {
  className?: string
  size?: number
}

export function KunoIcon({ className, size = 32 }: KunoIconProps) {
  const rectWidth = Math.max(2, Math.floor(size * 0.25)) // ~25% of container width
  const rectHeight = Math.max(1, Math.floor(size * 0.08)) // ~8% of container height
  const gap = Math.max(1, Math.floor(size * 0.03)) // 3% gap
  
  return (
    <div 
      className={cn('relative flex-shrink-0', className)}
      style={{ 
        width: size, 
        height: size,
        filter: 'drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.25))'
      }}
    >
      {/* Left column - rotated */}
      <div 
        className="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-90 flex flex-col"
        style={{ gap: `${gap}px` }}
      >
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725]"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725]"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725]"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
      </div>
      
      {/* Right column */}
      <div 
        className="absolute right-0 top-1/2 transform -translate-y-1/2 flex flex-col"
        style={{ gap: `${gap}px` }}
      >
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725]"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725]"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
        <div 
          className="bg-gradient-to-br from-[#ACB147] to-[#20B725]"
          style={{ width: `${rectWidth}px`, height: `${rectHeight}px` }}
        />
      </div>
    </div>
  )
}