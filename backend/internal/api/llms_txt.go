package api

import (
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"blog-backend/internal/services"
	"github.com/gin-gonic/gin"
)

// Cache structure for LLMs.txt content
type LLMsTxtCache struct {
	Content   string
	Language  string
	Timestamp time.Time
	Hash      string // Hash of data used to generate content
}

// Global cache with mutex for thread safety
var (
	llmsTxtCache    = make(map[string]*LLMsTxtCache)
	llmsCacheMutex  = sync.RWMutex{}
	llmsCacheExpiry = 1 * time.Hour // Cache expires after 1 hour
	usageTracker    = services.NewAIUsageTracker()
)

type LLMsTxtContent struct {
	SiteName        string
	SiteDescription string
	BaseURL         string
	Language        string
	ArticleCount    int
	Categories      []CategoryInfo
	RecentArticles  []ArticleInfo
	KeyTopics       []string
	Features        []string
	SEOStats        SEOStatistics
	UpdatedAt       time.Time
}

type CategoryInfo struct {
	Name        string
	Description string
	Count       int
}

type ArticleInfo struct {
	ID           uint
	Title        string
	Summary      string
	SEOTitle     string
	SEOKeywords  string
	CategoryName string
	ViewCount    uint
	CreatedAt    time.Time
}

func generateLLMsTxt(c *gin.Context) {
	startTime := time.Now()
	lang := c.DefaultQuery("lang", "zh")
	success := true
	var errorMessage string
	var contentLength int

	// Check cache first
	cacheKey := fmt.Sprintf("llms_%s", lang)
	if cachedContent := getCachedLLMsTxt(cacheKey); cachedContent != "" {
		contentLength = len(cachedContent)

		c.Header("Content-Type", "text/plain; charset=utf-8")
		c.Header("Cache-Control", "public, max-age=3600")
		c.Header("X-Cache-Status", "HIT")
		c.String(http.StatusOK, cachedContent)
	} else {
		// Generate new content if cache miss
		content, err := generateLLMsTxtContentWithError(lang, c.Request.Host)
		if err != nil {
			success = false
			errorMessage = err.Error()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate LLMs.txt"})
		} else {
			contentLength = len(content)

			// Cache the generated content
			setCachedLLMsTxt(cacheKey, content, lang)

			c.Header("Content-Type", "text/plain; charset=utf-8")
			c.Header("Cache-Control", "public, max-age=3600")
			c.Header("X-Cache-Status", "MISS")
			c.String(http.StatusOK, content)
		}
	}

	// Record usage metrics
	responseTime := time.Since(startTime)
	go func() {
		metrics := services.UsageMetrics{
			ServiceType:   "llms_txt",
			Provider:      "kuno_blog",
			Model:         "content_generator",
			Operation:     fmt.Sprintf("generate_%s", lang),
			InputTokens:   0, // No input tokens for LLMs.txt
			OutputTokens:  0, // No output tokens in traditional sense
			TotalTokens:   0,
			EstimatedCost: 0.0, // Free service
			Currency:      "USD",
			Language:      lang,
			InputLength:   0,
			OutputLength:  contentLength,
			ResponseTime:  responseTime,
			Success:       success,
			ErrorMessage:  errorMessage,
			ArticleID:     nil,
			UserAgent:     c.GetHeader("User-Agent"),
			IPAddress:     c.ClientIP(),
		}

		if err := usageTracker.TrackUsage(metrics); err != nil {
			log.Printf("Failed to track LLMs.txt usage: %v", err)
		}
	}()
}

func generateLLMsTxtContentWithError(lang, baseURL string) (string, error) {
	// Get site settings
	var settings models.SiteSettings
	if err := database.DB.Preload("Translations").First(&settings).Error; err != nil {
		log.Printf("Error fetching site settings: %v", err)
		return "", fmt.Errorf("failed to fetch site settings: %v", err)
	}

	content := generateLLMsTxtContentInternal(settings, lang, baseURL)
	return content, nil
}

func generateLLMsTxtContent(lang, baseURL string) string {
	content, err := generateLLMsTxtContentWithError(lang, baseURL)
	if err != nil {
		return "Error: " + err.Error()
	}
	return content
}

