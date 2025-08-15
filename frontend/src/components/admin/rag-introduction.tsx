'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Globe, 
  Search, 
  MessageSquare, 
  FileText, 
  Users, 
  ArrowRight,
  CheckCircle,
  Zap,
  Target,
  Database,
  Brain,
  Sparkles,
  BookOpen,
  TrendingUp
} from 'lucide-react'
import { useClientLocale } from '@/hooks/useClientLocale'
import { useTranslations } from 'next-intl'

interface RAGIntroductionProps {
  className?: string
}

export function RAGIntroduction({ className = '' }: RAGIntroductionProps) {
  const { currentLocale } = useClientLocale()
  const t = useTranslations('embedding')

  const applications = [
    {
      key: 'websiteAI',
      icon: Globe,
      color: 'bg-blue-500'
    },
    {
      key: 'smartSearch',
      icon: Search,
      color: 'bg-green-500'
    },
    {
      key: 'aiQA',
      icon: MessageSquare,
      color: 'bg-purple-500'
    },
    {
      key: 'contentManagement',
      icon: FileText,
      color: 'bg-orange-500'
    },
    {
      key: 'userExperience',
      icon: Users,
      color: 'bg-pink-500'
    }
  ]

  const workingSteps = [
    {
      key: 'step1',
      icon: Database,
      color: 'bg-blue-500'
    },
    {
      key: 'step2',
      icon: Brain,
      color: 'bg-green-500'
    },
    {
      key: 'step3',
      icon: Search,
      color: 'bg-purple-500'
    },
    {
      key: 'step4',
      icon: Sparkles,
      color: 'bg-orange-500'
    },
    {
      key: 'step5',
      icon: Target,
      color: 'bg-red-500'
    }
  ]

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Hero Section */}
      <Card className="border-none bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                RAG
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Retrieval-Augmented Generation
              </p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t('workingPrinciples.overview')}
          </p>
        </CardContent>
      </Card>

      {/* Industry Applications */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('industryApplications.title')}</h2>
            <p className="text-muted-foreground">{t('industryApplications.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {applications.map((app) => {
            const IconComponent = app.icon
            return (
              <Card key={app.key} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${app.color} flex items-center justify-center`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">
                      {t(`industryApplications.${app.key}.title`)}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t(`industryApplications.${app.key}.description`)}
                  </p>
                  <Separator />
                  <div className="space-y-2">
                    {t.raw(`industryApplications.${app.key}.features`).map((feature: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Working Principles */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('workingPrinciples.title')}</h2>
            <p className="text-muted-foreground">{t('workingPrinciples.subtitle')}</p>
          </div>
        </div>

        {/* Process Flow */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {workingSteps.map((step, index) => {
                const IconComponent = step.icon
                const isLast = index === workingSteps.length - 1
                
                return (
                  <div key={step.key} className="flex items-center">
                    <div className="flex-1">
                      <Card className="border-2 hover:border-primary/50 transition-colors">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-8 h-8 rounded-full ${step.color} flex items-center justify-center`}>
                              <IconComponent className="h-4 w-4 text-white" />
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-sm mb-2">
                            {t(`workingPrinciples.${step.key}.title`)}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {t(`workingPrinciples.${step.key}.description`)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    {!isLast && (
                      <div className="hidden lg:flex items-center justify-center w-8">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workingSteps.map((step, index) => {
            const IconComponent = step.icon
            return (
              <Card key={step.key} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${step.color} flex items-center justify-center`}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-base">
                      {t(`workingPrinciples.${step.key}.title`)}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`workingPrinciples.${step.key}.details`)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Technology Advantages */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">{t('workingPrinciples.advantages.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {t.raw('workingPrinciples.advantages.items').map((advantage: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{advantage}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}