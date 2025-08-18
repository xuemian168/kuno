package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"blog-backend/internal/search"
	"blog-backend/internal/services"
	"crypto/sha256"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// Helper function to get the site's default language
func getArticleDefaultLanguage() string {
	var settings models.SiteSettings
	if err := database.DB.First(&settings).Error; err != nil {
		// Fallback to 'zh' if unable to get settings
		return "zh"
	}
	if settings.DefaultLanguage == "" {
		return "zh"
	}
	return settings.DefaultLanguage
}

func GetArticles(c *gin.Context) {
	var articles []models.Article

	query := database.DB.Preload("Category").Preload("Translations")

	if categoryID := c.Query("category_id"); categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	// Filter future articles for non-admin requests
	if !isAdminRequest(c) {
		query = query.Where("created_at <= ?", time.Now())
	}

	if err := query.Order("is_pinned DESC, pin_order ASC, created_at DESC").Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Apply language filtering if requested
	lang := c.Query("lang")
	defaultLang := getArticleDefaultLanguage()
	if lang != "" && lang != defaultLang {
		for i := range articles {
			applyTranslation(&articles[i], lang)
		}
	}

	c.JSON(http.StatusOK, articles)
}

func GetArticle(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	var article models.Article
	if err := database.DB.Preload("Category").Preload("Translations").First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}

	// Check if article is scheduled for future publication and request is not from admin
	if !isAdminRequest(c) && article.CreatedAt.After(time.Now()) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}

	// Track unique visitor if not an admin request and IP fingerprint is provided
	if !isAdminRequest(c) {
		go trackArticleView(uint(id), c)
	}

	// Clean up any invalid translations for default language (data consistency fix)
	if article.DefaultLang != "" {
		database.DB.Where("article_id = ? AND language = ?", article.ID, article.DefaultLang).Delete(&models.ArticleTranslation{})
		// Reload translations after cleanup
		database.DB.Preload("Translations").First(&article, id)
	}

	// Apply language filtering if requested
	lang := c.Query("lang")
	defaultLang := getArticleDefaultLanguage()
	if lang != "" && lang != defaultLang {
		applyTranslation(&article, lang)
	}

	c.JSON(http.StatusOK, article)
}

