package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"blog-backend/internal/services"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// RecommendationsController handles personalized recommendation API endpoints
type RecommendationsController struct {
	recommendationEngine *services.RecommendationEngine
	behaviorTracker      *services.BehaviorTracker
}

// NewRecommendationsController creates a new recommendations controller
func NewRecommendationsController() *RecommendationsController {
	return &RecommendationsController{
		recommendationEngine: services.GetGlobalRecommendationEngine(),
		behaviorTracker:      services.GetGlobalBehaviorTracker(),
	}
}

// isRAGAvailable checks if RAG services are available and operational
func (rc *RecommendationsController) isRAGAvailable() bool {
	// Check if recommendation engine is available
	if rc.recommendationEngine == nil {
		return false
	}

	// Check if there are embeddings in the database
	var embeddingCount int64
	database.DB.Model(&models.ArticleEmbedding{}).Count(&embeddingCount)

	// Check if embedding service is available
	embeddingService := GetGlobalEmbeddingService()
	if embeddingService == nil {
		return false
	}

	providers := embeddingService.GetAvailableProviders()
	if len(providers) == 0 {
		return false
	}

	// RAG is available if we have embeddings and services are configured
	return embeddingCount > 0
}

// TrackUserBehaviorRequest represents user behavior tracking request
type TrackUserBehaviorRequest struct {
	UserID          string              `json:"user_id"`
	SessionID       string              `json:"session_id" binding:"required"`
	ArticleID       uint                `json:"article_id" binding:"required"`
	InteractionType string              `json:"interaction_type" binding:"required"` // 'view', 'share', 'comment', 'like'
	ReadingTime     int                 `json:"reading_time"`                        // in seconds
	ScrollDepth     float64             `json:"scroll_depth"`                        // 0.0 to 1.0
	DeviceInfo      services.DeviceInfo `json:"device_info"`
	UTMParams       map[string]string   `json:"utm_params"`
	ReferrerType    string              `json:"referrer_type"`
	Language        string              `json:"language"`
}

// GetRecommendationsRequest represents recommendation request
type GetRecommendationsRequest struct {
	UserID        string   `json:"user_id"`
	Language      string   `json:"language"`
	Limit         int      `json:"limit"`
	ExcludeRead   bool     `json:"exclude_read"`
	IncludeReason bool     `json:"include_reason"`
	MinConfidence float64  `json:"min_confidence"`
	Categories    []string `json:"categories"`
	MaxAge        int      `json:"max_age"`
	Diversify     bool     `json:"diversify"`
}

// ReadingPathRequest represents reading path generation request
type ReadingPathRequest struct {
	UserID   string `json:"user_id"`
	Topic    string `json:"topic" binding:"required"`
	Language string `json:"language"`
}

// TrackBehavior tracks user reading behavior
func (rc *RecommendationsController) TrackBehavior(c *gin.Context) {
	var req TrackUserBehaviorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	// Create interaction object
	interaction := services.UserInteraction{
		UserID:          req.UserID,
		SessionID:       req.SessionID,
		ArticleID:       req.ArticleID,
		InteractionType: req.InteractionType,
		ReadingTime:     req.ReadingTime,
		ScrollDepth:     req.ScrollDepth,
		DeviceInfo:      req.DeviceInfo,
		UTMParams:       req.UTMParams,
		ReferrerType:    req.ReferrerType,
		Language:        req.Language,
		Timestamp:       time.Now(),
	}

	// Track the interaction
	if err := rc.behaviorTracker.TrackInteraction(interaction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to track behavior",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Behavior tracked successfully",
	})
}

