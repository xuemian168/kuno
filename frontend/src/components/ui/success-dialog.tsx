"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, X } from "lucide-react"
import { useTranslations } from "next-intl"

interface SuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  autoCloseDelay?: number // Auto close after specified milliseconds
}

export function SuccessDialog({ 
  open, 
  onOpenChange, 
  title, 
  description,
  autoCloseDelay = 3000 
}: SuccessDialogProps) {
  const [isVisible, setIsVisible] = useState(open)
  const t = useTranslations()
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
      <DialogContent className="sm:max-w-md border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
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
              <CheckCircle className="h-8 w-8 text-white" />
            </motion.div>
          </div>
          
          <DialogTitle className="text-xl font-semibold text-green-900 dark:text-green-100">
            {title}
          </DialogTitle>
          
          {description && (
            <DialogDescription className="text-green-700 dark:text-green-300 mt-2">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-2 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
          >
            <X className="h-4 w-4" />
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easier usage
export function useSuccessDialog() {
  const [dialogState, setDialogState] = useState({
    open: false,
    title: '',
    description: ''
  })

  const showSuccess = (title: string, description?: string) => {
    setDialogState({
      open: true,
      title,
      description: description || ''
    })
  }

  const hideSuccess = () => {
    setDialogState(prev => ({ ...prev, open: false }))
  }

  return {
    ...dialogState,
    showSuccess,
    hideSuccess,
    onOpenChange: hideSuccess
  }
}