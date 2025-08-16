package services

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"blog-backend/internal/security"
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
)

// EmbeddingProvider defines the interface for embedding providers
type EmbeddingProvider interface {
	GenerateEmbedding(text string) ([]float64, int, error)
	GetProviderName() string
	GetModelName() string
	IsConfigured() bool
	GetDimensions() int
}

// EmbeddingService handles vector embeddings for semantic search
type EmbeddingService struct {
	providers map[string]EmbeddingProvider
	defaultProvider string
	dbConfig *models.AIConfig // Database AI configuration
	usageTracker *AIUsageTracker // Track AI usage for cost and analytics
}

// NewEmbeddingService creates a new embedding service instance
func NewEmbeddingService() *EmbeddingService {
	service := &EmbeddingService{
		providers: make(map[string]EmbeddingProvider),
		defaultProvider: "openai",
		usageTracker: NewAIUsageTracker(),
	}
	
	// Load configuration from database
	service.loadDatabaseConfig()
	
	// Initialize providers
	service.initializeProviders()
	return service
}

// loadDatabaseConfig loads AI configuration from database
func (es *EmbeddingService) loadDatabaseConfig() {
	var settings models.SiteSettings
	if err := database.DB.First(&settings).Error; err != nil {
		log.Printf("Failed to load site settings: %v", err)
		return
	}
	
	if settings.AIConfig != "" {
		log.Printf("Loading AI config from database (length: %d chars)", len(settings.AIConfig))
		
		// Try to decrypt the secure AI config first
		aiConfigService := security.GetGlobalAIConfigService()
		
		// Parse as secure config and decrypt
		var secureConfig security.SecureAIConfig
		if err := json.Unmarshal([]byte(settings.AIConfig), &secureConfig); err != nil {
			log.Printf("Failed to parse secure AI config: %v", err)
			return
		}
		
		// Decrypt the configuration
		inputConfig, err := aiConfigService.DecryptAIConfig(&secureConfig)
		if err != nil {
			log.Printf("Failed to decrypt AI config: %v", err)
			return
		}
		
		// Convert to models.AIConfig format
		aiConfig := models.AIConfig{
			DefaultProvider: inputConfig.DefaultProvider,
			Providers:       make(map[string]models.AIProviderConfig),
			EmbeddingConfig: struct {
				DefaultProvider string `json:"default_provider"`
				Enabled         bool   `json:"enabled"`
			}{
				DefaultProvider: inputConfig.EmbeddingConfig.DefaultProvider,
				Enabled:         inputConfig.EmbeddingConfig.Enabled,
			},
		}
		
		// Convert providers
		for name, provider := range inputConfig.Providers {
			aiConfig.Providers[name] = models.AIProviderConfig{
				Provider: provider.Provider,
				APIKey:   provider.APIKey,
				Model:    provider.Model,
				Enabled:  provider.Enabled,
			}
		}
		
		es.dbConfig = &aiConfig
		
		// Update default provider from database config
		if aiConfig.EmbeddingConfig.DefaultProvider != "" {
			es.defaultProvider = aiConfig.EmbeddingConfig.DefaultProvider
			log.Printf("Set embedding default provider to: %s", es.defaultProvider)
		}
		
		// Log available providers (without API keys)
		providerNames := make([]string, 0, len(aiConfig.Providers))
		for name, provider := range aiConfig.Providers {
			if provider.Enabled && provider.APIKey != "" {
				providerNames = append(providerNames, name)
			}
		}
		log.Printf("Loaded AI providers from database: %v", providerNames)
	} else {
		log.Printf("No AI config found in database")
	}
}

// initializeProviders sets up available embedding providers
func (es *EmbeddingService) initializeProviders() {
	// Initialize OpenAI provider
	es.initializeOpenAIProvider()
	
	// Initialize Gemini provider  
	es.initializeGeminiProvider()
}

// initializeOpenAIProvider sets up OpenAI provider
func (es *EmbeddingService) initializeOpenAIProvider() {
	var apiKey, model string
	
	// Try database config first
	if es.dbConfig != nil {
		if provider, exists := es.dbConfig.Providers["openai"]; exists && provider.Enabled && provider.APIKey != "" {
			apiKey = provider.APIKey
			model = provider.Model
		}
	}
	
	// Fall back to environment variables
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
		model = getEnvOrDefault("OPENAI_EMBEDDING_MODEL", "text-embedding-ada-002")
	}
	
	if apiKey != "" {
		openaiProvider := &OpenAIEmbeddingProvider{
			APIKey: apiKey,
			Model:  model,
		}
		es.providers["openai"] = openaiProvider
		log.Printf("Initialized OpenAI embedding provider with model: %s", model)
	}
}

