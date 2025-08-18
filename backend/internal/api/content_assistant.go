package api

import (
	"blog-backend/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ContentAssistantController handles content assistant API endpoints
type ContentAssistantController struct {
	contentAssistant *services.ContentAssistant
}

// NewContentAssistantController creates a new content assistant controller
func NewContentAssistantController() *ContentAssistantController {
	return &ContentAssistantController{
		contentAssistant: services.GetGlobalContentAssistant(),
	}
}

// TopicGapAnalysisRequest represents the request for topic gap analysis
type TopicGapAnalysisRequest struct {
	Language string `json:"language" form:"language"`
}

// WritingInspirationRequest represents the request for writing inspiration
type WritingInspirationRequest struct {
	Category string `json:"category" form:"category"`
	Language string `json:"language" form:"language"`
	Limit    int    `json:"limit" form:"limit"`
}

// SmartTagsRequest represents the request for smart tag generation
type SmartTagsRequest struct {
	Content  string `json:"content" binding:"required"`
	Language string `json:"language"`
}

// SEOKeywordsRequest represents the request for SEO keyword recommendations
type SEOKeywordsRequest struct {
	Content        string `json:"content" binding:"required"`
	Language       string `json:"language"`
	PrimaryKeyword string `json:"primary_keyword"`
}

// AnalyzeTopicGaps analyzes content gaps in the knowledge base
func (cac *ContentAssistantController) AnalyzeTopicGaps(c *gin.Context) {
	language := c.DefaultQuery("language", "en")

	analysis, err := cac.contentAssistant.AnalyzeTopicGaps(language)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to analyze topic gaps",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"analysis": analysis,
		"message":  "Topic gap analysis completed successfully",
	})
}

// GetWritingInspiration provides writing inspiration suggestions
func (cac *ContentAssistantController) GetWritingInspiration(c *gin.Context) {
	category := c.DefaultQuery("category", "")
	language := c.DefaultQuery("language", "en")
	limitStr := c.DefaultQuery("limit", "5")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 5
	}
	if limit > 20 {
		limit = 20 // Cap at 20 ideas
	}

	ideas, err := cac.contentAssistant.GetWritingInspiration(category, language, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate writing inspiration",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ideas":   ideas,
		"count":   len(ideas),
		"message": "Writing inspiration generated successfully",
	})
}

// GenerateSmartTags generates intelligent tags for content
func (cac *ContentAssistantController) GenerateSmartTags(c *gin.Context) {
	var req SmartTagsRequest
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

	tags, err := cac.contentAssistant.GenerateSmartTags(req.Content, req.Language)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate smart tags",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tags":    tags,
		"count":   len(tags),
		"message": "Smart tags generated successfully",
	})
}

// RecommendSEOKeywords recommends SEO keywords for content
func (cac *ContentAssistantController) RecommendSEOKeywords(c *gin.Context) {
	var req SEOKeywordsRequest
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

	keywords, err := cac.contentAssistant.RecommendSEOKeywords(req.Content, req.Language, req.PrimaryKeyword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to recommend SEO keywords",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"keywords": keywords,
		"count":    len(keywords),
		"message":  "SEO keywords recommended successfully",
	})
}

// GetContentAssistantStats returns statistics about content assistant usage
func (cac *ContentAssistantController) GetContentAssistantStats(c *gin.Context) {
	// This would typically aggregate usage statistics
	// For now, return basic stats

	c.JSON(http.StatusOK, gin.H{
		"stats": gin.H{
			"total_analyses_performed": 0,   // Would be tracked in database
			"total_ideas_generated":    0,   // Would be tracked in database
			"total_tags_generated":     0,   // Would be tracked in database
			"cache_hit_rate":           0.0, // From cache statistics
		},
		"message": "Content assistant statistics retrieved successfully",
	})
}

// GetTopicTrends returns trending topics analysis
func (cac *ContentAssistantController) GetTopicTrends(c *gin.Context) {
	language := c.DefaultQuery("language", "en")

	// Get topic gap analysis which includes trend information
	analysis, err := cac.contentAssistant.AnalyzeTopicGaps(language)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to analyze topic trends",
			"details": err.Error(),
		})
		return
	}

	// Extract trending information
	trends := gin.H{
		"top_clusters":          analysis.TopicClusters,
		"coverage_score":        analysis.CoverageScore,
		"language_distribution": analysis.LanguageDistribution,
		"generated_at":          analysis.GeneratedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"trends":  trends,
		"message": "Topic trends analyzed successfully",
	})
}

// ValidateContentIdea validates a content idea for feasibility
func (cac *ContentAssistantController) ValidateContentIdea(c *gin.Context) {
	var req struct {
		Title    string `json:"title" binding:"required"`
		Language string `json:"language"`
		Category string `json:"category"`
	}

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

	// Generate tags for the title to analyze the idea
	tags, err := cac.contentAssistant.GenerateSmartTags(req.Title, req.Language)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to validate content idea",
			"details": err.Error(),
		})
		return
	}

	// Analyze the validation results
	validation := gin.H{
		"is_viable":       len(tags) > 0,
		"confidence":      calculateIdeaConfidence(tags),
		"suggested_tags":  tags,
		"recommendations": generateIdeaRecommendations(req.Title, tags, req.Language),
	}

	c.JSON(http.StatusOK, gin.H{
		"validation": validation,
		"message":    "Content idea validated successfully",
	})
}

// Helper functions for validation

// calculateIdeaConfidence calculates confidence score for a content idea
func calculateIdeaConfidence(tags []services.SmartTag) float64 {
	if len(tags) == 0 {
		return 0.0
	}

	totalConfidence := 0.0
	for _, tag := range tags {
		totalConfidence += tag.Confidence
	}

	return totalConfidence / float64(len(tags))
}

// generateIdeaRecommendations generates recommendations for improving a content idea
func generateIdeaRecommendations(title string, tags []services.SmartTag, language string) []string {
	var recommendations []string

	if len(tags) < 3 {
		if language == "zh" {
			recommendations = append(recommendations, "建议明确主题焦点，增加关键词")
		} else {
			recommendations = append(recommendations, "Consider focusing the topic more clearly with additional keywords")
		}
	}

	hasHighConfidenceTags := false
	for _, tag := range tags {
		if tag.Confidence > 0.8 {
			hasHighConfidenceTags = true
			break
		}
	}

	if !hasHighConfidenceTags {
		if language == "zh" {
			recommendations = append(recommendations, "建议使用更具体的技术术语或概念")
		} else {
			recommendations = append(recommendations, "Consider using more specific technical terms or concepts")
		}
	}

	if len(recommendations) == 0 {
		if language == "zh" {
			recommendations = append(recommendations, "这是一个很好的内容想法！")
		} else {
			recommendations = append(recommendations, "This is a great content idea!")
		}
	}

	return recommendations
}
