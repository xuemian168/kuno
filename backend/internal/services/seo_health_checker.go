package services

import (
	"blog-backend/internal/models"
	"encoding/json"
	"fmt"
	"gorm.io/gorm"
	"time"
)

// SEOHealthCheckerService provides automated SEO health checking functionality
type SEOHealthCheckerService struct {
	db       *gorm.DB
	analyzer *SEOAnalyzerService
}

// NewSEOHealthCheckerService creates a new SEO health checker service
func NewSEOHealthCheckerService(db *gorm.DB) *SEOHealthCheckerService {
	return &SEOHealthCheckerService{
		db:       db,
		analyzer: NewSEOAnalyzerService(),
	}
}

// RunSiteWideHealthCheck performs a comprehensive health check on all articles
func (s *SEOHealthCheckerService) RunSiteWideHealthCheck() (*models.SEOHealthCheck, error) {
	startTime := time.Now()

	// Get all published articles
	var articles []models.Article
	if err := s.db.Where("deleted_at IS NULL").Find(&articles).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch articles: %w", err)
	}

	totalScore := 0
	totalIssues := 0
	categoryScores := make(map[string]int)
	suggestions := []string{}

	// Analyze each article
	for _, article := range articles {
		analysis, err := s.analyzer.AnalyzeContent(&article, "", "zh")
		if err != nil {
			fmt.Printf("Failed to analyze article %d: %v\n", article.ID, err)
			continue
		}

		totalScore += analysis.OverallScore
		totalIssues += len(analysis.TitleAnalysis.Issues) +
			len(analysis.DescriptionAnalysis.Issues) +
			len(analysis.ContentAnalysis.Issues)

		// Collect category-specific scores
		categoryScores["title"] += analysis.TitleAnalysis.Score
		categoryScores["description"] += analysis.DescriptionAnalysis.Score
		categoryScores["content"] += analysis.ContentAnalysis.Score
		categoryScores["keyword"] += analysis.KeywordAnalysis.Score
		categoryScores["readability"] += analysis.ReadabilityAnalysis.Score
		categoryScores["technical"] += analysis.TechnicalAnalysis.Score

		// Collect suggestions for low-scoring articles
		if analysis.OverallScore < 70 {
			suggestions = append(suggestions, fmt.Sprintf("文章 \"%s\" 需要SEO优化", article.Title))
		}
	}

	articleCount := len(articles)
	if articleCount == 0 {
		return nil, fmt.Errorf("no articles found for health check")
	}

	// Calculate average scores
	overallScore := totalScore / articleCount
	titleScore := categoryScores["title"] / articleCount
	descriptionScore := categoryScores["description"] / articleCount
	contentScore := categoryScores["content"] / articleCount
	keywordScore := categoryScores["keyword"] / articleCount
	readabilityScore := categoryScores["readability"] / articleCount
	technicalScore := categoryScores["technical"] / articleCount

	// Generate site-wide suggestions
	siteWideSuggestions := s.generateSiteWideSuggestions(categoryScores, articleCount, totalIssues)
	suggestions = append(suggestions, siteWideSuggestions...)

	// Create detailed results
	results := map[string]interface{}{
		"articles_analyzed": articleCount,
		"average_scores": map[string]int{
			"overall":     overallScore,
			"title":       titleScore,
			"description": descriptionScore,
			"content":     contentScore,
			"keyword":     keywordScore,
			"readability": readabilityScore,
			"technical":   technicalScore,
		},
		"total_issues":             totalIssues,
		"performance_distribution": s.calculatePerformanceDistribution(articles),
		"top_issues":               s.identifyTopIssues(articles),
	}

	resultsJSON, _ := json.Marshal(results)
	suggestionsJSON, _ := json.Marshal(suggestions)

	// Create health check record
	healthCheck := &models.SEOHealthCheck{
		CheckType:        "site",
		OverallScore:     overallScore,
		TitleScore:       titleScore,
		DescriptionScore: descriptionScore,
		ContentScore:     contentScore,
		KeywordScore:     keywordScore,
		ReadabilityScore: readabilityScore,
		TechnicalScore:   technicalScore,
		IssuesFound:      totalIssues,
		CheckResults:     string(resultsJSON),
		Suggestions:      string(suggestionsJSON),
		Language:         "zh",
		CheckDuration:    int(time.Since(startTime).Milliseconds()),
	}

	// Save to database
	if err := s.db.Create(healthCheck).Error; err != nil {
		return nil, fmt.Errorf("failed to save health check: %w", err)
	}

	// Create notifications for critical issues
	s.createHealthNotifications(healthCheck)

	return healthCheck, nil
}

