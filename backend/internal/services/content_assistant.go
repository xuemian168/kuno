package services

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"regexp"
	"sort"
	"strings"
	"time"
)

// ContentAssistant provides AI-powered content creation assistance
type ContentAssistant struct {
	embeddingService *EmbeddingService
	cache           *SmartCache
	usageTracker    *AIUsageTracker
}

// TopicGap represents a content gap in the knowledge base
type TopicGap struct {
	Topic          string   `json:"topic"`
	Description    string   `json:"description"`
	RelatedTopics  []string `json:"related_topics"`
	Priority       float64  `json:"priority"`       // 0-1, higher is more important
	Language       string   `json:"language"`
	SuggestedTitles []string `json:"suggested_titles"`
	Keywords       []string `json:"keywords"`
}

// WritingIdea represents a writing inspiration suggestion
type WritingIdea struct {
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Category       string   `json:"category"`
	Keywords       []string `json:"keywords"`
	DifficultyLevel string  `json:"difficulty_level"` // beginner, intermediate, advanced
	EstimatedLength int     `json:"estimated_length"`  // words
	Inspiration    string   `json:"inspiration"`       // why this idea is relevant
	Language       string   `json:"language"`
	RelevanceScore float64  `json:"relevance_score"`
}

// SmartTag represents an AI-generated tag with confidence
type SmartTag struct {
	Tag        string  `json:"tag"`
	Confidence float64 `json:"confidence"`
	Type       string  `json:"type"` // topic, technology, concept, etc.
	Context    string  `json:"context"` // where this tag was derived from
}

// SEOKeyword represents an SEO keyword recommendation
type SEOKeyword struct {
	Keyword        string  `json:"keyword"`
	SearchVolume   int     `json:"search_volume"`   // estimated monthly searches
	Difficulty     float64 `json:"difficulty"`      // 0-1, higher is more competitive
	Relevance      float64 `json:"relevance"`       // 0-1, relevance to content
	Type           string  `json:"type"`            // primary, secondary, long-tail
	Suggestions    []string `json:"suggestions"`    // how to use this keyword
	Language       string  `json:"language"`
}

// ContentGapAnalysis represents overall content gap analysis
type ContentGapAnalysis struct {
	TotalArticles     int                      `json:"total_articles"`
	LanguageDistribution map[string]int        `json:"language_distribution"`
	TopicClusters     []TopicCluster           `json:"topic_clusters"`
	IdentifiedGaps    []TopicGap               `json:"identified_gaps"`
	Recommendations   []WritingIdea            `json:"recommendations"`
	CoverageScore     float64                  `json:"coverage_score"` // 0-1
	GeneratedAt       time.Time                `json:"generated_at"`
}

// TopicCluster represents a cluster of similar topics
type TopicCluster struct {
	Name        string   `json:"name"`
	Articles    []uint   `json:"articles"`    // article IDs
	Keywords    []string `json:"keywords"`
	Centroid    []float64 `json:"centroid"`   // cluster center vector
	Size        int      `json:"size"`
	Coherence   float64  `json:"coherence"`  // how well articles cluster together
}

// NewContentAssistant creates a new content assistant instance
func NewContentAssistant() *ContentAssistant {
	return &ContentAssistant{
		embeddingService: GetGlobalEmbeddingService(),
		cache:           GetGlobalCache(),
		usageTracker:    NewAIUsageTracker(),
	}
}

