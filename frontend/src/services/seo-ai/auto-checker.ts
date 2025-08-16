import { SEOAnalyzer } from './analyzer'
import { seoAIService } from './index'
import { 
  SEOAnalysisResult, 
  SEOContent,
  SEOSuggestion,
  AutoSEOCheckConfig,
  AutoSEOCheckResult,
  SEOIssue,
  SEOCheckSchedule
} from './types'

export interface AutoSEOCheckOptions {
  articles?: string[]
  checkTypes?: ('content' | 'technical' | 'keywords' | 'performance')[]
  schedule?: SEOCheckSchedule
  notifications?: {
    email?: boolean
    dashboard?: boolean
    webhook?: string
  }
  thresholds?: {
    min_score?: number
    max_issues?: number
    performance_threshold?: number
  }
}

export interface SEOHealthReport {
  overall_health: 'excellent' | 'good' | 'fair' | 'poor'
  overall_score: number
  total_articles: number
  articles_checked: number
  issues_found: number
  critical_issues: number
  recommendations: SEOSuggestion[]
  check_timestamp: string
  check_duration: number
  articles_summary: {
    excellent: number  // 90+
    good: number       // 70-89
    fair: number       // 50-69
    poor: number       // <50
  }
  top_issues: SEOIssue[]
  improved_articles: string[]
  declined_articles: string[]
}

export class AutoSEOChecker {
  private checkHistory: AutoSEOCheckResult[] = []
  private scheduleTimers: Map<string, NodeJS.Timeout> = new Map()
  private isRunning = false
  