// RunArticleHealthCheck performs health check on a specific article
func (s *SEOHealthCheckerService) RunArticleHealthCheck(articleID uint) (*models.SEOHealthCheck, error) {
	startTime := time.Now()

	// Get article
	var article models.Article
	if err := s.db.First(&article, articleID).Error; err != nil {
		return nil, fmt.Errorf("article not found: %w", err)
	}

	// Analyze article
	analysis, err := s.analyzer.AnalyzeContent(&article, article.SEOKeywords, "zh")
	if err != nil {
		return nil, fmt.Errorf("failed to analyze article: %w", err)
	}

	// Count total issues
	totalIssues := len(analysis.TitleAnalysis.Issues) +
		len(analysis.DescriptionAnalysis.Issues) +
		len(analysis.ContentAnalysis.Issues) +
		len(analysis.KeywordAnalysis.Issues) +
		len(analysis.ReadabilityAnalysis.Issues) +
		len(analysis.TechnicalAnalysis.Issues)

	// Create results
	results := map[string]interface{}{
		"article_id":    articleID,
		"article_title": article.Title,
		"analysis":      analysis,
		"urgent_fixes":  s.identifyUrgentFixes(analysis),
		"quick_wins":    s.identifyQuickWins(analysis),
	}

	resultsJSON, _ := json.Marshal(results)
	suggestionsJSON, _ := json.Marshal(analysis.Suggestions)

	// Create health check record
	healthCheck := &models.SEOHealthCheck{
		ArticleID:        &articleID,
		CheckType:        "article",
		OverallScore:     analysis.OverallScore,
		TitleScore:       analysis.TitleAnalysis.Score,
		DescriptionScore: analysis.DescriptionAnalysis.Score,
		ContentScore:     analysis.ContentAnalysis.Score,
		KeywordScore:     analysis.KeywordAnalysis.Score,
		ReadabilityScore: analysis.ReadabilityAnalysis.Score,
		TechnicalScore:   analysis.TechnicalAnalysis.Score,
		IssuesFound:      totalIssues,
		CheckResults:     string(resultsJSON),
		Suggestions:      string(suggestionsJSON),
		Language:         "zh",
		CheckDuration:    int(time.Since(startTime).Milliseconds()),
	}

	// Save to database
	if err := s.db.Create(healthCheck).Error; err != nil {
		return nil, fmt.Errorf("failed to save health check: %w", err)
	}

	return healthCheck, nil
}

// GetHealthHistory retrieves health check history
func (s *SEOHealthCheckerService) GetHealthHistory(filters map[string]interface{}) ([]models.SEOHealthCheck, error) {
	var healthChecks []models.SEOHealthCheck
	query := s.db.Preload("Article")

	// Apply filters
	if articleID, ok := filters["article_id"]; ok && articleID != nil {
		query = query.Where("article_id = ?", articleID)
	}

	if checkType, ok := filters["check_type"]; ok && checkType != "" {
		query = query.Where("check_type = ?", checkType)
	}

	if limit, ok := filters["limit"]; ok && limit != nil {
		query = query.Limit(limit.(int))
	} else {
		query = query.Limit(50) // Default limit
	}

	// Order by creation date
	query = query.Order("created_at DESC")

	if err := query.Find(&healthChecks).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch health history: %w", err)
	}

	return healthChecks, nil
}

// GetLatestSiteHealth returns the latest site-wide health check
func (s *SEOHealthCheckerService) GetLatestSiteHealth() (*models.SEOHealthCheck, error) {
	var healthCheck models.SEOHealthCheck

	if err := s.db.Where("check_type = ?", "site").Order("created_at DESC").First(&healthCheck).Error; err != nil {
		return nil, fmt.Errorf("no site health check found: %w", err)
	}

	return &healthCheck, nil
}

