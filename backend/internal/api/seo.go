package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"blog-backend/internal/services"
	"github.com/gin-gonic/gin"
)

// SEOController handles SEO-related API endpoints
type SEOController struct {
	analyzer      *services.SEOAnalyzerService
	keywordTracker *services.SEOKeywordTrackerService
	healthChecker  *services.SEOHealthCheckerService
}

// NewSEOController creates a new SEO controller
func NewSEOController() *SEOController {
	return &SEOController{
		analyzer:       services.NewSEOAnalyzerService(),
		keywordTracker: services.NewSEOKeywordTrackerService(database.DB),
		healthChecker:  services.NewSEOHealthCheckerService(database.DB),
	}
}

// SEO Health Endpoints

// GetSEOHealth returns overall SEO health status
func (ctrl *SEOController) GetSEOHealth(c *gin.Context) {
	healthCheck, err := ctrl.healthChecker.GetLatestSiteHealth()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No health check data found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"health_check": healthCheck,
		"message": "SEO health data retrieved successfully",
	})
}

// RunSEOHealthCheck performs a new SEO health check
func (ctrl *SEOController) RunSEOHealthCheck(c *gin.Context) {
	checkType := c.DefaultQuery("type", "site")
	
	var healthCheck *models.SEOHealthCheck
	var err error
	
	if checkType == "site" {
		healthCheck, err = ctrl.healthChecker.RunSiteWideHealthCheck()
	} else if checkType == "article" {
		articleIDStr := c.Query("article_id")
		if articleIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "article_id is required for article health check"})
			return
		}
		
		articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article_id"})
			return
		}
		
		healthCheck, err = ctrl.healthChecker.RunArticleHealthCheck(uint(articleID))
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid check type. Use 'site' or 'article'"})
		return
	}
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"health_check": healthCheck,
		"message": "Health check completed successfully",
	})
}

// GetSEOHealthHistory returns health check history
func (ctrl *SEOController) GetSEOHealthHistory(c *gin.Context) {
	filters := make(map[string]interface{})
	
	if articleID := c.Query("article_id"); articleID != "" {
		if id, err := strconv.ParseUint(articleID, 10, 32); err == nil {
			filters["article_id"] = uint(id)
		}
	}
	
	if checkType := c.Query("check_type"); checkType != "" {
		filters["check_type"] = checkType
	}
	
	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil {
			filters["limit"] = l
		}
	}
	
	history, err := ctrl.healthChecker.GetHealthHistory(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"history": history,
		"count": len(history),
	})
}

// Article SEO Endpoints

// GetArticleSEO returns SEO data for a specific article
func (ctrl *SEOController) GetArticleSEO(c *gin.Context) {
	articleIDStr := c.Param("id")
	articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}
	
	db := database.DB
	var article models.Article
	if err := db.First(&article, articleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}
	
	// Get latest health check for this article
	filters := map[string]interface{}{
		"article_id": uint(articleID),
		"limit": 1,
	}
	
	healthHistory, _ := ctrl.healthChecker.GetHealthHistory(filters)
	var latestCheck *models.SEOHealthCheck
	if len(healthHistory) > 0 {
		latestCheck = &healthHistory[0]
	}
	
	// Get keywords for this article
	keywordFilters := map[string]interface{}{
		"article_id": uint(articleID),
	}
	keywords, _ := ctrl.keywordTracker.GetKeywords(keywordFilters)
	
	c.JSON(http.StatusOK, gin.H{
		"article": article,
		"latest_health_check": latestCheck,
		"keywords": keywords,
		"keyword_count": len(keywords),
	})
}

// UpdateArticleSEO updates SEO data for an article
func (ctrl *SEOController) UpdateArticleSEO(c *gin.Context) {
	articleIDStr := c.Param("id")
	articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}
	
	var updateData struct {
		SEOTitle       string `json:"seo_title"`
		SEODescription string `json:"seo_description"`
		SEOKeywords    string `json:"seo_keywords"`
		SEOSlug        string `json:"seo_slug"`
	}
	
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	db := database.DB
	var article models.Article
	if err := db.First(&article, articleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}
	
	// Update article
	updates := map[string]interface{}{}
	if updateData.SEOTitle != "" {
		updates["seo_title"] = updateData.SEOTitle
	}
	if updateData.SEODescription != "" {
		updates["seo_description"] = updateData.SEODescription
	}
	if updateData.SEOKeywords != "" {
		updates["seo_keywords"] = updateData.SEOKeywords
	}
	if updateData.SEOSlug != "" {
		updates["seo_slug"] = updateData.SEOSlug
	}
	
	if err := db.Model(&article).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update article"})
		return
	}
	
	// Reload article
	db.First(&article, articleID)
	
	c.JSON(http.StatusOK, gin.H{
		"article": article,
		"message": "Article SEO updated successfully",
	})
}

