"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText, Eye, EyeOff, CheckCircle, AlertCircle, X, FolderOpen } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { apiClient, Category } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

interface MarkdownImportProps {
  onImportComplete?: () => void
}

interface ParsedMarkdownFile {
  filename: string
  title: string
  content: string
  frontMatter?: {
    title?: string
    date?: string
    category?: string
    tags?: string[]
    summary?: string
    [key: string]: any
  }
  rawContent: string
  hasError?: boolean
  errorMessage?: string
}

interface ImportResult {
  success: boolean
  filename: string
  title: string
  message?: string
  error?: string
}

export function MarkdownImport({ onImportComplete }: MarkdownImportProps) {
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [parsedFiles, setParsedFiles] = useState<ParsedMarkdownFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [defaultCategory, setDefaultCategory] = useState<number | undefined>()
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'importing' | 'results'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await apiClient.getCategories()
        setCategories(categoriesData)
        if (categoriesData.length > 0) {
          setDefaultCategory(categoriesData[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Parse Front Matter from markdown content
  const parseFrontMatter = (content: string) => {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
    const match = content.match(frontMatterRegex)
    
    if (!match) {
      return { frontMatter: null, content: content.trim() }
    }

    const [, frontMatterStr, markdownContent] = match
    const frontMatter: any = {}
    
    // Simple YAML parsing (basic key-value pairs)
    frontMatterStr.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim()
        let value = line.substring(colonIndex + 1).trim()
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        
        // Handle arrays (tags)
        if (value.startsWith('[') && value.endsWith(']')) {
          frontMatter[key] = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''))
        } else {
          frontMatter[key] = value
        }
      }
    })

    return { frontMatter, content: markdownContent.trim() }
  }

  // Handle file selection
  const processFiles = async (files: File[]) => {
    setLoading(true)
    const processed: ParsedMarkdownFile[] = []

    for (const file of files) {
      if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
        processed.push({
          filename: file.name,
          title: file.name,
          content: '',
          rawContent: '',
          hasError: true,
          errorMessage: 'Only .md and .markdown files are supported'
        })
        continue
      }

      try {
        const text = await file.text()
        const { frontMatter, content } = parseFrontMatter(text)
        
        const title = frontMatter?.title || file.name.replace(/\.(md|markdown)$/, '')
        
        processed.push({
          filename: file.name,
          title,
          content,
          frontMatter,
          rawContent: text,
          hasError: false
        })
      } catch (error) {
        processed.push({
          filename: file.name,
          title: file.name,
          content: '',
          rawContent: '',
          hasError: true,
          errorMessage: `Failed to read file: ${error}`
        })
      }
    }

    setParsedFiles(processed)
    setSelectedFiles(new Set(processed.filter(f => !f.hasError).map(f => f.filename)))
    setCurrentStep('review')
    setLoading(false)
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
      processFiles(files)
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files))
    }
  }

  // Handle file selection toggle
  const toggleFileSelection = (filename: string) => {
    const newSelection = new Set(selectedFiles)
    if (newSelection.has(filename)) {
      newSelection.delete(filename)
    } else {
      newSelection.add(filename)
    }
    setSelectedFiles(newSelection)
  }

  // Handle import
  const handleImport = async () => {
    if (selectedFiles.size === 0) return

    setImporting(true)
    setCurrentStep('importing')
    setImportProgress(0)
    
    const results: ImportResult[] = []
    const selectedFilesArray = Array.from(selectedFiles)
    
    for (let i = 0; i < selectedFilesArray.length; i++) {
      const filename = selectedFilesArray[i]
      const file = parsedFiles.find(f => f.filename === filename)
      
      if (!file || file.hasError) {
        results.push({
          success: false,
          filename,
          title: file?.title || filename,
          error: file?.errorMessage || 'File not found'
        })
        continue
      }

      try {
        // Determine category ID
        let categoryId = defaultCategory
        if (file.frontMatter?.category && categories.length > 0) {
          const categoryName = typeof file.frontMatter.category === 'string' ? file.frontMatter.category : String(file.frontMatter.category)
          const category = categories.find(c => 
            c.name.toLowerCase() === categoryName.toLowerCase()
          )
          if (category) {
            categoryId = category.id
          }
        }

        const response = await apiClient.importMarkdown({
          title: file.title,
          content: file.content,
          category_id: categoryId
        })

        results.push({
          success: true,
          filename,
          title: file.title,
          message: response.message
        })
      } catch (error) {
        results.push({
          success: false,
          filename,
          title: file.title,
          error: error instanceof Error ? error.message : 'Import failed'
        })
      }

      setImportProgress(Math.round(((i + 1) / selectedFilesArray.length) * 100))
    }

    setImportResults(results)
    setCurrentStep('results')
    setImporting(false)
    onImportComplete?.()
  }

  // Reset to initial state
  const resetImport = () => {
    setParsedFiles([])
    setSelectedFiles(new Set())
    setImportResults([])
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
          <FileText className="h-5 w-5" />
          Select Markdown Files
        </CardTitle>
        <CardDescription>
          Choose one or more .md or .markdown files to import. Files with Front Matter will be parsed automatically.
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
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Drop Markdown files here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Supports .md and .markdown files with optional Front Matter
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".md,.markdown"
            multiple
            onChange={handleFileInputChange}
          />
        </motion.div>

        {loading && (
          <div className="mt-4 text-center">
            <div className="h-4 w-4 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p className="text-sm text-muted-foreground">Processing files...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Render file review interface
  const renderReviewInterface = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Review Files ({parsedFiles.length})
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetImport}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={selectedFiles.size === 0}
              >
                Import {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Review and select files to import. Configure default category for files without category metadata.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Default Category:</Label>
              <Select value={defaultCategory?.toString()} onValueChange={(value) => setDefaultCategory(parseInt(value))}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              {parsedFiles.map(file => (
                <div key={file.filename} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.filename)}
                        onChange={() => toggleFileSelection(file.filename)}
                        disabled={file.hasError}
                        className="rounded"
                      />
                      <div>
                        <h4 className="font-medium">{file.title}</h4>
                        <p className="text-sm text-muted-foreground">{file.filename}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.hasError ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : (
                        <>
                          {file.frontMatter && (
                            <Badge variant="secondary">Front Matter</Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPreview(showPreview === file.filename ? null : file.filename)}
                          >
                            {showPreview === file.filename ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {file.hasError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{file.errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  <AnimatePresence>
                    {showPreview === file.filename && !file.hasError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 border-t pt-4"
                      >
                        <Tabs defaultValue="preview">
                          <TabsList>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                            {file.frontMatter && <TabsTrigger value="metadata">Metadata</TabsTrigger>}
                            <TabsTrigger value="raw">Raw</TabsTrigger>
                          </TabsList>
                          <TabsContent value="preview" className="mt-4">
                            <div className="bg-muted/50 rounded p-4 max-h-64 overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-sm">{file.content}</pre>
                            </div>
                          </TabsContent>
                          {file.frontMatter && (
                            <TabsContent value="metadata" className="mt-4">
                              <div className="bg-muted/50 rounded p-4">
                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                  {Object.entries(file.frontMatter).map(([key, value]) => (
                                    <div key={key}>
                                      <dt className="font-medium text-muted-foreground">{key}:</dt>
                                      <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            </TabsContent>
                          )}
                          <TabsContent value="raw" className="mt-4">
                            <div className="bg-muted/50 rounded p-4 max-h-64 overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-xs font-mono">{file.rawContent}</pre>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Render importing interface
  const renderImportingInterface = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Importing Files...
        </CardTitle>
        <CardDescription>
          Please wait while we import your Markdown files.
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
    const successCount = importResults.filter(r => r.success).length
    const errorCount = importResults.filter(r => !r.success).length

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
            <CardDescription>
              {successCount} file{successCount !== 1 ? 's' : ''} imported successfully
              {errorCount > 0 && `, ${errorCount} failed`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={resetImport}>
                Import More Files
              </Button>
              <Button variant="outline" onClick={onImportComplete}>
                Done
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {importResults.map(result => (
                <div key={result.filename} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{result.title}</p>
                      <p className="text-sm text-muted-foreground">{result.filename}</p>
                      {result.error && (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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