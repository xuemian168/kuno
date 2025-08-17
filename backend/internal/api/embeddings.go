package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"blog-backend/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Global embedding service instance
var globalEmbeddingService *services.EmbeddingService

// EmbeddingController handles embedding-related API endpoints
type EmbeddingController struct {
	embeddingService *services.EmbeddingService
}

// NewEmbeddingController creates a new embedding controller
func NewEmbeddingController() *EmbeddingController {
	if globalEmbeddingService == nil {
		globalEmbeddingService = services.NewEmbeddingService()
	}
	return &EmbeddingController{
		embeddingService: globalEmbeddingService,
	}
}

// GetGlobalEmbeddingService returns the global embedding service instance
func GetGlobalEmbeddingService() *services.EmbeddingService {
	if globalEmbeddingService == nil {
		globalEmbeddingService = services.NewEmbeddingService()
	}
	return globalEmbeddingService
}

// isRAGAvailable checks if RAG services are available and operational
func (ec *EmbeddingController) isRAGAvailable() bool {
	// Check if embedding service is available
	if ec.embeddingService == nil {
		return false
	}
	
	providers := ec.embeddingService.GetAvailableProviders()
	if len(providers) == 0 {
		return false
	}
	
	// Check if there are embeddings in the database
	var embeddingCount int64
	database.DB.Model(&models.ArticleEmbedding{}).Count(&embeddingCount)
	
	// RAG is available if we have embeddings and services are configured
	return embeddingCount > 0
}

// SemanticSearchRequest represents the request body for semantic search
type SemanticSearchRequest struct {
	Query     string  `json:"query" binding:"required"`
	Language  string  `json:"language"`
	Limit     int     `json:"limit"`
	Threshold float64 `json:"threshold"`
}

// SemanticSearchResponse represents the response for semantic search
type SemanticSearchResponse struct {
	Results []models.EmbeddingSearchResult `json:"results"`
	Count   int                           `json:"count"`
	Query   string                        `json:"query"`
	Message string                        `json:"message,omitempty"`
}

// ProcessArticleEmbeddings processes embeddings for a specific article
func (ec *EmbeddingController) ProcessArticleEmbeddings(c *gin.Context) {
	articleIDStr := c.Param("id")
	articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	err = ec.embeddingService.ProcessArticleEmbeddings(uint(articleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Embeddings processed successfully",
		"article_id": articleID,
	})
}

// BatchProcessEmbeddings processes embeddings for all articles
func (ec *EmbeddingController) BatchProcessEmbeddings(c *gin.Context) {
	err := ec.embeddingService.BatchProcessAllArticles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Batch processing completed successfully",
	})
}

// SemanticSearch performs semantic search using embeddings
func (ec *EmbeddingController) SemanticSearch(c *gin.Context) {
	var req SemanticSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults
	if req.Language == "" {
		req.Language = "en"
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}
	if req.Threshold <= 0 {
		req.Threshold = 0.7 // Default similarity threshold
	}

	// Perform search
	results, err := ec.embeddingService.SearchSimilarArticles(req.Query, req.Language, req.Limit, req.Threshold)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := SemanticSearchResponse{
		Results: results,
		Count:   len(results),
		Query:   req.Query,
	}

	if len(results) == 0 {
		response.Message = "No similar articles found"
	}

	c.JSON(http.StatusOK, response)
}

// HybridSearch combines keyword and semantic search
func (ec *EmbeddingController) HybridSearch(c *gin.Context) {
	var req SemanticSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults
	if req.Language == "" {
		req.Language = "en"
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}
	if req.Threshold <= 0 {
		req.Threshold = 0.6 // Lower threshold for hybrid search
	}

	// Perform semantic search
	semanticResults, err := ec.embeddingService.SearchSimilarArticles(req.Query, req.Language, req.Limit*2, req.Threshold)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// TODO: Combine with keyword search results
	// For now, just return semantic results
	response := SemanticSearchResponse{
		Results: semanticResults[:min(len(semanticResults), req.Limit)],
		Count:   len(semanticResults[:min(len(semanticResults), req.Limit)]),
		Query:   req.Query,
		Message: "Hybrid search (semantic only for now)",
	}

	c.JSON(http.StatusOK, response)
}

