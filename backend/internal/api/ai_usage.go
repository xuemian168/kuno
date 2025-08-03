package api

import (
	"blog-backend/internal/services"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// AIUsageController handles AI usage tracking endpoints
type AIUsageController struct {
	tracker *services.AIUsageTracker
}

// NewAIUsageController creates a new AI usage controller
func NewAIUsageController() *AIUsageController {
	return &AIUsageController{
		tracker: services.NewAIUsageTracker(),
	}
}

// TrackUsageRequest represents the request body for tracking AI usage
type TrackUsageRequest struct {
	ServiceType   string  `json:"service_type" binding:"required"`
	Provider      string  `json:"provider" binding:"required"`
	Model         string  `json:"model"`
	Operation     string  `json:"operation" binding:"required"`
	InputTokens   int     `json:"input_tokens"`
	OutputTokens  int     `json:"output_tokens"`
	TotalTokens   int     `json:"total_tokens"`
	EstimatedCost float64 `json:"estimated_cost"`
	Currency      string  `json:"currency"`
	Language      string  `json:"language"`
	InputLength   int     `json:"input_length"`
	OutputLength  int     `json:"output_length"`
	ResponseTime  int     `json:"response_time"` // milliseconds
	Success       bool    `json:"success"`
	ErrorMessage  string  `json:"error_message"`
	ArticleID     *uint   `json:"article_id"`
}

// TrackUsage records AI service usage
func (controller *AIUsageController) TrackUsage(c *gin.Context) {
	var req TrackUsageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get client info
	userAgent := c.GetHeader("User-Agent")
	ipAddress := c.ClientIP()

	metrics := services.UsageMetrics{
		ServiceType:   req.ServiceType,
		Provider:      req.Provider,
		Model:         req.Model,
		Operation:     req.Operation,
		InputTokens:   req.InputTokens,
		OutputTokens:  req.OutputTokens,
		TotalTokens:   req.TotalTokens,
		EstimatedCost: req.EstimatedCost,
		Currency:      req.Currency,
		Language:      req.Language,
		InputLength:   req.InputLength,
		OutputLength:  req.OutputLength,
		Success:       req.Success,
		ErrorMessage:  req.ErrorMessage,
		ArticleID:     req.ArticleID,
		UserAgent:     userAgent,
		IPAddress:     ipAddress,
	}

	if req.ResponseTime > 0 {
		metrics.ResponseTime = time.Duration(req.ResponseTime) * time.Millisecond
	}

	if err := controller.tracker.TrackUsage(metrics); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to track usage"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usage tracked successfully"})
}

// GetUsageStats retrieves aggregated usage statistics
func (controller *AIUsageController) GetUsageStats(c *gin.Context) {
	serviceType := c.Query("service_type")
	provider := c.Query("provider")
	daysStr := c.DefaultQuery("days", "30")

	days, err := strconv.Atoi(daysStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid days parameter"})
		return
	}

	stats, err := controller.tracker.GetUsageStats(serviceType, provider, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve usage stats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
		"period": gin.H{
			"days": days,
			"service_type": serviceType,
			"provider": provider,
		},
	})
}

// GetTotalCost retrieves total cost for a time period
func (controller *AIUsageController) GetTotalCost(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "30")

	days, err := strconv.Atoi(daysStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid days parameter"})
		return
	}

	totalCost, err := controller.tracker.GetTotalCost(days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve total cost"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total_cost": totalCost,
		"currency": "USD",
		"period_days": days,
	})
}

// GetRecentUsage retrieves recent usage records
func (controller *AIUsageController) GetRecentUsage(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit parameter"})
		return
	}

	if limit > 1000 {
		limit = 1000 // Cap at 1000 records
	}

	records, err := controller.tracker.GetRecentUsage(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve recent usage"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"records": records,
		"count": len(records),
	})
}

// GetUsageByArticle retrieves usage records for a specific article
func (controller *AIUsageController) GetUsageByArticle(c *gin.Context) {
	articleIDStr := c.Param("id")
	articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	records, err := controller.tracker.GetUsageByArticle(uint(articleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve article usage"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"article_id": articleID,
		"records": records,
		"count": len(records),
	})
}

// GetDailyUsage retrieves daily usage statistics
func (controller *AIUsageController) GetDailyUsage(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "30")

	days, err := strconv.Atoi(daysStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid days parameter"})
		return
	}

	dailyStats, err := controller.tracker.GetDailyUsage(days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve daily usage"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"daily_stats": dailyStats,
		"period_days": days,
	})
}

// CleanupOldRecords removes old usage records (admin only)
func (controller *AIUsageController) CleanupOldRecords(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "365")

	days, err := strconv.Atoi(daysStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid days parameter"})
		return
	}

	// Safety check - don't allow cleanup of records newer than 90 days
	if days < 90 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot cleanup records newer than 90 days"})
		return
	}

	deletedCount, err := controller.tracker.CleanupOldRecords(days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cleanup old records"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Cleanup completed",
		"deleted_records": deletedCount,
		"cutoff_days": days,
	})
}