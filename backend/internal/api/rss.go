package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"encoding/xml"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// RSS 2.0 structure
type RSS struct {
	XMLName xml.Name `xml:"rss"`
	Version string   `xml:"version,attr"`
	Channel Channel  `xml:"channel"`
}

type Channel struct {
	Title         string `xml:"title"`
	Link          string `xml:"link"`
	Description   string `xml:"description"`
	Language      string `xml:"language"`
	LastBuildDate string `xml:"lastBuildDate"`
	Generator     string `xml:"generator"`
	Items         []Item `xml:"item"`
}

type Item struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
	GUID        string `xml:"guid"`
	Category    string `xml:"category,omitempty"`
}

// GetRSSFeed generates RSS feed for articles
func GetRSSFeed(c *gin.Context) {
	lang := c.Query("lang")
	if lang == "" {
		lang = "zh" // Default language
	}

	categoryID := c.Query("category_id")
	limit := c.Query("limit")

	// Parse limit, default to 20
	limitInt := 20
	if limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil && parsed > 0 && parsed <= 100 {
			limitInt = parsed
		}
	}

	// Get site settings for RSS metadata
	var settings models.SiteSettings
	if err := database.DB.Preload("Translations").First(&settings).Error; err != nil {
		c.XML(http.StatusInternalServerError, gin.H{"error": "Failed to fetch site settings"})
		return
	}

	// Apply translation to settings
	applySiteSettingsTranslation(&settings, lang)

	// Build query for articles
	query := database.DB.Preload("Category").Preload("Translations").
		Order("created_at DESC").Limit(limitInt)

	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	var articles []models.Article
	if err := query.Find(&articles).Error; err != nil {
		c.XML(http.StatusInternalServerError, gin.H{"error": "Failed to fetch articles"})
		return
	}

	// Generate RSS feed
	baseURL := getBaseURL(c)
	rss := generateRSSFeed(articles, settings, lang, baseURL)

	// Set appropriate headers
	c.Header("Content-Type", "application/rss+xml; charset=utf-8")
	c.Header("Cache-Control", "public, max-age=3600") // Cache for 1 hour

	c.XML(http.StatusOK, rss)
}

// GetRSSFeedByCategory generates RSS feed for specific category
func GetRSSFeedByCategory(c *gin.Context) {
	categoryID := c.Param("id")
	lang := c.Query("lang")
	if lang == "" {
		lang = "zh"
	}

	// Verify category exists
	var category models.Category
	if err := database.DB.Preload("Translations").First(&category, categoryID).Error; err != nil {
		c.XML(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	// Apply translation to category
	applyCategoryTranslation(&category, lang)

	// Forward to main RSS handler with category filter
	c.Request.URL.RawQuery = fmt.Sprintf("category_id=%s&lang=%s", categoryID, lang)
	GetRSSFeed(c)
}

// generateRSSFeed creates RSS structure from articles
func generateRSSFeed(articles []models.Article, settings models.SiteSettings, lang string, baseURL string) RSS {
	channel := Channel{
		Title:         settings.SiteTitle,
		Link:          baseURL,
		Description:   settings.SiteSubtitle,
		Language:      lang,
		LastBuildDate: time.Now().Format(time.RFC1123Z),
		Generator:     "Blog RSS Generator v1.0",
		Items:         make([]Item, 0, len(articles)),
	}

	for _, article := range articles {
		// Apply translation to article
		applyTranslation(&article, lang)
		applyCategoryTranslation(&article.Category, lang)

		// Generate article URL
		articleURL := fmt.Sprintf("%s/%s/article/%d", baseURL, lang, article.ID)

		// Create RSS item
		item := Item{
			Title:       article.Title,
			Link:        articleURL,
			Description: generateItemDescription(article),
			PubDate:     article.CreatedAt.Format(time.RFC1123Z),
			GUID:        articleURL,
		}

		if article.Category.Name != "" {
			item.Category = article.Category.Name
		}

		channel.Items = append(channel.Items, item)
	}

	return RSS{
		Version: "2.0",
		Channel: channel,
	}
}

// generateItemDescription creates description for RSS item
func generateItemDescription(article models.Article) string {
	if article.Summary != "" {
		return article.Summary
	}

	// If no summary, use first 200 characters of content
	content := strings.ReplaceAll(article.Content, "\n", " ")
	content = strings.TrimSpace(content)

	if len(content) > 200 {
		content = content[:200] + "..."
	}

	return content
}

// applySiteSettingsTranslation applies translation to site settings
func applySiteSettingsTranslation(settings *models.SiteSettings, lang string) {
	if lang == "zh" || lang == "" {
		return // Default language, no translation needed
	}

	for _, translation := range settings.Translations {
		if translation.Language == lang {
			if translation.SiteTitle != "" {
				settings.SiteTitle = translation.SiteTitle
			}
			if translation.SiteSubtitle != "" {
				settings.SiteSubtitle = translation.SiteSubtitle
			}
			break
		}
	}
}

// Note: applyCategoryTranslation and applyTranslation functions are already defined in categories.go and articles.go

// getBaseURL extracts base URL from request
func getBaseURL(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}

	host := c.Request.Host
	if forwardedHost := c.GetHeader("X-Forwarded-Host"); forwardedHost != "" {
		host = forwardedHost
	}

	return fmt.Sprintf("%s://%s", scheme, host)
}
