package services

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"fmt"
	"log"
	"math"
	"sort"
	"strings"
	"time"
)

// RecommendationEngine provides personalized article recommendations
type RecommendationEngine struct {
	embeddingService *EmbeddingService
	behaviorTracker  *BehaviorTracker
	cache            *SmartCache
}

// RecommendationResult represents a recommended article with reasoning
type RecommendationResult struct {
	Article            models.Article `json:"article"`
	Confidence         float64        `json:"confidence"`     // 0-1, how confident we are in this recommendation
	ReasonType         string         `json:"reason_type"`    // Why this was recommended
	ReasonDetails      string         `json:"reason_details"` // Detailed explanation
	Similarity         float64        `json:"similarity"`     // Similarity score if applicable
	Position           int            `json:"position"`       // Position in recommendation list
	RecommendationType string         `json:"recommendation_type"`
	Category           string         `json:"category"`         // discovery, learning
	IsLearningPath     bool           `json:"is_learning_path"` // Whether this is part of a learning path
}

// ReadingPath represents a suggested sequence of articles
type ReadingPath struct {
	PathID      string                 `json:"path_id"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Articles    []RecommendationResult `json:"articles"`
	TotalTime   int                    `json:"total_time"` // Estimated total reading time
	Difficulty  string                 `json:"difficulty"` // beginner, intermediate, advanced
	Progress    float64                `json:"progress"`   // User's progress through this path (0-1)
	CreatedAt   time.Time              `json:"created_at"`
}

// RecommendationOptions contains options for generating recommendations
type RecommendationOptions struct {
	UserID        string   `json:"user_id"`
	Language      string   `json:"language"`
	Limit         int      `json:"limit"`
	ExcludeRead   bool     `json:"exclude_read"`   // Exclude articles user has already read
	IncludeReason bool     `json:"include_reason"` // Include reasoning in response
	MinConfidence float64  `json:"min_confidence"` // Minimum confidence threshold
	Categories    []string `json:"categories"`     // Filter by categories
	MaxAge        int      `json:"max_age"`        // Maximum article age in days
	Diversify     bool     `json:"diversify"`      // Ensure topic diversity
}

// NewRecommendationEngine creates a new recommendation engine
func NewRecommendationEngine() *RecommendationEngine {
	return &RecommendationEngine{
		embeddingService: GetGlobalEmbeddingService(),
		behaviorTracker:  GetGlobalBehaviorTracker(),
		cache:            GetGlobalCache(),
	}
}

// GetPersonalizedRecommendations generates personalized recommendations for a user
func (re *RecommendationEngine) GetPersonalizedRecommendations(options RecommendationOptions) ([]RecommendationResult, error) {
	if options.Limit <= 0 {
		options.Limit = 10
	}
	if options.Language == "" {
		options.Language = "en"
	}
	if options.MinConfidence <= 0 {
		options.MinConfidence = 0.1
	}

	// Generate language-specific cache key
	cacheKey := fmt.Sprintf("recommendations_%s_%s_%d_%t", options.UserID, options.Language, options.Limit, options.Diversify)

	// Check cache first
	if cached, exists := re.cache.Get(cacheKey); exists {
		if recommendations, ok := cached.([]RecommendationResult); ok {
			return recommendations, nil
		}
	}

	var allRecommendations []RecommendationResult

	// 1. Content-based recommendations (based on reading history)
	contentBased, err := re.getContentBasedRecommendations(options)
	if err != nil {
		log.Printf("Content-based recommendations failed: %v", err)
	} else {
		allRecommendations = append(allRecommendations, contentBased...)
	}

	// 2. Collaborative filtering recommendations (similar users)
	collaborative, err := re.getCollaborativeRecommendations(options)
	if err != nil {
		log.Printf("Collaborative recommendations failed: %v", err)
	} else {
		allRecommendations = append(allRecommendations, collaborative...)
	}

	// 3. Trending content recommendations
	trending, err := re.getTrendingRecommendations(options)
	if err != nil {
		log.Printf("Trending recommendations failed: %v", err)
	} else {
		allRecommendations = append(allRecommendations, trending...)
	}

	// 4. Serendipity recommendations (diverse content)
	if options.Diversify {
		serendipity, err := re.getSerendipityRecommendations(options)
		if err != nil {
			log.Printf("Serendipity recommendations failed: %v", err)
		} else {
			allRecommendations = append(allRecommendations, serendipity...)
		}
	}

	// If we have very few recommendations, try to get language-specific popular content
	if len(allRecommendations) < 3 {
		log.Printf("Insufficient personalized recommendations (%d) for language %s, adding language-specific popular content", len(allRecommendations), options.Language)

		// Get language-specific popular content (not cross-language fallback)
		fallbackRecommendations, err := re.getFallbackRecommendations(options)
		if err != nil {
			log.Printf("Language-specific fallback recommendations failed: %v", err)
		} else {
			allRecommendations = append(allRecommendations, fallbackRecommendations...)
		}
	}

	// Deduplicate and rank recommendations
	recommendations := re.rankAndDeduplicateRecommendations(allRecommendations, options)

	// Apply translations to recommended articles
	recommendations = re.applyTranslationsToRecommendations(recommendations, options.Language)

	// Cache the results
	re.cache.Set(cacheKey, recommendations)

	// Store recommendations in database for analytics
	// Use both sync and async storage for reliability
	if len(recommendations) > 0 {
		// Immediate synchronous storage for critical data
		if err := re.storeRecommendationsSync(options.UserID, recommendations); err != nil {
			log.Printf("⚠️ Failed to store recommendations synchronously: %v", err)
			// Still continue and try async storage
		}

		// Background storage as backup
		go re.storeRecommendations(options.UserID, recommendations)
	}

	return recommendations, nil
}

// getContentBasedRecommendations generates recommendations based on user's reading history
func (re *RecommendationEngine) getContentBasedRecommendations(options RecommendationOptions) ([]RecommendationResult, error) {
	// Get user's reading behavior - try user's language first, then fall back to any language
	var behaviors []models.UserReadingBehavior

	// First try with user's preferred language
	if err := database.DB.Preload("Article").Preload("Article.Category").Preload("Article.Category.Translations").Preload("Article.Translations").
		Where("user_id = ? AND interaction_type = 'view' AND reading_time > ? AND language = ?", options.UserID, 30, options.Language).
		Order("created_at DESC").
		Limit(20). // Last 20 articles
		Find(&behaviors).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch user behavior: %v", err)
	}

	// If no behavior found for the requested language, fall back to any language
	if len(behaviors) == 0 {
		if err := database.DB.Preload("Article").Preload("Article.Category").Preload("Article.Category.Translations").Preload("Article.Translations").
			Where("user_id = ? AND interaction_type = 'view' AND reading_time > ?", options.UserID, 30).
			Order("created_at DESC").
			Limit(20).
			Find(&behaviors).Error; err != nil {
			return nil, fmt.Errorf("failed to fetch fallback user behavior: %v", err)
		}
	}

	if len(behaviors) == 0 {
		return []RecommendationResult{}, nil
	}

	var recommendations []RecommendationResult
	readArticleIDs := make(map[uint]bool)

	// Track articles user has already read
	for _, behavior := range behaviors {
		readArticleIDs[behavior.ArticleID] = true
	}

	// Get user interests
	userInterests, err := re.behaviorTracker.GetUserInterests(options.UserID)
	if err != nil {
		log.Printf("Failed to get user interests: %v", err)
		userInterests = &UserInterests{
			Categories: make(map[string]float64),
			Keywords:   make(map[string]float64),
		}
	}

	// Find similar articles using embeddings
	for _, behavior := range behaviors {
		if behavior.Article.ID == 0 {
			continue
		}

		// Get articles similar to this one using cached embeddings (avoiding API calls)
		similar, err := re.embeddingService.SearchSimilarByArticleID(
			behavior.Article.ID,
			options.Language,
			5,   // Get top 5 similar articles
			0.6, // Similarity threshold
		)
		if err != nil {
			// Fallback to text-based search if embedding not found
			log.Printf("⚠️ Falling back to text search for article %d: %v", behavior.Article.ID, err)
			similar, err = re.embeddingService.SearchSimilarArticles(
				behavior.Article.Title+" "+behavior.Article.Summary,
				options.Language,
				5,
				0.6,
			)
			if err != nil {
				continue
			}
		}

		// Convert to recommendations
		for _, result := range similar {
			// Skip if already read or in exclude list
			if readArticleIDs[result.ArticleID] {
				continue
			}

			// Calculate confidence based on similarity and user interest
			confidence := result.Similarity

			// Boost confidence if article is in user's preferred categories
			if categoryScore, exists := userInterests.Categories[result.CategoryName]; exists {
				confidence += categoryScore * 0.3
			}

			// Ensure confidence is within bounds
			if confidence > 1.0 {
				confidence = 1.0
			}

			if confidence >= options.MinConfidence {
				recommendations = append(recommendations, RecommendationResult{
					Article: models.Article{
						ID:       result.ArticleID,
						Title:    result.Title,
						Summary:  result.Summary,
						Category: models.Category{Name: result.CategoryName},
					},
					Confidence:         confidence,
					ReasonType:         "similar_content",
					ReasonDetails:      re.generateSimilarContentReason(behavior.Article.Title, result.Similarity, options.Language),
					Similarity:         result.Similarity,
					RecommendationType: "content_based",
					Category:           "discovery",
					IsLearningPath:     false,
				})
			}
		}
	}

	return recommendations, nil
}

// getCollaborativeRecommendations generates recommendations based on similar users
func (re *RecommendationEngine) getCollaborativeRecommendations(options RecommendationOptions) ([]RecommendationResult, error) {
	// Find similar users
	similarUsers, err := re.behaviorTracker.GetSimilarUsers(options.UserID, 10)
	if err != nil {
		return nil, fmt.Errorf("failed to find similar users: %v", err)
	}

	if len(similarUsers) == 0 {
		return []RecommendationResult{}, nil
	}

	// Get articles read by similar users
	var readByOthers []models.UserReadingBehavior
	if err := database.DB.Preload("Article").Preload("Article.Category").Preload("Article.Category.Translations").Preload("Article.Translations").
		Where("user_id IN ? AND interaction_type = 'view' AND reading_time > ?", similarUsers, 60).
		Order("reading_time DESC").
		Find(&readByOthers).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch similar users' behavior: %v", err)
	}

	// Get articles current user has read
	var userBehaviors []models.UserReadingBehavior
	if err := database.DB.Where("user_id = ?", options.UserID).
		Find(&userBehaviors).Error; err != nil {
		return nil, err
	}

	readByUser := make(map[uint]bool)
	for _, behavior := range userBehaviors {
		readByUser[behavior.ArticleID] = true
	}

	// Count article popularity among similar users
	articleScores := make(map[uint]float64)
	articleDetails := make(map[uint]models.UserReadingBehavior)

	for _, behavior := range readByOthers {
		if readByUser[behavior.ArticleID] {
			continue // Skip articles user has already read
		}

		// Score based on reading engagement
		score := re.calculateEngagementScore(behavior.ReadingTime, behavior.ScrollDepth)
		articleScores[behavior.ArticleID] += score

		// Store article details
		if _, exists := articleDetails[behavior.ArticleID]; !exists {
			articleDetails[behavior.ArticleID] = behavior
		}
	}

	// Convert to recommendations
	var recommendations []RecommendationResult
	for articleID, score := range articleScores {
		if score < 1.0 { // Minimum popularity threshold
			continue
		}

		behavior := articleDetails[articleID]
		confidence := math.Min(score/float64(len(similarUsers)), 1.0)

		if confidence >= options.MinConfidence {
			recommendations = append(recommendations, RecommendationResult{
				Article:            behavior.Article,
				Confidence:         confidence,
				ReasonType:         "popular_among_similar_users",
				ReasonDetails:      re.generateCollaborativeReason(score, len(similarUsers), options.Language),
				RecommendationType: "collaborative",
				Category:           "discovery",
				IsLearningPath:     false,
			})
		}
	}

	return recommendations, nil
}

// getTrendingRecommendations gets currently trending articles
func (re *RecommendationEngine) getTrendingRecommendations(options RecommendationOptions) ([]RecommendationResult, error) {
	// Get articles with high recent engagement
	since := time.Now().AddDate(0, 0, -7) // Last 7 days

	var trendingArticles []struct {
		ArticleID       uint
		EngagementScore float64
		ViewCount       int64
	}

	// Get trending articles for the specific language with relaxed thresholds
	if err := database.DB.Table("user_reading_behaviors").
		Select("article_id, AVG(reading_time * scroll_depth) as engagement_score, COUNT(*) as view_count").
		Where("created_at >= ? AND language = ?", since, options.Language).
		Group("article_id").
		Having("view_count >= ?", 1). // Very low threshold to ensure we get data
		Order("engagement_score DESC").
		Limit(20).
		Find(&trendingArticles).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch trending articles: %v", err)
	}

	if len(trendingArticles) == 0 {
		return []RecommendationResult{}, nil
	}

	// Get article details
	var articleIDs []uint
	for _, trending := range trendingArticles {
		articleIDs = append(articleIDs, trending.ArticleID)
	}

	var articles []models.Article
	if err := database.DB.Preload("Category").Preload("Translations").
		Where("id IN ?", articleIDs).
		Find(&articles).Error; err != nil {
		return nil, err
	}

	// Filter articles to prioritize those in user's language
	var languageFilteredArticles []models.Article
	for _, article := range articles {
		// Include if it's in user's language or has a translation
		if article.DefaultLang == options.Language {
			languageFilteredArticles = append(languageFilteredArticles, article)
		} else {
			// Check if has translation in user's language
			hasTranslation := false
			for _, translation := range article.Translations {
				if translation.Language == options.Language {
					hasTranslation = true
					break
				}
			}
			if hasTranslation {
				languageFilteredArticles = append(languageFilteredArticles, article)
			}
		}
	}

	// Use language-filtered articles first, with limited fallback if none found
	if len(languageFilteredArticles) > 0 {
		articles = languageFilteredArticles
	} else if len(articles) > 0 {
		// Use all trending articles as fallback, but we'll mark them appropriately
		log.Printf("No language-specific trending articles found for %s, using general trending with language labels", options.Language)
		// Keep the original articles as fallback, but limit the count
		if len(articles) > 3 {
			articles = articles[:3] // Limit fallback results
		}
	} else {
		log.Printf("No trending articles found at all")
		return []RecommendationResult{}, nil
	}

	// Create article map for quick lookup
	articleMap := make(map[uint]models.Article)
	for _, article := range articles {
		articleMap[article.ID] = article
	}

	// Convert to recommendations
	var recommendations []RecommendationResult
	for _, trending := range trendingArticles {
		article, exists := articleMap[trending.ArticleID]
		if !exists {
			continue
		}

		// Calculate confidence based on trending score
		maxScore := trendingArticles[0].EngagementScore
		confidence := trending.EngagementScore / maxScore * 0.7 // Base confidence for trending

		// Boost confidence for language match
		if article.DefaultLang == options.Language {
			confidence += 0.15 // Significant boost for exact language match
		}

		// Check for translation and adjust confidence
		hasTranslation := false
		for _, translation := range article.Translations {
			if translation.Language == options.Language {
				hasTranslation = true
				confidence += 0.08 // Moderate boost for translation
				break
			}
		}

		reasonSuffix := ""
		if article.DefaultLang != options.Language {
			if hasTranslation {
				if options.Language == "zh" {
					reasonSuffix = " (有中文版本)"
				} else if options.Language == "ja" {
					reasonSuffix = " (日本語版あり)"
				} else {
					reasonSuffix = " (translated to your language)"
				}
			} else {
				// Cross-language content without translation
				if options.Language == "zh" {
					reasonSuffix = fmt.Sprintf(" (原文：%s)", article.DefaultLang)
				} else if options.Language == "ja" {
					reasonSuffix = fmt.Sprintf(" (原文：%s)", article.DefaultLang)
				} else {
					reasonSuffix = fmt.Sprintf(" (original: %s)", article.DefaultLang)
				}
			}
		}

		if confidence >= options.MinConfidence {
			recommendations = append(recommendations, RecommendationResult{
				Article:            article,
				Confidence:         confidence,
				ReasonType:         "trending",
				ReasonDetails:      re.generateTrendingReason(trending.ViewCount, options.Language) + reasonSuffix,
				RecommendationType: "trending",
				Category:           "discovery",
				IsLearningPath:     false,
			})
		}
	}

	return recommendations, nil
}

// getSerendipityRecommendations provides diverse recommendations for discovery
func (re *RecommendationEngine) getSerendipityRecommendations(options RecommendationOptions) ([]RecommendationResult, error) {
	// Get user's typical categories
	userInterests, err := re.behaviorTracker.GetUserInterests(options.UserID)
	if err != nil {
		return []RecommendationResult{}, nil
	}

	// Find categories user hasn't explored much
	var allCategories []models.Category
	if err := database.DB.Find(&allCategories).Error; err != nil {
		return nil, err
	}

	var unexploredCategories []string
	for _, category := range allCategories {
		if score, exists := userInterests.Categories[category.Name]; !exists || score < 0.3 {
			unexploredCategories = append(unexploredCategories, category.Name)
		}
	}

	if len(unexploredCategories) == 0 {
		return []RecommendationResult{}, nil
	}

	// Get high-quality articles from unexplored categories in user's language
	var articles []models.Article
	query := database.DB.Preload("Category").Preload("Category.Translations").Preload("Translations").
		Joins("JOIN categories ON articles.category_id = categories.id").
		Where("categories.name IN ?", unexploredCategories)

	if options.Language != "" {
		// Prioritize articles in user's language or with any translation (relaxed conditions)
		query = query.Where("(articles.default_lang = ?) OR (EXISTS (SELECT 1 FROM article_translations WHERE article_translations.article_id = articles.id AND article_translations.language = ?))",
			options.Language, options.Language)
	}

	if err := query.Order("view_count DESC").
		Limit(options.Limit).
		Find(&articles).Error; err != nil {
		return nil, err
	}

	var recommendations []RecommendationResult
	for _, article := range articles {
		confidence := 0.5 // Base confidence for serendipity

		// Boost confidence for language match
		if article.DefaultLang == options.Language {
			confidence += 0.1
		}

		// Check for translation and adjust confidence
		hasTranslation := false
		for _, translation := range article.Translations {
			if translation.Language == options.Language {
				hasTranslation = true
				confidence += 0.05
				break
			}
		}

		reasonSuffix := ""
		if article.DefaultLang != options.Language {
			if hasTranslation {
				if options.Language == "zh" {
					reasonSuffix = " (有翻译版本)"
				} else if options.Language == "ja" {
					reasonSuffix = " (翻訳版あり)"
				} else {
					reasonSuffix = " (translation available)"
				}
			} else {
				// Cross-language content without translation
				if options.Language == "zh" {
					reasonSuffix = fmt.Sprintf(" (原文：%s)", article.DefaultLang)
				} else if options.Language == "ja" {
					reasonSuffix = fmt.Sprintf(" (原文：%s)", article.DefaultLang)
				} else {
					reasonSuffix = fmt.Sprintf(" (original: %s)", article.DefaultLang)
				}
			}
		}

		recommendations = append(recommendations, RecommendationResult{
			Article:            article,
			Confidence:         confidence,
			ReasonType:         "discovery",
			ReasonDetails:      re.generateDiscoveryReason(article.Category.Name, options.Language) + reasonSuffix,
			RecommendationType: "serendipity",
			Category:           "discovery",
			IsLearningPath:     false,
		})
	}

	return recommendations, nil
}

// getFallbackRecommendations provides language-specific recommendations when personalized data is insufficient
func (re *RecommendationEngine) getFallbackRecommendations(options RecommendationOptions) ([]RecommendationResult, error) {
	// Get popular articles in the user's language first
	var articles []models.Article

	// First try: articles in user's language or with translations
	query := database.DB.Preload("Category").Preload("Category.Translations").Preload("Translations")

	if options.Language != "" {
		// Prioritize articles in user's language or with any translation (relaxed conditions)
		query = query.Where("(default_lang = ?) OR (EXISTS (SELECT 1 FROM article_translations WHERE article_translations.article_id = articles.id AND article_translations.language = ?))",
			options.Language, options.Language)
	}

	if err := query.Order("view_count DESC").
		Limit(10).
		Find(&articles).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch language-specific popular articles: %v", err)
	}

	// If no articles found for specific language, try a gentle fallback with clear labeling
	if len(articles) == 0 && options.Language != "" {
		log.Printf("No articles found for language %s, trying fallback with popular content", options.Language)
		if err := database.DB.Preload("Category").Preload("Category.Translations").Preload("Translations").
			Order("view_count DESC").
			Limit(5). // Limited fallback
			Find(&articles).Error; err != nil {
			return nil, fmt.Errorf("failed to fetch fallback popular articles: %v", err)
		}
	}

	if len(articles) == 0 {
		log.Printf("No articles found at all, returning empty recommendations")
		return []RecommendationResult{}, nil
	}

	var recommendations []RecommendationResult
	for i, article := range articles {
		confidence := 0.4 - float64(i)*0.03 // Higher base confidence for language-specific content

		// Boost confidence for exact language match
		if article.DefaultLang == options.Language {
			confidence += 0.1
		}

		// Check if article has translation in user's language
		hasTranslation := false
		for _, translation := range article.Translations {
			if translation.Language == options.Language {
				hasTranslation = true
				confidence += 0.05
				break
			}
		}

		if confidence >= options.MinConfidence {
			reasonSuffix := ""
			if article.DefaultLang != options.Language {
				if hasTranslation {
					if options.Language == "zh" {
						reasonSuffix = " (有中文翻译)"
					} else if options.Language == "ja" {
						reasonSuffix = " (日本語翻訳あり)"
					} else {
						reasonSuffix = " (translated)"
					}
				} else {
					// Cross-language content without translation
					if options.Language == "zh" {
						reasonSuffix = fmt.Sprintf(" (原文：%s)", article.DefaultLang)
					} else if options.Language == "ja" {
						reasonSuffix = fmt.Sprintf(" (原文：%s)", article.DefaultLang)
					} else {
						reasonSuffix = fmt.Sprintf(" (original: %s)", article.DefaultLang)
					}
				}
			}

			recommendations = append(recommendations, RecommendationResult{
				Article:            article,
				Confidence:         confidence,
				RecommendationType: "trending",
				ReasonDetails:      re.generateTrendingReason(int64(article.ViewCount), options.Language) + reasonSuffix,
				IsLearningPath:     false,
			})
		}
	}

	return recommendations, nil
}

// rankAndDeduplicateRecommendations ranks and removes duplicate recommendations
func (re *RecommendationEngine) rankAndDeduplicateRecommendations(recommendations []RecommendationResult, options RecommendationOptions) []RecommendationResult {
	// Separate learning path and discovery recommendations
	var learningPaths []RecommendationResult
	var discoveryRecs []RecommendationResult

	for _, rec := range recommendations {
		if rec.IsLearningPath {
			learningPaths = append(learningPaths, rec)
		} else {
			discoveryRecs = append(discoveryRecs, rec)
		}
	}

	// Deduplicate discovery recommendations to avoid articles already in learning paths
	learningArticleIDs := make(map[uint]bool)
	for _, lp := range learningPaths {
		learningArticleIDs[lp.Article.ID] = true
	}

	// Filter out discovery recommendations that overlap with learning paths
	var filteredDiscovery []RecommendationResult
	seen := make(map[uint]bool)

	for _, rec := range discoveryRecs {
		if !seen[rec.Article.ID] && !learningArticleIDs[rec.Article.ID] {
			seen[rec.Article.ID] = true
			filteredDiscovery = append(filteredDiscovery, rec)
		}
	}

	// Combine filtered results: prioritize learning paths, then discovery
	var unique []RecommendationResult
	unique = append(unique, learningPaths...)
	unique = append(unique, filteredDiscovery...)

	// Sort by confidence score within each category
	sort.Slice(unique, func(i, j int) bool {
		// Learning paths first, then by confidence
		if unique[i].IsLearningPath && !unique[j].IsLearningPath {
			return true
		}
		if !unique[i].IsLearningPath && unique[j].IsLearningPath {
			return false
		}
		return unique[i].Confidence > unique[j].Confidence
	})

	// Apply diversification if requested
	if options.Diversify {
		unique = re.diversifyRecommendations(unique, options.Limit)
	}

	// Limit results
	if len(unique) > options.Limit {
		unique = unique[:options.Limit]
	}

	// Set positions
	for i := range unique {
		unique[i].Position = i + 1
	}

	return unique
}

// diversifyRecommendations ensures topic diversity in recommendations
func (re *RecommendationEngine) diversifyRecommendations(recommendations []RecommendationResult, limit int) []RecommendationResult {
	if len(recommendations) <= limit {
		return recommendations
	}

	var diversified []RecommendationResult
	categoryCount := make(map[string]int)
	typeCount := make(map[string]int)

	for _, rec := range recommendations {
		category := rec.Article.Category.Name
		recType := rec.RecommendationType

		// Limit per category and type to ensure diversity
		if categoryCount[category] >= 3 || typeCount[recType] >= limit/2 {
			continue
		}

		diversified = append(diversified, rec)
		categoryCount[category]++
		typeCount[recType]++

		if len(diversified) >= limit {
			break
		}
	}

	// Fill remaining slots if needed
	if len(diversified) < limit {
		for _, rec := range recommendations {
			if len(diversified) >= limit {
				break
			}

			// Check if already included
			found := false
			for _, existing := range diversified {
				if existing.Article.ID == rec.Article.ID {
					found = true
					break
				}
			}

			if !found {
				diversified = append(diversified, rec)
			}
		}
	}

	return diversified
}

// calculateEngagementScore calculates engagement score from reading metrics
func (re *RecommendationEngine) calculateEngagementScore(readingTime int, scrollDepth float64) float64 {
	// Base score from reading time (normalized to 0-1)
	timeScore := math.Min(float64(readingTime)/300.0, 1.0) // 5 minutes = max score

	// Scroll depth contributes to engagement
	scrollScore := scrollDepth

	// Combined score with weights
	return timeScore*0.7 + scrollScore*0.3
}

// storeRecommendations stores recommendations in database for analytics
func (re *RecommendationEngine) storeRecommendations(userID string, recommendations []RecommendationResult) {
	log.Printf("🔄 Storing %d recommendations for user %s", len(recommendations), userID)

	successCount := 0
	for i, rec := range recommendations {
		recommendation := models.PersonalizedRecommendation{
			UserID:             userID,
			ArticleID:          rec.Article.ID,
			RecommendationType: rec.RecommendationType,
			Confidence:         rec.Confidence,
			ReasonType:         rec.ReasonType,
			ReasonDetails:      rec.ReasonDetails,
			Position:           rec.Position,
			Category:           rec.Category,
			IsLearningPath:     rec.IsLearningPath,
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}

		if err := database.DB.Create(&recommendation).Error; err != nil {
			log.Printf("❌ Failed to store recommendation %d for user %s: %v", i+1, userID, err)
		} else {
			successCount++
		}
	}

	log.Printf("✅ Successfully stored %d/%d recommendations for user %s", successCount, len(recommendations), userID)
}

// storeRecommendationsSync stores recommendations synchronously and returns error
func (re *RecommendationEngine) storeRecommendationsSync(userID string, recommendations []RecommendationResult) error {
	log.Printf("🔄 Synchronously storing %d recommendations for user %s", len(recommendations), userID)

	if len(recommendations) == 0 {
		return nil
	}

	// Prepare batch insert
	var recommendationModels []models.PersonalizedRecommendation
	now := time.Now()

	for _, rec := range recommendations {
		recommendation := models.PersonalizedRecommendation{
			UserID:             userID,
			ArticleID:          rec.Article.ID,
			RecommendationType: rec.RecommendationType,
			Confidence:         rec.Confidence,
			ReasonType:         rec.ReasonType,
			ReasonDetails:      rec.ReasonDetails,
			Position:           rec.Position,
			Category:           rec.Category,
			IsLearningPath:     rec.IsLearningPath,
			CreatedAt:          now,
			UpdatedAt:          now,
		}
		recommendationModels = append(recommendationModels, recommendation)
	}

	// Batch insert for better performance
	if err := database.DB.CreateInBatches(recommendationModels, 50).Error; err != nil {
		log.Printf("❌ Failed to batch store recommendations for user %s: %v", userID, err)
		return fmt.Errorf("failed to store recommendations: %v", err)
	}

	log.Printf("✅ Successfully stored %d recommendations synchronously for user %s", len(recommendations), userID)
	return nil
}

// GenerateReadingPath creates a learning path for a user
func (re *RecommendationEngine) GenerateReadingPath(userID string, topic string, language string) (*ReadingPath, error) {
	// Get articles related to the topic in user's language or with translations
	var articles []models.Article
	query := database.DB.Preload("Category").Preload("Translations").
		Where("title LIKE ? OR summary LIKE ?", "%"+topic+"%", "%"+topic+"%")

	if language != "" {
		// Prioritize articles in user's language or with any translation (relaxed conditions)
		query = query.Where("(default_lang = ?) OR (EXISTS (SELECT 1 FROM article_translations WHERE article_translations.article_id = articles.id AND article_translations.language = ? AND (article_translations.title LIKE ? OR article_translations.summary LIKE ?)))",
			language, language, "%"+topic+"%", "%"+topic+"%")
	}

	if err := query.Order("view_count DESC").
		Limit(10).
		Find(&articles).Error; err != nil {
		return nil, fmt.Errorf("failed to find articles for topic: %v", err)
	}

	if len(articles) == 0 {
		return nil, fmt.Errorf("no articles found for topic: %s", topic)
	}

	// Sort articles by difficulty (based on content length and view count)
	sort.Slice(articles, func(i, j int) bool {
		difficultyI := re.calculateDifficulty(articles[i])
		difficultyJ := re.calculateDifficulty(articles[j])
		return difficultyI < difficultyJ
	})

	// Convert to recommendation results
	var pathArticles []RecommendationResult
	totalTime := 0

	for i, article := range articles {
		estimatedTime := re.estimateReadingTime(article.Content)
		totalTime += estimatedTime

		pathArticles = append(pathArticles, RecommendationResult{
			Article:            article,
			Confidence:         0.8, // High confidence for curated paths
			ReasonType:         "learning_path",
			ReasonDetails:      re.generateLearningPathReason(i+1, topic, language),
			Position:           i + 1,
			RecommendationType: "learning_path",
			Category:           "learning",
			IsLearningPath:     true,
		})
	}

	// Determine overall difficulty
	difficulty := "beginner"
	if len(articles) > 5 {
		difficulty = "intermediate"
	}
	if totalTime > 2400 { // More than 40 minutes
		difficulty = "advanced"
	}

	path := &ReadingPath{
		PathID:      fmt.Sprintf("path_%s_%s_%d", strings.ReplaceAll(topic, " ", "_"), language, time.Now().Unix()),
		Title:       fmt.Sprintf("Learning Path: %s", strings.Title(topic)),
		Description: fmt.Sprintf("A curated sequence of %d articles to learn about %s", len(articles), topic),
		Articles:    pathArticles,
		TotalTime:   totalTime,
		Difficulty:  difficulty,
		Progress:    0.0,
		CreatedAt:   time.Now(),
	}

	return path, nil
}

// calculateDifficulty estimates article difficulty
func (re *RecommendationEngine) calculateDifficulty(article models.Article) float64 {
	// Simple heuristic: longer content + lower view count = higher difficulty
	contentLength := float64(len(article.Content))
	viewCount := float64(article.ViewCount)

	// Normalize and combine factors
	lengthScore := math.Min(contentLength/5000.0, 1.0)       // 5000 chars = max
	popularityScore := 1.0 - math.Min(viewCount/1000.0, 1.0) // Invert popularity

	return lengthScore*0.6 + popularityScore*0.4
}

// estimateReadingTime estimates reading time for content
func (re *RecommendationEngine) estimateReadingTime(content string) int {
	// Average reading speed: 200 words per minute
	wordCount := len(strings.Fields(content))
	return int(float64(wordCount) / 200.0 * 60) // seconds
}

// GetRecommendationAnalytics returns analytics about recommendations
func (re *RecommendationEngine) GetRecommendationAnalytics(userID string, days int) (*RecommendationAnalytics, error) {
	log.Printf("📊 Getting recommendation analytics for user %s (last %d days)", userID, days)
	since := time.Now().AddDate(0, 0, -days)

	var recommendations []models.PersonalizedRecommendation
	if err := database.DB.Where("user_id = ? AND created_at >= ?", userID, since).
		Find(&recommendations).Error; err != nil {
		log.Printf("❌ Failed to fetch recommendations for user %s: %v", userID, err)
		return nil, err
	}

	log.Printf("🔍 Found %d recommendations for user %s since %s", len(recommendations), userID, since.Format("2006-01-02"))

	analytics := &RecommendationAnalytics{
		TotalRecommendations: len(recommendations),
		ClickThroughRate:     0.0,
		TypeDistribution:     make(map[string]int),
		AvgConfidence:        0.0,
	}

	if len(recommendations) == 0 {
		log.Printf("⚠️ No recommendations found for user %s in the last %d days", userID, days)

		// Check if user has any recommendations at all
		var totalCount int64
		database.DB.Model(&models.PersonalizedRecommendation{}).Where("user_id = ?", userID).Count(&totalCount)
		log.Printf("📈 Total recommendations for user %s (all time): %d", userID, totalCount)

		// Check if user has any behavior data
		var behaviorCount int64
		database.DB.Model(&models.UserReadingBehavior{}).Where("user_id = ?", userID).Count(&behaviorCount)
		log.Printf("👤 Total user behaviors for user %s: %d", userID, behaviorCount)

		return analytics, nil
	}

	clicks := 0
	totalConfidence := 0.0

	for _, rec := range recommendations {
		if rec.IsClicked {
			clicks++
		}
		analytics.TypeDistribution[rec.RecommendationType]++
		totalConfidence += rec.Confidence
	}

	analytics.ClickThroughRate = float64(clicks) / float64(len(recommendations))
	analytics.AvgConfidence = totalConfidence / float64(len(recommendations))

	log.Printf("📊 Analytics calculated: %d total, %.2f%% CTR, %.2f avg confidence",
		analytics.TotalRecommendations,
		analytics.ClickThroughRate*100,
		analytics.AvgConfidence)

	return analytics, nil
}

// RecommendationAnalytics contains analytics about recommendations
type RecommendationAnalytics struct {
	TotalRecommendations int            `json:"total_recommendations"`
	ClickThroughRate     float64        `json:"click_through_rate"`
	TypeDistribution     map[string]int `json:"type_distribution"`
	AvgConfidence        float64        `json:"avg_confidence"`
}

// Global recommendation engine instance
var globalRecommendationEngine *RecommendationEngine

// GetGlobalRecommendationEngine returns the global recommendation engine instance
func GetGlobalRecommendationEngine() *RecommendationEngine {
	if globalRecommendationEngine == nil {
		globalRecommendationEngine = NewRecommendationEngine()
	}
	return globalRecommendationEngine
}

// Multilingual reason generators

// generateSimilarContentReason generates reason for similar content recommendations
func (re *RecommendationEngine) generateSimilarContentReason(articleTitle string, similarity float64, language string) string {
	percentage := similarity * 100

	if language == "zh" {
		return fmt.Sprintf("🔗 与《%s》相似 (%.0f%% 匹配度)", articleTitle, percentage)
	} else if language == "ja" {
		return fmt.Sprintf("🔗 「%s」と類似 (%.0f%% マッチ)", articleTitle, percentage)
	} else {
		return fmt.Sprintf("🔗 Similar to '%s' (%.0f%% match)", articleTitle, percentage)
	}
}

// generateCollaborativeReason generates reason for collaborative filtering recommendations
func (re *RecommendationEngine) generateCollaborativeReason(score float64, totalUsers int, language string) string {
	percentage := score / float64(totalUsers) * 100

	if language == "zh" {
		return fmt.Sprintf("👥 在相似兴趣的用户中很受欢迎 (%.0f%% 的相似用户)", percentage)
	} else if language == "ja" {
		return fmt.Sprintf("👥 類似の興味を持つユーザーに人気 (類似ユーザーの%.0f%%)", percentage)
	} else {
		return fmt.Sprintf("👥 Popular among users with similar interests (%.0f%% of similar users)", percentage)
	}
}

// generateTrendingReason generates reason for trending recommendations
func (re *RecommendationEngine) generateTrendingReason(viewCount int64, language string) string {
	if language == "zh" {
		return fmt.Sprintf("🔥 热门文章，高参与度 (%d 次最近浏览)", viewCount)
	} else if language == "ja" {
		return fmt.Sprintf("🔥 高エンゲージメントのトレンド記事 (%d回の最近の閲覧)", viewCount)
	} else {
		return fmt.Sprintf("🔥 Trending article with high engagement (%d recent views)", viewCount)
	}
}

// generateDiscoveryReason generates reason for discovery/serendipity recommendations
func (re *RecommendationEngine) generateDiscoveryReason(categoryName string, language string) string {
	if language == "zh" {
		return fmt.Sprintf("🌟 探索%s领域的新话题", categoryName)
	} else if language == "ja" {
		return fmt.Sprintf("🌟 %s分野の新しいトピックを発見", categoryName)
	} else {
		return fmt.Sprintf("🌟 Discover new topics in %s", categoryName)
	}
}

// generateLearningPathReason generates reason for learning path recommendations
func (re *RecommendationEngine) generateLearningPathReason(step int, topic string, language string) string {
	if language == "zh" {
		return fmt.Sprintf("📚 %s学习路径 - 第%d步", topic, step)
	} else if language == "ja" {
		return fmt.Sprintf("📚 %s学習パス - ステップ%d", topic, step)
	} else {
		return fmt.Sprintf("📚 Learning Path for %s - Step %d", topic, step)
	}
}

// applyTranslationToArticle applies translation to article if available for the target language
func (re *RecommendationEngine) applyTranslationToArticle(article models.Article, targetLanguage string) models.Article {
	// If article is already in target language, return as is
	if article.DefaultLang == targetLanguage {
		return article
	}

	// Look for translation in target language
	for _, translation := range article.Translations {
		if translation.Language == targetLanguage {
			// Create a copy of the article with translated content
			translatedArticle := article
			translatedArticle.Title = translation.Title
			translatedArticle.Summary = translation.Summary
			translatedArticle.Content = translation.Content
			return translatedArticle
		}
	}

	// No translation found, return original article
	return article
}

// applyTranslationToCategory applies translation to category if available for the target language
func (re *RecommendationEngine) applyTranslationToCategory(category models.Category, targetLanguage string) models.Category {
	// If category is already in target language, return as is
	if category.DefaultLang == targetLanguage {
		return category
	}

	// Look for translation in target language
	for _, translation := range category.Translations {
		if translation.Language == targetLanguage {
			// Create a copy of the category with translated content
			translatedCategory := category
			translatedCategory.Name = translation.Name
			translatedCategory.Description = translation.Description
			return translatedCategory
		}
	}

	// No translation found, return original category
	return category
}

// applyTranslationsToRecommendations applies translations to all recommended articles and categories
func (re *RecommendationEngine) applyTranslationsToRecommendations(recommendations []RecommendationResult, targetLanguage string) []RecommendationResult {
	for i := range recommendations {
		recommendations[i].Article = re.applyTranslationToArticle(recommendations[i].Article, targetLanguage)
		recommendations[i].Article.Category = re.applyTranslationToCategory(recommendations[i].Article.Category, targetLanguage)
	}
	return recommendations
}