// GetSimilarArticles returns articles similar to a given article
func (ec *EmbeddingController) GetSimilarArticles(c *gin.Context) {
	// Check if RAG services are available
	if !ec.isRAGAvailable() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Similar articles service temporarily unavailable",
			"details": "RAG (Retrieval-Augmented Generation) services are not configured or available",
			"results": []interface{}{},
			"count": 0,
		})
		return
	}

	articleIDStr := c.Param("id")
	articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	// Get article content
	var article models.Article
	if err := database.DB.First(&article, articleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}

	// Get language from query param
	language := c.DefaultQuery("language", article.DefaultLang)
	limit := 5 // Default to 5 similar articles

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Use article content as search query
	searchText := article.Title + " " + article.Summary
	if language != article.DefaultLang {
		// Try to get translation
		var translation models.ArticleTranslation
		if err := database.DB.Where("article_id = ? AND language = ?", articleID, language).First(&translation).Error; err == nil {
			searchText = translation.Title + " " + translation.Summary
		}
	}

	// Perform search (exclude the current article)
	results, err := ec.embeddingService.SearchSimilarArticles(searchText, language, limit+5, 0.5)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Filter out the current article
	var filteredResults []models.EmbeddingSearchResult
	for _, result := range results {
		if result.ArticleID != uint(articleID) {
			filteredResults = append(filteredResults, result)
		}
		if len(filteredResults) >= limit {
			break
		}
	}

	response := SemanticSearchResponse{
		Results: filteredResults,
		Count:   len(filteredResults),
		Query:   "Similar to: " + article.Title,
	}

	c.JSON(http.StatusOK, response)
}

// GetEmbeddingStats returns statistics about embeddings
func (ec *EmbeddingController) GetEmbeddingStats(c *gin.Context) {
	stats, err := ec.embeddingService.GetEmbeddingStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
	})
}

// DeleteArticleEmbeddings deletes embeddings for a specific article
func (ec *EmbeddingController) DeleteArticleEmbeddings(c *gin.Context) {
	articleIDStr := c.Param("id")
	articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	// Delete embeddings
	result := database.DB.Where("article_id = ?", articleID).Delete(&models.ArticleEmbedding{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "Embeddings deleted successfully",
		"article_id":      articleID,
		"deleted_count":   result.RowsAffected,
	})
}

// RebuildEmbeddings rebuilds all embeddings
func (ec *EmbeddingController) RebuildEmbeddings(c *gin.Context) {
	// Delete all existing embeddings
	if err := database.DB.Exec("DELETE FROM article_embeddings").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear existing embeddings"})
		return
	}

	// Rebuild all embeddings
	err := ec.embeddingService.BatchProcessAllArticles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Embeddings rebuilt successfully",
	})
}

// GetProviderStatus returns the status of all embedding providers
func (ec *EmbeddingController) GetProviderStatus(c *gin.Context) {
	status := ec.embeddingService.GetProviderStatus()
	availableProviders := ec.embeddingService.GetAvailableProviders()
	
	c.JSON(http.StatusOK, gin.H{
		"providers": status,
		"available": availableProviders,
	})
}