func generateLLMsTxtContentInternal(settings models.SiteSettings, lang, baseURL string) string {
	// Get localized site title and subtitle
	siteName := settings.SiteTitle
	siteDescription := settings.SiteSubtitle

	// Check for translations
	for _, translation := range settings.Translations {
		if translation.Language == lang {
			siteName = translation.SiteTitle
			siteDescription = translation.SiteSubtitle
			break
		}
	}

	// Get articles count
	var articleCount int64
	database.DB.Model(&models.Article{}).Count(&articleCount)

	// Get categories with article counts
	var categories []CategoryInfo
	var dbCategories []models.Category
	database.DB.Preload("Translations").Find(&dbCategories)

	for _, cat := range dbCategories {
		var count int64
		database.DB.Model(&models.Article{}).Where("category_id = ?", cat.ID).Count(&count)

		categoryName := cat.Name
		categoryDesc := cat.Description

		// Check for translations
		for _, translation := range cat.Translations {
			if translation.Language == lang {
				categoryName = translation.Name
				categoryDesc = translation.Description
				break
			}
		}

		categories = append(categories, CategoryInfo{
			Name:        categoryName,
			Description: categoryDesc,
			Count:       int(count),
		})
	}

	// Sort categories by article count
	sort.Slice(categories, func(i, j int) bool {
		return categories[i].Count > categories[j].Count
	})

	// Get recent articles (top 10 by views or recent creation)
	var articles []models.Article
	database.DB.Preload("Category").
		Order("view_count DESC, created_at DESC").
		Limit(10).
		Find(&articles)

	var recentArticles []ArticleInfo
	for _, article := range articles {
		// Get localized article data if available
		var translation models.ArticleTranslation
		title := article.Title
		summary := article.Summary

		err := database.DB.Where("article_id = ? AND language = ?", article.ID, lang).First(&translation).Error
		if err == nil {
			title = translation.Title
			summary = translation.Summary
		}

		articleInfo := ArticleInfo{
			ID:           article.ID,
			Title:        title,
			Summary:      summary,
			SEOTitle:     article.SEOTitle,
			SEOKeywords:  article.SEOKeywords,
			CategoryName: article.Category.Name,
			ViewCount:    article.ViewCount,
			CreatedAt:    article.CreatedAt,
		}
		recentArticles = append(recentArticles, articleInfo)
	}

	// Extract key topics from SEO keywords and article content
	keyTopics := extractKeyTopics(articles, lang)

	// Generate AI-enhanced content description
	aiDescription := generateAIEnhancedDescription(siteName, siteDescription, articles, lang)
	if aiDescription != "" {
		siteDescription = aiDescription
	}

	// Get aggregated SEO statistics
	seoStats := getSEOStatistics()

	// Get localized system features
	features := getLocalizedSystemFeatures(lang)

	content := LLMsTxtContent{
		SiteName:        siteName,
		SiteDescription: siteDescription,
		BaseURL:         baseURL,
		Language:        lang,
		ArticleCount:    int(articleCount),
		Categories:      categories,
		RecentArticles:  recentArticles,
		KeyTopics:       keyTopics,
		Features:        features,
		SEOStats:        seoStats,
		UpdatedAt:       time.Now(),
	}

	return formatLLMsTxt(content)
}

func ServeLLMsTxt(c *gin.Context) {
	// This is the main /llms.txt endpoint
	generateLLMsTxt(c)
}

func AdminGenerateLLMsTxt(c *gin.Context) {
	// Admin endpoint to manually trigger generation
	generateLLMsTxt(c)
}

func AdminPreviewLLMsTxt(c *gin.Context) {
	// Preview endpoint for admin interface
	generateLLMsTxt(c)
}

func extractKeyTopics(articles []models.Article, _ string) []string {
	topicMap := make(map[string]int)

	// Extract keywords from articles
	for _, article := range articles {
		if article.SEOKeywords != "" {
			keywords := strings.Split(article.SEOKeywords, ",")
			for _, keyword := range keywords {
				keyword = strings.TrimSpace(keyword)
				if len(keyword) > 2 { // Filter out very short keywords
					topicMap[keyword]++
				}
			}
		}
	}

	// Convert to slice and sort by frequency
	type topicCount struct {
		topic string
		count int
	}

	var topics []topicCount
	for topic, count := range topicMap {
		topics = append(topics, topicCount{topic, count})
	}

	sort.Slice(topics, func(i, j int) bool {
		return topics[i].count > topics[j].count
	})

	// Return top 15 topics
	var result []string
	limit := 15
	if len(topics) < limit {
		limit = len(topics)
	}

	for i := 0; i < limit; i++ {
		result = append(result, topics[i].topic)
	}

	return result
}

