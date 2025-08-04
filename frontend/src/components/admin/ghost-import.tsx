"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, Database, CheckCircle, AlertCircle, X, FileJson, Eye, EyeOff } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiClient } from "@/lib/api"

interface GhostImportProps {
  onImportComplete?: () => void
}

interface GhostData {
  db: Array<{
    meta: {
      exported_on: number
      version: string
    }
    data: {
      posts?: Array<{
        id: string
        title: string
        slug: string
        mobiledoc?: string
        html?: string
        plaintext?: string
        created_at: string
        updated_at: string
        published_at: string | null
        status: string
        page: boolean
        meta_title?: string
        meta_description?: string
        tags?: Array<{
          name: string
          slug: string
        }>
        authors?: Array<{
          name: string
          email?: string
        }>
      }>
      tags?: Array<{
        id: string
        name: string
        slug: string
        description?: string
      }>
      users?: Array<{
        id: string
        name: string
        email: string
      }>
    }
  }>
}

interface ParsedGhostFile {
  filename: string
  data: GhostData
  posts: number
  pages: number
  tags: number
  users: number
  version: string
  exportDate: string
  hasError?: boolean
  errorMessage?: string
}

interface ImportResult {
  success: boolean
  message: string
  result?: {
    imported_articles: number
    imported_pages: number
    imported_tags: number
    errors: string[]
  }
}