// AnalyzeTopicGaps analyzes content gaps in the knowledge base
func (ca *ContentAssistant) AnalyzeTopicGaps(language string) (*ContentGapAnalysis, error) {
	cacheKey := fmt.Sprintf("topic_gaps_%s_%d", language, time.Now().Unix()/3600)
	
	// Try cache first
	if cached, exists := ca.cache.Get(cacheKey); exists {
		if analysis, ok := cached.(*ContentGapAnalysis); ok {
			return analysis, nil
		}
	}
	
	// Get all articles with embeddings
	var embeddings []models.ArticleEmbedding
	query := database.DB.Preload("Article").Where("language = ? AND content_type = ?", language, "combined")
	if err := query.Find(&embeddings).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch embeddings: %v", err)
	}
	
	if len(embeddings) == 0 {
		return &ContentGapAnalysis{
			TotalArticles:     0,
			LanguageDistribution: make(map[string]int),
			TopicClusters:     []TopicCluster{},
			IdentifiedGaps:    []TopicGap{},
			Recommendations:   []WritingIdea{},
			CoverageScore:     0,
			GeneratedAt:       time.Now(),
		}, nil
	}
	
	// Perform clustering analysis
	clusters, err := ca.performTopicClustering(embeddings)
	if err != nil {
		return nil, fmt.Errorf("clustering failed: %v", err)
	}
	
	// Identify gaps between clusters
	gaps := ca.identifyTopicGaps(clusters, language)
	
	// Generate writing recommendations
	recommendations, err := ca.generateWritingRecommendations(gaps, clusters, language)
	if err != nil {
		log.Printf("Failed to generate recommendations: %v", err)
		recommendations = []WritingIdea{} // Continue without recommendations
	}
	
	// Calculate language distribution
	langDistribution := make(map[string]int)
	for _, emb := range embeddings {
		langDistribution[emb.Language]++
	}
	
	// Calculate coverage score
	coverageScore := ca.calculateCoverageScore(clusters, gaps)
	
	analysis := &ContentGapAnalysis{
		TotalArticles:     len(embeddings),
		LanguageDistribution: langDistribution,
		TopicClusters:     clusters,
		IdentifiedGaps:    gaps,
		Recommendations:   recommendations,
		CoverageScore:     coverageScore,
		GeneratedAt:       time.Now(),
	}
	
	// Cache the result
	ca.cache.Set(cacheKey, analysis)
	
	return analysis, nil
}

// GetWritingInspiration generates writing ideas based on current content
func (ca *ContentAssistant) GetWritingInspiration(category string, language string, limit int) ([]WritingIdea, error) {
	cacheKey := fmt.Sprintf("writing_inspiration_%s_%s_%d", category, language, limit)
	
	// Try cache first
	if cached, exists := ca.cache.Get(cacheKey); exists {
		if ideas, ok := cached.([]WritingIdea); ok {
			return ideas, nil
		}
	}
	
	var ideas []WritingIdea
	
	// Get recent articles for inspiration
	var articles []models.Article
	query := database.DB.Where("default_lang = ?", language).Order("created_at DESC").Limit(50)
	if category != "" {
		query = query.Joins("JOIN categories ON articles.category_id = categories.id").
			Where("categories.name = ?", category)
	}
	
	if err := query.Find(&articles).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch articles: %v", err)
	}
	
	// Analyze existing content patterns
	patterns := ca.analyzeContentPatterns(articles)
	
	// Generate ideas based on patterns and gaps
	for i, pattern := range patterns {
		if i >= limit {
			break
		}
		
		idea := WritingIdea{
			Title:          ca.generateIdeaTitle(pattern, language),
			Description:    ca.generateIdeaDescription(pattern, language),
			Category:       category,
			Keywords:       pattern.Keywords,
			DifficultyLevel: ca.estimateDifficulty(pattern),
			EstimatedLength: ca.estimateLength(pattern),
			Inspiration:    ca.generateInspiration(pattern, language),
			Language:       language,
			RelevanceScore: pattern.Relevance,
		}
		
		ideas = append(ideas, idea)
	}
	
	// Store in database for future reference
	go ca.storeWritingSuggestions(ideas, "inspiration")
	
	// Cache the result
	ca.cache.Set(cacheKey, ideas)
	
	return ideas, nil
}

// GenerateSmartTags generates intelligent tags for content
func (ca *ContentAssistant) GenerateSmartTags(content string, language string) ([]SmartTag, error) {
	// Quick cache check
	contentHash := fmt.Sprintf("%x", sha256.Sum256([]byte(content)))
	cacheKey := fmt.Sprintf("smart_tags_%s", contentHash[:16])
	
	if cached, exists := ca.cache.Get(cacheKey); exists {
		if tags, ok := cached.([]SmartTag); ok {
			return tags, nil
		}
	}
	
	var tags []SmartTag
	
	// Extract key phrases and concepts
	keyPhrases := ca.extractKeyPhrases(content, language)
	log.Printf("Extracted %d key phrases for language %s", len(keyPhrases), language)
	
	// Analyze content with embeddings for semantic tags
	if ca.embeddingService != nil {
		semanticTags, err := ca.generateSemanticTags(content, language)
		if err == nil {
			tags = append(tags, semanticTags...)
			log.Printf("Generated %d semantic tags", len(semanticTags))
		} else {
			log.Printf("Failed to generate semantic tags: %v", err)
		}
	} else {
		log.Printf("Embedding service not available")
	}
	
	// Generate topic-based tags
	topicTags := ca.generateTopicTags(keyPhrases, language)
	tags = append(tags, topicTags...)
	log.Printf("Generated %d topic tags", len(topicTags))
	
	// Generate technical/domain-specific tags
	techTags := ca.generateTechnicalTags(content, language)
	tags = append(tags, techTags...)
	log.Printf("Generated %d technical tags", len(techTags))
	
	// Sort by confidence and remove duplicates
	tags = ca.dedupAndSortTags(tags)
	
	// Fallback mechanism: if no tags were generated, create basic tags
	if len(tags) == 0 {
		log.Printf("No tags generated for content, using fallback mechanism")
		tags = ca.generateFallbackTags(content, language)
	}
	
	// Limit to top 10 most confident tags
	if len(tags) > 10 {
		tags = tags[:10]
	}
	
	// Cache the result
	ca.cache.Set(cacheKey, tags)
	
	return tags, nil
}