func formatLLMsTxt(content LLMsTxtContent) string {
	var builder strings.Builder

	// Header with site name (required H1)
	builder.WriteString(fmt.Sprintf("# %s\n\n", content.SiteName))

	// Site description (required blockquote)
	if content.SiteDescription != "" {
		builder.WriteString(fmt.Sprintf("> %s\n\n", content.SiteDescription))
	}

	// Basic site information
	builder.WriteString("## Site Information\n\n")
	builder.WriteString(fmt.Sprintf("- **Base URL**: %s\n", content.BaseURL))
	builder.WriteString(fmt.Sprintf("- **Language**: %s\n", content.Language))
	builder.WriteString(fmt.Sprintf("- **Total Articles**: %d\n", content.ArticleCount))
	builder.WriteString(fmt.Sprintf("- **Articles with SEO**: %d\n", content.SEOStats.TotalArticlesWithSEO))
	builder.WriteString(fmt.Sprintf("- **Total Views**: %d\n", content.SEOStats.TotalViews))
	builder.WriteString(fmt.Sprintf("- **Average Views per Article**: %.1f\n", content.SEOStats.AverageViewCount))
	builder.WriteString(fmt.Sprintf("- **Last Updated**: %s\n\n", content.UpdatedAt.Format("2006-01-02 15:04:05")))

	// Categories section
	if len(content.Categories) > 0 {
		builder.WriteString("## Content Categories\n\n")
		for _, cat := range content.Categories {
			if cat.Description != "" {
				builder.WriteString(fmt.Sprintf("- **%s** (%d articles): %s\n", cat.Name, cat.Count, cat.Description))
			} else {
				builder.WriteString(fmt.Sprintf("- **%s**: %d articles\n", cat.Name, cat.Count))
			}
		}
		builder.WriteString("\n")
	}

	// Key topics from content
	if len(content.KeyTopics) > 0 {
		builder.WriteString("## Key Topics\n\n")
		builder.WriteString("The site covers the following main topics based on content analysis:\n\n")
		for _, topic := range content.KeyTopics {
			builder.WriteString(fmt.Sprintf("- %s\n", topic))
		}
		builder.WriteString("\n")
	}

	// Recent popular articles
	if len(content.RecentArticles) > 0 {
		builder.WriteString("## Popular Articles\n\n")
		for i, article := range content.RecentArticles {
			if i >= 5 { // Limit to top 5 for LLMs.txt
				break
			}

			title := article.Title
			if article.SEOTitle != "" {
				title = article.SEOTitle
			}

			builder.WriteString(fmt.Sprintf("### %s\n", title))
			if article.Summary != "" {
				builder.WriteString(fmt.Sprintf("%s\n", article.Summary))
			}

			builder.WriteString(fmt.Sprintf("- **Category**: %s\n", article.CategoryName))
			builder.WriteString(fmt.Sprintf("- **Views**: %d\n", article.ViewCount))
			builder.WriteString(fmt.Sprintf("- **Published**: %s\n", article.CreatedAt.Format("2006-01-02")))

			if article.SEOKeywords != "" {
				builder.WriteString(fmt.Sprintf("- **Topics**: %s\n", article.SEOKeywords))
			}
			builder.WriteString("\n")
		}
	}

	// System features
	builder.WriteString("## System Features\n\n")
	builder.WriteString("This blog system provides:\n\n")
	for _, feature := range content.Features {
		builder.WriteString(fmt.Sprintf("- %s\n", feature))
	}
	builder.WriteString("\n")

	// Content format information
	builder.WriteString("## Content Format\n\n")
	builder.WriteString("- **Content Format**: Markdown with HTML support\n")
	builder.WriteString("- **Multilingual**: Content available in multiple languages\n")
	builder.WriteString("- **SEO Optimized**: All content includes SEO metadata\n")
	builder.WriteString("- **Structured Data**: Articles include structured data markup\n")
	builder.WriteString("- **Responsive Design**: Mobile-optimized content delivery\n\n")

	// SEO Information section
	builder.WriteString("## SEO Information\n\n")
	builder.WriteString(fmt.Sprintf("- **SEO Titles**: %d articles have custom SEO titles\n", content.SEOStats.TotalSEOTitles))
	builder.WriteString(fmt.Sprintf("- **SEO Descriptions**: %d articles have meta descriptions\n", content.SEOStats.TotalSEODescriptions))
	builder.WriteString(fmt.Sprintf("- **SEO Keywords**: %d articles have targeted keywords\n", content.SEOStats.TotalSEOKeywords))
	builder.WriteString(fmt.Sprintf("- **SEO Slugs**: %d articles have custom URL slugs\n", content.SEOStats.TotalSEOSlugs))
	builder.WriteString("- **Schema Markup**: JSON-LD structured data for all articles\n")
	builder.WriteString("- **Open Graph**: Social media optimization tags\n")
	builder.WriteString("- **Twitter Cards**: Enhanced Twitter sharing\n\n")

	// AI assistant guidance
	builder.WriteString("## AI Assistant Guidance\n\n")
	builder.WriteString("When helping users with queries about this site:\n\n")
	builder.WriteString("- Refer to the categories above to understand content organization\n")
	builder.WriteString("- Use the key topics to understand the site's focus areas\n")
	builder.WriteString("- Popular articles represent high-quality, frequently accessed content\n")
	builder.WriteString("- The site supports advanced search with filters (title:, content:, category:, date:, views:)\n")
	builder.WriteString("- Content is available in 70+ languages with automatic translation\n")
	builder.WriteString("- All articles include SEO optimization and structured data\n\n")

	// Contact and additional information
	builder.WriteString("## Additional Information\n\n")
	builder.WriteString("- **Technology Stack**: Go backend, Next.js frontend, SQLite database\n")
	builder.WriteString("- **Deployment**: Docker containerized application\n")
	builder.WriteString("- **Search Capability**: Advanced search with boolean operators and filters\n")
	builder.WriteString("- **Content Management**: Full-featured admin panel\n")
	builder.WriteString("- **Analytics**: Built-in visitor tracking and article analytics\n")

	return builder.String()
}