// ScheduleAutomaticChecks sets up automatic health checks
func (s *SEOHealthCheckerService) ScheduleAutomaticChecks() error {
	// In a real implementation, this would set up cron jobs or scheduled tasks
	// For now, we'll create automation rules in the database

	rules := []models.SEOAutomationRule{
		{
			Name:                 "每日网站健康检查",
			RuleType:             "health_check",
			TriggerCondition:     "schedule",
			Schedule:             "0 2 * * *", // Daily at 2 AM
			TargetScope:          "all",
			RuleConfig:           `{"check_type": "site", "notify_threshold": 70}`,
			NotificationSettings: `{"email": true, "slack": false, "webhook": false}`,
			IsActive:             true,
		},
		{
			Name:                 "文章发布时SEO检查",
			RuleType:             "health_check",
			TriggerCondition:     "on_publish",
			TargetScope:          "all",
			RuleConfig:           `{"check_type": "article", "auto_fix": false}`,
			NotificationSettings: `{"email": false, "slack": false, "webhook": false}`,
			IsActive:             true,
		},
		{
			Name:                 "关键词排名监控",
			RuleType:             "keyword_monitor",
			TriggerCondition:     "schedule",
			Schedule:             "0 6 * * 1", // Weekly on Monday at 6 AM
			TargetScope:          "all",
			RuleConfig:           `{"check_rankings": true, "notify_changes": true}`,
			NotificationSettings: `{"email": true, "slack": false, "webhook": false}`,
			IsActive:             true,
		},
	}

	for _, rule := range rules {
		var existing models.SEOAutomationRule
		if err := s.db.Where("name = ?", rule.Name).First(&existing).Error; err != nil {
			// Rule doesn't exist, create it
			if err := s.db.Create(&rule).Error; err != nil {
				fmt.Printf("Failed to create automation rule %s: %v\n", rule.Name, err)
			}
		}
	}

	return nil
}

// GetAutomationRules retrieves automation rules
func (s *SEOHealthCheckerService) GetAutomationRules() ([]models.SEOAutomationRule, error) {
	var rules []models.SEOAutomationRule

	if err := s.db.Order("created_at DESC").Find(&rules).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch automation rules: %w", err)
	}

	return rules, nil
}

// GetSEONotifications retrieves SEO notifications
func (s *SEOHealthCheckerService) GetSEONotifications(filters map[string]interface{}) ([]models.SEONotification, error) {
	var notifications []models.SEONotification
	query := s.db.Preload("Article").Preload("Keyword")

	// Apply filters
	if isRead, ok := filters["is_read"]; ok {
		query = query.Where("is_read = ?", isRead)
	}

	if severity, ok := filters["severity"]; ok && severity != "" {
		query = query.Where("severity = ?", severity)
	}

	if limit, ok := filters["limit"]; ok && limit != nil {
		query = query.Limit(limit.(int))
	} else {
		query = query.Limit(50)
	}

	// Order by creation date
	query = query.Order("created_at DESC")

	if err := query.Find(&notifications).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch notifications: %w", err)
	}

	return notifications, nil
}

// MarkNotificationAsRead marks a notification as read
func (s *SEOHealthCheckerService) MarkNotificationAsRead(notificationID uint) error {
	if err := s.db.Model(&models.SEONotification{}).Where("id = ?", notificationID).Update("is_read", true).Error; err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	return nil
}

// Helper methods

func (s *SEOHealthCheckerService) generateSiteWideSuggestions(categoryScores map[string]int, articleCount, totalIssues int) []string {
	suggestions := []string{}

	avgTitleScore := categoryScores["title"] / articleCount
	avgDescriptionScore := categoryScores["description"] / articleCount
	avgContentScore := categoryScores["content"] / articleCount
	avgKeywordScore := categoryScores["keyword"] / articleCount

	if avgTitleScore < 70 {
		suggestions = append(suggestions, "大部分文章的标题需要优化，建议统一标题规范")
	}

	if avgDescriptionScore < 60 {
		suggestions = append(suggestions, "许多文章缺少或有不合适的元描述，这是首要改进点")
	}

	if avgContentScore < 70 {
		suggestions = append(suggestions, "内容质量需要提升，关注内容长度和结构")
	}

	if avgKeywordScore < 60 {
		suggestions = append(suggestions, "关键词策略需要改进，建议制定关键词使用规范")
	}

	if totalIssues > articleCount*3 {
		suggestions = append(suggestions, "发现大量SEO问题，建议制定系统性优化计划")
	}

	// Add general recommendations
	suggestions = append(suggestions, "建立定期SEO审核流程")
	suggestions = append(suggestions, "创建SEO内容创作指南")

	return suggestions
}