  /**
   * Run automated SEO check
   */
  async runAutoCheck(options: AutoSEOCheckOptions = {}): Promise<SEOHealthReport> {
    if (this.isRunning) {
      throw new Error('SEO check is already running')
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      const {
        articles = [],
        checkTypes = ['content', 'technical', 'keywords', 'performance'],
        thresholds = {
          min_score: 60,
          max_issues: 10,
          performance_threshold: 80
        }
      } = options

      console.log('Starting automated SEO check...')
      
      // Get articles to check (from API in real implementation)
      const articlesToCheck = articles.length > 0 ? articles : await this.getAllArticles()
      
      const results: SEOHealthReport = {
        overall_health: 'good',
        overall_score: 0,
        total_articles: articlesToCheck.length,
        articles_checked: 0,
        issues_found: 0,
        critical_issues: 0,
        recommendations: [],
        check_timestamp: new Date().toISOString(),
        check_duration: 0,
        articles_summary: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        },
        top_issues: [],
        improved_articles: [],
        declined_articles: []
      }

      const allIssues: SEOIssue[] = []
      const allSuggestions: SEOSuggestion[] = []
      let totalScore = 0

      // Check each article
      for (const articleId of articlesToCheck) {
        try {
          const article = await this.getArticle(articleId)
          if (!article) continue

          const analysis = await this.checkArticleSEO(article, checkTypes)
          
          // Track score distribution
          if (analysis.overall_score >= 90) results.articles_summary.excellent++
          else if (analysis.overall_score >= 70) results.articles_summary.good++
          else if (analysis.overall_score >= 50) results.articles_summary.fair++
          else results.articles_summary.poor++

          totalScore += analysis.overall_score
          results.articles_checked++

          // Collect issues and suggestions
          const issues = this.extractIssuesFromAnalysis(analysis, articleId)
          allIssues.push(...issues)
          allSuggestions.push(...analysis.suggestions)

          // Count critical issues
          results.critical_issues += issues.filter(i => i.priority === 'high').length

          console.log(`Checked article ${articleId}: Score ${analysis.overall_score}`)

        } catch (error) {
          console.error(`Failed to check article ${articleId}:`, error)
        }
      }

      // Calculate overall metrics
      results.overall_score = results.articles_checked > 0 ? 
        Math.round(totalScore / results.articles_checked) : 0
      results.issues_found = allIssues.length
      results.check_duration = Date.now() - startTime

      // Determine overall health
      results.overall_health = this.calculateOverallHealth(results.overall_score, results.critical_issues)

      // Get top issues (most frequent)
      results.top_issues = this.getTopIssues(allIssues, 10)

      // Generate recommendations
      results.recommendations = this.generateRecommendations(results, allSuggestions)

      // Compare with previous results to find improvements/declines
      const previousCheck = this.getPreviousCheck()
      if (previousCheck) {
        results.improved_articles = this.findImprovedArticles(previousCheck)
        results.declined_articles = this.findDeclinedArticles(previousCheck)
      }

      // Store results
      this.storeCheckResult({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        config: options,
        report: results,
        success: true
      })

      console.log(`SEO check completed: ${results.overall_score}/100 overall score`)
      
      return results

    } catch (error) {
      this.storeCheckResult({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        config: options,
        report: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Schedule automated SEO checks
   */
  scheduleChecks(schedule: SEOCheckSchedule, options: AutoSEOCheckOptions = {}): string {
    const scheduleId = Date.now().toString()
    
    let interval: number
    switch (schedule.frequency) {
      case 'daily':
        interval = 24 * 60 * 60 * 1000
        break
      case 'weekly':
        interval = 7 * 24 * 60 * 60 * 1000
        break
      case 'monthly':
        interval = 30 * 24 * 60 * 60 * 1000
        break
      default:
        throw new Error(`Unsupported schedule frequency: ${schedule.frequency}`)
    }

    const timer = setInterval(async () => {
      try {
        if (schedule.enabled) {
          console.log(`Running scheduled SEO check (${schedule.frequency})`)
          const report = await this.runAutoCheck(options)
          
          // Send notifications if configured
          if (options.notifications) {
            await this.sendNotifications(report, options.notifications)
          }
        }
      } catch (error) {
        console.error('Scheduled SEO check failed:', error)
      }
    }, interval)

    this.scheduleTimers.set(scheduleId, timer)
    console.log(`SEO check scheduled: ${schedule.frequency} (ID: ${scheduleId})`)
    
    return scheduleId
  }

  /**
   * Cancel scheduled check
   */
  cancelSchedule(scheduleId: string): boolean {
    const timer = this.scheduleTimers.get(scheduleId)
    if (timer) {
      clearInterval(timer)
      this.scheduleTimers.delete(scheduleId)
      console.log(`Cancelled scheduled SEO check: ${scheduleId}`)
      return true
    }
    return false
  }

  /**
   * Get check history
   */
  getCheckHistory(limit: number = 10): AutoSEOCheckResult[] {
    return this.checkHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Check single article SEO
   */
  private async checkArticleSEO(
    article: SEOContent, 
    checkTypes: string[]
  ): Promise<SEOAnalysisResult> {
    
    // Use the existing SEO analyzer
    const analysis = SEOAnalyzer.analyzeSEOContent(article, 'zh')

    // Add additional checks based on checkTypes
    if (checkTypes.includes('technical')) {
      // Add technical SEO checks (meta tags, schema, etc.)
      analysis.suggestions.push(...await this.performTechnicalChecks(article))
    }

    if (checkTypes.includes('performance')) {
      // Add performance checks (loading speed, mobile-friendliness, etc.)
      analysis.suggestions.push(...await this.performPerformanceChecks(article))
    }

    return analysis
  }

  /**
   * Perform technical SEO checks
   */
  private async performTechnicalChecks(article: SEOContent): Promise<SEOSuggestion[]> {
    const suggestions: SEOSuggestion[] = []

    // Check for missing meta tags
    if (!article.meta_title || article.meta_title.length === 0) {
      suggestions.push({
        type: 'technical',
        priority: 'high',
        message: '缺少SEO标题',
        suggestion: '添加优化的SEO标题以提高搜索可见性',
        impact: '显著提升搜索排名'
      })
    }

    if (!article.meta_description || article.meta_description.length === 0) {
      suggestions.push({
        type: 'technical',
        priority: 'high',
        message: '缺少元描述',
        suggestion: '添加吸引人的元描述来提高点击率',
        impact: '提升搜索结果点击率'
      })
    }

    // Check for duplicate content (simplified)
    if (article.content.length < 300) {
      suggestions.push({
        type: 'content',
        priority: 'medium',
        message: '内容过短',
        suggestion: '扩展内容至少300字以提供更多价值',
        impact: '提高内容质量和SEO表现'
      })
    }

    // Check for proper heading structure
    const h1Count = (article.content.match(/^#\s/gm) || []).length
    if (h1Count === 0) {
      suggestions.push({
        type: 'content',
        priority: 'medium',
        message: '缺少H1标题',
        suggestion: '添加主要的H1标题来改善内容结构',
        impact: '提升SEO和可读性'
      })
    }

    return suggestions
  }

  /**
   * Perform performance checks
   */
  private async performPerformanceChecks(article: SEOContent): Promise<SEOSuggestion[]> {
    const suggestions: SEOSuggestion[] = []

    // Check for image optimization
    const images = article.content.match(/!\[([^\]]*)\]\([^)]+\)/g) || []
    const imagesWithoutAlt = images.filter(img => {
      const altMatch = img.match(/!\[([^\]]*)\]/)
      return !altMatch || altMatch[1].trim().length === 0
    })

    if (imagesWithoutAlt.length > 0) {
      suggestions.push({
        type: 'performance',
        priority: 'medium',
        message: '图片缺少Alt文本',
        suggestion: `为${imagesWithoutAlt.length}个图片添加描述性Alt文本`,
        impact: '提升可访问性和图片SEO'
      })
    }

    // Check for internal linking
    const internalLinks = (article.content.match(/\[([^\]]+)\]\((?!http)[^)]+\)/g) || []).length
    if (internalLinks === 0) {
      suggestions.push({
        type: 'content',
        priority: 'low',
        message: '缺少内部链接',
        suggestion: '添加相关内部链接以改善网站结构',
        impact: '提升用户体验和SEO权重分布'
      })
    }

    return suggestions
  }

  /**
   * Extract issues from analysis result
   */
  private extractIssuesFromAnalysis(analysis: SEOAnalysisResult, articleId: string): SEOIssue[] {
    const issues: SEOIssue[] = []

    // Convert analysis issues to SEOIssue format
    if (analysis.title_analysis.issues.length > 0) {
      issues.push({
        id: `title-${articleId}`,
        type: 'title',
        severity: analysis.title_analysis.score < 50 ? 'critical' : 'warning',
        message: analysis.title_analysis.issues.join('; '),
        article_id: articleId,
        priority: analysis.title_analysis.score < 50 ? 'high' : 'medium',
        detected_at: new Date().toISOString(),
        status: 'open'
      })
    }

    if (analysis.description_analysis.issues.length > 0) {
      issues.push({
        id: `description-${articleId}`,
        type: 'description',
        severity: analysis.description_analysis.score < 50 ? 'critical' : 'warning',
        message: analysis.description_analysis.issues.join('; '),
        article_id: articleId,
        priority: analysis.description_analysis.score < 50 ? 'high' : 'medium',
        detected_at: new Date().toISOString(),
        status: 'open'
      })
    }

    if (analysis.content_analysis.issues.length > 0) {
      issues.push({
        id: `content-${articleId}`,
        type: 'content',
        severity: analysis.content_analysis.score < 50 ? 'critical' : 'warning',
        message: analysis.content_analysis.issues.join('; '),
        article_id: articleId,
        priority: analysis.content_analysis.score < 50 ? 'high' : 'medium',
        detected_at: new Date().toISOString(),
        status: 'open'
      })
    }

    return issues
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallHealth(score: number, criticalIssues: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90 && criticalIssues === 0) return 'excellent'
    if (score >= 70 && criticalIssues <= 5) return 'good'
    if (score >= 50 && criticalIssues <= 15) return 'fair'
    return 'poor'
  }

  /**
   * Get most frequent issues
   */
  private getTopIssues(issues: SEOIssue[], limit: number): SEOIssue[] {
    const issueGroups = new Map<string, SEOIssue[]>()
    
    issues.forEach(issue => {
      const key = `${issue.type}-${issue.message}`
      if (!issueGroups.has(key)) {
        issueGroups.set(key, [])
      }
      issueGroups.get(key)!.push(issue)
    })

    return Array.from(issueGroups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, limit)
      .map(([key, issues]) => ({
        ...issues[0],
        message: `${issues[0].message} (影响${issues.length}篇文章)`
      }))
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(report: SEOHealthReport, suggestions: SEOSuggestion[]): SEOSuggestion[] {
    const recommendations: SEOSuggestion[] = []

    // High-priority recommendations based on overall health
    if (report.overall_score < 60) {
      recommendations.push({
        type: 'overall',
        priority: 'high',
        message: 'SEO整体表现需要改进',
        suggestion: `网站SEO得分${report.overall_score}/100，建议优先解决${report.critical_issues}个关键问题`,
        impact: '显著提升整体SEO表现'
      })
    }

    if (report.articles_summary.poor > report.total_articles * 0.3) {
      recommendations.push({
        type: 'content',
        priority: 'high',
        message: '低质量内容过多',
        suggestion: `${report.articles_summary.poor}篇文章SEO得分低于50分，建议批量优化`,
        impact: '大幅提升网站整体SEO质量'
      })
    }

    // Add top suggestions from analysis
    const topSuggestions = suggestions
      .filter(s => s.priority === 'high')
      .slice(0, 5)
    
    recommendations.push(...topSuggestions)

    return recommendations.slice(0, 10) // Limit to top 10
  }

  /**
   * Send notifications about SEO check results
   */
  private async sendNotifications(
    report: SEOHealthReport, 
    notifications: AutoSEOCheckOptions['notifications']
  ): Promise<void> {
    try {
      if (notifications?.email) {
        await this.sendEmailNotification(report)
      }

      if (notifications?.webhook) {
        await this.sendWebhookNotification(report, notifications.webhook)
      }

      if (notifications?.dashboard) {
        // Update dashboard notifications (would integrate with notification system)
        console.log('Dashboard notification sent for SEO check results')
      }
    } catch (error) {
      console.error('Failed to send SEO check notifications:', error)
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(report: SEOHealthReport): Promise<void> {
    // In real implementation, this would use an email service
    console.log('Email notification:', {
      subject: `SEO Health Report - ${report.overall_health.toUpperCase()}`,
      score: report.overall_score,
      issues: report.issues_found,
      critical: report.critical_issues
    })
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(report: SEOHealthReport, webhookUrl: string): Promise<void> {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'seo_check_completed',
          report: {
            overall_health: report.overall_health,
            overall_score: report.overall_score,
            articles_checked: report.articles_checked,
            issues_found: report.issues_found,
            critical_issues: report.critical_issues,
            timestamp: report.check_timestamp
          }
        })
      })
    } catch (error) {
      console.error('Failed to send webhook notification:', error)
    }
  }