// RecommendSEOKeywords recommends SEO keywords for content
func (ca *ContentAssistant) RecommendSEOKeywords(content string, targetLanguage string, primaryKeyword string) ([]SEOKeyword, error) {
	contentHash := fmt.Sprintf("%x", sha256.Sum256([]byte(content+primaryKeyword)))
	cacheKey := fmt.Sprintf("seo_keywords_%s", contentHash[:16])
	
	if cached, exists := ca.cache.Get(cacheKey); exists {
		if keywords, ok := cached.([]SEOKeyword); ok {
			return keywords, nil
		}
	}
	
	var keywords []SEOKeyword
	
	// Extract content keywords
	contentKeywords := ca.extractKeywords(content, targetLanguage)
	
	// Analyze keyword density and relevance
	densityMap := ca.calculateKeywordDensity(content, contentKeywords)
	
	// Generate keyword variations
	if primaryKeyword != "" {
		variations := ca.generateKeywordVariations(primaryKeyword, targetLanguage)
		contentKeywords = append(contentKeywords, variations...)
	}
	
	// Score and categorize keywords
	for _, keyword := range contentKeywords {
		seoKeyword := SEOKeyword{
			Keyword:        keyword,
			SearchVolume:   ca.estimateSearchVolume(keyword, targetLanguage),
			Difficulty:     ca.estimateKeywordDifficulty(keyword, targetLanguage),
			Relevance:      densityMap[keyword],
			Type:           ca.categorizeKeyword(keyword, primaryKeyword),
			Suggestions:    ca.generateKeywordSuggestions(keyword, content),
			Language:       targetLanguage,
		}
		
		// Only include keywords with reasonable relevance
		if seoKeyword.Relevance > 0.1 {
			keywords = append(keywords, seoKeyword)
		}
	}
	
	// Sort by relevance and potential value
	sort.Slice(keywords, func(i, j int) bool {
		scoreI := keywords[i].Relevance * (1 - keywords[i].Difficulty) * math.Log(float64(keywords[i].SearchVolume+1))
		scoreJ := keywords[j].Relevance * (1 - keywords[j].Difficulty) * math.Log(float64(keywords[j].SearchVolume+1))
		return scoreI > scoreJ
	})
	
	// Limit to top 15 keywords
	if len(keywords) > 15 {
		keywords = keywords[:15]
	}
	
	// Cache the result
	ca.cache.Set(cacheKey, keywords)
	
	return keywords, nil
}

// Helper methods for content analysis

// performTopicClustering clusters articles by topic similarity
func (ca *ContentAssistant) performTopicClustering(embeddings []models.ArticleEmbedding) ([]TopicCluster, error) {
	if len(embeddings) < 2 {
		return []TopicCluster{}, nil
	}
	
	// Parse vectors
	vectors := make([][]float64, len(embeddings))
	for i, emb := range embeddings {
		if err := json.Unmarshal([]byte(emb.Embedding), &vectors[i]); err != nil {
			return nil, fmt.Errorf("failed to parse vector %d: %v", i, err)
		}
	}
	
	// Simple k-means clustering (k = sqrt(n/2))
	k := int(math.Sqrt(float64(len(embeddings)) / 2))
	if k < 1 {
		k = 1
	}
	if k > 10 {
		k = 10 // Limit to reasonable number of clusters
	}
	
	clusters := ca.kMeansClustering(vectors, embeddings, k)
	return clusters, nil
}