type SEOStatistics struct {
	TotalArticlesWithSEO int
	TotalSEOTitles       int
	TotalSEODescriptions int
	TotalSEOKeywords     int
	TotalSEOSlugs        int
	AverageViewCount     float64
	TotalViews           int64
}

func getSEOStatistics() SEOStatistics {
	var stats SEOStatistics

	// Count articles with SEO data
	var articlesWithSEO int64
	database.DB.Model(&models.Article{}).Where("seo_title != '' OR seo_description != '' OR seo_keywords != '' OR seo_slug != ''").Count(&articlesWithSEO)
	stats.TotalArticlesWithSEO = int(articlesWithSEO)

	// Count specific SEO fields
	var seoTitles, seoDescriptions, seoKeywords, seoSlugs int64
	database.DB.Model(&models.Article{}).Where("seo_title != ''").Count(&seoTitles)
	database.DB.Model(&models.Article{}).Where("seo_description != ''").Count(&seoDescriptions)
	database.DB.Model(&models.Article{}).Where("seo_keywords != ''").Count(&seoKeywords)
	database.DB.Model(&models.Article{}).Where("seo_slug != ''").Count(&seoSlugs)

	stats.TotalSEOTitles = int(seoTitles)
	stats.TotalSEODescriptions = int(seoDescriptions)
	stats.TotalSEOKeywords = int(seoKeywords)
	stats.TotalSEOSlugs = int(seoSlugs)

	// Calculate average view count
	var totalArticles int64
	database.DB.Model(&models.Article{}).Count(&totalArticles)
	if totalArticles > 0 {
		var result struct {
			TotalViews int64 `gorm:"column:total_views"`
		}
		database.DB.Model(&models.Article{}).Select("SUM(view_count) as total_views").Scan(&result)
		stats.TotalViews = result.TotalViews
		stats.AverageViewCount = float64(result.TotalViews) / float64(totalArticles)
	}

	return stats
}

