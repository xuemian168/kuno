'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Search, 
  Database, 
  TrendingUp, 
  Globe, 
  MessageSquare, 
  BarChart3, 
  Sparkles,
  CheckCircle,
  Code,
  BookOpen,
  Zap,
  Eye,
  ExternalLink
} from 'lucide-react'
import { useTranslations } from 'next-intl'

interface LLMsTxtIntroductionProps {
  className?: string
  locale: string
}

export function LLMsTxtIntroduction({ className = '', locale }: LLMsTxtIntroductionProps) {
  const t = useTranslations('ai')

  // Helper function to get examples array
  const getExamples = (path: string): string[] => {
    try {
      const examples = t.raw(`kunoLlms.results.${path}.examples`)
      if (Array.isArray(examples)) {
        return examples
      }
      // Fallback: try to get as regular translation
      const fallbackString = t(`kunoLlms.results.${path}.examples`)
      if (fallbackString && fallbackString !== `kunoLlms.results.${path}.examples`) {
        return [fallbackString]
      }
      return []
    } catch {
      return []
    }
  }

  // Helper function to get features array
  const getFeatures = (path: string): string[] => {
    try {
      const features = t.raw(`kunoLlms.${path}`)
      if (Array.isArray(features)) {
        return features
      }
      // Fallback: try to get as regular translation
      const fallbackString = t(`kunoLlms.${path}`)
      if (fallbackString && fallbackString !== `kunoLlms.${path}`) {
        return [fallbackString]
      }
      return []
    } catch {
      return []
    }
  }

  const kunoAchievements = [
    {
      title: t('kunoLlms.achievements.multiLanguageAI.title'),
      description: t('kunoLlms.achievements.multiLanguageAI.description'),
      icon: Search,
      color: 'bg-blue-500'
    },
    {
      title: t('kunoLlms.achievements.intelligentAnalysis.title'),
      description: t('kunoLlms.achievements.intelligentAnalysis.description'),
      icon: Database,
      color: 'bg-green-500'
    },
    {
      title: t('kunoLlms.achievements.performanceOptimized.title'),
      description: t('kunoLlms.achievements.performanceOptimized.description'),
      icon: FileText,
      color: 'bg-purple-500'
    },
    {
      title: t('kunoLlms.achievements.productionSuccess.title'),
      description: t('kunoLlms.achievements.productionSuccess.description'),
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ]

  const kunoResults = [
    {
      title: t('kunoLlms.results.aiSearchSuccess.title'),
      description: t('kunoLlms.results.aiSearchSuccess.description'),
      examples: getExamples('aiSearchSuccess'),
      icon: Search,
      color: 'bg-blue-500'
    },
    {
      title: t('kunoLlms.results.globalDiscovery.title'),
      description: t('kunoLlms.results.globalDiscovery.description'),
      examples: getExamples('globalDiscovery'),
      icon: Eye,
      color: 'bg-green-500'
    },
    {
      title: t('kunoLlms.results.seoBoost.title'),
      description: t('kunoLlms.results.seoBoost.description'),
      examples: getExamples('seoBoost'),
      icon: BarChart3,
      color: 'bg-purple-500'
    },
    {
      title: t('kunoLlms.results.brandAuthority.title'),
      description: t('kunoLlms.results.brandAuthority.description'),
      examples: getExamples('brandAuthority'),
      icon: Globe,
      color: 'bg-red-500'
    }
  ]

  const kunoWorkflow = [
    {
      title: t('kunoLlms.workflow.contentAnalysis.title'),
      description: t('kunoLlms.workflow.contentAnalysis.description'),
      details: t('kunoLlms.workflow.contentAnalysis.details'),
      icon: Database,
      color: 'bg-blue-500'
    },
    {
      title: t('kunoLlms.workflow.intelligentGeneration.title'),
      description: t('kunoLlms.workflow.intelligentGeneration.description'),
      details: t('kunoLlms.workflow.intelligentGeneration.details'),
      icon: Code,
      color: 'bg-green-500'
    },
    {
      title: t('kunoLlms.workflow.smartOptimization.title'),
      description: t('kunoLlms.workflow.smartOptimization.description'),
      details: t('kunoLlms.workflow.smartOptimization.details'),
      icon: Sparkles,
      color: 'bg-purple-500'
    },
    {
      title: t('kunoLlms.workflow.globalDistribution.title'),
      description: t('kunoLlms.workflow.globalDistribution.description'),
      details: t('kunoLlms.workflow.globalDistribution.details'),
      icon: Globe,
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Hero Section */}
      <Card className="border-none bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {t('kunoLlms.heroTitle')}
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                {t('kunoLlms.heroSubtitle')}
              </p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t('kunoLlms.heroDescription')}
          </p>
        </CardContent>
      </Card>

      {/* What is LLMs.txt */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">{t('kunoLlms.innovationTitle')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('kunoLlms.innovationDescription')}
          </p>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const features = getFeatures('innovationFeatures')
              return features.length > 0 ? features.map((feature: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              )) : (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Innovation features available</span>
                </div>
              )
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Key Benefits */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('kunoLlms.achievementsTitle')}</h2>
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
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {achievement.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Use Cases */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('kunoLlms.resultsTitle')}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {kunoResults.map((result, index) => {
            const IconComponent = result.icon
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${result.color} flex items-center justify-center`}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-lg">
                      {result.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {result.description}
                  </p>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Measured Results:
                    </h4>
                    {result.examples.length > 0 ? (
                      result.examples.map((example: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{example}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">Example results available</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('kunoLlms.workflowTitle')}</h2>
          </div>
        </div>

        {/* Process Flow */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {kunoWorkflow.map((step, index) => {
                const IconComponent = step.icon
                const isLast = index === kunoWorkflow.length - 1
                
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
                        <div className="w-6 h-0.5 bg-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* KUNO Implementation Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {kunoWorkflow.map((step, index) => {
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

      {/* LLMs.txt Specification */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Code className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('kunoLlms.excellenceTitle')}</h2>
            <p className="text-muted-foreground">{t('kunoLlms.excellenceSubtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Format */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">KUNO Performance Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const features = getFeatures('performanceFeatures')
                  return features.length > 0 ? features.map((item: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  )) : (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Performance features available</span>
                    </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Main Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">KUNO Content Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const features = getFeatures('contentIntelligence')
                  return features.length > 0 ? features.map((item: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  )) : (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Content intelligence features available</span>
                    </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Academic References */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Academic References</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Scholarly foundations supporting KUNO LLMs.txt implementation</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                    Howard, J., & Answer.AI Team. (2024). The /llms.txt file, helping language models use your website. <em>GitHub Repository</em>. Answer.AI.
                  </p>
                </div>
                <a 
                  href="https://github.com/AnswerDotAI/llms-txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  title="View repository"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                    Nottingham, M. (2024). Considerations for AI opt-out. <em>Personal Blog</em>. Retrieved from mnot.net.
                  </p>
                </div>
                <a 
                  href="https://www.mnot.net/blog/2024/04/21/ai-control"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  title="View blog post"
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