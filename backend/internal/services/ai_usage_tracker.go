package services

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"time"
)

// AIUsageTracker provides methods to track AI service usage
type AIUsageTracker struct{}

// NewAIUsageTracker creates a new AI usage tracker instance
func NewAIUsageTracker() *AIUsageTracker {
	return &AIUsageTracker{}
}

// UsageMetrics contains metrics about an AI service call
type UsageMetrics struct {
	ServiceType   string
	Provider      string
	Model         string
	Operation     string
	InputTokens   int
	OutputTokens  int
	TotalTokens   int
	EstimatedCost float64
	Currency      string
	Language      string
	InputLength   int
	OutputLength  int
	ResponseTime  time.Duration
	Success       bool
	ErrorMessage  string
	ArticleID     *uint
	UserAgent     string
	IPAddress     string
}

// TrackUsage records AI service usage in the database
func (tracker *AIUsageTracker) TrackUsage(metrics UsageMetrics) error {
	record := models.AIUsageRecord{
		ServiceType:   metrics.ServiceType,
		Provider:      metrics.Provider,
		Model:         metrics.Model,
		Operation:     metrics.Operation,
		InputTokens:   metrics.InputTokens,
		OutputTokens:  metrics.OutputTokens,
		TotalTokens:   metrics.TotalTokens,
		EstimatedCost: metrics.EstimatedCost,
		Currency:      metrics.Currency,
		Language:      metrics.Language,
		InputLength:   metrics.InputLength,
		OutputLength:  metrics.OutputLength,
		ResponseTime:  int(metrics.ResponseTime.Milliseconds()),
		Success:       metrics.Success,
		ErrorMessage:  metrics.ErrorMessage,
		ArticleID:     metrics.ArticleID,
		UserAgent:     metrics.UserAgent,
		IPAddress:     metrics.IPAddress,
	}

	return database.DB.Create(&record).Error
}

// GetUsageStats retrieves aggregated usage statistics
func (tracker *AIUsageTracker) GetUsageStats(serviceType, provider string, days int) ([]models.AIUsageStats, error) {
	var stats []models.AIUsageStats

	query := database.DB.Model(&models.AIUsageRecord{}).
		Select(`
			service_type,
			provider,
			COUNT(*) as total_requests,
			SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_requests,
			SUM(total_tokens) as total_tokens,
			SUM(estimated_cost) as total_cost,
			currency,
			AVG(response_time) as avg_response_time
		`).
		Group("service_type, provider, currency")

	if days > 0 {
		query = query.Where("created_at >= ?", time.Now().AddDate(0, 0, -days))
	}

	if serviceType != "" {
		query = query.Where("service_type = ?", serviceType)
	}

	if provider != "" {
		query = query.Where("provider = ?", provider)
	}

	return stats, query.Scan(&stats).Error
}

// GetTotalCost calculates total cost for a time period
func (tracker *AIUsageTracker) GetTotalCost(days int) (float64, error) {
	var totalCost *float64

	query := database.DB.Model(&models.AIUsageRecord{}).
		Select("SUM(estimated_cost)")

	if days > 0 {
		query = query.Where("created_at >= ?", time.Now().AddDate(0, 0, -days))
	}

	err := query.Scan(&totalCost).Error
	if err != nil {
		return 0, err
	}

	// If no records exist, SUM returns NULL
	if totalCost == nil {
		return 0, nil
	}

	return *totalCost, nil
}

// GetRecentUsage retrieves recent usage records
func (tracker *AIUsageTracker) GetRecentUsage(limit int) ([]models.AIUsageRecord, error) {
	var records []models.AIUsageRecord

	return records, database.DB.
		Order("created_at DESC").
		Limit(limit).
		Find(&records).Error
}

// GetUsageByArticle retrieves usage records for a specific article
func (tracker *AIUsageTracker) GetUsageByArticle(articleID uint) ([]models.AIUsageRecord, error) {
	var records []models.AIUsageRecord

	return records, database.DB.
		Where("article_id = ?", articleID).
		Order("created_at DESC").
		Find(&records).Error
}

// GetDailyUsage retrieves daily usage statistics for the last N days
func (tracker *AIUsageTracker) GetDailyUsage(days int) (map[string]models.AIUsageStats, error) {
	var results []struct {
		Date            string  `json:"date"`
		TotalRequests   int64   `json:"total_requests"`
		SuccessRequests int64   `json:"success_requests"`
		TotalTokens     int64   `json:"total_tokens"`
		TotalCost       float64 `json:"total_cost"`
		AvgResponseTime float64 `json:"avg_response_time"`
	}

	err := database.DB.Model(&models.AIUsageRecord{}).
		Select(`
			DATE(created_at) as date,
			COUNT(*) as total_requests,
			SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_requests,
			SUM(total_tokens) as total_tokens,
			SUM(estimated_cost) as total_cost,
			AVG(response_time) as avg_response_time
		`).
		Where("created_at >= ?", time.Now().AddDate(0, 0, -days)).
		Group("DATE(created_at)").
		Order("date DESC").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	// Convert to map for easier access
	dailyStats := make(map[string]models.AIUsageStats)
	for _, result := range results {
		dailyStats[result.Date] = models.AIUsageStats{
			TotalRequests:   result.TotalRequests,
			SuccessRequests: result.SuccessRequests,
			TotalTokens:     result.TotalTokens,
			TotalCost:       result.TotalCost,
			AvgResponseTime: result.AvgResponseTime,
		}
	}

	return dailyStats, nil
}

// CleanupOldRecords removes records older than specified days (for data retention)
func (tracker *AIUsageTracker) CleanupOldRecords(days int) (int64, error) {
	cutoffDate := time.Now().AddDate(0, 0, -days)

	result := database.DB.Where("created_at < ?", cutoffDate).Delete(&models.AIUsageRecord{})
	return result.RowsAffected, result.Error
}