// AnalyzeArticleSEO performs SEO analysis on an article
func (ctrl *SEOController) AnalyzeArticleSEO(c *gin.Context) {
	articleIDStr := c.Param("id")
	articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}
	
	var requestData struct {
		FocusKeyword string `json:"focus_keyword"`
		Language     string `json:"language"`
	}
	
	if err := c.ShouldBindJSON(&requestData); err != nil {
		requestData.Language = "zh" // Default language
	}
	
	db := database.DB
	var article models.Article
	if err := db.First(&article, articleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}
	
	// Use article's SEO keywords as focus keyword if not provided
	focusKeyword := requestData.FocusKeyword
	if focusKeyword == "" {
		focusKeyword = article.SEOKeywords
	}
	
	// Perform analysis
	analysis, err := ctrl.analyzer.AnalyzeContent(&article, focusKeyword, requestData.Language)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Save analysis result
	if err := ctrl.analyzer.SaveAnalysisResult(db, uint(articleID), analysis, "manual"); err != nil {
		// Log error but don't fail the request
		// logger.Printf("Failed to save analysis result: %v", err)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"analysis": analysis,
		"message": "SEO analysis completed successfully",
	})
}

// GenerateArticleSEO generates AI-powered SEO content for an article
func (ctrl *SEOController) GenerateArticleSEO(c *gin.Context) {
	articleIDStr := c.Param("id")
	articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}
	
	var requestData struct {
		GenerateTitle       bool   `json:"generate_title"`
		GenerateDescription bool   `json:"generate_description"`
		GenerateKeywords    bool   `json:"generate_keywords"`
		FocusKeyword        string `json:"focus_keyword"`
		Language            string `json:"language"`
	}
	
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if requestData.Language == "" {
		requestData.Language = "zh"
	}
	
	db := database.DB
	var article models.Article
	if err := db.First(&article, articleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}
	
	// TODO: Integrate with actual AI service for content generation
	// For now, return mock generated content
	result := map[string]interface{}{
		"generated_content": map[string]string{},
		"suggestions": []string{},
	}
	
	if requestData.GenerateTitle {
		result["generated_content"].(map[string]string)["title"] = article.Title + " - 完整指南"
		result["suggestions"] = append(result["suggestions"].([]string), "标题已优化，包含关键词")
	}
	
	if requestData.GenerateDescription {
		result["generated_content"].(map[string]string)["description"] = "本文详细介绍了" + article.Title + "的相关知识，包含实用技巧和最佳实践。"
		result["suggestions"] = append(result["suggestions"].([]string), "描述已生成，长度适中")
	}
	
	if requestData.GenerateKeywords {
		keywords := []string{requestData.FocusKeyword, article.Title, "教程", "指南"}
		result["generated_content"].(map[string]string)["keywords"] = strings.Join(keywords, ", ")
		result["suggestions"] = append(result["suggestions"].([]string), "关键词已生成，包含相关术语")
	}
	
	c.JSON(http.StatusOK, gin.H{
		"result": result,
		"message": "SEO content generated successfully",
	})
}

// Keyword Management Endpoints

// GetKeywords returns list of tracked keywords
func (ctrl *SEOController) GetKeywords(c *gin.Context) {
	filters := make(map[string]interface{})
	
	if articleID := c.Query("article_id"); articleID != "" {
		if id, err := strconv.ParseUint(articleID, 10, 32); err == nil {
			filters["article_id"] = uint(id)
		}
	}
	
	if language := c.Query("language"); language != "" {
		filters["language"] = language
	}
	
	if status := c.Query("tracking_status"); status != "" {
		filters["tracking_status"] = status
	}
	
	if difficulty := c.Query("difficulty"); difficulty != "" {
		filters["difficulty"] = difficulty
	}
	
	if search := c.Query("search"); search != "" {
		filters["search"] = search
	}
	
	keywords, err := ctrl.keywordTracker.GetKeywords(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"keywords": keywords,
		"count": len(keywords),
	})
}