// GetPersonalizedRecommendations returns personalized article recommendations
func (rc *RecommendationsController) GetPersonalizedRecommendations(c *gin.Context) {
	// Check if RAG services are available
	if !rc.isRAGAvailable() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":           "Recommendation service temporarily unavailable",
			"details":         "RAG (Retrieval-Augmented Generation) services are not configured or available",
			"recommendations": []interface{}{},
		})
		return
	}

	// Parse query parameters
	userID := c.Query("user_id")
	if userID == "" {
		// Generate anonymous user ID from session
		userID = c.GetHeader("X-Session-ID")
		if userID == "" {
			userID = "anonymous_" + c.ClientIP()
		}
	}

	language := c.DefaultQuery("language", "en")
	limitStr := c.DefaultQuery("limit", "10")
	excludeReadStr := c.DefaultQuery("exclude_read", "true")
	includeReasonStr := c.DefaultQuery("include_reason", "true")
	minConfidenceStr := c.DefaultQuery("min_confidence", "0.1")
	diversifyStr := c.DefaultQuery("diversify", "true")

	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	excludeRead := excludeReadStr == "true"
	includeReason := includeReasonStr == "true"
	diversify := diversifyStr == "true"

	minConfidence, _ := strconv.ParseFloat(minConfidenceStr, 64)
	if minConfidence < 0 || minConfidence > 1 {
		minConfidence = 0.1
	}

	// Parse categories if provided
	var categories []string
	if categoriesParam := c.Query("categories"); categoriesParam != "" {
		// Simple comma-separated parsing
		// In production, you might want more sophisticated parsing
		categories = []string{categoriesParam}
	}

	// Create options
	options := services.RecommendationOptions{
		UserID:        userID,
		Language:      language,
		Limit:         limit,
		ExcludeRead:   excludeRead,
		IncludeReason: includeReason,
		MinConfidence: minConfidence,
		Categories:    categories,
		Diversify:     diversify,
	}

	// Get recommendations
	recommendations, err := rc.recommendationEngine.GetPersonalizedRecommendations(options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get recommendations",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recommendations": recommendations,
		"count":           len(recommendations),
		"user_id":         userID,
		"message":         "Personalized recommendations generated successfully",
	})
}

// GenerateReadingPath generates a personalized reading path
func (rc *RecommendationsController) GenerateReadingPath(c *gin.Context) {
	var req ReadingPathRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	if req.Language == "" {
		req.Language = "en"
	}

	if req.UserID == "" {
		// Generate anonymous user ID
		req.UserID = "anonymous_" + c.ClientIP()
	}

	// Generate reading path
	path, err := rc.recommendationEngine.GenerateReadingPath(req.UserID, req.Topic, req.Language)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate reading path",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reading_path": path,
		"message":      "Reading path generated successfully",
	})
}

// GetUserProfile returns user profile and interests
func (rc *RecommendationsController) GetUserProfile(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	// Get user profile
	profile, err := rc.behaviorTracker.GetUserProfile(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get user profile",
			"details": err.Error(),
		})
		return
	}

	// Get user interests
	interests, err := rc.behaviorTracker.GetUserInterests(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get user interests",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"profile":   profile,
		"interests": interests,
		"message":   "User profile retrieved successfully",
	})
}

// GetReadingPatterns returns user's reading patterns analysis
func (rc *RecommendationsController) GetReadingPatterns(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	daysStr := c.DefaultQuery("days", "30")
	days, _ := strconv.Atoi(daysStr)
	if days <= 0 || days > 365 {
		days = 30
	}

	// Get reading patterns
	patterns, err := rc.behaviorTracker.GetReadingPatterns(userID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get reading patterns",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"patterns": patterns,
		"days":     days,
		"message":  "Reading patterns analyzed successfully",
	})
}

// GetSimilarUsers returns users with similar reading patterns
func (rc *RecommendationsController) GetSimilarUsers(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	limitStr := c.DefaultQuery("limit", "10")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	// Get similar users
	similarUsers, err := rc.behaviorTracker.GetSimilarUsers(userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to find similar users",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"similar_users": similarUsers,
		"count":         len(similarUsers),
		"message":       "Similar users found successfully",
	})
}

