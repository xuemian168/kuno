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
  TrendingUp,
  ExternalLink
} from 'lucide-react'
import { useClientLocale } from '@/hooks/useClientLocale'
import { useTranslations } from 'next-intl'

interface RAGIntroductionProps {
  className?: string
}

export function RAGIntroduction({ className = '' }: RAGIntroductionProps) {
  const { currentLocale } = useClientLocale()
  const t = useTranslations('embedding')

  // Helper function to get features array
  const getFeatures = (path: string): string[] => {
    try {
      const features = t.raw(`kunoRag.achievements.${path}.features`)
      if (Array.isArray(features)) {
        return features
      }
      // Fallback: try to get as regular translation and split if needed
      const fallbackString = t(`kunoRag.achievements.${path}.features`)
      if (fallbackString && fallbackString !== `kunoRag.achievements.${path}.features`) {
        return [fallbackString]
      }
      return []
    } catch {
      return []
    }
  }

  const kunoAchievements = [
    {
      title: t('kunoRag.achievements.multilingualSearch.title'),
      description: t('kunoRag.achievements.multilingualSearch.description'),
      features: getFeatures('multilingualSearch'),
      icon: Globe,
      color: 'bg-blue-500'
    },
    {
      title: t('kunoRag.achievements.contentDiscovery.title'),
      description: t('kunoRag.achievements.contentDiscovery.description'),
      features: getFeatures('contentDiscovery'),
      icon: Search,
      color: 'bg-green-500'
    },
    {
      title: t('kunoRag.achievements.userExperience.title'),
      description: t('kunoRag.achievements.userExperience.description'),
      features: getFeatures('userExperience'),
      icon: MessageSquare,
      color: 'bg-purple-500'
    },
    {
      title: t('kunoRag.achievements.performance.title'),
      description: t('kunoRag.achievements.performance.description'),
      features: getFeatures('performance'),
      icon: Zap,
      color: 'bg-orange-500'
    },
    {
      title: t('kunoRag.achievements.openSource.title'),
      description: t('kunoRag.achievements.openSource.description'),
      features: getFeatures('openSource'),
      icon: Users,
      color: 'bg-pink-500'
    }
  ]

  const kunoImplementation = [
    {
      title: t('kunoRag.implementation.contentEmbedding.title'),
      description: t('kunoRag.implementation.contentEmbedding.description'),
      details: t('kunoRag.implementation.contentEmbedding.details'),
      icon: Database,
      color: 'bg-blue-500'
    },
    {
      title: t('kunoRag.implementation.queryProcessing.title'),
      description: t('kunoRag.implementation.queryProcessing.description'),
      details: t('kunoRag.implementation.queryProcessing.details'),
      icon: Brain,
      color: 'bg-green-500'
    },
    {
      title: t('kunoRag.implementation.intelligentRetrieval.title'),
      description: t('kunoRag.implementation.intelligentRetrieval.description'),
      details: t('kunoRag.implementation.intelligentRetrieval.details'),
      icon: Search,
      color: 'bg-purple-500'
    },
    {
      title: t('kunoRag.implementation.contextualEnhancement.title'),
      description: t('kunoRag.implementation.contextualEnhancement.description'),
      details: t('kunoRag.implementation.contextualEnhancement.details'),
      icon: Sparkles,
      color: 'bg-orange-500'
    },
    {
      title: t('kunoRag.implementation.continuousLearning.title'),
      description: t('kunoRag.implementation.continuousLearning.description'),
      details: t('kunoRag.implementation.continuousLearning.details'),
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
                {t('kunoRag.heroTitle')}
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                {t('kunoRag.heroSubtitle')}
              </p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t('kunoRag.heroDescription')}
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
            <h2 className="text-2xl font-bold">{t('kunoRag.achievementsTitle')}</h2>
            <p className="text-muted-foreground">{t('kunoRag.achievementsSubtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {kunoAchievements.map((achievement, index) => {
            const IconComponent = achievement.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${achievement.color} flex items-center justify-center`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">
                      {achievement.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {achievement.description}
                  </p>
                  <Separator />
                  <div className="space-y-2">
                    {achievement.features.length > 0 ? (
                      achievement.features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">Feature details available</span>
                      </div>
                    )}
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
            <h2 className="text-2xl font-bold">{t('kunoRag.implementationTitle')}</h2>
            <p className="text-muted-foreground">{t('kunoRag.implementationSubtitle')}</p>
          </div>
        </div>

        {/* Process Flow */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {kunoImplementation.map((step, index) => {
                const IconComponent = step.icon
                const isLast = index === kunoImplementation.length - 1
                
                return (
                  <div key={index} className="flex items-center">
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
                            {step.title}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {step.description}
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

        {/* Detailed Implementation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {kunoImplementation.map((step, index) => {
            const IconComponent = step.icon
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${step.color} flex items-center justify-center`}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-base">
                      {step.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.details}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* KUNO Success Story */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-xl">{t('kunoRag.innovationTitle')}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{t('kunoRag.innovationSubtitle')}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              try {
                const innovationItems = t.raw('kunoRag.innovationItems')
                let items: string[] = []
                
                if (Array.isArray(innovationItems)) {
                  items = innovationItems
                } else {
                  // Fallback: try to get as regular translation
                  const fallbackString = t('kunoRag.innovationItems')
                  if (fallbackString && fallbackString !== 'kunoRag.innovationItems') {
                    items = [fallbackString]
                  }
                }
                
                return items.map((achievement: string, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium">{achievement}</span>
                  </div>
                ))
              } catch {
                return null
              }
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Academic References */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Academic References</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Scholarly foundations supporting KUNO technical innovations</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                    Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W. T., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive nlp tasks. <em>Advances in Neural Information Processing Systems</em>, 33, 9459-9474.
                  </p>
                </div>
                <a 
                  href="https://arxiv.org/abs/2005.11401"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  title="View paper"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                    Gao, Y., Xiong, Y., Gao, X., Jia, K., Pan, J., Bi, Y., Dai, Y., Sun, J., Wang, M., & Wang, H. (2024). Retrieval-augmented generation for large language models: A survey. <em>arXiv preprint arXiv:2312.10997</em>.
                  </p>
                </div>
                <a 
                  href="https://arxiv.org/abs/2312.10997"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  title="View paper"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}