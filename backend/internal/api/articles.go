package api

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"github.com/gin-gonic/gin"
)

func GetArticles(c *gin.Context) {
	var articles []models.Article
	
	query := database.DB.Preload("Category").Preload("Translations")
	
	if categoryID := c.Query("category_id"); categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}
	
	if err := query.Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Apply language filtering if requested
	lang := c.Query("lang")
	if lang != "" && lang != "zh" {
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
	if lang != "" && lang != "zh" {
		applyTranslation(&article, lang)
	}
	
	c.JSON(http.StatusOK, article)
}

func CreateArticle(c *gin.Context) {
	var req struct {
		Title       string `json:"title"`
		Content     string `json:"content"`
		ContentType string `json:"content_type"`
		Summary     string `json:"summary"`
		CategoryID  uint   `json:"category_id"`
		DefaultLang string `json:"default_lang"`
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

// Track article view asynchronously
func trackArticleView(articleID uint, c *gin.Context) {
	ip := getClientIP(c)
	userAgent := c.GetHeader("User-Agent")
	fingerprint := generateFingerprint(c)
	
	// Check if this fingerprint has already viewed this article
	var existingView models.ArticleView
	if err := database.DB.Where("article_id = ? AND fingerprint = ?", articleID, fingerprint).First(&existingView).Error; err != nil {
		// No existing view found, create new one
		view := models.ArticleView{
			ArticleID:   articleID,
			IPAddress:   ip,
			UserAgent:   userAgent,
			Fingerprint: fingerprint,
		}
		
		if err := database.DB.Create(&view).Error; err == nil {
			// Increment article view count
			database.DB.Model(&models.Article{}).Where("id = ?", articleID).UpdateColumn("view_count", database.DB.Raw("view_count + 1"))
		}
	}
	// If view already exists, do nothing (unique visitor already counted)
}