func CreateArticle(c *gin.Context) {
	var req struct {
		Title        string `json:"title"`
		Content      string `json:"content"`
		ContentType  string `json:"content_type"`
		Summary      string `json:"summary"`
		CategoryID   uint   `json:"category_id"`
		DefaultLang  string `json:"default_lang"`
		CreatedAt    string `json:"created_at"`
		Translations []struct {
			Language string `json:"language"`
			Title    string `json:"title"`
			Content  string `json:"content"`
			Summary  string `json:"summary"`
		} `json:"translations"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create main article
	article := models.Article{
		Title:       req.Title,
		Content:     req.Content,
		ContentType: req.ContentType,
		Summary:     req.Summary,
		CategoryID:  req.CategoryID,
		DefaultLang: req.DefaultLang,
	}
	if article.DefaultLang == "" {
		article.DefaultLang = "zh"
	}

	// Set custom created_at if provided
	if req.CreatedAt != "" {
		if parsedTime, err := time.Parse(time.RFC3339, req.CreatedAt); err == nil {
			article.CreatedAt = parsedTime
		}
	}

	if err := database.DB.Create(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create translations (excluding default language)
	for _, translation := range req.Translations {
		// Skip creating translation for default language
		if translation.Language == article.DefaultLang {
			continue
		}

		if translation.Title != "" || translation.Content != "" || translation.Summary != "" {
			newTranslation := models.ArticleTranslation{
				ArticleID: article.ID,
				Language:  translation.Language,
				Title:     translation.Title,
				Content:   translation.Content,
				Summary:   translation.Summary,
			}
			database.DB.Create(&newTranslation)
		}
	}

	database.DB.Preload("Category").Preload("Translations").First(&article, article.ID)
	c.JSON(http.StatusCreated, article)
}

func UpdateArticle(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	var article models.Article
	if err := database.DB.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}

	var req struct {
		Title       string `json:"title"`
		Content     string `json:"content"`
		ContentType string `json:"content_type"`
		Summary     string `json:"summary"`
		CategoryID  uint   `json:"category_id"`
		DefaultLang string `json:"default_lang"`
		CreatedAt   string `json:"created_at"`
		// Pinned Fields
		IsPinned     *bool   `json:"is_pinned"`
		PinOrder     *int    `json:"pin_order"`
		PinnedAt     *string `json:"pinned_at"`
		Translations []struct {
			Language string `json:"language"`
			Title    string `json:"title"`
			Content  string `json:"content"`
			Summary  string `json:"summary"`
		} `json:"translations"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update main article
	article.Title = req.Title
	article.Content = req.Content
	article.ContentType = req.ContentType
	article.Summary = req.Summary
	article.CategoryID = req.CategoryID
	if req.DefaultLang != "" {
		article.DefaultLang = req.DefaultLang
	}

	// Update created_at if provided
	if req.CreatedAt != "" {
		if parsedTime, err := time.Parse(time.RFC3339, req.CreatedAt); err == nil {
			article.CreatedAt = parsedTime
		}
	}

	// Handle pinned fields with validation
	if req.IsPinned != nil {
		// If trying to pin the article
		if *req.IsPinned && !article.IsPinned {
			// Check how many articles are already pinned
			var pinnedCount int64
			database.DB.Model(&models.Article{}).Where("is_pinned = ?", true).Count(&pinnedCount)

			if pinnedCount >= 2 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum 2 articles can be pinned"})
				return
			}

			article.IsPinned = *req.IsPinned
			if req.PinOrder != nil {
				article.PinOrder = *req.PinOrder
			} else {
				// Default to position 1 if not specified
				article.PinOrder = 1
			}
			now := time.Now()
			article.PinnedAt = &now
		} else if !*req.IsPinned {
			// Unpinning the article
			article.IsPinned = false
			article.PinOrder = 0
			article.PinnedAt = nil
		}
	}

	// Update pin order if provided (only if article is pinned)
	if req.PinOrder != nil && article.IsPinned {
		article.PinOrder = *req.PinOrder
	}

	if err := database.DB.Save(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Clean up any existing translation for default language (shouldn't exist)
	database.DB.Where("article_id = ? AND language = ?", article.ID, article.DefaultLang).Delete(&models.ArticleTranslation{})

	// Update translations (excluding default language)
	for _, translation := range req.Translations {
		// Skip translation for default language
		if translation.Language == article.DefaultLang {
			continue
		}

		if translation.Title != "" || translation.Content != "" || translation.Summary != "" {
			var existingTranslation models.ArticleTranslation
			if err := database.DB.Where("article_id = ? AND language = ?", article.ID, translation.Language).First(&existingTranslation).Error; err != nil {
				// Create new translation
				newTranslation := models.ArticleTranslation{
					ArticleID: article.ID,
					Language:  translation.Language,
					Title:     translation.Title,
					Content:   translation.Content,
					Summary:   translation.Summary,
				}
				database.DB.Create(&newTranslation)
			} else {
				// Update existing translation
				existingTranslation.Title = translation.Title
				existingTranslation.Content = translation.Content
				existingTranslation.Summary = translation.Summary
				database.DB.Save(&existingTranslation)
			}
		}
	}

	database.DB.Preload("Category").Preload("Translations").First(&article, article.ID)
	c.JSON(http.StatusOK, article)
}

func DeleteArticle(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	if err := database.DB.Delete(&models.Article{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Article deleted successfully"})
}

func ImportMarkdown(c *gin.Context) {
	var req struct {
		Title      string `json:"title" binding:"required"`
		Content    string `json:"content" binding:"required"`
		CategoryID uint   `json:"category_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	summary := req.Content
	if len(summary) > 200 {
		summary = summary[:200] + "..."
	}

	article := models.Article{
		Title:       req.Title,
		Content:     req.Content,
		ContentType: "markdown",
		Summary:     summary,
		CategoryID:  req.CategoryID,
	}

	if err := database.DB.Create(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	database.DB.Preload("Category").First(&article, article.ID)
	c.JSON(http.StatusCreated, gin.H{
		"message": "Markdown imported successfully",
		"article": article,
	})
}

// Helper function to apply translation to an article
func applyTranslation(article *models.Article, lang string) {
	for _, translation := range article.Translations {
		if translation.Language == lang {
			if translation.Title != "" {
				article.Title = translation.Title
			}
			if translation.Content != "" {
				article.Content = translation.Content
			}
			if translation.Summary != "" {
				article.Summary = translation.Summary
			}
			break
		}
	}
}

// Helper function to check if request is from admin
func isAdminRequest(c *gin.Context) bool {
	// Simple check - if request has Authorization header, assume it's admin
	return c.GetHeader("Authorization") != ""
}

// Helper function to get client IP
func getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header first (for proxy/load balancer)
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	return c.ClientIP()
}

// Helper function to generate fingerprint from request
func generateFingerprint(c *gin.Context) string {
	ip := getClientIP(c)
	userAgent := c.GetHeader("User-Agent")

	// Create a simple fingerprint from IP + User-Agent
	fingerprint := fmt.Sprintf("%s|%s", ip, userAgent)
	hash := sha256.Sum256([]byte(fingerprint))
	return fmt.Sprintf("%x", hash)
}

// Track article view asynchronously with detailed analytics
func trackArticleView(articleID uint, c *gin.Context) {
	ip := getClientIP(c)
	userAgent := c.GetHeader("User-Agent")
	fingerprint := generateFingerprint(c)

	// Check if this fingerprint has already viewed this article
	var existingView models.ArticleView
	if err := database.DB.Where("article_id = ? AND fingerprint = ?", articleID, fingerprint).First(&existingView).Error; err != nil {
		// No existing view found, create new one with detailed analytics

		// Parse user agent information
		uaInfo := services.ParseUserAgent(userAgent)

		// Get geographic information (with caching)
		geoInfo := services.GetGeoIPWithCache(ip)

		// Enhance country name if it's a country code
		if len(geoInfo.Country) == 2 {
			geoInfo.Country = services.GetCountryName(geoInfo.Country)
		}

		view := models.ArticleView{
			ArticleID:   articleID,
			IPAddress:   ip,
			UserAgent:   userAgent,
			Fingerprint: fingerprint,

			// Geographic information
			Country: geoInfo.Country,
			Region:  geoInfo.Region,
			City:    geoInfo.City,

			// Browser information
			Browser:        uaInfo.Browser,
			BrowserVersion: uaInfo.BrowserVersion,

			// Operating system information
			OS:        uaInfo.OS,
			OSVersion: uaInfo.OSVersion,

			// Device information
			DeviceType: uaInfo.DeviceType,
			Platform:   uaInfo.Platform,
		}

		if err := database.DB.Create(&view).Error; err == nil {
			// Increment article view count
			database.DB.Model(&models.Article{}).Where("id = ?", articleID).UpdateColumn("view_count", database.DB.Raw("view_count + 1"))
		}
	}
	// If view already exists, do nothing (unique visitor already counted)
}

// SearchArticles handles article search functionality with advanced search syntax
func SearchArticles(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	// Parse advanced search syntax
	parsedQuery, err := search.ParseSearchQuery(query)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid search syntax: " + err.Error()})
		return
	}

	// Validate the parsed query
	if err := parsedQuery.ValidateQuery(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid search parameters: " + err.Error()})
		return
	}

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	var articles []models.Article
	var total int64

	// Build base query with joins
	searchQuery := database.DB.Preload("Category").Preload("Translations")

	// Filter future articles for non-admin requests
	if !isAdminRequest(c) {
		searchQuery = searchQuery.Where("created_at <= ?", time.Now())
	}

	// Build advanced search conditions
	sqlCondition, params := parsedQuery.BuildSQLQuery()
	if sqlCondition != "" {
		searchQuery = searchQuery.Where(sqlCondition, params...)
	}

	// Also search in translations if there are free text terms
	if len(parsedQuery.FreeText) > 0 {
		translationConditions := []string{}
		var translationParams []interface{}

		for _, term := range parsedQuery.FreeText {
			translationConditions = append(translationConditions,
				"(title LIKE ? OR content LIKE ? OR summary LIKE ?)")
			pattern := "%" + term + "%"
			translationParams = append(translationParams, pattern, pattern, pattern)
		}

		if len(translationConditions) > 0 {
			var translationSQL string
			if parsedQuery.Logic == "OR" {
				translationSQL = strings.Join(translationConditions, " OR ")
			} else {
				translationSQL = strings.Join(translationConditions, " AND ")
			}

			// Add OR condition for translations
			searchQuery = searchQuery.Or(
				database.DB.Where("id IN (?)",
					database.DB.Table("article_translations").
						Select("article_id").
						Where(translationSQL, translationParams...),
				),
			)
		}
	}

	// Get total count
	searchQuery.Model(&models.Article{}).Count(&total)

	// Apply sorting
	sortClause := parsedQuery.GetSortClause()

	// Get paginated results
	if err := searchQuery.Offset(offset).Limit(limit).Order(sortClause).Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Apply language filtering if requested
	lang := c.Query("lang")
	defaultLang := getArticleDefaultLanguage()

	if lang != "" && lang != defaultLang {
		for i := range articles {
			for _, translation := range articles[i].Translations {
				if translation.Language == lang {
					articles[i].Title = translation.Title
					articles[i].Content = translation.Content
					articles[i].Summary = translation.Summary
					// Note: SEO fields are not translated, keep original values
					break
				}
			}
		}
	}

	// Return paginated results with parsed query info
	c.JSON(http.StatusOK, gin.H{
		"articles": articles,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
		"query":        query,
		"parsed_query": parsedQuery,
		"sort_by":      parsedQuery.SortBy,
		"sort_order":   parsedQuery.SortOrder,
	})
}