func (s *SEOHealthCheckerService) calculatePerformanceDistribution(articles []models.Article) map[string]int {
	distribution := map[string]int{
		"excellent": 0, // 90-100
		"good":      0, // 70-89
		"fair":      0, // 50-69
		"poor":      0, // 0-49
	}

	for _, article := range articles {
		analysis, err := s.analyzer.AnalyzeContent(&article, "", "zh")
		if err != nil {
			continue
		}

		score := analysis.OverallScore
		if score >= 90 {
			distribution["excellent"]++
		} else if score >= 70 {
			distribution["good"]++
		} else if score >= 50 {
			distribution["fair"]++
		} else {
			distribution["poor"]++
		}
	}

	return distribution
}

func (s *SEOHealthCheckerService) identifyTopIssues(articles []models.Article) []map[string]interface{} {
	issueCount := make(map[string]int)

	for _, article := range articles {
		analysis, err := s.analyzer.AnalyzeContent(&article, "", "zh")
		if err != nil {
			continue
		}

		// Count issues by type
		for _, issue := range analysis.TitleAnalysis.Issues {
			issueCount[issue]++
		}
		for _, issue := range analysis.DescriptionAnalysis.Issues {
			issueCount[issue]++
		}
		for _, issue := range analysis.ContentAnalysis.Issues {
			issueCount[issue]++
		}
	}

	// Convert to sorted list
	topIssues := []map[string]interface{}{}
	for issue, count := range issueCount {
		if count > 1 { // Only show issues that affect multiple articles
			topIssues = append(topIssues, map[string]interface{}{
				"issue":          issue,
				"affected_count": count,
				"severity":       s.getIssueSeverity(issue),
			})
		}
	}

	return topIssues
}

func (s *SEOHealthCheckerService) identifyUrgentFixes(analysis *models.SEOAnalysisResult) []string {
	urgent := []string{}

	if analysis.TitleAnalysis.Score < 50 {
		urgent = append(urgent, "标题严重缺乏SEO优化")
	}

	if analysis.DescriptionAnalysis.Score < 30 {
		urgent = append(urgent, "缺少或元描述质量极差")
	}

	if analysis.ContentAnalysis.Score < 40 {
		urgent = append(urgent, "内容质量严重不足")
	}

	return urgent
}

func (s *SEOHealthCheckerService) identifyQuickWins(analysis *models.SEOAnalysisResult) []string {
	quickWins := []string{}

	if len(analysis.TitleAnalysis.Issues) == 1 && analysis.TitleAnalysis.Score > 60 {
		quickWins = append(quickWins, "标题只需小幅调整")
	}

	if analysis.DescriptionAnalysis.Length == 0 {
		quickWins = append(quickWins, "添加元描述可快速提升SEO")
	}

	if analysis.ContentAnalysis.ImageOptimization.TotalImages > 0 &&
		analysis.ContentAnalysis.ImageOptimization.ImagesWithAlt == 0 {
		quickWins = append(quickWins, "为图片添加alt属性")
	}

	return quickWins
}

func (s *SEOHealthCheckerService) getIssueSeverity(issue string) string {
	criticalIssues := []string{"缺少元描述", "标题太短", "内容太短"}
	warningIssues := []string{"标题太长", "元描述太长"}

	for _, critical := range criticalIssues {
		if issue == critical {
			return "critical"
		}
	}

	for _, warning := range warningIssues {
		if issue == warning {
			return "warning"
		}
	}

	return "info"
}

func (s *SEOHealthCheckerService) createHealthNotifications(healthCheck *models.SEOHealthCheck) {
	// Create notifications for poor overall scores
	if healthCheck.OverallScore < 50 {
		notification := models.SEONotification{
			Type:     "health_alert",
			Severity: "critical",
			Title:    "SEO健康状况告警",
			Message:  fmt.Sprintf("网站SEO整体得分较低 (%d/100)，需要立即优化", healthCheck.OverallScore),
		}
		s.db.Create(&notification)
	}

	// Create notifications for high issue counts
	if healthCheck.IssuesFound > 50 {
		notification := models.SEONotification{
			Type:     "health_alert",
			Severity: "warning",
			Title:    "发现大量SEO问题",
			Message:  fmt.Sprintf("检测到 %d 个SEO问题，建议制定优化计划", healthCheck.IssuesFound),
		}
		s.db.Create(&notification)
	}
}
