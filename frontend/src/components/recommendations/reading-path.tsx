'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, MapPin, Clock, BookOpen, ArrowRight, Star } from 'lucide-react'
import { apiClient, ReadingPath } from '@/lib/api'

interface ReadingPathProps {
  language?: string
  userId?: string
  className?: string
}

const ReadingPathComponent: React.FC<ReadingPathProps> = ({
  language = 'zh',
  userId,
  className = ''
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [readingPath, setReadingPath] = useState<ReadingPath | null>(null)
  const [noArticlesFound, setNoArticlesFound] = useState(false)

  const generateReadingPath = async () => {
    if (!topic.trim()) return

    try {
      setLoading(true)
      setError(null)
      setNoArticlesFound(false)
      setReadingPath(null)

      const sessionUserId = userId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      
      const response = await apiClient.generateReadingPath({
        user_id: sessionUserId,
        topic: topic.trim(),
        language
      })
      
      setReadingPath(response.reading_path)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成阅读路径失败'
      
      // Check if the error is about no articles found
      if (errorMessage.includes('no articles found') || errorMessage.includes('Failed to generate reading path')) {
        setNoArticlesFound(true)
        setError(null)
      } else {
        setError(errorMessage)
        setNoArticlesFound(false)
      }
      
      console.error('Failed to generate reading path:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    const labels = {
      zh: {
        beginner: '初级',
        intermediate: '中级',
        advanced: '高级',
        unknown: '未知'
      },
      en: {
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
        unknown: 'Unknown'
      }
    }
    const langLabels = labels[language as keyof typeof labels] || labels.zh
    return langLabels[difficulty as keyof typeof langLabels] || langLabels.unknown
  }

  const getTexts = () => {
    const texts = {
      zh: {
        title: '智能学习路径',
        placeholder: '输入想学习的主题（如：React, 机器学习, 前端开发）',
        generate: '生成',
        articles: '篇文章',
        about: '约',
        progress: '学习进度',
        tips: '学习建议',
        tipsList: [
          '建议按照推荐顺序逐步学习，确保知识的连贯性',
          '每篇文章学习后可以做适当的练习和总结',
          '遇到难点可以重复阅读或查找相关资料',
          '完成整个学习路径后可以尝试实际项目应用'
        ],
        emptyState: '输入感兴趣的主题，我将为您生成个性化的学习路径',
        emptySubtext: '基于您的阅读偏好和文章关联性智能推荐',
        noArticlesTitle: '暂无相关文章',
        noArticlesDescription: '抱歉，我们暂时没有找到关于这个主题的相关文章。',
        noArticlesSuggestions: '建议您：',
        noArticlesTips: [
          '尝试使用更具体或更常见的关键词',
          '检查拼写是否正确',
          '尝试使用相关的技术术语或概念',
          '可以先浏览现有文章分类寻找感兴趣的内容'
        ],
        minutes: '分钟',
        hours: '小时',
        learningPoints: '学习要点：',
        tryOtherTopics: '尝试其他主题'
      },
      en: {
        title: 'Smart Learning Path',
        placeholder: 'Enter a topic to learn (e.g., React, Machine Learning, Frontend Development)',
        generate: 'Generate',
        articles: 'articles',
        about: 'About',
        progress: 'Learning Progress',
        tips: 'Learning Tips',
        tipsList: [
          'Follow the recommended order for knowledge continuity',
          'Practice and summarize after each article',
          'Re-read or research when encountering difficulties',
          'Apply knowledge in real projects after completion'
        ],
        emptyState: 'Enter a topic of interest, and I\'ll generate a personalized learning path',
        emptySubtext: 'Smart recommendations based on your reading preferences and article relationships',
        noArticlesTitle: 'No Related Articles Found',
        noArticlesDescription: 'Sorry, we couldn\'t find any articles related to this topic.',
        noArticlesSuggestions: 'We suggest you:',
        noArticlesTips: [
          'Try more specific or common keywords',
          'Check spelling accuracy',
          'Use technical terms or concepts',
          'Browse existing categories to find interesting content'
        ],
        minutes: 'min',
        hours: 'hr',
        learningPoints: 'Key Points: ',
        tryOtherTopics: 'Try Other Topics'
      }
    }
    return texts[language as keyof typeof texts] || texts.zh
  }

  const formatTime = (totalMinutes: number) => {
    const texts = getTexts()
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) {
      return `${hours}${texts.hours}${minutes > 0 ? ` ${minutes}${texts.minutes}` : ''}`
    }
    return `${minutes}${texts.minutes}`
  }

  const trackArticleClick = async (articleId: number) => {
    try {
      const sessionUserId = userId || localStorage.getItem('session_user_id') || `session_${Date.now()}`
      
      await apiClient.trackUserBehavior({
        session_id: sessionUserId,
        article_id: articleId,
        interaction_type: 'view',
        language
      })
    } catch (err) {
      console.error('Failed to track click:', err)
    }
  }

  const texts = getTexts()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {texts.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={texts.placeholder}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                generateReadingPath()
              }
            }}
          />
          <Button 
            onClick={generateReadingPath}
            disabled={!topic.trim() || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {texts.generate}
          </Button>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        {noArticlesFound && (
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <BookOpen className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 mb-2">{texts.noArticlesTitle}</h3>
                <p className="text-yellow-700 text-sm mb-3">{texts.noArticlesDescription}</p>
                <p className="text-yellow-700 text-sm font-medium mb-2">{texts.noArticlesSuggestions}</p>
                <ul className="text-yellow-700 text-sm space-y-1">
                  {texts.noArticlesTips.map((tip, index) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setNoArticlesFound(false)
                      setTopic('')
                    }}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    {texts.tryOtherTopics}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {readingPath && (
          <div className="space-y-4">
            {/* 路径信息 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{readingPath.title}</h3>
                <Badge className={getDifficultyColor(readingPath.difficulty)}>
                  {getDifficultyLabel(readingPath.difficulty)}
                </Badge>
              </div>
              <p className="text-gray-600 text-sm mb-3">
                {readingPath.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {readingPath.articles.length} {texts.articles}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {texts.about} {formatTime(Math.round(readingPath.total_time / 60))}
                </span>
              </div>
              
              {/* 进度条 */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{texts.progress}</span>
                  <span>{Math.round(readingPath.progress * 100)}%</span>
                </div>
                <Progress value={readingPath.progress * 100} className="h-2" />
              </div>
            </div>

            {/* 文章列表 */}
            <div className="space-y-3">
              {readingPath.articles.map((recommendation, index) => (
                <div
                  key={recommendation.article.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer relative"
                  onClick={() => {
                    trackArticleClick(recommendation.article.id)
                    window.location.href = `/${language}/article/${recommendation.article.id}`
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* 步骤编号 */}
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold hover:text-blue-600 transition-colors">
                          {recommendation.article.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            {Math.round(recommendation.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {recommendation.article.summary}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <span>{recommendation.article.category.name}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {texts.about} {Math.round(recommendation.article.content.split(/\s+/).length / 200)} {texts.minutes}
                          </span>
                        </div>
                        
                        {index < readingPath.articles.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      
                      {recommendation.reason_details && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
                          <strong>{texts.learningPoints}</strong>{recommendation.reason_details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 学习建议 */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">{texts.tips}</h4>
              <ul className="text-sm text-green-700 space-y-1">
                {texts.tipsList.map((tip, index) => (
                  <li key={index}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!readingPath && !loading && !noArticlesFound && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{texts.emptyState}</p>
            <p className="text-xs mt-1">{texts.emptySubtext}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ReadingPathComponent