"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react"

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface NotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: NotificationType
  title: string
  description?: string
  autoCloseDelay?: number
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    colors: {
      bg: 'from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50',
      border: 'border-green-200 dark:border-green-800',
      iconBg: 'from-green-500 to-emerald-500',
      iconColor: 'text-white',
      titleColor: 'text-green-900 dark:text-green-100',
      descColor: 'text-green-700 dark:text-green-300',
      buttonBorder: 'border-green-300 dark:border-green-700',
      buttonText: 'text-green-700 dark:text-green-300',
      buttonHover: 'hover:bg-green-100 dark:hover:bg-green-900/30'
    }
  },
  error: {
    icon: XCircle,
    colors: {
      bg: 'from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50',
      border: 'border-red-200 dark:border-red-800',
      iconBg: 'from-red-500 to-rose-500',
      iconColor: 'text-white',
      titleColor: 'text-red-900 dark:text-red-100',
      descColor: 'text-red-700 dark:text-red-300',
      buttonBorder: 'border-red-300 dark:border-red-700',
      buttonText: 'text-red-700 dark:text-red-300',
      buttonHover: 'hover:bg-red-100 dark:hover:bg-red-900/30'
    }
  },
  warning: {
    icon: AlertCircle,
    colors: {
      bg: 'from-yellow-50 to-orange-50 dark:from-yellow-950/50 dark:to-orange-950/50',
      border: 'border-yellow-200 dark:border-yellow-800',
      iconBg: 'from-yellow-500 to-orange-500',
      iconColor: 'text-white',
      titleColor: 'text-yellow-900 dark:text-yellow-100',
      descColor: 'text-yellow-700 dark:text-yellow-300',
      buttonBorder: 'border-yellow-300 dark:border-yellow-700',
      buttonText: 'text-yellow-700 dark:text-yellow-300',
      buttonHover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
    }
  },
  info: {
    icon: Info,
    colors: {
      bg: 'from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50',
      border: 'border-blue-200 dark:border-blue-800',
      iconBg: 'from-blue-500 to-indigo-500',
      iconColor: 'text-white',
      titleColor: 'text-blue-900 dark:text-blue-100',
      descColor: 'text-blue-700 dark:text-blue-300',
      buttonBorder: 'border-blue-300 dark:border-blue-700',
      buttonText: 'text-blue-700 dark:text-blue-300',
      buttonHover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
    }
  }
}

export function NotificationDialog({ 
  open, 
  onOpenChange, 
  type,
  title, 
  description,
  autoCloseDelay = 3000 
}: NotificationDialogProps) {
  const [isVisible, setIsVisible] = useState(open)
  const config = typeConfig[type]
  const IconComponent = config.icon
  
  useEffect(() => {
    setIsVisible(open)
    
    if (open && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onOpenChange(false)
      }, autoCloseDelay)
      
      return () => clearTimeout(timer)
    }
  }, [open, autoCloseDelay, onOpenChange])

  return (
    <Dialog open={isVisible} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-md ${config.colors.border} bg-gradient-to-br ${config.colors.bg}`}>
        <DialogHeader className="text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r ${config.colors.iconBg} shadow-lg`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1
              }}
            >
              <IconComponent className={`h-8 w-8 ${config.colors.iconColor}`} />
            </motion.div>
          </div>
          
          <DialogTitle className={`text-xl font-semibold ${config.colors.titleColor}`}>
            {title}
          </DialogTitle>
          
          {description && (
            <DialogDescription className={`${config.colors.descColor} mt-2`}>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
      
      </DialogContent>
    </Dialog>
  )
}

// Hook for easier usage
export function useNotificationDialog() {
  const [dialogState, setDialogState] = useState({
    open: false,
    type: 'success' as NotificationType,
    title: '',
    description: ''
  })

  const showNotification = (type: NotificationType, title: string, description?: string) => {
    setDialogState({
      open: true,
      type,
      title,
      description: description || ''
    })
  }

  const showSuccess = (title: string, description?: string) => {
    showNotification('success', title, description)
  }

  const showError = (title: string, description?: string) => {
    showNotification('error', title, description)
  }

  const showWarning = (title: string, description?: string) => {
    showNotification('warning', title, description)
  }

  const showInfo = (title: string, description?: string) => {
    showNotification('info', title, description)
  }

  const hideNotification = () => {
    setDialogState(prev => ({ ...prev, open: false }))
  }

  return {
    ...dialogState,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
    onOpenChange: hideNotification
  }
}