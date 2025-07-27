'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { apiClient } from '@/lib/api'
import { 
  RefreshCw, 
  Download, 
  Info, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  GitCommit,
  GitBranch,
  Package
} from 'lucide-react'

interface SystemInfo {
  version: string
  build_date: string
  git_commit: string
  git_branch: string
  build_number: string
}

interface UpdateInfo {
  has_update: boolean
  current_version: string
  latest_version: string
  release_date?: string
  image_size?: number
  update_command?: string
  changelog?: string[]
}

export function UpdateChecker() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpdateCommand, setShowUpdateCommand] = useState(false)

  // Load system info on mount
  useEffect(() => {
    loadSystemInfo()
  }, [])

  const loadSystemInfo = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/system/info`)
      const data = await response.json()
      setSystemInfo(data.system_info)
    } catch (err) {
      console.error('Failed to load system info:', err)
    }
  }

  const checkForUpdates = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/system/check-updates`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to check for updates')
      }

      const data = await response.json()
      setUpdateInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates')
    } finally {
      setLoading(false)
    }
  }

  const clearCache = async () => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        throw new Error('Authentication required')
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/system/clear-cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      // Refresh update info
      await checkForUpdates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache')
    }
  }

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
      <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 border-b border-blue-200 dark:border-blue-700 pt-6 pb-4 px-4 rounded-t-lg flex flex-col justify-center min-h-[80px]">
        <CardTitle className="text-xl font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <Package className="h-5 w-5" />
          System Information & Updates
        </CardTitle>
        <CardDescription className="text-blue-600 dark:text-blue-300">
          View system information and check for available updates
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* System Information */}
        {systemInfo && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Info className="h-4 w-4" />
              Current System
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version:</span>
                  <Badge variant="outline">{systemInfo.version}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Build Number:</span>
                  <span className="text-sm font-mono">{systemInfo.build_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Build Date:
                  </span>
                  <span className="text-sm">{systemInfo.build_date}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <GitCommit className="h-3 w-3" />
                    Commit:
                  </span>
                  <span className="text-sm font-mono">{systemInfo.git_commit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    Branch:
                  </span>
                  <span className="text-sm">{systemInfo.git_branch}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Update Check Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Download className="h-4 w-4" />
              Software Updates
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCache}
                disabled={loading}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Clear Cache
              </Button>
              <Button
                onClick={checkForUpdates}
                disabled={loading}
                size="sm"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Check for Updates
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {updateInfo && (
            <div className="space-y-4">
              {updateInfo.has_update ? (
                <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                  <Download className="h-4 w-4" />
                  <AlertDescription className="font-medium">
                    Update Available! Version {updateInfo.latest_version} is now available.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">
                    You are running the latest version ({updateInfo.current_version}).
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Version:</span>
                    <Badge variant="secondary">{updateInfo.current_version}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Latest Version:</span>
                    <Badge variant={updateInfo.has_update ? "default" : "secondary"}>
                      {updateInfo.latest_version}
                    </Badge>
                  </div>
                </div>
                {updateInfo.release_date && updateInfo.image_size && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Release Date:</span>
                      <span className="text-sm">{formatDate(updateInfo.release_date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Image Size:</span>
                      <span className="text-sm">{formatFileSize(updateInfo.image_size)}</span>
                    </div>
                  </div>
                )}
              </div>

              {updateInfo.has_update && updateInfo.changelog && updateInfo.changelog.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">What&apos;s New:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {updateInfo.changelog.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-xs mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {updateInfo.has_update && updateInfo.update_command && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUpdateCommand(!showUpdateCommand)}
                  >
                    {showUpdateCommand ? 'Hide' : 'Show'} Update Commands
                  </Button>
                  
                  {showUpdateCommand && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-2">Update Commands:</h4>
                      <pre className="text-xs whitespace-pre-wrap font-mono bg-background p-3 rounded border overflow-x-auto">
                        {updateInfo.update_command}
                      </pre>
                      <p className="text-xs text-muted-foreground mt-2">
                        Copy and run these commands in your terminal to update the application.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}