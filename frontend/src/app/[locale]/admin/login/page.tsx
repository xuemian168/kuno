'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Lock, User, Shield, AlertTriangle, HelpCircle, Terminal, Copy } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { apiClient, SiteSettings } from '@/lib/api'
import Image from 'next/image'

interface LoginPageProps {
  params: Promise<{ locale: string }>
}

export default function LoginPage({ params }: LoginPageProps) {
  const t = useTranslations()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [checkingRecovery, setCheckingRecovery] = useState(true)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const { login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load both recovery status and site settings
        const [recoveryStatus, siteSettings] = await Promise.all([
          apiClient.getRecoveryStatus(),
          apiClient.getSettings()
        ])
        
        setIsRecoveryMode(recoveryStatus.is_recovery_mode)
        setRecoveryMessage(recoveryStatus.message || '')
        setSettings(siteSettings)
      } catch (error) {
        console.error('Failed to load data:', error)
        // Still try to load settings even if recovery status fails
        try {
          const siteSettings = await apiClient.getSettings()
          setSettings(siteSettings)
        } catch (settingsError) {
          console.error('Failed to load settings:', settingsError)
        }
      } finally {
        setCheckingRecovery(false)
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      // Get locale from params and redirect to locale admin
      const { locale } = await params
      router.push(`/${locale}/admin`)
    } catch {
      setError(t('admin.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(label)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            {/* Logo Section */}
            <div className="flex justify-center mb-4">
              {settings?.logo_url ? (
                <Image
                  src="/kuno.png"
                  alt={settings.site_title || 'Site Logo'}
                  width={80}
                  height={80}
                  className="max-h-20 w-auto object-contain"
                  priority
                />
              ) : (
                <div className="text-4xl font-bold text-primary">
                  {settings?.site_title?.charAt(0) || 'B'}
                </div>
              )}
            </div>
            
            <CardTitle className="text-2xl font-bold text-center">{t('admin.login')}</CardTitle>
            <CardDescription className="text-center">
              {t('admin.enterCredentials')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkingRecovery ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Checking system status...</p>
              </div>
            ) : isRecoveryMode ? (
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  <div className="space-y-2">
                    <div className="font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {t('settings.recoveryModeActive')}
                    </div>
                    <p className="text-sm">{t('settings.recoveryModeWarning')}</p>
                    <div className="text-sm font-mono bg-orange-100 dark:bg-orange-900/30 p-2 rounded border border-orange-200 dark:border-orange-800">
                      <p><strong>Username:</strong> admin</p>
                      <p><strong>Password:</strong> xuemian168</p>
                    </div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      {t('settings.disableRecoveryMode')}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t('admin.username')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="username"
                    type="text"
                    placeholder={t('admin.enterUsername')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('admin.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('admin.enterPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: '#00b043', color: '#fff' }}>
                {loading ? t('admin.signingin') : t('admin.signin')}
              </Button>
            </form>
            
            {/* Forgot Password Dialog */}
            <div className="text-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="link" 
                    className="text-sm text-muted-foreground hover:text-primary p-0 h-auto"
                  >
                    <HelpCircle className="h-3 w-3 mr-1" />
                    {t('admin.forgotPassword')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {t('admin.passwordReset')}
                    </DialogTitle>
                    <DialogDescription>
                      {t('admin.passwordResetSteps')}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        <div className="space-y-1">
                          <p className="font-medium">{t('admin.passwordResetNote')}</p>
                          <p className="text-sm">{t('admin.passwordResetWarning')}</p>
                        </div>
                      </AlertDescription>
                    </Alert>

                    {/* Step 1 */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t('admin.passwordResetStep1')}</h4>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-sm relative">
                        <div className="flex justify-between items-start">
                          <code>docker stop kuno</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard('docker stop kuno', 'step1')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {copySuccess === 'step1' && (
                          <span className="absolute -top-8 right-0 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            Copied!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t('admin.passwordResetStep2')}</h4>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-sm relative">
                        <div className="flex justify-between items-start">
                          <code className="whitespace-pre-wrap break-all">
{`cd /opt/kuno

docker run -d \\
    --name kuno_recovery \\
    --restart unless-stopped \\
    -p 80:80 \\
    -v /opt/kuno/blog-data:/app/data \\
    -e NEXT_PUBLIC_API_URL="http://localhost/api" \\
    -e DB_PATH="/app/data/blog.db" \\
    -e RECOVERY_MODE="true" \\
    ictrun/kuno:latest`}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 flex-shrink-0"
                            onClick={() => copyToClipboard(`cd /opt/kuno

docker run -d \\
    --name kuno_recovery \\
    --restart unless-stopped \\
    -p 80:80 \\
    -v /opt/kuno/blog-data:/app/data \\
    -e NEXT_PUBLIC_API_URL="http://localhost/api" \\
    -e DB_PATH="/app/data/blog.db" \\
    -e RECOVERY_MODE="true" \\
    ictrun/kuno:latest`, 'step2')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {copySuccess === 'step2' && (
                          <span className="absolute -top-8 right-0 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            Copied!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t('admin.passwordResetStep3')}</h4>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-sm relative">
                        <div className="flex justify-between items-start">
                          <code className="whitespace-pre-wrap">
{`docker logs kuno_recovery

docker rm -f kuno_recovery`}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 flex-shrink-0"
                            onClick={() => copyToClipboard(`docker logs kuno_recovery

docker rm -f kuno_recovery`, 'step3')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {copySuccess === 'step3' && (
                          <span className="absolute -top-8 right-0 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            Copied!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t('admin.passwordResetStep4')}</h4>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-sm relative">
                        <div className="flex justify-between items-start">
                          <code className="whitespace-pre-wrap break-all">
{`docker run -d \\
    --name kuno \\
    --restart unless-stopped \\
    -p 80:80 \\
    -v /opt/kuno/blog-data:/app/data \\
    -e NEXT_PUBLIC_API_URL="http://localhost/api" \\
    -e DB_PATH="/app/data/blog.db" \\
    -e RECOVERY_MODE="false" \\
    ictrun/kuno:latest`}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 flex-shrink-0"
                            onClick={() => copyToClipboard(`docker run -d \\
    --name kuno \\
    --restart unless-stopped \\
    -p 80:80 \\
    -v /opt/kuno/blog-data:/app/data \\
    -e NEXT_PUBLIC_API_URL="http://localhost/api" \\
    -e DB_PATH="/app/data/blog.db" \\
    -e RECOVERY_MODE="false" \\
    ictrun/kuno:latest`, 'step4')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {copySuccess === 'step4' && (
                          <span className="absolute -top-8 right-0 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            Copied!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t('admin.passwordResetStep5')}</h4>
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200 dark:border-green-800">
                        <div className="text-sm font-mono">
                          <p><strong>Username:</strong> admin</p>
                          <p><strong>Password:</strong> xuemian168</p>
                        </div>
                      </div>
                    </div>

                    {/* Step 6 */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-red-600 dark:text-red-400">
                        {t('admin.passwordResetStep6')}
                      </h4>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}