// GetRecommendationAnalytics returns analytics about recommendations
func (rc *RecommendationsController) GetRecommendationAnalytics(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	daysStr := c.DefaultQuery("days", "30")
	days, _ := strconv.Atoi(daysStr)
	if days <= 0 || days > 365 {
		days = 30
	}

	// Get recommendation analytics
	analytics, err := rc.recommendationEngine.GetRecommendationAnalytics(userID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get recommendation analytics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"analytics": analytics,
		"days":      days,
		"message":   "Recommendation analytics retrieved successfully",
	})
}

// MarkRecommendationClicked marks a recommendation as clicked
func (rc *RecommendationsController) MarkRecommendationClicked(c *gin.Context) {
	userID := c.Param("user_id")
	recommendationIDStr := c.Param("recommendation_id")

	if userID == "" || recommendationIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID and recommendation ID are required",
		})
		return
	}

	recommendationID, err := strconv.ParseUint(recommendationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid recommendation ID",
		})
		return
	}

	// Mark as clicked in database
	now := time.Now()
	database.DB.Model(&models.PersonalizedRecommendation{}).
		Where("id = ? AND user_id = ?", uint(recommendationID), userID).
		Updates(map[string]interface{}{
			"is_clicked": true,
			"clicked_at": &now,
		})

	c.JSON(http.StatusOK, gin.H{
		"message": "Recommendation marked as clicked",
	})
}

// RecentUserResponse represents a recent user summary
type RecentUserResponse struct {
	UserID           string    `json:"user_id"`
	LastActive       time.Time `json:"last_active"`
	TotalReadingTime int       `json:"total_reading_time"`
	ArticleCount     int       `json:"article_count"`
	DevicePreference string    `json:"device_preference"`
	Language         string    `json:"language"`
	AvgScrollDepth   float64   `json:"avg_scroll_depth"`
}

// GetRecentUsers returns a list of recently active users
func (rc *RecommendationsController) GetRecentUsers(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	daysStr := c.DefaultQuery("days", "7")

	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	offset, _ := strconv.Atoi(offsetStr)
	if offset < 0 {
		offset = 0
	}

	days, _ := strconv.Atoi(daysStr)
	if days <= 0 || days > 30 {
		days = 7
	}

	// Get recent users from behavior tracker
	recentUsers, err := rc.behaviorTracker.GetRecentUsers(limit, offset, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get recent users",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users":   recentUsers,
		"count":   len(recentUsers),
		"limit":   limit,
		"offset":  offset,
		"days":    days,
		"message": "Recent users retrieved successfully",
	})
}

// ForceGenerateRecommendations forces recommendation generation for testing
func (rc *RecommendationsController) ForceGenerateRecommendations(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	// Force generate recommendations with default options
	options := services.RecommendationOptions{
		UserID:        userID,
		Language:      c.DefaultQuery("language", "en"),
		Limit:         10,
		ExcludeRead:   false, // Include read articles for testing
		IncludeReason: true,
		MinConfidence: 0.0, // Lower threshold for testing
		Diversify:     true,
	}

	recommendations, err := rc.recommendationEngine.GetPersonalizedRecommendations(options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate recommendations",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recommendations": recommendations,
		"count":           len(recommendations),
		"message":         "Recommendations generated and stored successfully",
		"debug":           true,
	})
}

