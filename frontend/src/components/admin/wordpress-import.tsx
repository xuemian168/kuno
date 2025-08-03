"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Eye, Calendar, User, Tag, ArrowLeft } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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

interface ParsedArticle {
  title: string
  content: string
  excerpt?: string
  author?: string
  publishDate?: string
  categories: string[]
  tags: string[]
  status: 'publish' | 'draft' | 'private'
}

interface ParseResult {
  articles: ParsedArticle[]
  categories: string[]
  total_posts: number
  publishable_posts: number
}

interface WordPressImportProps {
  onImportComplete?: () => void
}

export function WordPressImport({ onImportComplete }: WordPressImportProps) {
  const t = useTranslations()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'import' | 'completed'>('upload')
  const [showAllArticles, setShowAllArticles] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        setError(t('import.selectValidXmlFile'))
        setSelectedFile(null)
        return
      }
      setSelectedFile(file)
      setError('')
      setImportResult(null)
      setParseResult(null)
      setCurrentStep('upload')
    }
  }

  const handleParseFile = async () => {
    if (!selectedFile) {
      setError(t('import.selectFileFirst'))
      return
    }

    // Check if user is authenticated
    const authToken = localStorage.getItem('auth_token')
    if (!authToken) {
      setError(t('import.mustBeLoggedIn'))
      return
    }

    setParsing(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`${getApiBaseUrl()}/articles/parse-wordpress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || t('import.parseFailed')
        
        if (errorMessage.includes('XML syntax error') || errorMessage.includes('illegal character')) {
          throw new Error(t('import.invalidCharactersError'))
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setParseResult(data.result)
      setCurrentStep('preview')
    } catch (err) {
      console.error('Parse error:', err)
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!selectedFile || !parseResult) {
      setError(t('import.selectFileFirst'))
      return
    }

    // Check if user is authenticated
    const authToken = localStorage.getItem('auth_token')
    if (!authToken) {
      setError(t('import.mustBeLoggedIn'))
      return
    }

    setImporting(true)
    setError('')
    setProgress(0)
    setCurrentStep('import')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('confirmed', 'true') // 表示用户已确认导入

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
        const errorMessage = errorData.error || t('import.importFailed')
        
        // Provide more helpful error messages
        if (errorMessage.includes('XML syntax error') || errorMessage.includes('illegal character')) {
          throw new Error(t('import.invalidCharactersError'))
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setImportResult(data.result)
      setCurrentStep('completed')
      
      // Call the completion callback
      if (onImportComplete) {
        onImportComplete()
      }
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Import failed')
      setCurrentStep('preview') // 返回预览页面
    } finally {
      setImporting(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const handleBack = () => {
    setCurrentStep('upload')
    setParseResult(null)
    setError('')
    setShowAllArticles(false)
  }

  const handleReset = () => {
    setSelectedFile(null)
    setParseResult(null)
    setImportResult(null)
    setCurrentStep('upload')
    setError('')
    setShowAllArticles(false)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const truncateContent = (content: string, maxLength = 200): string => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  // 渲染上传步骤
  const renderUploadStep = () => (
    <CardContent className="space-y-4">
      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="wordpress-file">{t('import.selectExportFile')}</Label>
        <Input
          id="wordpress-file"
          type="file"
          accept=".xml"
          onChange={handleFileSelect}
          disabled={parsing}
          className="cursor-pointer"
        />
        <p className="text-sm text-muted-foreground">
          {t('import.uploadDescription')}
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

      {/* Parse Button */}
      <Button 
        onClick={handleParseFile} 
        disabled={!selectedFile || parsing}
        className="w-full"
      >
        {parsing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('import.parsing')}
          </>
        ) : (
          <>
            <Eye className="mr-2 h-4 w-4" />
            {t('import.parseAndPreview')}
          </>
        )}
      </Button>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="text-sm font-medium mb-2">{t('import.instructions')}</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• {t('import.instructionStep1')}</li>
          <li>• {t('import.instructionStep2')}</li>
          <li>• {t('import.instructionStep3')}</li>
          <li>• {t('import.instructionStep4')}</li>
          <li>• {t('import.instructionStep5')}</li>
          <li>• {t('import.instructionStep6')}</li>
        </ul>
      </div>
    </CardContent>
  )

  // 渲染预览步骤
  const renderPreviewStep = () => (
    <CardContent className="space-y-4">
      {parseResult && (
        <>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {parseResult.total_posts}
              </div>
              <p className="text-xs text-muted-foreground">{t('import.totalPosts')}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {parseResult.publishable_posts}
              </div>
              <p className="text-xs text-muted-foreground">{t('import.publishablePosts')}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {parseResult.categories ? parseResult.categories.length : 0}
              </div>
              <p className="text-xs text-muted-foreground">{t('import.categoriesFound')}</p>
            </div>
          </div>

          {/* Categories Preview */}
          {parseResult.categories && parseResult.categories.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('import.categoriesWillBeCreated')}</h4>
              <div className="flex flex-wrap gap-2">
                {parseResult.categories.map((category, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Articles Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('import.articlesPreview')}</h4>
            <ScrollArea className="h-96 border rounded-lg">
              <div className="p-4 space-y-4">
                {(parseResult.articles || [])
                  .slice(0, showAllArticles ? parseResult.articles?.length : 10)
                  .map((article, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h5 className="font-medium text-sm">{article.title}</h5>
                        <Badge 
                          variant={article.status === 'publish' ? 'default' : 
                                  article.status === 'draft' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {article.status}
                        </Badge>
                      </div>
                      
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground">
                          {truncateContent(article.excerpt, 150)}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {article.publishDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(article.publishDate)}</span>
                          </div>
                        )}
                        
                        {article.author && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{article.author}</span>
                          </div>
                        )}
                        
                        {article.categories && article.categories.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            <span>{article.categories.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {(parseResult.articles && parseResult.articles.length > 10) && !showAllArticles && (
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllArticles(true)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {t('import.showMoreArticles', { count: parseResult.articles.length - 10 })}
                    </Button>
                  </div>
                )}
                
                {showAllArticles && (parseResult.articles && parseResult.articles.length > 10) && (
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllArticles(false)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {t('import.showLessArticles')}
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleBack}
              disabled={importing}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('import.back')}
            </Button>
            <Button 
              onClick={handleConfirmImport}
              disabled={importing || !parseResult.publishable_posts || parseResult.publishable_posts === 0}
              className="flex-1"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('import.importing')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('import.confirmImport')}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </CardContent>
  )

  // 渲染导入步骤
  const renderImportStep = () => (
    <CardContent className="space-y-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
        <div className="space-y-2">
          <h3 className="text-lg font-medium">{t('import.importing')}</h3>
          <p className="text-sm text-muted-foreground">{t('import.importingDescription')}</p>
        </div>
        
        {progress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{t('import.progress')}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>
    </CardContent>
  )

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload':
        return t('import.selectFile')
      case 'preview':
        return t('import.previewArticles')
      case 'import':
        return t('import.importing')
      case 'completed':
        return t('import.importCompleted')
      default:
        return t('import.wordpressImport')
    }
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
            {getStepTitle()}
          </CardTitle>
          <CardDescription>
            {currentStep === 'upload' && t('import.uploadDescription')}
            {currentStep === 'preview' && t('import.previewDescription')}
            {currentStep === 'import' && t('import.importingDescription')}
            {currentStep === 'completed' && t('import.completedDescription')}
          </CardDescription>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mt-2">
            <div className={`h-2 w-2 rounded-full ${currentStep === 'upload' ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`h-0.5 w-8 ${currentStep === 'preview' || currentStep === 'import' || currentStep === 'completed' ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`h-2 w-2 rounded-full ${currentStep === 'preview' ? 'bg-blue-500' : currentStep === 'import' || currentStep === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`h-0.5 w-8 ${currentStep === 'import' || currentStep === 'completed' ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`h-2 w-2 rounded-full ${currentStep === 'import' ? 'bg-blue-500 animate-pulse' : currentStep === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`h-0.5 w-8 ${currentStep === 'completed' ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`h-2 w-2 rounded-full ${currentStep === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>
        </CardHeader>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mx-6 mb-4"
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Step Content */}
        {currentStep === 'upload' && renderUploadStep()}
        {currentStep === 'preview' && renderPreviewStep()}
        {currentStep === 'import' && renderImportStep()}
        
        {/* Completed Step */}
        {currentStep === 'completed' && importResult && (
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {t('import.importCompleted')}
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.imported_articles}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('import.articlesImported')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {importResult.created_categories}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('import.categoriesCreated')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {importResult.skipped_posts}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('import.postsSkipped')}</p>
                </CardContent>
              </Card>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-destructive">{t('import.importErrors')}</h4>
                <div className="space-y-1">
                  {importResult.errors.map((error, index) => (
                    <p key={index} className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleReset} className="w-full">
              {t('import.importAnother')}
            </Button>
          </CardContent>
        )}
      </Card>
    </motion.div>
  )
}