// initializeGeminiProvider sets up Gemini provider
func (es *EmbeddingService) initializeGeminiProvider() {
	var apiKey, model string
	
	// Try database config first
	if es.dbConfig != nil {
		if provider, exists := es.dbConfig.Providers["gemini"]; exists && provider.Enabled && provider.APIKey != "" {
			apiKey = provider.APIKey
			model = provider.Model
			// Ensure we're using a valid embedding model for Gemini
			if model == "" || model == "gemini-1.5-flash" || model == "gemini-1.5-pro" {
				model = "text-embedding-004"
			}
		}
	}
	
	// Fall back to environment variables
	if apiKey == "" {
		apiKey = os.Getenv("GEMINI_API_KEY")
		model = getEnvOrDefault("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
	}
	
	if apiKey != "" {
		geminiProvider := &GeminiEmbeddingProvider{
			APIKey: apiKey,
			Model:  model,
		}
		es.providers["gemini"] = geminiProvider
		log.Printf("Initialized Gemini embedding provider with model: %s (embedding-optimized)", model)
	}
}

// getEnvOrDefault returns environment variable or default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// OpenAIEmbeddingProvider implements EmbeddingProvider for OpenAI
type OpenAIEmbeddingProvider struct {
	APIKey string
	Model  string
}

func (p *OpenAIEmbeddingProvider) GenerateEmbedding(text string) ([]float64, int, error) {
	if !p.IsConfigured() {
		return nil, 0, fmt.Errorf("OpenAI API key not configured")
	}

	cleanText := strings.TrimSpace(text)
	if len(cleanText) == 0 {
		return nil, 0, fmt.Errorf("empty text provided")
	}

	reqBody := map[string]interface{}{
		"input": []string{cleanText},
		"model": p.Model,
	}

	reqData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to marshal request: %v", err)
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/embeddings", bytes.NewBuffer(reqData))
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.APIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("OpenAI API error (status %d): %s", resp.StatusCode, string(body))
	}

	var embeddingResp struct {
		Data []struct {
			Embedding []float64 `json:"embedding"`
		} `json:"data"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(body, &embeddingResp); err != nil {
		return nil, 0, fmt.Errorf("failed to unmarshal response: %v", err)
	}

	if len(embeddingResp.Data) == 0 {
		return nil, 0, fmt.Errorf("no embeddings returned from API")
	}

	return embeddingResp.Data[0].Embedding, embeddingResp.Usage.TotalTokens, nil
}

func (p *OpenAIEmbeddingProvider) GetProviderName() string {
	return "openai"
}

func (p *OpenAIEmbeddingProvider) GetModelName() string {
	return p.Model
}

func (p *OpenAIEmbeddingProvider) IsConfigured() bool {
	return p.APIKey != ""
}

func (p *OpenAIEmbeddingProvider) GetDimensions() int {
	// OpenAI text-embedding-ada-002 returns 1536 dimensions
	// text-embedding-3-small returns 1536 dimensions
	// text-embedding-3-large returns 3072 dimensions
	switch p.Model {
	case "text-embedding-3-large":
		return 3072
	default:
		return 1536
	}
}

// GeminiEmbeddingProvider implements EmbeddingProvider for Gemini
type GeminiEmbeddingProvider struct {
	APIKey string
	Model  string
}

func (p *GeminiEmbeddingProvider) GenerateEmbedding(text string) ([]float64, int, error) {
	if !p.IsConfigured() {
		return nil, 0, fmt.Errorf("Gemini API key not configured")
	}

	cleanText := strings.TrimSpace(text)
	if len(cleanText) == 0 {
		return nil, 0, fmt.Errorf("empty text provided")
	}

	reqBody := map[string]interface{}{
		"model": fmt.Sprintf("models/%s", p.Model),
		"content": map[string]interface{}{
			"parts": []map[string]string{
				{"text": cleanText},
			},
		},
	}

	reqData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to marshal request: %v", err)
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:embedContent?key=%s", p.Model, p.APIKey)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqData))
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("Gemini API error (status %d): %s", resp.StatusCode, string(body))
	}

	var embeddingResp struct {
		Embedding struct {
			Values []float64 `json:"values"`
		} `json:"embedding"`
	}

	if err := json.Unmarshal(body, &embeddingResp); err != nil {
		return nil, 0, fmt.Errorf("failed to unmarshal response: %v", err)
	}

	if len(embeddingResp.Embedding.Values) == 0 {
		return nil, 0, fmt.Errorf("no embeddings returned from API")
	}

	// Estimate token count (Gemini doesn't return this directly)
	tokenCount := len(strings.Split(cleanText, " "))

	return embeddingResp.Embedding.Values, tokenCount, nil
}

func (p *GeminiEmbeddingProvider) GetProviderName() string {
	return "gemini"
}

func (p *GeminiEmbeddingProvider) GetModelName() string {
	return p.Model
}

func (p *GeminiEmbeddingProvider) IsConfigured() bool {
	return p.APIKey != ""
}

func (p *GeminiEmbeddingProvider) GetDimensions() int {
	// Gemini text-embedding-004 returns 768 dimensions
	return 768
}

// EmbeddingRequest represents the request to OpenAI embeddings API (legacy, for compatibility)
type EmbeddingRequest struct {
	Input []string `json:"input"`
	Model string   `json:"model"`
}

// EmbeddingResponse represents the response from OpenAI embeddings API
type EmbeddingResponse struct {
	Object string `json:"object"`
	Data   []struct {
		Object    string    `json:"object"`
		Embedding []float64 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Model string `json:"model"`
	Usage struct {
		PromptTokens int `json:"prompt_tokens"`
		TotalTokens  int `json:"total_tokens"`
	} `json:"usage"`
}

// GenerateEmbedding generates embeddings using the default or specified provider
func (es *EmbeddingService) GenerateEmbedding(text string) ([]float64, int, error) {
	return es.GenerateEmbeddingWithProvider(text, "")
}

// GenerateEmbeddingWithProvider generates embeddings using a specific provider
func (es *EmbeddingService) GenerateEmbeddingWithProvider(text, providerName string) ([]float64, int, error) {
	// Use default provider if none specified
	if providerName == "" {
		providerName = es.defaultProvider
	}

	provider, exists := es.providers[providerName]
	if !exists {
		return nil, 0, fmt.Errorf("provider %s not available", providerName)
	}

	if !provider.IsConfigured() {
		return nil, 0, fmt.Errorf("provider %s not configured", providerName)
	}

	embedding, tokenCount, err := provider.GenerateEmbedding(text)
	if err != nil {
		return nil, 0, fmt.Errorf("provider %s failed: %v", providerName, err)
	}

	log.Printf("Generated embedding with %d dimensions, %d tokens for text length: %d using %s", 
		len(embedding), tokenCount, len(text), providerName)
	
	return embedding, tokenCount, nil
}

// GetAvailableProviders returns list of configured providers
func (es *EmbeddingService) GetAvailableProviders() []string {
	var providers []string
	for name, provider := range es.providers {
		if provider.IsConfigured() {
			providers = append(providers, name)
		}
	}
	return providers
}

// GetProviderStatus returns the status of all providers
func (es *EmbeddingService) GetProviderStatus() map[string]map[string]interface{} {
	status := make(map[string]map[string]interface{})
	
	for name, provider := range es.providers {
		status[name] = map[string]interface{}{
			"configured": provider.IsConfigured(),
			"model":      provider.GetModelName(),
			"dimensions": provider.GetDimensions(),
		}
	}
	
	return status
}

// SetDefaultProvider sets the default embedding provider
func (es *EmbeddingService) SetDefaultProvider(providerName string) error {
	if _, exists := es.providers[providerName]; !exists {
		return fmt.Errorf("provider %s not available", providerName)
	}
	
	if !es.providers[providerName].IsConfigured() {
		return fmt.Errorf("provider %s not configured", providerName)
	}
	
	es.defaultProvider = providerName
	return nil
}

// ReloadConfig reloads AI configuration from database and reinitializes providers
func (es *EmbeddingService) ReloadConfig() error {
	// Clear existing providers
	es.providers = make(map[string]EmbeddingProvider)
	
	// Reset default provider to initial value
	es.defaultProvider = "openai"
	
	// Reload database config (this may update defaultProvider)
	es.loadDatabaseConfig()
	
	// Reinitialize providers
	es.initializeProviders()
	
	// If the configured default provider is not available, try to use the first available provider
	if _, exists := es.providers[es.defaultProvider]; !exists && len(es.providers) > 0 {
		for providerName := range es.providers {
			es.defaultProvider = providerName
			log.Printf("Default provider '%s' not available, switched to '%s'", es.defaultProvider, providerName)
			break
		}
	}
	
	log.Printf("Reloaded AI configuration, default provider: %s, available providers: %v", es.defaultProvider, es.GetAvailableProviders())
	return nil
}

// ProcessArticleEmbeddings generates and stores embeddings for an article
func (es *EmbeddingService) ProcessArticleEmbeddings(articleID uint) error {
	// Get article from database
	var article models.Article
	result := database.DB.Preload("Translations").First(&article, articleID)
	if result.Error != nil {
		return fmt.Errorf("article not found: %v", result.Error)
	}

	// Process main article content
	if err := es.processArticleContent(article, article.DefaultLang); err != nil {
		log.Printf("Error processing main article content: %v", err)
	}

	// Process translations
	for _, translation := range article.Translations {
		if err := es.processTranslationContent(article, translation); err != nil {
			log.Printf("Error processing translation content (%s): %v", translation.Language, err)
		}
	}

	return nil
}

// processArticleContent generates embeddings for the main article content
func (es *EmbeddingService) processArticleContent(article models.Article, language string) error {
	// Process different content types
	contentTypes := map[string]string{
		"title":   article.Title,
		"content": article.Content,
		"summary": article.Summary,
	}

	// Create combined content for comprehensive search
	combinedContent := fmt.Sprintf("%s\n\n%s\n\n%s", article.Title, article.Summary, article.Content)
	contentTypes["combined"] = combinedContent

	for contentType, text := range contentTypes {
		if strings.TrimSpace(text) == "" {
			continue
		}

		if err := es.generateAndStoreEmbedding(article.ID, contentType, language, text); err != nil {
			return fmt.Errorf("failed to process %s: %v", contentType, err)
		}
	}

	return nil
}

// processTranslationContent generates embeddings for translated content
func (es *EmbeddingService) processTranslationContent(article models.Article, translation models.ArticleTranslation) error {
	contentTypes := map[string]string{
		"title":   translation.Title,
		"content": translation.Content,
		"summary": translation.Summary,
	}

	// Create combined content for comprehensive search
	combinedContent := fmt.Sprintf("%s\n\n%s\n\n%s", translation.Title, translation.Summary, translation.Content)
	contentTypes["combined"] = combinedContent

	for contentType, text := range contentTypes {
		if strings.TrimSpace(text) == "" {
			continue
		}

		if err := es.generateAndStoreEmbedding(article.ID, contentType, translation.Language, text); err != nil {
			return fmt.Errorf("failed to process translation %s: %v", contentType, err)
		}
	}

	return nil
}

// generateAndStoreEmbedding generates embedding and stores it in database
func (es *EmbeddingService) generateAndStoreEmbedding(articleID uint, contentType, language, text string) error {
	// Generate content hash
	hash := sha256.Sum256([]byte(text))
	contentHash := fmt.Sprintf("%x", hash)

	// Check if embedding already exists for this content
	var existingEmbedding models.ArticleEmbedding
	result := database.DB.Where("article_id = ? AND content_type = ? AND language = ? AND content_hash = ?", 
		articleID, contentType, language, contentHash).First(&existingEmbedding)
	
	if result.Error == nil {
		log.Printf("Embedding already exists for article %d, content_type: %s, language: %s", articleID, contentType, language)
		return nil
	}

	// Generate embedding using default provider
	embedding, tokenCount, err := es.GenerateEmbedding(text)
	if err != nil {
		return fmt.Errorf("failed to generate embedding: %v", err)
	}

	// Get current provider info
	provider := es.providers[es.defaultProvider]
	providerName := es.defaultProvider
	modelName := "unknown"
	if provider != nil {
		modelName = provider.GetModelName()
	}

	// Convert embedding to JSON string
	embeddingJSON, err := json.Marshal(embedding)
	if err != nil {
		return fmt.Errorf("failed to marshal embedding: %v", err)
	}

	// Store in database
	articleEmbedding := models.ArticleEmbedding{
		ArticleID:   articleID,
		ContentType: contentType,
		Language:    language,
		Provider:    providerName,
		Model:       modelName,
		Embedding:   string(embeddingJSON),
		Dimensions:  len(embedding),
		ContentHash: contentHash,
		TokenCount:  tokenCount,
	}

	if err := database.DB.Create(&articleEmbedding).Error; err != nil {
		return fmt.Errorf("failed to store embedding: %v", err)
	}

	// Track AI usage for cost and analytics
	cost := es.calculateEmbeddingCost(providerName, tokenCount)
	usageMetrics := UsageMetrics{
		ServiceType:   "embedding",
		Provider:      providerName,
		Model:         modelName,
		Operation:     "generate_embedding",
		InputTokens:   tokenCount,
		OutputTokens:  0, // Embeddings don't have output tokens
		TotalTokens:   tokenCount,
		EstimatedCost: cost,
		Currency:      "USD",
		Language:      language,
		InputLength:   len(text),
		OutputLength:  len(embeddingJSON),
		ResponseTime:  0, // Could be measured in the future
		Success:       true,
		ArticleID:     &articleID,
	}
	
	if err := es.usageTracker.TrackUsage(usageMetrics); err != nil {
		log.Printf("Failed to track embedding usage: %v", err)
		// Don't fail the operation if usage tracking fails
	}

	log.Printf("Generated and stored embedding for article %d, content_type: %s, language: %s (tokens: %d, cost: $%.6f)", 
		articleID, contentType, language, tokenCount, cost)
	return nil
}

// SearchSimilarArticles performs semantic search using vector similarity
func (es *EmbeddingService) SearchSimilarArticles(query string, language string, limit int, threshold float64) ([]models.EmbeddingSearchResult, error) {
	// Generate embedding for search query
	queryEmbedding, tokenCount, err := es.GenerateEmbedding(query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %v", err)
	}

	// Track search query usage
	cost := es.calculateEmbeddingCost(es.defaultProvider, tokenCount)
	usageMetrics := UsageMetrics{
		ServiceType:   "embedding",
		Provider:      es.defaultProvider,
		Model:         es.getProviderModel(es.defaultProvider),
		Operation:     "search_query_embedding",
		InputTokens:   tokenCount,
		OutputTokens:  0,
		TotalTokens:   tokenCount,
		EstimatedCost: cost,
		Currency:      "USD",
		Language:      language,
		InputLength:   len(query),
		OutputLength:  0,
		ResponseTime:  0,
		Success:       true,
	}
	
	if err := es.usageTracker.TrackUsage(usageMetrics); err != nil {
		log.Printf("Failed to track search embedding usage: %v", err)
	}

	// Get all embeddings for the specified language
	var embeddings []models.ArticleEmbedding
	result := database.DB.Where("language = ? AND content_type = ?", language, "combined").Find(&embeddings)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to fetch embeddings: %v", result.Error)
	}

	// Calculate similarities
	type similarityResult struct {
		ArticleID  uint
		Similarity float64
	}

	var similarities []similarityResult
	for _, embedding := range embeddings {
		// Parse stored embedding
		var storedEmbedding []float64
		if err := json.Unmarshal([]byte(embedding.Embedding), &storedEmbedding); err != nil {
			log.Printf("Failed to parse embedding for article %d: %v", embedding.ArticleID, err)
			continue
		}

		// Calculate cosine similarity
		similarity := cosineSimilarity(queryEmbedding, storedEmbedding)
		if similarity >= threshold {
			similarities = append(similarities, similarityResult{
				ArticleID:  embedding.ArticleID,
				Similarity: similarity,
			})
		}
	}

	// Sort by similarity (descending)
	sort.Slice(similarities, func(i, j int) bool {
		return similarities[i].Similarity > similarities[j].Similarity
	})

	// Limit results
	if limit > 0 && len(similarities) > limit {
		similarities = similarities[:limit]
	}

	// Fetch article details
	var results []models.EmbeddingSearchResult
	for _, sim := range similarities {
		var article models.Article
		
		// Get article with category
		if err := database.DB.Preload("Category").First(&article, sim.ArticleID).Error; err != nil {
			log.Printf("Failed to fetch article %d: %v", sim.ArticleID, err)
			continue
		}

		result := models.EmbeddingSearchResult{
			ArticleID:    article.ID,
			Title:        article.Title,
			Summary:      article.Summary,
			CategoryName: article.Category.Name,
			Language:     language,
			Similarity:   sim.Similarity,
			ViewCount:    article.ViewCount,
			CreatedAt:    article.CreatedAt,
		}

		// If language is not the default language, try to get translation
		if language != article.DefaultLang {
			var translation models.ArticleTranslation
			if err := database.DB.Where("article_id = ? AND language = ?", article.ID, language).First(&translation).Error; err == nil {
				result.Title = translation.Title
				result.Summary = translation.Summary
			}
		}

		results = append(results, result)
	}

	return results, nil
}

// BatchProcessAllArticles processes embeddings for all articles
func (es *EmbeddingService) BatchProcessAllArticles() error {
	var articles []models.Article
	if err := database.DB.Find(&articles).Error; err != nil {
		return fmt.Errorf("failed to fetch articles: %v", err)
	}

	log.Printf("Processing embeddings for %d articles", len(articles))
	
	for _, article := range articles {
		if err := es.ProcessArticleEmbeddings(article.ID); err != nil {
			log.Printf("Failed to process embeddings for article %d: %v", article.ID, err)
		}
	}

	// Update search index
	es.updateSearchIndex("embedding", "all")
	
	return nil
}

// updateSearchIndex updates the search index statistics
func (es *EmbeddingService) updateSearchIndex(indexType, language string) {
	var count int64
	database.DB.Model(&models.ArticleEmbedding{}).Where("language = ?", language).Count(&count)

	var searchIndex models.SearchIndex
	result := database.DB.Where("index_type = ? AND language = ?", indexType, language).First(&searchIndex)
	
	if result.Error != nil {
		// Create new index record
		searchIndex = models.SearchIndex{
			IndexType:      indexType,
			Language:       language,
			TotalDocuments: int(count),
			LastUpdated:    time.Now(),
			LastRebuild:    time.Now(),
		}
		database.DB.Create(&searchIndex)
	} else {
		// Update existing record
		searchIndex.TotalDocuments = int(count)
		searchIndex.LastUpdated = time.Now()
		database.DB.Save(&searchIndex)
	}
}

// cosineSimilarity calculates cosine similarity between two vectors
func cosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) {
		return 0.0
	}

	var dotProduct, normA, normB float64
	for i := 0; i < len(a); i++ {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0.0 || normB == 0.0 {
		return 0.0
	}

	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}

// GetEmbeddingStats returns statistics about embeddings
func (es *EmbeddingService) GetEmbeddingStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total embeddings count
	var totalCount int64
	database.DB.Model(&models.ArticleEmbedding{}).Count(&totalCount)
	stats["total_embeddings"] = totalCount

	// Count by language
	var languageStats []struct {
		Language string `json:"language"`
		Count    int64  `json:"count"`
	}
	database.DB.Model(&models.ArticleEmbedding{}).
		Select("language, COUNT(*) as count").
		Group("language").
		Scan(&languageStats)
	stats["by_language"] = languageStats

	// Count by content type
	var contentTypeStats []struct {
		ContentType string `json:"content_type"`
		Count       int64  `json:"count"`
	}
	database.DB.Model(&models.ArticleEmbedding{}).
		Select("content_type, COUNT(*) as count").
		Group("content_type").
		Scan(&contentTypeStats)
	stats["by_content_type"] = contentTypeStats

	// Latest update
	var latestEmbedding models.ArticleEmbedding
	if err := database.DB.Order("created_at DESC").First(&latestEmbedding).Error; err == nil {
		stats["latest_update"] = latestEmbedding.CreatedAt
	}

	return stats, nil
}

// VectorData represents a 2D vector point for visualization
type VectorData struct {
	ID          uint     `json:"id"`
	ArticleID   uint     `json:"article_id"`
	Title       string   `json:"title"`
	Language    string   `json:"language"`
	ContentType string   `json:"content_type"`
	X           float64  `json:"x"`
	Y           float64  `json:"y"`
	CreatedAt   string   `json:"created_at"`
}

// GraphNode represents a node in the similarity graph
type GraphNode struct {
	ID        uint   `json:"id"`
	ArticleID uint   `json:"article_id"`
	Title     string `json:"title"`
	Language  string `json:"language"`
	Size      int    `json:"size"` // Based on article length or importance
}

// GraphEdge represents an edge in the similarity graph
type GraphEdge struct {
	Source     uint    `json:"source"`
	Target     uint    `json:"target"`
	Similarity float64 `json:"similarity"`
	Weight     float64 `json:"weight"`
}

// SimilarityGraph represents the complete graph data
type SimilarityGraph struct {
	Nodes []GraphNode `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
}

// QualityMetrics represents embedding quality analysis
type QualityMetrics struct {
	TotalVectors      int                    `json:"total_vectors"`
	AverageNorm       float64                `json:"average_norm"`
	VectorDistribution map[string]int        `json:"vector_distribution"`
	SimilarityStats   map[string]float64     `json:"similarity_stats"`
	Outliers          []VectorData           `json:"outliers"`
	ClusterStats      map[string]interface{} `json:"cluster_stats"`
}

// RAGProcessStep represents a step in the RAG process
type RAGProcessStep struct {
	Step        string      `json:"step"`
	Description string      `json:"description"`
	Duration    int64       `json:"duration_ms"`
	Data        interface{} `json:"data"`
}

// RAGProcessVisualization represents the complete RAG process data
type RAGProcessVisualization struct {
	QueryVector    []float64        `json:"query_vector"`
	Steps          []RAGProcessStep `json:"steps"`
	RetrievedDocs  []VectorData     `json:"retrieved_docs"`
	SimilarityMap  map[uint]float64 `json:"similarity_map"`
}

// GetReducedVectors returns vectors reduced to 2D for visualization
func (es *EmbeddingService) GetReducedVectors(method string, dimensions int, limit int) ([]VectorData, error) {
	// Get embeddings from database
	var embeddings []models.ArticleEmbedding
	query := database.DB.Preload("Article").Limit(limit).Order("created_at DESC")
	if err := query.Find(&embeddings).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch embeddings: %v", err)
	}

	if len(embeddings) == 0 {
		return []VectorData{}, nil
	}

	// Extract vectors and metadata
	vectors := make([][]float64, len(embeddings))
	vectorData := make([]VectorData, len(embeddings))
	
	for i, emb := range embeddings {
		if err := json.Unmarshal([]byte(emb.Embedding), &vectors[i]); err != nil {
			log.Printf("Failed to unmarshal vector for embedding %d: %v", emb.ID, err)
			continue
		}

		title := "Unknown"
		if emb.Article.ID != 0 {
			title = emb.Article.Title
		}

		vectorData[i] = VectorData{
			ID:          emb.ID,
			ArticleID:   emb.ArticleID,
			Title:       title,
			Language:    emb.Language,
			ContentType: emb.ContentType,
			CreatedAt:   emb.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	// Apply dimensionality reduction
	reducedVectors, err := es.applyDimensionalityReduction(vectors, method, dimensions)
	if err != nil {
		return nil, fmt.Errorf("dimensionality reduction failed: %v", err)
	}

	// Assign reduced coordinates
	for i, reduced := range reducedVectors {
		if i < len(vectorData) && len(reduced) >= 2 {
			vectorData[i].X = reduced[0]
			vectorData[i].Y = reduced[1]
		}
	}

	return vectorData, nil
}

// applyDimensionalityReduction applies PCA as a simple reduction method
func (es *EmbeddingService) applyDimensionalityReduction(vectors [][]float64, method string, dimensions int) ([][]float64, error) {
	if len(vectors) == 0 {
		return [][]float64{}, nil
	}

	// For now, implement simple PCA-like projection
	// In a production system, you might want to use proper t-SNE or UMAP libraries
	return es.simplePCA(vectors, dimensions)
}

// simplePCA implements a basic PCA for dimensionality reduction
func (es *EmbeddingService) simplePCA(vectors [][]float64, targetDim int) ([][]float64, error) {
	if len(vectors) == 0 || len(vectors[0]) == 0 {
		return [][]float64{}, nil
	}

	n := len(vectors)
	dim := len(vectors[0])
	
	// Center the data
	means := make([]float64, dim)
	for i := 0; i < dim; i++ {
		sum := 0.0
		for j := 0; j < n; j++ {
			sum += vectors[j][i]
		}
		means[i] = sum / float64(n)
	}

	// Subtract means
	centered := make([][]float64, n)
	for i := 0; i < n; i++ {
		centered[i] = make([]float64, dim)
		for j := 0; j < dim; j++ {
			centered[i][j] = vectors[i][j] - means[j]
		}
	}

	// Simple projection to first two dimensions with some scaling
	result := make([][]float64, n)
	for i := 0; i < n; i++ {
		result[i] = make([]float64, targetDim)
		if targetDim >= 1 && dim > 0 {
			result[i][0] = centered[i][0] * 100 // Scale for visualization
		}
		if targetDim >= 2 && dim > 1 {
			result[i][1] = centered[i][1] * 100 // Scale for visualization
		}
	}

	return result, nil
}

// GetSimilarityGraph returns similarity relationships between articles
func (es *EmbeddingService) GetSimilarityGraph(threshold float64, maxNodes int) (*SimilarityGraph, error) {
	// Get embeddings
	var embeddings []models.ArticleEmbedding
	query := database.DB.Preload("Article").Limit(maxNodes).Order("created_at DESC")
	if err := query.Find(&embeddings).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch embeddings: %v", err)
	}

	// Parse vectors
	vectors := make([][]float64, len(embeddings))
	for i, emb := range embeddings {
		if err := json.Unmarshal([]byte(emb.Embedding), &vectors[i]); err != nil {
			log.Printf("Failed to unmarshal vector for embedding %d: %v", emb.ID, err)
			continue
		}
	}

	// Create nodes
	nodes := make([]GraphNode, len(embeddings))
	for i, emb := range embeddings {
		title := "Unknown"
		size := 10 // Default size
		if emb.Article.ID != 0 {
			title = emb.Article.Title
			size = min(50, max(10, len(emb.Article.Content)/100)) // Size based on content length
		}

		nodes[i] = GraphNode{
			ID:        emb.ID,
			ArticleID: emb.ArticleID,
			Title:     title,
			Language:  emb.Language,
			Size:      size,
		}
	}

	// Calculate similarities and create edges
	var edges []GraphEdge
	for i := 0; i < len(vectors); i++ {
		for j := i + 1; j < len(vectors); j++ {
			if len(vectors[i]) == 0 || len(vectors[j]) == 0 {
				continue
			}

			similarity := cosineSimilarity(vectors[i], vectors[j])
			if similarity >= threshold {
				edges = append(edges, GraphEdge{
					Source:     embeddings[i].ID,
					Target:     embeddings[j].ID,
					Similarity: similarity,
					Weight:     similarity * 10, // Scale weight for visualization
				})
			}
		}
	}

	return &SimilarityGraph{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

// GetQualityMetrics returns embedding quality analysis
func (es *EmbeddingService) GetQualityMetrics() (*QualityMetrics, error) {
	// Get all embeddings
	var embeddings []models.ArticleEmbedding
	if err := database.DB.Find(&embeddings).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch embeddings: %v", err)
	}

	if len(embeddings) == 0 {
		return &QualityMetrics{
			TotalVectors:       0,
			VectorDistribution: make(map[string]int),
			SimilarityStats:    make(map[string]float64),
			Outliers:           []VectorData{},
			ClusterStats:       make(map[string]interface{}),
		}, nil
	}

	// Parse vectors and calculate metrics
	vectors := make([][]float64, 0, len(embeddings))
	norms := make([]float64, 0, len(embeddings))
	
	for _, emb := range embeddings {
		var vector []float64
		if err := json.Unmarshal([]byte(emb.Embedding), &vector); err != nil {
			continue
		}
		
		vectors = append(vectors, vector)
		
		// Calculate vector norm
		norm := 0.0
		for _, val := range vector {
			norm += val * val
		}
		norms = append(norms, math.Sqrt(norm))
	}

	// Calculate average norm
	avgNorm := 0.0
	for _, norm := range norms {
		avgNorm += norm
	}
	avgNorm /= float64(len(norms))

	// Calculate similarity statistics (sample)
	similarities := make([]float64, 0)
	sampleSize := min(100, len(vectors)) // Sample for performance
	for i := 0; i < sampleSize; i++ {
		for j := i + 1; j < sampleSize; j++ {
			if len(vectors[i]) > 0 && len(vectors[j]) > 0 {
				sim := cosineSimilarity(vectors[i], vectors[j])
				similarities = append(similarities, sim)
			}
		}
	}

	// Calculate similarity stats
	simStats := make(map[string]float64)
	if len(similarities) > 0 {
		sort.Float64s(similarities)
		simStats["min"] = similarities[0]
		simStats["max"] = similarities[len(similarities)-1]
		simStats["median"] = similarities[len(similarities)/2]
		
		sum := 0.0
		for _, sim := range similarities {
			sum += sim
		}
		simStats["mean"] = sum / float64(len(similarities))
	}

	// Vector distribution by language
	distribution := make(map[string]int)
	for _, emb := range embeddings {
		distribution[emb.Language]++
	}

	return &QualityMetrics{
		TotalVectors:       len(embeddings),
		AverageNorm:        avgNorm,
		VectorDistribution: distribution,
		SimilarityStats:    simStats,
		Outliers:           []VectorData{}, // Could implement outlier detection
		ClusterStats:       make(map[string]interface{}),
	}, nil
}

// GetRAGProcessVisualization provides data for RAG process visualization
func (es *EmbeddingService) GetRAGProcessVisualization(query string, language string, limit int) (*RAGProcessVisualization, error) {
	// Step 1: Generate query embedding
	step1Start := time.Now()
	queryVector, _, err := es.GenerateEmbedding(query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %v", err)
	}
	step1Duration := time.Since(step1Start).Milliseconds()

	// Step 2: Retrieve similar documents
	step2Start := time.Now()
	results, err := es.SearchSimilarArticles(query, language, limit, 0.0)
	if err != nil {
		return nil, fmt.Errorf("failed to search embeddings: %v", err)
	}
	step2Duration := time.Since(step2Start).Milliseconds()

	// Convert results to VectorData format
	retrievedDocs := make([]VectorData, len(results))
	similarityMap := make(map[uint]float64)
	
	for i, result := range results {
		retrievedDocs[i] = VectorData{
			ID:          0, // No embedding ID in search result
			ArticleID:   result.ArticleID,
			Title:       result.Title,
			Language:    result.Language,
			ContentType: "article", // Default content type
		}
		similarityMap[result.ArticleID] = result.Similarity
	}

	// Create process steps
	steps := []RAGProcessStep{
		{
			Step:        "query_embedding",
			Description: "Convert query text to vector embedding",
			Duration:    step1Duration,
			Data: map[string]interface{}{
				"query":        query,
				"vector_size":  len(queryVector),
			},
		},
		{
			Step:        "similarity_search",
			Description: "Search for similar document embeddings",
			Duration:    step2Duration,
			Data: map[string]interface{}{
				"candidates_found": len(results),
				"search_threshold": 0.0,
			},
		},
		{
			Step:        "ranking",
			Description: "Rank results by similarity score",
			Duration:    0, // Instantaneous
			Data: map[string]interface{}{
				"final_results": len(retrievedDocs),
			},
		},
	}

	return &RAGProcessVisualization{
		QueryVector:   queryVector,
		Steps:         steps,
		RetrievedDocs: retrievedDocs,
		SimilarityMap: similarityMap,
	}, nil
}

// calculateEmbeddingCost estimates the cost of embedding generation based on provider and tokens
func (es *EmbeddingService) calculateEmbeddingCost(provider string, tokens int) float64 {
	// Cost per 1K tokens for different providers (as of 2024)
	var costPer1K float64
	
	switch provider {
	case "openai":
		// OpenAI text-embedding-ada-002: $0.0001 per 1K tokens
		costPer1K = 0.0001
	case "gemini":
		// Google Gemini text-embedding-004: $0.00001 per 1K tokens
		costPer1K = 0.00001
	default:
		// Default fallback cost
		costPer1K = 0.0001
	}
	
	// Calculate cost: (tokens / 1000) * cost_per_1k
	return (float64(tokens) / 1000.0) * costPer1K
}

// getProviderModel returns the model name for a given provider
func (es *EmbeddingService) getProviderModel(providerName string) string {
	if provider, exists := es.providers[providerName]; exists {
		return provider.GetModelName()
	}
	return "unknown"
}

// Helper functions
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}