func generateAIEnhancedDescription(_, originalDescription string, articles []models.Article, lang string) string {
	// This function would integrate with existing AI services
	// For now, we'll create an intelligent description based on content analysis

	if len(articles) == 0 {
		return originalDescription
	}

	// Analyze content patterns
	topicCounts := make(map[string]int)
	categoryMap := make(map[string]int)

	for _, article := range articles {
		// Count keywords
		if article.SEOKeywords != "" {
			keywords := strings.Split(article.SEOKeywords, ",")
			for _, keyword := range keywords {
				keyword = strings.TrimSpace(strings.ToLower(keyword))
				if len(keyword) > 2 {
					topicCounts[keyword]++
				}
			}
		}

		// Count categories
		if article.Category.Name != "" {
			categoryMap[article.Category.Name]++
		}
	}

	// Generate enhanced description based on analysis
	var enhancedParts []string

	// Add original description if exists
	if originalDescription != "" {
		enhancedParts = append(enhancedParts, originalDescription)
	}

	// Add main topics
	var topTopics []string
	type topicCount struct {
		topic string
		count int
	}
	var sortedTopics []topicCount
	for topic, count := range topicCounts {
		if count >= 2 { // Only include topics mentioned multiple times
			sortedTopics = append(sortedTopics, topicCount{topic, count})
		}
	}
	sort.Slice(sortedTopics, func(i, j int) bool {
		return sortedTopics[i].count > sortedTopics[j].count
	})

	for i, tc := range sortedTopics {
		if i < 5 { // Top 5 topics
			topTopics = append(topTopics, tc.topic)
		}
	}

	if len(topTopics) > 0 {
		switch lang {
		case "en":
			enhancedParts = append(enhancedParts, "Features content about "+strings.Join(topTopics, ", ")+".")
		case "zh":
			enhancedParts = append(enhancedParts, "包含"+strings.Join(topTopics, "、")+"等主题内容。")
		case "ja":
			enhancedParts = append(enhancedParts, strings.Join(topTopics, "、")+"などのトピックを扱っています。")
		default:
			enhancedParts = append(enhancedParts, "Features content about "+strings.Join(topTopics, ", ")+".")
		}
	}

	// Add article count info
	articleCount := len(articles)
	switch lang {
	case "en":
		enhancedParts = append(enhancedParts, fmt.Sprintf("Contains %d articles across various topics.", articleCount))
	case "zh":
		enhancedParts = append(enhancedParts, fmt.Sprintf("共有%d篇文章涵盖各种主题。", articleCount))
	case "ja":
		enhancedParts = append(enhancedParts, fmt.Sprintf("%d記事でさまざまなトピックをカバーしています。", articleCount))
	default:
		enhancedParts = append(enhancedParts, fmt.Sprintf("Contains %d articles across various topics.", articleCount))
	}

	return strings.Join(enhancedParts, " ")
}

// Cache management functions
func getCachedLLMsTxt(cacheKey string) string {
	llmsCacheMutex.RLock()
	defer llmsCacheMutex.RUnlock()

	cached, exists := llmsTxtCache[cacheKey]
	if !exists {
		return ""
	}

	// Check if cache is expired
	if time.Since(cached.Timestamp) > llmsCacheExpiry {
		// Cache expired, remove it
		delete(llmsTxtCache, cacheKey)
		return ""
	}

	// Check if content is still valid (based on data hash)
	currentHash := generateContentHash()
	if cached.Hash != currentHash {
		// Data changed, cache invalid
		delete(llmsTxtCache, cacheKey)
		return ""
	}

	return cached.Content
}

func setCachedLLMsTxt(cacheKey, content, lang string) {
	llmsCacheMutex.Lock()
	defer llmsCacheMutex.Unlock()

	llmsTxtCache[cacheKey] = &LLMsTxtCache{
		Content:   content,
		Language:  lang,
		Timestamp: time.Now(),
		Hash:      generateContentHash(),
	}
}