// CreateKeyword adds a new keyword for tracking
func (ctrl *SEOController) CreateKeyword(c *gin.Context) {
	var keyword models.SEOKeyword
	
	if err := c.ShouldBindJSON(&keyword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	createdKeyword, err := ctrl.keywordTracker.AddKeyword(keyword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"keyword": createdKeyword,
		"message": "Keyword added successfully",
	})
}

// UpdateKeyword updates an existing keyword
func (ctrl *SEOController) UpdateKeyword(c *gin.Context) {
	keywordIDStr := c.Param("id")
	keywordID, err := strconv.ParseUint(keywordIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid keyword ID"})
		return
	}
	
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	updatedKeyword, err := ctrl.keywordTracker.UpdateKeyword(uint(keywordID), updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"keyword": updatedKeyword,
		"message": "Keyword updated successfully",
	})
}

// DeleteKeyword removes a keyword from tracking
func (ctrl *SEOController) DeleteKeyword(c *gin.Context) {
	keywordIDStr := c.Param("id")
	keywordID, err := strconv.ParseUint(keywordIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid keyword ID"})
		return
	}
	
	if err := ctrl.keywordTracker.DeleteKeyword(uint(keywordID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Keyword deleted successfully",
	})
}

// SuggestKeywords generates keyword suggestions
func (ctrl *SEOController) SuggestKeywords(c *gin.Context) {
	var requestData struct {
		ArticleID   uint   `json:"article_id"`
		BaseKeyword string `json:"base_keyword"`
	}
	
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	suggestions, err := ctrl.keywordTracker.GenerateKeywordSuggestions(requestData.ArticleID, requestData.BaseKeyword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"suggestions": suggestions,
		"count": len(suggestions),
	})
}

// GetKeywordStats returns keyword statistics
func (ctrl *SEOController) GetKeywordStats(c *gin.Context) {
	stats, err := ctrl.keywordTracker.GetKeywordStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
	})
}

// GetKeywordGroups returns keyword groups
func (ctrl *SEOController) GetKeywordGroups(c *gin.Context) {
	groups, err := ctrl.keywordTracker.GetKeywordGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"groups": groups,
		"count": len(groups),
	})
}

// CreateKeywordGroup creates a new keyword group
func (ctrl *SEOController) CreateKeywordGroup(c *gin.Context) {
	var group models.SEOKeywordGroup
	
	if err := c.ShouldBindJSON(&group); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	createdGroup, err := ctrl.keywordTracker.CreateKeywordGroup(group)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"group": createdGroup,
		"message": "Keyword group created successfully",
	})
}

// GetKeywordsByGroup returns keywords grouped by their assigned groups
func (ctrl *SEOController) GetKeywordsByGroup(c *gin.Context) {
	grouped, err := ctrl.keywordTracker.GetKeywordsByGroup()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"grouped_keywords": grouped,
	})
}

// Automation and Notifications

// GetAutomationRules returns automation rules
func (ctrl *SEOController) GetAutomationRules(c *gin.Context) {
	rules, err := ctrl.healthChecker.GetAutomationRules()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"rules": rules,
		"count": len(rules),
	})
}

// GetSEONotifications returns SEO notifications
func (ctrl *SEOController) GetSEONotifications(c *gin.Context) {
	filters := make(map[string]interface{})
	
	if isRead := c.Query("is_read"); isRead != "" {
		filters["is_read"] = isRead == "true"
	}
	
	if severity := c.Query("severity"); severity != "" {
		filters["severity"] = severity
	}
	
	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil {
			filters["limit"] = l
		}
	}
	
	notifications, err := ctrl.healthChecker.GetSEONotifications(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"count": len(notifications),
	})
}

// MarkNotificationRead marks a notification as read
func (ctrl *SEOController) MarkNotificationRead(c *gin.Context) {
	notificationIDStr := c.Param("id")
	notificationID, err := strconv.ParseUint(notificationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}
	
	if err := ctrl.healthChecker.MarkNotificationAsRead(uint(notificationID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Notification marked as read",
	})
}

// UpdateKeywordRankings manually triggers keyword ranking update
func (ctrl *SEOController) UpdateKeywordRankings(c *gin.Context) {
	if err := ctrl.keywordTracker.UpdateKeywordRankings(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Keyword rankings updated successfully",
	})
}