  // Helper methods for data access (these would integrate with your data layer)
  
  private async getAllArticles(): Promise<string[]> {
    // Mock implementation - replace with actual API call
    return ['1', '2', '3', '4', '5']
  }

  private async getArticle(id: string): Promise<SEOContent | null> {
    // Mock implementation - replace with actual API call
    return {
      title: `Article ${id}`,
      content: `Sample content for article ${id}...`,
      description: `Description for article ${id}`,
      meta_title: `SEO Title ${id}`,
      meta_description: `SEO description for article ${id}`,
      keywords: `keyword1, keyword2`,
      slug: `article-${id}`
    }
  }

  private storeCheckResult(result: AutoSEOCheckResult): void {
    this.checkHistory.push(result)
    // Keep only last 50 results
    if (this.checkHistory.length > 50) {
      this.checkHistory = this.checkHistory.slice(-50)
    }
  }

  private getPreviousCheck(): AutoSEOCheckResult | null {
    return this.checkHistory.length >= 2 ? this.checkHistory[this.checkHistory.length - 2] : null
  }

  private findImprovedArticles(previousCheck: AutoSEOCheckResult): string[] {
    // Simplified implementation - would compare actual article scores
    return []
  }

  private findDeclinedArticles(previousCheck: AutoSEOCheckResult): string[] {
    // Simplified implementation - would compare actual article scores
    return []
  }
}

// Export singleton instance
export const autoSEOChecker = new AutoSEOChecker()

// Export utility functions for scheduling
export const scheduleWeeklySEOCheck = (options: AutoSEOCheckOptions = {}) => {
  return autoSEOChecker.scheduleChecks(
    { frequency: 'weekly', enabled: true },
    options
  )
}

export const scheduleDailySEOCheck = (options: AutoSEOCheckOptions = {}) => {
  return autoSEOChecker.scheduleChecks(
    { frequency: 'daily', enabled: true },
    options
  )
}