// kMeansClustering performs k-means clustering on vectors
func (ca *ContentAssistant) kMeansClustering(vectors [][]float64, embeddings []models.ArticleEmbedding, k int) []TopicCluster {
	if len(vectors) == 0 || k <= 0 {
		return []TopicCluster{}
	}
	
	dim := len(vectors[0])
	
	// Initialize centroids randomly
	centroids := make([][]float64, k)
	for i := 0; i < k; i++ {
		centroids[i] = make([]float64, dim)
		// Use first k vectors as initial centroids
		if i < len(vectors) {
			copy(centroids[i], vectors[i])
		}
	}
	
	assignments := make([]int, len(vectors))
	
	// Iterate until convergence (max 10 iterations for performance)
	for iter := 0; iter < 10; iter++ {
		changed := false
		
		// Assign points to nearest centroid
		for i, vector := range vectors {
			minDist := math.Inf(1)
			minCluster := 0
			
			for j, centroid := range centroids {
				dist := ca.euclideanDistance(vector, centroid)
				if dist < minDist {
					minDist = dist
					minCluster = j
				}
			}
			
			if assignments[i] != minCluster {
				assignments[i] = minCluster
				changed = true
			}
		}
		
		if !changed {
			break
		}
		
		// Update centroids
		for j := 0; j < k; j++ {
			count := 0
			for d := 0; d < dim; d++ {
				centroids[j][d] = 0
			}
			
			for i, assignment := range assignments {
				if assignment == j {
					for d := 0; d < dim; d++ {
						centroids[j][d] += vectors[i][d]
					}
					count++
				}
			}
			
			if count > 0 {
				for d := 0; d < dim; d++ {
					centroids[j][d] /= float64(count)
				}
			}
		}
	}
	
	// Build clusters
	clusters := make([]TopicCluster, k)
	for i := 0; i < k; i++ {
		clusters[i] = TopicCluster{
			Name:     fmt.Sprintf("Topic Cluster %d", i+1),
			Articles: []uint{},
			Keywords: []string{},
			Centroid: centroids[i],
			Size:     0,
		}
	}
	
	// Assign articles to clusters
	for i, assignment := range assignments {
		if assignment >= 0 && assignment < k {
			clusters[assignment].Articles = append(clusters[assignment].Articles, embeddings[i].ArticleID)
			clusters[assignment].Size++
			
			// Extract keywords from article title
			if embeddings[i].Article.ID != 0 {
				title := embeddings[i].Article.Title
				keywords := ca.extractSimpleKeywords(title)
				clusters[assignment].Keywords = append(clusters[assignment].Keywords, keywords...)
			}
		}
	}
	
	// Deduplicate keywords and calculate coherence
	for i := range clusters {
		clusters[i].Keywords = ca.deduplicateStrings(clusters[i].Keywords)
		clusters[i].Coherence = ca.calculateClusterCoherence(vectors, assignments, i)
		
		// Generate better cluster name based on keywords
		if len(clusters[i].Keywords) > 0 {
			clusters[i].Name = ca.generateClusterName(clusters[i].Keywords)
		}
	}
	
	// Filter out empty clusters
	nonEmptyClusters := []TopicCluster{}
	for _, cluster := range clusters {
		if cluster.Size > 0 {
			nonEmptyClusters = append(nonEmptyClusters, cluster)
		}
	}
	
	return nonEmptyClusters
}

// euclideanDistance calculates Euclidean distance between two vectors
func (ca *ContentAssistant) euclideanDistance(a, b []float64) float64 {
	if len(a) != len(b) {
		return math.Inf(1)
	}
	
	sum := 0.0
	for i := 0; i < len(a); i++ {
		diff := a[i] - b[i]
		sum += diff * diff
	}
	
	return math.Sqrt(sum)
}

// calculateClusterCoherence calculates how well articles cluster together
func (ca *ContentAssistant) calculateClusterCoherence(vectors [][]float64, assignments []int, clusterID int) float64 {
	var clusterVectors [][]float64
	for i, assignment := range assignments {
		if assignment == clusterID {
			clusterVectors = append(clusterVectors, vectors[i])
		}
	}
	
	if len(clusterVectors) < 2 {
		return 1.0
	}
	
	// Calculate average pairwise distance within cluster
	totalDistance := 0.0
	count := 0
	
	for i := 0; i < len(clusterVectors); i++ {
		for j := i + 1; j < len(clusterVectors); j++ {
			distance := ca.euclideanDistance(clusterVectors[i], clusterVectors[j])
			totalDistance += distance
			count++
		}
	}
	
	if count == 0 {
		return 1.0
	}
	
	avgDistance := totalDistance / float64(count)
	// Convert to coherence score (lower distance = higher coherence)
	return 1.0 / (1.0 + avgDistance)
}