export function GhostImport({ onImportComplete }: GhostImportProps) {
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [parsedFile, setParsedFile] = useState<ParsedGhostFile | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'importing' | 'results'>('upload')
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parse Ghost JSON file
  const parseGhostFile = (content: string, filename: string): ParsedGhostFile => {
    try {
      const data: GhostData = JSON.parse(content)
      
      if (!data.db || !Array.isArray(data.db) || data.db.length === 0) {
        return {
          filename,
          data,
          posts: 0,
          pages: 0,
          tags: 0,
          users: 0,
          version: 'unknown',
          exportDate: 'unknown',
          hasError: true,
          errorMessage: 'Invalid Ghost export format: missing db array'
        }
      }

      const dbData = data.db[0]
      const posts = dbData.data.posts?.filter(p => !p.page) || []
      const pages = dbData.data.posts?.filter(p => p.page) || []
      const tags = dbData.data.tags || []
      const users = dbData.data.users || []

      return {
        filename,
        data,
        posts: posts.length,
        pages: pages.length,
        tags: tags.length,
        users: users.length,
        version: dbData.meta.version || 'unknown',
        exportDate: new Date(dbData.meta.exported_on * 1000).toLocaleDateString(),
        hasError: false
      }
    } catch (error) {
      return {
        filename,
        data: { db: [] },
        posts: 0,
        pages: 0,
        tags: 0,
        users: 0,
        version: 'unknown',
        exportDate: 'unknown',
        hasError: true,
        errorMessage: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Handle file selection
  const processFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setParsedFile({
        filename: file.name,
        data: { db: [] },
        posts: 0,
        pages: 0,
        tags: 0,
        users: 0,
        version: 'unknown',
        exportDate: 'unknown',
        hasError: true,
        errorMessage: 'Only .json files are supported'
      })
      setCurrentStep('review')
      return
    }

    setLoading(true)
    try {
      const text = await file.text()
      const parsed = parseGhostFile(text, file.name)
      setParsedFile(parsed)
      setCurrentStep('review')
    } catch (error) {
      setParsedFile({
        filename: file.name,
        data: { db: [] },
        posts: 0,
        pages: 0,
        tags: 0,
        users: 0,
        version: 'unknown',
        exportDate: 'unknown',
        hasError: true,
        errorMessage: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      setCurrentStep('review')
    } finally {
      setLoading(false)
    }
  }

  // Handle drag and drop
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
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0]) // Ghost import typically uses single file
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  // Handle import
  const handleImport = async () => {
    if (!parsedFile || parsedFile.hasError) return

    setImporting(true)
    setCurrentStep('importing')
    setImportProgress(0)

    try {
      // Simulate progress for user experience
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Create a new File object from the parsed data
      const jsonBlob = new Blob([JSON.stringify(parsedFile.data)], { type: 'application/json' })
      const file = new File([jsonBlob], parsedFile.filename, { type: 'application/json' })

      try {
        const response = await apiClient.importGhost(file)
        clearInterval(progressInterval)
        setImportProgress(100)

        setImportResult({
          success: true,
          message: response.message,
          result: response.result
        })
      } catch (error) {
        clearInterval(progressInterval)
        setImportResult({
          success: false,
          message: error instanceof Error ? error.message : 'Import failed'
        })
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed'
      })
    } finally {
      setCurrentStep('results')
      setImporting(false)
      onImportComplete?.()
    }
  }

  // Reset to initial state
  const resetImport = () => {
    setParsedFile(null)
    setImportResult(null)
    setCurrentStep('upload')
    setImportProgress(0)
    setShowPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Render upload interface
  const renderUploadInterface = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Select Ghost Export File
        </CardTitle>
        <CardDescription>
          Choose a Ghost export JSON file. You can export your Ghost data from the Ghost admin panel under Labs → Export.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
          <FileJson className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Drop Ghost export file here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Supports .json files exported from Ghost
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".json"
            onChange={handleFileInputChange}
          />
        </motion.div>

        {loading && (
          <div className="mt-4 text-center">
            <div className="h-4 w-4 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p className="text-sm text-muted-foreground">Processing file...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Render file review interface
  const renderReviewInterface = () => {
    if (!parsedFile) return null

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Review Ghost Export
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetImport}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={parsedFile.hasError}
                >
                  Start Import
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Review the Ghost export data before importing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parsedFile.hasError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parsedFile.errorMessage}</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{parsedFile.posts}</div>
                    <div className="text-sm text-muted-foreground">Posts</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{parsedFile.pages}</div>
                    <div className="text-sm text-muted-foreground">Pages</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{parsedFile.tags}</div>
                    <div className="text-sm text-muted-foreground">Tags</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{parsedFile.users}</div>
                    <div className="text-sm text-muted-foreground">Authors</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{parsedFile.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      Ghost v{parsedFile.version} • Exported on {parsedFile.exportDate}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(showPreview ? null : 'data')}
                  >
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPreview ? 'Hide' : 'Preview'}
                  </Button>
                </div>

                <AnimatePresence>
                  {showPreview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border rounded-lg p-4"
                    >
                      <Tabs defaultValue="posts">
                        <TabsList>
                          <TabsTrigger value="posts">Posts ({parsedFile.posts})</TabsTrigger>
                          <TabsTrigger value="pages">Pages ({parsedFile.pages})</TabsTrigger>
                          <TabsTrigger value="tags">Tags ({parsedFile.tags})</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="posts" className="mt-4">
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {parsedFile.data.db[0]?.data.posts?.filter(p => !p.page).slice(0, 10).map(post => (
                              <div key={post.id} className="p-3 border rounded">
                                <h4 className="font-medium">{post.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {post.status} • {new Date(post.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            )) || <p className="text-muted-foreground">No posts found</p>}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="pages" className="mt-4">
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {parsedFile.data.db[0]?.data.posts?.filter(p => p.page).slice(0, 10).map(page => (
                              <div key={page.id} className="p-3 border rounded">
                                <h4 className="font-medium">{page.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {page.status} • {new Date(page.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            )) || <p className="text-muted-foreground">No pages found</p>}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="tags" className="mt-4">
                          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                            {parsedFile.data.db[0]?.data.tags?.map(tag => (
                              <Badge key={tag.id} variant="outline">
                                {tag.name}
                              </Badge>
                            )) || <p className="text-muted-foreground">No tags found</p>}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render importing interface
  const renderImportingInterface = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Importing Ghost Data...
        </CardTitle>
        <CardDescription>
          Please wait while we import your Ghost data. This may take a while for large exports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={importProgress} />
          <p className="text-center text-sm text-muted-foreground">
            {importProgress}% complete
          </p>
        </div>
      </CardContent>
    </Card>
  )

  // Render results interface
  const renderResultsInterface = () => {
    if (!importResult) return null

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {importResult.success ? 'Import Complete' : 'Import Failed'}
            </CardTitle>
            <CardDescription>
              {importResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={resetImport}>
                Import Another File
              </Button>
              <Button variant="outline" onClick={onImportComplete}>
                Done
              </Button>
            </div>
          </CardContent>
        </Card>

        {importResult.success && importResult.result && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{importResult.result.imported_articles}</div>
                  <div className="text-sm text-muted-foreground">Articles Imported</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.result.imported_pages}</div>
                  <div className="text-sm text-muted-foreground">Pages Imported</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{importResult.result.imported_tags}</div>
                  <div className="text-sm text-muted-foreground">Tags Imported</div>
                </div>
              </div>

              {importResult.result.errors && importResult.result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Errors:</h4>
                  <ul className="space-y-1">
                    {importResult.result.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {currentStep === 'upload' && renderUploadInterface()}
      {currentStep === 'review' && renderReviewInterface()}
      {currentStep === 'importing' && renderImportingInterface()}
      {currentStep === 'results' && renderResultsInterface()}
    </div>
  )
}