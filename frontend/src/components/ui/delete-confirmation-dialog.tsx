"use client"

import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  itemName?: string
  confirmText?: string
  loading?: boolean
  locale?: string
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  confirmText = "delete",
  loading = false,
  locale = 'zh'
}: DeleteConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const isConfirmationValid = inputValue.toLowerCase() === confirmText.toLowerCase()

  const handleConfirm = () => {
    if (!isConfirmationValid) {
      setError(locale === 'zh' ? `请输入 "${confirmText}" 来确认删除` : `Please type "${confirmText}" to confirm`)
      return
    }
    
    setError('')
    onConfirm()
  }

  const handleClose = () => {
    setInputValue('')
    setError('')
    onOpenChange(false)
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    if (error) {
      setError('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-3">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {itemName && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertDescription className="text-sm">
                <span className="font-medium">
                  {locale === 'zh' ? '将要删除：' : 'About to delete: '}
                </span>
                <span className="font-mono text-sm bg-muted px-1 py-0.5 rounded">
                  {itemName}
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm-input" className="text-sm font-medium">
              {locale === 'zh' 
                ? `请输入 "${confirmText}" 来确认此操作：` 
                : `Type "${confirmText}" to confirm:`}
            </Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={confirmText}
              className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
              disabled={loading}
              autoComplete="off"
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {locale === 'zh' ? '取消' : 'Cancel'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmationValid || loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {locale === 'zh' ? '删除中...' : 'Deleting...'}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                {locale === 'zh' ? '确认删除' : 'Delete'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}