// GetSEOMetrics returns SEO performance metrics
func (ctrl *SEOController) GetSEOMetrics(c *gin.Context) {
	db := database.DB
	
	// Get total articles count
	var totalArticles int64
	db.Model(&models.Article{}).Where("deleted_at IS NULL").Count(&totalArticles)
	
	// Get latest health check data
	var latestHealthCheck models.SEOHealthCheck
	err := db.Where("check_type = ?", "site").Order("created_at DESC").First(&latestHealthCheck).Error
	
	// Calculate article performance distribution from latest health check
	optimizedArticles := int64(0)
	needsAttention := int64(0)
	poorArticles := int64(0)
	averageScore := 0
	
	if err == nil {
		// Parse check results to get performance distribution
		var checkResults map[string]interface{}
		if err := json.Unmarshal([]byte(latestHealthCheck.CheckResults), &checkResults); err == nil {
			if dist, ok := checkResults["performance_distribution"].(map[string]interface{}); ok {
				if excellent, ok := dist["excellent"].(float64); ok {
					optimizedArticles += int64(excellent)
				}
				if good, ok := dist["good"].(float64); ok {
					optimizedArticles += int64(good)
				}
				if fair, ok := dist["fair"].(float64); ok {
					needsAttention = int64(fair)
				}
				if poor, ok := dist["poor"].(float64); ok {
					poorArticles = int64(poor)
				}
			}
		}
		averageScore = latestHealthCheck.OverallScore
	}
	
	// Get keyword statistics
	var totalKeywords int64
	db.Model(&models.SEOKeyword{}).Count(&totalKeywords)
	
	var rankingKeywords int64
	db.Model(&models.SEOKeyword{}).Where("current_rank > 0 AND current_rank <= 10").Count(&rankingKeywords)
	
	// Calculate trend (simplified - comparing with previous health check)
	var previousHealthCheck models.SEOHealthCheck
	trendDirection := "stable"
	trendPercentage := 0.0
	
	err = db.Where("check_type = ? AND id < ?", "site", latestHealthCheck.ID).Order("created_at DESC").First(&previousHealthCheck).Error
	if err == nil && previousHealthCheck.OverallScore > 0 {
		scoreDiff := latestHealthCheck.OverallScore - previousHealthCheck.OverallScore
		trendPercentage = (float64(scoreDiff) / float64(previousHealthCheck.OverallScore)) * 100
		
		if scoreDiff > 2 {
			trendDirection = "up"
		} else if scoreDiff < -2 {
			trendDirection = "down"
		}
	}
	
	// Get real organic traffic data from analytics
	// This replaces the previous hardcoded value with actual website traffic data
	now := time.Now()
	monthAgo := now.AddDate(0, -1, 0)
	
	// Calculate monthly organic traffic (total views from this month)
	var monthlyOrganicTraffic int64
	db.Model(&models.ArticleView{}).
		Where("created_at >= ?", monthAgo).
		Count(&monthlyOrganicTraffic)
	
	// If no recent data, fall back to total views with a reasonable estimate
	if monthlyOrganicTraffic == 0 {
		var totalViews int64
		db.Model(&models.Article{}).Select("COALESCE(SUM(view_count), 0)").Scan(&totalViews)
		// Estimate monthly traffic as a portion of total views
		monthlyOrganicTraffic = totalViews / 12 // Rough monthly estimate
	}

	metrics := map[string]interface{}{
		"total_articles":           totalArticles,
		"optimized_articles":       optimizedArticles,
		"needs_attention":          needsAttention,
		"poor_articles":           poorArticles,
		"average_score":           averageScore,
		"total_keywords":          totalKeywords,
		"top_performing_articles": rankingKeywords,
		"organic_traffic":         monthlyOrganicTraffic,
		"trend_direction":         trendDirection,
		"trend_percentage":        trendPercentage,
		"last_health_check":       latestHealthCheck.CreatedAt,
		"issues_found":           latestHealthCheck.IssuesFound,
	}
	
	c.JSON(http.StatusOK, gin.H{
		"metrics": metrics,
		"message": "SEO metrics retrieved successfully",
	})
}

// BulkImportKeywords imports multiple keywords
func (ctrl *SEOController) BulkImportKeywords(c *gin.Context) {
	var requestData struct {
		ArticleID *uint    `json:"article_id"`
		Keywords  []string `json:"keywords"`
		Language  string   `json:"language"`
	}
	
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if len(requestData.Keywords) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No keywords provided"})
		return
	}
	
	if requestData.Language == "" {
		requestData.Language = "zh"
	}
	
	created, err := ctrl.keywordTracker.BulkImportKeywords(requestData.ArticleID, requestData.Keywords, requestData.Language)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"created_keywords": created,
		"count": len(created),
		"message": fmt.Sprintf("Successfully imported %d keywords", len(created)),
	})
}