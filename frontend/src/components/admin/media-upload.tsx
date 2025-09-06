'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, Image, Video, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { apiClient, MediaLibrary } from '@/lib/api'
import { useTranslations } from 'next-intl'

interface MediaUploadProps {
  onUploadComplete?: (media: MediaLibrary) => void
  acceptedTypes?: 'image' | 'video' | 'all'
  maxSize?: number // in MB
}

export default function MediaUpload({ 
  onUploadComplete, 
  acceptedTypes = 'all',
  maxSize = 100 
}: MediaUploadProps) {
  const t = useTranslations()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [pasteHint, setPasteHint] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getAcceptString = () => {
    switch (acceptedTypes) {
      case 'image':
        return 'image/jpeg,image/jpg,image/png,image/gif,image/webp'
      case 'video':
        return 'video/mp4,video/webm,video/ogg,video/avi,video/mov'
      default:
        return 'image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg,video/avi,video/mov'
    }
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return t('media.fileSizeExceeds', {maxSize})
    }

    // Check file type
    const acceptedMimes = getAcceptString().split(',')
    if (!acceptedMimes.includes(file.type)) {
      return 'Unsupported file type'
    }

    return null
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    const error = validateFile(file)
    if (error) {
      setError(error)
      return
    }

    setSelectedFile(file)
    setError('')
    setAlt('')
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handlePaste = (e: ClipboardEvent) => {
    if (!e.clipboardData) return

    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) {
        // Generate a filename based on current timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const extension = file.type.split('/')[1] || 'png'
        const filename = `pasted-image-${timestamp}.${extension}`
        
        // Create a new File object with a proper name
        const namedFile = new File([file], filename, {
          type: file.type,
          lastModified: Date.now()
        })
        
        handleFileSelect(namedFile)
        setPasteHint(false)
      }
    }
  }

  useEffect(() => {
    // Add paste event listener to document
    document.addEventListener('paste', handlePaste)
    
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [])

  useEffect(() => {
    // Show paste hint briefly when component mounts
    const timer = setTimeout(() => setPasteHint(true), 500)
    const hideTimer = setTimeout(() => setPasteHint(false), 3000)
    
    return () => {
      clearTimeout(timer)
      clearTimeout(hideTimer)
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)
    setError('')

    try {
      // Simulate progress for user experience
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      const media = await apiClient.uploadMedia(selectedFile, alt)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      // Reset form
      setSelectedFile(null)
      setAlt('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onUploadComplete?.(media)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('status.uploadFailed'))
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-500" />
    } else if (file.type.startsWith('video/')) {
      return <Video className="h-8 w-8 text-green-500" />
    }
    return <FileText className="h-8 w-8 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t('media.uploadMedia')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFile ? (
          <motion.div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('media.dropFilesHere')}
            </p>
            <p className="text-sm text-gray-500 mb-2">
              {t('media.supportsUpTo100MB')}
            </p>
            <div className={`text-xs text-muted-foreground transition-opacity duration-300 ${
              pasteHint ? 'opacity-100' : 'opacity-50'
            }`}>
              💡 {t('media.pasteImageTip')}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={getAcceptString()}
              onChange={handleFileInputChange}
            />
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile)}
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null)
                  setAlt('')
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selectedFile.type.startsWith('image/') && (
              <div className="space-y-2">
                <Label htmlFor="alt">{t('common.altText')}</Label>
                <Input
                  id="alt"
                  placeholder={t('placeholder.describeImage')}
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                />
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('common.uploading')}...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? t('common.uploading') + '...' : t('common.uploadFile')}
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {t('common.changeFile')}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}