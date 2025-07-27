"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface TooltipProps {
  children: React.ReactNode
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ children, content, side = 'bottom' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const getPositionClasses = () => {
    switch (side) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2'
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
    }
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`absolute z-50 px-4 py-3 text-xs text-white bg-black dark:bg-gray-800 rounded-md shadow-lg max-w-sm whitespace-normal break-words leading-relaxed ${getPositionClasses()}`}
            style={{ pointerEvents: 'none' }}
          >
            {content.split('\n').map((line, index) => (
              <span key={index}>
                {line}
                {index < content.split('\n').length - 1 && <br />}
              </span>
            ))}
            {/* Arrow */}
            <div className={`absolute w-2 h-2 bg-black dark:bg-gray-800 transform rotate-45 ${
              side === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
              side === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
              side === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
              'right-full top-1/2 -translate-y-1/2 -mr-1'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}