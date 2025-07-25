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
import { Lock, User, Shield, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api'

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
  const { login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const checkRecoveryStatus = async () => {
      try {
        const status = await apiClient.getRecoveryStatus()
        setIsRecoveryMode(status.is_recovery_mode)
        setRecoveryMessage(status.message || '')
      } catch (error) {
        console.error('Failed to check recovery status:', error)
      } finally {
        setCheckingRecovery(false)
      }
    }

    checkRecoveryStatus()
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('admin.signingin') : t('admin.signin')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}