// GetUserDataStatus returns data status for a user
func (rc *RecommendationsController) GetUserDataStatus(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	// Check various data counts
	var recommendationCount, behaviorCount, profileCount int64

	database.DB.Model(&models.PersonalizedRecommendation{}).Where("user_id = ?", userID).Count(&recommendationCount)
	database.DB.Model(&models.UserReadingBehavior{}).Where("user_id = ?", userID).Count(&behaviorCount)
	database.DB.Model(&models.UserProfile{}).Where("user_id = ?", userID).Count(&profileCount)

	// Get latest behavior and recommendation
	var latestBehavior models.UserReadingBehavior
	var latestRecommendation models.PersonalizedRecommendation

	database.DB.Where("user_id = ?", userID).Order("created_at DESC").First(&latestBehavior)
	database.DB.Where("user_id = ?", userID).Order("created_at DESC").First(&latestRecommendation)

	status := gin.H{
		"user_id": userID,
		"data_status": gin.H{
			"recommendations": gin.H{
				"count":  recommendationCount,
				"latest": latestRecommendation.CreatedAt,
			},
			"behaviors": gin.H{
				"count":  behaviorCount,
				"latest": latestBehavior.CreatedAt,
			},
			"profile_exists": profileCount > 0,
		},
		"suggestions": []string{},
		"message":     "User data status retrieved successfully",
	}

	// Add suggestions based on status
	suggestions := []string{}
	if recommendationCount == 0 {
		suggestions = append(suggestions, "No recommendations found - call /force-generate to create test data")
	}
	if behaviorCount == 0 {
		suggestions = append(suggestions, "No user behavior data - ensure frontend is tracking user interactions")
	}
	if profileCount == 0 {
		suggestions = append(suggestions, "No user profile - will be created automatically on first interaction")
	}

	status["suggestions"] = suggestions

	c.JSON(http.StatusOK, status)
}

// CreateTestBehavior creates test behavior data for a user
func (rc *RecommendationsController) CreateTestBehavior(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	// Get some articles to create test behavior
	var articles []models.Article
	if err := database.DB.Limit(5).Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch articles for test data",
		})
		return
	}

	if len(articles) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No articles available to create test behavior",
		})
		return
	}

	created := 0
	for i, article := range articles {
		interaction := services.UserInteraction{
			UserID:          userID,
			SessionID:       fmt.Sprintf("test_session_%d", time.Now().Unix()),
			ArticleID:       article.ID,
			InteractionType: "view",
			ReadingTime:     60 + i*30,            // Varying reading times
			ScrollDepth:     0.5 + float64(i)*0.1, // Varying scroll depths
			DeviceInfo: services.DeviceInfo{
				DeviceType: "desktop",
				Browser:    "test",
				OS:         "test",
				UserAgent:  "test-agent",
			},
			UTMParams:    map[string]string{},
			ReferrerType: "direct",
			Language:     "en",
			Timestamp:    time.Now().Add(-time.Duration(i) * time.Hour),
		}

		if err := rc.behaviorTracker.TrackInteraction(interaction); err != nil {
			log.Printf("Failed to create test behavior %d: %v", i+1, err)
		} else {
			created++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":           fmt.Sprintf("Created %d test behaviors for user %s", created, userID),
		"user_id":           userID,
		"behaviors_created": created,
		"next_step":         "Call /force-generate to generate recommendations based on this behavior",
	})
}

// GetPopularContent returns currently popular content
func (rc *RecommendationsController) GetPopularContent(c *gin.Context) {
	language := c.DefaultQuery("language", "en")
	limitStr := c.DefaultQuery("limit", "10")
	daysStr := c.DefaultQuery("days", "7")

	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	days, _ := strconv.Atoi(daysStr)
	if days <= 0 || days > 30 {
		days = 7
	}

	// Get popular content using trending recommendations
	options := services.RecommendationOptions{
		UserID:    "anonymous", // Anonymous request for popular content
		Language:  language,
		Limit:     limit,
		Diversify: true,
	}

	recommendations, err := rc.recommendationEngine.GetPersonalizedRecommendations(options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get popular content",
			"details": err.Error(),
		})
		return
	}

	// Filter for trending recommendations only
	var popularContent []services.RecommendationResult
	for _, rec := range recommendations {
		if rec.RecommendationType == "trending" {
			popularContent = append(popularContent, rec)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"popular_content": popularContent,
		"count":           len(popularContent),
		"days":            days,
		"message":         "Popular content retrieved successfully",
	})
}
