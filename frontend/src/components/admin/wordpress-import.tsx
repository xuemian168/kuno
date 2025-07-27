"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { apiClient } from "@/lib/api"

// Get API URL from environment variable or default
function getApiBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl || apiUrl === '' || apiUrl === 'undefined') {
    return 'http://localhost:8080/api'
  }
  return apiUrl
}

interface ImportResult {
  imported_articles: number
  created_categories: number
  skipped_posts: number
  errors: string[]
}

interface WordPressImportProps {
  onImportComplete?: () => void
}

export function WordPressImport({ onImportComplete }: WordPressImportProps) {
  const t = useTranslations()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState(0)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        setError('Please select a valid XML file exported from WordPress')
        setSelectedFile(null)
        return
      }
      setSelectedFile(file)
      setError('')
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file first')
      return
    }

    // Check if user is authenticated
    const authToken = localStorage.getItem('auth_token')
    if (!authToken) {
      setError('You must be logged in to import content')
      return
    }

    setImporting(true)
    setError('')
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(`${getApiBaseUrl()}/articles/import-wordpress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Import failed'
        
        // Provide more helpful error messages
        if (errorMessage.includes('XML syntax error') || errorMessage.includes('illegal character')) {
          throw new Error('The WordPress export file contains invalid characters. The file has been automatically cleaned and should now import successfully. Please try again.')
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setImportResult(data.result)
      
      // Reset form
      setSelectedFile(null)
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      // Call the completion callback
      if (onImportComplete) {
        onImportComplete()
      }
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            WordPress Import
          </CardTitle>
          <CardDescription>
            Import articles and categories from a WordPress WXR export file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="wordpress-file">Select WordPress Export File</Label>
            <Input
              id="wordpress-file"
              type="file"
              accept=".xml"
              onChange={handleFileSelect}
              disabled={importing}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground">
              Upload a WordPress WXR (XML) export file. Make sure to export all content including posts and categories.
            </p>
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Badge variant="outline">XML</Badge>
              </div>
            </motion.div>
          )}

          {/* Progress Bar */}
          {importing && progress > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Import Results */}
          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Import completed successfully!
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.imported_articles}
                    </div>
                    <p className="text-xs text-muted-foreground">Articles Imported</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {importResult.created_categories}
                    </div>
                    <p className="text-xs text-muted-foreground">Categories Created</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-yellow-600">
                      {importResult.skipped_posts}
                    </div>
                    <p className="text-xs text-muted-foreground">Posts Skipped</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-destructive">Import Errors:</h4>
                  <div className="space-y-1">
                    {importResult.errors.map((error, index) => (
                      <p key={index} className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Import Button */}
          <Button 
            onClick={handleImport} 
            disabled={!selectedFile || importing}
            className="w-full"
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import WordPress Content
              </>
            )}
          </Button>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Instructions:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Export your WordPress content from WordPress Admin → Tools → Export</li>
              <li>• Choose &quot;All content&quot; to include posts, pages, and categories</li>
              <li>• Upload the downloaded XML file using the form above</li>
              <li>• The import will create new categories if they don&apos;t exist</li>
              <li>• Duplicate articles (same title) will be skipped</li>
              <li>• Only published posts will be imported (pages are skipped)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}