'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Package,
  Copy,
  Check,
  Terminal,
  ChevronRight,
  Server,
  Layers
} from 'lucide-react'

interface SystemInfo {
  version: string
  build_date: string
  git_commit: string
  git_branch: string
  build_number: string
}

interface UpdateCommand {
  step: number
  title: string
  description: string
  command: string
}

interface UpdateInstructions {
  docker: UpdateCommand[]
  docker_compose: UpdateCommand[]
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
  const t = useTranslations()
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpdateCommand, setShowUpdateCommand] = useState(false)
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  // Load system info on mount
  useEffect(() => {
    loadSystemInfo()
  }, [])

  const loadSystemInfo = async () => {
    try {
      const data = await apiClient.getSystemInfo()
      setSystemInfo(data.system_info)
    } catch (err) {
      console.error('Failed to load system info:', err)
    }
  }

  const checkForUpdates = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiClient.checkUpdates()
      setUpdateInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('system.failedToCheckUpdates'))
    } finally {
      setLoading(false)
    }
  }

  const clearCache = async () => {
    try {
      await apiClient.clearCache()
      // Refresh update info
      await checkForUpdates()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('system.failedToClearCache'))
    }
  }

  const copyToClipboard = async (text: string, commandId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCommand(commandId)
      setTimeout(() => setCopiedCommand(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
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

  const getDockerUpgradeCommands = (): UpdateInstructions => {
    return {
      docker: [
        {
          step: 1,
          title: 'backupData',
          description: 'backupDataDesc',
          command: `# Create backup directory
mkdir -p ./backups/$(date +%Y%m%d_%H%M%S)

# Backup data volume
docker run --rm \\
  -v blog-data:/data \\
  -v $(pwd)/backups/$(date +%Y%m%d_%H%M%S):/backup \\
  alpine sh -c "cd /data && tar czf /backup/blog-data-backup.tar.gz ."

echo "✅ Backup completed"`
        },
        {
          step: 2,
          title: 'pullLatestImage',
          description: 'pullLatestImageDesc',
          command: `# Pull latest image
docker pull ictrun/kuno:latest

echo "✅ Latest image pulled"`
        },
        {
          step: 3,
          title: 'stopOldContainer',
          description: 'stopOldContainerDesc',
          command: `# Stop and remove old container
docker stop kuno 2>/dev/null || echo "Container not running"
docker rm kuno 2>/dev/null || echo "Container not found"

echo "✅ Old container removed"`
        },
        {
          step: 4,
          title: 'verifyDataVolume',
          description: 'verifyDataVolumeDesc',
          command: `# Verify data volume before upgrade
echo "📊 Checking data volume..."
docker run --rm -v blog-data:/data alpine sh -c "ls -la /data/ && if [ -f /data/blog.db ]; then echo '✅ Database file exists'; else echo '❌ Database file missing'; fi"`
        },
        {
          step: 5,
          title: 'startNewContainer',
          description: 'startNewContainerDesc',
          command: `# Start new container with data volume
docker run -d \\
  --name kuno \\
  --restart unless-stopped \\
  -p 80:80 \\
  -v blog-data:/app/data \\
  -e NEXT_PUBLIC_API_URL=https://qut.edu.kg/api \\
  -e DB_PATH=/app/data/blog.db \\
  ictrun/kuno:latest

echo "✅ New container started"`
        },
        {
          step: 6,
          title: 'verifyUpgrade',
          description: 'verifyUpgradeDesc',
          command: `# Wait for container to start
sleep 15

# Check container status
docker ps | grep kuno

# Check container logs
echo "📋 Container logs:"
docker logs --tail=20 kuno

# Verify data is accessible
echo "📊 Verifying data:"
docker exec kuno ls -la /app/data/`
        }
      ],
      docker_compose: [
        {
          step: 1,
          title: 'stopServices',
          description: 'stopServicesDesc',
          command: `# Create backup directory
mkdir -p ./backups/$(date +%Y%m%d_%H%M%S)

# Stop services temporarily
docker-compose stop

# Backup data volume (adjust volume name if needed)
docker run --rm \\
  -v blog_blog_data:/data \\
  -v $(pwd)/backups/$(date +%Y%m%d_%H%M%S):/backup \\
  alpine sh -c "cd /data && tar czf /backup/blog-data-backup.tar.gz ."

# Start services back up
docker-compose start

echo "✅ Backup completed"`
        },
        {
          step: 2,
          title: 'pullLatestImages',
          description: 'pullLatestImagesDesc',
          command: `# Pull latest images
docker-compose pull

echo "✅ Latest images pulled"`
        },
        {
          step: 3,
          title: 'upgradeZeroDowntime',
          description: 'upgradeZeroDowntimeDesc',
          command: `# Upgrade with zero downtime
docker-compose up -d --force-recreate --remove-orphans

echo "✅ Services upgraded"`
        },
        {
          step: 4,
          title: 'cleanupOldImages',
          description: 'cleanupOldImagesDesc',
          command: `# Clean up old images (optional)
docker image prune -f

echo "✅ Old images cleaned up"`
        },
        {
          step: 5,
          title: 'verifyUpgrade',
          description: 'verifyUpgradeDesc',
          command: `# Check services status
docker-compose ps

# Check logs
docker-compose logs -f --tail=50`
        }
      ]
    }
  }

  const renderUpdateCommand = (cmd: UpdateCommand, type: 'docker' | 'compose') => {
    const commandId = `${type}-${cmd.step}`
    
    // Handle title translation - if it doesn't contain spaces, it's a translation key
    const isTranslationKey = !cmd.title.includes(' ')
    const title = isTranslationKey ? t(`system.${cmd.title}`) : cmd.title
    
    // Handle description translation - if it doesn't contain spaces and ends with 'Desc', it's a translation key  
    const isDescriptionKey = !cmd.description.includes(' ') && cmd.description.endsWith('Desc')
    const description = isDescriptionKey ? t(`system.${cmd.description}`) : cmd.description
    
    return (
      <div key={cmd.step} className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border/50">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-1.5 py-0.5 text-xs">
                {t('system.step')} {cmd.step}
              </Badge>
              <h5 className="font-medium text-sm">
                {title}
              </h5>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="relative group">
          <pre className="text-xs font-mono bg-background p-3 pr-12 rounded border overflow-x-auto whitespace-pre">
            {cmd.command}
          </pre>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(cmd.command, commandId)}
            className="absolute right-2 top-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copiedCommand === commandId ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          {copiedCommand === commandId && (
            <span className="absolute right-10 top-2.5 text-xs text-green-600 animate-fade-in">
              {t('system.copiedToClipboard')}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-0">
      <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 border-b border-blue-200 dark:border-blue-700 pt-6 pb-4 px-4 rounded-t-lg flex flex-col justify-center min-h-[80px]">
        <CardTitle className="text-xl font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t('system.systemInformation')}
        </CardTitle>
        <CardDescription className="text-blue-600 dark:text-blue-300">
          {t('system.systemInfoDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* System Information */}
        {systemInfo && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Info className="h-4 w-4" />
              {t('system.currentSystem')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('system.version')}:</span>
                  <Badge variant="outline">{systemInfo.version}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('system.buildNumber')}:</span>
                  <span className="text-sm font-mono">{systemInfo.build_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t('system.buildDate')}:
                  </span>
                  <span className="text-sm">{systemInfo.build_date}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <GitCommit className="h-3 w-3" />
                    {t('system.commit')}:
                  </span>
                  <span className="text-sm font-mono">{systemInfo.git_commit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {t('system.branch')}:
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
              {t('system.softwareUpdates')}
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCache}
                disabled={loading}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {t('system.clearCache')}
              </Button>
              <Button
                onClick={checkForUpdates}
                disabled={loading}
                size="sm"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                {t('system.checkForUpdates')}
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
                    {t('system.updateAvailable', { version: updateInfo.latest_version })}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">
                    {t('system.upToDate', { version: updateInfo.current_version })}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('system.currentVersion')}:</span>
                    <Badge variant="secondary">{updateInfo.current_version}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('system.latestVersion')}:</span>
                    <Badge variant={updateInfo.has_update ? "default" : "secondary"}>
                      {updateInfo.latest_version}
                    </Badge>
                  </div>
                </div>
                {updateInfo.release_date && updateInfo.image_size && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('system.releaseDate')}:</span>
                      <span className="text-sm">{formatDate(updateInfo.release_date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('system.imageSize')}:</span>
                      <span className="text-sm">{formatFileSize(updateInfo.image_size)}</span>
                    </div>
                  </div>
                )}
              </div>

              {updateInfo.has_update && updateInfo.changelog && updateInfo.changelog.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('system.whatsNew')}</h4>
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

              {/* Always show upgrade commands - Docker deployment requires manual commands */}
              {(
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUpdateCommand(!showUpdateCommand)}
                  >
                    {showUpdateCommand ? t('system.hideUpdateCommands') : t('system.showUpdateCommands')}
                  </Button>
                  
                  {showUpdateCommand && (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <h4 className="text-base font-semibold flex items-center gap-2">
                          <Terminal className="h-4 w-4" />
                          {t('system.updateInstructionsTitle')}
                        </h4>
                        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {t('system.updateImportantNote')}
                          </AlertDescription>
                        </Alert>
                        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <strong>{t('common.important')}:</strong> {t('system.dockerDeploymentWarning')}
                          </AlertDescription>
                        </Alert>
                      </div>

                      <Tabs defaultValue="docker" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="docker" className="flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            {t('system.dockerSingleContainer')}
                          </TabsTrigger>
                          <TabsTrigger value="compose" className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            {t('system.dockerCompose')}
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="docker" className="space-y-3 mt-4">
                          {getDockerUpgradeCommands().docker.map(cmd => renderUpdateCommand(cmd, 'docker'))}
                        </TabsContent>
                        
                        <TabsContent value="compose" className="space-y-3 mt-4">
                          {getDockerUpgradeCommands().docker_compose.map(cmd => renderUpdateCommand(cmd, 'compose'))}
                        </TabsContent>
                      </Tabs>
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