'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  Globe, 
  Settings, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Sparkles
} from 'lucide-react'
import { apiClient, SetupRequest } from '@/lib/api'
import { KunoLogo } from '@/components/kuno-logo'
import Image from 'next/image'

interface SetupPageProps {
  params: Promise<{ locale: string }>
}

interface FormData {
  siteTitle: string
  siteSubtitle: string
  defaultLanguage: string
  adminUsername: string
  adminPassword: string
  confirmPassword: string
}

interface FormErrors {
  siteTitle?: string
  siteSubtitle?: string
  adminUsername?: string
  adminPassword?: string
  confirmPassword?: string
  defaultLanguage?: string
}

interface PasswordStrength {
  strength: number
  level: string
  color: string
  crackTime: string
}

export default function SetupPage({ params }: SetupPageProps) {
  const t = useTranslations()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const totalSteps = 4

  const [formData, setFormData] = useState<FormData>({
    siteTitle: '',
    siteSubtitle: '',
    defaultLanguage: 'en',
    adminUsername: 'admin',
    adminPassword: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const status = await apiClient.getSetupStatus()
        if (status.setup_completed) {
          // Setup already completed, redirect to admin
          const { locale } = await params
          router.push(`/${locale}/admin`)
          return
        }
      } catch (error) {
        console.error('Failed to check setup status:', error)
      } finally {
        setCheckingStatus(false)
      }
    }

    checkSetupStatus()
  }, [params, router])

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) return { strength: 0, level: '', color: 'gray', crackTime: '' }
    
    let score = 0
    let charsetSize = 0
    
    if (/[a-z]/.test(password)) charsetSize += 26
    if (/[A-Z]/.test(password)) charsetSize += 26
    if (/[0-9]/.test(password)) charsetSize += 10
    if (/[^A-Za-z0-9]/.test(password)) charsetSize += 32
    
    const entropy = password.length * Math.log2(charsetSize)
    
    if (password.length >= 8) score += 25
    if (password.length >= 12) score += 25
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20
    if (/[0-9]/.test(password)) score += 15
    if (/[^A-Za-z0-9]/.test(password)) score += 15
    
    const crackTimeSeconds = Math.pow(charsetSize, password.length) / 2 / 1000000000
    
    let crackTime = ''
    if (crackTimeSeconds < 1) crackTime = 'Instantly'
    else if (crackTimeSeconds < 60) crackTime = '< 1 minute'
    else if (crackTimeSeconds < 3600) crackTime = `${Math.round(crackTimeSeconds / 60)} minutes`
    else if (crackTimeSeconds < 86400) crackTime = `${Math.round(crackTimeSeconds / 3600)} hours`
    else if (crackTimeSeconds < 31536000) crackTime = `${Math.round(crackTimeSeconds / 86400)} days`
    else crackTime = '> 1 year'
    
    let level = ''
    let color = ''
    if (score < 40) { level = t('setup.step3.passwordStrength.weak'); color = 'red' }
    else if (score < 60) { level = t('setup.step3.passwordStrength.fair'); color = 'orange' }
    else if (score < 80) { level = t('setup.step3.passwordStrength.good'); color = 'yellow' }
    else { level = t('setup.step3.passwordStrength.strong'); color = 'green' }
    
    return { strength: Math.min(score, 100), level, color, crackTime }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {}

    switch (step) {
      case 1:
        if (!formData.defaultLanguage) {
          newErrors.defaultLanguage = t('setup.validation.languageRequired')
        }
        break
      case 2:
        if (!formData.siteTitle.trim()) {
          newErrors.siteTitle = t('setup.validation.titleRequired')
        } else if (formData.siteTitle.length > 255) {
          newErrors.siteTitle = t('setup.validation.titleTooLong')
        }
        break
      case 3:
        if (!formData.adminUsername.trim()) {
          newErrors.adminUsername = t('setup.validation.usernameRequired')
        } else if (formData.adminUsername.length < 3) {
          newErrors.adminUsername = t('setup.validation.usernameTooShort')
        } else if (formData.adminUsername.length > 50) {
          newErrors.adminUsername = t('setup.validation.usernameTooLong')
        }

        if (!formData.adminPassword) {
          newErrors.adminPassword = t('setup.validation.passwordRequired')
        } else if (formData.adminPassword.length < 6) {
          newErrors.adminPassword = t('setup.validation.passwordTooShort')
        }

        if (formData.adminPassword !== formData.confirmPassword) {
          newErrors.confirmPassword = t('setup.validation.passwordMismatch')
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return

    setLoading(true)
    setSubmitError('')

    try {
      const setupData: SetupRequest = {
        site_title: formData.siteTitle,
        site_subtitle: formData.siteSubtitle,
        default_language: formData.defaultLanguage,
        admin_username: formData.adminUsername,
        admin_password: formData.adminPassword
      }

      await apiClient.initializeSetup(setupData)
      setCurrentStep(4)
    } catch (error: any) {
      console.error('Setup failed:', error)
      if (error.message?.includes('already been completed')) {
        setSubmitError(t('setup.errors.alreadyCompleted'))
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        setSubmitError(t('setup.errors.networkError'))
      } else {
        setSubmitError(t('setup.errors.setupFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const goToAdmin = async () => {
    const { locale } = await params
    router.push(`/${locale}/admin/login`)
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-6">
            <KunoLogo size="md" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-muted-foreground">Checking setup status...</p>
        </div>
      </div>
    )
  }

  const stepIcons = [Globe, Settings, Shield, CheckCircle]
  const StepIcon = stepIcons[currentStep - 1]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-2xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-[#ACB147] to-[#20B725] bg-clip-text text-transparent">
              {t('setup.title')}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              {t('setup.subtitle')}
            </CardDescription>
            
            {currentStep < 4 && (
              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t('setup.stepProgress', { current: currentStep, total: totalSteps })}</span>
                  <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
                </div>
                <Progress value={(currentStep / totalSteps) * 100} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-[#ACB147] [&>div]:to-[#20B725]" />
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Language Selection */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <Globe className="w-12 h-12 mx-auto text-green-500" />
                    <h3 className="text-xl font-semibold">{t('setup.step1.title')}</h3>
                    <p className="text-muted-foreground">{t('setup.step1.subtitle')}</p>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="language" className="text-base font-medium">
                      {t('setup.step1.selectLanguage')}
                    </Label>
                    <Select
                      value={formData.defaultLanguage}
                      onValueChange={(value) => handleInputChange('defaultLanguage', value)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder={t('setup.step1.selectLanguage')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh">{t('setup.step1.languages.zh')}</SelectItem>
                        <SelectItem value="en">{t('setup.step1.languages.en')}</SelectItem>
                        <SelectItem value="ja">{t('setup.step1.languages.ja')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.defaultLanguage && (
                      <p className="text-sm text-red-500">{errors.defaultLanguage}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {t('setup.step1.languageDescription')}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Site Configuration */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <Settings className="w-12 h-12 mx-auto text-green-500" />
                    <h3 className="text-xl font-semibold">{t('setup.step2.title')}</h3>
                    <p className="text-muted-foreground">{t('setup.step2.subtitle')}</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="siteTitle" className="text-base font-medium">
                        {t('setup.step2.siteTitle')} *
                      </Label>
                      <Input
                        id="siteTitle"
                        value={formData.siteTitle}
                        onChange={(e) => handleInputChange('siteTitle', e.target.value)}
                        placeholder={t('setup.step2.siteTitlePlaceholder')}
                        className="h-12"
                      />
                      {errors.siteTitle && (
                        <p className="text-sm text-red-500">{errors.siteTitle}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {t('setup.step2.siteTitleDescription')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="siteSubtitle" className="text-base font-medium">
                        {t('setup.step2.siteSubtitle')}
                      </Label>
                      <Input
                        id="siteSubtitle"
                        value={formData.siteSubtitle}
                        onChange={(e) => handleInputChange('siteSubtitle', e.target.value)}
                        placeholder={t('setup.step2.siteSubtitlePlaceholder')}
                        className="h-12"
                      />
                      <p className="text-sm text-muted-foreground">
                        {t('setup.step2.siteSubtitleDescription')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Admin Account */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <Shield className="w-12 h-12 mx-auto text-green-500" />
                    <h3 className="text-xl font-semibold">{t('setup.step3.title')}</h3>
                    <p className="text-muted-foreground">{t('setup.step3.subtitle')}</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="adminUsername" className="text-base font-medium">
                        {t('setup.step3.adminUsername')} *
                      </Label>
                      <Input
                        id="adminUsername"
                        value={formData.adminUsername}
                        onChange={(e) => handleInputChange('adminUsername', e.target.value)}
                        placeholder={t('setup.step3.adminUsernamePlaceholder')}
                        className="h-12"
                      />
                      {errors.adminUsername && (
                        <p className="text-sm text-red-500">{errors.adminUsername}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {t('setup.step3.adminUsernameDescription')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminPassword" className="text-base font-medium">
                        {t('setup.step3.adminPassword')} *
                      </Label>
                      <div className="relative">
                        <Input
                          id="adminPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.adminPassword}
                          onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                          placeholder={t('setup.step3.adminPasswordPlaceholder')}
                          className="h-12 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.adminPassword && (
                        <p className="text-sm text-red-500">{errors.adminPassword}</p>
                      )}
                      
                      {formData.adminPassword && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Password strength:</span>
                            <Badge 
                              variant="outline" 
                              className={`text-${calculatePasswordStrength(formData.adminPassword).color}-600 border-${calculatePasswordStrength(formData.adminPassword).color}-300`}
                            >
                              {calculatePasswordStrength(formData.adminPassword).level}
                            </Badge>
                          </div>
                          <Progress 
                            value={calculatePasswordStrength(formData.adminPassword).strength} 
                            className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-[#ACB147] [&>div]:to-[#20B725]"
                          />
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground">
                        {t('setup.step3.adminPasswordDescription')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-base font-medium">
                        {t('setup.step3.confirmPassword')} *
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          placeholder={t('setup.step3.confirmPasswordPlaceholder')}
                          className="h-12 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                      )}
                    </div>

                    {submitError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{submitError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Completion */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6 text-center"
                >
                  <div className="space-y-4">
                    <div className="relative flex justify-center">
                      <div className="relative">
                        <div className="p-4 bg-gradient-to-r from-[#ACB147] to-[#20B725] rounded-3xl shadow-xl">
                          <KunoLogo size="lg" variant="white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-[#20B725] rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute inset-0 border-4 border-[#ACB147]/30 rounded-3xl animate-ping"></div>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-[#20B725]">{t('setup.step4.title')}</h3>
                    <p className="text-lg text-muted-foreground">{t('setup.step4.subtitle')}</p>
                    <p className="text-muted-foreground">{t('setup.step4.successMessage')}</p>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 space-y-4">
                    <h4 className="font-semibold text-lg">{t('setup.step4.nextSteps')}</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {(t.raw('setup.step4.features') as string[]).map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    onClick={goToAdmin}
                    size="lg"
                    className="w-full h-12 text-lg bg-gradient-to-r from-[#ACB147] to-[#20B725] hover:from-[#98a03d] hover:to-[#1ca61f]"
                  >
                    {t('setup.step4.loginButton')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            {currentStep < 4 && (
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center space-x-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>{t('setup.back')}</span>
                </Button>

                <Button
                  onClick={currentStep === 3 ? handleSubmit : nextStep}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-gradient-to-r from-[#ACB147] to-[#20B725] hover:from-[#98a03d] hover:to-[#1ca61f]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('setup.completing')}</span>
                    </>
                  ) : (
                    <>
                      <span>{currentStep === 3 ? t('setup.finish') : t('setup.next')}</span>
                      {currentStep < 3 && <ChevronRight className="h-4 w-4" />}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}