// identifyTopicGaps finds gaps between topic clusters
func (ca *ContentAssistant) identifyTopicGaps(clusters []TopicCluster, language string) []TopicGap {
	var gaps []TopicGap
	
	// Find gaps between clusters (areas not well covered)
	for i := 0; i < len(clusters); i++ {
		for j := i + 1; j < len(clusters); j++ {
			// Calculate distance between cluster centroids
			distance := ca.euclideanDistance(clusters[i].Centroid, clusters[j].Centroid)
			
			// If clusters are far apart, there might be a gap
			if distance > 0.5 && (clusters[i].Size < 3 || clusters[j].Size < 3) {
				gap := TopicGap{
					Topic:         fmt.Sprintf("Bridge between %s and %s", clusters[i].Name, clusters[j].Name),
					Description:   fmt.Sprintf("Content that connects %s with %s", clusters[i].Name, clusters[j].Name),
					RelatedTopics: append(clusters[i].Keywords, clusters[j].Keywords...),
					Priority:      distance * 0.5, // Higher distance = higher priority
					Language:      language,
					SuggestedTitles: ca.generateBridgeTitles(clusters[i], clusters[j], language),
					Keywords:      ca.mergeAndDeduplicateKeywords(clusters[i].Keywords, clusters[j].Keywords),
				}
				gaps = append(gaps, gap)
			}
		}
	}
	
	// Find underrepresented topics
	for _, cluster := range clusters {
		if cluster.Size < 2 { // Clusters with very few articles
			gap := TopicGap{
				Topic:         fmt.Sprintf("Expand %s", cluster.Name),
				Description:   fmt.Sprintf("More content needed about %s", cluster.Name),
				RelatedTopics: cluster.Keywords,
				Priority:      0.8, // High priority for underrepresented topics
				Language:      language,
				SuggestedTitles: ca.generateExpansionTitles(cluster, language),
				Keywords:      cluster.Keywords,
			}
			gaps = append(gaps, gap)
		}
	}
	
	// Sort gaps by priority
	sort.Slice(gaps, func(i, j int) bool {
		return gaps[i].Priority > gaps[j].Priority
	})
	
	// Limit to top 10 gaps
	if len(gaps) > 10 {
		gaps = gaps[:10]
	}
	
	return gaps
}

// Helper methods for keyword and content analysis continue...
// (The file is getting quite long, so I'll add the remaining helper methods in the next part)

// extractSimpleKeywords extracts basic keywords from text
func (ca *ContentAssistant) extractSimpleKeywords(text string) []string {
	// Simple keyword extraction - split by common delimiters and filter
	words := regexp.MustCompile(`[^\w\s]+`).ReplaceAllString(text, " ")
	words = strings.ToLower(words)
	tokens := strings.Fields(words)
	
	// Filter out common stop words and short words
	stopWords := map[string]bool{
		"the": true, "and": true, "or": true, "but": true, "in": true, "on": true, "at": true, "to": true, "for": true, "of": true, "with": true, "by": true, "is": true, "are": true, "was": true, "were": true, "be": true, "been": true, "have": true, "has": true, "had": true, "do": true, "does": true, "did": true, "will": true, "would": true, "could": true, "should": true,
		"一个": true, "这个": true, "那个": true, "我们": true, "它们": true, "这些": true, "那些": true, "可以": true, "应该": true, "需要": true, "已经": true, "正在": true, "如果": true, "因为": true, "所以": true, "但是": true, "然后": true, "现在": true, "之后": true, "之前": true,
	}
	
	var keywords []string
	for _, token := range tokens {
		if len(token) > 2 && !stopWords[token] {
			keywords = append(keywords, token)
		}
	}
	
	return keywords
}

// deduplicateStrings removes duplicate strings from slice
func (ca *ContentAssistant) deduplicateStrings(slice []string) []string {
	seen := make(map[string]bool)
	var result []string
	
	for _, item := range slice {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}
	
	return result
}

// generateClusterName creates a descriptive name for a cluster
func (ca *ContentAssistant) generateClusterName(keywords []string) string {
	if len(keywords) == 0 {
		return "General Topics"
	}
	
	// Take the most frequent/important keywords
	if len(keywords) > 3 {
		keywords = keywords[:3]
	}
	
	return strings.Join(keywords, " & ")
}

// More helper methods will be added in subsequent parts...
// (Due to length constraints, I'm splitting this into multiple files)

// Global content assistant instance
var globalContentAssistant *ContentAssistant

// GetGlobalContentAssistant returns the global content assistant instance
func GetGlobalContentAssistant() *ContentAssistant {
	if globalContentAssistant == nil {
		globalContentAssistant = NewContentAssistant()
	}
	return globalContentAssistant
}