func generateContentHash() string {
	// Generate a hash based on key data that affects LLMs.txt content
	// This is a simple implementation - in production you might want to use actual hashing
	var hashData []string

	// Count articles
	var articleCount int64
	database.DB.Model(&models.Article{}).Count(&articleCount)
	hashData = append(hashData, fmt.Sprintf("articles:%d", articleCount))

	// Count categories
	var categoryCount int64
	database.DB.Model(&models.Category{}).Count(&categoryCount)
	hashData = append(hashData, fmt.Sprintf("categories:%d", categoryCount))

	// Get latest article update time
	var latestArticle models.Article
	if err := database.DB.Order("updated_at DESC").First(&latestArticle).Error; err == nil {
		hashData = append(hashData, fmt.Sprintf("latest:%d", latestArticle.UpdatedAt.Unix()))
	}

	// Get settings update time
	var settings models.SiteSettings
	if err := database.DB.First(&settings).Error; err == nil {
		hashData = append(hashData, fmt.Sprintf("settings:%d", settings.UpdatedAt.Unix()))
	}

	return strings.Join(hashData, "|")
}

func ClearLLMsTxtCache() {
	llmsCacheMutex.Lock()
	defer llmsCacheMutex.Unlock()

	llmsTxtCache = make(map[string]*LLMsTxtCache)
	log.Println("LLMs.txt cache cleared")
}

func GetCacheStats() map[string]interface{} {
	llmsCacheMutex.RLock()
	defer llmsCacheMutex.RUnlock()

	stats := map[string]interface{}{
		"cache_entries":      len(llmsTxtCache),
		"cache_expiry_hours": llmsCacheExpiry.Hours(),
	}

	entries := make([]map[string]interface{}, 0, len(llmsTxtCache))
	for key, cache := range llmsTxtCache {
		entries = append(entries, map[string]interface{}{
			"key":         key,
			"language":    cache.Language,
			"timestamp":   cache.Timestamp,
			"age_minutes": time.Since(cache.Timestamp).Minutes(),
		})
	}
	stats["entries"] = entries

	return stats
}

// GetLLMsTxtUsageStats returns usage statistics for LLMs.txt API
func GetLLMsTxtUsageStats(c *gin.Context) {
	days := 30 // Default to 30 days
	if daysParam := c.Query("days"); daysParam != "" {
		if parsedDays, err := strconv.Atoi(daysParam); err == nil && parsedDays > 0 {
			days = parsedDays
		}
	}

	// Get usage statistics from AI usage tracker
	stats, err := usageTracker.GetUsageStats("llms_txt", "kuno_blog", days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch usage statistics"})
		return
	}

	// Get daily usage for the specified period
	dailyStats, err := usageTracker.GetDailyUsage(days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch daily statistics"})
		return
	}

	response := gin.H{
		"period_days": days,
		"summary":     stats,
		"daily_usage": dailyStats,
		"cache_stats": GetCacheStats(),
	}

	c.JSON(http.StatusOK, response)
}

func getLocalizedSystemFeatures(lang string) []string {
	switch lang {
	case "en":
		return []string{
			"Multi-language blog system (70+ languages)",
			"Advanced search with filtering and sorting",
			"SEO optimization with structured data",
			"Category-based content organization",
			"Responsive design for all devices",
			"Admin panel for content management",
			"Markdown support with live preview",
			"AI-powered content generation",
			"Analytics and visitor tracking",
			"RSS feeds and social media integration",
		}
	case "zh":
		return []string{
			"多语言博客系统（支持70+种语言）",
			"高级搜索，支持筛选和排序",
			"SEO优化，包含结构化数据",
			"基于分类的内容组织",
			"全设备响应式设计",
			"内容管理后台",
			"Markdown支持，实时预览",
			"AI驱动的内容生成",
			"访客分析和追踪",
			"RSS订阅和社交媒体集成",
		}
	case "ja":
		return []string{
			"多言語ブログシステム（70+言語対応）",
			"フィルタリングとソート機能付き高度検索",
			"構造化データによるSEO最適化",
			"カテゴリベースのコンテンツ整理",
			"全デバイス対応レスポンシブデザイン",
			"コンテンツ管理パネル",
			"ライブプレビュー付きMarkdownサポート",
			"AI駆動のコンテンツ生成",
			"アナリティクスと訪問者追跡",
			"RSSフィードとソーシャルメディア統合",
		}
	default:
		return []string{
			"Multi-language blog system (70+ languages)",
			"Advanced search with filtering and sorting",
			"SEO optimization with structured data",
			"Category-based content organization",
			"Responsive design for all devices",
			"Admin panel for content management",
			"Markdown support with live preview",
			"AI-powered content generation",
			"Analytics and visitor tracking",
			"RSS feeds and social media integration",
		}
	}
}