// SetDefaultProvider sets the default embedding provider
func (ec *EmbeddingController) SetDefaultProvider(c *gin.Context) {
	var req struct {
		Provider string `json:"provider" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	err := ec.embeddingService.SetDefaultProvider(req.Provider)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Default provider updated successfully",
		"provider": req.Provider,
	})
}

// GetEmbeddingTrends returns embedding generation trends
func (ec *EmbeddingController) GetEmbeddingTrends(c *gin.Context) {
	days := 30 // Default to 30 days
	if daysStr := c.Query("days"); daysStr != "" {
		if parsedDays, err := strconv.Atoi(daysStr); err == nil && parsedDays > 0 {
			days = parsedDays
		}
	}
	
	// Query embedding creation trends
	var trends []struct {
		Date  string `json:"date"`
		Count int    `json:"count"`
		Provider string `json:"provider"`
	}
	
	query := `
		SELECT 
			DATE(created_at) as date, 
			COUNT(*) as count,
			provider
		FROM article_embeddings 
		WHERE created_at >= datetime('now', '-' || ? || ' days')
		GROUP BY DATE(created_at), provider
		ORDER BY date DESC
	`
	
	if err := database.DB.Raw(query, days).Scan(&trends).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trends"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"trends": trends,
		"days": days,
	})
}

// GetEmbeddingVectors returns reduced-dimension vectors for visualization
func (ec *EmbeddingController) GetEmbeddingVectors(c *gin.Context) {
	method := c.DefaultQuery("method", "pca") // pca, tsne, umap
	dimensions := 2 // Fixed to 2D for now
	limit := 200    // Limit for performance
	
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 1000 {
			limit = parsedLimit
		}
	}
	
	vectors, err := ec.embeddingService.GetReducedVectors(method, dimensions, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"vectors": vectors,
		"method": method,
		"dimensions": dimensions,
		"count": len(vectors),
	})
}

// GetSimilarityGraph returns similarity relationships between articles
func (ec *EmbeddingController) GetSimilarityGraph(c *gin.Context) {
	threshold := 0.7 // Default similarity threshold
	maxNodes := 100  // Limit number of nodes for performance
	
	if thresholdStr := c.Query("threshold"); thresholdStr != "" {
		if parsedThreshold, err := strconv.ParseFloat(thresholdStr, 64); err == nil && parsedThreshold >= 0 && parsedThreshold <= 1 {
			threshold = parsedThreshold
		}
	}
	
	if maxNodesStr := c.Query("max_nodes"); maxNodesStr != "" {
		if parsedMaxNodes, err := strconv.Atoi(maxNodesStr); err == nil && parsedMaxNodes > 0 && parsedMaxNodes <= 500 {
			maxNodes = parsedMaxNodes
		}
	}
	
	graph, err := ec.embeddingService.GetSimilarityGraph(threshold, maxNodes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"graph": graph,
		"threshold": threshold,
		"max_nodes": maxNodes,
	})
}

// GetQualityMetrics returns embedding quality analysis
func (ec *EmbeddingController) GetQualityMetrics(c *gin.Context) {
	metrics, err := ec.embeddingService.GetQualityMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"metrics": metrics,
	})
}

// GetRAGProcessVisualization provides data for RAG process visualization
func (ec *EmbeddingController) GetRAGProcessVisualization(c *gin.Context) {
	query := c.Query("query")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter is required"})
		return
	}
	
	language := c.DefaultQuery("language", "en")
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 50 {
			limit = parsedLimit
		}
	}
	
	processData, err := ec.embeddingService.GetRAGProcessVisualization(query, language, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"process": processData,
		"query": query,
		"language": language,
	})
}

// GetRAGServiceStatus returns the status of RAG-related services
func (ec *EmbeddingController) GetRAGServiceStatus(c *gin.Context) {
	// Check if embedding service is available and configured
	isEmbeddingAvailable := false
	embeddingProviders := []string{}
	var embeddingError string
	
	if ec.embeddingService != nil {
		providers := ec.embeddingService.GetAvailableProviders()
		if len(providers) > 0 {
			isEmbeddingAvailable = true
			embeddingProviders = providers
		} else {
			embeddingError = "No embedding providers configured"
		}
	} else {
		embeddingError = "Embedding service not initialized"
	}
	
	// Check if there are any embeddings in the database
	var embeddingCount int64
	database.DB.Model(&models.ArticleEmbedding{}).Count(&embeddingCount)
	
	// Check recommendation engine availability
	isRecommendationAvailable := false
	var recommendationError string
	
	recommendationEngine := services.GetGlobalRecommendationEngine()
	if recommendationEngine != nil {
		isRecommendationAvailable = true
	} else {
		recommendationError = "Recommendation engine not initialized"
	}
	
	// Overall RAG status
	isRAGEnabled := isEmbeddingAvailable && embeddingCount > 0
	
	status := gin.H{
		"rag_enabled": isRAGEnabled,
		"services": gin.H{
			"embedding": gin.H{
				"available": isEmbeddingAvailable,
				"providers": embeddingProviders,
				"embedding_count": embeddingCount,
				"error": embeddingError,
			},
			"recommendation": gin.H{
				"available": isRecommendationAvailable,
				"error": recommendationError,
			},
		},
		"message": func() string {
			if isRAGEnabled {
				return "RAG services are available and operational"
			} else if !isEmbeddingAvailable {
				return "RAG services unavailable - embedding service not configured"
			} else if embeddingCount == 0 {
				return "RAG services unavailable - no embeddings generated yet"
			} else {
				return "RAG services partially available"
			}
		}(),
	}
	
	c.JSON(http.StatusOK, status)
}

// Helper function
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}